import type { CurrencyCode } from "./money";

/**
 * Profil de l'entreprise émettrice.
 *
 * Tout ce qui touche à la fiscalité et aux mentions obligatoires vit ici, et
 * nulle part ailleurs : aucun taux, aucun préfixe, aucune mention légale n'est
 * codé en dur dans le reste de l'application.
 *
 * AVERTISSEMENT — les mentions légales et le taux de TVA par défaut ci-dessous
 * n'ont PAS été validés par un professionnel du chiffre. Ce sont des valeurs
 * de départ modifiables, pas une référence fiscale. Voir docs/FISCALITE.md.
 */

export interface VatRate {
  /** Libellé affiché : « Taux normal », « Exonéré », « Export ». */
  readonly label: string;
  readonly percent: number;
  /** Mention à porter sur la facture quand ce taux s'applique. */
  readonly legalMention?: string;
  readonly isDefault?: boolean;
}

export interface CompanyProfile {
  readonly name: string;
  readonly legalForm?: string;
  readonly addressLines: readonly string[];
  readonly city: string;
  readonly country: string;
  readonly phone?: string;
  readonly email?: string;
  readonly website?: string;

  /** Identifiants fiscaux. Champs libres : leur format varie selon le pays. */
  readonly taxId?: string;
  readonly tradeRegister?: string;
  readonly statisticalId?: string;
  readonly taxRegime?: string;

  readonly currency: CurrencyCode;
  readonly vatRates: readonly VatRate[];

  /** Préfixes de numérotation, modifiables sans toucher au code. */
  readonly quotePrefix: string;
  readonly invoicePrefix: string;
  readonly creditNotePrefix: string;

  /** Délai de paiement par défaut, en jours. */
  readonly paymentTermDays: number;
  readonly paymentTerms?: string;
  readonly bankDetails?: string;

  /** Mentions libres reportées en pied de chaque facture. */
  readonly invoiceFooterMentions: readonly string[];

  /**
   * Coût horaire interne par défaut, en unité mineure.
   *
   * Sert uniquement à préremplir une saisie de temps : la valeur retenue est
   * ensuite figée sur la saisie elle-même. Changer ce réglage n'altère donc
   * aucun coût déjà enregistré, et ne réécrit la marge d'aucun projet livré.
   *
   * Ce n'est PAS un tarif de vente : c'est ce qu'une heure coûte à
   * l'entreprise. Zéro est admis — l'agence qui ne veut pas valoriser son
   * temps le laisse à zéro et ne lit que les dépenses.
   */
  readonly defaultHourlyCost: number;

  /** Durée de conservation des pièces, en années. */
  readonly retentionYears: number;
}

/**
 * Taux de TVA par défaut.
 *
 * 18 % est le taux gabonais usuel — mais cette valeur N'A PAS été vérifiée
 * auprès d'une source fiscale officielle. Elle est modifiable dans Paramètres,
 * et doit être confirmée par un comptable avant tout usage réel.
 */
export const DEFAULT_VAT_RATES: readonly VatRate[] = [
  { label: "Taux normal", percent: 18, isDefault: true },
  {
    label: "Exonéré",
    percent: 0,
    legalMention: "Opération exonérée de TVA.",
  },
  {
    label: "Export",
    percent: 0,
    legalMention: "Exportation — TVA non applicable.",
  },
];

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: "M.G.N CodeWave",
  legalForm: "",
  addressLines: [],
  city: "Libreville",
  country: "Gabon",
  phone: "+241 66 19 89 18",
  email: "mgncodewave18@gmail.com",
  website: "https://ngoubadjambo-richard.github.io/CodeWave/",
  taxId: "",
  tradeRegister: "",
  statisticalId: "",
  taxRegime: "",
  currency: "XAF",
  vatRates: DEFAULT_VAT_RATES,
  quotePrefix: "DEV",
  invoicePrefix: "FAC",
  creditNotePrefix: "AV",
  paymentTermDays: 30,
  paymentTerms: "Paiement sous 30 jours à compter de la date de facture.",
  bankDetails: "",
  invoiceFooterMentions: [],
  // Ordre de grandeur pour un développeur à Libreville. À ajuster : c'est un
  // coût de revient, pas un prix de vente.
  defaultHourlyCost: 8000,
  retentionYears: 10,
};

/** Taux appliqué par défaut à une nouvelle ligne. */
export function defaultVatPercent(profile: CompanyProfile): number {
  const parDefaut = profile.vatRates.find((taux) => taux.isDefault === true);
  return parDefaut?.percent ?? profile.vatRates[0]?.percent ?? 0;
}

export interface ProfileIssue {
  readonly field: string;
  readonly message: string;
  /** `blocking` empêche d'émettre une facture ; `advisory` est un rappel. */
  readonly severity: "blocking" | "advisory";
}

/**
 * Contrôle du profil avant émission d'une facture.
 *
 * Une facture émise sans mentions obligatoires est une facture à refaire, et
 * on ne refait pas une facture émise — on émet un avoir. Mieux vaut donc
 * prévenir avant.
 */
export function checkProfile(profile: CompanyProfile): readonly ProfileIssue[] {
  const issues: ProfileIssue[] = [];

  if (profile.name.trim() === "") {
    issues.push({
      field: "name",
      message: "Le nom de l'entreprise est obligatoire sur une facture.",
      severity: "blocking",
    });
  }

  if (profile.addressLines.every((ligne) => ligne.trim() === "")) {
    issues.push({
      field: "addressLines",
      message: "Renseigne l'adresse : elle figure sur toute facture.",
      severity: "blocking",
    });
  }

  if ((profile.taxId ?? "").trim() === "") {
    issues.push({
      field: "taxId",
      message:
        "Numéro d'identification fiscale absent. Fais confirmer par un comptable " +
        "quelles mentions sont obligatoires pour ton régime.",
      severity: "advisory",
    });
  }

  if ((profile.tradeRegister ?? "").trim() === "") {
    issues.push({
      field: "tradeRegister",
      message: "Numéro de registre du commerce absent.",
      severity: "advisory",
    });
  }

  if (profile.vatRates.length === 0) {
    issues.push({
      field: "vatRates",
      message: "Aucun taux de TVA n'est défini.",
      severity: "blocking",
    });
  }

  return issues;
}

/** Vrai si rien n'empêche d'émettre une facture. */
export function canIssueInvoices(profile: CompanyProfile): boolean {
  return !checkProfile(profile).some((issue) => issue.severity === "blocking");
}
