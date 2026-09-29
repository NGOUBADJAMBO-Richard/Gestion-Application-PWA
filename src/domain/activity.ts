/**
 * Journal d'activité.
 *
 * Les alertes disent **ce qu'il reste à faire** ; elles sont dérivées de l'état
 * courant et disparaissent quand le fait disparaît. Il manquait le symétrique :
 * **ce qui a été fait**. Une facture émise, un règlement encaissé, une relance
 * partie, un jalon livré — autant d'événements qui ne laissaient aucune trace
 * une fois l'écran quitté.
 *
 * Deux usages qui justifient à eux seuls le journal :
 *
 * - **Retrouver quand.** « Cette mise en demeure, je l'ai envoyée quand ? »
 *   La réponse vivait dans la mémoire de quelqu'un.
 * - **Voir ce qui a bougé.** Sur un appareil partagé, ou après une semaine
 *   d'absence, rien ne disait ce qui avait changé.
 *
 * ## Append-only
 *
 * Une entrée ne se modifie ni ne se supprime. Un journal qu'on peut réécrire
 * ne prouve rien, et son intérêt tient précisément à ce qu'on ne puisse pas
 * effacer une relance gênante. La seule opération destructive est la purge du
 * plus ancien quand le journal atteint sa taille maximale, et elle est
 * annoncée.
 *
 * Ce module est pur.
 */

export type ActivityKind =
  | "documentIssued"
  | "documentConverted"
  | "creditNoteIssued"
  | "paymentRecorded"
  | "reminderSent"
  | "milestoneDelivered"
  | "sessionOpened"
  | "enrollmentCreated"
  | "installmentPaid"
  | "backupExported"
  | "dataRestored";

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  documentIssued: "Document émis",
  documentConverted: "Devis transformé",
  creditNoteIssued: "Avoir émis",
  paymentRecorded: "Encaissement",
  reminderSent: "Relance envoyée",
  milestoneDelivered: "Jalon livré",
  sessionOpened: "Session ouverte",
  enrollmentCreated: "Inscription",
  installmentPaid: "Échéance réglée",
  backupExported: "Sauvegarde exportée",
  dataRestored: "Données restaurées",
};

/**
 * Familles, pour filtrer sans énumérer onze natures.
 *
 * « Argent » réunit ce qui touche à la caisse, « Travail » ce qui avance, et
 * « Données » ce qui protège. Trois filtres se parcourent ; onze ne se
 * parcourent pas.
 */
export type ActivityFamily = "money" | "work" | "data";

export const ACTIVITY_FAMILY_LABELS: Record<ActivityFamily, string> = {
  money: "Argent",
  work: "Travail",
  data: "Données",
};

const FAMILLES: Record<ActivityKind, ActivityFamily> = {
  documentIssued: "money",
  documentConverted: "money",
  creditNoteIssued: "money",
  paymentRecorded: "money",
  reminderSent: "money",
  installmentPaid: "money",
  milestoneDelivered: "work",
  sessionOpened: "work",
  enrollmentCreated: "work",
  backupExported: "data",
  dataRestored: "data",
};

export function activityFamily(kind: ActivityKind): ActivityFamily {
  return FAMILLES[kind];
}

export interface ActivityEntry {
  readonly id: string;
  /** Horodatage complet, au format ISO. Le journal se lit à la minute près. */
  readonly at: string;
  readonly kind: ActivityKind;
  readonly title: string;
  readonly detail?: string | undefined;
  /** Écran à ouvrir pour retrouver l'objet concerné. */
  readonly href?: string | undefined;
  /** Montant en jeu, en unité mineure. Absent quand l'événement n'en porte pas. */
  readonly amount?: number | undefined;
}

/** Taille maximale du journal. Au-delà, les plus anciennes entrées tombent. */
export const ACTIVITY_LIMIT = 400;

/**
 * Ajoute une entrée et rogne le journal.
 *
 * Le plus récent d'abord : c'est l'ordre dans lequel on le lit, et rogner la
 * fin revient alors à oublier le plus ancien.
 */
export function appendActivity(
  journal: readonly ActivityEntry[],
  entry: ActivityEntry,
  limit: number = ACTIVITY_LIMIT,
): readonly ActivityEntry[] {
  return [entry, ...journal].slice(0, Math.max(1, limit));
}

/** Entrées postérieures à la date de dernière lecture. */
export function unreadSince(
  journal: readonly ActivityEntry[],
  lastReadAt: string | null,
): readonly ActivityEntry[] {
  if (lastReadAt === null) return journal;
  return journal.filter((entree) => entree.at > lastReadAt);
}

export interface ActivityFilter {
  readonly family?: ActivityFamily | undefined;
  /** Recherche libre sur le titre et le détail. */
  readonly query?: string | undefined;
}

export function filterActivity(
  journal: readonly ActivityEntry[],
  filter: ActivityFilter,
): readonly ActivityEntry[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  return journal.filter((entree) => {
    if (filter.family !== undefined && activityFamily(entree.kind) !== filter.family) {
      return false;
    }
    if (q.length === 0) return true;
    return (
      entree.title.toLowerCase().includes(q) ||
      (entree.detail ?? "").toLowerCase().includes(q) ||
      ACTIVITY_LABELS[entree.kind].toLowerCase().includes(q)
    );
  });
}

export interface ActivityDay {
  /** Jour au format AAAA-MM-JJ. */
  readonly date: string;
  readonly entries: readonly ActivityEntry[];
}

/**
 * Regroupe par jour, du plus récent au plus ancien.
 *
 * Le découpage se fait sur les dix premiers caractères de l'horodatage, donc
 * sur la date **telle qu'elle a été écrite**. Repasser par `Date` reconvertirait
 * en temps universel et rangerait une action de 00 h 30 la veille.
 */
export function groupActivityByDay(
  journal: readonly ActivityEntry[],
): readonly ActivityDay[] {
  const parJour = new Map<string, ActivityEntry[]>();
  for (const entree of [...journal].sort((a, b) => b.at.localeCompare(a.at))) {
    const jour = entree.at.slice(0, 10);
    const groupe = parJour.get(jour);
    if (groupe === undefined) parJour.set(jour, [entree]);
    else groupe.push(entree);
  }
  return [...parJour.entries()].map(([date, entries]) => ({ date, entries }));
}
