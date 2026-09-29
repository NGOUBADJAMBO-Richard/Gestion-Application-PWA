# Guide utilisateur — CodeWave Studio

> Ce guide décrit ce que l'application fait réellement. La version précédente
> conseillait de « connecter Supabase ou Firebase » et d'« activer
> l'authentification sécurisée » — des étapes qui n'ont jamais existé.

---

## 1. Première ouverture

L'application demande de **protéger l'appareil** : une adresse e-mail pour
identifier le compte, et un mot de passe d'au moins dix caractères.

Un **code de récupération** s'affiche ensuite. Vingt caractères, en quatre
groupes. Il n'est montré **qu'une seule fois**.

> **Note-le sur papier et range-le ailleurs que sur cet ordinateur.**
> Sans lui ni le mot de passe, les données ne sont plus accessibles. Il n'y a
> pas de « mot de passe oublié » par e-mail : il n'y a pas de serveur.

---

## 2. Renseigner l'entreprise

**Paramètres**, avant toute facture.

Sont **obligatoires** pour émettre : la raison sociale et l'adresse.
L'application bloque tant qu'elles manquent, plutôt que de laisser émettre une
facture incomplète — qu'il faudrait ensuite annuler par un avoir.

Sont **recommandés** : NIF, RCCM, régime fiscal. L'application les signale
sans bloquer : la liste exacte des mentions obligatoires n'étant pas connue,
elle n'a pas à trancher à la place d'un comptable.

**Le taux de TVA de 18 %** est modifiable. Il n'a pas été vérifié auprès d'une
source officielle — fais-le confirmer.

---

## 3. Créer les clients

**Clients → Nouveau client.**

Chaque projet, facture et ticket se rattache à un client de ce répertoire.
Le rattachement se fait **par identifiant** : renommer un client met à jour
tous ses documents, il n'y a jamais de nom à resaisir.

**Archiver plutôt que supprimer.** Un client porteur de factures émises ne se
supprime pas — la conservation comptable l'interdit. L'archivage le sort des
listes sans rien détruire.

---

## 4. Facturer

### Le cycle en trois temps

1. **Brouillon** — pas de numéro. Modifiable et supprimable librement.
2. **Émission** — le numéro est attribué à ce moment (`FAC-2026-001`).
3. **Émise** — plus de modification, plus de suppression.

Ce n'est pas une contrainte arbitraire : un numéro supprimé laisse un trou
dans la séquence comptable, et une facture remise à un client ne se corrige
pas en douce.

### Corriger une facture émise

On émet un **avoir**. Le bouton en forme de flèche de retour crée un avoir
reprenant les lignes au négatif. À son émission, la facture d'origine passe
en « annulée ».

### Devis

Onglet **Devis**. Une fois émis et accepté, le bouton **Facturer** crée une
facture reprenant les lignes. Le devis reste en place : il justifie ce qui
avait été proposé.

### Encaisser

Bouton **Encaisser** sur une facture émise. Le solde restant est pré-rempli.
Plusieurs encaissements peuvent se succéder ; la facture passe payée quand le
solde tombe à zéro.

### Le retard est automatique

Une facture dont l'échéance est dépassée bascule seule en « en retard », avec
le nombre de jours. Rien à cocher.

---

## 5. Sauvegarder — le point le plus important

**Mon compte → Données et sauvegarde → Exporter une sauvegarde.**

Toutes les données vivent dans ce navigateur, et nulle part ailleurs. Vider
les données du site, changer d'ordinateur ou réinstaller le système **efface
tout**. Il n'existe aucune copie ailleurs.

**Prends l'habitude d'exporter chaque semaine**, et range le fichier sur une
clé ou un disque séparé.

### Restaurer

Choisis le fichier. L'application affiche **ce qui sera écrasé, ajouté et
perdu**, collection par collection, et attend confirmation. Un fichier modifié
après export est refusé : son empreinte ne correspond plus.

---

## 6. Installer l'application

Une proposition d'installation apparaît, ou passe par le menu du navigateur.
Une fois installée, elle s'ouvre dans sa propre fenêtre et fonctionne **sans
connexion**.

Quand une nouvelle version est prête, un message le signale et laisse
recharger au moment choisi — jamais au milieu d'une saisie.

---

## 7. Ce qu'il faut savoir sur la sécurité

Le mot de passe protège contre l'accès **occasionnel** : un poste laissé
ouvert, un bureau partagé.

**Il ne chiffre pas les données.** Quelqu'un qui a la machine en main et sait
où chercher peut les lire. Ce choix est délibéré : chiffrer voudrait dire
qu'un mot de passe oublié détruit définitivement la comptabilité.

La session se ferme seule après **30 minutes** d'inactivité.

---

## 8. Questions courantes

**Puis-je l'utiliser sur deux ordinateurs ?**
Pas en synchronisation. Exporte d'un côté, restaure de l'autre — en sachant
que la restauration écrase.

**Puis-je revenir sur une suppression ?**
Oui, les suppressions sont douces : l'élément part en corbeille.

**Que se passe-t-il si le stockage est plein ?**
L'application alerte au-delà de 80 % d'occupation et refuse d'écrire plutôt
que de perdre la saisie en silence.

**Y a-t-il plusieurs comptes ?**
Non. Un seul accès par appareil.
