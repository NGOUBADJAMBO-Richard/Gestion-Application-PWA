import { describe, expect, it } from "vitest";

import { documentAmounts, documentTotals, toRevenueDocuments } from "./documentTotals";
import type { Invoice, InvoiceItem } from "./mockData";

function ligne(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: "l-1",
    description: "Site vitrine Pro",
    quantity: 1,
    unitPrice: 175000,
    taxRate: 18,
    ...overrides,
  };
}

function facture(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "f-1",
    number: "FAC-2026-001",
    kind: "invoice",
    clientId: "c-1",
    projectId: "p-1",
    items: [ligne()],
    amount: 206500,
    status: "pending",
    date: "2026-03-01",
    dueDate: "2026-03-31",
    paymentMethod: "bank-transfer",
    paymentTerms: "Paiement sous 30 jours",
    ...overrides,
  };
}

describe("totaux d'un document", () => {
  it("garantit HT + TVA = TTC", () => {
    const totaux = documentTotals([ligne()], "XAF");
    expect(totaux).not.toBeNull();
    expect(totaux?.subtotal.amount).toBe(175000);
    expect(totaux?.totalVat.amount).toBe(31500);
    expect(totaux?.total.amount).toBe(206500);
  });

  it("distingue l'échec du document vide", () => {
    // Un total à zéro se confond avec un document sans ligne : l'appelant doit
    // pouvoir faire la différence, donc l'échec est `null`, pas zéro.
    expect(documentTotals([ligne({ quantity: 0 })], "XAF")).toBeNull();
    expect(documentTotals([], "XAF")?.total.amount).toBe(0);
  });

  it("renvoie des zéros exploitables pour un formulaire en cours de saisie", () => {
    expect(documentAmounts([ligne({ quantity: -1 })], "XAF")).toEqual({
      subtotal: 0,
      taxAmount: 0,
      total: 0,
    });
  });
});

describe("réduction à la portée financière", () => {
  it("recalcule les montants depuis les lignes, pas depuis le champ figé", () => {
    // `amount` a été écrit par une version antérieure du calcul. Le relire
    // propagerait son erreur dans toute la marge ; les lignes, elles, sont la
    // saisie d'origine.
    const [document] = toRevenueDocuments([facture({ amount: 999999 })], "XAF");
    expect(document?.net.amount).toBe(175000);
    expect(document?.total.amount).toBe(206500);
  });

  it("porte le rattachement au projet", () => {
    const [document] = toRevenueDocuments([facture()], "XAF");
    expect(document?.projectId).toBe("p-1");
  });

  it("laisse le rattachement vide sur une pièce qui n'en a pas", () => {
    const [document] = toRevenueDocuments(
      [facture({ projectId: undefined })],
      "XAF",
    );
    expect(document?.projectId).toBeUndefined();
  });

  it("additionne les encaissements enregistrés", () => {
    const [document] = toRevenueDocuments(
      [
        facture({
          payments: [
            { id: "e-1", date: "2026-03-05", amount: 100000, method: "cash" },
            {
              id: "e-2",
              date: "2026-03-20",
              amount: 50000,
              method: "mobile-money",
            },
          ],
        }),
      ],
      "XAF",
    );
    expect(document?.collected.amount).toBe(150000);
  });

  it("rend un avoir négatif, pour qu'il compense sa facture", () => {
    const [document] = toRevenueDocuments(
      [
        facture({
          kind: "creditNote",
          number: "AV-2026-001",
          items: [ligne({ unitPrice: -175000 })],
        }),
      ],
      "XAF",
    );
    expect(document?.net.amount).toBe(-175000);
    expect(document?.total.amount).toBe(-206500);
  });

  it("écarte une pièce illisible au lieu de la compter pour rien", () => {
    // Comptée à zéro, elle disparaîtrait de l'analyse sans que personne ne le
    // remarque. Écartée, il manque une ligne — et ça se voit.
    const documents = toRevenueDocuments(
      [facture(), facture({ id: "f-2", items: [ligne({ taxRate: -5 })] })],
      "XAF",
    );
    expect(documents).toHaveLength(1);
    expect(documents[0]?.id).toBe("f-1");
  });
});
