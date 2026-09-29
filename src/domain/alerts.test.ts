import { describe, expect, it } from "vitest";

import {
  type AlertInput,
  type AlertInvoice,
  computeAlerts,
  daysBetween,
  summarizeAlerts,
} from "./alerts";

const TODAY = "2026-04-20";

function entree(overrides: Partial<AlertInput> = {}): AlertInput {
  return {
    today: TODAY,
    invoices: [],
    installments: [],
    sessions: [],
    projects: [],
    // Une sauvegarde récente par défaut : sinon chaque test traînerait
    // l'alerte de sauvegarde et masquerait ce qu'il vérifie.
    lastBackupAt: "2026-04-19",
    ...overrides,
  };
}

function facture(overrides: Partial<AlertInvoice> = {}): AlertInvoice {
  return {
    id: "f-1",
    number: "FAC-2026-003",
    kind: "invoice",
    status: "pending",
    clientName: "Akanda Group",
    dueDate: "2026-04-10",
    formattedBalance: "70 800 FCFA",
    balance: 70800,
    ...overrides,
  };
}

describe("écart de dates", () => {
  it("compte les jours dans le bon sens", () => {
    expect(daysBetween("2026-04-10", "2026-04-20")).toBe(10);
    expect(daysBetween("2026-04-20", "2026-04-10")).toBe(-10);
    expect(daysBetween("2026-04-20", "2026-04-20")).toBe(0);
  });

  it("traverse un changement de mois et une année bissextile", () => {
    expect(daysBetween("2026-02-25", "2026-03-05")).toBe(8);
    expect(daysBetween("2024-02-27", "2024-03-01")).toBe(3);
  });

  it("rend zéro sur une date illisible plutôt que NaN", () => {
    expect(daysBetween("pas-une-date", TODAY)).toBe(0);
  });
});

describe("factures", () => {
  it("signale un retard et dit quoi faire", () => {
    const alertes = computeAlerts(entree({ invoices: [facture()] }));
    const retard = alertes.find((a) => a.kind === "invoiceOverdue");
    expect(retard?.title).toContain("10 jour(s)");
    expect(retard?.detail).toContain("70 800 FCFA");
    expect(retard?.detail).toMatch(/relance/i);
    expect(retard?.href).toBe("/invoicing");
  });

  it("passe en critique au-delà de trois semaines", () => {
    const alertes = computeAlerts(
      entree({ invoices: [facture({ dueDate: "2026-03-28" })] }),
    );
    expect(alertes[0]?.severity).toBe("critical");
  });

  it("anticipe une échéance proche sans crier au retard", () => {
    const alertes = computeAlerts(
      entree({ invoices: [facture({ dueDate: "2026-04-23" })] }),
    );
    const proche = alertes.find((a) => a.kind === "invoiceDueSoon");
    expect(proche?.severity).toBe("info");
    expect(proche?.title).toContain("3 jour(s)");
  });

  it("ignore une échéance encore lointaine", () => {
    const alertes = computeAlerts(
      entree({ invoices: [facture({ dueDate: "2026-06-01" })] }),
    );
    expect(alertes.filter((a) => a.kind.startsWith("invoice"))).toHaveLength(0);
  });

  it("ignore une facture réglée, annulée, ou soldée à zéro", () => {
    for (const variante of [
      facture({ status: "paid" }),
      facture({ status: "cancelled" }),
      facture({ balance: 0 }),
    ]) {
      const alertes = computeAlerts(entree({ invoices: [variante] }));
      expect(alertes.filter((a) => a.kind === "invoiceOverdue")).toHaveLength(0);
    }
  });

  it("signale un brouillon oublié sans le traiter comme un impayé", () => {
    const alertes = computeAlerts(entree({ invoices: [facture({ status: "draft" })] }));
    expect(alertes[0]?.kind).toBe("draftPending");
    expect(alertes[0]?.severity).toBe("info");
  });

  it("signale un devis dont la validité est passée", () => {
    const alertes = computeAlerts(
      entree({
        invoices: [facture({ kind: "quote", number: "DEV-2026-004" })],
      }),
    );
    const devis = alertes.find((a) => a.kind === "quoteExpiring");
    expect(devis?.title).toContain("DEV-2026-004");
    expect(devis?.detail).toMatch(/nouveau devis/);
  });

  it("ne traite pas un devis comme une créance en retard", () => {
    const alertes = computeAlerts(
      entree({ invoices: [facture({ kind: "quote" })] }),
    );
    expect(alertes.filter((a) => a.kind === "invoiceOverdue")).toHaveLength(0);
  });
});

describe("échéances de formation", () => {
  const echeance = {
    enrollmentId: "in-1",
    installmentId: "ech-2",
    learnerName: "Yannick Moussavou",
    sessionTitle: "Bootcamp FullStack MERN",
    dueDate: "2026-04-05",
    formattedAmount: "48 000 FCFA",
    amount: 48000,
  };

  it("signale une échéance dépassée", () => {
    const alertes = computeAlerts(entree({ installments: [echeance] }));
    const alerte = alertes.find((a) => a.kind === "installmentOverdue");
    expect(alerte?.severity).toBe("critical");
    expect(alerte?.detail).toContain("Yannick Moussavou");
    expect(alerte?.href).toBe("/academy");
  });

  it("ne signale pas le jour même de l'échéance", () => {
    const alertes = computeAlerts(
      entree({ installments: [{ ...echeance, dueDate: TODAY }] }),
    );
    expect(alertes.filter((a) => a.kind === "installmentOverdue")).toHaveLength(0);
  });
});

describe("sessions", () => {
  it("alerte sur une session sous-remplie qui approche", () => {
    const alertes = computeAlerts(
      entree({
        sessions: [
          {
            id: "s-1",
            title: "React.js",
            startDate: "2026-04-25",
            taken: 2,
            capacity: 10,
          },
        ],
      }),
    );
    const alerte = alertes.find((a) => a.kind === "sessionStarting");
    expect(alerte?.severity).toBe("warning");
    expect(alerte?.detail).toContain("2 inscrit(s) sur 10");
  });

  it("reste silencieuse sur une session bien remplie et encore lointaine", () => {
    // Une session pleine à deux semaines n'appelle aucune action.
    const alertes = computeAlerts(
      entree({
        sessions: [
          {
            id: "s-1",
            title: "React.js",
            startDate: "2026-04-30",
            taken: 9,
            capacity: 10,
          },
        ],
      }),
    );
    expect(alertes.filter((a) => a.kind === "sessionStarting")).toHaveLength(0);
  });

  it("rappelle une session imminente même bien remplie", () => {
    const alertes = computeAlerts(
      entree({
        sessions: [
          {
            id: "s-1",
            title: "React.js",
            startDate: "2026-04-22",
            taken: 9,
            capacity: 10,
          },
        ],
      }),
    );
    expect(alertes.some((a) => a.kind === "sessionStarting")).toBe(true);
  });

  it("ignore une session déjà commencée", () => {
    const alertes = computeAlerts(
      entree({
        sessions: [
          {
            id: "s-1",
            title: "React.js",
            startDate: "2026-04-01",
            taken: 1,
            capacity: 10,
          },
        ],
      }),
    );
    expect(alertes.filter((a) => a.kind === "sessionStarting")).toHaveLength(0);
  });
});

describe("projets", () => {
  it("distingue le dépassement couvert de la perte réelle", () => {
    const alertes = computeAlerts(
      entree({
        projects: [
          {
            id: "p-1",
            name: "Logo",
            costVsBudgetPercent: 144,
            marginNegative: false,
          },
          {
            id: "p-2",
            name: "App mobile",
            costVsBudgetPercent: 120,
            marginNegative: true,
          },
        ],
      }),
    );
    const couvert = alertes.find((a) => a.id === "project:p-1");
    const perte = alertes.find((a) => a.id === "project:p-2");
    expect(couvert?.severity).toBe("warning");
    expect(couvert?.detail).toMatch(/facturation suit/);
    expect(perte?.severity).toBe("critical");
    expect(perte?.detail).toMatch(/ne couvre pas/);
  });

  it("se tait sur un projet dans son budget", () => {
    const alertes = computeAlerts(
      entree({
        projects: [
          { id: "p-1", name: "Site", costVsBudgetPercent: 71, marginNegative: false },
        ],
      }),
    );
    expect(alertes.filter((a) => a.kind === "projectOverBudget")).toHaveLength(0);
  });
});

describe("sauvegarde", () => {
  it("crie quand aucune sauvegarde n'a jamais été faite", () => {
    const alertes = computeAlerts(entree({ lastBackupAt: null }));
    expect(alertes[0]?.kind).toBe("backupStale");
    expect(alertes[0]?.severity).toBe("critical");
    expect(alertes[0]?.detail).toMatch(/définitivement perdu/);
  });

  it("rappelle au-delà d'une semaine", () => {
    const alertes = computeAlerts(entree({ lastBackupAt: "2026-04-05" }));
    const alerte = alertes.find((a) => a.kind === "backupStale");
    expect(alerte?.severity).toBe("warning");
    expect(alerte?.title).toContain("15 jours");
  });

  it("se tait sur une sauvegarde récente", () => {
    expect(
      computeAlerts(entree({ lastBackupAt: "2026-04-18" })).filter(
        (a) => a.kind === "backupStale",
      ),
    ).toHaveLength(0);
  });
});

describe("tri et résumé", () => {
  it("met le critique en tête, puis le plus urgent", () => {
    const alertes = computeAlerts(
      entree({
        invoices: [
          facture({ id: "f-1", dueDate: "2026-04-18" }),
          facture({ id: "f-2", number: "FAC-2026-001", dueDate: "2026-03-01" }),
          facture({ id: "f-3", number: "FAC-2026-002", dueDate: "2026-04-15" }),
        ],
      }),
    );
    expect(alertes[0]?.severity).toBe("critical");
    expect(alertes[0]?.id).toBe("overdue:f-2");
    // À gravité égale, le plus gros retard d'abord.
    expect(alertes[1]?.id).toBe("overdue:f-3");
  });

  it("rend un identifiant stable d'un calcul à l'autre", () => {
    // Sans cela, React remonterait chaque ligne à chaque rendu.
    const parametres = entree({ invoices: [facture()] });
    expect(computeAlerts(parametres).map((a) => a.id)).toEqual(
      computeAlerts(parametres).map((a) => a.id),
    );
  });

  it("résume par gravité", () => {
    const alertes = computeAlerts(
      entree({
        lastBackupAt: null,
        invoices: [facture(), facture({ id: "f-2", status: "draft" })],
      }),
    );
    const resume = summarizeAlerts(alertes);
    expect(resume.total).toBe(3);
    expect(resume.critical).toBe(1);
    expect(resume.warning).toBe(1);
    expect(resume.info).toBe(1);
  });

  it("ne rend rien quand tout va bien", () => {
    expect(computeAlerts(entree())).toEqual([]);
  });
});
