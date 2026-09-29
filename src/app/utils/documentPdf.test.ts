import jsPDF from "jspdf";
import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_COMPANY_PROFILE } from "../../domain/companyProfile";
import { computeDocumentTotals } from "../../domain/invoice";
import { formatMoney, money } from "../../domain/money";
import type { Invoice } from "../data/entities";
import { PdfGenerationError, drawDocument } from "./documentPdf";

/**
 * Ce qui est réellement imprimé.
 *
 * Le PDF est la seule pièce qui parte chez le client : un écran juste et un
 * PDF faux est le pire des deux mondes, parce que personne ne le voit. On
 * intercepte donc les appels de dessin de texte et on vérifie les chaînes
 * effectivement posées sur la page — pas ce que le code avait l'intention
 * d'écrire.
 */
let imprime: string[] = [];

beforeEach(() => {
  imprime = [];
});

/**
 * Dessine dans un document dont `text` est instrumenté.
 *
 * jsPDF pose ses méthodes sur l'instance, pas sur le prototype : on ne peut
 * les intercepter qu'en fournissant soi-même le document.
 */
function dessiner(input: Parameters<typeof drawDocument>[1]): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const original = doc.text.bind(doc);
  doc.text = ((contenu: string | string[], ...reste: unknown[]) => {
    if (Array.isArray(contenu)) imprime.push(...contenu);
    else imprime.push(String(contenu));
    return (original as (...args: unknown[]) => jsPDF)(contenu, ...reste);
  }) as typeof doc.text;
  drawDocument(doc, input);
}

function contient(fragment: string): boolean {
  return imprime.some((ligne) => ligne.includes(fragment));
}

const PROFIL = {
  ...DEFAULT_COMPANY_PROFILE,
  name: "M.G.N CodeWave",
  legalForm: "SARL",
  addressLines: ["Nombakélé"],
  taxId: "123456789",
  tradeRegister: "GA-LBV-01-2024-B12-00456",
  signatoryName: "Richard Ngoubadjambo",
  signatoryRole: "Gérant",
  bankDetails: "Airtel Money 066 19 89 18",
};

function document(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "d-1",
    number: "FAC-2026-005",
    kind: "invoice",
    clientId: "c-1",
    items: [
      {
        id: "l1",
        description: "Site vitrine Pro",
        quantity: 1,
        unitPrice: 175000,
        taxRate: 18,
      },
    ],
    amount: 206500,
    status: "pending",
    date: "2026-09-29",
    dueDate: "2026-10-29",
    paymentMethod: "mobile-money",
    paymentTerms: "Paiement sous 30 jours",
    ...overrides,
  };
}

function generer(invoice: Invoice, profile = PROFIL) {
  return dessiner({
    invoice,
    clientName: "Akanda Group",
    clientLines: ["Sylvie Ondo", "s.ondo@akandagroup.ga"],
    profile,
  });
}

const argent = (valeur: number) =>
  formatMoney(money(valeur, "XAF")).replace(
    new RegExp(`[${String.fromCharCode(0x202f, 0x00a0, 0x2009)}]`, "g"),
    " ",
  );

describe("nature du document", () => {
  it("titre un devis « DEVIS », pas « FACTURE »", () => {
    // Le générateur précédent écrivait « FACTURE » sur tout, devis compris.
    generer(document({ kind: "quote", number: "DEV-2026-004" }));
    expect(contient("DEVIS")).toBe(true);
    expect(contient("FACTURE")).toBe(false);
  });

  it("titre une facture et un avoir correctement", () => {
    generer(document());
    expect(contient("FACTURE")).toBe(true);

    imprime = [];
    generer(document({ kind: "creditNote", number: "AV-2026-001" }));
    expect(contient("AVOIR")).toBe(true);
  });

  it("désigne la facture qu'un avoir annule", () => {
    // Un avoir qui ne dit pas ce qu'il annule ne prouve rien.
    generer(
      document({
        kind: "creditNote",
        number: "AV-2026-001",
        cancels: "FAC-2026-003",
      }),
    );
    expect(contient("Annule la facture FAC-2026-003")).toBe(true);
  });

  it("rappelle le devis à l'origine d'une facture", () => {
    generer(document({ convertedFrom: "DEV-2026-004" }));
    expect(contient("Suite au devis DEV-2026-004")).toBe(true);
  });

  it("annonce un brouillon sans inventer de numéro", () => {
    generer(document({ number: "" }));
    expect(contient("Brouillon")).toBe(true);
  });
});

describe("totaux", () => {
  it("imprime exactement les totaux du domaine", () => {
    // Le générateur précédent recalculait en virgule flottante et arrondissait
    // trois fois : le PDF pouvait afficher un total différent de l'écran.
    const facture = document({
      items: [
        { id: "l1", description: "A", quantity: 3.5, unitPrice: 1, taxRate: 18 },
        { id: "l2", description: "B", quantity: 1, unitPrice: 12000, taxRate: 0 },
      ],
    });

    const attendus = computeDocumentTotals(
      facture.items.map((ligne) => ({
        id: ligne.id,
        label: ligne.description,
        quantity: ligne.quantity,
        unitPrice: money(ligne.unitPrice, "XAF"),
        discountPercent: 0,
        vatRatePercent: ligne.taxRate,
      })),
      "XAF",
    );

    generer(facture);

    expect(contient(argent(attendus.subtotal.amount))).toBe(true);
    expect(contient(argent(attendus.totalVat.amount))).toBe(true);
    expect(contient(argent(attendus.total.amount))).toBe(true);
  });

  it("n'imprime le total qu'une fois par étiquette", () => {
    // L'ancien document répétait trois fois le même récapitulatif.
    generer(document());
    expect(imprime.filter((ligne) => ligne === "TOTAL TTC")).toHaveLength(1);
    expect(
      imprime.filter((ligne) => ligne === "Total hors taxes"),
    ).toHaveLength(1);
  });

  it("ventile la TVA quand plusieurs taux se côtoient", () => {
    generer(
      document({
        items: [
          { id: "l1", description: "A", quantity: 1, unitPrice: 100000, taxRate: 18 },
          { id: "l2", description: "B", quantity: 1, unitPrice: 12000, taxRate: 0 },
        ],
      }),
    );
    expect(contient("VENTILATION DE TVA")).toBe(true);
  });

  it("ne ventile pas sur un taux unique", () => {
    // La ventilation répéterait alors le pied de document.
    generer(document());
    expect(contient("VENTILATION DE TVA")).toBe(false);
  });

  it("annonce le reste dû sur une facture partiellement encaissée", () => {
    generer(
      document({
        payments: [{ id: "p1", date: "2026-10-01", amount: 100000, method: "cash" }],
      }),
    );
    expect(contient("Déjà encaissé")).toBe(true);
    expect(contient("Reste dû")).toBe(true);
  });

  it("ne parle pas d'encaissement sur un devis", () => {
    generer(
      document({
        kind: "quote",
        number: "DEV-2026-004",
        payments: [{ id: "p1", date: "2026-10-01", amount: 100000, method: "cash" }],
      }),
    );
    expect(contient("Déjà encaissé")).toBe(false);
  });
});

describe("émetteur et destinataire", () => {
  it("prend le nom dans le profil, jamais en dur", () => {
    generer(document(), { ...PROFIL, name: "Autre Entreprise" });
    expect(contient("Autre Entreprise")).toBe(true);
    expect(contient("M.G.N CodeWave")).toBe(false);
  });

  it("porte les identifiants fiscaux", () => {
    generer(document());
    expect(contient("NIF 123456789")).toBe(true);
    expect(contient("RCCM GA-LBV-01-2024-B12-00456")).toBe(true);
  });

  it("n'imprime pas d'identifiant vide", () => {
    generer(document(), { ...PROFIL, taxId: "", tradeRegister: "" });
    expect(contient("NIF")).toBe(false);
    expect(contient("RCCM")).toBe(false);
  });

  it("nomme le destinataire une seule fois", () => {
    // L'ancien document imprimait deux blocs client identiques.
    generer(document());
    expect(imprime.filter((ligne) => ligne === "Akanda Group")).toHaveLength(1);
  });

  it("n'écrit jamais « N/A » à la place d'une adresse manquante", () => {
    dessiner({
      invoice: document(),
      clientName: "Akanda Group",
      profile: PROFIL,
    });
    expect(contient("N/A")).toBe(false);
  });
});

describe("signature", () => {
  it("porte le lieu, la date, le signataire et sa qualité", () => {
    generer(document());
    expect(contient("Fait à Libreville")).toBe(true);
    expect(contient("Pour M.G.N CodeWave")).toBe(true);
    expect(contient("Richard Ngoubadjambo")).toBe(true);
    expect(contient("Gérant")).toBe(true);
  });

  it("retombe sur le nom de l'entreprise quand aucun signataire n'est nommé", () => {
    generer(document(), { ...PROFIL, signatoryName: "" });
    expect(contient("M.G.N CodeWave")).toBe(true);
  });

  it("n'ouvre un cadre d'acceptation que sur un devis", () => {
    // C'est ce cadre qui transforme un devis en accord.
    generer(document({ kind: "quote", number: "DEV-2026-004" }));
    expect(contient("BON POUR ACCORD")).toBe(true);

    imprime = [];
    generer(document());
    expect(contient("BON POUR ACCORD")).toBe(false);
  });

  it("annonce la validité d'un devis par une date, pas par une durée", () => {
    generer(document({ kind: "quote", number: "DEV-2026-004" }));
    expect(contient("Offre valable jusqu'au 29 octobre 2026")).toBe(true);
  });
});

describe("règlement", () => {
  it("rappelle le mode et les coordonnées de paiement", () => {
    generer(document());
    expect(contient("Mode : Mobile Money")).toBe(true);
    expect(contient("Airtel Money 066 19 89 18")).toBe(true);
  });

  it("ne réclame pas de règlement sur un avoir", () => {
    generer(document({ kind: "creditNote", number: "AV-2026-001" }));
    expect(contient("RÈGLEMENT")).toBe(false);
  });

  it("reporte la note du document", () => {
    generer(document({ notes: "Hébergement la première année offert." }));
    expect(contient("Hébergement la première année offert.")).toBe(true);
  });
});

describe("refus", () => {
  it("refuse de produire un PDF sur des lignes inexploitables", () => {
    // Produire un document à zéro serait pire : le client le recevrait et
    // personne ne verrait le problème.
    expect(() =>
      generer(document({ items: [{ id: "l1", description: "A", quantity: 0, unitPrice: 1, taxRate: 18 }] })),
    ).toThrow(PdfGenerationError);
  });

  it("dit quoi corriger", () => {
    expect(() =>
      generer(document({ items: [{ id: "l1", description: "A", quantity: -1, unitPrice: 1, taxRate: 18 }] })),
    ).toThrow(/corrige-les/);
  });
});
