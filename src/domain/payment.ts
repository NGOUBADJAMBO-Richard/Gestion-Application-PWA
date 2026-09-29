import type { IsoDate } from "./date";

/**
 * Encaissements.
 *
 * Une facture n'est pas payée ou impayée : elle peut être réglée en plusieurs
 * fois, et c'est le cas courant — acompte à la commande, solde à la livraison.
 * Sans suivi des encaissements partiels, il n'y a que deux issues : marquer la
 * facture payée alors qu'il reste un solde, ou la laisser impayée alors
 * qu'une partie est rentrée. Les deux faussent la trésorerie.
 */

export type PaymentMethod =
  | "bank-transfer"
  | "mobile-money"
  | "cash"
  | "card"
  | "check";

export interface Payment {
  readonly id: string;
  readonly date: IsoDate;
  /** Montant encaissé, en unité mineure. Toujours positif. */
  readonly amount: number;
  readonly method: PaymentMethod;
  readonly reference?: string | undefined;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  "bank-transfer": "Virement",
  "mobile-money": "Mobile Money",
  cash: "Espèces",
  card: "Carte",
  check: "Chèque",
};

export type SettlementState = "unpaid" | "partial" | "settled" | "overpaid";

export interface Settlement {
  readonly total: number;
  readonly paid: number;
  /** Ce qui reste à encaisser. Négatif en cas de trop-perçu. */
  readonly balance: number;
  readonly state: SettlementState;
  /** Part réglée, entre 0 et 1. Utile pour une barre de progression. */
  readonly ratio: number;
}

/** Somme des encaissements. */
export function totalPaid(payments: readonly Payment[]): number {
  return payments.reduce((cumul, encaissement) => cumul + encaissement.amount, 0);
}

/**
 * État de règlement d'un document.
 *
 * Le trop-perçu est signalé plutôt qu'absorbé : encaisser plus que le montant
 * dû est soit une erreur de saisie, soit un avoir à établir. Dans les deux cas
 * il faut le voir.
 */
export function computeSettlement(
  total: number,
  payments: readonly Payment[],
): Settlement {
  const paid = totalPaid(payments);
  const balance = total - paid;

  const state: SettlementState =
    paid === 0
      ? "unpaid"
      : balance > 0
        ? "partial"
        : balance === 0
          ? "settled"
          : "overpaid";

  return {
    total,
    paid,
    balance,
    state,
    ratio: total === 0 ? 0 : Math.min(1, Math.max(0, paid / total)),
  };
}

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

/**
 * Contrôle d'un encaissement avant enregistrement.
 *
 * Un encaissement nul ou négatif n'est pas un encaissement : pour rendre de
 * l'argent, on établit un avoir. La distinction n'est pas de la pédanterie,
 * c'est ce qui rend le journal des encaissements lisible.
 */
export function validatePayment(
  amount: number,
  date: IsoDate,
  documentDate: IsoDate,
): void {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new PaymentError("Le montant encaissé doit être un nombre entier.");
  }
  if (amount <= 0) {
    throw new PaymentError(
      "Un encaissement est strictement positif. Pour rembourser, établis un avoir.",
    );
  }
  if (date < documentDate) {
    throw new PaymentError(
      "L’encaissement est daté avant le document lui-même. Vérifie la date.",
    );
  }
}
