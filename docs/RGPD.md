# Protection des données — CodeWave Studio

> Le stockage local **n'exonère de rien**. Dès lors que l'application conserve
> le nom, l'adresse électronique et le téléphone de personnes physiques, elle
> traite des données à caractère personnel, et l'agence en est responsable.

---

## Registre des traitements

### 1. Gestion de la relation client

| | |
|---|---|
| **Finalité** | Établir devis et factures, suivre les projets et le support |
| **Base légale** | Exécution d'un contrat, et obligation légale pour la facturation |
| **Personnes concernées** | Interlocuteurs des entreprises clientes |
| **Données** | Nom, fonction, entreprise, adresse électronique, téléphone |
| **Durée** | Durée de la relation, puis conservation comptable paramétrable (10 ans par défaut) |
| **Destinataires** | Personne. Les données ne quittent pas l'appareil |
| **Transferts hors UE** | Aucun |
| **Sous-traitants** | Aucun |

### 2. Facturation et comptabilité

| | |
|---|---|
| **Finalité** | Émettre les documents commerciaux et justifier les écritures |
| **Base légale** | Obligation légale |
| **Données** | Identité du client, montants, dates, encaissements |
| **Durée** | Durée légale de conservation des pièces comptables |
| **Particularité** | Ces données **ne peuvent pas être effacées à la demande** tant que l'obligation de conservation court |

### 3. Accès à l'application

| | |
|---|---|
| **Finalité** | Empêcher l'accès occasionnel à l'outil |
| **Données** | Adresse électronique du compte, dérivation du mot de passe, horodatage d'activité |
| **Durée** | Tant que l'accès existe sur l'appareil |
| **Précision** | Le mot de passe n'est **jamais** conservé, sous aucune forme réversible |

---

## Minimisation

L'application ne demande que ce qui sert à facturer et à suivre un projet.
Elle ne collecte **ni** date de naissance, **ni** identifiant national, **ni**
donnée bancaire du client, **ni** statistique d'usage, **ni** adresse IP.

Il n'y a **aucune mesure d'audience, aucune télémétrie, aucun traceur**. C'est
vérifiable : `grep -rn "fetch(\|XMLHttpRequest\|sendBeacon" src` ne renvoie
rien dans le code applicatif.

---

## Droits des personnes

| Droit | État | Comment |
|---|---|---|
| **Accès** | ✅ | L'export de sauvegarde contient l'intégralité des données, en JSON lisible |
| **Rectification** | ✅ | Modification directe de la fiche client |
| **Effacement** | 🟡 Partiel | Un client sans facture émise se supprime. Avec factures, l'effacement est **légitimement refusé** et l'archivage proposé — l'interface explique pourquoi |
| **Portabilité** | ✅ | Format JSON ouvert et documenté |
| **Opposition** | ➖ | Sans objet : aucun traitement à des fins de prospection |
| **Limitation** | 🟡 | L'archivage retire le client des listes actives |

### Export par client

❌ **À faire.** L'export actuel couvre toutes les données d'un coup. Un export
restreint à une personne, pour répondre à une demande d'accès individuelle,
reste à implémenter.

---

## Sécurité des données

Détaillée dans `SECURITE.md`. En résumé, sans rien enjoliver :

| | |
|---|---|
| Accès protégé par mot de passe | ✅ PBKDF2, 650 000 itérations |
| Fermeture automatique | ✅ 30 minutes d'inactivité |
| Aucune transmission | ✅ Vérifié |
| **Chiffrement au repos** | ❌ **Non.** Choix assumé : un mot de passe oublié détruirait définitivement la comptabilité |
| Journal des accès | ❌ À faire |

**Conséquence à assumer** : toute personne ayant accès à la session ouverte de
l'ordinateur peut lire les données via les outils de développement du
navigateur. La protection physique du poste fait donc partie des mesures de
sécurité, et cela doit être dit à l'équipe.

---

## Violation de données

En cas de perte ou d'accès non autorisé — vol de l'ordinateur, poste
compromis — le responsable de traitement doit évaluer le risque et, le cas
échéant, notifier l'autorité compétente. **L'application ne le fera pas à sa
place** : elle ne tient aucun journal d'accès permettant de constater une
intrusion. C'est une limite connue.

---

## À faire

1. Export restreint à un client, pour une demande d'accès individuelle
2. Journal d'audit des accès et des modifications
3. Alerte sur les données dépassant la durée de conservation paramétrée
4. Mention d'information à remettre aux clients sur le traitement de leurs
   données
