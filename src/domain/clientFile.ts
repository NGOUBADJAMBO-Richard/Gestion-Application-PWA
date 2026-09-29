/**
 * Fiche client consolidée.
 *
 * Répondre à « où en est-on avec Akanda Group ? » demandait d'ouvrir quatre
 * écrans et de faire la somme de tête. La fiche rassemble ce qu'un client
 * représente : ce qu'il a rapporté, ce qu'il doit, comment il paie, et ce qui
 * est en cours pour lui.
 *
 * ## Deux indicateurs qui n'existaient nulle part
 *
 * - **Le délai de paiement de ce client.** Le délai moyen de l'agence ne dit
 *   rien d'un client en particulier. Savoir que celui-ci règle à soixante-cinq
 *   jours quand la moyenne est à trente change la façon de négocier son
 *   prochain devis.
 * - **La part qu'il pèse.** Elle est calculée ailleurs pour le portefeuille ;
 *   ici elle est rappelée sur la fiche, parce que c'est en regardant un client
 *   qu'on se demande ce qu'on perdrait à le perdre.
 *
 * Ce module est pur.
 */

import type { IsoDate } from "./date";
import { type ExecutiveDocument, computeCollectionDelay } from "./executive";
import { type CurrencyCode, type Money, money, sum } from "./money";

export interface ClientFinancials {
  readonly currency: CurrencyCode;
  /** Chiffre d'affaires hors taxes, avoirs déduits. */
  readonly revenue: Money;
  /** Total toutes taxes comprises des pièces émises. */
  readonly billed: Money;
  readonly collected: Money;
  /** Reste à encaisser. Négatif en cas de trop-versé. */
  readonly outstanding: Money;
  /** Part de l'encours déjà échue. */
  readonly overdue: Money;
  readonly overdueCount: number;

  readonly invoiceCount: number;
  readonly quoteCount: number;
  readonly creditNoteCount: number;
  /** Devis émis et non transformés, encore dans les délais. */
  readonly openQuotes: number;

  /** Délai d'encaissement observé pour ce client. `null` si rien de soldé. */
  readonly paymentDays: number | null;
  /** Écart au délai accordé. Positif si le client paie en retard. */
  readonly paymentDaysVsTerm: number | null;

  readonly firstDocumentAt: IsoDate | null;
  readonly lastDocumentAt: IsoDate | null;
}

/** Une pièce compte-t-elle au registre ? */
function estEmise(document: ExecutiveDocument): boolean {
  return document.status !== "draft" && document.status !== "cancelled";
}

export interface ClientFileInput {
  readonly clientId: string;
  readonly currency: CurrencyCode;
  readonly today: IsoDate;
  /** Toutes les pièces connues : le filtrage par client est fait ici. */
  readonly documents: readonly ExecutiveDocument[];
  /** Échéance de chaque pièce, indexée par identifiant. */
  readonly dueDates: ReadonlyMap<string, IsoDate>;
  /** Délai de paiement accordé, en jours. */
  readonly paymentTermDays: number;
  /** Numéros de devis déjà transformés en facture. */
  readonly convertedQuoteNumbers: ReadonlySet<string>;
}

export function computeClientFinancials(
  input: ClientFileInput,
): ClientFinancials {
  const { currency, today } = input;

  const siennes = input.documents.filter(
    (document) => document.clientId === input.clientId,
  );
  const emises = siennes.filter(estEmise);

  const comptables = emises.filter((document) => document.kind !== "quote");
  const devis = emises.filter((document) => document.kind === "quote");

  const revenue = sum(
    comptables.map((document) => document.net),
    currency,
  );
  const billed = sum(
    comptables.map((document) => document.total),
    currency,
  );

  const encaisse = comptables.reduce(
    (cumul, document) =>
      cumul +
      document.payments.reduce(
        (total, encaissement) => total + encaissement.amount,
        0,
      ),
    0,
  );

  // Une pièce déclarée réglée l'est, même sans versement détaillé : le statut
  // est une déclaration, les encaissements un journal. Cohérent avec la
  // position de trésorerie du tableau de bord.
  const restants = comptables.filter((document) => {
    if (document.status === "paid") return false;
    const verse = document.payments.reduce(
      (total, encaissement) => total + encaissement.amount,
      0,
    );
    return document.total.amount - verse > 0;
  });

  const resteDe = (document: ExecutiveDocument) =>
    document.total.amount -
    document.payments.reduce((total, encaissement) => total + encaissement.amount, 0);

  const echus = restants.filter((document) => {
    const echeance = input.dueDates.get(document.id);
    return echeance !== undefined && echeance < today;
  });

  const delai = computeCollectionDelay(siennes);

  const dates = emises.map((document) => document.issuedAt).sort();

  return {
    currency,
    revenue,
    billed,
    collected: money(encaisse, currency),
    outstanding: money(
      restants.reduce((cumul, document) => cumul + resteDe(document), 0),
      currency,
    ),
    overdue: money(
      echus.reduce((cumul, document) => cumul + resteDe(document), 0),
      currency,
    ),
    overdueCount: echus.length,

    invoiceCount: comptables.filter((document) => document.kind === "invoice")
      .length,
    quoteCount: devis.length,
    creditNoteCount: comptables.filter(
      (document) => document.kind === "creditNote",
    ).length,
    openQuotes: devis.filter(
      (document) => !input.convertedQuoteNumbers.has(document.number),
    ).length,

    paymentDays: delai.weightedDays,
    paymentDaysVsTerm:
      delai.weightedDays === null
        ? null
        : delai.weightedDays - input.paymentTermDays,

    firstDocumentAt: dates[0] ?? null,
    lastDocumentAt: dates[dates.length - 1] ?? null,
  };
}

/**
 * Appréciation du comportement de paiement.
 *
 * Trois niveaux, pas cinq. Les seuils sont larges : un client qui règle à
 * trente-cinq jours au lieu de trente n'est pas un mauvais payeur, et le
 * classer comme tel ferait ignorer l'étiquette quand elle compte.
 */
export type PaymentBehaviour = "unknown" | "onTime" | "slow" | "late";

export const PAYMENT_BEHAVIOUR_LABELS: Record<PaymentBehaviour, string> = {
  unknown: "Pas encore d'historique",
  onTime: "Règle dans les délais",
  slow: "Règle avec du retard",
  late: "Règle très en retard",
};

export function paymentBehaviour(
  financials: ClientFinancials,
): PaymentBehaviour {
  const ecart = financials.paymentDaysVsTerm;
  if (ecart === null) return "unknown";
  if (ecart <= 7) return "onTime";
  if (ecart <= 30) return "slow";
  return "late";
}
