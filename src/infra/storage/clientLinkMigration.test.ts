import { beforeEach, describe, expect, it } from "vitest";

import { migrateClientLinks } from "./clientLinkMigration";

/** Stockage en memoire : le test ne depend pas de l’environnement du navigateur. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as Storage;
}

let localStorage: Storage;

function ecrire(collection: string, data: unknown[]) {
  localStorage.setItem(
    `codewave-studio:${collection}`,
    JSON.stringify({ schemaVersion: 1, data }),
  );
}

function lire(collection: string): Record<string, unknown>[] {
  const brut = localStorage.getItem(`codewave-studio:${collection}`);
  return brut === null ? [] : (JSON.parse(brut).data as Record<string, unknown>[]);
}
describe("reprise des liens client", () => {
  beforeEach(() => {
    localStorage = fakeStorage();
    ecrire("clients", [
      { id: "c1", company: "TechCorp", name: "Sophie" },
      { id: "c2", company: "Innovate Solutions", name: "Jean" },
    ]);
  });

  it("résout le nom d'entreprise vers l'identifiant réel", () => {
    ecrire("projects", [{ id: "p1", name: "Refonte", client: "TechCorp" }]);

    const rapport = migrateClientLinks(localStorage);

    expect(lire("projects")[0]?.clientId).toBe("c1");
    expect(rapport.resolved).toBe(1);
  });

  it("retire l'ancien champ une fois le lien établi", () => {
    ecrire("projects", [{ id: "p1", name: "Refonte", client: "TechCorp" }]);
    migrateClientLinks(localStorage);
    expect(lire("projects")[0]).not.toHaveProperty("client");
  });

  it("ignore la casse et les espaces du nom", () => {
    ecrire("tickets", [{ id: "t1", title: "Bug", client: "  innovate solutions " }]);
    migrateClientLinks(localStorage);
    expect(lire("tickets")[0]?.clientId).toBe("c2");
  });

  it("n'invente pas de rattachement quand le nom est inconnu", () => {
    // Rattacher arbitrairement une facture au mauvais client serait pire
    // qu'un lien vide : l'interface affichera « Client supprimé ».
    ecrire("invoices", [
      { id: "f1", number: "FAC-2026-001", client: "Societe disparue" },
    ]);

    const rapport = migrateClientLinks(localStorage);

    expect(lire("invoices")[0]?.clientId).toBe("");
    expect(lire("invoices")[0]?.client).toBe("Societe disparue");
    expect(rapport.unresolved).toBe(1);
  });

  it("ne touche pas à un document déjà migré", () => {
    ecrire("projects", [{ id: "p1", name: "Refonte", clientId: "c2" }]);
    const rapport = migrateClientLinks(localStorage);

    expect(lire("projects")[0]?.clientId).toBe("c2");
    expect(rapport.resolved).toBe(0);
  });

  it("est idempotente", () => {
    ecrire("projects", [{ id: "p1", name: "Refonte", client: "TechCorp" }]);
    migrateClientLinks(localStorage);
    const second = migrateClientLinks(localStorage);

    expect(second.resolved).toBe(0);
    expect(lire("projects")[0]?.clientId).toBe("c1");
  });
});

describe("reprise des numéros de facture", () => {
  beforeEach(() => {
    localStorage = fakeStorage();
    ecrire("clients", [{ id: "c1", company: "TechCorp", name: "Sophie" }]);
  });

  it("traduit le préfixe INV- en FAC- sans renuméroter", () => {
    ecrire("invoices", [
      { id: "f1", number: "INV-2026-001", clientId: "c1" },
      { id: "f2", number: "INV-2026-017", clientId: "c1" },
    ]);

    const rapport = migrateClientLinks(localStorage);

    expect(lire("invoices").map((f) => f.number)).toEqual([
      "FAC-2026-001",
      "FAC-2026-017",
    ]);
    expect(rapport.renumbered).toBe(2);
  });

  it("laisse intact un numéro déjà au bon format", () => {
    ecrire("invoices", [{ id: "f1", number: "FAC-2026-003", clientId: "c1" }]);
    const rapport = migrateClientLinks(localStorage);

    expect(lire("invoices")[0]?.number).toBe("FAC-2026-003");
    expect(rapport.renumbered).toBe(0);
  });

  it("ne tombe pas sur un stockage vide", () => {
    localStorage = fakeStorage();
    expect(() => migrateClientLinks(localStorage)).not.toThrow();
  });

  it("ne tombe pas sur des données illisibles", () => {
    localStorage.setItem("codewave-studio:invoices", "{ pas du json");
    expect(() => migrateClientLinks(localStorage)).not.toThrow();
  });
});
