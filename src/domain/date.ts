/**
 * Dates du domaine, au format ISO court « AAAA-MM-JJ ».
 *
 * Le code d'origine construisait la date du jour avec
 * `new Date().toISOString().split("T")[0]`. C'est faux hors UTC :
 * `toISOString()` convertit d'abord en temps universel. Au Gabon (UTC+1),
 * une facture créée à 00 h 30 devient datée de la veille — une date de
 * document comptable décalée d'un jour, une fois par nuit.
 *
 * On lit donc les composantes locales du calendrier, jamais l'instant UTC.
 */
export type IsoDate = string;

/** Convertit une date en « AAAA-MM-JJ » dans le fuseau local. */
export function toIsoDate(value: Date): IsoDate {
  if (Number.isNaN(value.getTime())) {
    throw new RangeError("toIsoDate a reçu une date invalide.");
  }
  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Date du jour. Le paramètre `reference` existe pour les tests : un test qui
 * dépend de l'horloge réelle échoue un jour sur trois cent soixante-cinq.
 */
export function todayIso(reference: Date = new Date()): IsoDate {
  return toIsoDate(reference);
}

/** Vrai si la chaîne est une date ISO courte et un jour réel du calendrier. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === value;
}

/** Ajoute un nombre de jours à une date ISO et renvoie une date ISO. */
export function addDays(value: IsoDate, days: number): IsoDate {
  const base = new Date(`${value}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    throw new RangeError(`addDays a reçu une date ISO invalide : ${value}`);
  }
  base.setDate(base.getDate() + days);
  return toIsoDate(base);
}
