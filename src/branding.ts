/**
 * Identité de l'application, en un seul endroit.
 *
 * Le dépôt portait le nom « M.G.N Manager » dans dix-sept fichiers, et le
 * paquet s'appelait encore `@figma/my-make-file`. Une marque recopiée à la
 * main dans dix-sept fichiers finit toujours par diverger : elle vit ici, et
 * nulle part ailleurs.
 *
 * Les coordonnées proviennent du balisage JSON-LD du site public
 * (`codewave-website-com/index.html`), seule source faisant autorité.
 */
export const BRAND = {
  /** Nom complet de l'application. */
  name: "CodeWave Studio",
  /** Forme courte, pour la barre de titre et l'écran d'accueil mobile. */
  shortName: "Studio",
  /** Entreprise éditrice. */
  company: "M.G.N CodeWave",
  /** Raison d'être, affichée sous le logo. */
  tagline: { fr: "Suite de gestion", en: "Business suite" },
  /** Site public de l'agence. Vérifié dans le JSON-LD du site. */
  siteUrl: "https://ngoubadjambo-richard.github.io/CodeWave/",
  /** Coordonnées de l'agence, valeurs par défaut du profil d'entreprise. */
  contact: {
    email: "mgncodewave18@gmail.com",
    phone: "+241 66 19 89 18",
    city: "Libreville",
    country: "GA",
  },
  /** Devise de référence de l'agence. */
  currency: "XAF",
} as const;

/**
 * Préfixe de toutes les clés de stockage local.
 * Changer cette valeur oblige à écrire une migration dans
 * `src/infra/storage/legacyMigration.ts` : les données des utilisateurs
 * existants ne doivent jamais devenir inaccessibles à cause d'un renommage.
 */
export const STORAGE_PREFIX = "codewave-studio";

/** Construit une clé de stockage préfixée. */
export function storageKey(name: string): string {
  return `${STORAGE_PREFIX}:${name}`;
}
