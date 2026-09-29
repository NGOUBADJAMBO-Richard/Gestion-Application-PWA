# Fonctionnalités — CodeWave Studio

> État réel au 23 septembre 2026. La version précédente de ce document
> annonçait des montants en euros et un chiffre d'affaires de 328 000 € qui
> n'était qu'une valeur écrite en dur dans le code.
>
> Chaque ligne ci-dessous est soit ✅ **faite et vérifiable**, soit ❌ **à
> faire**. Rien n'est annoncé comme disponible sans l'être.

---

## Tableau de bord ✅

- Encaissé du mois, avec variation réelle face au mois précédent
- **Aucune variation n'est annoncée quand le mois précédent est vide** :
  afficher « +100 % » pour un passage de zéro à une facture serait trompeur
- Restant dû, montant et nombre de factures en retard, avec alerte cliquable
- Portefeuille des projets actifs
- Chiffre d'affaires des six derniers mois, **mois creux inclus à zéro** :
  sauter un mois vide laisserait croire à une croissance continue
- Devis et factures annulées exclus des indicateurs
- États vides explicites : un graphique muet n'apprend rien

---

## Clients ✅

- Création, modification, recherche
- **Archivage** : un client porteur de factures émises ne se supprime pas,
  la conservation comptable l'interdit. Il s'archive, ce qui le sort des
  listes sans rien détruire ni détacher
- Suppression refusée avec la raison et la liste des documents bloquants —
  **sans bouton pour passer outre**
- Fiche détaillée avec les projets réellement rattachés
- Nombre de projets compté, non saisi

---

## Projets ✅

- Création, modification, suppression protégée
- Budget, échéance, avancement
- Rattachement au client **par identifiant** : renommer un client met à jour
  tous ses documents
- Colonne **Marge** : ce que le projet a rapporté moins ce qu'il a coûté, et le
  temps passé dessus
- La suppression est refusée quand des pièces sont rattachées au projet — et
  annonce le temps qui deviendra orphelin

---

## Facturation ✅

### Trois natures de document

| Nature | Préfixe | Portée |
|---|---|---|
| Devis | `DEV-` | Aucune valeur comptable, convertible en facture |
| Facture | `FAC-` | Engage |
| Avoir | `AV-` | Annule une facture désignée |

### Cycle de vie

1. **Brouillon** — sans numéro, librement modifiable et supprimable
2. **Émission** — le numéro est attribué à ce moment, à partir des numéros
   déjà pris. Un brouillon abandonné ne laisse aucun trou dans la séquence
3. **Émise** — plus modifiable ni supprimable. Pour corriger : un avoir

### Calcul

- Montants en entiers, jamais en flottants
- TVA par tranche, calculée une fois sur la base remisée
- `HT + TVA = TTC` garanti par construction
- La colonne TVA affichée se resomme exactement au pied de facture

### Encaissements ✅

- Règlements partiels, avec moyen, date et référence
- Le statut suit le solde : la facture passe payée quand il tombe à zéro
- **Le trop-perçu est signalé, pas absorbé** : c'est soit une erreur de
  saisie, soit un avoir à établir
- Un encaissement négatif est refusé, avec renvoi vers l'avoir

### Retard ✅

Déduit de l'échéance, sans écriture en base, avec le nombre de jours affiché.
Le jour de l'échéance ne compte pas : le client a la journée.

### Avoirs ✅

Lignes reprises au négatif. `facture + avoir = 0` exactement, vérifié par test.
À l'émission de l'avoir, la facture visée passe en « annulée ». Pas de second
avoir sur une facture déjà annulée.

❌ Relances automatiques · ❌ Échéanciers · ❌ Devise multiple à l'usage

---

## Temps &amp; rentabilité ✅

### Suivi du temps

- Saisie par projet, avec durée libre : « 1h30 », « 90 » ou « 1,5h »
- La durée est stockée en **minutes entières** — jamais en heures décimales,
  dont l'accumulation d'arrondis fabrique des demi-journées fantômes
- **Coût horaire figé à la saisie** : augmenter le coût par défaut ne réécrit
  pas la marge des projets déjà livrés
- Distinction refacturable / non refacturable : une reprise offerte reste un
  coût
- Date future refusée, saisie de plus de 16 h refusée

### Dépenses

- Neuf postes fermés (sous-traitance, logiciels, hébergement, matériel,
  déplacements, communication, formation, frais, autre). Une liste libre
  produirait « Hebergement », « hébergement » et « Hosting » dans la même base
- Rattachement au projet **facultatif** : un abonnement de comptabilité est une
  charge de structure, pas le coût d'un chantier
- **Refacturée à l'identique** : la dépense reste une sortie de caisse mais ne
  pèse pas sur la marge
- Le montant saisi est celui payé, TTC. Aucune TVA n'est déduite : le régime
  fiscal réel n'est pas vérifié (voir FISCALITE.md), et une marge calculée sur
  une hypothèse fiscale fausse serait pire qu'une marge calculée sur la caisse

### Rentabilité

- Recette **hors taxes** — la TVA collectée transite, elle n'appartient pas à
  l'entreprise
- Devis et brouillons exclus : un devis est une espérance, pas une recette
- Une facture annulée reste comptée et son avoir la compense : exclure les deux
  retirerait deux fois le même montant
- Marge, taux de marge, recette par heure passée, budget consommé en coûts
- Alerte dès que les coûts dépassent le budget, **même avant la première
  facture** — c'est là que l'alerte sert
- Les angles morts sont dits, jamais comblés au hasard : pièces émises sans
  projet, temps saisi sur un projet supprimé, frais de structure non répartis.
  Une clé de répartition arbitraire fabriquerait des marges fausses

---

## Paramètres ✅

- Identité : raison sociale, forme juridique, adresse, coordonnées
- Fiscalité : NIF, RCCM, régime, **taux de TVA modifiables**
- Préfixes de numérotation, délai et conditions de règlement
- Coordonnées bancaires, mentions de pied de facture
- Durée de conservation des pièces
- Contrôle du profil : ce qui manque pour émettre une facture est **bloquant
  et annoncé**, plutôt que découvert après l'émission d'une facture incomplète

**Aucun taux, aucune mention légale, aucun préfixe n'est codé en dur** ailleurs
dans l'application.

---

## Support ✅

Tickets avec statut, priorité, client rattaché. Suppression confirmée.

❌ Historique des échanges · ❌ Temps passé par ticket · ❌ SLA

---

## Mon compte ✅

- Profil du compte local
- **Sauvegarde** : export en un clic, corbeille comprise
- **Restauration** en deux temps : le fichier est validé, comparé à l'état
  local, puis l'écran annonce collection par collection ce qui sera écrasé,
  ajouté et perdu, et attend confirmation
- Un fichier modifié après export est **refusé** : l'empreinte SHA-256 ne
  correspond plus
- Occupation du stockage, alerte au-delà de 80 %
- Demande de conservation durable au navigateur

---

## Sécurité ✅

Voir `SECURITE.md` pour le détail, y compris ce qui **n'est pas** protégé.

- PBKDF2-SHA256, 650 000 itérations, sel par appareil
- Comparaison à temps constant
- Temporisation croissante après échecs, sans blocage définitif
- Code de récupération à usage unique
- Fermeture automatique après 30 minutes d'inactivité
- CSP sans `unsafe-eval`, **aucune sortie réseau**

❌ Journal d'audit · ❌ Verrouillage manuel immédiat

---

## Application installable ✅

- Service worker, fonctionne hors ligne
- Installation proposée une fois, jamais imposée
- Mise à jour annoncée, rechargement au choix de l'utilisateur
- Icônes 192, 512 et maskable dédiée
- Raccourcis vers facture, clients, projets

---

## Interface ✅

- Charte du site portée intégralement, **25 ratios de contraste calculés**,
  tous conformes AA — voir `DESIGN-SYSTEM.md`
- Thèmes clair et sombre
- Français et anglais
- Polices auto-hébergées : aucun appel à un tiers
- `prefers-reduced-motion` respecté
- Boutons d'action nommés pour les lecteurs d'écran

❌ Audit WCAG complet · ❌ Parcours mobile vérifié écran par écran

---

## Absent du produit

| Manque | Conséquence |
|---|---|
| Comptabilité en partie double | Pas de grand livre, pas de balance |
| CodeWave Academy | Formations, sessions et apprenants ne sont pas gérés |
| Catalogue du site | Les tarifs se resaisissent au lieu d'être importés |
| Relances | Aucune automatisation sur les impayés |
| Multi-utilisateur | Un seul accès par appareil |
