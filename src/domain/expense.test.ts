import { describe, expect, it } from "vitest";

import {
  type Expense,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  InvalidExpenseError,
  expensesBetween,
  isExpenseCategory,
  netExpenses,
  rebilledExpenses,
  totalExpenses,
  totalsByCategory,
  validateExpense,
} from "./expense";

function depense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "d-1",
    date: "2026-03-10",
    label: "Hébergement mutualisé, 1 an",
    amount: 48000,
    category: "hosting",
    projectId: "p-1",
    rebilled: false,
    ...overrides,
  };
}

describe("catégories", () => {
  it("chaque catégorie porte un libellé français", () => {
    for (const categorie of EXPENSE_CATEGORIES) {
      expect(EXPENSE_CATEGORY_LABELS[categorie]).toBeTruthy();
    }
  });

  it("reconnaît une catégorie connue et rejette le reste", () => {
    expect(isExpenseCategory("hosting")).toBe(true);
    expect(isExpenseCategory("Hebergement")).toBe(false);
    expect(isExpenseCategory(undefined)).toBe(false);
  });
});

describe("validation", () => {
  it("accepte une dépense complète", () => {
    expect(() => validateExpense(depense(), { today: "2026-03-10" })).not.toThrow();
  });

  it("refuse une date future", () => {
    expect(() =>
      validateExpense(depense({ date: "2026-04-01" }), { today: "2026-03-10" }),
    ).toThrow(/engagée/);
  });

  it("exige un intitulé", () => {
    expect(() => validateExpense(depense({ label: "  " }))).toThrow(/Nomme/);
  });

  it("refuse un montant nul, négatif ou fractionnaire", () => {
    expect(() => validateExpense(depense({ amount: 0 }))).toThrow(InvalidExpenseError);
    expect(() => validateExpense(depense({ amount: -1000 }))).toThrow(/positif/);
    expect(() => validateExpense(depense({ amount: 1000.5 }))).toThrow(/entier/);
  });

  it("accepte une dépense de structure sans projet", () => {
    expect(() =>
      validateExpense(depense({ projectId: undefined, category: "fees" })),
    ).not.toThrow();
  });

  it("exige un projet quand la dépense est refacturée", () => {
    // Refacturer suppose de savoir à qui : sans projet, la dépense sortirait
    // de la marge sans jamais réapparaître en recette.
    expect(() =>
      validateExpense(depense({ rebilled: true, projectId: undefined })),
    ).toThrow(/refacturée/);
  });
});

describe("totaux", () => {
  const depenses = [
    depense({ id: "a", amount: 48000, category: "hosting" }),
    depense({ id: "b", amount: 12000, category: "hosting", rebilled: true }),
    depense({ id: "c", amount: 250000, category: "subcontracting" }),
    depense({ id: "d", amount: 9000, category: "software", projectId: undefined }),
  ];

  it("additionne tout", () => {
    expect(totalExpenses(depenses, "XAF").amount).toBe(319000);
  });

  it("écarte les dépenses refacturées de la charge nette", () => {
    // 12 000 F de domaine refacturé à l'identique ne coûte rien à l'entreprise.
    expect(netExpenses(depenses, "XAF").amount).toBe(307000);
    expect(rebilledExpenses(depenses, "XAF").amount).toBe(12000);
  });

  it("classe les catégories du plus lourd au plus léger", () => {
    const totaux = totalsByCategory(depenses, "XAF");
    expect(totaux.map((ligne) => ligne.category)).toEqual([
      "subcontracting",
      "hosting",
      "software",
    ]);
    expect(totaux[1]?.total.amount).toBe(60000);
    expect(totaux[1]?.count).toBe(2);
  });

  it("omet les catégories sans dépense", () => {
    const totaux = totalsByCategory(depenses, "XAF");
    expect(totaux).toHaveLength(3);
  });

  it("rend zéro dans la devise demandée pour une liste vide", () => {
    expect(totalExpenses([], "XAF")).toEqual({ amount: 0, currency: "XAF" });
    expect(totalsByCategory([], "XAF")).toEqual([]);
  });
});

describe("filtre de période", () => {
  const depenses = [
    depense({ id: "a", date: "2026-02-28" }),
    depense({ id: "b", date: "2026-03-01" }),
    depense({ id: "c", date: "2026-03-31" }),
    depense({ id: "d", date: "2026-04-01" }),
  ];

  it("retient les bornes", () => {
    const mars = expensesBetween(depenses, "2026-03-01", "2026-03-31");
    expect(mars.map((d) => d.id)).toEqual(["b", "c"]);
  });
});
