/**
 * Calendrier des échéances.
 *
 * Les dates qui engagent l'agence vivaient sur cinq écrans : une échéance de
 * facture dans Facturation, un jalon dans Projets, une session dans Academy.
 * Savoir ce qui tombe la semaine prochaine demandait de les ouvrir tous et de
 * tenir la liste de tête.
 *
 * ## Dérivé, comme les alertes
 *
 * Un événement n'est pas un enregistrement : c'est une lecture de l'état
 * courant. Rien n'est stocké — la date vient de la facture, du jalon, de la
 * session. Une facture réglée fait disparaître son échéance par construction,
 * et il n'y a jamais d'événement fantôme qui survit à ce qui l'a créé.
 *
 * ## Le passé compte autant que l'avenir
 *
 * Un calendrier qui n'affiche que ce qui vient masque exactement ce qu'il faut
 * voir : l'échéance dépassée de trois jours. Les événements passés restent
 * visibles et portent leur retard.
 *
 * Ce module est pur.
 */

import { daysBetween } from "./alerts";
import type { IsoDate } from "./date";

export type CalendarEventKind =
  | "invoiceDue"
  | "quoteExpiry"
  | "milestone"
  | "sessionStart"
  | "sessionEnd"
  | "installmentDue";

export const CALENDAR_KIND_LABELS: Record<CalendarEventKind, string> = {
  invoiceDue: "Échéance de facture",
  quoteExpiry: "Validité de devis",
  milestone: "Jalon de projet",
  sessionStart: "Début de session",
  sessionEnd: "Fin de session",
  installmentDue: "Échéance de formation",
};

/** Ce qui décide de la couleur : réclame une action, ou simple repère. */
export type CalendarTone = "due" | "late" | "done" | "neutral";

export interface CalendarEvent {
  /** Identifiant stable : deux calculs successifs rendent le même. */
  readonly id: string;
  readonly date: IsoDate;
  readonly kind: CalendarEventKind;
  readonly title: string;
  readonly detail: string;
  readonly tone: CalendarTone;
  /** Écran à ouvrir pour agir. */
  readonly href: string;
  /** Montant en jeu, pour totaliser une journée. Zéro si sans objet. */
  readonly amount: number;
}

// ------------------------------------------------------------- Entrées

export interface CalendarInvoice {
  readonly id: string;
  readonly number: string;
  readonly kind: "quote" | "invoice" | "creditNote";
  readonly status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  readonly clientName: string;
  readonly dueDate: IsoDate;
  readonly balance: number;
  readonly formattedBalance: string;
}

export interface CalendarMilestone {
  readonly projectId: string;
  readonly projectName: string;
  readonly milestoneId: string;
  readonly label: string;
  readonly dueDate: IsoDate;
  readonly doneAt?: IsoDate | undefined;
}

export interface CalendarSession {
  readonly id: string;
  readonly title: string;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly cancelled: boolean;
  readonly taken: number;
  readonly capacity: number;
}

export interface CalendarInstallment {
  readonly enrollmentId: string;
  readonly installmentId: string;
  readonly learnerName: string;
  readonly sessionTitle: string;
  readonly dueDate: IsoDate;
  readonly amount: number;
  readonly formattedAmount: string;
  readonly paid: boolean;
}

export interface CalendarInput {
  readonly today: IsoDate;
  readonly invoices: readonly CalendarInvoice[];
  readonly milestones: readonly CalendarMilestone[];
  readonly sessions: readonly CalendarSession[];
  readonly installments: readonly CalendarInstallment[];
  /** Validité d'un devis, en jours depuis son émission. */
  readonly quoteValidityDays: number;
}

function tonEcheance(date: IsoDate, today: IsoDate): CalendarTone {
  // Le jour même n'est pas un retard, ici comme partout ailleurs.
  return date < today ? "late" : "due";
}

export function collectEvents(input: CalendarInput): readonly CalendarEvent[] {
  const { today } = input;
  const evenements: CalendarEvent[] = [];

  for (const document of input.invoices) {
    if (document.status === "draft" || document.status === "cancelled") continue;
    if (document.dueDate.length === 0) continue;

    if (document.kind === "quote") {
      evenements.push({
        id: `quote:${document.id}`,
        date: document.dueDate,
        kind: "quoteExpiry",
        title: `${document.number} expire`,
        detail: `${document.clientName} · ${document.formattedBalance}`,
        tone: tonEcheance(document.dueDate, today),
        href: "/invoicing",
        amount: document.balance,
      });
      continue;
    }

    // Une facture réglée n'a plus d'échéance : la laisser au calendrier
    // ferait chercher une action qui n'existe plus.
    if (document.status === "paid" || document.balance <= 0) continue;

    evenements.push({
      id: `invoice:${document.id}`,
      date: document.dueDate,
      kind: "invoiceDue",
      title: `${document.number} à encaisser`,
      detail: `${document.clientName} · ${document.formattedBalance}`,
      tone: tonEcheance(document.dueDate, today),
      href: "/invoicing",
      amount: document.balance,
    });
  }

  for (const jalon of input.milestones) {
    const livre = jalon.doneAt !== undefined;
    evenements.push({
      id: `milestone:${jalon.projectId}:${jalon.milestoneId}`,
      // Un jalon livré se range à sa date de livraison, pas à la date prévue :
      // c'est le jour où il s'est passé quelque chose.
      date: livre ? (jalon.doneAt as IsoDate) : jalon.dueDate,
      kind: "milestone",
      title: jalon.label,
      detail: jalon.projectName,
      tone: livre ? "done" : tonEcheance(jalon.dueDate, today),
      href: "/projects",
      amount: 0,
    });
  }

  for (const session of input.sessions) {
    if (session.cancelled) continue;

    evenements.push({
      id: `session-start:${session.id}`,
      date: session.startDate,
      kind: "sessionStart",
      title: `${session.title} démarre`,
      detail: `${session.taken} inscrit(s) sur ${session.capacity} places`,
      tone: "neutral",
      href: "/academy",
      amount: 0,
    });

    // Une session d'un seul jour n'a pas besoin de deux repères.
    if (session.endDate !== session.startDate) {
      evenements.push({
        id: `session-end:${session.id}`,
        date: session.endDate,
        kind: "sessionEnd",
        title: `${session.title} se termine`,
        detail: "Constater la présence et délivrer les attestations.",
        tone: "neutral",
        href: "/academy",
        amount: 0,
      });
    }
  }

  for (const echeance of input.installments) {
    evenements.push({
      id: `installment:${echeance.enrollmentId}:${echeance.installmentId}`,
      date: echeance.dueDate,
      kind: "installmentDue",
      title: `${echeance.formattedAmount} — ${echeance.learnerName}`,
      detail: echeance.sessionTitle,
      tone: echeance.paid ? "done" : tonEcheance(echeance.dueDate, today),
      href: "/academy",
      amount: echeance.paid ? 0 : echeance.amount,
    });
  }

  return sortEvents(evenements);
}

const ORDRE_TON: Record<CalendarTone, number> = {
  late: 0,
  due: 1,
  neutral: 2,
  done: 3,
};

/** Par date, puis par urgence, puis par identifiant pour rester reproductible. */
export function sortEvents(
  events: readonly CalendarEvent[],
): readonly CalendarEvent[] {
  return [...events].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      ORDRE_TON[a.tone] - ORDRE_TON[b.tone] ||
      a.id.localeCompare(b.id),
  );
}

export interface CalendarDay {
  readonly date: IsoDate;
  readonly events: readonly CalendarEvent[];
  /** Somme des montants en jeu ce jour-là. */
  readonly amount: number;
  readonly hasLate: boolean;
}

/** Regroupe par jour. Les jours sans événement sont omis. */
export function groupByDay(
  events: readonly CalendarEvent[],
): readonly CalendarDay[] {
  const parJour = new Map<IsoDate, CalendarEvent[]>();
  for (const evenement of sortEvents(events)) {
    const groupe = parJour.get(evenement.date);
    if (groupe === undefined) parJour.set(evenement.date, [evenement]);
    else groupe.push(evenement);
  }

  return [...parJour.entries()].map(([date, liste]) => ({
    date,
    events: liste,
    amount: liste.reduce((cumul, evenement) => cumul + evenement.amount, 0),
    hasLate: liste.some((evenement) => evenement.tone === "late"),
  }));
}

/** Événements d'une période, bornes incluses. */
export function eventsBetween(
  events: readonly CalendarEvent[],
  from: IsoDate,
  to: IsoDate,
): readonly CalendarEvent[] {
  return events.filter(
    (evenement) => evenement.date >= from && evenement.date <= to,
  );
}

export interface CalendarSummary {
  readonly total: number;
  readonly late: number;
  readonly due: number;
  /** Somme des montants encore en jeu — les événements livrés ne comptent pas. */
  readonly amountAtStake: number;
}

export function summarize(events: readonly CalendarEvent[]): CalendarSummary {
  return {
    total: events.length,
    late: events.filter((evenement) => evenement.tone === "late").length,
    due: events.filter((evenement) => evenement.tone === "due").length,
    amountAtStake: events
      .filter((evenement) => evenement.tone !== "done")
      .reduce((cumul, evenement) => cumul + evenement.amount, 0),
  };
}

// ------------------------------------------------------- Grille mensuelle

/** Premier jour du mois contenant `date`, au format ISO. */
export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

/** Décale un mois, en gardant le premier jour. `delta` peut être négatif. */
export function shiftMonth(date: IsoDate, delta: number): IsoDate {
  const annee = Number(date.slice(0, 4));
  const mois = Number(date.slice(5, 7));
  const total = annee * 12 + (mois - 1) + delta;
  const nouvelleAnnee = Math.floor(total / 12);
  const nouveauMois = (total % 12) + 1;
  return `${String(nouvelleAnnee).padStart(4, "0")}-${String(nouveauMois).padStart(2, "0")}-01`;
}

/**
 * Grille d'un mois, semaines complètes, lundi en tête.
 *
 * Les jours des mois voisins sont inclus : une grille qui commence par des
 * cases vides fait perdre la lecture en colonnes, et les échéances du 1er
 * tombent souvent sur la semaine du mois précédent.
 */
export function monthGrid(month: IsoDate): readonly IsoDate[] {
  const premier = new Date(`${startOfMonth(month)}T00:00:00`);
  if (Number.isNaN(premier.getTime())) return [];

  // `getDay()` rend 0 pour dimanche : on ramène la semaine au lundi.
  const decalage = (premier.getDay() + 6) % 7;
  const debut = new Date(premier);
  debut.setDate(debut.getDate() - decalage);

  const jours: IsoDate[] = [];
  const curseur = new Date(debut);
  // Six semaines couvrent tous les mois possibles, y compris un février de
  // vingt-huit jours qui commence un dimanche.
  for (let index = 0; index < 42; index += 1) {
    const annee = String(curseur.getFullYear()).padStart(4, "0");
    const mois = String(curseur.getMonth() + 1).padStart(2, "0");
    const jour = String(curseur.getDate()).padStart(2, "0");
    jours.push(`${annee}-${mois}-${jour}`);
    curseur.setDate(curseur.getDate() + 1);
  }
  return jours;
}

/** Jours de la semaine contenant `date`, lundi en tête. */
export function weekGrid(date: IsoDate): readonly IsoDate[] {
  const reference = new Date(`${date}T00:00:00`);
  if (Number.isNaN(reference.getTime())) return [];
  const decalage = (reference.getDay() + 6) % 7;
  reference.setDate(reference.getDate() - decalage);

  const jours: IsoDate[] = [];
  for (let index = 0; index < 7; index += 1) {
    const annee = String(reference.getFullYear()).padStart(4, "0");
    const mois = String(reference.getMonth() + 1).padStart(2, "0");
    const jour = String(reference.getDate()).padStart(2, "0");
    jours.push(`${annee}-${mois}-${jour}`);
    reference.setDate(reference.getDate() + 1);
  }
  return jours;
}

/** Vrai si les deux dates appartiennent au même mois. */
export function sameMonth(a: IsoDate, b: IsoDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Jours restants avant une date. Négatif si elle est passée. */
export function daysUntil(date: IsoDate, today: IsoDate): number {
  return daysBetween(today, date);
}
