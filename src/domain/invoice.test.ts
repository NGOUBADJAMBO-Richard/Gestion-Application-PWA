import { describe, expect, it } from "vitest";

import {
  type DocumentLine,
  InvalidLineError,
  computeBalanceDue,
  computeDocumentTotals,
} from "./invoice";
import { add, money, negate, sum } from "./money";

const xaf = (amount: number) => money(amount, "XAF");
const eur = (amount: number) => money(amount, "EUR");

function ligne(
  id: string,
  quantity: number,
  unitPrice: number,
  options: { remise?: number; tva?: number; devise?: "XAF" | "EUR" } = {},
): DocumentLine {
  return {
    id,
    label: `Ligne ${id}`,
    quantity,
    unitPrice: money(unitPrice, options.devise ?? "XAF"),
    discountPercent: options.remise ?? 0,
    vatRatePercent: options.tva ?? 0,
  };
}

/**
 * Reproduction fidèle de l'algorithme qui vivait dans Invoicing.tsx, conservée
 * pour documenter ce qui a été remplacé et pourquoi.
 */
function algorithmeRemplace(
  items: ReadonlyArray<{ quantity: number; unitPrice: number; taxRate: number }>,
) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = items.reduce(
    (s, i) => s + i.quantity * i.unitPrice * (i.taxRate / 100),
    0,
  );
  return {
    subtotal: Math.round(subtotal),
    taxAmount: Math.round(taxAmount),
    total: Math.round(subtotal + taxAmount),
  };
}

describe("caractérisation de l'algorithme remplacé", () => {
  it("produisait un pied de facture qui ne se recompose pas", () => {
    const ancien = algorithmeRemplace([
      { quantity: 3.5, unitPrice: 1, taxRate: 18 },
    ]);

    expect(ancien.subtotal).toBe(4);
    expect(ancien.taxAmount).toBe(1);
    expect(ancien.total).toBe(4);
    // Le client qui additionne la colonne trouve 5, la facture affiche 4.
    expect(ancien.subtotal + ancien.taxAmount).not.toBe(ancien.total);
  });

  it("le nouveau calcul ne peut pas produire cet écart", () => {
    const totaux = computeDocumentTotals([ligne("a", 3.5, 1, { tva: 18 })], "XAF");
    expect(add(totaux.subtotal, totaux.totalVat)).toEqual(totaux.total);
  });
});

describe("somme de contrôle HT + TVA = TTC", () => {
  it("tient sur le cas nominal : 3 lignes, remise 7 %, TVA 18 %", () => {
    const totaux = computeDocumentTotals(
      [
        ligne("a", 1, 450000, { remise: 7, tva: 18 }),
        ligne("b", 3, 85000, { remise: 7, tva: 18 }),
        ligne("c", 12, 7500, { remise: 7, tva: 18 }),
      ],
      "XAF",
    );

    expect(add(totaux.subtotal, totaux.totalVat)).toEqual(totaux.total);
  });

  it("tient sur des milliers de combinaisons", () => {
    for (let n = 1; n <= 2000; n += 1) {
      const totaux = computeDocumentTotals(
        [
          ligne("a", (n % 7) + 1, (n * 137) % 50000 || 1, {
            remise: n % 101,
            tva: [0, 5, 10, 18][n % 4] ?? 0,
          }),
          ligne("b", ((n * 3) % 5) + 1, (n * 91) % 9999 || 1, {
            remise: (n * 7) % 101,
            tva: [18, 0, 5][n % 3] ?? 0,
          }),
        ],
        "XAF",
      );
      expect(totaux.total.amount).toBe(
        totaux.subtotal.amount + totaux.totalVat.amount,
      );
    }
  });

  it("la colonne TVA affichée se resomme exactement au total", () => {
    const totaux = computeDocumentTotals(
      [
        ligne("a", 1, 3333, { tva: 18 }),
        ligne("b", 1, 3333, { tva: 18 }),
        ligne("c", 1, 3334, { tva: 18 }),
      ],
      "XAF",
    );

    expect(sum(totaux.lines.map((l) => l.vat))).toEqual(totaux.totalVat);
    expect(sum(totaux.lines.map((l) => l.net))).toEqual(totaux.subtotal);
    expect(sum(totaux.lines.map((l) => l.total))).toEqual(totaux.total);
  });
});

describe("taux de TVA multiples", () => {
  it("calcule une TVA par tranche, sur la base remisée de la tranche", () => {
    const totaux = computeDocumentTotals(
      [
        ligne("a", 1, 100000, { tva: 18 }),
        ligne("b", 1, 50000, { tva: 0 }),
        ligne("c", 1, 100000, { tva: 18 }),
      ],
      "XAF",
    );

    expect(totaux.vatBrackets).toHaveLength(2);
    const tranche18 = totaux.vatBrackets.find((b) => b.ratePercent === 18);
    expect(tranche18?.base).toEqual(xaf(200000));
    expect(tranche18?.vat).toEqual(xaf(36000));

    const tranche0 = totaux.vatBrackets.find((b) => b.ratePercent === 0);
    expect(tranche0?.base).toEqual(xaf(50000));
    expect(tranche0?.vat).toEqual(xaf(0));

    expect(totaux.total).toEqual(xaf(286000));
  });

  it("conserve l'ordre de première apparition des taux", () => {
    const totaux = computeDocumentTotals(
      [ligne("a", 1, 1000, { tva: 5 }), ligne("b", 1, 1000, { tva: 18 })],
      "XAF",
    );
    expect(totaux.vatBrackets.map((b) => b.ratePercent)).toEqual([5, 18]);
  });

  it("gère l'exonération totale", () => {
    const totaux = computeDocumentTotals([ligne("a", 2, 75000, { tva: 0 })], "XAF");
    expect(totaux.totalVat).toEqual(xaf(0));
    expect(totaux.total).toEqual(totaux.subtotal);
  });
});

describe("remise", () => {
  it("s'applique ligne par ligne, et non sur le total", () => {
    // Remise globale puis arrondi unique donnerait un autre entier.
    const totaux = computeDocumentTotals(
      [
        ligne("a", 1, 3333, { remise: 7 }),
        ligne("b", 1, 3333, { remise: 7 }),
        ligne("c", 1, 3333, { remise: 7 }),
      ],
      "XAF",
    );

    // 3333 x 0,93 = 3099,69 -> 3100 par ligne, soit 9300.
    expect(totaux.subtotal).toEqual(xaf(9300));
    expect(totaux.grossSubtotal).toEqual(xaf(9999));
    expect(totaux.totalDiscount).toEqual(xaf(699));
  });

  it("remise et brut se recomposent toujours", () => {
    const totaux = computeDocumentTotals(
      [ligne("a", 7, 12345, { remise: 33 }), ligne("b", 2, 999, { remise: 12 })],
      "XAF",
    );
    expect(add(totaux.subtotal, totaux.totalDiscount)).toEqual(totaux.grossSubtotal);
  });
});

describe("avoir", () => {
  it("annule exactement la facture qu'il reprend", () => {
    const lignes = [
      ligne("a", 3, 85000, { remise: 7, tva: 18 }),
      ligne("b", 12, 7500, { remise: 7, tva: 18 }),
    ];
    const facture = computeDocumentTotals(lignes, "XAF");
    const avoir = computeDocumentTotals(
      lignes.map((l) => ({ ...l, unitPrice: negate(l.unitPrice) })),
      "XAF",
    );

    expect(add(facture.total, avoir.total)).toEqual(xaf(0));
    expect(add(facture.subtotal, avoir.subtotal)).toEqual(xaf(0));
    expect(add(facture.totalVat, avoir.totalVat)).toEqual(xaf(0));
  });
});

describe("solde et acompte", () => {
  it("déduit un acompte de 30 % au centime en EUR", () => {
    const totaux = computeDocumentTotals(
      [ligne("a", 1, 120000, { tva: 20, devise: "EUR" })],
      "EUR",
    );
    expect(totaux.total).toEqual(eur(144000));

    const acompte = eur(43200);
    expect(computeBalanceDue(totaux.total, [acompte])).toEqual(eur(100800));
  });

  it("cumule plusieurs encaissements partiels", () => {
    const totaux = computeDocumentTotals([ligne("a", 1, 500000, { tva: 18 })], "XAF");
    expect(computeBalanceDue(totaux.total, [xaf(200000), xaf(100000)])).toEqual(
      xaf(290000),
    );
  });

  it("un document sans ligne a des totaux nuls, pas une erreur", () => {
    const totaux = computeDocumentTotals([], "XAF");
    expect(totaux.total).toEqual(xaf(0));
    expect(totaux.vatBrackets).toHaveLength(0);
  });
});

describe("refus des saisies invalides", () => {
  it("refuse une quantité nulle ou négative", () => {
    expect(() => computeDocumentTotals([ligne("a", 0, 1000)], "XAF")).toThrow(
      InvalidLineError,
    );
    expect(() => computeDocumentTotals([ligne("a", -1, 1000)], "XAF")).toThrow(
      InvalidLineError,
    );
  });

  it("refuse une remise hors bornes", () => {
    expect(() =>
      computeDocumentTotals([ligne("a", 1, 1000, { remise: 120 })], "XAF"),
    ).toThrow(InvalidLineError);
  });

  it("refuse une ligne dans une autre devise que le document", () => {
    expect(() =>
      computeDocumentTotals([ligne("a", 1, 1000, { devise: "EUR" })], "XAF"),
    ).toThrow(InvalidLineError);
  });

  it("nomme la ligne et le champ fautifs", () => {
    try {
      computeDocumentTotals([ligne("ligne-7", 0, 1000)], "XAF");
      expect.unreachable("une erreur était attendue");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidLineError);
      expect((error as InvalidLineError).lineId).toBe("ligne-7");
      expect((error as InvalidLineError).field).toBe("quantity");
    }
  });
});
