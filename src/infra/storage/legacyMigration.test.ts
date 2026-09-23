import { beforeEach, describe, expect, it } from "vitest";

import { migrateLegacyStorageKeys } from "./legacyMigration";

/** Stockage en mémoire, avec un mode « écriture impossible » pour les cas de quota. */
function createStorage(initial: Record<string, string> = {}): Storage & {
  failWrites: boolean;
  truncateWrites: boolean;
} {
  const map = new Map(Object.entries(initial));
  return {
    failWrites: false,
    truncateWrites: false,
    get length() {
      return map.size;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (this.failWrites) throw new DOMException("QuotaExceededError");
      // Tronque d un caractere, quelle que soit la longueur de la valeur.
      map.set(key, this.truncateWrites ? value.slice(0, -1) : value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  } as Storage & { failWrites: boolean; truncateWrites: boolean };
}

describe("migrateLegacyStorageKeys", () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage({
      "mgn-user": '{"id":"1","name":"Richard"}',
      "mgn-theme": "dark",
      "mgn-language": "fr",
    });
  });

  it("recopie chaque clé héritée sous le nouveau préfixe", () => {
    const report = migrateLegacyStorageKeys(storage);

    expect(storage.getItem("codewave-studio:user")).toBe('{"id":"1","name":"Richard"}');
    expect(storage.getItem("codewave-studio:theme")).toBe("dark");
    expect(storage.getItem("codewave-studio:language")).toBe("fr");
    expect(report.migrated).toHaveLength(3);
    expect(report.failed).toHaveLength(0);
  });

  it("supprime l'ancienne clé une fois la copie relue", () => {
    migrateLegacyStorageKeys(storage);

    expect(storage.getItem("mgn-user")).toBeNull();
    expect(storage.getItem("mgn-theme")).toBeNull();
    expect(storage.getItem("mgn-language")).toBeNull();
  });

  it("est idempotente : un second appel ne change rien", () => {
    migrateLegacyStorageKeys(storage);
    const second = migrateLegacyStorageKeys(storage);

    expect(second.migrated).toHaveLength(0);
    expect(second.failed).toHaveLength(0);
    expect(storage.getItem("codewave-studio:theme")).toBe("dark");
  });

  it("ne touche pas à un stockage déjà propre", () => {
    const clean = createStorage({ "codewave-studio:theme": "light" });
    const report = migrateLegacyStorageKeys(clean);

    expect(report.migrated).toHaveLength(0);
    expect(clean.getItem("codewave-studio:theme")).toBe("light");
  });

  it("ne dégrade pas une valeur déjà écrite sous le nouveau nom", () => {
    storage.setItem("codewave-studio:theme", "light");

    const report = migrateLegacyStorageKeys(storage);

    // La valeur récente prime, l'ancienne est simplement nettoyée.
    expect(storage.getItem("codewave-studio:theme")).toBe("light");
    expect(storage.getItem("mgn-theme")).toBeNull();
    expect(report.skipped).toContain("mgn-theme");
  });

  it("conserve l'original quand l'écriture est refusée", () => {
    storage.failWrites = true;

    const report = migrateLegacyStorageKeys(storage);

    expect(report.failed).toHaveLength(3);
    expect(storage.getItem("mgn-user")).toBe('{"id":"1","name":"Richard"}');
  });

  it("conserve l'original quand la copie est tronquée", () => {
    storage.truncateWrites = true;

    const report = migrateLegacyStorageKeys(storage);

    expect(report.failed).toHaveLength(3);
    // La donnée d'origine reste lisible : mieux vaut un doublon qu'une perte.
    expect(storage.getItem("mgn-user")).toBe('{"id":"1","name":"Richard"}');
  });
});
