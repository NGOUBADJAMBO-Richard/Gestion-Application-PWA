/**
 * Numérotation des documents commerciaux.
 *
 * Trois contraintes comptables, non négociables :
 *
 * 1. Un numéro n'est attribué qu'à **l'émission**, jamais à la création du
 *    brouillon. Un brouillon abandonné ne doit pas laisser de trou.
 * 2. La séquence repart à 1 **par année et par type de document**.
 * 3. Un document émis garde son numéro pour toujours.
 *
 * Le calcul du prochain numéro se fonde sur les numéros **déjà attribués**, et
 * jamais sur la taille du tableau : supprimer un brouillon puis en recréer un
 * réattribuerait sinon un numéro déjà utilisé.
 */

export type DocumentKind = "quote" | "invoice" | "creditNote";

/** Préfixes en français, conformes à l'usage local. */
export const KIND_PREFIX: Record<DocumentKind, string> = {
  quote: "DEV",
  invoice: "FAC",
  creditNote: "AV",
};

/** Nombre de chiffres du compteur. FAC-2026-001. */
const SEQUENCE_WIDTH = 3;

export interface ParsedNumber {
  readonly kind: DocumentKind;
  readonly year: number;
  readonly sequence: number;
}

export class NumberingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NumberingError";
  }
}

function prefixOf(kind: DocumentKind, year: number): string {
  return `${KIND_PREFIX[kind]}-${year}-`;
}

/** Compose un numéro à partir de ses trois composantes. */
export function formatNumber(
  kind: DocumentKind,
  year: number,
  sequence: number,
): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new NumberingError(
      `Numéro de séquence invalide : ${sequence}. La numérotation commence à 1.`,
    );
  }
  return `${prefixOf(kind, year)}${String(sequence).padStart(SEQUENCE_WIDTH, "0")}`;
}

/** Décompose un numéro, ou renvoie undefined s'il ne suit pas le format. */
export function parseNumber(value: string): ParsedNumber | undefined {
  const match = /^(DEV|FAC|AV)-(\d{4})-(\d+)$/.exec(value.trim());
  if (match === null) return undefined;

  const [, rawPrefix, rawYear, rawSequence] = match;
  const kind = (Object.keys(KIND_PREFIX) as DocumentKind[]).find(
    (candidate) => KIND_PREFIX[candidate] === rawPrefix,
  );
  if (kind === undefined) return undefined;

  const year = Number(rawYear);
  const sequence = Number(rawSequence);
  if (!Number.isInteger(year) || !Number.isInteger(sequence) || sequence < 1) {
    return undefined;
  }

  return { kind, year, sequence };
}

/**
 * Prochain numéro disponible.
 *
 * `existingNumbers` contient les numéros **déjà attribués**, tous types et
 * toutes années confondus : le tri est fait ici, pour que l'appelant n'ait pas
 * à filtrer correctement — c'est exactement le genre de filtre qu'on oublie.
 */
export function nextNumber(
  existingNumbers: readonly string[],
  kind: DocumentKind,
  year: number,
): string {
  let highest = 0;
  for (const value of existingNumbers) {
    const parsed = parseNumber(value);
    if (parsed === undefined) continue;
    if (parsed.kind !== kind || parsed.year !== year) continue;
    if (parsed.sequence > highest) highest = parsed.sequence;
  }
  return formatNumber(kind, year, highest + 1);
}

/**
 * Trous dans une séquence.
 *
 * Une numérotation comptable doit être continue. Cette fonction ne corrige
 * rien — corriger signifierait renuméroter des documents émis, ce qui est
 * interdit — mais elle permet de signaler l'anomalie à l'utilisateur.
 */
export function findSequenceGaps(
  existingNumbers: readonly string[],
  kind: DocumentKind,
  year: number,
): readonly number[] {
  const used = new Set<number>();
  for (const value of existingNumbers) {
    const parsed = parseNumber(value);
    if (parsed?.kind === kind && parsed.year === year) used.add(parsed.sequence);
  }
  if (used.size === 0) return [];

  const highest = Math.max(...used);
  const gaps: number[] = [];
  for (let sequence = 1; sequence < highest; sequence += 1) {
    if (!used.has(sequence)) gaps.push(sequence);
  }
  return gaps;
}

/**
 * Reprise des numéros hérités du préfixe « INV- ».
 *
 * L'application numérotait `INV-2026-001`. Le préfixe devient `FAC-`. On ne
 * renumérote pas : on traduit le préfixe en conservant année et séquence, si
 * bien qu'une facture déjà remise à un client garde le même rang.
 */
export function migrateLegacyNumber(value: string): string {
  const match = /^INV-(\d{4})-(\d+)$/.exec(value.trim());
  if (match === null) return value;

  const [, rawYear, rawSequence] = match;
  return `${KIND_PREFIX.invoice}-${rawYear}-${(rawSequence ?? "").padStart(SEQUENCE_WIDTH, "0")}`;
}
