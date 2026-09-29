import { describe, expect, it } from "vitest";

import {
  type ExecutiveDocument,
  computeCashPosition,
  computeClientConcentration,
  computeCollectionDelay,
  computeQuoteConversion,
} from "./executive";
import { money } from "./money";

const XAF = "XAF" as const;
const f = (amount: number) => money(amount, XAF);

function doc(overrides: Partial<ExecutiveDocument> = {}): ExecutiveDocument {
  return {
    id: "d-1",
    number: "FAC-2026-001",
    kind: "invoice",
    status: "paid",
    clientId: "c-1",
    issuedAt: "2026-03-01",
    net: f(100000),
    total: f(118000),
    payments: [{ date: "2026-03-31", amount: 118000 }],
    ...overrides,
  };
}

describe("délai d'encaissement", () => {
  it("mesure les jours entre l'émission et le dernier encaissement", () => {
    const delai = computeCollectionDelay([doc()]);
    expect(delai.weightedDays).toBe(30);
    expect(delai.medianDays).toBe(30);
    expect(delai.sampleSize).toBe(1);
  });

  it("clôt le délai sur le dernier versement, pas le premier", () => {
    // Un acompte à J+5 puis le solde à J+60 : la trésorerie a attendu 60 jours.
    const delai = computeCollectionDelay([
      doc({
        payments: [
          { date: "2026-03-06", amount: 50000 },
          { date: "2026-04-30", amount: 68000 },
        ],
      }),
    ]);
    expect(delai.weightedDays).toBe(60);
  });

  it("pondère par le montant, pas par le nombre de factures", () => {
    // 500 000 F payés en 60 jours et 10 000 F payés en 5 jours : la moyenne
    // simple dirait 32,5 jours, ce que la trésorerie ne ressent pas.
    const delai = computeCollectionDelay([
      doc({
        id: "a",
        total: f(500000),
        issuedAt: "2026-03-01",
        payments: [{ date: "2026-04-30", amount: 500000 }],
      }),
      doc({
        id: "b",
        number: "FAC-2026-002",
        total: f(10000),
        issuedAt: "2026-03-01",
        payments: [{ date: "2026-03-06", amount: 10000 }],
      }),
    ]);
    expect(delai.weightedDays).toBeCloseTo((60 * 500000 + 5 * 10000) / 510000, 4);
    expect(delai.medianDays).toBe(32.5);
  });

  it("écarte les factures impayées", () => {
    // Les compter ferait s'améliorer l'indicateur quand on cesse d'être payé :
    // les créances les plus anciennes sortiraient du calcul.
    const delai = computeCollectionDelay([
      doc({ status: "overdue", payments: [] }),
      doc({ id: "b", status: "pending", payments: [] }),
    ]);
    expect(delai.sampleSize).toBe(0);
    expect(delai.weightedDays).toBeNull();
  });

  it("écarte les devis et les avoirs", () => {
    const delai = computeCollectionDelay([
      doc({ kind: "quote" }),
      doc({ id: "b", kind: "creditNote" }),
    ]);
    expect(delai.sampleSize).toBe(0);
  });

  it("désigne la facture la plus lente", () => {
    const delai = computeCollectionDelay([
      doc({ id: "a", number: "FAC-001", payments: [{ date: "2026-03-11", amount: 1 }] }),
      doc({ id: "b", number: "FAC-002", payments: [{ date: "2026-06-01", amount: 1 }] }),
    ]);
    expect(delai.worst?.number).toBe("FAC-002");
    expect(delai.worst?.days).toBe(92);
  });

  it("ne rend pas de délai négatif sur un encaissement antérieur à l'émission", () => {
    // Acompte encaissé avant l'émission du document : le délai est nul, pas -10.
    const delai = computeCollectionDelay([
      doc({ payments: [{ date: "2026-02-19", amount: 118000 }] }),
    ]);
    expect(delai.weightedDays).toBe(0);
  });
});

describe("conversion des devis", () => {
  const devis = doc({
    id: "q-1",
    number: "DEV-2026-001",
    kind: "quote",
    status: "pending",
    net: f(450000),
    total: f(531000),
    payments: [],
  });

  it("rapproche la facture de son devis par le numéro", () => {
    const taux = computeQuoteConversion(
      [devis, doc({ id: "i-1", convertedFrom: "DEV-2026-001" })],
      XAF,
      "2026-03-15",
    );
    expect(taux.issued).toBe(1);
    expect(taux.converted).toBe(1);
    expect(taux.ratePercent).toBe(100);
    expect(taux.convertedValue.amount).toBe(450000);
  });

  it("ne confond pas deux devis du même client au même montant", () => {
    const taux = computeQuoteConversion(
      [
        devis,
        { ...devis, id: "q-2", number: "DEV-2026-002" },
        doc({ id: "i-1", convertedFrom: "DEV-2026-002" }),
      ],
      XAF,
      "2026-03-15",
    );
    expect(taux.issued).toBe(2);
    expect(taux.converted).toBe(1);
    expect(taux.ratePercent).toBe(50);
  });

  it("exclut les brouillons des deux côtés", () => {
    // Un devis jamais envoyé n'a pas échoué : il n'a pas été tenté.
    const taux = computeQuoteConversion(
      [
        { ...devis, status: "draft" },
        doc({ id: "i-1", status: "draft", convertedFrom: "DEV-2026-001" }),
      ],
      XAF,
      "2026-03-15",
    );
    expect(taux.issued).toBe(0);
    expect(taux.ratePercent).toBeNull();
  });

  it("compte les devis encore valides comme en attente", () => {
    const taux = computeQuoteConversion([devis], XAF, "2026-03-15");
    expect(taux.pending).toBe(1);
  });

  it("ne compte plus un devis dont la validité est passée", () => {
    const taux = computeQuoteConversion([devis], XAF, "2026-05-15");
    expect(taux.pending).toBe(0);
    expect(taux.issued).toBe(1);
  });

  it("rend null plutôt que zéro sans aucun devis", () => {
    expect(computeQuoteConversion([], XAF, "2026-03-15").ratePercent).toBeNull();
  });
});

describe("dépendance client", () => {
  it("classe les clients par chiffre d'affaires hors taxes", () => {
    const repartition = computeClientConcentration(
      [
        doc({ id: "a", clientId: "c-1", net: f(600000) }),
        doc({ id: "b", clientId: "c-2", net: f(300000) }),
        doc({ id: "c", clientId: "c-3", net: f(100000) }),
      ],
      XAF,
    );
    expect(repartition.ranking.map((ligne) => ligne.clientId)).toEqual([
      "c-1",
      "c-2",
      "c-3",
    ]);
    expect(repartition.total.amount).toBe(1000000);
    expect(repartition.topSharePercent).toBe(60);
    expect(repartition.dependent).toBe(true);
  });

  it("ne crie pas à la dépendance sur un portefeuille équilibré", () => {
    const repartition = computeClientConcentration(
      [
        doc({ id: "a", clientId: "c-1", net: f(400000) }),
        doc({ id: "b", clientId: "c-2", net: f(400000) }),
        doc({ id: "c", clientId: "c-3", net: f(400000) }),
      ],
      XAF,
    );
    expect(repartition.dependent).toBe(false);
  });

  it("déduit les avoirs du client concerné", () => {
    const repartition = computeClientConcentration(
      [
        doc({ id: "a", clientId: "c-1", net: f(600000) }),
        doc({ id: "b", clientId: "c-1", kind: "creditNote", net: f(-600000) }),
        doc({ id: "c", clientId: "c-2", net: f(100000) }),
      ],
      XAF,
    );
    expect(repartition.ranking[0]?.clientId).toBe("c-2");
    expect(
      repartition.ranking.find((ligne) => ligne.clientId === "c-1")?.revenue.amount,
    ).toBe(0);
  });

  it("ignore les devis et les brouillons", () => {
    const repartition = computeClientConcentration(
      [
        doc({ id: "a", kind: "quote", net: f(900000) }),
        doc({ id: "b", status: "draft", net: f(900000) }),
      ],
      XAF,
    );
    expect(repartition.total.amount).toBe(0);
    expect(repartition.topSharePercent).toBeNull();
  });

  it("ne rend pas de pourcentage sur un total nul", () => {
    const repartition = computeClientConcentration([], XAF);
    expect(repartition.topSharePercent).toBeNull();
    expect(repartition.dependent).toBe(false);
  });
});

describe("trésorerie attendue", () => {
  const echeances = new Map([
    ["a", "2026-03-31"],
    ["b", "2026-05-31"],
  ]);

  it("sépare l'échu de l'à-échoir", () => {
    const position = computeCashPosition(
      [
        doc({ id: "a", status: "overdue", total: f(118000), payments: [] }),
        doc({ id: "b", status: "pending", total: f(236000), payments: [] }),
      ],
      XAF,
      "2026-04-20",
      echeances,
    );
    expect(position.overdue.amount).toBe(118000);
    expect(position.upcoming.amount).toBe(236000);
    expect(position.receivable.amount).toBe(354000);
  });

  it("retranche les encaissements partiels", () => {
    const position = computeCashPosition(
      [
        doc({
          id: "a",
          status: "pending",
          total: f(118000),
          payments: [{ date: "2026-03-10", amount: 50000 }],
        }),
      ],
      XAF,
      "2026-04-20",
      echeances,
    );
    expect(position.overdue.amount).toBe(68000);
  });

  it("tient une facture déclarée réglée pour encaissée, même sans versement détaillé", () => {
    // Le statut est une déclaration, les encaissements un journal. Quand ils
    // divergent, la déclaration fait foi : sinon une facture soldée avant que
    // le suivi des règlements n'existe resterait éternellement à encaisser.
    const position = computeCashPosition(
      [doc({ id: "a", status: "paid", total: f(118000), payments: [] })],
      XAF,
      "2026-04-20",
      echeances,
    );
    expect(position.receivable.amount).toBe(0);
  });

  it("ignore ce qui est soldé, annulé ou en brouillon", () => {
    const position = computeCashPosition(
      [
        doc({ id: "a" }),
        doc({ id: "b", status: "cancelled", payments: [] }),
        doc({ id: "c", status: "draft", payments: [] }),
      ],
      XAF,
      "2026-04-20",
      echeances,
    );
    expect(position.receivable.amount).toBe(0);
  });
});
