# Design system — CodeWave Studio

## Origine

Ce document décrit la charte de **CodeWave Studio**, portée depuis celle du site
public de l'agence.

**Source unique** : `codewave-website-com/assets/css/base.css`.
Ce dossier est en lecture seule. L'application ne réinvente rien : quand une
valeur diverge, c'est le site qui a raison, et l'écart doit être justifié ici.

**Pourquoi l'application ne ressemblait pas au site.** Elle était construite sur
une palette de gris purs — fond `#0a0a0a`, cartes `#141414`, texte secondaire
`#888888` — alors que la charte est en bleus ardoise : `#1e293b`, `#0f172a`,
`#94a3b8`. Deux familles chromatiques distinctes. Aucun réglage de teinte ne
pouvait les rapprocher ; il fallait remplacer les jetons.

---

## Jetons de couleur

| Jeton | Clair | Sombre | Rôle |
|---|---|---|---|
| `--background` | `#f4f3f3` | `#1e293b` | Fond de l'application |
| `--foreground` | `#0f172a` | `#f1f5f9` | Texte principal |
| `--card` | `#ffffff` | `#0f172a` | Surface des cartes et tableaux |
| `--border` | `#e2e8f0` | `#334155` | Séparateurs décoratifs |
| `--input-border` | `#7c8ba1` | `#64748b` | Bordure des champs de saisie |
| `--muted-foreground` | `#475569` | `#94a3b8` | Texte secondaire |
| `--primary` | `#004AAD` | `#0062E6` | Aplats : boutons, barres, états actifs |
| `--primary-ink` | `#004AAD` | `#60A5FA` | **Accent typographique** |
| `--hero` | `#E8F0FB` | `#16213A` | Fond des en-têtes de page |
| `--destructive` | `#b42318` | `#fca5a5` | Erreur, suppression |
| `--success` | `#067647` | `#6ee7b7` | Facture payée, projet terminé |
| `--warning` | `#b54708` | `#fcd34d` | Échéance proche, en attente |

### Pourquoi `--primary` et `--primary-ink` sont deux jetons distincts

Une couleur lisible **en aplat** ne l'est pas nécessairement **en texte**.
`#004AAD` posé sur le fond sombre `#1e293b` tombe à **1,80:1** — illisible.
C'est l'erreur que la charte du site avait déjà identifiée et corrigée avec
`--primary-fg: #60A5FA`. Confondre les deux usages dans un seul jeton condamne
l'un des deux thèmes.

---

## Contrastes mesurés

Ratios calculés selon la formule WCAG 2.2 (luminance relative), et non estimés
à l'œil. Seuils : **4,5:1** pour le texte courant, **3:1** pour le texte large
et les composants d'interface.

### Thème clair

| Paire | Ratio | Seuil | Verdict |
|---|---|---|---|
| Texte principal sur fond | **16,12:1** | 4,5:1 | AAA |
| Texte principal sur carte | **17,85:1** | 4,5:1 | AAA |
| Texte secondaire sur fond | **6,84:1** | 4,5:1 | AA |
| Texte secondaire sur carte | **7,58:1** | 4,5:1 | AAA |
| Accent typographique sur fond | **7,34:1** | 4,5:1 | AAA |
| Accent typographique sur carte | **8,13:1** | 4,5:1 | AAA |
| Accent sur en-tête de page | **7,08:1** | 4,5:1 | AAA |
| Texte du CTA, début du dégradé | **8,13:1** | 4,5:1 | AAA |
| Texte du CTA, fin du dégradé | **5,40:1** | 4,5:1 | AA |
| Erreur sur carte | **6,57:1** | 4,5:1 | AA |
| Succès sur carte | **5,69:1** | 4,5:1 | AA |
| Alerte sur carte | **5,43:1** | 4,5:1 | AA |
| Bordure de champ sur carte | **3,46:1** | 3:1 | AA |

### Thème sombre

| Paire | Ratio | Seuil | Verdict |
|---|---|---|---|
| Texte principal sur fond | **13,35:1** | 4,5:1 | AAA |
| Texte principal sur carte | **16,30:1** | 4,5:1 | AAA |
| Texte secondaire sur fond | **5,71:1** | 4,5:1 | AA |
| Texte secondaire sur carte | **6,96:1** | 4,5:1 | AA |
| Accent typographique sur fond | **5,75:1** | 4,5:1 | AA |
| Accent typographique sur carte | **7,02:1** | 4,5:1 | AAA |
| Texte du CTA, début du dégradé | **8,13:1** | 4,5:1 | AAA |
| Texte du CTA, fin du dégradé | **5,40:1** | 4,5:1 | AA |
| Erreur sur carte | **9,41:1** | 4,5:1 | AAA |
| Succès sur carte | **11,71:1** | 4,5:1 | AAA |
| Alerte sur carte | **12,38:1** | 4,5:1 | AAA |
| Bordure de champ sur carte | **3,75:1** | 3:1 | AA |

### Pièges écartés

| Combinaison refusée | Ratio | Pourquoi |
|---|---|---|
| `#004AAD` en texte sur le fond sombre `#1e293b` | **1,80:1** | Sous le seuil de 3:1, même en texte large. D’où `--primary-ink: #60A5FA` en thème sombre. |
| `#64748b` en texte secondaire sur `#f4f3f3` | **4,30:1** | Échoue de peu. La charte du site le note déjà et impose `#475569`. |
| `#e2e8f0` en bordure de champ sur blanc | **1,23:1** | Une bordure de champ est un composant d’interface (WCAG 1.4.11), pas une décoration. D’où `--input-border`. |
| `#334155` en bordure de champ sur `#0f172a` | **1,72:1** | Même raison, en thème sombre. |
---

## Typographie

| Usage | Police | Graisse | Détail |
|---|---|---|---|
| Titres, `.font-display` | **Syne** | 700 | `letter-spacing: -0.01em`, interligne 1,25 |
| Corps, interface | **Space Grotesk** | 400 / 500 | Fonte variable, une seule requête |
| Boutons d'action | **Syne** | 700 | Majuscules, `letter-spacing: 0.06em` |
| Intertitres `.section-label` | Chasse fixe | 700 | 11 px, `0.12em`, préfixé de `// ` |
| Montants, numéros | Space Grotesk | 500 | Chiffres tabulaires à venir au LOT 4 |

**Auto-hébergement.** Les deux familles étaient chargées depuis
`fonts.googleapis.com`. Pour une application censée fonctionner sur l'appareil,
c'est un défaut double : l'interface perd sa typographie dès que la connexion
tombe — soit exactement le cas d'usage d'une PWA — et chaque ouverture signale
l'usage à un tiers. Les fichiers `woff2` sont désormais servis depuis le
paquet et empaquetés par Vite. **Aucune requête ne sort de l'appareil.**

---

## Composants — signatures reprises du site

| Élément | Règle |
|---|---|
| **Carte** | `border-top: 3px solid var(--primary)` |
| **Carte cliquable** | Survol : `translateY(-2px)` + `0 12px 28px rgba(0,74,173,.12)` |
| **CTA primaire** | `linear-gradient(135deg,#004AAD,#0062E6)`, angles droits, Syne 700 majuscules, bordure 2 px |
| **Bouton secondaire** | Bordure 2 px, angles droits, Syne 700 majuscules, accent au survol |
| **Pastille de filtre** | Angles droits, Syne 600, 13 px, pleine au survol et à l'état actif |
| **Intertitre** | `.section-label`, préfixé de `// ` |
| **Fond d'ondes** | `.wave-surface`, opacité 10 % (15 % en sombre) |

### Le survol des cartes n'est pas appliqué partout

Le site relève ses cartes au survol parce qu'elles sont cliquables. Dans une
application de gestion, la plupart des cartes sont des conteneurs de lecture :
appliquer l'effet à toutes ferait vibrer le tableau de bord au moindre passage
de souris. L'effet est donc réservé aux cartes réellement interactives —
`<a>`, `<button>`, ou la classe explicite `.card-interactive`.

### Le fond d'ondes n'est pas appliqué partout

La charte prévoit des ondes à 10 %. Derrière un tableau de factures, un motif
même discret gêne la lecture des montants — et un montant mal lu est une erreur
comptable. Les ondes sont réservées aux en-têtes de page et à l'écran de
connexion, via `.wave-surface`.

---

## Arbitrage de rayon

La charte du site impose `border-radius: 0` aux boutons, pastilles et cartes.
Appliqué tel quel à une application de gestion, tout devient anguleux : les
champs de formulaire, les listes déroulantes, les fenêtres modales, les
badges de statut. C'est juste pour une page de présentation, hostile pour un
outil utilisé plusieurs heures par jour.

**Règle retenue**, conforme à ce que demande la spécification :

| Élément | Rayon | Raison |
|---|---|---|
| Boutons d'action (`default`, `outline`, `destructive`) | **0** | Signature de marque, la plus visible |
| Pastilles de filtre | **0** | Idem |
| Cartes, champs, listes, badges, fenêtres | `0.5rem` | Densité et confort de lecture |
| Boutons icône | `0.375rem` | Ce ne sont pas des actions engageantes |

Le rayon shadcn d'origine était `0.625rem` : ramené à `0.5rem`, plus proche de
la sobriété du site sans basculer dans l'angle vif.

---

## Mouvement

- Transitions de 0,2 s sur la transformation et l'ombre. Jamais sur `all`.
- Aucune animation de fond permanente : le site en a, une application de
  gestion consultée toute la journée n'en a pas besoin.
- `prefers-reduced-motion: reduce` neutralise animations et transitions.
  Une décoration ne s'impose pas à qui la refuse.

---

## Ce qui n'est pas repris du site, et pourquoi

| Élément du site | Décision | Raison |
|---|---|---|
| Barre de progression de défilement | Écarté | Une application n'est pas une page qu'on fait défiler |
| Bouton WhatsApp flottant | Écarté | C'est un canal de prospection, pas un outil interne |
| Halos radiaux en fond de page | Écarté | Dont un vert `#009e60`, absent de la charte — vestige d'une déclinaison aux couleurs du drapeau |
| Ondes animées en fond permanent | Réduit | Conservé en en-tête seulement (voir plus haut) |
| Curseur personnalisé, effets d'apparition | Écarté | Coût d'attention injustifié dans un outil de travail |

---

## Vérifier

```bash
npm run build
```

Puis, dans l'application : basculer le thème clair/sombre avec le bouton en
haut à droite et vérifier qu'aucun texte ne devient illisible, qu'aucune carte
ne perd son liseré bleu, et qu'aucun bouton d'action ne revient à des angles
arrondis.
