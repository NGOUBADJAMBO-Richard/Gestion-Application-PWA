import { describe, expect, it } from "vitest";

import {
  type InvoiceSnapshot,
  type ProjectSnapshot,
  computeActivePipeline,
  computeDashboardMetrics,
  computeMonthlyRevenue,
} from "./dashboard";
import { money } from "./money";

const xaf = (amount: number) => money(amount, "XAF");

function facture(
  amount: number,
  status: InvoiceSnapshot["status"],
  date: string,
): InvoiceSnapshot {
  return { amount, status, date, dueDate: date };
}

function projet(
  status: ProjectSnapshot["status"],
  budget: number,
): ProjectSnapshot {
  return { status, budget };
}

describe("chiffre d'affaires mensuel", () => {
  it("ne compte que les factures réglées", () => {
    const mois = computeMonthlyRevenue(
      [
        facture(100000, "paid", "2026-03-10"),
        facture(500000, "pending", "2026-03-12"),
        facture(300000, "overdue", "2026-03-15"),
      ],
      1,
      "2026-03-31",
    );
    expect(mois[0]?.revenue).toBe(100000);
  });

  it("cumule plusieurs factures du même mois", () => {
    const mois = computeMonthlyRevenue(
      [facture(100000, "paid", "2026-03-02"), facture(45000, "paid", "2026-03-28")],
      1,
      "2026-03-31",
    );
    expect(mois[0]?.revenue).toBe(145000);
  });

  it("affiche les mois creux à zéro plutôt que de les omettre", () => {
    // Sauter un mois vide laisserait croire à une croissance continue.
    const mois = computeMonthlyRevenue(
      [facture(100000, "paid", "2026-01-10"), facture(200000, "paid", "2026-03-10")],
      3,
      "2026-03-31",
    );
    expect(mois.map((m) => m.revenue)).toEqual([100000, 0, 200000]);
  });

  it("rend les mois dans l'ordre chronologique", () => {
    const mois = computeMonthlyRevenue([], 6, "2026-06-15");
    expect(mois.map((m) => m.key)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
  });

  it("franchit correctement le changement d'année", () => {
    const mois = computeMonthlyRevenue([], 3, "2027-01-15");
    expect(mois.map((m) => m.key)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("étiquette les mois en français", () => {
    const mois = computeMonthlyRevenue([], 2, "2026-02-15");
    expect(mois.map((m) => m.label)).toEqual(["janv.", "févr."]);
  });
});

describe("indicateurs de tête", () => {
  const factures = [
    facture(500000, "paid", "2026-03-05"),
    facture(200000, "paid", "2026-02-10"),
    facture(150000, "pending", "2026-03-20"),
    facture(80000, "overdue", "2026-02-01"),
  ];

  it("encaissé du mois : seules les factures réglées du mois comptent", () => {
    const m = computeDashboardMetrics(factures, [], 0, "XAF", "2026-03-31");
    expect(m.collected.value).toEqual(xaf(500000));
  });

  it("calcule la variation face au mois précédent", () => {
    const m = computeDashboardMetrics(factures, [], 0, "XAF", "2026-03-31");
    // 500 000 contre 200 000 : +150 %.
    expect(m.collected.changePercent).toBeCloseTo(150, 5);
  });

  it("n'annonce aucune variation quand le mois précédent est vide", () => {
    // « +100 % » parce qu'on passe de zéro à une facture serait trompeur.
    const m = computeDashboardMetrics(
      [facture(500000, "paid", "2026-03-05")],
      [],
      0,
      "XAF",
      "2026-03-31",
    );
    expect(m.collected.changePercent).toBeNull();
  });

  it("additionne le restant dû : en attente et en retard", () => {
    const m = computeDashboardMetrics(factures, [], 0, "XAF", "2026-03-31");
    expect(m.outstanding).toEqual(xaf(230000));
  });

  it("isole le retard, qui appelle une relance", () => {
    const m = computeDashboardMetrics(factures, [], 0, "XAF", "2026-03-31");
    expect(m.overdueAmount).toEqual(xaf(80000));
    expect(m.overdueCount).toBe(1);
  });

  it("compte les projets actifs et les factures en attente", () => {
    const m = computeDashboardMetrics(
      factures,
      [projet("active", 450000), projet("completed", 25000), projet("active", 600000)],
      4,
      "XAF",
      "2026-03-31",
    );
    expect(m.activeProjects.value).toBe(2);
    expect(m.clientCount).toBe(4);
    expect(m.pendingInvoices).toBe(1);
  });

  it("reste à zéro sans aucune donnée, sans planter", () => {
    const m = computeDashboardMetrics([], [], 0, "XAF", "2026-03-31");
    expect(m.collected.value).toEqual(xaf(0));
    expect(m.outstanding).toEqual(xaf(0));
    expect(m.collected.changePercent).toBeNull();
  });
});

describe("portefeuille en cours", () => {
  it("additionne le budget des projets actifs seulement", () => {
    expect(
      computeActivePipeline(
        [projet("active", 450000), projet("pending", 175000), projet("active", 600000)],
        "XAF",
      ),
    ).toEqual(xaf(1050000));
  });

  it("vaut zéro sans projet actif", () => {
    expect(computeActivePipeline([], "XAF")).toEqual(xaf(0));
  });
});
