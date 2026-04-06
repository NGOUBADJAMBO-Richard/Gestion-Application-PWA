import jsPDF from "jspdf";
import { Invoice } from "../data/mockData";

export function generateInvoicePDF(invoice: Invoice) {
  const doc = new jsPDF();

  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // En-tête
  doc.setFontSize(24);
  doc.setTextColor(0, 74, 173); // Couleur bleu du thème
  doc.text("FACTURE", margin, yPosition);

  yPosition += 12;

  // Numéro de facture
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Numéro: ${invoice.number}`, margin, yPosition);

  yPosition += 7;

  // Informations dates
  doc.setFontSize(10);
  doc.text(
    `Date: ${new Date(invoice.date).toLocaleDateString("fr-FR")}`,
    margin,
    yPosition,
  );

  yPosition += 5;

  doc.text(
    `Échéance: ${new Date(invoice.dueDate).toLocaleDateString("fr-FR")}`,
    margin,
    yPosition,
  );

  yPosition += 12;

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

  yPosition += 12;

  // Tableau des articles (simplifié)
  const tableStartY = yPosition;

  // En-têtes du tableau
  doc.setFont("Helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableStartY, contentWidth, 8, "F");

  doc.setTextColor(0, 0, 0);
  doc.text("Description", margin + 2, tableStartY + 6);
  doc.text("Montant", pageWidth - margin - 40, tableStartY + 6);

  yPosition = tableStartY + 10;

  // Ligne d'article
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Montant total", margin + 2, yPosition);
  doc.setFont("Helvetica", "bold");
  doc.text(
    `${(invoice.amount / 1000).toFixed(3)} KCFA`,
    pageWidth - margin - 40,
    yPosition,
  );

  yPosition += 8;

  // Séparateur
  doc.setDrawColor(0, 74, 173);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 8;

  // Total
  doc.setFontSize(12);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(0, 74, 173);
  doc.text("MONTANT TOTAL", margin, yPosition);
  doc.text(
    `${(invoice.amount / 1000).toFixed(3)} KCFA`,
    pageWidth - margin - 40,
    yPosition,
  );

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
