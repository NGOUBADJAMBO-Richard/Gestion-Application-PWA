import type { IsoDate } from "./date";

/**
 * État réel d'une facture à une date donnée.
 *
 * Le retard était saisi à la main : une facture dont l'échéance était passée
 * restait affichée « en attente » jusqu'à ce que quelqu'un pense à la
 * modifier. Un tableau de bord qui n'annonce pas les impayés ne sert à rien —
 * c'est précisément ce qu'on vient y chercher.
 *
 * Le retard se déduit donc de l'échéance, sans écriture : rien n'est modifié
 * en base, l'affichage est simplement juste.
 */
export type StoredStatus =
  | "draft"
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled";

export interface DueDocument {
  readonly status: StoredStatus;
  readonly dueDate: string;
}

/**
 * Une facture réglée, annulée ou en brouillon ne peut pas être en retard.
 * Seule une facture émise et non réglée le devient, le lendemain de
 * l'échéance — le jour même, le client a encore la journée pour payer.
 */
export function effectiveStatus(
  document: DueDocument,
  today: IsoDate,
): StoredStatus {
  if (document.status !== "pending" && document.status !== "overdue") {
    return document.status;
  }
  if (document.dueDate === "") return document.status;
  return document.dueDate < today ? "overdue" : "pending";
}

/** Nombre de jours de retard, ou 0 si la facture n'est pas en retard. */
export function daysOverdue(document: DueDocument, today: IsoDate): number {
  if (effectiveStatus(document, today) !== "overdue") return 0;
  const echeance = new Date(`${document.dueDate}T00:00:00`);
  const reference = new Date(`${today}T00:00:00`);
  const millisecondes = reference.getTime() - echeance.getTime();
  return Math.max(0, Math.floor(millisecondes / 86_400_000));
}

/** Vrai si l'échéance approche, pour signaler avant qu'il ne soit trop tard. */
export function isDueSoon(
  document: DueDocument,
  today: IsoDate,
  withinDays = 7,
): boolean {
  if (effectiveStatus(document, today) !== "pending") return false;
  if (document.dueDate === "") return false;
  const echeance = new Date(`${document.dueDate}T00:00:00`);
  const reference = new Date(`${today}T00:00:00`);
  const jours = Math.floor(
    (echeance.getTime() - reference.getTime()) / 86_400_000,
  );
  return jours >= 0 && jours <= withinDays;
}
