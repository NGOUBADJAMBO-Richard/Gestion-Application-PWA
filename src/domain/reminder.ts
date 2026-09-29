/**
 * Relances d'impayés.
 *
 * Une facture en retard ne se relance pas au hasard : trop tôt on froisse un
 * bon client, trop tard on perd la créance. Ce module porte l'échelle de
 * relance, les messages, et le lien qui ouvre la conversation.
 *
 * ## Pourquoi WhatsApp d'abord
 *
 * Au Gabon, c'est le canal qui obtient une réponse — le site de l'agence repose
 * entièrement dessus. Un courriel de relance part dans un dossier que personne
 * n'ouvre. L'application n'envoie rien elle-même : elle prépare le message et
 * ouvre la conversation. C'est délibéré. Envoyer automatiquement suppose des
 * identifiants, un serveur, et la possibilité qu'un message parte sans
 * relecture chez le mauvais client.
 *
 * ## Ce que le module ne fait pas
 *
 * Il ne décide pas d'envoyer. `nextReminderLevel` dit ce qui *serait* dû ;
 * l'utilisateur relit, ajuste, envoie. Toute relance envoyée est ensuite
 * enregistrée, parce qu'une relance oubliée se renvoie deux fois et qu'une
 * mise en demeure envoyée deux fois n'a plus aucune portée.
 *
 * Ce module est pur.
 */

import type { IsoDate } from "./date";

export type ReminderLevel = "courtesy" | "firm" | "formal";

export type ReminderChannel = "whatsapp" | "email" | "phone" | "other";

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  phone: "Téléphone",
  other: "Autre",
};

export interface ReminderLevelSpec {
  readonly level: ReminderLevel;
  readonly label: string;
  /** Jours de retard à partir desquels ce palier se justifie. */
  readonly fromDaysOverdue: number;
  /** Ce que le palier cherche à obtenir, pour guider l'utilisateur. */
  readonly intent: string;
}

/**
 * Échelle de relance.
 *
 * Trois paliers, pas cinq : au-delà, personne ne suit la nuance, et la
 * quatrième relance « ferme mais cordiale » ne veut plus rien dire. Les seuils
 * sont larges — huit jours avant la seconde, trois semaines avant la mise en
 * demeure — parce qu'un client qui paie à trente-cinq jours au lieu de trente
 * n'est pas un mauvais payeur.
 */
export const REMINDER_LEVELS: readonly ReminderLevelSpec[] = [
  {
    level: "courtesy",
    label: "Rappel courtois",
    fromDaysOverdue: 1,
    intent:
      "Supposer l'oubli. Beaucoup d'impayés sont une facture égarée, pas un refus de payer.",
  },
  {
    level: "firm",
    label: "Relance ferme",
    fromDaysOverdue: 8,
    intent: "Rappeler l'échéance dépassée et demander une date de règlement.",
  },
  {
    level: "formal",
    label: "Mise en demeure",
    fromDaysOverdue: 21,
    intent:
      "Dernier avis avant suspension des prestations. À relire avant envoi : ce message engage la relation.",
  },
];

export interface Reminder {
  readonly id: string;
  /** Document relancé. */
  readonly invoiceId: string;
  readonly level: ReminderLevel;
  readonly channel: ReminderChannel;
  readonly sentAt: IsoDate;
  /** Note libre : ce que le client a répondu, une date promise. */
  readonly note?: string | undefined;
}

export function levelSpec(level: ReminderLevel): ReminderLevelSpec {
  const trouve = REMINDER_LEVELS.find((palier) => palier.level === level);
  // Impossible par construction : le type n'admet que trois valeurs.
  if (trouve === undefined) throw new Error(`Palier de relance inconnu : ${level}`);
  return trouve;
}

/** Ordre des paliers, pour comparer une relance envoyée à celle qui serait due. */
function levelRank(level: ReminderLevel): number {
  return REMINDER_LEVELS.findIndex((palier) => palier.level === level);
}

export interface ReminderAdvice {
  /** Palier justifié par le retard. `null` si aucune relance ne s'impose. */
  readonly level: ReminderLevel | null;
  /** Dernière relance envoyée sur ce document. */
  readonly last: Reminder | null;
  /**
   * Vrai si le palier dû a déjà été envoyé. On n'empêche pas de relancer à
   * nouveau — un client injoignable se relance deux fois — mais on le dit,
   * pour que l'envoi soit un choix et non une redite involontaire.
   */
  readonly alreadySent: boolean;
  readonly reason: string;
}

/**
 * Quelle relance est due sur un document.
 *
 * `daysOverdue` vient de `invoiceStatus` : le retard se déduit de l'échéance,
 * il n'est jamais stocké.
 */
export function adviseReminder(
  daysOverdue: number,
  history: readonly Reminder[],
): ReminderAdvice {
  const envoyees = [...history].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const derniere = envoyees[envoyees.length - 1] ?? null;

  if (daysOverdue <= 0) {
    return {
      level: null,
      last: derniere,
      alreadySent: false,
      reason:
        derniere === null
          ? "Cette facture n'est pas en retard. Rien à relancer."
          : "Cette facture n'est plus en retard. Rien à relancer.",
    };
  }

  // Le palier le plus élevé que le retard justifie.
  const du = [...REMINDER_LEVELS]
    .reverse()
    .find((palier) => daysOverdue >= palier.fromDaysOverdue);

  if (du === undefined) {
    return {
      level: null,
      last: derniere,
      alreadySent: false,
      reason: "Retard trop récent pour relancer.",
    };
  }

  const dejaEnvoye =
    derniere !== null && levelRank(derniere.level) >= levelRank(du.level);

  return {
    level: du.level,
    last: derniere,
    alreadySent: dejaEnvoye,
    reason: dejaEnvoye
      ? `${du.label} déjà envoyé${derniere === null ? "" : ` le ${derniere.sentAt}`}. Renvoyer reste possible si le client est resté injoignable.`
      : `${daysOverdue} jour(s) de retard : ${du.label.toLowerCase()} justifié.`,
  };
}

// -------------------------------------------------------------- Messages

export interface ReminderContext {
  readonly clientName: string;
  readonly documentNumber: string;
  /** Montant restant dû, déjà formaté pour l'affichage. */
  readonly formattedBalance: string;
  readonly dueDate: IsoDate;
  readonly daysOverdue: number;
  readonly companyName: string;
  /** Moyens de paiement rappelés en fin de message. Facultatif. */
  readonly paymentDetails?: string | undefined;
}

function formatDateFr(value: IsoDate): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Message de relance, prêt à relire.
 *
 * Trois registres distincts. Le premier suppose l'oubli et ne menace de rien :
 * c'est la version qu'on envoie à un bon client, et elle suffit dans la plupart
 * des cas. Le troisième annonce une conséquence concrète — la suspension —
 * parce qu'une mise en demeure sans conséquence n'est qu'une relance de plus.
 */
export function reminderMessage(
  level: ReminderLevel,
  context: ReminderContext,
): string {
  const {
    clientName,
    documentNumber,
    formattedBalance,
    dueDate,
    daysOverdue,
    companyName,
    paymentDetails,
  } = context;

  const echeance = formatDateFr(dueDate);
  const signature = `\n\n${companyName}`;
  const moyens =
    paymentDetails !== undefined && paymentDetails.trim().length > 0
      ? `\n\nMoyens de paiement :\n${paymentDetails.trim()}`
      : "";

  switch (level) {
    case "courtesy":
      return (
        `Bonjour ${clientName},\n\n` +
        `Un petit rappel au sujet de la facture ${documentNumber}, ` +
        `d'un montant de ${formattedBalance}, échue le ${echeance}.\n\n` +
        `Il s'agit sans doute d'un oubli. Si le règlement est déjà parti, ` +
        `merci de ne pas tenir compte de ce message.` +
        moyens +
        signature
      );

    case "firm":
      return (
        `Bonjour ${clientName},\n\n` +
        `La facture ${documentNumber}, d'un montant de ${formattedBalance}, ` +
        `était due le ${echeance} — soit ${daysOverdue} jours de retard à ce jour.\n\n` +
        `Pouvez-vous m'indiquer la date à laquelle le règlement interviendra ? ` +
        `Si une difficulté se présente, dites-le-moi : un échéancier reste possible.` +
        moyens +
        signature
      );

    case "formal":
      return (
        `Bonjour ${clientName},\n\n` +
        `Malgré mes relances, la facture ${documentNumber} d'un montant de ` +
        `${formattedBalance}, échue le ${echeance}, demeure impayée ` +
        `(${daysOverdue} jours de retard).\n\n` +
        `Je vous demande de procéder au règlement sous huit jours. ` +
        `Sans retour de votre part dans ce délai, les prestations en cours ` +
        `seront suspendues et le dossier transmis pour recouvrement.\n\n` +
        `Je reste disponible pour en parler avant d'en arriver là.` +
        moyens +
        signature
      );
  }
}

// ---------------------------------------------------------------- Canaux

/** Indicatif par défaut, sans le « + ». Le Gabon est à 241. */
export const DEFAULT_DIALING_CODE = "241";

/**
 * Met un numéro au format attendu par `wa.me` : chiffres seuls, indicatif pays
 * inclus, sans « + » ni espaces.
 *
 * Les numéros sont saisis ici comme on les écrit au Gabon — « +241 66 19 89 18 »,
 * « 066 19 89 18 », « 06-61-98-91-8 ». Ouvrir `wa.me` avec l'un d'eux tel quel
 * donne une conversation vide avec un contact inexistant, sans dire pourquoi.
 *
 * Renvoie `null` quand le numéro ne peut pas être interprété de façon sûre,
 * plutôt que de composer un numéro inventé.
 */
export function toWhatsAppNumber(
  phone: string,
  dialingCode: string = DEFAULT_DIALING_CODE,
): string | null {
  const brut = phone.trim();
  if (brut.length === 0) return null;

  // Un préfixe international explicite fait foi : « +33 » n'est pas gabonais.
  const international = brut.startsWith("+") || brut.startsWith("00");
  let chiffres = brut.replace(/\D/g, "");
  if (brut.startsWith("00")) chiffres = chiffres.slice(2);

  if (chiffres.length === 0) return null;

  if (international) {
    // Trop court pour être un numéro international complet.
    return chiffres.length >= 8 ? chiffres : null;
  }

  // Numéro local : on retire le zéro d'appel national puis on préfixe.
  const local = chiffres.replace(/^0+/, "");
  if (local.length < 6) return null;

  // Déjà préfixé de l'indicatif sans le « + ».
  if (chiffres.startsWith(dialingCode) && chiffres.length > dialingCode.length + 5) {
    return chiffres;
  }

  return `${dialingCode}${local}`;
}

/** Lien `wa.me` avec le message pré-rempli. `null` si le numéro est inexploitable. */
export function whatsAppUrl(phone: string, message: string): string | null {
  const numero = toWhatsAppNumber(phone);
  if (numero === null) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

/** Lien `mailto:` avec objet et corps pré-remplis. */
export function mailToUrl(email: string, subject: string, body: string): string | null {
  const adresse = email.trim();
  if (adresse.length === 0 || !adresse.includes("@")) return null;
  return `mailto:${encodeURIComponent(adresse)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

/** Objet de courriel correspondant au palier. */
export function reminderSubject(
  level: ReminderLevel,
  documentNumber: string,
): string {
  switch (level) {
    case "courtesy":
      return `Rappel — facture ${documentNumber}`;
    case "firm":
      return `Relance — facture ${documentNumber} échue`;
    case "formal":
      return `Mise en demeure — facture ${documentNumber}`;
  }
}
