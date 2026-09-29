# Sécurité — CodeWave Studio

Ce document dit exactement ce que l'application protège, et ce qu'elle ne
protège pas. Une protection mal comprise est plus dangereuse qu'une protection
absente : on lui fait confiance à tort.

---

## Ce qui était en place avant

L'authentification **ignorait purement et simplement le mot de passe**. La
fonction de connexion le recevait en paramètre et ne s'en servait jamais :

```ts
const login = async (email: string, password: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  // `password` n'est plus jamais mentionné ensuite.
  setUser(mockUser);
};
```

N'importe quelle saisie — y compris un champ vide — ouvrait la session avec le
rôle administrateur.

---

## Ce qui protège aujourd'hui

| Mécanisme | Détail |
|---|---|
| **Dérivation du mot de passe** | PBKDF2-SHA256, **650 000 itérations**, sel aléatoire de 16 octets par appareil |
| **Comparaison** | À temps constant : une comparaison qui s'arrête au premier octet faux laisse fuiter, par sa durée, le nombre d'octets corrects |
| **Temporisation** | 15 s au 3ᵉ échec, 1 min au 4ᵉ, 5 min au 5ᵉ, 15 min au 8ᵉ, 1 h au 12ᵉ |
| **Fermeture automatique** | Session close après 30 minutes sans activité |
| **Code de récupération** | 20 caractères, 100 bits d'entropie, affiché **une seule fois**, stocké sous forme dérivée |
| **Message d'échec unique** | On ne distingue jamais « compte inconnu » de « mot de passe faux » |
| **Politique de sécurité du contenu** | `script-src 'self'` sans `unsafe-eval` ; aucune origine tierce autorisée |
| **Aucune sortie réseau** | Vérifié : zéro `fetch`, `XMLHttpRequest`, `sendBeacon` ou `WebSocket` dans le code applicatif |

Le mot de passe lui-même **n'est jamais stocké**, sous aucune forme réversible.

### Pourquoi 650 000 itérations

C'est au-dessus de la recommandation OWASP de 600 000 pour PBKDF2-SHA256. Le
coût se paie une fois par déverrouillage, de l'ordre d'une demi-seconde. Pour
quelqu'un qui tenterait des millions de mots de passe, ce même coût rend
l'opération sans intérêt.

### Pourquoi la temporisation ne bloque jamais définitivement

Un verrouillage permanent offrirait à un tiers malveillant un moyen simple
d'enfermer le propriétaire hors de sa propre comptabilité : il suffirait de
saisir douze mots de passe faux. Le délai croît fortement, mais il s'écoule
toujours.

---

## Ce qui n'est PAS protégé

**Les données ne sont pas chiffrées.** Elles sont lisibles dans les outils de
développement du navigateur, par quiconque a la main sur la machine déverrouillée.

Le mot de passe protège contre l'accès **occasionnel** : un poste laissé ouvert,
un bureau partagé, un collègue de passage. Il ne protège pas contre quelqu'un
qui a physiquement accès à l'ordinateur et sait où chercher.

### Pourquoi ce choix est délibéré

Chiffrer les données à partir du mot de passe est techniquement simple. Sa
conséquence ne l'est pas : **un mot de passe oublié détruirait définitivement
toute la comptabilité de l'agence**, sans aucun recours possible — c'est le
principe même du chiffrement.

Sur une machine personnelle, le risque d'oubli est nettement plus élevé que le
risque d'intrusion physique. Le chiffrement transformerait un incident
improbable en catastrophe certaine.

**Ce choix se rediscute** si l'application devait tourner sur un poste partagé
ou un ordinateur portable emporté en déplacement. Il demanderait alors un
accord explicite, et une stratégie de sauvegarde hors ligne irréprochable.

---

## Ce qui reste à faire

| Point | État |
|---|---|
| Journal d'audit des accès et modifications | Non fait |
| Verrouillage manuel immédiat depuis l'interface | Non fait |
| Durcissement automatique du coût PBKDF2 à la reconnexion | Non fait |
| Revue des 23 vulnérabilités signalées par `npm audit` | Non fait |

---

## Vérifier soi-même

```bash
npm run test -- src/infra/crypto src/domain/lockout
```

Et pour confirmer qu'aucune donnée ne sort de l'appareil :

```bash
grep -rnE "fetch\(|XMLHttpRequest|sendBeacon|new WebSocket" src --include=*.ts --include=*.tsx
```

La seule URL externe du code est le lien vers le site de l'agence, en pied de
page — une navigation déclenchée par un clic, jamais une requête automatique.

---

## Vulnérabilités des dépendances

État au 23 septembre 2026, après traitement : **23 → 7 vulnérabilités**.

### Traitées

Quinze vulnérabilités transitives corrigées par mise à jour du fichier de
verrouillage, sans changer aucune version déclarée : `tar`, `lodash`,
`brace-expansion`, `browserslist`, `fast-uri`, `nanoid`, `postcss`,
`serialize-javascript`, `dompurify`, `fflate`, `@babel/*`, `workbox-build`,
`@rollup/plugin-terser`, `baseline-browser-mapping`.

**`react-router` 7.13.0 → 7.18.4** — c'était la seule vulnérabilité de gravité
haute portant sur du code réellement livré au navigateur.

### Non traitées, et pourquoi

| Paquet | Gravité | Décision |
|---|---|---|
| `vitest` et sa dépendance `@vitest/mocker` | critique | **Conservé en 2.x.** Le correctif impose vitest 5, qui casse la configuration (`assetsInclude`) et rend les 276 tests inexécutables. Essayé, constaté, annulé |
| `vite` | haute | Lié au même correctif majeur |
| `@tailwindcss/vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `vite-node` | basses | Conséquences de la version de `vite` |

**Ce qui justifie de les laisser** : aucun de ces paquets ne part dans le
navigateur. Ce sont des outils de construction et de test. Les exploiter
suppose de pouvoir déjà exécuter du code sur la machine de développement —
auquel cas la vulnérabilité n'est plus le problème principal.

**Ce qui reste à faire** : la migration vers vitest 5 et vite 7, comme un
chantier à part entière, avec revalidation complète de la suite de tests. Ce
n'est pas un `npm audit fix`.

### Vérifier

```bash
npm audit
```
