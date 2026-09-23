import { describe, expect, it } from "vitest";

import { computeDocumentTotals } from "../../domain/invoice";
import { money } from "../../domain/money";
import { parseNumber } from "../../domain/numbering";
import { mockClients, mockInvoices, mockProjects, mockTickets } from "./mockData";

/**
 * Cohérence des données de démonstration.
 *
 * Elles sont la première chose que voit un utilisateur : un total faux ou un
 * client orphelin donne l'impression d'un outil approximatif avant même la
 * première saisie. Ces tests évitent aussi qu'elles dérivent du moteur de
 * calcul au fil des modifications.
 */

const idsClients = new Set(mockClients.map((client) => client.id));

describe("rattachement des documents", () => {
  it("chaque projet désigne un client existant", () => {
    for (const projet of mockProjects) {
      expect(idsClients.has(projet.clientId), `projet ${projet.name}`).toBe(true);
    }
  });

  it("chaque facture désigne un client existant", () => {
    for (const facture of mockInvoices) {
      expect(idsClients.has(facture.clientId), `facture ${facture.number}`).toBe(true);
    }
  });

  it("chaque ticket désigne un client existant", () => {
    for (const ticket of mockTickets) {
      expect(idsClients.has(ticket.clientId), `ticket ${ticket.title}`).toBe(true);
    }
  });
});

describe("numérotation des factures de démonstration", () => {
  it("suit le format maison", () => {
    for (const facture of mockInvoices) {
      expect(parseNumber(facture.number), facture.number).toBeDefined();
    }
  });

  it("ne comporte ni doublon ni trou", () => {
    const sequences = mockInvoices
      .map((facture) => parseNumber(facture.number)?.sequence ?? 0)
      .sort((a, b) => a - b);

    expect(new Set(sequences).size).toBe(sequences.length);
    sequences.forEach((sequence, index) => expect(sequence).toBe(index + 1));
  });

  it("n'emploie plus l'ancien préfixe INV-", () => {
    for (const facture of mockInvoices) {
      expect(facture.number.startsWith("INV-")).toBe(false);
    }
  });
});

describe("montants des factures de démonstration", () => {
  it("correspondent au calcul du domaine, à l'unité près", () => {
    for (const facture of mockInvoices) {
      const totaux = computeDocumentTotals(
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

      expect(totaux.total.amount, `facture ${facture.number}`).toBe(facture.amount);
    }
  });

  it("portent des montants réalistes pour l'activité, en francs CFA", () => {
    // Les données d'origine affichaient 12 500 pour une refonte e-commerce :
    // un ordre de grandeur européen, sans rapport avec la grille tarifaire.
    for (const facture of mockInvoices) {
      expect(facture.amount, `facture ${facture.number}`).toBeGreaterThan(50_000);
    }
  });

  it("les budgets de projet suivent la grille tarifaire du site", () => {
    for (const projet of mockProjects) {
      expect(projet.budget, `projet ${projet.name}`).toBeGreaterThanOrEqual(12_000);
    }
  });
});

describe("coordonnées", () => {
  it("les clients ont des numéros gabonais", () => {
    for (const client of mockClients) {
      expect(client.phone, client.company).toMatch(/^\+241\s/);
    }
  });
});
