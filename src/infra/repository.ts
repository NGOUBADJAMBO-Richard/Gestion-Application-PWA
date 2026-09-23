/**
 * Contrat de stockage.
 *
 * Aucune page n'appelle `localStorage` ni `indexedDB` directement. Le jour où
 * un serveur arrive, on remplace l'implémentation — pas les écrans.
 *
 * Toutes les méthodes sont asynchrones, y compris dans l'implémentation
 * localStorage qui pourrait être synchrone : si la signature était synchrone
 * aujourd'hui, passer à IndexedDB ou à une API réseau demain obligerait à
 * réécrire tous les appelants.
 */

export interface Entity {
  readonly id: string;
}

export interface Repository<T extends Entity> {
  /** Tous les éléments vivants, corbeille exclue. */
  list(): Promise<readonly T[]>;
  /** Éléments placés en corbeille. */
  listDeleted(): Promise<readonly T[]>;
  get(id: string): Promise<T | undefined>;
  create(draft: Omit<T, "id">): Promise<T>;
  update(id: string, patch: Partial<Omit<T, "id">>): Promise<T>;
  /** Suppression douce : l'élément part en corbeille. */
  remove(id: string): Promise<void>;
  restore(id: string): Promise<T>;
  /** Suppression définitive. Réservée à la purge explicite. */
  purge(id: string): Promise<void>;
  /** Remplacement complet, pour l'import et la restauration de sauvegarde. */
  bulkSet(items: readonly T[]): Promise<void>;
  /** Notifie ce contexte et les autres onglets. Rend la fonction de retrait. */
  subscribe(listener: () => void): () => void;
}

export interface StorageHealth {
  usedBytes: number;
  quotaBytes: number;
  /** Au-delà de 0,8 l'interface doit alerter. */
  ratio: number;
  /** Résultat de navigator.storage.persist(). */
  persisted: boolean;
}

export class StorageQuotaError extends Error {
  constructor(
    readonly collection: string,
    readonly usedBytes: number,
  ) {
    super(
      `Espace de stockage saturé en écrivant « ${collection} ». ` +
        "Exporte une sauvegarde, puis vide la corbeille pour libérer de la place.",
    );
    this.name = "StorageQuotaError";
  }
}

export class CorruptDataError extends Error {
  constructor(
    readonly collection: string,
    readonly detail: string,
  ) {
    super(
      `Données illisibles dans « ${collection} » : ${detail}. ` +
        "Restaure la dernière sauvegarde depuis Paramètres, ou repars des données de démonstration.",
    );
    this.name = "CorruptDataError";
  }
}

export class NotFoundError extends Error {
  constructor(
    readonly collection: string,
    readonly id: string,
  ) {
    super(`Élément introuvable dans « ${collection} » : ${id}.`);
    this.name = "NotFoundError";
  }
}

/**
 * État de l'espace de stockage.
 *
 * `navigator.storage` n'existe pas partout ; l'absence d'information n'est pas
 * une erreur, elle se signale par un quota nul plutôt que par une exception.
 */
export async function readStorageHealth(): Promise<StorageHealth> {
  const vide: StorageHealth = {
    usedBytes: 0,
    quotaBytes: 0,
    ratio: 0,
    persisted: false,
  };

  if (typeof navigator === "undefined" || navigator.storage === undefined) {
    return vide;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage ?? 0;
    const quotaBytes = estimate.quota ?? 0;
    const persisted =
      typeof navigator.storage.persisted === "function"
        ? await navigator.storage.persisted()
        : false;

    return {
      usedBytes,
      quotaBytes,
      ratio: quotaBytes > 0 ? usedBytes / quotaBytes : 0,
      persisted,
    };
  } catch {
    return vide;
  }
}

/**
 * Demande au navigateur de ne pas évincer ces données.
 *
 * Sans cela, un navigateur à court d'espace peut supprimer le stockage d'un
 * site sans prévenir — ici, la comptabilité de l'agence.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    navigator.storage === undefined ||
    typeof navigator.storage.persist !== "function"
  ) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
