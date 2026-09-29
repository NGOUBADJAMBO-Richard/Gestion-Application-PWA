/**
 * Jalons livrables.
 *
 * L'avancement d'un projet se saisissait en pourcentage. Un pourcentage écrit
 * à la main n'est pas une mesure : c'est une impression. Il ne se met pas à
 * jour tout seul, il ne dit pas ce qu'il reste à faire, et il reste bloqué à
 * « 90 % » pendant la moitié du chantier — le défaut est assez connu pour
 * avoir un nom.
 *
 * Un jalon, lui, est vrai ou faux. « Maquettes validées » est livré ou ne
 * l'est pas ; la question ne se discute pas. Trois conséquences :
 *
 * - **L'avancement se déduit**, il ne se saisit plus. Cocher un jalon suffit.
 * - **Le retard se voit** : un jalon dont la date est passée et qui n'est pas
 *   livré est en retard, sans qu'on ait à le déclarer.
 * - **Ce qui reste est nommé.** « 3 jalons sur 7 » dit combien ; « prochain :
 *   Recette client » dit quoi.
 *
 * C'est aussi la façon dont une agence parle déjà à ses clients : on ne vend
 * pas 40 % d'un site, on vend des livrables.
 *
 * Ce module est pur.
 */

import { isIsoDate, type IsoDate } from "./date";
import { daysBetween } from "./alerts";

export interface Milestone {
  readonly id: string;
  /** Ce qui doit être livré, nommé. */
  readonly label: string;
  readonly dueDate: IsoDate;
  /** Date de livraison réelle. Absente tant que le jalon n'est pas livré. */
  readonly doneAt?: IsoDate | undefined;
  readonly notes?: string | undefined;
}

export class InvalidMilestoneError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "InvalidMilestoneError";
  }
}

export function validateMilestone(draft: Omit<Milestone, "id">): void {
  if (draft.label.trim().length === 0) {
    throw new InvalidMilestoneError(
      "label",
      "Nomme le jalon : « étape 3 » ne dit pas ce qui doit être livré.",
    );
  }
  if (!isIsoDate(draft.dueDate)) {
    throw new InvalidMilestoneError(
      "dueDate",
      "La date prévue du jalon est absente ou invalide.",
    );
  }
  if (draft.doneAt !== undefined && !isIsoDate(draft.doneAt)) {
    throw new InvalidMilestoneError(
      "doneAt",
      "La date de livraison est invalide.",
    );
  }
}

export interface MilestoneProgress {
  readonly total: number;
  readonly done: number;
  readonly remaining: number;
  /**
   * Prochain jalon à livrer : le plus proche parmi ceux qui restent. `null`
   * quand tout est livré, ou qu'aucun jalon n'est défini.
   */
  readonly next: Milestone | null;
  /** Jours avant le prochain jalon. Négatif s'il est déjà en retard. */
  readonly daysToNext: number | null;
  /** Jalons dont la date est passée sans livraison. */
  readonly late: readonly Milestone[];
  readonly allDone: boolean;
  /**
   * Part livrée, en pourcentage.
   *
   * Dérivée, jamais saisie — c'est toute la différence. Elle sert à peindre
   * une jauge, pas à répondre à la question « où en est-on ? ». `null` quand
   * aucun jalon n'est défini : zéro laisserait croire que rien n'est fait.
   */
  readonly donePercent: number | null;
}

/** Ordre de lecture : par date prévue, puis par intitulé pour rester stable. */
export function sortMilestones(
  milestones: readonly Milestone[],
): readonly Milestone[] {
  return [...milestones].sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) || a.label.localeCompare(b.label, "fr"),
  );
}

export function milestoneProgress(
  milestones: readonly Milestone[],
  today: IsoDate,
): MilestoneProgress {
  const tries = sortMilestones(milestones);
  const livres = tries.filter((jalon) => jalon.doneAt !== undefined);
  const restants = tries.filter((jalon) => jalon.doneAt === undefined);
  const suivant = restants[0] ?? null;

  return {
    total: tries.length,
    done: livres.length,
    remaining: restants.length,
    next: suivant,
    daysToNext: suivant === null ? null : daysBetween(today, suivant.dueDate),
    // Le jour même n'est pas un retard : on ne déclare pas un livrable en
    // retard le matin où il est dû. Cohérent avec les factures.
    late: restants.filter((jalon) => jalon.dueDate < today),
    allDone: tries.length > 0 && restants.length === 0,
    donePercent:
      tries.length === 0 ? null : (livres.length / tries.length) * 100,
  };
}

/**
 * Résumé d'une ligne, pour une liste ou une carte.
 *
 * Dit toujours trois choses quand elles existent : combien de livrés, ce qui
 * vient ensuite, et si c'est en retard. Un résumé qui se contente du compte
 * oblige à ouvrir le projet pour savoir quoi faire.
 */
export function describeProgress(progress: MilestoneProgress): string {
  if (progress.total === 0) return "Aucun jalon défini";
  if (progress.allDone) return `Tous les jalons livrés (${progress.total})`;

  const compte = `${progress.done} jalon(s) sur ${progress.total}`;
  const suivant = progress.next;
  if (suivant === null) return compte;

  const jours = progress.daysToNext ?? 0;
  const quand =
    jours < 0
      ? `en retard de ${-jours} jour(s)`
      : jours === 0
        ? "aujourd'hui"
        : `dans ${jours} jour(s)`;

  return `${compte} · ${suivant.label} ${quand}`;
}

// ------------------------------------------------------------- Modèles

export interface MilestoneTemplate {
  readonly id: string;
  readonly label: string;
  /** Jalons, avec leur décalage en jours depuis le début du projet. */
  readonly steps: readonly { readonly label: string; readonly offsetDays: number }[];
}

/**
 * Modèles de jalons.
 *
 * Saisir sept jalons à la main pour chaque projet, c'est ne les saisir pour
 * aucun. Ces modèles reprennent le déroulé réel des prestations vendues sur le
 * site ; ils se posent en un clic, puis se renomment et se redatent librement.
 *
 * Les décalages sont des points de départ, pas des engagements : ils placent
 * les dates dans le bon ordre, à l'utilisateur de les ajuster.
 */
export const MILESTONE_TEMPLATES: readonly MilestoneTemplate[] = [
  {
    id: "site-vitrine",
    label: "Site vitrine",
    steps: [
      { label: "Cadrage et arborescence", offsetDays: 0 },
      { label: "Maquettes validées", offsetDays: 10 },
      { label: "Intégration des pages", offsetDays: 24 },
      { label: "Contenus et référencement de base", offsetDays: 31 },
      { label: "Recette client", offsetDays: 38 },
      { label: "Mise en ligne", offsetDays: 45 },
    ],
  },
  {
    id: "e-commerce",
    label: "Boutique en ligne",
    steps: [
      { label: "Cadrage et arborescence", offsetDays: 0 },
      { label: "Maquettes validées", offsetDays: 12 },
      { label: "Intégration du catalogue", offsetDays: 28 },
      { label: "Paiement mobile money", offsetDays: 40 },
      { label: "Recette client", offsetDays: 52 },
      { label: "Formation du vendeur", offsetDays: 58 },
      { label: "Mise en ligne", offsetDays: 63 },
    ],
  },
  {
    id: "application-mobile",
    label: "Application mobile",
    steps: [
      { label: "Cadrage fonctionnel", offsetDays: 0 },
      { label: "Maquettes validées", offsetDays: 14 },
      { label: "Version de test interne", offsetDays: 45 },
      { label: "Version de test client", offsetDays: 70 },
      { label: "Recette et corrections", offsetDays: 85 },
      { label: "Publication sur les magasins", offsetDays: 95 },
    ],
  },
  {
    id: "identite-visuelle",
    label: "Identité visuelle",
    steps: [
      { label: "Brief et références", offsetDays: 0 },
      { label: "Pistes graphiques", offsetDays: 7 },
      { label: "Piste retenue et déclinaisons", offsetDays: 16 },
      { label: "Charte et fichiers livrés", offsetDays: 24 },
    ],
  },
  {
    id: "audit",
    label: "Audit ou conseil",
    steps: [
      { label: "Collecte des accès et données", offsetDays: 0 },
      { label: "Analyse technique", offsetDays: 7 },
      { label: "Rapport rédigé", offsetDays: 14 },
      { label: "Restitution au client", offsetDays: 18 },
    ],
  },
];

/** Décale une date ISO d'un nombre de jours, sans dépendre du fuseau. */
function decaler(base: IsoDate, days: number): IsoDate {
  const date = new Date(`${base}T00:00:00`);
  date.setDate(date.getDate() + days);
  const annee = String(date.getFullYear()).padStart(4, "0");
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

/**
 * Construit les jalons d'un modèle à partir d'une date de départ.
 *
 * Les identifiants sont fournis par l'appelant : le domaine ne tire pas de
 * nombres au hasard, ce qui le garderait impossible à tester à l'identique.
 */
export function buildFromTemplate(
  template: MilestoneTemplate,
  startDate: IsoDate,
  makeId: (index: number) => string,
): readonly Milestone[] {
  if (!isIsoDate(startDate)) {
    throw new InvalidMilestoneError(
      "startDate",
      "La date de départ du modèle est invalide.",
    );
  }
  return template.steps.map((etape, index) => ({
    id: makeId(index),
    label: etape.label,
    dueDate: decaler(startDate, etape.offsetDays),
  }));
}
