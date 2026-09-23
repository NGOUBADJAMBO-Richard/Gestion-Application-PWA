import {
  type CurrencyCode,
  type Money,
  applyDiscount,
  distribute,
  money,
  multiply,
  percentOf,
  subtract,
  sum,
  zero,
} from "./money";

/**
 * Calcul des totaux d'un document commercial (devis, facture, avoir).
 *
 * L'algorithme précédent, dans Invoicing.tsx, arrondissait trois fois de façon
 * indépendante : `Math.round(sousTotal)`, `Math.round(tva)` et
 * `Math.round(sousTotal + tva)`. Résultat : le pied de facture ne se
 * recomposait pas. Exemple réel trouvé par balayage — 3,5 x 1 XAF à 18 % :
 * sous-total 4, TVA 1, mais total affiché 4. Le client qui additionne la
 * colonne trouve 5.
 *
 * Ordre de calcul retenu, et il n'est pas interchangeable :
 *
 *   1. ligne : brut = quantité x prix unitaire, arrondi à la ligne ;
 *   2. ligne : remise appliquée à la ligne, arrondie à la ligne ;
 *   3. regroupement des bases HT par taux de TVA ;
 *   4. TVA calculée **une seule fois par taux**, sur la base remisée ;
 *   5. TTC = HT + TVA, par construction — jamais réarrondi.
 *
 * Inverser 2 et 3 — remise globale puis ventilation — donne un autre total.
 */

export type LineId = string;

export interface DocumentLine {
  readonly id: LineId;
  /** Référence au catalogue du site, pour tracer d'où vient le tarif. */
  readonly catalogueRef?: string;
  readonly label: string;
  /** Strictement positive. Les décimales sont admises (demi-journées). */
  readonly quantity: number;
  readonly unitPrice: Money;
  /** 0 à 100. */
  readonly discountPercent: number;
  /** Paramétrable. Aucun taux n'est codé en dur dans ce module. */
  readonly vatRatePercent: number;
}

export interface LineTotals {
  readonly lineId: LineId;
  /** Quantité x prix unitaire, avant remise. */
  readonly gross: Money;
  readonly discount: Money;
  /** Base HT de la ligne, après remise. */
  readonly net: Money;
  readonly vatRatePercent: number;
  /**
   * Part de TVA imputée à cette ligne. Obtenue par ventilation du total de TVA
   * du taux concerné, et non par un calcul ligne à ligne : la colonne affichée
   * doit se resommer exactement au pied de facture.
   */
  readonly vat: Money;
  /** net + vat. */
  readonly total: Money;
}

export interface VatBracket {
  readonly ratePercent: number;
  /** Base HT soumise à ce taux, après remise. */
  readonly base: Money;
  readonly vat: Money;
}

export interface DocumentTotals {
  readonly currency: CurrencyCode;
  readonly lines: readonly LineTotals[];
  readonly grossSubtotal: Money;
  readonly totalDiscount: Money;
  /** Total hors taxes, après remise. */
  readonly subtotal: Money;
  readonly vatBrackets: readonly VatBracket[];
  readonly totalVat: Money;
  /** Toutes taxes comprises. Égal à subtotal + totalVat, sans exception. */
  readonly total: Money;
}

export class InvalidLineError extends Error {
  constructor(
    readonly lineId: LineId,
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "InvalidLineError";
  }
}

function validateLine(line: DocumentLine, currency: CurrencyCode): void {
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
    throw new InvalidLineError(
      line.id,
      "quantity",
      `Quantité invalide sur « ${line.label} » : ${line.quantity}. Attendu un nombre strictement positif.`,
    );
  }
  if (line.discountPercent < 0 || line.discountPercent > 100) {
    throw new InvalidLineError(
      line.id,
      "discountPercent",
      `Remise hors bornes sur « ${line.label} » : ${line.discountPercent} %. Attendu entre 0 et 100.`,
    );
  }
  if (!Number.isFinite(line.vatRatePercent) || line.vatRatePercent < 0) {
    throw new InvalidLineError(
      line.id,
      "vatRatePercent",
      `Taux de TVA invalide sur « ${line.label} » : ${line.vatRatePercent}. Attendu un nombre positif ou nul.`,
    );
  }
  if (line.unitPrice.currency !== currency) {
    throw new InvalidLineError(
      line.id,
      "unitPrice",
      `La ligne « ${line.label} » est en ${line.unitPrice.currency} alors que le document est en ${currency}.`,
    );
  }
}

/**
 * Calcule les totaux d'un document.
 *
 * `currency` est explicite et ne se déduit pas des lignes : un document sans
 * ligne a quand même une devise, et une ligne dans la mauvaise devise doit
 * être signalée, pas absorbée.
 */
export function computeDocumentTotals(
  lines: readonly DocumentLine[],
  currency: CurrencyCode,
): DocumentTotals {
  for (const line of lines) validateLine(line, currency);

  // 1 et 2 — brut puis remise, arrondis à la ligne.
  const staged = lines.map((line) => {
    const gross = multiply(line.unitPrice, line.quantity);
    const net = applyDiscount(gross, line.discountPercent);
    return { line, gross, net, discount: subtract(gross, net) };
  });

  const grossSubtotal = sum(
    staged.map((entry) => entry.gross),
    currency,
  );
  const totalDiscount = sum(
    staged.map((entry) => entry.discount),
    currency,
  );
  const subtotal = sum(
    staged.map((entry) => entry.net),
    currency,
  );

  // 3 — regroupement par taux. L'ordre de première apparition est conservé :
  // un pied de facture doit être stable d'un rendu à l'autre.
  const rates: number[] = [];
  for (const entry of staged) {
    if (!rates.includes(entry.line.vatRatePercent)) {
      rates.push(entry.line.vatRatePercent);
    }
  }

  // 4 — une seule TVA par taux, calculée sur la base remisée.
  const vatBrackets: VatBracket[] = rates.map((ratePercent) => {
    const base = sum(
      staged
        .filter((entry) => entry.line.vatRatePercent === ratePercent)
        .map((entry) => entry.net),
      currency,
    );
    return { ratePercent, base, vat: percentOf(base, ratePercent) };
  });

  // Ventilation de chaque TVA de tranche sur ses lignes, au prorata de la base.
  const vatByLine = new Map<LineId, Money>();
  for (const bracket of vatBrackets) {
    const members = staged.filter(
      (entry) => entry.line.vatRatePercent === bracket.ratePercent,
    );
    const shares = distribute(
      bracket.vat,
      // Valeur absolue : sur un avoir les bases sont négatives, mais un poids
      // exprime une proportion. Le signe est porté par le montant réparti.
      members.map((entry) => Math.abs(entry.net.amount)),
    );
    members.forEach((entry, index) => {
      vatByLine.set(entry.line.id, shares[index] ?? zero(currency));
    });
  }

  const totalsByLine: LineTotals[] = staged.map((entry) => {
    const vat = vatByLine.get(entry.line.id) ?? zero(currency);
    return {
      lineId: entry.line.id,
      gross: entry.gross,
      discount: entry.discount,
      net: entry.net,
      vatRatePercent: entry.line.vatRatePercent,
      vat,
      total: { amount: entry.net.amount + vat.amount, currency },
    };
  });

  const totalVat = sum(
    vatBrackets.map((bracket) => bracket.vat),
    currency,
  );

  // 5 — TTC par construction. Aucun arrondi supplémentaire n'est possible ici,
  // donc l'égalité HT + TVA = TTC ne peut pas être fausse.
  const total = money(subtotal.amount + totalVat.amount, currency);

  return {
    currency,
    lines: totalsByLine,
    grossSubtotal,
    totalDiscount,
    subtotal,
    vatBrackets,
    totalVat,
    total,
  };
}

/** Reste dû : TTC moins les encaissements déjà reçus. */
export function computeBalanceDue(
  total: Money,
  payments: readonly Money[],
): Money {
  return subtract(total, sum(payments, total.currency));
}
