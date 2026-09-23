# Paramétrage fiscal — à faire valider

> **Avertissement, à lire avant tout usage réel.**
>
> Ce document n'est pas un avis fiscal. Les valeurs par défaut livrées avec
> l'application ont été choisies comme point de départ raisonnable, **pas
> vérifiées auprès d'une source officielle**. Elles doivent être confirmées
> par un professionnel du chiffre avant d'émettre une seule facture à un
> client.

---

## Ce qui est paramétrable

Tout. Aucun taux, aucune mention, aucun préfixe n'est écrit en dur dans le
code. L'ensemble vit dans **Paramètres**, et le code s'y réfère.

| Réglage | Valeur livrée | Vérifié ? |
|---|---|---|
| Taux de TVA normal | **18 %** | ❌ **Non** |
| Taux exonéré | 0 %, avec mention | ❌ Non |
| Taux export | 0 %, avec mention | ❌ Non |
| Devise | XAF (franc CFA BEAC) | ✅ Oui — devise de l'agence |
| Décimales du XAF | 0 | ✅ Oui — le franc CFA n'a pas de subdivision en usage |
| Délai de paiement | 30 jours | ➖ Choix commercial, pas fiscal |
| Conservation des pièces | 10 ans | ❌ Non |
| Préfixes DEV / FAC / AV | — | ➖ Usage, sans contrainte connue |

---

## Le taux de 18 %

C'est le taux de TVA gabonais usuellement cité. **Je ne l'ai pas vérifié
auprès d'une source fiscale officielle**, et il peut exister des taux réduits,
des régimes particuliers ou des exonérations sectorielles qui s'appliquent à
tout ou partie de l'activité de l'agence.

L'application ne l'impose nulle part : il est modifiable, on peut en ajouter,
en supprimer, et désigner celui appliqué par défaut aux nouvelles lignes.

---

## Mentions obligatoires sur facture

**Je ne connais pas la liste exacte applicable au Gabon.** Les champs suivants
sont prévus, libres, et reportés sur les documents :

- Numéro d'identification fiscale (NIF)
- Registre du commerce (RCCM)
- Régime fiscal
- Mentions libres de pied de facture, une par ligne

L'écran Paramètres signale l'absence de NIF et de RCCM comme un **rappel**, pas
comme un blocage : ne connaissant pas l'obligation exacte, l'application n'a
pas à trancher à la place d'un comptable.

Sont en revanche **bloquants**, parce qu'aucune facture n'est concevable sans
eux : la raison sociale et l'adresse.

---

## Ce que l'application garantit déjà

Indépendamment du paramétrage, ces propriétés sont assurées et testées :

| Garantie | Vérification |
|---|---|
| `HT + TVA = TTC` exactement | Test sur 2 000 combinaisons générées |
| Aucun montant en flottant | Entiers d'unité mineure, partout |
| TVA calculée une fois par taux | Sur la base remisée |
| Numérotation séquentielle, sans trou | Attribution à l'émission uniquement |
| Document émis figé | Ni modification ni suppression |
| Annulation par avoir | `facture + avoir = 0` exactement |
| Détection des trous de séquence | `findSequenceGaps`, sans correction automatique |

**La numérotation n'est jamais corrigée automatiquement.** Renuméroter un
document émis serait une faute plus grave que le trou lui-même ; l'anomalie est
signalée, à charge de l'expliquer.

---

## À faire valider par un comptable

1. Le taux de TVA applicable, et l'existence de taux réduits
2. La liste exacte des mentions obligatoires
3. La durée légale de conservation
4. Le format de numérotation attendu, s'il est encadré
5. Le traitement des acomptes au regard de la TVA — l'application les
   enregistre comme encaissements, sans écriture de TVA sur acompte
6. Le sort d'un avoir partiel : seule l'annulation totale est implémentée

---

## Journal des décisions

| Date | Décision | Statut |
|---|---|---|
| 23/09/2026 | 18 % retenu comme taux par défaut | **Non vérifié**, en attente de validation |
| 23/09/2026 | XAF à 0 décimale | Confirmé |
| 23/09/2026 | Mentions légales en champs libres | Assumé, faute de liste de référence |
