# 📖 Guide Utilisateur - M.G.N Manager

Bienvenue dans **M.G.N Manager**, votre solution complète de gestion d'entreprise !

## 🚀 Démarrage Rapide

### Premier Lancement
L'application démarre automatiquement avec un compte administrateur de démonstration. Vous êtes directement connecté et prêt à explorer toutes les fonctionnalités.

### Navigation
Utilisez la **barre latérale gauche** pour naviguer entre les différentes sections :
- 🏠 **Tableau de Bord** - Vue d'ensemble
- 👥 **Clients** - Gestion CRM
- 📁 **Projets** - Suivi de projets
- 💰 **Facturation** - Gestion des factures
- 🎧 **Support** - Tickets clients
- ❓ **Aide** - Documentation

## 🎨 Personnalisation

### Changer le Thème
Cliquez sur l'icône **☀️ Soleil** ou **🌙 Lune** en haut à droite pour basculer entre :
- **Mode Clair** - Idéal pour le travail de jour
- **Mode Sombre** - Confortable pour les yeux en soirée

Votre préférence est automatiquement sauvegardée.

### Changer la Langue
Cliquez sur le bouton **🌐 Globe** pour basculer entre :
- **FR** - Français
- **EN** - English

## 📊 Tableau de Bord

### Cartes Statistiques
- **Chiffre d'Affaires** - Revenus totaux
- **Projets Actifs** - Nombre de projets en cours
- **Clients Total** - Base clientèle
- **Factures en Attente** - À encaisser

### Graphique de Revenus
Visualisez l'évolution mensuelle de vos revenus sur 6 mois.

### Projets Récents
Liste des 5 derniers projets avec leur progression.

## 👥 Gestion Clients (CRM)

### Ajouter un Client
1. Cliquez sur **+ Nouveau Client**
2. Remplissez les informations (Nom, Email, Téléphone, Entreprise)
3. Enregistrez

### Rechercher un Client
Utilisez la barre de recherche pour trouver rapidement un client par :
- Nom
- Email
- Entreprise

### Actions Disponibles
- **Voir** - Consulter la fiche complète
- **Modifier** - Éditer les informations
- **Supprimer** - Retirer de la base

## 📁 Gestion de Projets

### Créer un Projet
1. Cliquez sur **+ Nouveau Projet**
2. Remplissez :
   - Nom du projet
   - Client associé
   - Statut (En attente / En cours / Terminé)
   - Date d'échéance
   - Budget
3. Sauvegardez

### Filtrer les Projets
- **Recherche** - Par nom ou client
- **Filtre de Statut** :
  - Tous
  - En Cours
  - Terminé
  - En Attente

### Suivre la Progression
Chaque projet affiche :
- **Barre de progression** (0-100%)
- **Badge de statut** coloré
- **Date d'échéance**
- **Budget alloué**

### Modifier/Supprimer
- Cliquez sur **✏️ Modifier** pour éditer
- Cliquez sur **🗑️ Supprimer** pour retirer

## 💰 Facturation

### Types de Factures
- **✅ Payée** - Réglée par le client
- **⏳ En Attente** - Envoyée, en attente de paiement
- **⚠️ En Retard** - Échue, non payée

### Filtrer les Factures
Cliquez sur les badges de statut pour afficher uniquement :
- Toutes
- Payées
- En Attente
- En Retard

### Actions
- **Télécharger** - Export PDF (fonctionnalité à venir)
- **Relancer** - Envoyer rappel (à venir)

### Total
Le montant total des factures filtrées s'affiche en haut de page.

## 🎧 Support & Maintenance

### Système de Tickets
Gérez les demandes clients avec :
- **Statut** :
  - 🔴 Ouvert
  - 🔵 En Cours
  - ✅ Fermé
- **Priorité** :
  - High (Haute)
  - Medium (Moyenne)
  - Low (Basse)

### Créer un Ticket
1. Cliquez sur **+ Nouveau Ticket**
2. Renseignez :
   - Titre du problème
   - Client concerné
   - Priorité
   - Description
3. Créez

### Filtrage
Utilisez les boutons de statut pour afficher uniquement certains tickets.

## ❓ Centre d'Aide

### Ressources Disponibles
- 📚 **Documentation** - Guides complets
- 🎥 **Vidéos** - Tutoriels pas-à-pas
- 💬 **Forum** - Communauté d'utilisateurs
- ❔ **FAQ** - Questions fréquentes

### FAQs
Cliquez sur une question pour voir la réponse détaillée.

### Installation PWA
Instructions complètes pour installer l'application comme une app native sur :
- Desktop (Chrome, Edge)
- iOS (Safari)
- Android (Chrome)

## 📱 Progressive Web App (PWA)

### Avantages
- ⚡ **Rapide** - Chargement instantané
- 📴 **Hors-ligne** - Accès sans internet (à venir)
- 🔔 **Notifications** - Alertes push (à venir)
- 💾 **Installation** - Comme une app native

### Installation Desktop
1. Ouvrez l'app dans Chrome/Edge
2. Cliquez sur l'icône d'installation (barre d'adresse)
3. Ou Menu → "Installer M.G.N Manager"
4. L'app apparaît sur votre bureau

### Installation Mobile

**iOS (Safari)** :
1. Ouvrez l'app
2. Tapez le bouton **Partager** (en bas)
3. Sélectionnez **"Ajouter à l'écran d'accueil"**
4. Confirmez

**Android (Chrome)** :
1. Ouvrez l'app
2. Menu (3 points) → **"Installer l'application"**
3. Confirmez
4. Icône sur écran d'accueil

## ⚙️ Paramètres Avancés

### Gestion des Permissions
- **Admin** - Accès complet
- **Équipe** - Accès limité (à venir)

### Notifications (À venir)
- Factures en retard
- Projets arrivant à échéance
- Nouveaux tickets support

### Export de Données (À venir)
- CSV pour Excel
- PDF pour rapports
- Backup complet

## 🔐 Sécurité & Confidentialité

### Données Mockées
Cette version de démonstration utilise des **données fictives** stockées en local.

### Pour Production
Pour une utilisation professionnelle réelle :
- ✅ Connectez une base de données (Supabase/Firebase)
- ✅ Activez l'authentification sécurisée
- ✅ Chiffrez les données sensibles
- ✅ Sauvegardez régulièrement

**⚠️ Important** : Ne stockez pas de données sensibles ou personnelles dans cette version de démo.

## 🆘 Besoin d'Aide ?

### Support Technique
- 📧 Email : support@mgn-manager.com (fictif)
- 💬 Chat : Section Support de l'app
- 📞 Téléphone : +33 1 23 45 67 89 (fictif)

### Raccourcis Clavier (À venir)
- `Ctrl + K` - Recherche globale
- `Ctrl + N` - Nouveau projet
- `Ctrl + /` - Aide
- `Ctrl + ,` - Paramètres

## 📝 Conseils & Astuces

### Organisation
1. **Créez vos clients d'abord** avant d'ajouter des projets
2. **Utilisez les filtres** pour trouver rapidement l'information
3. **Mettez à jour la progression** régulièrement
4. **Surveillez les factures en retard** dans le dashboard

### Performance
- Utilisez le **mode sombre** pour économiser la batterie
- **Installez la PWA** pour un lancement plus rapide
- **Fermez les onglets inutiles** pour libérer la mémoire

### Productivité
- Consultez le **Dashboard** chaque matin
- Triez les **tickets par priorité**
- Filtrez les **projets actifs** pour vous concentrer
- Utilisez la **recherche** plutôt que de faire défiler

## 🎯 Prochainement

### Fonctionnalités en Développement
- [ ] Mode hors-ligne complet
- [ ] Génération PDF factures
- [ ] Time-tracking intégré
- [ ] Tableau Kanban
- [ ] Calendrier visuel
- [ ] Analytics avancées
- [ ] Export Excel/CSV
- [ ] Notifications Push
- [ ] Application mobile native
- [ ] Intégrations (Stripe, PayPal, etc.)

## 📞 Contact

**M.G.N Manager**  
Version 1.0.0  
Avril 2026

---

💡 **Astuce** : Appuyez sur le bouton **?** dans la barre latérale à tout moment pour revenir à cette aide !
