import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocalStorageRepository } from "./localStorageRepo";
import { CorruptDataError, NotFoundError, StorageQuotaError } from "./repository";

interface Client {
  id: string;
  name: string;
  city?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const api = {
    quotaExceeded: false,
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem(k: string, v: string) {
      if (api.quotaExceeded) {
        const error = new DOMException("quota", "QuotaExceededError");
        throw error;
      }
      map.set(k, v);
    },
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
  return api as unknown as Storage & { quotaExceeded: boolean };
}

/** N'accepte qu'un objet ayant bien la forme attendue. */
function parseClient(raw: unknown): Client | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return undefined;
  }
  return candidate as unknown as Client;
}

function makeRepo(storage: Storage, seed?: () => readonly Client[]) {
  return new LocalStorageRepository<Client>({
    collection: "clients",
    parse: parseClient,
    storage,
    ...(seed ? { seed } : {}),
  });
}

describe("cycle de vie", () => {
  let storage: ReturnType<typeof fakeStorage>;
  let repo: LocalStorageRepository<Client>;

  beforeEach(() => {
    storage = fakeStorage();
    repo = makeRepo(storage);
  });

  it("crée avec un identifiant et des horodatages", async () => {
    const cree = await repo.create({ name: "TechCorp" });

    expect(cree.id).toHaveLength(26);
    expect(cree.createdAt).toBeDefined();
    expect(cree.updatedAt).toBeDefined();
    expect(await repo.list()).toHaveLength(1);
  });

  it("persiste réellement : une nouvelle instance relit les données", async () => {
    await repo.create({ name: "TechCorp" });

    const autre = makeRepo(storage);
    const relu = await autre.list();
    expect(relu.map((c) => c.name)).toEqual(["TechCorp"]);
  });

  it("modifie sans toucher à l'identifiant", async () => {
    const cree = await repo.create({ name: "TechCorp" });
    const modifie = await repo.update(cree.id, { name: "TechCorp SARL" });

    expect(modifie.id).toBe(cree.id);
    expect(modifie.name).toBe("TechCorp SARL");
  });

  it("refuse qu'un patch réécrive la clé primaire", async () => {
    const cree = await repo.create({ name: "TechCorp" });
    await repo.update(cree.id, { id: "usurpe" } as Partial<Omit<Client, "id">>);

    expect(await repo.get(cree.id)).toBeDefined();
    expect(await repo.get("usurpe")).toBeUndefined();
  });

  it("signale une modification sur un élément inexistant", async () => {
    await expect(repo.update("inconnu", { name: "x" })).rejects.toThrow(NotFoundError);
  });
});

describe("corbeille", () => {
  it("la suppression est douce : l'élément quitte la liste sans disparaître", async () => {
    const storage = fakeStorage();
    const repo = makeRepo(storage);
    const cree = await repo.create({ name: "TechCorp" });

    await repo.remove(cree.id);

    expect(await repo.list()).toHaveLength(0);
    expect(await repo.listDeleted()).toHaveLength(1);
    expect(await repo.get(cree.id)).toBeDefined();
  });

  it("restaure un élément mis en corbeille", async () => {
    const repo = makeRepo(fakeStorage());
    const cree = await repo.create({ name: "TechCorp" });
    await repo.remove(cree.id);

    await repo.restore(cree.id);

    expect(await repo.list()).toHaveLength(1);
    expect(await repo.listDeleted()).toHaveLength(0);
  });

  it("la purge est définitive", async () => {
    const repo = makeRepo(fakeStorage());
    const cree = await repo.create({ name: "TechCorp" });
    await repo.remove(cree.id);

    await repo.purge(cree.id);

    expect(await repo.get(cree.id)).toBeUndefined();
    await expect(repo.purge(cree.id)).rejects.toThrow(NotFoundError);
  });
});

describe("robustesse des données relues", () => {
  it("écarte un élément malformé sans rendre les autres inaccessibles", async () => {
    // Le défaut de l'ancien store : `data as T[]`, sans vérification. Une seule
    // entrée corrompue faisait planter un écran sans rapport, plus tard.
    const storage = fakeStorage({
      "codewave-studio:clients": JSON.stringify({
        schemaVersion: 1,
        data: [
          { id: "a".repeat(26), name: "Valide" },
          { id: 42, name: "Identifiant numérique" },
          null,
          "une chaîne",
          { name: "Sans identifiant" },
        ],
      }),
    });

    const repo = makeRepo(storage);
    const lus = await repo.list();

    expect(lus).toHaveLength(1);
    expect(lus[0]?.name).toBe("Valide");
  });

  it("signale un JSON illisible avec une consigne exploitable", async () => {
    const storage = fakeStorage({ "codewave-studio:clients": "{ pas du json" });
    const repo = makeRepo(storage);

    await expect(repo.list()).rejects.toThrow(CorruptDataError);
    await expect(repo.list()).rejects.toThrow(/sauvegarde/i);
  });

  it("signale une enveloppe de schéma absente", async () => {
    const storage = fakeStorage({
      "codewave-studio:clients": JSON.stringify([{ id: "x", name: "y" }]),
    });
    const repo = makeRepo(storage);

    await expect(repo.list()).rejects.toThrow(CorruptDataError);
  });
});

describe("quota de stockage", () => {
  it("signale un quota dépassé au lieu de perdre la saisie en silence", async () => {
    const storage = fakeStorage();
    const repo = makeRepo(storage);
    storage.quotaExceeded = true;

    await expect(repo.create({ name: "TechCorp" })).rejects.toThrow(StorageQuotaError);
  });

  it("le message dit quoi faire", async () => {
    const storage = fakeStorage();
    const repo = makeRepo(storage);
    storage.quotaExceeded = true;

    await expect(repo.create({ name: "x" })).rejects.toThrow(/corbeille|sauvegarde/i);
  });
});

describe("amorçage et import", () => {
  it("écrit les données de démonstration à la première ouverture seulement", async () => {
    const storage = fakeStorage();
    const seed = vi.fn(() => [{ id: "a".repeat(26), name: "Démo" }]);

    const repo = makeRepo(storage, seed);
    expect(await repo.list()).toHaveLength(1);

    await repo.create({ name: "Ajouté" });
    const autre = makeRepo(storage, seed);
    expect(await autre.list()).toHaveLength(2);
  });

  it("n'écrase pas des données existantes par l'amorçage", async () => {
    const storage = fakeStorage();
    const repo = makeRepo(storage);
    await repo.create({ name: "Saisi par l'utilisateur" });

    const avecSeed = makeRepo(storage, () => [{ id: "b".repeat(26), name: "Démo" }]);
    const lus = await avecSeed.list();

    expect(lus.map((c) => c.name)).toEqual(["Saisi par l'utilisateur"]);
  });

  it("bulkSet remplace tout, pour la restauration de sauvegarde", async () => {
    const repo = makeRepo(fakeStorage());
    await repo.create({ name: "Avant" });

    await repo.bulkSet([
      { id: "c".repeat(26), name: "Restauré 1" },
      { id: "d".repeat(26), name: "Restauré 2" },
    ]);

    expect((await repo.list()).map((c) => c.name)).toEqual(["Restauré 1", "Restauré 2"]);
  });
});

describe("notification", () => {
  it("prévient les abonnés à chaque écriture", async () => {
    const repo = makeRepo(fakeStorage());
    const ecoute = vi.fn();
    repo.subscribe(ecoute);

    await repo.create({ name: "TechCorp" });

    expect(ecoute).toHaveBeenCalled();
  });

  it("le désabonnement coupe les notifications", async () => {
    const repo = makeRepo(fakeStorage());
    const ecoute = vi.fn();
    const stop = repo.subscribe(ecoute);
    stop();

    await repo.create({ name: "TechCorp" });

    expect(ecoute).not.toHaveBeenCalled();
  });
});
