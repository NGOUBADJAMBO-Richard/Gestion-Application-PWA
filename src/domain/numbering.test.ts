import { describe, expect, it } from "vitest";

import {
  NumberingError,
  findSequenceGaps,
  formatNumber,
  migrateLegacyNumber,
  nextNumber,
  parseNumber,
} from "./numbering";

describe("formatNumber", () => {
  it("compose les trois formats attendus", () => {
    expect(formatNumber("quote", 2026, 1)).toBe("DEV-2026-001");
    expect(formatNumber("invoice", 2026, 42)).toBe("FAC-2026-042");
    expect(formatNumber("creditNote", 2026, 7)).toBe("AV-2026-007");
  });

  it("ne tronque pas au-delà de 999", () => {
    expect(formatNumber("invoice", 2026, 1000)).toBe("FAC-2026-1000");
  });

  it("refuse une séquence qui ne commence pas à 1", () => {
    expect(() => formatNumber("invoice", 2026, 0)).toThrow(NumberingError);
    expect(() => formatNumber("invoice", 2026, -3)).toThrow(NumberingError);
  });
});

describe("parseNumber", () => {
  it("décompose un numéro valide", () => {
    expect(parseNumber("FAC-2026-042")).toEqual({
      kind: "invoice",
      year: 2026,
      sequence: 42,
    });
  });

  it("tolère les espaces autour", () => {
    expect(parseNumber("  AV-2025-003  ")?.kind).toBe("creditNote");
  });

  it("rejette ce qui n'est pas un numéro de cette maison", () => {
    expect(parseNumber("INV-2026-001")).toBeUndefined();
    expect(parseNumber("FAC-26-001")).toBeUndefined();
    expect(parseNumber("FACTURE-2026-001")).toBeUndefined();
    expect(parseNumber("")).toBeUndefined();
  });
});

describe("nextNumber", () => {
  it("démarre à 1 sur une année vierge", () => {
    expect(nextNumber([], "invoice", 2026)).toBe("FAC-2026-001");
  });

  it("suit le plus haut numéro attribué", () => {
    expect(nextNumber(["FAC-2026-001", "FAC-2026-002"], "invoice", 2026)).toBe(
      "FAC-2026-003",
    );
  });

  it("ne réattribue pas un numéro après suppression d'un document intermédiaire", () => {
    // Le piège classique : se fonder sur la longueur du tableau. Ici il reste
    // deux numéros, mais le suivant doit être 004, pas 003.
    expect(nextNumber(["FAC-2026-001", "FAC-2026-003"], "invoice", 2026)).toBe(
      "FAC-2026-004",
    );
  });

  it("ignore l'ordre dans lequel les numéros sont fournis", () => {
    expect(nextNumber(["FAC-2026-009", "FAC-2026-002"], "invoice", 2026)).toBe(
      "FAC-2026-010",
    );
  });

  it("tient une séquence distincte par type", () => {
    const existants = ["FAC-2026-005", "DEV-2026-012", "AV-2026-002"];
    expect(nextNumber(existants, "invoice", 2026)).toBe("FAC-2026-006");
    expect(nextNumber(existants, "quote", 2026)).toBe("DEV-2026-013");
    expect(nextNumber(existants, "creditNote", 2026)).toBe("AV-2026-003");
  });

  it("repart à 1 au changement d'année fiscale", () => {
    expect(nextNumber(["FAC-2026-118"], "invoice", 2027)).toBe("FAC-2027-001");
  });

  it("ignore les numéros illisibles au lieu de s'interrompre", () => {
    expect(
      nextNumber(["FAC-2026-001", "n importe quoi", "INV-2026-099"], "invoice", 2026),
    ).toBe("FAC-2026-002");
  });
});

describe("findSequenceGaps", () => {
  it("ne signale rien sur une séquence continue", () => {
    expect(
      findSequenceGaps(["FAC-2026-001", "FAC-2026-002", "FAC-2026-003"], "invoice", 2026),
    ).toEqual([]);
  });

  it("signale les rangs manquants", () => {
    expect(
      findSequenceGaps(["FAC-2026-001", "FAC-2026-004"], "invoice", 2026),
    ).toEqual([2, 3]);
  });

  it("ne signale rien quand l'année est vide", () => {
    expect(findSequenceGaps([], "invoice", 2026)).toEqual([]);
  });
});

describe("migrateLegacyNumber", () => {
  it("traduit le préfixe sans renuméroter", () => {
    expect(migrateLegacyNumber("INV-2026-001")).toBe("FAC-2026-001");
    expect(migrateLegacyNumber("INV-2025-117")).toBe("FAC-2025-117");
  });

  it("laisse intact ce qui n'est pas un ancien numéro", () => {
    expect(migrateLegacyNumber("FAC-2026-001")).toBe("FAC-2026-001");
    expect(migrateLegacyNumber("DEV-2026-001")).toBe("DEV-2026-001");
  });

  it("est idempotente", () => {
    const une = migrateLegacyNumber("INV-2026-001");
    expect(migrateLegacyNumber(une)).toBe(une);
  });

  it("conserve le rang après migration, pour ne pas fausser la suite", () => {
    const migres = ["INV-2026-001", "INV-2026-002"].map(migrateLegacyNumber);
    expect(nextNumber(migres, "invoice", 2026)).toBe("FAC-2026-003");
  });
});
