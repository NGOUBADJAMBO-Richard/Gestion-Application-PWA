# CodeWave Studio

Suite de gestion de **M.G.N CodeWave** — agence web à Libreville.
Clients, projets, devis, factures, avoirs, encaissements et support.

**Entièrement locale.** Aucune donnée ne quitte l'appareil, aucun serveur
n'est requis, aucun compte n'est à créer ailleurs.

---

## Démarrer

```bash
npm install
npm run dev
```

À la première ouverture, l'application demande de définir un mot de passe et
affiche **une seule fois** un code de récupération. Note-le : sans lui ni le
mot de passe, il n'y a pas d'autre issue qu'une sauvegarde exportée.

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Sert le build, seul endroit où le service worker est actif |
| `npm run verify` | **typecheck + lint + tests + build** |
| `npm test` | Tests seuls |
| `npm run test:watch` | Tests en continu |

`npm run verify` est la commande qui fait foi. Aucune de ses quatre étapes
n'est optionnelle.

---

## Ce que fait l'application

- **Clients** — répertoire, archivage, rattachement par identifiant
- **Projets** — budget, échéance, avancement
- **Facturation** — devis, factures, avoirs ; brouillon puis émission ;
  numérotation séquentielle sans trou ; TVA par tranche ; encaissements
  partiels ; retard déduit de l'échéance
- **Support** — tickets avec statut et priorité
- **Paramètres** — identité, fiscalité, mentions légales, préfixes
- **Sauvegarde** — export et restauration vérifiés par empreinte SHA-256
- **Installable** — fonctionne hors ligne une fois installée

Le détail, avec ce qui reste à faire, est dans [docs/FEATURES.md](docs/FEATURES.md).

---

## Ce qu'elle ne fait pas

| Absent | Précision |
|---|---|
| Serveur, API, base distante | Aucun. Zéro requête sortante |
| Synchronisation entre appareils | Le transfert passe par l'export de sauvegarde |
| Chiffrement des données au repos | Choix assumé — voir [docs/SECURITE.md](docs/SECURITE.md) |
| Multi-utilisateur | Un seul accès par appareil |
| Comptabilité en partie double | Pas de grand livre |
| Suivi du temps, dépenses | Pas de rentabilité par projet |

---

## Avertissement fiscal

Le taux de TVA de 18 % livré par défaut **n'a pas été vérifié auprès d'une
source officielle**, et la liste des mentions légales obligatoires n'est pas
connue. Tout est paramétrable, et rien ne doit être utilisé en production
sans validation par un comptable.

Voir [docs/FISCALITE.md](docs/FISCALITE.md).

---

## Pile technique

React 18 · TypeScript en `strict` intégral · Vite 6 · Tailwind 4 ·
React Router 7 · Radix / shadcn · Recharts · Vitest

Architecture en trois couches — `domain/ ← infra/ ← app/` — avec la direction
des dépendances appliquée par ESLint. Voir
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Documentation

| Fichier | Contenu |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Couches, stockage, migrations |
| [FEATURES.md](docs/FEATURES.md) | Ce qui est fait, ce qui ne l'est pas |
| [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Charte, jetons, contrastes calculés |
| [SECURITE.md](docs/SECURITE.md) | Ce qui est protégé, et ce qui ne l'est pas |
| [FISCALITE.md](docs/FISCALITE.md) | Paramétrage à faire valider |
| [RGPD.md](docs/RGPD.md) | Registre des traitements |
| [GUIDE-UTILISATEUR.md](docs/GUIDE-UTILISATEUR.md) | Prise en main |

---

Conçu et développé pour **M.G.N CodeWave** · [Site de l'agence](https://ngoubadjambo-richard.github.io/CodeWave/)
