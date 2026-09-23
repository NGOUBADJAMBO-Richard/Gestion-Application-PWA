# CodeWave Studio — Spécification de reprise

**Destinataire** : session Claude Code ouverte à la racine de
`C:\Users\MSI\Desktop\Sites Web Full\Gestion Application PWA`
**Auteur** : M.G.N CodeWave · **Version** : 3 · **Date** : 23 septembre 2026
**Statut** : à exécuter lot par lot, avec validation humaine entre chaque

> **Périmètre** : ce document décrit la cible complète. Le lot **P1 seul** représente plusieurs
> sessions de travail. Ne lance pas tout d'un bloc.

---

## Sommaire

| Partie | Contenu |
|---|---|
| **A** | Cadre : rôle, contraintes, règles, état vérifié |
| **B** | Architecture cible : couches, contrats TypeScript, règles monétaires |
| **C** | Les 9 lots, dans l'ordre d'exécution |
| **D** | Catalogue fonctionnel priorisé (28 entrées) |
| **E** | Exigences transversales : sécurité, RGPD, accessibilité, performance |
| **F** | Vérification, définition de « terminé », format de compte rendu |
| **G** | Registre des risques |
| **H** | Interdits |

---

# PARTIE A — CADRE

## A.1 Rôle et mission

Tu es développeur senior full-stack (React 18 / TypeScript 5 / Vite 6 / Tailwind 4), architecte
logiciel et responsable qualité. Tu reprends une application exportée depuis Figma Make pour en
faire l'outil de pilotage de **M.G.N CodeWave** — agence web et organisme de formation à
Libreville, Gabon.

Nom du produit : **CodeWave Studio**. Nom court (icône, barre de titre) : **Studio**.

Tu raisonnes en CTO, pas en exécutant : une décision technique se justifie par son effet sur le
produit et sur la personne qui utilisera l'outil tous les jours, pas par son élégance.

## A.2 Contrainte structurante : 100 % local

Pas de backend, pas d'API, pas de cloud, pas de compte distant. Tout vit dans le navigateur de la
machine. **Ne propose ni Supabase, ni Firebase, ni serveur tant que je ne le demande pas.**

Quatre conséquences à traiter comme des exigences de premier plan :

1. **Un vidage de cache = perte totale.** La sauvegarde est une fonctionnalité critique, avec
   rappel actif au-delà de 7 jours sans export.
2. **`localStorage` plafonne autour de 5 Mo.** Lignes de facture, écritures et justificatifs le
   saturent. D'où l'abstraction de stockage en B.2.
3. **La sécurité est un verrou, pas une protection.** Interdiction de laisser croire le contraire,
   dans le code comme dans l'interface.
4. **Le RGPD s'applique quand même.** Le stockage local n'exonère pas le responsable de
   traitement. Voir E.2.

## A.3 Règles de travail — non négociables

1. **Réponds en français.** Recommandation d'abord, justification ensuite. Pas de préambule.
2. **Dis-moi quand je me trompe.** Ne valide pas une approche pour me faire plaisir.
3. **Marque explicitement ce que tu n'as pas vérifié.**
4. **Explore et planifie avant d'éditer.** Plan annoncé, accord obtenu, puis exécution.
5. **Donne-moi un moyen de vérifier** : commande exacte, sortie attendue, test qui passe.
6. **Un lot n'est pas fini tant que `npm run verify` ne passe pas.**
7. **Diffs, pas réécritures.**
8. **Aucun secret en dur**, jamais, même dans un test.
9. **Nouvelle dépendance = tu me demandes d'abord** (liste en A.5).
10. **Ne commite ni ne pushe sans que je te le demande.**
11. Windows natif. `jq` absent. TypeScript en **5.x**, pas `latest` (le LSP passe par `tsserver`,
    absent de TypeScript 7).
12. Pas de code de niveau débutant : erreurs typées, cas limites traités, aucune valeur magique.
13. **SOLID, DRY, KISS — en priorité inverse** : la simplicité l'emporte sur la factorisation,
    qui l'emporte sur la pureté des principes.

## A.4 État vérifié du dépôt (mesuré le 23 septembre 2026)

Reconfirme chaque ligne toi-même. Signale tout écart.

| Constat | Commande |
|---|---|
| `npm run build` **passe** en ~8,3 s | `npm run build` |
| `dist/assets/vendor-misc-*.js` = **1 215 kB** (380 kB gzip) | sortie du build |
| **87 469 des 87 562 fichiers suivis** sont `node_modules/` ou `dist/` | `git ls-files \| wc -l` |
| **`.gitignore` absent** | `ls -la .gitignore` |
| **TypeScript non installé** ; `"strict": false` | `ls node_modules/typescript` |
| **Aucun script** `typecheck`, `lint`, `test`, `preview` | `cat package.json` |
| Nom du paquet : `@figma/my-make-file` | idem |
| `react` / `react-dom` en `peerDependencies` `"optional": true` | idem |
| `vite-plugin-pwa` installé, **jamais branché** | `grep -rn vite-plugin-pwa vite.config.ts` |
| `tailwind.config.js` : `content: []`, non lu par Tailwind v4 → **mort** | lecture |
| **0 import** de : `firebase`, `@mui/material`, `@emotion/react`, `@emotion/styled`, `react-slick`, `react-dnd`, `react-dnd-html5-backend`, `react-responsive-masonry`, `canvas-confetti`, `react-popper`, `@popperjs/core`, `date-fns`, `next-themes` | `grep -rl <pkg> src/` |
| Pages absentes : Finance, Comptabilité, Paramètres, Devis, Formations, Temps | `ls src/app/pages/` |
| Pied de page → `code-wave-eight.vercel.app` (le site réel est sur GitHub Pages) | `Layout.tsx` |
| `docs/` annonce l'**EUR** ; le code est en **XAF** | `src/app/utils/currency.ts` |
| `AuthContext` : **SHA-256 non salé, sans itération** ; au premier lancement **tout mot de passe est accepté et devient le mot de passe** | `AuthContext.tsx` |
| `store.ts` : `return data as T[]` sur du `localStorage`, **sans validation** | lecture |

### Dette de structure mesurée — cibles de décomposition

| Fichier | Lignes | Problème |
|---|---|---|
| `src/app/pages/Invoicing.tsx` | **714** | Formulaire, calculs, PDF, filtres et rendu dans un seul composant |
| `src/app/pages/Clients.tsx` | **432** | idem |
| `src/app/pages/Projects.tsx` | **424** | idem |
| `src/app/pages/Account.tsx` | **393** | idem |
| `src/app/pages/Support.tsx` | **350** | idem |

**Aucune logique métier ne doit rester dans un composant de page.** Voir B.1.

## A.5 Dépendances

**Pré-approuvées** — installe sans redemander :

| Paquet | Rôle |
|---|---|
| `typescript@~5.9` (dev) | **Absent aujourd'hui** — aucun contrôle de types possible |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` (dev) | Qualité et accessibilité statique |
| `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` (dev) | Tests |
| `zod` | Validation runtime de tout ce qui sort du stockage |
| `idb` (~1,5 kB) | Enrobage IndexedDB — l'API native est trop verbeuse pour être écrite sans erreur |

**Tout le reste : demande-moi.** N'ajoute aucune librairie de graphiques, tableaux, state
management, composants, dates ou monnaie : `recharts`, Radix, shadcn/ui et `Intl` couvrent le
besoin. **En particulier, n'ajoute pas de librairie monétaire** : la règle B.3 se code en 40 lignes
et une dépendance de plus ici est un risque, pas une aide.

## A.6 Méthode

- Branche par lot : `git switch -c studio/lot-N-<slug>`. Ne pousse rien.
- Commits en **Conventional Commits** : `feat(invoicing): …`, `fix(store): …`, `refactor(domain): …`,
  `test(money): …`, `docs(security): …`, `chore(deps): …`.
- **Un lot = plan annoncé → mon accord → exécution → `npm run verify` → compte rendu (F.3) → mon
  accord.**
- **Arrête-toi à la fin de chaque lot.** N'enchaîne jamais de ta propre initiative.
- Toute décision structurante fait l'objet d'un **ADR** de 15 lignes maximum dans
  `docs/adr/NNNN-titre.md` : contexte, décision, conséquences, alternatives écartées.

---

# PARTIE B — ARCHITECTURE CIBLE

## B.1 Couches — séparation stricte

```
src/
├── domain/              ← Métier pur. Zéro React, zéro DOM, zéro I/O. 100 % testable.
│   ├── money.ts             Arithmétique monétaire (B.3)
│   ├── schema.ts            Types + schémas zod de toutes les entités
│   ├── invoice.ts           Totaux, TVA, remise, acompte, solde
│   ├── numbering.ts         Séquences de numérotation (B.4)
│   ├── accounting.ts        Journal, rapprochement, récap TVA
│   ├── profitability.ts     Marge projet : temps × taux − dépenses
│   └── rules.ts             Règles d'intégrité (suppressions interdites, transitions d'état)
│
├── infra/               ← Accès au monde extérieur.
│   ├── repository.ts        Interface Repository<T> (B.2)
│   ├── localStorageRepo.ts  Implémentation légère
│   ├── indexedDbRepo.ts     Implémentation volumineuse / binaire
│   ├── backup.ts            Export / import versionné avec somme de contrôle
│   └── pdf/                 Adaptateurs jsPDF
│
└── app/                 ← React. Orchestration et rendu uniquement.
    ├── pages/               Un fichier de page = assemblage, < 200 lignes
    ├── features/<module>/   Composants, hooks et formulaires du module
    ├── components/ui/       shadcn — ne pas modifier sans raison
    ├── contexts/
    └── hooks/
```

**Règle de dépendance, à faire respecter par une règle ESLint** : `domain/` n'importe **rien**
d'autre que `domain/` et `zod`. `infra/` peut importer `domain/`. `app/` peut importer les deux.
**Jamais l'inverse.**

**Conséquence sur l'existant** : les calculs actuellement noyés dans `Invoicing.tsx` (714 lignes)
descendent dans `domain/invoice.ts` et deviennent testables sans rendu.

## B.2 Contrat de stockage

```ts
// src/infra/repository.ts
export interface Repository<T extends { id: string }> {
  list(): Promise<readonly T[]>;
  get(id: string): Promise<T | undefined>;
  create(draft: Omit<T, "id">): Promise<T>;
  update(id: string, patch: Partial<Omit<T, "id">>): Promise<T>;
  remove(id: string): Promise<void>;          // suppression douce → corbeille
  bulkSet(items: readonly T[]): Promise<void>; // import / restauration
  subscribe(listener: () => void): () => void; // synchronisation inter-onglets
}

export interface StorageHealth {
  usedBytes: number;
  quotaBytes: number;
  ratio: number;        // alerte au-delà de 0.8
  persisted: boolean;   // navigator.storage.persist()
}
```

**Aucune page n'appelle `localStorage` ou `indexedDB` directement.** Le jour où un backend arrive,
on remplace l'implémentation, pas les écrans.

`src/app/data/store.ts` **n'est pas à réécrire** : son enveloppe `schemaVersion` + `MIGRATIONS` et
sa synchronisation inter-onglets sont correctes. Il devient l'implémentation `localStorage` de
cette interface.

**Répartition** : `localStorage` pour clients, projets, paramètres · **IndexedDB** pour lignes,
écritures, saisies de temps et pièces jointes.

## B.3 Arithmétique monétaire — règle impérative

**Aucun montant n'est jamais un nombre à virgule flottante.** `0.18 * 12345` dérive, et la dérive
finit par décaler un total de facture. Contrat :

```ts
// src/domain/money.ts
export interface Money {
  readonly amount: number;    // ENTIER, en unité mineure
  readonly currency: CurrencyCode;
}
export type CurrencyCode = "XAF" | "EUR" | "USD";

// XAF (franc CFA BEAC) : 0 décimale → l'unité mineure EST le franc.
// EUR et USD : 2 décimales → l'unité mineure est le centime.
export const MINOR_UNITS: Record<CurrencyCode, number> = { XAF: 0, EUR: 2, USD: 2 };
```

**Règles à implémenter et à tester** :

1. Toute opération produisant un non-entier applique un **arrondi commercial au demi supérieur**
   (`half-up`), jamais `Math.round` sur un flottant négatif ni `toFixed`.
2. **Une remise en pourcentage s'applique ligne par ligne**, arrondie à la ligne, puis les lignes
   sont sommées. Jamais l'inverse : l'ordre change le total.
3. **La TVA se calcule sur le total HT après remise**, et le résultat est arrondi une seule fois.
4. **Somme de contrôle obligatoire** : `HT + TVA = TTC` doit être vrai à l'unité près après
   arrondis. Si l'égalité échoue, l'écart est reporté sur la **dernière ligne de TVA** et un test
   le vérifie.
5. **Pas d'addition entre devises différentes.** Le type l'empêche ; une tentative jette une erreur
   typée.
6. **Le taux de change est figé sur le document au moment de l'émission.** Un taux qui bouge ne
   doit jamais réécrire l'historique.

**Tests dits « golden » exigés** — tableau d'entrées/sorties attendues, dont au minimum :

| Cas | Attendu |
|---|---|
| 3 lignes XAF, remise 7 % par ligne, TVA 18 % | HT + TVA = TTC exactement |
| Ligne à 1 XAF, remise 50 % | Arrondi déterministe, jamais 0,5 |
| Facture EUR avec acompte de 30 % | Solde = TTC − acompte, au centime |
| Avoir total | Somme facture + avoir = 0 |
| 1 000 lignes | Pas de dérive cumulée |

## B.4 Numérotation — contrainte comptable

Une numérotation de facture est **séquentielle, sans trou, et définitive**.

```ts
// src/domain/numbering.ts
export type DocumentKind = "quote" | "invoice" | "creditNote";
// Formats : DEV-2026-001 · FAC-2026-001 · AV-2026-001
```

Règles :

1. Un numéro n'est attribué qu'à l'**émission**, jamais à la création du brouillon.
2. Un brouillon n'a **pas** de numéro et peut être supprimé librement.
3. Un document émis ne peut plus être **ni modifié ni supprimé** → seulement annulé par un **avoir**.
4. La séquence repart à 1 **par année fiscale et par type**.
5. `src/app/utils/invoiceNumber.ts` traite déjà correctement le cas « suppression puis
   recréation » — **relis-le, étends-le, ne le réécris pas.** Aujourd'hui il préfixe `INV-` :
   harmonise en `FAC-` **avec migration des numéros existants**.

## B.5 Contrats de domaine

À écrire dans `src/domain/schema.ts`, chaque type accompagné de son schéma zod.

```ts
export type Id = string;                       // ULID trié chronologiquement
export type IsoDate = string;                  // "2026-09-23"
export type DocumentStatus =
  | "draft" | "issued" | "sent" | "partiallyPaid" | "paid" | "overdue" | "cancelled";

export interface Client {
  id: Id;
  name: string;
  company?: string;
  nif?: string;                                // numéro d'identification fiscale
  email?: string;
  phone?: string;                              // format E.164, ex. +24166198918
  address?: PostalAddress;
  status: "prospect" | "active" | "inactive" | "archived";
  source?: "site" | "whatsapp" | "referral" | "other";
  notes?: string;
  createdAt: IsoDate;
  deletedAt?: IsoDate;                         // corbeille
}

export interface DocumentLine {
  id: Id;
  catalogueRef?: string;                       // id de pricingGrid — traçabilité du tarif
  label: string;
  quantity: number;                            // > 0
  unitPrice: Money;
  discountPercent: number;                     // 0 → 100
  vatRatePercent: number;                      // paramétrable, voir E.1
}

export interface Invoice {
  id: Id;
  number?: string;                             // absent tant que status === "draft"
  kind: "invoice" | "creditNote";
  cancels?: Id;                                // renseigné sur un avoir
  clientId: Id;
  projectId?: Id;
  status: DocumentStatus;
  issuedAt?: IsoDate;
  dueAt?: IsoDate;
  lines: readonly DocumentLine[];
  currency: CurrencyCode;
  exchangeRate?: number;                       // figé à l'émission
  depositAmount?: Money;
  paymentTerms?: string;
  payments: readonly Payment[];                // encaissements partiels
  issuedSnapshot?: string;                     // empreinte SHA-256 du document émis
}
```

Complète de la même façon : `Project`, `Quote`, `Transaction`, `TimeEntry`, `Ticket`,
`Training`, `Session`, `Learner`, `CompanyProfile`, `AuditEvent`.

**`issuedSnapshot`** matérialise l'immuabilité : à l'émission, on calcule l'empreinte du document
et on la stocke. Toute divergence ultérieure est détectée et signalée.

## B.6 Erreurs typées

Pas de `throw new Error("...")` avec une chaîne libre, pas de `catch {}` muet.

```ts
// src/domain/errors.ts
export type DomainError =
  | { kind: "validation"; field: string; message: string }
  | { kind: "integrity"; rule: string; blockedBy: readonly Id[] }
  | { kind: "immutable"; documentId: Id; reason: string }
  | { kind: "currencyMismatch"; expected: CurrencyCode; received: CurrencyCode }
  | { kind: "storageQuota"; usedBytes: number; quotaBytes: number }
  | { kind: "corruptData"; collection: string; index: number };
```

Chaque variante a **un message utilisateur en FR et en EN**, et une action proposée
(« restaurer une sauvegarde », « archiver au lieu de supprimer »). Un message d'erreur qui ne dit
pas quoi faire est un bug.

## B.7 Format de sauvegarde

```ts
export interface BackupEnvelope {
  format: "codewave-studio-backup";
  formatVersion: 1;
  appVersion: string;
  exportedAt: string;                          // ISO 8601 complet
  checksum: string;                            // SHA-256 de `collections` sérialisé
  collections: Record<string, readonly unknown[]>;
}
```

À l'import : vérifier `format`, gérer `formatVersion` par migration, **contrôler le `checksum`**,
afficher un aperçu des différences (X clients, Y factures, dont Z conflits) et exiger confirmation.
**Jamais d'import silencieux.** Un test doit couvrir le cycle export → purge → import → égalité.

---

# PARTIE C — LES 9 LOTS

## LOT 1 — Hygiène du dépôt *(bloquant)*

1. `.gitignore` : `node_modules/`, `dist/`, `dist-ssr/`, `.vite/`, `coverage/`, `*.local`,
   `.env*`, `~$*`, `.DS_Store`, `*.tsbuildinfo`.
2. `git rm -r --cached node_modules dist` — **sans toucher au disque**.
   Attendu : `git ls-files | wc -l` passe sous **150**.
3. `package.json` : `"name": "codewave-studio"`, `"version": "1.0.0"`, `"private": true`.
   Déplacer `react@18.3.1` et `react-dom@18.3.1` vers `dependencies` (une application n'a pas de
   peer dependencies optionnelles sur son propre framework).
4. Scripts :
   ```json
   "typecheck": "tsc --noEmit",
   "lint": "eslint src",
   "test": "vitest run",
   "test:watch": "vitest",
   "preview": "vite preview",
   "verify": "npm run typecheck && npm run lint && npm run test && npm run build"
   ```
5. `tsconfig.json` → `strict`, `noUnusedLocals`, `noUnusedParameters`,
   `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

   **Point d'arrêt obligatoire** : lance `npm run typecheck` et **donne-moi le nombre d'erreurs
   avant de corriger.** Au-delà de 150, attends mon arbitrage. **Jamais de `any`, `@ts-ignore`
   ni `!` pour faire taire une erreur** ; un `as` doit être commenté.
6. ESLint : règle de dépendance entre couches (B.1) via `no-restricted-imports`, plus
   `jsx-a11y` en `error`.
7. Désinstaller les 13 dépendances à 0 import. **Donne-moi le poids de `vendor-misc` avant/après** —
   l'essentiel du gras vient de `firebase`.
8. Supprimer `tailwind.config.js` (mort en Tailwind v4) et `src/app/components/figma/` si `grep`
   confirme qu'il n'est plus importé.

**Acceptation** : `npm run verify` vert · `git ls-files | wc -l` < 150.

---

## LOT 2 — Identité CodeWave Studio

`grep -rn "M.G.N Manager\|MGN Manager\|my-make-file\|WaveDesk"` puis traiter **chaque** occurrence :
`index.html`, `public/manifest.json` (`name`, `short_name`, `id`, `lang`, `dir`), `README.md`,
`docs/*.md`, clés `brand.*` de `LanguageContext.tsx`, `BrandLogo.tsx`, SVG de `public/`.

**Migration des clés `localStorage`** : `mgn-manager` → `codewave-studio`. Recopier, vérifier,
puis supprimer les anciennes. **Test obligatoire.** Aucune donnée saisie ne doit être perdue.

**Corriger le pied de page** : le site réel est `https://ngoubadjambo-richard.github.io/CodeWave/`,
pas `code-wave-eight.vercel.app`. En cas de doute, demande-moi.

---

## LOT 3 — Charte graphique : importer celle du site

Source : `C:\Users\MSI\Desktop\M.G.N Entreprises\M.G.N CodeWave\Sites Web\codewave-website-com`.
**Lis `assets/css/base.css` en entier avant de toucher au CSS.** Ce dossier est en **lecture
seule** pour toi.

```css
/* Clair */
--bg:#f4f3f3; --fg:#0f172a; --card:#ffffff; --border:#e2e8f0;
--muted:#475569;        /* 6,4:1 sur #f4f3f3 — ne pas revenir à #64748b (4,3:1) */
--primary:#004AAD; --primary-fg:#004AAD; --hero-bg:#E8F0FB;

/* Sombre */
--bg:#1e293b; --fg:#f1f5f9; --card:#0f172a; --border:#334155;
--muted:#94a3b8; --primary:#0062E6;
--primary-fg:#60A5FA;   /* #004AAD tombe sous 3:1 sur #1E293B ; celle-ci tient 5,8:1 */
--hero-bg:#16213A;
```

Signatures à reprendre telles quelles :

- **Cartes** : `border-top: 3px solid var(--primary)` ; survol `translateY(-2px)` +
  `box-shadow: 0 12px 28px rgba(0,74,173,.12)`.
- **CTA primaire** : `linear-gradient(135deg,#004AAD,#0062E6)`, **angles droits**,
  **Syne 700 majuscules**, `letter-spacing:.06em`.
- **Typographie** : `Syne` (titres) / `Space Grotesk` (corps), aujourd'hui chargées par **`@import`
  Google Fonts** — pire cas pour la performance et transfert de données vers Google.
  → **Auto-héberger** en `woff2` dans `public/fonts/`, `@font-face` locaux, `font-display: swap`,
  et **supprimer les deux `@import`**.
- **Fond** : ondes SVG à 10 % (15 % en sombre), sans nuire à la lisibilité des tableaux.

**Arbitrage de rayon, à appliquer et justifier** : angles droits pour les boutons d'action
primaires, rayon conservé pour cartes, champs et badges. Propose mieux si tu le penses, mais ne
mélange pas au hasard.

**Livrable attendu** : `docs/DESIGN-SYSTEM.md` — jetons, composants, états, **ratios de contraste
calculés** pour chaque paire introduite. Pas d'appréciation à l'œil.

---

## LOT 4 — Socle : domaine, stockage, monnaie

Implémenter B.1 à B.7. C'est le lot le plus structurant : tout le reste en dépend.

**Ordre imposé** : `money.ts` (+ tests golden) → `schema.ts` → `repository.ts` + implémentations →
`numbering.ts` → `invoice.ts` → `rules.ts` → migration des données existantes.

**Refactorisation associée** : extraire les calculs de `Invoicing.tsx` (714 lignes) vers
`domain/invoice.ts`. **Écris d'abord un test de caractérisation** qui fige le comportement actuel,
puis refactorise, puis vérifie que le test passe toujours. Si le comportement actuel est faux,
dis-le-moi avant de le corriger.

### Import du catalogue réel du site *(forte valeur)*

Le site porte déjà la vérité commerciale :

| Fichier | Contenu |
|---|---|
| `assets/js/data/content.js` → `pricingGrid` | Les prix réels, en XAF |
| `assets/js/data/content-offers.js` | 6 offres, leurs `priceIds`, délais, livrables |
| `assets/js/data/content-formations.js` | CodeWave Academy : modules M1→M7 (heures, montants), parcours, ateliers, intra |

Écrire `npm run import:catalogue` qui lit ces fichiers **en lecture seule** et génère
`src/domain/catalogue.generated.ts` typé. Un devis se construit alors en piochant dans le catalogue
réel : plus de ressaisie, plus de divergence entre le site et l'application.

Le script **échoue bruyamment** si la forme des données a changé, et le chemin du site est un
paramètre, jamais une constante en dur.

### Monnaie, TVA, localisation

`currency.ts` formate déjà en **XAF** — correct. Mais `docs/` parle d'EUR et `mockData.ts` contient
des montants d'allure européenne (« 328 000 € »). Rends l'ensemble cohérent, avec des données de
démonstration en FCFA calées sur les prix réels du catalogue.

**TVA** : le taux gabonais usuel est de **18 %**, mais **je ne l'ai pas vérifié auprès d'une source
fiscale**. Rends-le paramétrable, ne le code jamais en dur, prévois le cas exonéré, et
**demande-moi confirmation** plutôt que de trancher.

**Mentions légales de facture** (NIF, RCCM, régime fiscal, mentions obligatoires au Gabon) :
**je ne connais pas la liste exacte applicable.** Prévois-les comme champs libres et paramétrables
dans le profil d'entreprise, et **écris dans la documentation que cette liste doit être validée par
un comptable** avant tout usage réel.

---

## LOT 5 — Sécurité

Lis `AuthContext.tsx` et **confirme-moi ces trois défauts** :

1. Au premier lancement, `login()` accepte **n'importe quel mot de passe** et l'enregistre.
2. Hachage **SHA-256 non salé, sans itération** — cassable hors ligne en secondes.
3. `isAuthenticated` ne dépend que d'une entrée `localStorage` : l'écrire à la main suffit à entrer.

Sans backend, on ne peut pas rendre cela sûr au sens strict. **Ne prétends pas le contraire.**

| # | Exigence |
|---|---|
| 1 | **PBKDF2** via `crypto.subtle.deriveBits` : sel aléatoire 16 octets, **≥ 310 000 itérations**, SHA-256. Stocker sel + itérations + empreinte. |
| 2 | **Création explicite du mot de passe** au premier lancement : écran dédié, confirmation, 12 caractères minimum, indicateur de robustesse. |
| 3 | Verrouillage temporisé après 5 échecs, délai croissant. |
| 4 | Verrouillage sur inactivité, durée paramétrable, compte à rebours visible. |
| 5 | **Phrase de récupération de 12 mots** générée à la création, à noter hors ligne. Sans elle, un mot de passe oublié rend les données inaccessibles. |
| 6 | **Message explicite** (premier lancement + Paramètres + `docs/SECURITE.md`) : les données sont stockées **en clair** ; ce verrou protège d'un regard, pas d'un attaquant ayant accès à la machine. |
| 7 | **Chiffrement au repos (AES-GCM)** : **ne l'implémente pas sans mon accord écrit.** Présente d'abord le compromis — oubli = perte définitive, et la phrase de récupération devient elle-même un secret critique. |

**Durcissement général** : CSP en `<meta http-equiv>` **sans `unsafe-eval`** ·
`grep -rn "dangerouslySetInnerHTML"` → aucun sur du contenu saisi · `rel="noopener noreferrer"`
partout · exports par `URL.createObjectURL`, jamais via un tiers ·
`npm audit` propre · `package-lock.json` commité.

**Prouve l'absence de fuite** :
`grep -rn "fetch(\|XMLHttpRequest\|axios\|sendBeacon\|new Image(" src/` — et commente chaque
résultat légitime dans le compte rendu.

---

## LOT 6 — Fonctionnalités

Voir **Partie D**. Livrer **P1 d'abord**, module par module.

**Standard applicable à chaque module, sans exception** :

- CRUD complet, formulaire validé (`react-hook-form` + zod, **schéma partagé avec le domaine**)
- Messages d'erreur utiles : « le NIF doit comporter 9 chiffres », jamais « champ invalide »
- Confirmation avant suppression — `ConfirmDeleteDialog` existe, **réutilise-le**
- **État vide** explicite avec action, **état de chargement** en squelette, **état d'erreur**
  récupérable. Jamais un écran blanc.
- Recherche, tri, filtres, pagination au-delà de 25 lignes
- Chaînes FR **et** EN via `t()`
- Clavier de bout en bout
- **Page < 200 lignes** : au-delà, décompose dans `features/<module>/`

---

## LOT 7 — En faire une vraie PWA

L'application s'appelle « PWA » et n'en est pas une.

1. Brancher `vite-plugin-pwa` : `autoUpdate`, précache de la coquille,
   `navigateFallback` → `index.html`.
2. Icônes **PNG 192 et 512** en plus des SVG (iOS et plusieurs lanceurs Android ignorent le SVG),
   + icône `maskable` **distincte**, avec la zone de sécurité respectée.
3. `apple-touch-icon` et `apple-mobile-web-app-*` dans `index.html`.
4. Invite d'installation maison (`beforeinstallprompt`) et bandeau « nouvelle version disponible ».
5. Indicateur hors ligne persistant.
6. `shortcuts` du manifeste : Nouveau devis · Nouveau client · Chrono.
7. **Vérification exigée** : `npm run build && npm run preview`, Lighthouse onglet PWA, puis réseau
   coupé + rechargement. **Donne les résultats, y compris les échecs.**

---

## LOT 8 — Qualité, performance, accessibilité

### Budget de performance *(chiffres à rapporter, avant/après)*

| Indicateur | Cible |
|---|---|
| Bundle initial (gzip) | **< 250 kB** |
| Plus gros chunk (gzip) | **< 200 kB** |
| Lighthouse Performance (desktop, `preview`) | **≥ 90** |
| Lighthouse Accessibilité | **≥ 95** |
| Temps d'interactivité | **< 2 s** |
| Liste de 1 000 factures : rendu | **< 100 ms** après filtrage |

Moyens : `React.lazy` + `Suspense` sur **toutes** les routes · `recharts` et `jspdf` chargés à la
demande · virtualisation au-delà de 200 lignes · mémoïsation des sélecteurs de domaine.

### Couverture de tests minimale exigée

| Cible | Cas obligatoires |
|---|---|
| `domain/money.ts` | Tableau golden de B.3, intégralement |
| `domain/invoice.ts` | Remise ligne à ligne, TVA, acompte, solde, avoir |
| `domain/numbering.ts` | Suppression puis recréation, changement d'année, brouillon sans numéro |
| `domain/rules.ts` | Refus de suppression d'un client porteur, refus d'édition d'une facture émise |
| `infra/repository` | JSON corrompu, quota plein, migration de schéma, synchronisation inter-onglets |
| `infra/backup` | Cycle export → purge → import → égalité, checksum invalide |
| Migration `localStorage` du LOT 2 | Aucune perte |
| i18n | **Échec si une clé manque en FR ou en EN** |
| Rendu | Dashboard, Facturation, Devis |

### Accessibilité — WCAG 2.2 niveau AA

Clavier complet · focus visible · `aria-label` sur les boutons à icône seule · contraste AA ·
`prefers-reduced-motion` · lien d'évitement · `aria-live` sur les toasts · cibles **44 × 44 px**
sous `@media (pointer: coarse)` · `<label>` réels · erreurs liées par `aria-describedby` ·
`<dialog>` ou Radix pour le piégeage du focus.

### Responsive

**320 → 1920 px**, aucun débordement horizontal. Les tableaux deviennent des **cartes empilées** sur
mobile, jamais un scroll horizontal. Points testés : 320, 375, 768, 1024, 1440, 1920.

### Robustesse

Un `ErrorBoundary` **par route**, message utile, rechargement, et proposition de restauration de
sauvegarde si l'erreur vient des données.

---

## LOT 9 — Documentation

`docs/ARCHITECTURE.md` et `docs/FEATURES.md` **mentent déjà** (EUR au lieu de XAF, fonctionnalités
annoncées comme faites qui ne le sont pas). **Une documentation fausse est pire qu'absente.**

| Fichier | Contenu |
|---|---|
| `README.md` | Installation, scripts, état réel |
| `docs/ARCHITECTURE.md` | Couches B.1, contrats, décisions |
| `docs/FEATURES.md` | Ce qui existe · **ce qui n'existe pas** |
| `docs/GUIDE-UTILISATEUR.md` | **Source unique de la page Aide** — rien de recopié dans `Help.tsx` |
| `docs/SECURITE.md` | Modèle de menace : protégé / non protégé |
| `docs/RGPD.md` | Registre des traitements, durées, droits (E.2) |
| `docs/SAUVEGARDE.md` | Procédure, fréquence, **test de restauration** |
| `docs/DESIGN-SYSTEM.md` | Jetons et ratios de contraste |
| `docs/GLOSSAIRE.md` | Un terme = une traduction |
| `docs/adr/` | Décisions d'architecture |
| `CHANGELOG.md` | Versionné |

Chaque document porte une section « **Ce qui n'est pas vérifié** ».

---

# PARTIE D — CATALOGUE FONCTIONNEL

**P1** = sans ça l'outil ne sert à rien · **P2** = forte valeur, après P1 · **P3** = confort.
**Ne commence aucun P2 avant que tous les P1 soient verts.**

## D.1 Gestion d'agence

| # | Fonctionnalité | Prio | Détail |
|---|---|---|---|
| 1 | **Clients** | P1 | Liste + fiche. La fiche agrège projets, devis, factures, CA, encours, tickets, temps passé. |
| 2 | **Projets** | P1 | Tableau **et** Kanban. Tâches, jalons, échéances, `clientId` réel (aujourd'hui chaîne libre : **bug de conception**). |
| 3 | **Devis** | P1 | Éditeur alimenté par le catalogue du site. Calcul en direct. `DEV-AAAA-NNN`. Validité et expiration. **Conversion en facture** tracée. |
| 4 | **Facturation** | P1 | Acompte, solde, échéance, encaissements partiels. Retards avec compteur de jours. `FAC-AAAA-NNN`. |
| 5 | **Avoirs** | **P1** | Une facture émise ne se modifie pas : elle s'annule par un avoir, total ou partiel, lié à l'originale. **Manquant aujourd'hui.** |
| 6 | **Export PDF** | P1 | `pdfGenerator.ts` existe — **relis-le, ne le réécris pas.** Ajouter logo, NIF, mentions, conditions, PDF de devis, d'avoir et de relance. |
| 7 | **Finance** | P1 | Trésorerie : encaissements, décaissements, solde. CA 12 mois, répartition client, échéancier. **Aucun chiffre en dur.** |
| 8 | **Comptabilité** | P1 | Journal, catégories, rapprochement facture ↔ encaissement, récap TVA, export CSV/JSON. **Mention explicite : ce n'est pas un logiciel comptable certifié.** |
| 9 | **Paramètres** | P1 | Profil d'entreprise (`companyProfile.ts` à étendre : logo, NIF, RCCM, adresse, RIB, mentions), devise, TVA, préfixes, thème, langue, sécurité, sauvegarde. |
| 10 | **Sauvegarde & restauration** | P1 | Format B.7. Aperçu des différences avant import. **Rappel actif au-delà de 7 jours.** Purge à double confirmation avec saisie du nom de l'entreprise. |
| 11 | **Mon compte** | P1 | Profil, mot de passe, préférences, journal des actions. |
| 12 | **Aide** | P1 | Alimentée depuis `GUIDE-UTILISATEUR.md`. Recherche, raccourcis, contact WhatsApp. |
| 13 | **Suivi du temps** | P2 | Chrono par tâche, saisie manuelle, feuille hebdomadaire, facturable ou non. Alimente la rentabilité et la facturation au temps passé. |
| 14 | **Rentabilité projet** | P2 | Budget vs (temps × taux) vs dépenses = marge réelle. Alerte au dépassement. |
| 15 | **Corbeille & archivage** | P2 | Suppression douce, restauration 30 jours, purge manuelle. |
| 16 | **Relances** | P2 | Message pré-rempli ouvrant **WhatsApp** (`wa.me`) ou l'e-mail. Le canal principal au Gabon est WhatsApp — le site entier repose dessus. Historique par facture. |
| 17 | **Dépenses & justificatifs** | P2 | Pièce jointe (photo/PDF) en **IndexedDB**, catégorisée, rattachable à un projet. Compression avant stockage. |
| 18 | **Calendrier / échéancier** | P2 | Mois et semaine : échéances, jalons, sessions, relances. Export `.ics`. |
| 19 | **Tableau de bord dirigeant** | P2 | CA encaissé vs facturé, **DSO**, taux de conversion devis → facture, pipeline, top clients, alertes. Remplace les cartes statiques. |
| 20 | **Recherche globale** | P2 | ⌘K / Ctrl+K — `cmdk` déjà installé. |
| 21 | **Notifications internes** | P2 | Échéances, retards, tickets, dépassements, sauvegarde en retard. |
| 22 | **Import des demandes du site** | P3 | Export Formspree (CSV/JSON) → prospects, sans doublon. Purement local. |
| 23 | **Modèles de documents** | P3 | Devis/factures types, conditions réutilisables. |
| 24 | **Journal d'audit** | P3 | Append-only : qui, quoi, quand. Utile même en mono-utilisateur. |
| 25 | **Mode démonstration** | P3 | Jeu fictif **sans toucher aux données réelles**, bandeau permanent. |
| 26 | **Impression** | P3 | Feuille de style dédiée pour listes et fiches. |
| 27 | **Raccourcis clavier** | P3 | `n`, `/`, `g p`… avec carte des raccourcis dans l'Aide. |

## D.2 CodeWave Academy *(activité absente de l'application — P2)*

Le site vend des formations (`content-formations.js`) : 7 modules MERN avec heures et montants,
parcours, ateliers, intra-entreprise. **L'application les ignore totalement.**

| Élément | Détail |
|---|---|
| **Catalogue** | Importé du site, lecture seule côté app |
| **Sessions** | Dates, modules, capacité, formateur, présentiel ou distanciel |
| **Apprenants** | Fiche, coordonnées, parcours, présence |
| **Inscriptions** | Session ↔ apprenant, statut, **paiement échelonné** avec échéancier |
| **Facturation** | Réutilise le moteur, montants du catalogue |
| **Attestations** | PDF (module, heures, dates) via le générateur existant |
| **Pilotage** | Taux de remplissage, CA formation vs CA agence |

## D.3 Transversal

- **i18n** : tout via `t()`, FR + EN, avec **test d'exhaustivité des clés**.
- **Glossaire** : `devis`/`quote`, `facture`/`invoice`, `avoir`/`credit note`,
  `encaissement`/`payment received`, `échéance`/`due date`, `apprenant`/`learner`.
- **Formats** : dates et nombres via `Intl`, fuseau **Africa/Libreville**. Jamais de concaténation
  manuelle.

---

# PARTIE E — EXIGENCES TRANSVERSALES

## E.1 Paramétrage fiscal

Aucun taux, aucune mention légale, aucun préfixe n'est codé en dur. Tout vit dans le profil
d'entreprise, versionné, avec **date d'effet** : changer le taux de TVA en 2027 ne doit pas
recalculer les factures de 2026.

## E.2 RGPD — applicable même en local

Le stockage local n'exonère pas le responsable de traitement. À livrer :

| Exigence | Mise en œuvre |
|---|---|
| **Registre des traitements** | `docs/RGPD.md` : finalités, catégories de données, durées |
| **Minimisation** | Ne collecter que ce qui sert à facturer et à suivre un projet |
| **Droit d'accès** | Export par client, de toutes ses données, en un clic |
| **Droit à l'effacement** | Suppression complète d'un client et de ses données rattachées, **sauf** ce que l'obligation comptable impose de conserver — et l'interface doit expliquer pourquoi le reste est conservé |
| **Durées de conservation** | Paramétrables, avec alerte sur les données au-delà |
| **Absence de transfert** | Aucune donnée ne sort du navigateur — vérifié par `grep` en LOT 5 |

## E.3 Journalisation

`AuditEvent` **append-only** : horodatage, acteur, action, entité, différence. Jamais de
suppression d'événement. Sert au débogage comme à la traçabilité comptable.

---

# PARTIE F — VÉRIFICATION

## F.1 À chaque fin de lot

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

**Montre la sortie brute.** Pas de « tout est vert » sans la preuve.

## F.2 Parcours manuel de bout en bout *(fin du LOT 8)*

Créer un client → projet lié → démarrer le chrono → devis depuis le catalogue → conversion en
facture → export PDF → encaissement partiel → vérifier que trésorerie et DSO bougent → **émettre un
avoir et vérifier que le solde revient à zéro** → créer une session de formation et inscrire un
apprenant → sauvegarde complète → purge → réimport → **vérifier l'égalité stricte**.

**Dis-moi ce qui a cassé en chemin.** Un parcours sans aucun défaut sur un lot de cette taille
n'est pas crédible : si tu n'as rien trouvé, c'est que tu n'as pas assez cherché.

## F.3 Définition de « terminé »

Une fonctionnalité n'est livrée que si **tous** ces points sont vrais :

- [ ] `npm run verify` passe
- [ ] Logique métier dans `domain/`, testée, hors de tout composant
- [ ] Tests écrits, dont les cas limites et au moins un cas d'échec
- [ ] États vide / chargement / erreur traités
- [ ] Clavier complet, contrastes AA **avec ratios donnés**
- [ ] Contrôlé de 320 px à 1920 px
- [ ] Chaînes FR **et** EN
- [ ] Migration écrite et testée si le schéma a bougé
- [ ] Documentation mise à jour **dans le même lot**
- [ ] Ce qui n'a pas pu être vérifié est **écrit explicitement**

## F.4 Format imposé du compte rendu

```
## Lot N — <titre>

### Fait
- <action> → <fichier:ligne>

### Vérifié
<sortie brute des 4 commandes>

### Chiffres
- bundle initial : X kB gzip (avant : Y)
- erreurs typecheck : X → 0
- tests : X/X · couverture domain/ : X %

### Non vérifié
- <ce que tu n'as pas pu contrôler, et pourquoi>

### Problèmes rencontrés
- <ce qui a cassé, ce que tu as changé d'approche>

### Décisions à trancher
- <ce qui demande mon arbitrage>

### Commit proposé
<type(scope): sujet>
```

---

# PARTIE G — REGISTRE DES RISQUES

| # | Risque | Gravité | Parade imposée |
|---|---|---|---|
| 1 | Perte totale des données (cache vidé, disque) | **Critique** | Sauvegarde + rappel 7 jours + `navigator.storage.persist()` + test de restauration |
| 2 | Dérive d'arrondi sur les totaux | **Critique** | Entiers en unité mineure (B.3) + tests golden |
| 3 | Facture émise modifiée après coup | **Critique** | Immuabilité + `issuedSnapshot` + avoirs |
| 4 | Quota `localStorage` atteint en production | Élevée | IndexedDB + surveillance à 80 % |
| 5 | Mot de passe oublié avec chiffrement actif | Élevée | Phrase de récupération — **et chiffrement interdit sans accord écrit** |
| 6 | `strict: true` génère des centaines d'erreurs | Élevée | Point d'arrêt en LOT 1, arbitrage humain |
| 7 | Divergence des tarifs site ↔ application | Moyenne | Import généré, jamais ressaisi (LOT 4) |
| 8 | Régression lors de la sortie des calculs de `Invoicing.tsx` | Moyenne | Test de caractérisation **avant** refactorisation |
| 9 | Mentions légales de facture incorrectes au Gabon | Moyenne | Champs paramétrables + **validation par un comptable exigée et documentée** |
| 10 | Périmètre qui explose | Moyenne | Priorisation P1/P2/P3, arrêt obligatoire entre lots |

---

# PARTIE H — INTERDITS

- **Ne réécris pas** `pdfGenerator.ts`, `store.ts`, `invoiceNumber.ts`, `currency.ts`,
  `ConfirmDeleteDialog.tsx` : ils sont corrects et commentés. **Étends-les.**
- N'ajoute **ni backend, ni base distante, ni service tiers, ni télémétrie**.
- **Aucun montant en flottant.** Aucune exception.
- Ne modifie **jamais** une facture émise. Avoir obligatoire.
- Ne supprime **aucune** donnée sans migration testée et confirmation.
- N'annonce **jamais** un lot terminé si une des quatre commandes échoue.
- Ne masque **jamais** un problème par `any`, `@ts-ignore`, `!` ou un `catch {}` muet.
- Aucun chiffre en dur dans un tableau de bord : tout se calcule.
- **Le dossier du site web est en lecture seule.** N'y modifie rien.
- Ne me dis pas que c'est « prêt pour la production » : **on reste en local**, c'est assumé.
- Ne me rassure pas. Si c'est fragile, dis-le.

---

# POUR COMMENCER

1. Lis ce document en entier.
2. **Reconfirme toi-même** les constats du tableau A.4 et signale ceux qui ont changé.
3. **Critique ce plan** : ce qui te semble mal ordonné, surdimensionné, manquant ou faux.
   Je préfère une objection maintenant qu'un contournement plus tard.
4. Propose le plan détaillé du **LOT 1**, avec la liste exacte des fichiers touchés et l'estimation
   du nombre d'erreurs `strict` attendues.
5. **N'édite rien avant que je te dise « vas-y ».**
