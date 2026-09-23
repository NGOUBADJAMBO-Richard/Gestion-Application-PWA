/**
 * Identifiants d'entités.
 *
 * Format ULID : 26 caractères en base32 de Crockford, dont 10 encodent
 * l'horodatage en millisecondes. Deux propriétés qui comptent ici :
 *
 * - **tri chronologique par simple comparaison de chaînes** — lister les
 *   factures par ordre de création ne demande aucun champ de date ;
 * - **pas de collision** en pratique, sans coordination centrale.
 *
 * Écrit à la main plutôt qu'importé : une trentaine de lignes contre une
 * dépendance de plus à suivre et à auditer.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // sans I, L, O, U
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;

/** Source d'aléa. `crypto` est présent dans tous les navigateurs visés. */
function randomByte(): number {
  const buffer = new Uint8Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? 0;
}

function encodeTime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new RangeError(`Horodatage invalide pour un identifiant : ${milliseconds}`);
  }
  let remaining = Math.floor(milliseconds);
  let out = "";
  for (let index = 0; index < TIME_LENGTH; index += 1) {
    out = (ALPHABET[remaining % 32] ?? "0") + out;
    remaining = Math.floor(remaining / 32);
  }
  return out;
}

function encodeRandom(): string {
  let out = "";
  for (let index = 0; index < RANDOM_LENGTH; index += 1) {
    out += ALPHABET[randomByte() % 32] ?? "0";
  }
  return out;
}

/** Nouvel identifiant, trié chronologiquement. */
export function newId(at: number = Date.now()): string {
  return encodeTime(at) + encodeRandom();
}

/** Vrai si la chaîne a la forme d'un identifiant produit ici. */
export function isId(value: string): boolean {
  if (value.length !== TIME_LENGTH + RANDOM_LENGTH) return false;
  for (const character of value) {
    if (!ALPHABET.includes(character)) return false;
  }
  return true;
}

/** Horodatage de création contenu dans l'identifiant. */
export function idCreatedAt(value: string): number {
  if (!isId(value)) {
    throw new RangeError(`Identifiant illisible : ${value}`);
  }
  let total = 0;
  for (const character of value.slice(0, TIME_LENGTH)) {
    total = total * 32 + ALPHABET.indexOf(character);
  }
  return total;
}
