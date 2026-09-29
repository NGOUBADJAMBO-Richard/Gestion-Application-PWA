/**
 * Vérification du mot de passe d'accès à l'application.
 *
 * Ce que cette protection fait, et ce qu'elle ne fait pas — il faut être net,
 * parce qu'une sécurité mal comprise est pire qu'une sécurité absente :
 *
 * ELLE PROTÈGE contre l'accès occasionnel : un ordinateur laissé ouvert, un
 * collègue de passage, un poste partagé.
 *
 * ELLE NE PROTÈGE PAS contre quelqu'un qui a la main sur la machine. Les
 * données ne sont pas chiffrées : elles restent lisibles dans les outils de
 * développement du navigateur. Ce choix est délibéré — chiffrer signifierait
 * qu'un mot de passe oublié détruit définitivement la comptabilité de
 * l'agence, un risque plus grand que celui qu'on écarterait.
 *
 * Le mot de passe lui-même n'est jamais stocké. On conserve une dérivation
 * PBKDF2-SHA256 salée, qui ne permet pas de le retrouver.
 */

/** Coût de dérivation. Au-dessus de la recommandation OWASP de 600 000. */
export const PBKDF2_ITERATIONS = 650_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export interface StoredCredential {
  /** Version du format, pour pouvoir durcir le coût plus tard. */
  readonly version: 1;
  readonly algorithm: "PBKDF2-SHA256";
  readonly iterations: number;
  /** Sel encodé en base64. */
  readonly salt: string;
  /** Empreinte encodée en base64. */
  readonly hash: string;
  /** Empreinte du code de récupération, dérivée de la même façon. */
  readonly recoveryHash: string;
  readonly recoverySalt: string;
  readonly createdAt: string;
}

export class WeakPasswordError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "WeakPasswordError";
  }
}

function toBase64(bytes: Uint8Array): string {
  let binaire = "";
  for (const octet of bytes) binaire += String.fromCharCode(octet);
  return btoa(binaire);
}

function fromBase64(value: string): Uint8Array {
  const binaire = atob(value);
  const bytes = new Uint8Array(binaire.length);
  for (let index = 0; index < binaire.length; index += 1) {
    bytes[index] = binaire.charCodeAt(index);
  }
  return bytes;
}

async function derive(
  secret: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/**
 * Comparaison à temps constant.
 *
 * Une comparaison qui s'arrête au premier octet différent laisse fuiter, par
 * sa durée, le nombre d'octets corrects. Ici on parcourt toujours la totalité.
 */
function equalsConstantTime(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

/** Alphabet du code de récupération : sans I, L, O, U — pas de confusion. */
const RECOVERY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const RECOVERY_GROUPS = 4;
const RECOVERY_GROUP_LENGTH = 5;

/**
 * Code de récupération à usage unique.
 *
 * Vingt caractères sur un alphabet de 32, soit 100 bits d'entropie. Il sert à
 * redéfinir le mot de passe sans effacer les données : sans lui, un mot de
 * passe oublié n'aurait d'autre issue que la réinitialisation complète.
 */
export function generateRecoveryCode(): string {
  const total = RECOVERY_GROUPS * RECOVERY_GROUP_LENGTH;
  const bytes = new Uint8Array(total);
  crypto.getRandomValues(bytes);

  const caracteres = [...bytes].map(
    (octet) => RECOVERY_ALPHABET[octet % RECOVERY_ALPHABET.length] ?? "0",
  );

  const groupes: string[] = [];
  for (let index = 0; index < total; index += RECOVERY_GROUP_LENGTH) {
    groupes.push(caracteres.slice(index, index + RECOVERY_GROUP_LENGTH).join(""));
  }
  return groupes.join("-");
}

/**
 * Normalise une saisie de code de récupération.
 *
 * L'utilisateur recopie un code écrit à la main : il peut oublier les tirets,
 * ajouter des espaces ou saisir en minuscules. Rien de tout cela ne doit faire
 * échouer une récupération légitime.
 */
export function normalizeRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/**
 * Exigences minimales sur le mot de passe.
 *
 * Volontairement modestes : la protection vise l'accès occasionnel, et une
 * politique trop stricte pousse à écrire le mot de passe sur un papier collé
 * à l'écran — ce qui est pire.
 */
export function checkPasswordStrength(password: string): void {
  if (password.length < 10) {
    throw new WeakPasswordError(
      "Le mot de passe doit faire au moins 10 caractères. " +
        "Une phrase facile à retenir fait un bon mot de passe.",
    );
  }
  if (/^\d+$/.test(password)) {
    throw new WeakPasswordError(
      "Un mot de passe uniquement composé de chiffres se devine trop vite. " +
        "Ajoute des lettres.",
    );
  }
}

/** Crée les éléments à stocker, et rend le code de récupération à afficher. */
export async function createCredential(
  password: string,
  /** Abaissé uniquement par les tests : 650 000 itérations coûtent ~0,5 s. */
  iterations: number = PBKDF2_ITERATIONS,
): Promise<{
  credential: StoredCredential;
  recoveryCode: string;
}> {
  checkPasswordStrength(password);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const recoverySalt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const recoveryCode = generateRecoveryCode();

  const [hash, recoveryHash] = await Promise.all([
    derive(password, salt, iterations),
    derive(normalizeRecoveryCode(recoveryCode), recoverySalt, iterations),
  ]);

  return {
    credential: {
      version: 1,
      algorithm: "PBKDF2-SHA256",
      iterations,
      salt: toBase64(salt),
      hash: toBase64(hash),
      recoverySalt: toBase64(recoverySalt),
      recoveryHash: toBase64(recoveryHash),
      createdAt: new Date().toISOString(),
    },
    recoveryCode,
  };
}

/** Vrai si le mot de passe correspond. Ne dit jamais pourquoi il échoue. */
export async function verifyPassword(
  password: string,
  stored: StoredCredential,
): Promise<boolean> {
  const candidat = await derive(
    password,
    fromBase64(stored.salt),
    stored.iterations,
  );
  return equalsConstantTime(candidat, fromBase64(stored.hash));
}

/** Vrai si le code de récupération correspond. */
export async function verifyRecoveryCode(
  code: string,
  stored: StoredCredential,
): Promise<boolean> {
  const candidat = await derive(
    normalizeRecoveryCode(code),
    fromBase64(stored.recoverySalt),
    stored.iterations,
  );
  return equalsConstantTime(candidat, fromBase64(stored.recoveryHash));
}

/**
 * Redéfinit le mot de passe après une récupération réussie.
 *
 * Un nouveau code de récupération est émis : l'ancien a servi, et un code de
 * récupération qui reste valable après usage est un second mot de passe
 * permanent qui traîne sur un papier.
 */
export async function resetPassword(
  newPassword: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<{ credential: StoredCredential; recoveryCode: string }> {
  return createCredential(newPassword, iterations);
}
