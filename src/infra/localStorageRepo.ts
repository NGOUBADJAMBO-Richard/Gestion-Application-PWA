import { newId } from "../domain/id";
import { todayIso } from "../domain/date";
import { storageKey } from "../branding";
import {
  CorruptDataError,
  type Entity,
  NotFoundError,
  type Repository,
  StorageQuotaError,
} from "./repository";

/**
 * Implémentation du contrat `Repository` sur `localStorage`.
 *
 * Trois points où l'implémentation d'origine (`src/app/data/store.ts`) était
 * insuffisante, et que celle-ci corrige :
 *
 * 1. elle faisait `return data as T[]` — une assertion de type, pas une
 *    vérification. Une donnée corrompue traversait sans bruit et provoquait un
 *    plantage bien plus loin, sur un écran sans rapport ;
 * 2. aucune gestion du quota : un `setItem` refusé passait inaperçu et la
 *    saisie était silencieusement perdue ;
 * 3. aucune corbeille : une suppression était définitive et immédiate.
 *
 * Réservé aux collections légères — clients, projets, paramètres. Les lignes
 * de document, les écritures et les pièces jointes iront sur IndexedDB.
 */

const SCHEMA_VERSION = 1;

interface Envelope {
  schemaVersion: number;
  data: unknown[];
}

/** Champs techniques ajoutés à toute entité stockée. */
export interface Tracked {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

export interface LocalRepositoryOptions<T extends Entity> {
  /** Nom de la collection, utilisé dans la clé et les messages d'erreur. */
  readonly collection: string;
  /**
   * Validation d'un élément relu du stockage. Renvoyer `undefined` écarte
   * l'élément ; lever une erreur interrompt la lecture. On écarte, parce
   * qu'une facture illisible ne doit pas rendre les 200 autres inaccessibles.
   */
  readonly parse: (raw: unknown) => T | undefined;
  /** Données initiales, écrites à la première ouverture seulement. */
  readonly seed?: () => readonly T[];
  readonly storage?: Storage;
}

export class LocalStorageRepository<T extends Entity> implements Repository<T> {
  private readonly listeners = new Set<() => void>();
  private readonly key: string;
  private readonly storage: Storage;

  constructor(private readonly options: LocalRepositoryOptions<T>) {
    this.key = storageKey(options.collection);
    this.storage = options.storage ?? localStorage;
    this.watchOtherTabs();
  }

  // ---- Lecture ----------------------------------------------------------

  private readAll(): T[] {
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      throw new CorruptDataError(this.options.collection, "stockage inaccessible");
    }

    if (raw === null) {
      const seeded = this.options.seed?.() ?? [];
      if (seeded.length > 0) this.writeAll([...seeded]);
      return [...seeded];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new CorruptDataError(this.options.collection, "JSON invalide");
    }

    if (!isEnvelope(parsed)) {
      throw new CorruptDataError(
        this.options.collection,
        "enveloppe de schéma absente ou malformée",
      );
    }

    // Validation élément par élément : ce que l'ancien store ne faisait pas.
    const valides: T[] = [];
    for (const entry of parsed.data) {
      const item = this.options.parse(entry);
      if (item !== undefined) valides.push(item);
    }
    return valides;
  }

  private writeAll(items: readonly T[]): void {
    const envelope: Envelope = {
      schemaVersion: SCHEMA_VERSION,
      data: [...items],
    };
    try {
      this.storage.setItem(this.key, JSON.stringify(envelope));
    } catch (error) {
      if (isQuotaError(error)) {
        throw new StorageQuotaError(
          this.options.collection,
          JSON.stringify(envelope).length,
        );
      }
      throw error;
    }
    this.notify();
  }

  // ---- Contrat public ---------------------------------------------------

  async list(): Promise<readonly T[]> {
    return this.readAll().filter((item) => !isDeleted(item));
  }

  async listDeleted(): Promise<readonly T[]> {
    return this.readAll().filter(isDeleted);
  }

  async get(id: string): Promise<T | undefined> {
    return this.readAll().find((item) => item.id === id);
  }

  async create(draft: Omit<T, "id">): Promise<T> {
    const now = todayIso();
    const item = {
      ...draft,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    } as unknown as T;

    this.writeAll([...this.readAll(), item]);
    return item;
  }

  async update(id: string, patch: Partial<Omit<T, "id">>): Promise<T> {
    return this.applyPatch(id, patch as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    await this.applyPatch(id, { deletedAt: todayIso() });
  }

  async restore(id: string): Promise<T> {
    return this.applyPatch(id, { deletedAt: undefined });
  }

  /**
   * Point de passage unique de toute modification.
   *
   * Le `as T` final est le seul de ce fichier : TypeScript ne peut pas prouver
   * qu’un objet générique fusionné reste un T. La garantie vient d’ailleurs —
   * `options.parse` revalide chaque élément à la relecture, donc une fusion
   * fautive serait écartée au lieu de contaminer l’écran.
   */
  private applyPatch(id: string, changes: Record<string, unknown>): T {
    const items = this.readAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw new NotFoundError(this.options.collection, id);

    const current = items[index];
    if (current === undefined) throw new NotFoundError(this.options.collection, id);

    // uid=197609(MSI) gid=197121 groups=197121 est retiré explicitement : un patch mal construit ne doit pas
    // pouvoir réécrire la clé primaire d’une facture.
    const { id: _ignore, ...safe } = changes;
    const updated = {
      ...current,
      ...safe,
      id: current.id,
      updatedAt: todayIso(),
    } as T;

    const next = [...items];
    next[index] = updated;
    this.writeAll(next);
    return updated;
  }
  async purge(id: string): Promise<void> {
    const items = this.readAll();
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) {
      throw new NotFoundError(this.options.collection, id);
    }
    this.writeAll(next);
  }

  async bulkSet(items: readonly T[]): Promise<void> {
    this.writeAll(items);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ---- Synchronisation ---------------------------------------------------

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  /**
   * L'événement `storage` n'est émis que dans les *autres* onglets. Sans cela,
   * deux onglets ouverts sur l'application divergent, et le dernier à écrire
   * écrase l'autre sans que personne ne le voie.
   */
  private watchOtherTabs(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("storage", (event) => {
      if (event.key === this.key) this.notify();
    });
  }
}

function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    typeof (value as Envelope).schemaVersion === "number" &&
    Array.isArray((value as Envelope).data)
  );
}

function isDeleted(item: unknown): boolean {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as Tracked).deletedAt === "string"
  );
}

/**
 * Reconnaît un dépassement de quota.
 *
 * Le code 22 est la valeur standard ; 1014 est celui de Firefox, et le nom
 * varie selon les moteurs. Tester les trois évite de confondre un disque plein
 * avec une erreur de programmation.
 */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.code === 22 ||
    error.code === 1014 ||
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED"
  );
}
