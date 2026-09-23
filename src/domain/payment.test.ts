import { describe, expect, it } from "vitest";

import {
  type Payment,
  PaymentError,
  computeSettlement,
  totalPaid,
  validatePayment,
} from "./payment";

function encaissement(amount: number, date = "2026-03-10"): Payment {
  return { id: `p-${amount}-${date}`, date, amount, method: "mobile-money" };
}

describe("état de règlement", () => {
  it("une facture sans encaissement est impayée", () => {
    const r = computeSettlement(450000, []);
    expect(r.state).toBe("unpaid");
    expect(r.balance).toBe(450000);
    expect(r.ratio).toBe(0);
  });

  it("un acompte laisse la facture partiellement réglée", () => {
    // Le cas courant : acompte à la commande, solde à la livraison. Sans cet
    // état, il faut choisir entre « payée » à tort et « impayée » à tort.
    const r = computeSettlement(450000, [encaissement(135000)]);
    expect(r.state).toBe("partial");
    expect(r.paid).toBe(135000);
    expect(r.balance).toBe(315000);
    expect(r.ratio).toBeCloseTo(0.3, 5);
  });

  it("cumule plusieurs encaissements", () => {
    const r = computeSettlement(450000, [
      encaissement(135000),
      encaissement(200000, "2026-04-02"),
    ]);
    expect(r.paid).toBe(335000);
    expect(r.balance).toBe(115000);
  });

  it("le solde exact rend la facture soldée", () => {
    const r = computeSettlement(450000, [
      encaissement(135000),
      encaissement(315000, "2026-04-02"),
    ]);
    expect(r.state).toBe("settled");
    expect(r.balance).toBe(0);
    expect(r.ratio).toBe(1);
  });

  it("signale un trop-perçu au lieu de l’absorber", () => {
    // Encaisser plus que le dû est soit une erreur de saisie, soit un avoir à
    // établir. Dans les deux cas il faut le voir.
    const r = computeSettlement(450000, [encaissement(500000)]);
    expect(r.state).toBe("overpaid");
    expect(r.balance).toBe(-50000);
    expect(r.ratio).toBe(1);
  });

  it("ne divise pas par zéro sur un document à montant nul", () => {
    expect(computeSettlement(0, []).ratio).toBe(0);
  });

  it("somme correctement une liste vide", () => {
    expect(totalPaid([])).toBe(0);
  });
});

describe("contrôle d’un encaissement", () => {
  it("accepte un encaissement normal", () => {
    expect(() =>
      validatePayment(135000, "2026-03-10", "2026-03-01"),
    ).not.toThrow();
  });

  it("accepte un encaissement le jour même du document", () => {
    expect(() =>
      validatePayment(135000, "2026-03-01", "2026-03-01"),
    ).not.toThrow();
  });

  it("refuse un montant nul ou négatif, et renvoie vers l’avoir", () => {
    expect(() => validatePayment(0, "2026-03-10", "2026-03-01")).toThrow(
      PaymentError,
    );
    expect(() => validatePayment(-5000, "2026-03-10", "2026-03-01")).toThrow(
      /avoir/i,
    );
  });

  it("refuse un montant à virgule", () => {
    expect(() => validatePayment(1250.5, "2026-03-10", "2026-03-01")).toThrow(
      PaymentError,
    );
  });

  it("refuse un encaissement antérieur au document", () => {
    expect(() => validatePayment(135000, "2026-02-20", "2026-03-01")).toThrow(
      /avant le document/i,
    );
  });
});
