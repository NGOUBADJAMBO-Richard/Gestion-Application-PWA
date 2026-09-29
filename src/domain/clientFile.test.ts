import { describe, expect, it } from "vitest";

import {
  PAYMENT_BEHAVIOUR_LABELS,
  type ClientFileInput,
  computeClientFinancials,
  paymentBehaviour,
} from "./clientFile";
import { addDays } from "./date";
import type { ExecutiveDocument } from "./executive";
import { money } from "./money";

const XAF = "XAF" as const;
const f = (amount: number) => money(amount, XAF);

function doc(overrides: Partial<ExecutiveDocument> = {}): ExecutiveDocument {
  return {
    id: "d-1",
    number: "FAC-2026-001",
    kind: "invoice",
    status: "pending",
    clientId: "c-1",
    issuedAt: "2026-03-01",
    net: f(100000),
    total: f(118000),
    payments: [],
    ...overrides,
  };
}

function entree(
  documents: readonly ExecutiveDocument[],
  overrides: Partial<ClientFileInput> = {},
): ClientFileInput {
  return {
    clientId: "c-1",
    currency: XAF,
    today: "2026-04-20",
    documents,
    dueDates: new Map(documents.map((d) => [d.id, "2026-03-31"])),
    paymentTermDays: 30,
    convertedQuoteNumbers: new Set(),
    ...overrides,
  };
}

describe("périmètre", () => {
  it("ne retient que les pièces du client demandé", () => {
    const bilan = computeClientFinancials(
      entree([doc(), doc({ id: "d-2", clientId: "c-2", net: f(900000) })]),
    );
    expect(bilan.revenue.amount).toBe(100000);
  });

  it("écarte les brouillons et les pièces annulées", () => {
    const bilan = computeClientFinancials(
      entree([
        doc({ id: "a", status: "draft" }),
        doc({ id: "b", status: "cancelled" }),
      ]),
    );
    expect(bilan.revenue.amount).toBe(0);
    expect(bilan.invoiceCount).toBe(0);
  });

  it("ne compte pas les devis au chiffre d'affaires", () => {
    const bilan = computeClientFinancials(
      entree([doc({ kind: "quote", number: "DEV-2026-001" })]),
    );
    expect(bilan.revenue.amount).toBe(0);
    expect(bilan.quoteCount).toBe(1);
  });

  it("déduit les avoirs", () => {
    const bilan = computeClientFinancials(
      entree([
        doc({ id: "a", net: f(100000), total: f(118000) }),
        doc({
          id: "b",
          kind: "creditNote",
          number: "AV-2026-001",
          net: f(-40000),
          total: f(-47200),
        }),
      ]),
    );
    expect(bilan.revenue.amount).toBe(60000);
    expect(bilan.creditNoteCount).toBe(1);
  });
});

describe("encours", () => {
  it("sépare l'échu du reste", () => {
    const bilan = computeClientFinancials(
      entree(
        [
          doc({ id: "a", total: f(118000) }),
          doc({ id: "b", total: f(236000), number: "FAC-2026-002" }),
        ],
        {
          dueDates: new Map([
            ["a", "2026-03-31"],
            ["b", "2026-05-31"],
          ]),
        },
      ),
    );
    expect(bilan.outstanding.amount).toBe(354000);
    expect(bilan.overdue.amount).toBe(118000);
    expect(bilan.overdueCount).toBe(1);
  });

  it("retranche les versements partiels", () => {
    const bilan = computeClientFinancials(
      entree([
        doc({ payments: [{ date: "2026-03-10", amount: 50000 }] }),
      ]),
    );
    expect(bilan.collected.amount).toBe(50000);
    expect(bilan.outstanding.amount).toBe(68000);
  });

  it("tient une facture déclarée réglée pour encaissée", () => {
    // Le statut est une déclaration, les encaissements un journal : quand ils
    // divergent, la déclaration fait foi. Sinon une facture soldée avant que
    // le suivi des règlements n'existe resterait éternellement en encours.
    const bilan = computeClientFinancials(
      entree([doc({ status: "paid", payments: [] })]),
    );
    expect(bilan.outstanding.amount).toBe(0);
    expect(bilan.overdue.amount).toBe(0);
  });
});

describe("comportement de paiement", () => {
  /**
   * Facture émise le 1er mars, réglée après `jours`.
   *
   * La date est construite avec `addDays` et non par arithmétique sur
   * `toISOString()` : cette dernière convertit d'abord en temps universel et
   * perd un jour dès qu'on est à l'est de Greenwich — exactement le défaut que
   * `date.ts` corrige. Un helper de test qui le reproduit fait échouer un code
   * juste.
   */
  const regle = (jours: number) =>
    doc({
      status: "paid",
      issuedAt: "2026-03-01",
      payments: [{ date: addDays("2026-03-01", jours), amount: 118000 }],
    });

  it("mesure le délai propre à ce client", () => {
    const bilan = computeClientFinancials(entree([regle(65)]));
    expect(bilan.paymentDays).toBe(65);
    expect(bilan.paymentDaysVsTerm).toBe(35);
  });

  it("ne juge pas sans historique", () => {
    const bilan = computeClientFinancials(entree([doc()]));
    expect(bilan.paymentDays).toBeNull();
    expect(paymentBehaviour(bilan)).toBe("unknown");
  });

  it("tolère un léger dépassement", () => {
    // Trente-cinq jours au lieu de trente n'est pas un mauvais payeur, et le
    // classer comme tel ferait ignorer l'étiquette quand elle compte.
    expect(paymentBehaviour(computeClientFinancials(entree([regle(35)])))).toBe(
      "onTime",
    );
  });

  it("signale un retard installé", () => {
    expect(paymentBehaviour(computeClientFinancials(entree([regle(50)])))).toBe(
      "slow",
    );
    expect(paymentBehaviour(computeClientFinancials(entree([regle(95)])))).toBe(
      "late",
    );
  });

  it("nomme chaque comportement", () => {
    for (const cle of ["unknown", "onTime", "slow", "late"] as const) {
      expect(PAYMENT_BEHAVIOUR_LABELS[cle].length).toBeGreaterThan(5);
    }
  });
});

describe("devis ouverts", () => {
  it("ne compte pas un devis déjà transformé", () => {
    const bilan = computeClientFinancials(
      entree(
        [
          doc({ id: "q1", kind: "quote", number: "DEV-2026-001" }),
          doc({ id: "q2", kind: "quote", number: "DEV-2026-002" }),
        ],
        { convertedQuoteNumbers: new Set(["DEV-2026-001"]) },
      ),
    );
    expect(bilan.quoteCount).toBe(2);
    expect(bilan.openQuotes).toBe(1);
  });
});

describe("ancienneté de la relation", () => {
  it("borne la relation par les dates d'émission", () => {
    const bilan = computeClientFinancials(
      entree([
        doc({ id: "a", issuedAt: "2026-03-01" }),
        doc({ id: "b", issuedAt: "2025-11-14", number: "FAC-2025-009" }),
      ]),
    );
    expect(bilan.firstDocumentAt).toBe("2025-11-14");
    expect(bilan.lastDocumentAt).toBe("2026-03-01");
  });

  it("rend null sur un client sans pièce", () => {
    const bilan = computeClientFinancials(entree([]));
    expect(bilan.firstDocumentAt).toBeNull();
    expect(bilan.lastDocumentAt).toBeNull();
    expect(bilan.revenue.amount).toBe(0);
  });
});
