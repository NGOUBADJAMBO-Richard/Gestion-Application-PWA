import jsPDF from "jspdf";

import type { CompanyProfile } from "../../domain/companyProfile";
import { addDays } from "../../domain/date";
import type { DocumentTotals } from "../../domain/invoice";
import { formatMoney, money } from "../../domain/money";
import { computeSettlement } from "../../domain/payment";
import { documentTotals } from "../data/documentTotals";
import type { Invoice } from "../data/mockData";

/**
 * Génération des documents commerciaux en PDF.
 *
 * ## Pourquoi une réécriture
 *
 * Le générateur précédent calculait ses totaux lui-même, en virgule flottante,
 * et arrondissait séparément le sous-total, la TVA, puis leur somme. Le PDF
 * pouvait donc afficher un total différent de l'écran — sur le seul document
 * qui parte chez le client. Il imprimait aussi trois fois les mêmes totaux,
 * deux fois le bloc client, « Adresse de facturation: N/A » en toutes lettres,
 * « M.G.N CodeWave » en dur, et le titre « FACTURE » sur un devis.
 *
 * Ici les totaux viennent de `computeDocumentTotals`, comme partout ailleurs :
 * le PDF ne peut pas diverger de ce qui est affiché.
 *
 * ## Trois natures, un seul document
 *
 * Devis, facture et avoir partagent la mise en page et ne diffèrent que par
 * leur portée : le devis porte une validité et un cadre d'acceptation, la
 * facture un échéancier de règlement, l'avoir la référence de la pièce qu'il
 * annule. En faire trois générateurs garantirait qu'ils divergent.
 */

/** Marges et repères, en millimètres. Format A4 : 210 × 297. */
const MARGE = 16;
const LARGEUR = 210;
const HAUTEUR = 297;
const CONTENU = LARGEUR - 2 * MARGE;

/** Couleurs de la charte, en composantes RVB. */
const BLEU: readonly [number, number, number] = [0, 74, 173];
const ENCRE: readonly [number, number, number] = [15, 23, 42];
const GRIS: readonly [number, number, number] = [100, 116, 139];
const TRAIT: readonly [number, number, number] = [203, 213, 225];

const NATURES = {
  quote: {
    titre: "DEVIS",
    dateLabel: "Date d'émission",
    echeanceLabel: "Valable jusqu'au",
  },
  invoice: {
    titre: "FACTURE",
    dateLabel: "Date d'émission",
    echeanceLabel: "Échéance de règlement",
  },
  creditNote: {
    titre: "AVOIR",
    dateLabel: "Date d'émission",
    echeanceLabel: "Date de valeur",
  },
} as const;

const MOYENS_PAIEMENT: Record<Invoice["paymentMethod"], string> = {
  "bank-transfer": "Virement bancaire",
  "mobile-money": "Mobile Money",
  card: "Carte bancaire",
  cash: "Espèces",
};

function dateFr(valeur: string): string {
  if (valeur.length === 0) return "—";
  const date = new Date(`${valeur}T00:00:00`);
  if (Number.isNaN(date.getTime())) return valeur;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Espaces fines et insécables produites par `Intl`.
 *
 * Nommées par leur point de code plutôt qu'écrites telles quelles : dans le
 * source elles sont invisibles, et un reformatage automatique les remplace
 * par des espaces ordinaires — ce qui désactive la substitution sans que rien
 * ne le signale.
 */
const ESPACES_FINES = new RegExp(
  `[${String.fromCharCode(0x202f, 0x00a0, 0x2009)}]`,
  "g",
);

/**
 * Montant prêt pour le PDF.
 *
 * Les polices de base de jsPDF ne contiennent pas les espaces fines : sans
 * cette substitution, un montant s'imprime avec des losanges à la place des
 * séparateurs de milliers.
 */
function montantPdf(valeur: number, profile: CompanyProfile): string {
  return formatMoney(money(valeur, profile.currency)).replace(
    ESPACES_FINES,
    " ",
  );
}

export interface DocumentPdfInput {
  readonly invoice: Invoice;
  readonly clientName: string;
  /** Lignes d'adresse du client, si elles sont connues. */
  readonly clientLines?: readonly string[];
  readonly profile: CompanyProfile;
}

export class PdfGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfGenerationError";
  }
}

/**
 * Dessine le document sur une page déjà ouverte.
 *
 * Séparé de la construction pour être vérifiable : jsPDF pose ses méthodes
 * sur l'instance et non sur le prototype, donc la seule façon d'observer ce
 * qui est réellement imprimé est de fournir soi-même le document. Et sur la
 * seule pièce qui parte chez le client, « ce que le code voulait écrire » ne
 * suffit pas : il faut vérifier ce qu'il écrit.
 */
export function drawDocument(doc: jsPDF, input: DocumentPdfInput): void {
  const { invoice, clientName, profile } = input;

  const totaux = documentTotals(invoice.items, profile.currency);
  if (totaux === null) {
    throw new PdfGenerationError(
      "Les lignes de ce document sont inexploitables : corrige-les avant de générer le PDF.",
    );
  }

  const nature = NATURES[invoice.kind];
  let y = MARGE;

  y = dessinerEnTete(doc, profile, invoice, nature, y);
  y = dessinerParties(
    doc,
    profile,
    invoice,
    clientName,
    input.clientLines,
    nature,
    y,
  );
  y = dessinerLignes(doc, invoice, totaux, profile, y);
  y = dessinerTotaux(doc, invoice, totaux, profile, y);
  y = dessinerReglement(doc, invoice, profile, y);
  dessinerSignature(doc, invoice, profile, y);
  dessinerPieds(doc, profile);
}

/** Construit le document sans l'enregistrer. */
export function buildDocumentPdf(input: DocumentPdfInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawDocument(doc, input);
  return doc;
}

/** Construit le document et le propose au téléchargement. */
export function generateDocumentPDF(input: DocumentPdfInput): void {
  const doc = buildDocumentPdf(input);
  const nature = NATURES[input.invoice.kind];
  const nom =
    input.invoice.number.length > 0
      ? input.invoice.number
      : `${nature.titre}-brouillon`;
  doc.save(`${nom}.pdf`);
}


function texte(
  doc: jsPDF,
  contenu: string,
  x: number,
  y: number,
  options: {
    taille?: number;
    gras?: boolean;
    couleur?: readonly [number, number, number];
    align?: "left" | "right" | "center";
  } = {},
): void {
  doc.setFontSize(options.taille ?? 9);
  doc.setFont("Helvetica", options.gras === true ? "bold" : "normal");
  const couleur = options.couleur ?? ENCRE;
  doc.setTextColor(couleur[0], couleur[1], couleur[2]);
  doc.text(contenu, x, y, { align: options.align ?? "left" });
}

function dessinerEnTete(
  doc: jsPDF,
  profile: CompanyProfile,
  invoice: Invoice,
  nature: (typeof NATURES)[keyof typeof NATURES],
  depart: number,
): number {
  // Bandeau de marque : trois millimètres de bleu, comme la bordure haute des
  // cartes de l'interface.
  doc.setFillColor(BLEU[0], BLEU[1], BLEU[2]);
  doc.rect(0, 0, LARGEUR, 3, "F");

  let y = depart + 4;

  // Émetteur, à gauche.
  const enteteEmetteur = y;
  texte(doc, profile.name, MARGE, y, { taille: 14, gras: true, couleur: BLEU });
  y += 5;
  if (profile.legalForm !== undefined && profile.legalForm.length > 0) {
    texte(doc, profile.legalForm, MARGE, y, { taille: 8, couleur: GRIS });
    y += 4;
  }
  for (const ligne of profile.addressLines) {
    texte(doc, ligne, MARGE, y, { taille: 8, couleur: GRIS });
    y += 4;
  }
  texte(doc, `${profile.city}, ${profile.country}`, MARGE, y, {
    taille: 8,
    couleur: GRIS,
  });
  y += 4;

  const contacts = [profile.phone, profile.email].filter(
    (valeur): valeur is string => valeur !== undefined && valeur.length > 0,
  );
  if (contacts.length > 0) {
    texte(doc, contacts.join(" · "), MARGE, y, { taille: 8, couleur: GRIS });
    y += 4;
  }

  const identifiants = [
    profile.taxId !== undefined && profile.taxId.length > 0
      ? `NIF ${profile.taxId}`
      : null,
    profile.tradeRegister !== undefined && profile.tradeRegister.length > 0
      ? `RCCM ${profile.tradeRegister}`
      : null,
  ].filter((valeur): valeur is string => valeur !== null);
  if (identifiants.length > 0) {
    texte(doc, identifiants.join(" · "), MARGE, y, { taille: 8, couleur: GRIS });
    y += 4;
  }

  // Nature et repères, à droite.
  const droite = LARGEUR - MARGE;
  let yDroite = enteteEmetteur;
  texte(doc, nature.titre, droite, yDroite, {
    taille: 22,
    gras: true,
    couleur: BLEU,
    align: "right",
  });
  yDroite += 8;

  texte(
    doc,
    invoice.number.length > 0 ? invoice.number : "Brouillon — sans numéro",
    droite,
    yDroite,
    { taille: 11, gras: true, align: "right" },
  );
  yDroite += 6;

  texte(doc, `${nature.dateLabel} : ${dateFr(invoice.date)}`, droite, yDroite, {
    taille: 8,
    couleur: GRIS,
    align: "right",
  });
  yDroite += 4;
  texte(
    doc,
    `${nature.echeanceLabel} : ${dateFr(invoice.dueDate)}`,
    droite,
    yDroite,
    { taille: 8, couleur: GRIS, align: "right" },
  );
  yDroite += 4;

  // Un avoir doit désigner la pièce qu'il annule, sinon il ne prouve rien.
  if (invoice.kind === "creditNote" && invoice.cancels !== undefined) {
    texte(doc, `Annule la facture ${invoice.cancels}`, droite, yDroite, {
      taille: 8,
      gras: true,
      couleur: GRIS,
      align: "right",
    });
    yDroite += 4;
  }
  if (invoice.kind === "invoice" && invoice.convertedFrom !== undefined) {
    texte(doc, `Suite au devis ${invoice.convertedFrom}`, droite, yDroite, {
      taille: 8,
      couleur: GRIS,
      align: "right",
    });
    yDroite += 4;
  }

  return Math.max(y, yDroite) + 4;
}

function dessinerParties(
  doc: jsPDF,
  profile: CompanyProfile,
  invoice: Invoice,
  clientName: string,
  clientLines: readonly string[] | undefined,
  nature: (typeof NATURES)[keyof typeof NATURES],
  depart: number,
): number {
  doc.setDrawColor(TRAIT[0], TRAIT[1], TRAIT[2]);
  doc.line(MARGE, depart, LARGEUR - MARGE, depart);

  let y = depart + 7;

  texte(doc, "DESTINATAIRE", MARGE, y, { taille: 7, gras: true, couleur: GRIS });
  y += 5;
  texte(doc, clientName, MARGE, y, { taille: 11, gras: true });
  y += 5;

  for (const ligne of clientLines ?? []) {
    if (ligne.length === 0) continue;
    texte(doc, ligne, MARGE, y, { taille: 8, couleur: GRIS });
    y += 4;
  }

  // Un devis annonce sa validité en clair : « valable 30 jours » sans date
  // oblige le client à calculer.
  if (invoice.kind === "quote") {
    const validite =
      invoice.dueDate.length > 0
        ? invoice.dueDate
        : addDays(invoice.date, profile.paymentTermDays);
    texte(
      doc,
      `Offre valable jusqu'au ${dateFr(validite)}.`,
      LARGEUR - MARGE,
      depart + 7,
      { taille: 8, gras: true, couleur: BLEU, align: "right" },
    );
  } else {
    texte(doc, nature.echeanceLabel.toUpperCase(), LARGEUR - MARGE, depart + 7, {
      taille: 7,
      gras: true,
      couleur: GRIS,
      align: "right",
    });
    texte(doc, dateFr(invoice.dueDate), LARGEUR - MARGE, depart + 12, {
      taille: 11,
      gras: true,
      align: "right",
    });
  }

  return y + 4;
}

/** Colonnes du tableau, en millimètres depuis la marge gauche. */
const COLONNES = {
  description: MARGE + 2,
  quantite: MARGE + 108,
  prixUnitaire: MARGE + 140,
  tva: MARGE + 158,
  total: LARGEUR - MARGE - 2,
} as const;

function dessinerEnTeteTableau(doc: jsPDF, y: number): number {
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGE, y, CONTENU, 8, "F");

  texte(doc, "Désignation", COLONNES.description, y + 5.5, {
    taille: 8,
    gras: true,
  });
  texte(doc, "Qté", COLONNES.quantite, y + 5.5, { taille: 8, gras: true, align: "right" });
  texte(doc, "P.U. HT", COLONNES.prixUnitaire, y + 5.5, {
    taille: 8,
    gras: true,
    align: "right",
  });
  texte(doc, "TVA", COLONNES.tva, y + 5.5, { taille: 8, gras: true, align: "right" });
  texte(doc, "Total HT", COLONNES.total, y + 5.5, {
    taille: 8,
    gras: true,
    align: "right",
  });

  return y + 11;
}

function dessinerLignes(
  doc: jsPDF,
  invoice: Invoice,
  totaux: DocumentTotals,
  profile: CompanyProfile,
  depart: number,
): number {
  let y = dessinerEnTeteTableau(doc, depart);

  const parId = new Map(totaux.lines.map((ligne) => [ligne.lineId, ligne]));

  for (const article of invoice.items) {
    const calcul = parId.get(article.id);
    if (calcul === undefined) continue;

    // 52 mm réservés au bas de page pour les totaux et la signature : couper
    // une ligne au milieu du bloc de totaux rendrait le document illisible.
    if (y > HAUTEUR - 80) {
      doc.addPage();
      y = dessinerEnTeteTableau(doc, MARGE);
    }

    const intitule = doc.splitTextToSize(article.description, 100) as string[];
    texte(doc, intitule.join("\n"), COLONNES.description, y, { taille: 9 });
    texte(doc, String(article.quantity), COLONNES.quantite, y, {
      taille: 9,
      align: "right",
    });
    texte(
      doc,
      montantPdf(Math.round(Number(article.unitPrice) || 0), profile),
      COLONNES.prixUnitaire,
      y,
      { taille: 9, align: "right" },
    );
    texte(doc, `${calcul.vatRatePercent} %`, COLONNES.tva, y, {
      taille: 9,
      align: "right",
      couleur: GRIS,
    });
    texte(doc, montantPdf(calcul.net.amount, profile), COLONNES.total, y, {
      taille: 9,
      gras: true,
      align: "right",
    });

    const hauteur = Math.max(6, intitule.length * 4 + 2);
    y += hauteur;

    doc.setDrawColor(TRAIT[0], TRAIT[1], TRAIT[2]);
    doc.line(MARGE, y - 2, LARGEUR - MARGE, y - 2);
  }

  return y + 4;
}

function dessinerTotaux(
  doc: jsPDF,
  invoice: Invoice,
  totaux: DocumentTotals,
  profile: CompanyProfile,
  depart: number,
): number {
  let y = depart;

  // Ventilation de TVA à gauche, quand il y a plus d'un taux : sur un seul
  // taux elle répéterait le pied de document.
  if (totaux.vatBrackets.length > 1) {
    texte(doc, "VENTILATION DE TVA", MARGE, y + 4, {
      taille: 7,
      gras: true,
      couleur: GRIS,
    });
    let yTva = y + 9;
    for (const tranche of totaux.vatBrackets) {
      texte(
        doc,
        `${tranche.ratePercent} % sur ${montantPdf(tranche.base.amount, profile)}`,
        MARGE,
        yTva,
        { taille: 8, couleur: GRIS },
      );
      texte(doc, montantPdf(tranche.vat.amount, profile), MARGE + 70, yTva, {
        taille: 8,
        align: "right",
      });
      yTva += 4;
    }
  }

  // Totaux à droite.
  const gauche = LARGEUR - MARGE - 76;
  const droite = LARGEUR - MARGE;

  const ligne = (libelle: string, valeur: string, gras = false) => {
    texte(doc, libelle, gauche, y + 5, { taille: 9, gras, couleur: gras ? ENCRE : GRIS });
    texte(doc, valeur, droite, y + 5, { taille: 9, gras, align: "right" });
    y += 5;
  };

  ligne("Total hors taxes", montantPdf(totaux.subtotal.amount, profile));
  if (totaux.totalDiscount.amount !== 0) {
    ligne("Remise", montantPdf(-totaux.totalDiscount.amount, profile));
  }
  ligne("TVA", montantPdf(totaux.totalVat.amount, profile));

  y += 2;
  doc.setFillColor(BLEU[0], BLEU[1], BLEU[2]);
  doc.rect(gauche, y, 76, 10, "F");
  texte(doc, "TOTAL TTC", gauche + 3, y + 6.5, {
    taille: 10,
    gras: true,
    couleur: [255, 255, 255],
  });
  texte(doc, montantPdf(totaux.total.amount, profile), droite - 3, y + 6.5, {
    taille: 10,
    gras: true,
    couleur: [255, 255, 255],
    align: "right",
  });
  y += 13;

  // Sur une facture partiellement encaissée, le reste dû est l'information
  // que le client cherche. L'omettre l'oblige à faire la soustraction.
  const encaissements = invoice.payments ?? [];
  if (invoice.kind === "invoice" && encaissements.length > 0) {
    const reglement = computeSettlement(totaux.total.amount, encaissements);
    ligne("Déjà encaissé", montantPdf(reglement.paid, profile));
    ligne(
      reglement.balance <= 0 ? "Solde" : "Reste dû",
      montantPdf(reglement.balance, profile),
      true,
    );
    y += 2;
  }

  return y + 4;
}

function dessinerReglement(
  doc: jsPDF,
  invoice: Invoice,
  profile: CompanyProfile,
  depart: number,
): number {
  let y = depart;

  doc.setDrawColor(TRAIT[0], TRAIT[1], TRAIT[2]);
  doc.line(MARGE, y, LARGEUR - MARGE, y);
  y += 6;

  const conditions =
    invoice.paymentTerms.length > 0
      ? invoice.paymentTerms
      : (profile.paymentTerms ?? "");

  if (invoice.kind !== "creditNote") {
    texte(doc, "RÈGLEMENT", MARGE, y, { taille: 7, gras: true, couleur: GRIS });
    y += 5;
    texte(
      doc,
      `Mode : ${MOYENS_PAIEMENT[invoice.paymentMethod]}`,
      MARGE,
      y,
      { taille: 8 },
    );
    y += 4;
    if (conditions.length > 0) {
      for (const ligne of doc.splitTextToSize(conditions, 110) as string[]) {
        texte(doc, ligne, MARGE, y, { taille: 8, couleur: GRIS });
        y += 4;
      }
    }
    if (profile.bankDetails !== undefined && profile.bankDetails.length > 0) {
      for (const ligne of doc.splitTextToSize(profile.bankDetails, 110) as string[]) {
        texte(doc, ligne, MARGE, y, { taille: 8, couleur: GRIS });
        y += 4;
      }
    }
  }

  if (invoice.notes !== undefined && invoice.notes.length > 0) {
    y += 2;
    texte(doc, "NOTE", MARGE, y, { taille: 7, gras: true, couleur: GRIS });
    y += 5;
    for (const ligne of doc.splitTextToSize(invoice.notes, 110) as string[]) {
      texte(doc, ligne, MARGE, y, { taille: 8, couleur: GRIS });
      y += 4;
    }
  }

  return y + 2;
}

function dessinerSignature(
  doc: jsPDF,
  invoice: Invoice,
  profile: CompanyProfile,
  depart: number,
): void {
  // Le bloc de signature se cale en bas de page : le faire flotter à la suite
  // du texte le placerait au milieu du document sur un devis à deux lignes.
  const hauteurBloc = invoice.kind === "quote" ? 46 : 40;
  let y = Math.max(depart + 4, HAUTEUR - 22 - hauteurBloc);

  if (y + hauteurBloc > HAUTEUR - 18) {
    doc.addPage();
    y = MARGE;
  }

  const largeurCadre = invoice.kind === "quote" ? (CONTENU - 8) / 2 : 72;
  const xEmetteur = LARGEUR - MARGE - largeurCadre;

  // Cadre d'acceptation, sur les devis seulement : c'est ce qui transforme un
  // devis en accord, et son absence obligeait à en discuter par message.
  if (invoice.kind === "quote") {
    doc.setDrawColor(TRAIT[0], TRAIT[1], TRAIT[2]);
    doc.rect(MARGE, y, largeurCadre, hauteurBloc);
    texte(doc, "BON POUR ACCORD", MARGE + 3, y + 6, {
      taille: 7,
      gras: true,
      couleur: GRIS,
    });
    texte(
      doc,
      "Date, signature et cachet du client",
      MARGE + 3,
      y + 11,
      { taille: 7, couleur: GRIS },
    );
  }

  texte(
    doc,
    `Fait à ${profile.city}, le ${dateFr(invoice.date)}`,
    xEmetteur,
    y + 6,
    { taille: 8, couleur: GRIS },
  );
  texte(doc, `Pour ${profile.name}`, xEmetteur, y + 11, {
    taille: 8,
    gras: true,
  });

  // Signature manuscrite, si elle est renseignée. Un échec d'insertion —
  // format non reconnu, image corrompue — ne doit pas faire perdre le
  // document : on retombe sur la signature dactylographiée seule.
  const signature = profile.signatureDataUrl;
  if (signature !== undefined && signature.length > 0) {
    try {
      const format = signature.includes("image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(signature, format, xEmetteur, y + 13, 42, 16);
    } catch {
      // Rien : le nom et la qualité suffisent à identifier le signataire.
    }
  }

  doc.setDrawColor(TRAIT[0], TRAIT[1], TRAIT[2]);
  doc.line(xEmetteur, y + hauteurBloc - 9, xEmetteur + largeurCadre, y + hauteurBloc - 9);

  const signataire =
    profile.signatoryName.length > 0 ? profile.signatoryName : profile.name;
  texte(doc, signataire, xEmetteur, y + hauteurBloc - 4.5, {
    taille: 8,
    gras: true,
  });
  if (profile.signatoryRole.length > 0) {
    texte(doc, profile.signatoryRole, xEmetteur, y + hauteurBloc - 0.5, {
      taille: 7,
      couleur: GRIS,
    });
  }
}

function dessinerPieds(doc: jsPDF, profile: CompanyProfile): void {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);

    doc.setDrawColor(TRAIT[0], TRAIT[1], TRAIT[2]);
    doc.line(MARGE, HAUTEUR - 16, LARGEUR - MARGE, HAUTEUR - 16);

    const mentions = [
      profile.taxRegime !== undefined && profile.taxRegime.length > 0
        ? profile.taxRegime
        : null,
      ...profile.invoiceFooterMentions,
    ].filter((valeur): valeur is string => valeur !== null && valeur.length > 0);

    if (mentions.length > 0) {
      texte(doc, mentions.join(" · "), MARGE, HAUTEUR - 11, {
        taille: 7,
        couleur: GRIS,
      });
    }

    texte(doc, profile.name, MARGE, HAUTEUR - 7, { taille: 7, couleur: GRIS });

    if (pages > 1) {
      texte(doc, `Page ${page} / ${pages}`, LARGEUR - MARGE, HAUTEUR - 7, {
        taille: 7,
        couleur: GRIS,
        align: "right",
      });
    }
  }
}
