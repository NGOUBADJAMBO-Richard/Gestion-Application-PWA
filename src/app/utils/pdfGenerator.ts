import jsPDF from "jspdf";
import { Invoice } from "../data/mockData";
import { formatCurrencyXAF } from "./currency";

function formatCurrencyForPdf(amount: number): string {
  return formatCurrencyXAF(amount).replace(/\u202F|\u00A0/g, " ");
}

export function generateInvoicePDF(invoice: Invoice) {
  const doc = new jsPDF();

  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxAmount = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100),
    0,
  );
  const total = Math.round(subtotal + taxAmount);
  let yPosition = margin;

  const formatPaymentMethod = (paymentMethod: Invoice["paymentMethod"]) => {
    switch (paymentMethod) {
      case "bank-transfer":
        return "Virement bancaire";
      case "mobile-money":
        return "Mobile Money";
      case "card":
        return "Carte";
      default:
        return "Espèces";
    }
  };

  const drawCard = (x: number, y: number, width: number, height: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, width, height, 3, 3, "FD");
  };
  // En-tête
  doc.setFontSize(24);
  doc.setTextColor(0, 74, 173); // Couleur bleu du thème
  doc.text("FACTURE", margin, yPosition);

  yPosition += 12;

  // Numéro de facture
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Numéro: ${invoice.number}`, margin, yPosition);
  doc.text("M.G.N CodeWave", pageWidth - margin, yPosition, { align: "right" });

  yPosition += 4;

  doc.setFontSize(10);
  doc.text(
    `Date: ${new Date(invoice.date).toLocaleDateString("fr-FR")}`,
    margin,
    yPosition,
  );

  doc.text(
    `Échéance: ${new Date(invoice.dueDate).toLocaleDateString("fr-FR")}`,
    margin,
    yPosition + 5,
  );

  doc.text(
    `Statut: ${invoice.status.toUpperCase()}`,
    pageWidth - margin,
    yPosition + 5,
    {
      align: "right",
    },
  );

  yPosition += 14;

  const leftCardX = margin;
  const rightCardX = pageWidth / 2 + 2;
  const cardWidth = (contentWidth - 4) / 2;
  const cardTop = yPosition;
  const cardHeight = 24;

  drawCard(leftCardX, cardTop, cardWidth, cardHeight);
  drawCard(rightCardX, cardTop, cardWidth, cardHeight);

  doc.setFontSize(11);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Détails client", leftCardX + 4, cardTop + 7);
  doc.text("Paiement", rightCardX + 4, cardTop + 7);

  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(invoice.client, leftCardX + 4, cardTop + 14);
  doc.text("Adresse de facturation: N/A", leftCardX + 4, cardTop + 20);

  doc.text(
    `Mode: ${formatPaymentMethod(invoice.paymentMethod)}`,
    rightCardX + 4,
    cardTop + 14,
  );
  doc.text(`Conditions: ${invoice.paymentTerms}`, rightCardX + 4, cardTop + 20);

  yPosition = cardTop + cardHeight + 10;

  // Séparateur
  doc.setDrawColor(0, 74, 173);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 8;

  // Informations client
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("Helvetica", "bold");
  doc.text("Client:", margin, yPosition);

  yPosition += 5;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(invoice.client, margin, yPosition);

  yPosition += 5;
  doc.setTextColor(100, 100, 100);
  doc.text("Adresse de facturation: N/A", margin, yPosition);

  yPosition += 12;

  // Tableau des articles
  const tableStartY = yPosition;
  const descriptionX = margin + 2;
  const quantityX = 112;
  const unitPriceRightX = 162;
  const totalRightX = pageWidth - margin;
  const descriptionWidth = 92;
  const rowFontSize = 9;

  // En-têtes du tableau
  doc.setFont("Helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableStartY, contentWidth, 8, "F");

  doc.setTextColor(0, 0, 0);
  doc.text("Description", descriptionX, tableStartY + 6);
  doc.text("Qté", quantityX, tableStartY + 6);
  doc.text("PU HT", unitPriceRightX - 18, tableStartY + 6);
  doc.text("Total HT", totalRightX - 20, tableStartY + 6);

  yPosition = tableStartY + 10;

  // Lignes d'articles
  invoice.items.forEach((item) => {
    if (yPosition > pageHeight - 65) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(rowFontSize);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const wrappedDescription = doc.splitTextToSize(
      item.description,
      descriptionWidth,
    );
    doc.text(wrappedDescription, descriptionX, yPosition);
    doc.text(String(item.quantity), quantityX, yPosition);
    doc.text(formatCurrencyForPdf(item.unitPrice), unitPriceRightX, yPosition, {
      align: "right",
    });
    doc.setFont("Helvetica", "bold");
    doc.text(
      formatCurrencyForPdf(Math.round(item.quantity * item.unitPrice)),
      totalRightX,
      yPosition,
      { align: "right" },
    );

    yPosition += Math.max(8, wrappedDescription.length * 4 + 2);
  });

  // Séparateur
  doc.setDrawColor(0, 74, 173);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 8;

  // Récapitulatif
  const recapX = pageWidth - margin - 78;
  const recapY = yPosition;
  const recapWidth = 78;
  const recapHeight = 31;

  drawCard(recapX, recapY, recapWidth, recapHeight);

  doc.setFontSize(9);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Sous-total HT", recapX + 4, recapY + 8);
  doc.text(
    formatCurrencyForPdf(Math.round(subtotal)),
    recapX + recapWidth - 4,
    recapY + 8,
    {
      align: "right",
    },
  );

  doc.setFont("Helvetica", "normal");
  doc.text("TVA", recapX + 4, recapY + 14);
  doc.text(
    formatCurrencyForPdf(Math.round(taxAmount)),
    recapX + recapWidth - 4,
    recapY + 14,
    {
      align: "right",
    },
  );

  doc.setDrawColor(0, 74, 173);
  doc.line(recapX + 4, recapY + 18, recapX + recapWidth - 4, recapY + 18);

  doc.setFontSize(12);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(0, 74, 173);
  doc.text("TOTAL TTC", recapX + 4, recapY + 26);
  doc.text(formatCurrencyForPdf(total), recapX + recapWidth - 4, recapY + 26, {
    align: "right",
  });

  yPosition = recapY + recapHeight + 8;

  // Ligne de total moderne
  doc.setFillColor(0, 74, 173);
  doc.roundedRect(margin, yPosition, contentWidth, 14, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("Helvetica", "bold");
  doc.text("Montant total TTC", margin + 4, yPosition + 9);
  doc.text(formatCurrencyForPdf(total), pageWidth - margin - 4, yPosition + 9, {
    align: "right",
  });

  yPosition += 20;

  // Synthèse
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Sous-total HT", margin + 90, yPosition);
  doc.text(formatCurrencyForPdf(Math.round(subtotal)), totalRightX, yPosition, {
    align: "right",
  });

  yPosition += 6;
  doc.text("TVA", margin + 90, yPosition);
  doc.text(
    formatCurrencyForPdf(Math.round(taxAmount)),
    totalRightX,
    yPosition,
    {
      align: "right",
    },
  );

  yPosition += 8;

  // Total
  doc.setFontSize(12);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(0, 74, 173);
  doc.text("MONTANT TOTAL TTC", margin + 90, yPosition);
  doc.text(formatCurrencyForPdf(total), totalRightX, yPosition, {
    align: "right",
  });

  yPosition += 10;

  // Statut
  doc.setFontSize(10);
  doc.setFont("Helvetica", "bold");
  const statusText =
    invoice.status === "paid"
      ? "PAYÉE"
      : invoice.status === "pending"
        ? "EN ATTENTE"
        : "EN RETARD";
  const statusColorArray =
    invoice.status === "paid"
      ? [34, 197, 94]
      : invoice.status === "pending"
        ? [202, 138, 4]
        : [239, 68, 68];

  doc.setTextColor(
    statusColorArray[0],
    statusColorArray[1],
    statusColorArray[2],
  );
  doc.text(statusText, margin, yPosition);

  yPosition += 7;
  doc.setTextColor(80, 80, 80);
  doc.setFont("Helvetica", "normal");
  doc.text(
    `Mode de paiement: ${formatPaymentMethod(invoice.paymentMethod)}`,
    margin,
    yPosition,
  );

  yPosition += 6;
  doc.text(`Conditions: ${invoice.paymentTerms}`, margin, yPosition);

  if (invoice.notes) {
    yPosition += 6;
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Notes: ${invoice.notes}`, margin, yPosition);
  }

  yPosition = pageHeight - 30;

  // Pied de page
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("Conçu par M.G.N CodeWave", margin, yPosition);

  yPosition += 5;

  doc.text(
    `Généré le: ${new Date().toLocaleDateString("fr-FR")}`,
    margin,
    yPosition,
  );

  // Télécharger le PDF
  doc.save(`${invoice.number}.pdf`);
}
