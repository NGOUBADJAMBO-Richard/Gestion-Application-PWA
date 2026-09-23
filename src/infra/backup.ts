import { z } from "zod";

/**
 * Export et import de sauvegarde.
 *
 * L'application ne stocke rien ailleurs que dans ce navigateur. Vider les
 * données du site, changer de machine ou réinstaller le système efface donc la
 * comptabilité de l'agence. La sauvegarde n'est pas un confort : c'est la
 * seule protection qui existe.
 *
 * Trois exigences guident ce module :
 *
 * - **rien n'est importé en silence** : on montre ce qui va changer et on
 *   attend une confirmation explicite ;
 * - **un fichier altéré est détecté** avant d'écraser des données valides,
 *   grâce à une empreinte SHA-256 ;
 * - **un format futur est reconnu comme tel** plutôt que mal interprété.
 */

export const BACKUP_FORMAT = "codewave-studio-backup";
export const BACKUP_FORMAT_VERSION = 1;

/**
 * Schéma du fichier de sauvegarde.
 *
 * C'est le seul endroit où `zod` est justifié : un fichier importé vient de
 * l'extérieur, il peut être tronqué, modifié à la main ou provenir d'une autre
 * application. Ailleurs, des vérifications écrites à la main suffisent.
 */
const envelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.number().int().positive(),
  appVersion: z.string(),
  exportedAt: z.string(),
  checksum: z.string(),
  collections: z.record(z.string(), z.array(z.unknown())),
});

export type BackupEnvelope = z.infer<typeof envelopeSchema>;

export type BackupProblem =
  | { readonly kind: "notJson"; readonly message: string }
  | { readonly kind: "notABackup"; readonly message: string }
  | {
      readonly kind: "futureVersion";
      readonly message: string;
      readonly fileVersion: number;
    }
  | {
      readonly kind: "checksumMismatch";
      readonly message: string;
      readonly expected: string;
      readonly actual: string;
    };

export class BackupError extends Error {
  constructor(readonly problem: BackupProblem) {
    super(problem.message);
    this.name = "BackupError";
  }
}

/**
 * Empreinte du contenu.
 *
 * Calculée sur `collections` uniquement : l'horodatage d'export et la version
 * de l'application changent d'un export à l'autre sans que les données
 * changent, et les inclure rendrait l'empreinte inutilisable pour comparer
 * deux sauvegardes.
 *
 * `JSON.stringify` ne garantit pas l'ordre des clés d'un objet reconstruit
 * autrement ; on trie donc explicitement avant de sérialiser, sinon un aller
 * retour par un éditeur de texte invaliderait une sauvegarde saine.
 */
export async function computeChecksum(
  collections: Record<string, readonly unknown[]>,
): Promise<string> {
  const canonical = stableStringify(collections);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return [...new Uint8Array(digest)]
    .map((octet) => octet.toString(16).padStart(2, "0"))
    .join("");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Compose une sauvegarde à partir de l'état courant des collections. */
export async function createBackup(
  collections: Record<string, readonly unknown[]>,
  appVersion: string,
  now: Date = new Date(),
): Promise<BackupEnvelope> {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion,
    exportedAt: now.toISOString(),
    checksum: await computeChecksum(collections),
    collections: structuredCloneCollections(collections),
  };
}

function structuredCloneCollections(
  collections: Record<string, readonly unknown[]>,
): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {};
  for (const [name, items] of Object.entries(collections)) out[name] = [...items];
  return out;
}

/** Sérialise une sauvegarde pour l'écrire dans un fichier. */
export function serializeBackup(envelope: BackupEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

/** Nom de fichier horodaté, trié chronologiquement dans un dossier. */
export function backupFileName(now: Date = new Date()): string {
  const horodatage = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `codewave-studio-sauvegarde-${horodatage}.json`;
}

/**
 * Relit et valide un fichier de sauvegarde.
 *
 * Aucune écriture ici : cette fonction répond « ce fichier est-il exploitable,
 * et que contient-il ». L'écriture se décide ensuite, après confirmation.
 */
export async function parseBackup(text: string): Promise<BackupEnvelope> {
  let brut: unknown;
  try {
    brut = JSON.parse(text);
  } catch {
    throw new BackupError({
      kind: "notJson",
      message:
        "Ce fichier n'est pas lisible. Vérifie que tu as choisi un fichier de sauvegarde " +
        "CodeWave Studio et qu'il n'a pas été modifié.",
    });
  }

  const resultat = envelopeSchema.safeParse(brut);
  if (!resultat.success) {
    throw new BackupError({
      kind: "notABackup",
      message:
        "Ce fichier n'est pas une sauvegarde CodeWave Studio. " +
        "Les sauvegardes portent un nom commençant par « codewave-studio-sauvegarde ».",
    });
  }

  const envelope = resultat.data;

  if (envelope.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupError({
      kind: "futureVersion",
      fileVersion: envelope.formatVersion,
      message:
        `Cette sauvegarde vient d'une version plus récente de l'application ` +
        `(format ${envelope.formatVersion}, cette version lit jusqu'au ${BACKUP_FORMAT_VERSION}). ` +
        "Mets l'application à jour avant de l'importer.",
    });
  }

  const empreinte = await computeChecksum(envelope.collections);
  if (empreinte !== envelope.checksum) {
    throw new BackupError({
      kind: "checksumMismatch",
      expected: envelope.checksum,
      actual: empreinte,
      message:
        "Le contenu de cette sauvegarde ne correspond pas à son empreinte : " +
        "le fichier a été modifié ou endommagé. Importe-la et tu risques " +
        "d'écraser des données saines par des données corrompues.",
    });
  }

  return envelope;
}

export interface CollectionDiff {
  readonly collection: string;
  readonly currentCount: number;
  readonly incomingCount: number;
  /** Éléments présents des deux côtés : ils seront écrasés. */
  readonly overwritten: number;
  /** Éléments présents seulement dans la sauvegarde. */
  readonly added: number;
  /** Éléments présents seulement en local : ils seront perdus. */
  readonly lost: number;
}

export interface BackupPreview {
  readonly exportedAt: string;
  readonly appVersion: string;
  readonly diffs: readonly CollectionDiff[];
  /** Vrai si l'import ferait disparaître des données locales. */
  readonly hasLosses: boolean;
}

function idsOf(items: readonly unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (typeof item === "object" && item !== null) {
      const id = (item as { id?: unknown }).id;
      if (typeof id === "string") ids.add(id);
    }
  }
  return ids;
}

/**
 * Ce que l'import changerait, collection par collection.
 *
 * Sert à poser la question avant d'agir : « 4 clients seront écrasés, 2 seront
 * ajoutés, 1 sera perdu ». Un import qui ne dit pas ce qu'il détruit n'est pas
 * acceptable sur une comptabilité.
 */
export function previewBackup(
  envelope: BackupEnvelope,
  current: Record<string, readonly unknown[]>,
): BackupPreview {
  const noms = new Set([
    ...Object.keys(envelope.collections),
    ...Object.keys(current),
  ]);

  const diffs: CollectionDiff[] = [];
  for (const collection of [...noms].sort()) {
    const locaux = current[collection] ?? [];
    const entrants = envelope.collections[collection] ?? [];
    const idsLocaux = idsOf(locaux);
    const idsEntrants = idsOf(entrants);

    let overwritten = 0;
    for (const id of idsEntrants) if (idsLocaux.has(id)) overwritten += 1;

    let lost = 0;
    for (const id of idsLocaux) if (!idsEntrants.has(id)) lost += 1;

    diffs.push({
      collection,
      currentCount: locaux.length,
      incomingCount: entrants.length,
      overwritten,
      added: idsEntrants.size - overwritten,
      lost,
    });
  }

  return {
    exportedAt: envelope.exportedAt,
    appVersion: envelope.appVersion,
    diffs,
    hasLosses: diffs.some((diff) => diff.lost > 0),
  };
}
