import { describe, expect, it } from "vitest";

import type { Expense } from "./expense";
import { money } from "./money";
import {
  type RevenueDocument,
  cashOut,
  computePortfolioProfitability,
  computeProjectProfitability,
  rankByMargin,
} from "./profitability";
import type { TimeEntry } from "./timeEntry";

const XAF = "XAF" as const;
const f = (amount: number) => money(amount, XAF);

function facture(overrides: Partial<RevenueDocument> = {}): RevenueDocument {
  return {
    id: "i-1",
    number: "FAC-2026-001",
    kind: "invoice",
    status: "pending",
    projectId: "p-1",
    net: f(450000),
    total: f(531000),
    collected: f(0),
    ...overrides,
  };
}

function temps(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: "t-1",
    projectId: "p-1",
    date: "2026-03-10",
    minutes: 600,
    description: "Développement",
    billable: true,
    hourlyCost: 8000,
    ...overrides,
  };
}

function depense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "d-1",
    date: "2026-03-10",
    label: "Sous-traitance design",
    amount: 100000,
    category: "subcontracting",
    projectId: "p-1",
    rebilled: false,
    ...overrides,
  };
}

function calcul(
  documents: readonly RevenueDocument[],
  timeEntries: readonly TimeEntry[] = [],
  expenses: readonly Expense[] = [],
  budget = f(450000),
) {
  return computeProjectProfitability({
    projectId: "p-1",
    currency: XAF,
    budget,
    documents,
    timeEntries,
    expenses,
  });
}

describe("recette d'un projet", () => {
  it("compte le hors taxes, pas le toutes taxes", () => {
    // La TVA collectée transite : la compter en recette surestimerait la
    // marge d'exactement le taux de TVA.
    const r = calcul([facture()]);
    expect(r.revenue.amount).toBe(450000);
    expect(r.billedTotal.amount).toBe(531000);
  });

  it("ignore les devis", () => {
    const r = calcul([facture({ kind: "quote", number: "DEV-2026-001" })]);
    expect(r.revenue.amount).toBe(0);
  });

  it("ignore les brouillons", () => {
    const r = calcul([facture({ status: "draft", number: "" })]);
    expect(r.revenue.amount).toBe(0);
  });

  it("ignore les pièces d'un autre projet", () => {
    const r = calcul([facture({ projectId: "p-2" })]);
    expect(r.revenue.amount).toBe(0);
  });

  it("ignore les pièces sans projet rattaché", () => {
    // Imputer au hasard inventerait une rentabilité. Le portefeuille les
    // signale séparément.
    const r = calcul([facture({ projectId: undefined })]);
    expect(r.revenue.amount).toBe(0);
  });

  it("annule une facture par son avoir sans retirer deux fois", () => {
    // Piège classique : exclure la facture annulée ET compter l'avoir enlève
    // 450 000 F deux fois et fait apparaître une perte fictive.
    const r = calcul([
      facture({ status: "cancelled" }),
      facture({
        id: "i-2",
        number: "AV-2026-001",
        kind: "creditNote",
        status: "paid",
        net: f(-450000),
        total: f(-531000),
      }),
    ]);
    expect(r.revenue.amount).toBe(0);
    expect(r.billedTotal.amount).toBe(0);
  });

  it("calcule le reste à encaisser sur le toutes taxes", () => {
    const r = calcul([facture({ collected: f(200000) })]);
    expect(r.collected.amount).toBe(200000);
    expect(r.outstanding.amount).toBe(331000);
  });

  it("laisse voir un trop-versé plutôt que de l'absorber", () => {
    const r = calcul([facture({ collected: f(600000) })]);
    expect(r.outstanding.amount).toBe(-69000);
  });
});

describe("coûts et marge", () => {
  it("chiffre le temps passé", () => {
    // 10 h à 8 000 F = 80 000 F.
    const r = calcul([facture()], [temps()]);
    expect(r.laborCost.amount).toBe(80000);
    expect(r.minutesLogged).toBe(600);
  });

  it("compte le temps non refacturable comme un coût", () => {
    // Une reprise offerte reste payée par l'entreprise.
    const r = calcul(
      [facture()],
      [temps(), temps({ id: "t-2", minutes: 120, billable: false })],
    );
    expect(r.minutesLogged).toBe(720);
    expect(r.billableMinutes).toBe(600);
    expect(r.laborCost.amount).toBe(96000);
  });

  it("retire les dépenses non refacturées de la marge", () => {
    const r = calcul([facture()], [temps()], [depense()]);
    expect(r.expenseCost.amount).toBe(100000);
    expect(r.totalCost.amount).toBe(180000);
    expect(r.margin.amount).toBe(270000);
    expect(r.marginPercent).toBeCloseTo(60, 5);
  });

  it("laisse les dépenses refacturées hors de la marge", () => {
    const r = calcul(
      [facture()],
      [],
      [depense({ id: "d-2", amount: 12000, category: "hosting", rebilled: true })],
    );
    expect(r.expenseCost.amount).toBe(0);
    expect(r.rebilledExpenseCost.amount).toBe(12000);
    expect(r.margin.amount).toBe(450000);
  });

  it("compte les avances refacturées dans la sortie de caisse", () => {
    const r = calcul(
      [facture()],
      [temps()],
      [depense({ id: "d-2", amount: 12000, rebilled: true })],
    );
    expect(cashOut(r).amount).toBe(92000);
  });

  it("montre une marge négative quand le projet a coûté plus qu'il n'a rapporté", () => {
    const r = calcul([], [temps({ minutes: 3000 })]);
    expect(r.revenue.amount).toBe(0);
    expect(r.margin.amount).toBe(-400000);
  });

  it("ne rend pas de pourcentage de marge sans recette", () => {
    // Diviser par zéro donnerait -Infinity % : un chiffre qui n'apprend rien.
    const r = calcul([], [temps()]);
    expect(r.marginPercent).toBeNull();
  });
});

describe("indicateurs dérivés", () => {
  it("donne la recette par heure passée", () => {
    // 450 000 F pour 10 h = 45 000 F l'heure.
    const r = calcul([facture()], [temps()]);
    expect(r.revenuePerHour?.amount).toBe(45000);
  });

  it("ne divise pas par zéro heure", () => {
    expect(calcul([facture()]).revenuePerHour).toBeNull();
  });

  it("situe la facturation et les coûts par rapport au budget", () => {
    const r = calcul([facture()], [temps()], [depense()]);
    expect(r.billedVsBudgetPercent).toBeCloseTo(100, 5);
    expect(r.costVsBudgetPercent).toBeCloseTo(40, 5);
    expect(r.overBudget).toBe(false);
  });

  it("alerte dès que les coûts dépassent le budget, même sans facture", () => {
    // C'est précisément le moment où l'alerte sert : avant d'émettre.
    const r = calcul([], [temps({ minutes: 3600 })]);
    expect(r.overBudget).toBe(true);
  });

  it("ne rend pas de pourcentage sur un budget nul", () => {
    const r = calcul([facture()], [temps()], [], f(0));
    expect(r.billedVsBudgetPercent).toBeNull();
    expect(r.costVsBudgetPercent).toBeNull();
    expect(r.overBudget).toBe(false);
  });
});

describe("portefeuille", () => {
  const projets = [
    { id: "p-1", budget: f(450000) },
    { id: "p-2", budget: f(600000) },
  ];

  it("agrège les projets et consolide la marge", () => {
    const r = computePortfolioProfitability({
      currency: XAF,
      projects: projets,
      documents: [
        facture(),
        facture({ id: "i-2", projectId: "p-2", net: f(600000), total: f(708000) }),
      ],
      timeEntries: [temps(), temps({ id: "t-2", projectId: "p-2", minutes: 1200 })],
      expenses: [],
    });
    expect(r.revenue.amount).toBe(1050000);
    expect(r.totalCost.amount).toBe(240000);
    expect(r.margin.amount).toBe(810000);
    expect(r.marginPercent).toBeCloseTo(77.142857, 4);
    expect(r.minutesLogged).toBe(1800);
  });

  it("isole les factures non rattachées au lieu de les répartir", () => {
    const r = computePortfolioProfitability({
      currency: XAF,
      projects: projets,
      documents: [facture({ projectId: undefined })],
      timeEntries: [],
      expenses: [],
    });
    expect(r.revenue.amount).toBe(0);
    expect(r.unassignedDocuments.map((d) => d.number)).toEqual(["FAC-2026-001"]);
    expect(r.unassignedRevenue.amount).toBe(450000);
  });

  it("classe les dépenses sans projet en frais de structure", () => {
    const r = computePortfolioProfitability({
      currency: XAF,
      projects: projets,
      documents: [],
      timeEntries: [],
      expenses: [
        depense({ id: "d-1", projectId: undefined, amount: 9000, category: "software" }),
        depense({ id: "d-2", projectId: "p-1", amount: 100000 }),
      ],
    });
    expect(r.overheadExpenses.amount).toBe(9000);
    expect(r.totalCost.amount).toBe(100000);
  });

  it("signale le temps saisi sur un projet disparu", () => {
    // Un projet supprimé ne doit pas faire disparaître silencieusement des
    // heures de la comptabilité analytique.
    const r = computePortfolioProfitability({
      currency: XAF,
      projects: projets,
      documents: [],
      timeEntries: [temps({ projectId: "p-supprime", minutes: 300 })],
      expenses: [],
    });
    expect(r.orphanMinutes).toBe(300);
    expect(r.minutesLogged).toBe(0);
  });

  it("traite une dépense pointant un projet disparu comme un frais de structure", () => {
    const r = computePortfolioProfitability({
      currency: XAF,
      projects: projets,
      documents: [],
      timeEntries: [],
      expenses: [depense({ projectId: "p-supprime", amount: 25000 })],
    });
    expect(r.overheadExpenses.amount).toBe(25000);
  });
});

describe("classement", () => {
  it("met la meilleure marge en tête et écarte les projets vides", () => {
    const documents = [
      facture(),
      facture({ id: "i-2", projectId: "p-2", net: f(100000), total: f(118000) }),
    ];
    const projets = rankByMargin(
      ["p-1", "p-2", "p-3"].map((id) =>
        computeProjectProfitability({
          projectId: id,
          currency: XAF,
          budget: f(450000),
          documents,
          timeEntries: [],
          expenses: [],
        }),
      ),
    );
    expect(projets.map((p) => p.projectId)).toEqual(["p-1", "p-2"]);
  });
});
