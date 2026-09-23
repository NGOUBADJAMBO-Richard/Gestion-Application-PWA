/**
 * Arithmétique monétaire.
 *
 * Règle absolue : **un montant n'est jamais un nombre à virgule flottante.**
 * `0.1 + 0.2` vaut 0,30000000000000004 en IEEE 754. Sur une ligne de facture
 * l'écart est invisible ; sur un grand livre de plusieurs milliers d'écritures
 * il finit par décaler un total, et un total faux est une facture fausse.
 *
 * Tout montant est donc un **entier exprimé en unité mineure** :
 * - XAF (franc CFA BEAC) : 0 décimale, l'unité mineure est le franc lui-même ;
 * - EUR et USD : 2 décimales, l'unité mineure est le centime.
 *
 * Ce module est pur : aucune dépendance, aucun accès au monde extérieur.
 */

export type CurrencyCode = "XAF" | "EUR" | "USD";

export interface Money {
  /** Entier, en unité mineure. 1 500 XAF s'écrit 1500 ; 15,00 € s'écrit 1500. */
  readonly amount: number;
  readonly currency: CurrencyCode;
}

/** Nombre de décimales de chaque devise. */
export const MINOR_UNITS: Record<CurrencyCode, number> = {
  XAF: 0,
  EUR: 2,
  USD: 2,
};

export class CurrencyMismatchError extends Error {
  constructor(
    readonly expected: CurrencyCode,
    readonly received: CurrencyCode,
  ) {
    super(
      `Opération entre devises différentes : ${expected} et ${received}. ` +
        "Convertis explicitement avant d'additionner.",
    );
    this.name = "CurrencyMismatchError";
  }
}

export class InvalidAmountError extends Error {
  constructor(value: number) {
    super(
      `Montant invalide : ${value}. Un montant est un entier fini exprimé en unité mineure.`,
    );
    this.name = "InvalidAmountError";
  }
}

/** Construit un montant, en refusant tout ce qui n'est pas un entier fini. */
export function money(amount: number, currency: CurrencyCode): Money {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new InvalidAmountError(amount);
  }
  return { amount, currency };
}

/** Montant nul dans la devise donnée. */
export function zero(currency: CurrencyCode): Money {
  return { amount: 0, currency };
}

export function isZero(value: Money): boolean {
  return value.amount === 0;
}

export function isNegative(value: Money): boolean {
  return value.amount < 0;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

export function negate(value: Money): Money {
  return { amount: -value.amount, currency: value.currency };
}

/**
 * Somme d'une liste. La devise est déduite du premier élément ; une liste vide
 * exige donc une devise explicite, car « zéro » n'a pas de sens sans unité.
 */
export function sum(
  values: readonly Money[],
  currencyIfEmpty?: CurrencyCode,
): Money {
  const first = values[0];
  if (first === undefined) {
    if (currencyIfEmpty === undefined) {
      throw new Error(
        "Somme d'une liste vide sans devise : précise la devise attendue.",
      );
    }
    return zero(currencyIfEmpty);
  }
  return values.reduce((total, value) => add(total, value), zero(first.currency));
}

/**
 * Arrondi commercial au demi supérieur, symétrique autour de zéro.
 *
 * `Math.round(-0.5)` vaut -0 en JavaScript : l'arrondi penche toujours vers le
 * haut, donc un avoir ne serait pas le miroir exact de la facture qu'il annule.
 * Ici 0,5 va à 1 et -0,5 va à -1 : `roundHalfUp(-x) === -roundHalfUp(x)`.
 */
export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) {
    throw new InvalidAmountError(value);
  }
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Multiplie un montant par un facteur quelconque (quantité, taux, part) et
 * arrondit à l'unité mineure. C'est le seul endroit où un flottant entre dans
 * le calcul, et il en ressort immédiatement.
 */
export function multiply(value: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new InvalidAmountError(factor);
  }
  return {
    amount: roundHalfUp(value.amount * factor),
    currency: value.currency,
  };
}

/** Applique un pourcentage (18 pour 18 %) et arrondit. */
export function percentOf(value: Money, percent: number): Money {
  return multiply(value, percent / 100);
}

/**
 * Retire un pourcentage de remise.
 *
 * Distinct de `percentOf` : `montant - remise` et `montant x (1 - taux)` ne
 * donnent pas toujours le même entier après arrondi. C'est la seconde forme
 * qui fait foi ici, et un test le vérifie.
 */
export function applyDiscount(value: Money, discountPercent: number): Money {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new RangeError(
      `Remise hors bornes : ${discountPercent} %. Attendu entre 0 et 100.`,
    );
  }
  return multiply(value, (100 - discountPercent) / 100);
}

/**
 * Répartit un montant en `parts` portions aussi égales que possible, **sans
 * perdre une seule unité**. Le reliquat est distribué une unité à la fois sur
 * les premières portions, si bien que la somme des parts égale toujours le
 * montant d'origine.
 *
 * Sert aux échéanciers et à la ventilation d'une remise globale.
 */
export function allocate(value: Money, parts: number): readonly Money[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new RangeError(`Nombre de parts invalide : ${parts}.`);
  }

  const sign = value.amount < 0 ? -1 : 1;
  const total = Math.abs(value.amount);
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;

  return Array.from({ length: parts }, (_unused, index) => ({
    amount: sign * (base + (index < remainder ? 1 : 0)),
    currency: value.currency,
  }));
}

/** Convertit une saisie en unité majeure (12,5 €) en unité mineure (1250). */
export function fromMajorUnit(value: number, currency: CurrencyCode): Money {
  if (!Number.isFinite(value)) {
    throw new InvalidAmountError(value);
  }
  const factor = 10 ** MINOR_UNITS[currency];
  return { amount: roundHalfUp(value * factor), currency };
}

/** Rend le montant en unité majeure. À réserver à l'affichage. */
export function toMajorUnit(value: Money): number {
  return value.amount / 10 ** MINOR_UNITS[value.currency];
}

/**
 * Formate pour l'affichage.
 *
 * `Intl.NumberFormat` connaît le nombre de décimales de chaque devise ; on le
 * contraint tout de même, car certaines versions de navigateur affichent le
 * franc CFA avec des décimales alors qu'il n'en a pas.
 */
export function formatMoney(
  value: Money,
  locale: string = "fr-FR",
  options: Intl.NumberFormatOptions = {},
): string {
  const digits = MINOR_UNITS[value.currency];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    ...options,
  }).format(toMajorUnit(value));
}

/** Comparaison ordonnée : négatif, nul ou positif. */
export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amount - b.amount;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

/**
 * Répartit un montant au prorata de poids donnés, sans perdre d'unité.
 *
 * Méthode du plus fort reste : on attribue d'abord la part entière de chaque
 * poids, puis les unités restantes vont aux portions dont la partie
 * fractionnaire est la plus grande. La somme des parts égale toujours le
 * montant d'origine.
 *
 * Sert à ventiler une TVA calculée globalement sur les lignes qui la portent :
 * la TVA affichée ligne par ligne doit se resommer exactement au total, sinon
 * le client additionne la colonne et trouve autre chose que le pied de facture.
 */
export function distribute(
  value: Money,
  weights: readonly number[],
): readonly Money[] {
  if (weights.length === 0) return [];
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new RangeError("Les poids de répartition doivent être finis et positifs.");
  }

  const totalWeight = weights.reduce((total, weight) => total + weight, 0);

  // Poids tous nuls : aucune base au prorata, on répartit également.
  if (totalWeight === 0) return allocate(value, weights.length);

  const sign = value.amount < 0 ? -1 : 1;
  const target = Math.abs(value.amount);

  const exact = weights.map((weight) => (target * weight) / totalWeight);
  const floors = exact.map((part) => Math.floor(part));
  let remaining = target - floors.reduce((total, part) => total + part, 0);

  // Ordre de service : plus forte partie fractionnaire d'abord ; à égalité,
  // l'indice le plus petit, pour que le résultat soit reproductible.
  const order = exact
    .map((part, index) => ({ index, fraction: part - Math.floor(part) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const shares = [...floors];
  for (const { index } of order) {
    if (remaining <= 0) break;
    shares[index] = (shares[index] ?? 0) + 1;
    remaining -= 1;
  }

  return shares.map((share) => ({
    amount: sign * share,
    currency: value.currency,
  }));
}
