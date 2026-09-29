/**
 * Suivi du temps passé.
 *
 * Une agence facture des journées, mais gagne ou perd de l'argent à la minute.
 * Sans temps saisi, la rentabilité d'un projet n'est pas calculable : on ne
 * connaît que son prix, jamais son coût. Ce module porte donc l'unité de
 * mesure, sa validation et le coût qui en découle.
 *
 * Deux choix structurants :
 *
 * 1. **La durée est un entier de minutes**, jamais un nombre d'heures à
 *    virgule. `0.1 + 0.2` heure ne vaut pas 0,3 heure en IEEE 754 ; sur cent
 *    saisies l'écart devient une demi-journée fantôme. Les heures n'existent
 *    qu'à l'affichage et à la saisie.
 * 2. **Le coût horaire est porté par la saisie**, pas par une constante
 *    globale. Le taux d'un développeur n'est pas celui d'un graphiste, et le
 *    taux d'aujourd'hui n'est pas celui de l'an dernier. Figer le taux au
 *    moment de la saisie évite qu'une augmentation réécrive l'historique de
 *    marge des projets déjà livrés.
 *
 * Ce module est pur : aucun accès au stockage, aucune horloge implicite.
 */

import { isIsoDate, type IsoDate } from "./date";
import { type CurrencyCode, type Money, money, multiply, sum } from "./money";

/** Durée maximale d'une seule saisie : 16 h. Au-delà, c'est une faute de frappe. */
export const MAX_MINUTES_PER_ENTRY = 16 * 60;

export interface TimeEntry {
  readonly id: string;
  /**
   * Projet rattaché, obligatoire.
   *
   * Un temps sans projet ne se rentabilise pas et ne se refacture pas : il
   * serait enregistré puis jamais relu. Le temps interne non imputable se
   * saisit sur un projet dédié, ce qui le rend au moins mesurable.
   */
  readonly projectId: string;
  readonly date: IsoDate;
  /** Entier strictement positif. */
  readonly minutes: number;
  readonly description: string;
  /**
   * Refacturable au client. Une saisie non refacturable reste un coût : elle
   * pèse sur la marge sans jamais produire de recette.
   */
  readonly billable: boolean;
  /** Coût horaire interne, en unité mineure. Zéro admis, négatif refusé. */
  readonly hourlyCost: number;
}

export class InvalidTimeEntryError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "InvalidTimeEntryError";
  }
}

export class InvalidDurationError extends Error {
  constructor(
    readonly input: string,
    message: string,
  ) {
    super(message);
    this.name = "InvalidDurationError";
  }
}

/**
 * Interprète une durée saisie à la main.
 *
 * Personne ne tape « 90 » pour une heure et demie : on écrit « 1h30 », « 1:30 »
 * ou « 1,5 h ». Refuser ces formes obligerait à convertir de tête à chaque
 * saisie, et une conversion de tête est une erreur de saisie en puissance.
 *
 * Formes acceptées : `90`, `1h30`, `1 h 30`, `1:30`, `1h`, `1,5h`, `0.75h`,
 * `45min`, `45 m`.
 */
export function parseDuration(input: string): number {
  const nettoye = input.trim().toLowerCase().replace(/\s+/g, "");
  if (nettoye.length === 0) {
    throw new InvalidDurationError(input, "Indique une durée.");
  }

  // Forme « 1h30 », « 1h », « 1:30 » — heures et minutes séparées.
  const separe = /^(\d+)(?:h|:)(\d{1,2})?$/.exec(nettoye);
  if (separe !== null) {
    const heures = Number(separe[1]);
    const minutes = separe[2] === undefined ? 0 : Number(separe[2]);
    if (minutes > 59) {
      throw new InvalidDurationError(
        input,
        "Les minutes vont de 0 à 59 : écris « 2h05 », pas « 1h65 ».",
      );
    }
    return heures * 60 + minutes;
  }

  // Forme décimale « 1,5h » ou « 0.75h ».
  const decimal = /^(\d+(?:[.,]\d+)?)h$/.exec(nettoye);
  if (decimal !== null) {
    const heures = Number((decimal[1] ?? "").replace(",", "."));
    // Arrondi à la minute : 0,333 h n'a pas de représentation exacte en
    // minutes, et laisser filer la fraction ferait dériver les totaux.
    return Math.round(heures * 60);
  }

  // Forme « 45min », « 45m » ou « 45 » — des minutes.
  const enMinutes = /^(\d+)(?:min|m)?$/.exec(nettoye);
  if (enMinutes !== null) {
    return Number(enMinutes[1]);
  }

  throw new InvalidDurationError(
    input,
    `« ${input.trim()} » n'est pas une durée. Écris par exemple « 1h30 », « 90 » ou « 1,5h ».`,
  );
}

/** Affichage lisible : « 1 h 30 », « 45 min », « 2 h ». */
export function formatDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new InvalidDurationError(
      String(minutes),
      "La durée affichée doit être un nombre entier de minutes positif.",
    );
  }
  if (minutes === 0) return "0 min";

  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (heures === 0) return `${reste} min`;
  if (reste === 0) return `${heures} h`;
  return `${heures} h ${String(reste).padStart(2, "0")}`;
}

/** Durée en heures décimales, pour les taux et les moyennes. */
export function toHours(minutes: number): number {
  return minutes / 60;
}

/**
 * Contrôle une saisie avant enregistrement.
 *
 * Chaque refus nomme le champ fautif et dit quoi faire : un message d'erreur
 * qui se contente de « saisie invalide » oblige à deviner.
 */
export function validateTimeEntry(
  draft: Omit<TimeEntry, "id">,
  options: { readonly today?: IsoDate } = {},
): void {
  if (draft.projectId.trim().length === 0) {
    throw new InvalidTimeEntryError(
      "projectId",
      "Rattache la saisie à un projet : un temps sans projet ne se rentabilise pas.",
    );
  }

  if (!isIsoDate(draft.date)) {
    throw new InvalidTimeEntryError(
      "date",
      "La date de la saisie est absente ou invalide.",
    );
  }

  // Une saisie dans le futur est presque toujours une erreur de calendrier :
  // on la refuse plutôt que de laisser un temps « déjà passé » demain.
  if (options.today !== undefined && draft.date > options.today) {
    throw new InvalidTimeEntryError(
      "date",
      "On ne saisit pas du temps dans le futur. Corrige la date.",
    );
  }

  if (!Number.isInteger(draft.minutes) || draft.minutes <= 0) {
    throw new InvalidTimeEntryError(
      "minutes",
      "La durée doit être un nombre entier de minutes strictement positif.",
    );
  }

  if (draft.minutes > MAX_MINUTES_PER_ENTRY) {
    throw new InvalidTimeEntryError(
      "minutes",
      `Une seule saisie ne peut dépasser ${formatDuration(MAX_MINUTES_PER_ENTRY)}. Découpe la journée en plusieurs lignes.`,
    );
  }

  if (draft.description.trim().length === 0) {
    throw new InvalidTimeEntryError(
      "description",
      "Décris la tâche : un temps sans intitulé est inexploitable dans trois mois.",
    );
  }

  if (!Number.isInteger(draft.hourlyCost) || draft.hourlyCost < 0) {
    throw new InvalidTimeEntryError(
      "hourlyCost",
      "Le coût horaire doit être un entier positif ou nul, exprimé en unité mineure.",
    );
  }
}

/** Somme des durées, en minutes. */
export function totalMinutes(entries: readonly TimeEntry[]): number {
  return entries.reduce((total, entry) => total + entry.minutes, 0);
}

/** Durée refacturable uniquement. */
export function billableMinutes(entries: readonly TimeEntry[]): number {
  return totalMinutes(entries.filter((entry) => entry.billable));
}

/**
 * Coût du temps passé.
 *
 * L'arrondi se fait saisie par saisie, puis on additionne : chaque ligne de
 * temps est une ligne de coût, et une ligne de coût s'affiche. Arrondir
 * seulement le total ferait qu'additionner la colonne affichée donnerait un
 * autre résultat que le total affiché.
 */
export function laborCost(
  entries: readonly TimeEntry[],
  currency: CurrencyCode,
): Money {
  const couts = entries.map((entry) =>
    multiply(money(entry.hourlyCost, currency), toHours(entry.minutes)),
  );
  return sum(couts, currency);
}

/** Coût d'une seule saisie. */
export function entryCost(entry: TimeEntry, currency: CurrencyCode): Money {
  return multiply(money(entry.hourlyCost, currency), toHours(entry.minutes));
}
