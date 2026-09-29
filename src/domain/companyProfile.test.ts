import { describe, expect, it } from "vitest";

import {
  type CompanyProfile,
  DEFAULT_COMPANY_PROFILE,
  DEFAULT_VAT_RATES,
  canIssueInvoices,
  checkProfile,
  defaultVatPercent,
} from "./companyProfile";

const complet: CompanyProfile = {
  ...DEFAULT_COMPANY_PROFILE,
  addressLines: ["Quartier Louis", "BP 1234"],
  taxId: "NIF-000000",
  tradeRegister: "RCCM GA-LBV-2026-B-0001",
};

describe("taux de TVA", () => {
  it("expose un taux par défaut", () => {
    expect(defaultVatPercent(DEFAULT_COMPANY_PROFILE)).toBe(18);
  });

  it("prévoit le cas exonéré", () => {
    const exonere = DEFAULT_VAT_RATES.find((taux) => taux.label === "Exonéré");
    expect(exonere?.percent).toBe(0);
    expect(exonere?.legalMention).toBeDefined();
  });

  it("retombe sur le premier taux si aucun n'est marqué par défaut", () => {
    const profil: CompanyProfile = {
      ...DEFAULT_COMPANY_PROFILE,
      vatRates: [{ label: "Unique", percent: 5 }],
    };
    expect(defaultVatPercent(profil)).toBe(5);
  });

  it("ne casse pas si la liste est vide", () => {
    const profil: CompanyProfile = { ...DEFAULT_COMPANY_PROFILE, vatRates: [] };
    expect(defaultVatPercent(profil)).toBe(0);
  });

  it("le taux n'est codé en dur nulle part : il suit le profil", () => {
    const profil: CompanyProfile = {
      ...DEFAULT_COMPANY_PROFILE,
      vatRates: [{ label: "Taux revu", percent: 19.25, isDefault: true }],
    };
    expect(defaultVatPercent(profil)).toBe(19.25);
  });
});

describe("contrôle du profil", () => {
  it("ne signale rien de bloquant sur un profil complet", () => {
    expect(canIssueInvoices(complet)).toBe(true);
  });

  it("bloque sans nom d'entreprise", () => {
    const issues = checkProfile({ ...complet, name: "   " });
    expect(issues.some((i) => i.field === "name" && i.severity === "blocking")).toBe(true);
    expect(canIssueInvoices({ ...complet, name: "" })).toBe(false);
  });

  it("bloque sans adresse", () => {
    expect(canIssueInvoices({ ...complet, addressLines: [] })).toBe(false);
    expect(canIssueInvoices({ ...complet, addressLines: ["  "] })).toBe(false);
  });

  it("bloque sans aucun taux de TVA", () => {
    expect(canIssueInvoices({ ...complet, vatRates: [] })).toBe(false);
  });

  it("signale les identifiants fiscaux sans bloquer, et renvoie vers un comptable", () => {
    const issues = checkProfile({ ...complet, taxId: "" });
    const nif = issues.find((i) => i.field === "taxId");
    expect(nif?.severity).toBe("advisory");
    expect(nif?.message).toMatch(/comptable/i);
    expect(canIssueInvoices({ ...complet, taxId: "" })).toBe(true);
  });

  it("le profil par défaut n'est pas prêt à facturer : adresse manquante", () => {
    // Volontaire : mieux vaut exiger une saisie qu'émettre une facture
    // incomplète, qu'il faudrait ensuite annuler par un avoir.
    expect(canIssueInvoices(DEFAULT_COMPANY_PROFILE)).toBe(false);
  });
});
