import type { CurrencyCode } from "../../domain/money";
import { money } from "../../domain/money";
import { computeDocumentTotals, type DocumentTotals } from "../../domain/invoice";
import { totalPaid } from "../../domain/payment";
import type { ExecutiveDocument } from "../../domain/executive";
import type { RevenueDocument } from "../../domain/profitability";
import type { Invoice, InvoiceItem } from "./entities";

/**
 * Passage du document stocké au document calculé.
 *
 * `Invoice` est la forme de stockage : des lignes saisies, un montant figé. Le
 * domaine, lui, ne raisonne que sur des totaux recalculés. Cette conversion
 * était écrite deux fois — dans l'écran de facturation et dans le générateur
 * PDF — avec le risque qu'une évolution n'en corrige qu'une. Elle vit ici.
 */

/**
 * Totaux d'un document, ou `null` si ses lignes sont inexploitables.
 *
 * On ne renvoie pas des zéros en cas d'échec : un total à zéro se confond avec
 * un document réellement vide, et l'appelant doit pouvoir distinguer les deux.
 */
export function documentTotals(
  items: readonly InvoiceItem[],
  currency: CurrencyCode,
): DocumentTotals | null {
  try {
    return computeDocumentTotals(
      items.map((item) => ({
        id: item.id,
        label: item.description,
        quantity: Number(item.quantity) || 0,
        // Le prix saisi est déjà en unité mineure ; l'arrondi ne rattrape
        // qu'une saisie décimale accidentelle.
        unitPrice: money(Math.round(Number(item.unitPrice) || 0), currency),
        discountPercent: 0,
        vatRatePercent: Number(item.taxRate) || 0,
      })),
      currency,
    );
  } catch {
    return null;
  }
}

/** Sous-total, TVA et total en unité mineure, zéro si le document est illisible. */
export function documentAmounts(
  items: readonly InvoiceItem[],
  currency: CurrencyCode,
): { subtotal: number; taxAmount: number; total: number } {
  const totaux = documentTotals(items, currency);
  if (totaux === null) return { subtotal: 0, taxAmount: 0, total: 0 };
  return {
    subtotal: totaux.subtotal.amount,
    taxAmount: totaux.totalVat.amount,
    total: totaux.total.amount,
  };
}

/**
 * Réduit les documents commerciaux à leur portée financière, pour l'analyse
 * de rentabilité.
 *
 * Les montants sont **recalculés depuis les lignes**, jamais relus dans le
 * champ `amount` : ce champ a été écrit par une version antérieure du calcul,
 * et un total figé faux contaminerait toute la marge. Les lignes, elles, sont
 * la saisie d'origine.
 *
 * Un document dont les lignes sont inexploitables est écarté plutôt que compté
 * à zéro — une facture qui disparaît d'une analyse se remarque, une facture
 * comptée pour rien ne se remarque pas.
 */
export function toRevenueDocuments(
  invoices: readonly Invoice[],
  currency: CurrencyCode,
): readonly RevenueDocument[] {
  const documents: RevenueDocument[] = [];

  for (const invoice of invoices) {
    const totaux = documentTotals(invoice.items, currency);
    if (totaux === null) continue;

    documents.push({
      id: invoice.id,
      number: invoice.number,
      kind: invoice.kind,
      status: invoice.status,
      projectId: invoice.projectId,
      net: totaux.subtotal,
      total: totaux.total,
      collected: money(totalPaid(invoice.payments ?? []), currency),
    });
  }

  return documents;
}

/**
 * Réduit les documents à la forme attendue par les indicateurs de direction.
 *
 * Même principe que `toRevenueDocuments`, avec en plus la date d'émission, les
 * encaissements datés et le devis d'origine — ce qu'il faut pour mesurer un
 * délai d'encaissement et un taux de transformation.
 *
 * Cette conversion était écrite dans le tableau de bord ; elle sert aussi à
 * l'écran Clients, et deux copies auraient fini par diverger sur ce qui compte
 * comme recette.
 */
export function toExecutiveDocuments(
  invoices: readonly Invoice[],
  currency: CurrencyCode,
): readonly ExecutiveDocument[] {
  const documents: ExecutiveDocument[] = [];

  for (const invoice of invoices) {
    const totaux = documentTotals(invoice.items, currency);
    if (totaux === null) continue;

    documents.push({
      id: invoice.id,
      number: invoice.number,
      kind: invoice.kind,
      status: invoice.status,
      clientId: invoice.clientId,
      issuedAt: invoice.date,
      net: totaux.subtotal,
      total: totaux.total,
      payments: (invoice.payments ?? []).map((encaissement) => ({
        date: encaissement.date,
        amount: encaissement.amount,
      })),
      convertedFrom: invoice.convertedFrom,
    });
  }

  return documents;
}
