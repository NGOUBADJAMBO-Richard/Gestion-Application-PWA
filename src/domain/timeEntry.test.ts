import { describe, expect, it } from "vitest";

import {
  InvalidDurationError,
  InvalidTimeEntryError,
  MAX_MINUTES_PER_ENTRY,
  type TimeEntry,
  billableMinutes,
  entryCost,
  formatDuration,
  laborCost,
  parseDuration,
  totalMinutes,
  validateTimeEntry,
} from "./timeEntry";

function saisie(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: "t-1",
    projectId: "p-1",
    date: "2026-03-10",
    minutes: 90,
    description: "Intégration de la page tarifs",
    billable: true,
    hourlyCost: 8000,
    ...overrides,
  };
}

describe("lecture d'une durée saisie", () => {
  it("accepte la forme heures et minutes", () => {
    expect(parseDuration("1h30")).toBe(90);
    expect(parseDuration("1 h 30")).toBe(90);
    expect(parseDuration("1:30")).toBe(90);
    expect(parseDuration("2h")).toBe(120);
    expect(parseDuration("0h45")).toBe(45);
  });

  it("accepte une durée décimale", () => {
    expect(parseDuration("1,5h")).toBe(90);
    expect(parseDuration("0.75h")).toBe(45);
  });

  it("accepte des minutes nues", () => {
    expect(parseDuration("90")).toBe(90);
    expect(parseDuration("45min")).toBe(45);
    expect(parseDuration("45 m")).toBe(45);
  });

  it("arrondit une décimale sans représentation exacte", () => {
    // 0,333 h vaut 19,98 min. Laisser filer la fraction ferait dériver les
    // totaux d'une minute tous les trois enregistrements.
    expect(parseDuration("0,333h")).toBe(20);
  });

  it("refuse plus de 59 minutes dans la partie minutes", () => {
    // « 1h65 » est presque toujours « 2h05 » mal tapé : accepter 125 min
    // enregistrerait silencieusement une valeur que personne n'a voulue.
    expect(() => parseDuration("1h65")).toThrow(InvalidDurationError);
  });

  it("refuse ce qui n'est pas une durée, en disant quoi écrire", () => {
    expect(() => parseDuration("hier matin")).toThrow(/1h30/);
    expect(() => parseDuration("   ")).toThrow(InvalidDurationError);
  });
});

describe("affichage d'une durée", () => {
  it("écrit les heures et les minutes séparément", () => {
    expect(formatDuration(90)).toBe("1 h 30");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(0)).toBe("0 min");
  });

  it("garde deux chiffres aux minutes", () => {
    // « 1 h 5 » se lit comme cinquante minutes au premier coup d'œil.
    expect(formatDuration(65)).toBe("1 h 05");
  });

  it("fait l'aller-retour avec la lecture", () => {
    for (const minutes of [1, 7, 59, 60, 61, 125, 480]) {
      expect(parseDuration(formatDuration(minutes).replace(/\s/g, ""))).toBe(
        minutes,
      );
    }
  });
});

describe("validation d'une saisie", () => {
  it("accepte une saisie complète", () => {
    expect(() => validateTimeEntry(saisie(), { today: "2026-03-10" })).not.toThrow();
  });

  it("exige un projet", () => {
    expect(() => validateTimeEntry(saisie({ projectId: "  " }))).toThrow(
      InvalidTimeEntryError,
    );
  });

  it("refuse une date future", () => {
    expect(() =>
      validateTimeEntry(saisie({ date: "2026-03-11" }), { today: "2026-03-10" }),
    ).toThrow(/futur/);
  });

  it("refuse une durée nulle ou négative", () => {
    expect(() => validateTimeEntry(saisie({ minutes: 0 }))).toThrow(/positif/);
    expect(() => validateTimeEntry(saisie({ minutes: -30 }))).toThrow(/positif/);
  });

  it("refuse une durée fractionnaire", () => {
    expect(() => validateTimeEntry(saisie({ minutes: 90.5 }))).toThrow(/entier/);
  });

  it("refuse une journée impossible et propose de découper", () => {
    expect(() =>
      validateTimeEntry(saisie({ minutes: MAX_MINUTES_PER_ENTRY + 1 })),
    ).toThrow(/plusieurs lignes/);
  });

  it("exige une description", () => {
    expect(() => validateTimeEntry(saisie({ description: " " }))).toThrow(
      /intitulé/,
    );
  });

  it("accepte un coût horaire nul mais refuse un coût négatif", () => {
    expect(() => validateTimeEntry(saisie({ hourlyCost: 0 }))).not.toThrow();
    expect(() => validateTimeEntry(saisie({ hourlyCost: -1 }))).toThrow(
      /positif ou nul/,
    );
  });
});

describe("agrégats", () => {
  it("additionne les durées", () => {
    expect(totalMinutes([saisie(), saisie({ id: "t-2", minutes: 30 })])).toBe(120);
  });

  it("isole le temps refacturable", () => {
    const entrees = [saisie(), saisie({ id: "t-2", minutes: 60, billable: false })];
    expect(totalMinutes(entrees)).toBe(150);
    expect(billableMinutes(entrees)).toBe(90);
  });

  it("chiffre le coût du temps passé", () => {
    // 1 h 30 à 8 000 F l'heure = 12 000 F.
    expect(entryCost(saisie(), "XAF")).toEqual({ amount: 12000, currency: "XAF" });
  });

  it("arrondit saisie par saisie, pas seulement le total", () => {
    // Trois saisies de 10 min à 8 000 F l'heure valent 1 333,33 F chacune.
    // Arrondies à la saisie : 1 333 x 3 = 3 999. Arrondir le seul total
    // donnerait 4 000 et la colonne affichée ne se resommerait pas.
    const entrees = [
      saisie({ id: "a", minutes: 10 }),
      saisie({ id: "b", minutes: 10 }),
      saisie({ id: "c", minutes: 10 }),
    ];
    const somme = entrees.reduce(
      (total, entree) => total + entryCost(entree, "XAF").amount,
      0,
    );
    expect(laborCost(entrees, "XAF").amount).toBe(somme);
    expect(laborCost(entrees, "XAF").amount).toBe(3999);
  });

  it("rend zéro dans la devise demandée pour une liste vide", () => {
    expect(laborCost([], "XAF")).toEqual({ amount: 0, currency: "XAF" });
  });

  it("ne facture rien pour un temps à coût nul", () => {
    expect(laborCost([saisie({ hourlyCost: 0 })], "XAF").amount).toBe(0);
  });
});
