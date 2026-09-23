import { storageKey } from "../../branding";
import {
  type CompanyProfile,
  DEFAULT_COMPANY_PROFILE,
} from "../../domain/companyProfile";

/**
 * Persistance du profil d'entreprise.
 *
 * Un objet unique, pas une collection : il n'y a qu'une entreprise émettrice.
 * Le passage par `readProfile` garantit qu'un profil enregistré par une version
 * antérieure, à qui il manque un champ ajouté depuis, reste exploitable — la
 * valeur par défaut comble le trou au lieu de rendre l'écran inutilisable.
 */

const KEY = storageKey("company-profile");

const listeners = new Set<() => void>();

export function readProfile(): CompanyProfile {
  let brut: string | null;
  try {
    brut = localStorage.getItem(KEY);
  } catch {
    return DEFAULT_COMPANY_PROFILE;
  }

  if (brut === null) return DEFAULT_COMPANY_PROFILE;

  try {
    const stocke = JSON.parse(brut) as Partial<CompanyProfile>;
    return {
      ...DEFAULT_COMPANY_PROFILE,
      ...stocke,
      // Les tableaux ne se fusionnent pas : un profil qui aurait vidé la liste
      // des taux doit rester vide, pas se voir réinjecter les valeurs d'usine.
      addressLines: stocke.addressLines ?? DEFAULT_COMPANY_PROFILE.addressLines,
      vatRates: stocke.vatRates ?? DEFAULT_COMPANY_PROFILE.vatRates,
      invoiceFooterMentions:
        stocke.invoiceFooterMentions ??
        DEFAULT_COMPANY_PROFILE.invoiceFooterMentions,
    };
  } catch {
    return DEFAULT_COMPANY_PROFILE;
  }
}

export function writeProfile(profile: CompanyProfile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
  for (const listener of listeners) listener();
}

export function subscribeProfile(listener: () => void): () => void {
  listeners.add(listener);

  const surAutreOnglet = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", surAutreOnglet);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", surAutreOnglet);
  };
}
