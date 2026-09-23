# Architecture — CodeWave Studio

> Ce document décrit l'application telle qu'elle est, vérifiable dans le code.
> La version précédente décrivait une application en euros, adossée à Firebase,
> avec une synchronisation temps réel — rien de tout cela n'a jamais existé.

---

## En une phrase

Application de gestion d'agence, **entièrement locale** : React + TypeScript,
aucune donnée ne quitte le navigateur, aucun serveur n'est requis.

---

## Les trois couches

```
src/
├── domain/     Métier pur. Zéro React, zéro DOM, zéro accès au stockage.
├── infra/      Accès au monde extérieur : stockage, chiffrement, PDF.
└── app/        React. Orchestration et rendu uniquement.
```

**La direction des dépendances est une règle, pas une convention** :
`domain/ ← infra/ ← app/`. Elle est appliquée par ESLint
(`no-restricted-imports` dans `eslint.config.js`), donc un import qui remonte
la chaîne fait échouer `npm run lint`.

### Pourquoi cette séparation

Le calcul d'une facture, la numérotation comptable et les règles d'intégrité
sont la partie de l'application qui **doit** être juste. Les enfermer dans des
composants React les rendrait impossibles à tester sans rendu, et impossibles
à réutiliser le jour où un export comptable ou une API arrivent.

La preuve que la séparation tient : `src/domain/` compte plus de 200 tests qui
s'exécutent en moins d'une seconde, sans navigateur.

---

## `domain/` — le métier

| Module | Rôle |
|---|---|
| `money.ts` | Arithmétique monétaire en entiers d'unité mineure |
| `invoice.ts` | Totaux, remises, TVA par tranche, ventilation |
| `payment.ts` | Encaissements, état de règlement, trop-perçu |
| `numbering.ts` | Séquences DEV / FAC / AV, détection de trous |
| `invoiceStatus.ts` | Retard déduit de l'échéance |
| `rules.ts` | Intégrité : suppressions, transitions, avoirs |
| `dashboard.ts` | Indicateurs et chiffre d'affaires mensuel |
| `companyProfile.ts` | Profil fiscal, taux de TVA, mentions légales |
| `lockout.ts` | Temporisation après échecs de connexion |
| `date.ts` | Dates ISO, en calendrier local |
| `id.ts` | Identifiants ULID, triés chronologiquement |

**Aucun de ces modules n'importe React, ni le stockage, ni quoi que ce soit du
navigateur.** Ils prennent des données et rendent des données.

### La règle monétaire

Aucun montant n'est un nombre à virgule flottante. Tout montant est un
**entier en unité mineure** : le franc CFA n'a pas de décimale, l'euro en a
deux. `0.1 + 0.2` vaut `0.30000000000000004` en IEEE 754 ; sur un grand livre
de plusieurs milliers d'écritures, la dérive finit par décaler un total.

L'ordre de calcul d'une facture n'est pas interchangeable :

1. brut de ligne = quantité × prix unitaire, **arrondi à la ligne** ;
2. remise appliquée **à la ligne**, arrondie à la ligne ;
3. regroupement des bases HT **par taux de TVA** ;
4. TVA calculée **une seule fois par taux**, sur la base remisée ;
5. TTC = HT + TVA, **par construction**, jamais réarrondi.

Inverser 2 et 3 donne un autre total. La somme de contrôle `HT + TVA = TTC` est
vérifiée par un test sur 2 000 combinaisons générées.

---

## `infra/` — le monde extérieur

| Module | Rôle |
|---|---|
| `repository.ts` | Contrat `Repository<T>`, erreurs typées, état du stockage |
| `localStorageRepo.ts` | Implémentation `localStorage` avec corbeille |
| `backup.ts` | Export/import vérifié par empreinte SHA-256 |
| `crypto/credential.ts` | PBKDF2, code de récupération |
| `storage/` | Migrations de données |

**Aucune page n'appelle `localStorage` ni `indexedDB` directement.** Le jour où
un serveur arrive, on remplace l'implémentation — pas les écrans.

Toutes les méthodes du dépôt sont asynchrones, y compris dans l'implémentation
`localStorage` qui pourrait être synchrone : une signature synchrone
aujourd'hui obligerait à réécrire tous les appelants le jour du changement.

### Validation à la relecture

Chaque dépôt reçoit une fonction `parse`. Une entrée relue qui n'a pas la forme
attendue est **écartée**, pas laissée passer. L'implémentation d'origine faisait
`return data as T[]` — une assertion de type, pas une vérification : une donnée
corrompue traversait sans bruit et faisait tomber un écran sans rapport, bien
plus loin.

---

## `app/` — React

```
app/
├── pages/        Un écran par fichier
├── components/   Composants de l'application
│   └── ui/       shadcn — ne pas modifier sans raison
├── contexts/     Authentification, thème, langue
├── hooks/        useCollection, useClientIndex, useCompanyProfile
└── data/         Dépôts instanciés et données de démonstration
```

`useCollection` relie un composant à un dépôt : il expose la liste, l'état de
chargement, l'erreur et les mutations, et se réabonne aux écritures venues des
**autres onglets**. Sans cela, deux onglets ouverts divergent et le dernier à
écrire écrase l'autre sans que personne ne le voie.

---

## Stockage

Tout vit dans `localStorage`, sous le préfixe `codewave-studio:`.

| Clé | Contenu |
|---|---|
| `clients`, `projects`, `invoices`, `tickets` | Collections, dans une enveloppe `{ schemaVersion, data }` |
| `company-profile` | Profil d'entreprise et paramètres fiscaux |
| `credential` | Dérivation PBKDF2 du mot de passe et du code de récupération |
| `session`, `lockout` | Session courante, compteur d'échecs |
| `theme`, `language`, `user` | Préférences |

### Migrations

Elles s'exécutent avant le premier rendu, dans `src/main.tsx` :

1. `migrateLegacyStorageKeys` — clés `mgn-*` de M.G.N Manager ;
2. `migrateClientLinks` — rattachement des documents à leur client par
   identifiant, et passage des numéros `INV-` en `FAC-`.

Toutes sont **idempotentes** et conservent l'original en cas d'échec d'écriture.

### Limite connue

`localStorage` plafonne autour de 5 Mo. L'écran « Données et sauvegarde »
affiche l'occupation et alerte au-delà de 80 %. Le passage à IndexedDB pour les
volumes lourds — lignes de document, pièces jointes — reste à faire ; le contrat
`Repository<T>` est déjà écrit pour l'accueillir sans toucher aux écrans.

---

## Chaîne de vérification

```bash
npm run verify
```

Enchaîne `typecheck`, `lint`, `test` et `build`. Aucun de ces quatre n'est
optionnel.

| Réglage | Valeur |
|---|---|
| TypeScript | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| ESLint | recommandé + hooks + jsx-a11y + règle de direction des dépendances |
| Tests | Vitest + jsdom, 276 tests |

`src/test/setup.ts` installe `localStorage`, `ResizeObserver` et `matchMedia` :
jsdom 25 crée une fenêtre mais n'expose aucun des trois, et sans eux aucun
écran ne peut être monté dans un test.

---

## Ce qui n'existe pas

Il vaut mieux le dire que le laisser deviner :

| Absent | Précision |
|---|---|
| Serveur, API, base distante | Aucun. Zéro `fetch` dans le code applicatif |
| Synchronisation entre appareils | Aucune. Le transfert passe par l'export de sauvegarde |
| Chiffrement des données au repos | Aucun, par choix assumé — voir `SECURITE.md` |
| Multi-utilisateur | Un seul accès par appareil |
| Journal d'audit | À faire |
| Comptabilité en partie double | À faire |
