import { useCallback, useEffect, useState } from "react";

import type { CompanyProfile } from "../../domain/companyProfile";
import { readProfile, subscribeProfile, writeProfile } from "../data/companyProfileStore";

/** Profil d'entreprise, synchronisé entre les écrans et les onglets. */
export function useCompanyProfile(): {
  profile: CompanyProfile;
  save: (profile: CompanyProfile) => void;
} {
  const [profile, setProfile] = useState<CompanyProfile>(readProfile);

  useEffect(() => subscribeProfile(() => setProfile(readProfile())), []);

  const save = useCallback((suivant: CompanyProfile) => {
    writeProfile(suivant);
    setProfile(suivant);
  }, []);

  return { profile, save };
}
