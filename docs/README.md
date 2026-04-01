# 🚀 M.G.N Manager

**Application de Gestion Complète - Progressive Web App**

Une solution professionnelle tout-en-un pour la gestion d'entreprise : CRM, Projets, Facturation, Support.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)

## ✨ Fonctionnalités

### 📊 Tableau de Bord
- Vue d'ensemble en temps réel
- Statistiques clés (Revenus, Projets, Clients, Factures)
- Graphique de revenus mensuel
- Liste des projets récents

### 👥 Gestion Clientèle (CRM)
- Base de données clients complète
- Fiches détaillées avec contact
- Historique des projets par client
- Recherche et filtrage avancés

### 📁 Gestion de Projets
- CRUD complet (Create, Read, Update, Delete)
- Suivi de progression en temps réel
- Gestion des délais et budgets
- Filtrage multi-critères
- Badges de statut visuels

### 💰 Facturation & Devis
- Génération de factures
- Suivi des paiements (Payé, En attente, En retard)
- Calcul automatique des totaux
- Export PDF (à venir)

### 🎧 Support & Maintenance
- Système de tickets
- Gestion des priorités
- Statuts de suivi
- Timeline des interventions

### ❓ Centre d'Aide
- Documentation intégrée
- FAQs interactives
- Guides d'installation PWA
- Tutoriels vidéo (à venir)

## 🎨 Design & UX

### Thème
- **Mode Clair** - Interface professionnelle épurée
- **Mode Sombre** - Confort visuel pour travail prolongé
- Transition fluide entre les modes
- Sauvegarde automatique des préférences

### Typographie
- **Titres** : Syne (Google Fonts)
- **Corps** : Space Grotesk (Google Fonts)
- Hiérarchie claire et lisible

### Couleurs Corporate
- **Primaire** : `#004aad` (Bleu professionnel)
- **Secondaire** : `#545454` (Graphite élégant)
- Palette harmonieuse en Light/Dark

### Responsive Design
- Mobile-first approach
- Adaptatif de 320px à 4K
- Sidebar collapsible sur mobile
- Grilles fluides et flexibles

## 🌐 Internationalisation

- 🇫🇷 **Français** (par défaut)
- 🇬🇧 **English**
- Changement instantané de langue
- Traductions complètes de l'interface

## 📱 Progressive Web App

### Installation
L'application peut être installée comme une app native sur :
- 💻 **Desktop** (Chrome, Edge, Safari)
- 📱 **iOS** (Safari)
- 🤖 **Android** (Chrome)

### Avantages PWA
- ⚡ Chargement ultra-rapide
- 📴 Mode hors-ligne (à venir)
- 🔔 Notifications Push (à venir)
- 💾 Installation sans store
- 🔄 Mises à jour automatiques

## 🛠️ Stack Technique

### Frontend
- **React** 18.3.1 - Bibliothèque UI
- **TypeScript** - Typage statique
- **Vite** 6.3.5 - Bundler moderne
- **React Router** 7.13.0 - Routing

### Styling
- **Tailwind CSS** 4.1.12 - Framework CSS
- **Radix UI** - Composants accessibles
- **shadcn/ui** - Design system

### Visualisation
- **Recharts** 2.15.2 - Graphiques
- **Lucide React** - Icônes

### State Management
- React Context API
- localStorage pour persistance

## 📦 Installation

### Prérequis
- Node.js 18+ 
- pnpm, npm ou yarn

### Cloner le Projet
```bash
git clone https://github.com/votre-org/mgn-manager.git
cd mgn-manager
```

### Installer les Dépendances
```bash
npm install
# ou
pnpm install
# ou
yarn install
```

### Lancer en Développement
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Build Production
```bash
npm run build
```

Les fichiers optimisés seront dans `/dist`

## 📁 Structure du Projet

```
src/
├── app/
│   ├── contexts/          # State management
│   ├── data/              # Mock data
│   ├── pages/             # Pages principales
│   ├── components/        # Composants React
│   ├── routes.tsx         # Configuration routing
│   └── App.tsx            # Composant racine
├── styles/                # CSS globaux
└── main.tsx               # Point d'entrée
```

Pour plus de détails, consultez [ARCHITECTURE.md](./ARCHITECTURE.md)

## 📖 Documentation

- **[Guide Utilisateur](./GUIDE-UTILISATEUR.md)** - Mode d'emploi complet
- **[Architecture](./ARCHITECTURE.md)** - Documentation technique
- **[PWA Guide](./README-PWA.md)** - Configuration PWA

## 🚀 Déploiement

### Netlify
```bash
npm run build
# Déployez le dossier /dist
```

### Vercel
```bash
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🔐 Sécurité

### Version Démo
Cette version utilise des **données mockées** et une authentification simulée.

### Pour Production
⚠️ **Important** : Pour un usage professionnel, vous devez :

1. **Backend** : Connecter Supabase ou Firebase
2. **Auth** : Implémenter JWT ou OAuth
3. **HTTPS** : Obligatoire en production
4. **Secrets** : Variables d'environnement sécurisées
5. **Backup** : Sauvegardes automatiques

Consultez [ARCHITECTURE.md](./ARCHITECTURE.md) pour les recommandations.

## 🧪 Tests (À venir)

```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

## 🛣️ Roadmap

### v1.1 (Q2 2026)
- [ ] Mode hors-ligne complet
- [ ] Service Worker
- [ ] Génération PDF factures
- [ ] Export CSV/Excel

### v1.2 (Q3 2026)
- [ ] Time-tracking
- [ ] Tableau Kanban
- [ ] Calendrier visuel
- [ ] Notifications Push

### v2.0 (Q4 2026)
- [ ] Application mobile native (Flutter)
- [ ] Analytics avancées
- [ ] Intégrations (Stripe, PayPal)
- [ ] API publique

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commitez vos changements (`git commit -m 'Ajout fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

## 📄 Licence

MIT License - voir [LICENSE](./LICENSE) pour plus de détails.

## 👨‍💻 Auteurs

- **Développement** - Architecture & Code
- **Design** - UI/UX Design System
- **Documentation** - Guides & Tutoriels

## 🙏 Remerciements

- [React](https://react.dev) - Bibliothèque UI
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS
- [Radix UI](https://radix-ui.com) - Composants accessibles
- [shadcn/ui](https://ui.shadcn.com) - Design system
- [Lucide](https://lucide.dev) - Icônes
- [Recharts](https://recharts.org) - Graphiques

## 📞 Support

- 📧 **Email** : support@mgn-manager.com
- 💬 **Discord** : [Rejoindre la communauté](#)
- 📖 **Docs** : [documentation.mgn-manager.com](#)
- 🐛 **Issues** : [GitHub Issues](https://github.com/votre-org/mgn-manager/issues)

## 🌟 Étoile le Projet

Si ce projet vous a été utile, n'hésitez pas à lui donner une ⭐ sur GitHub !

---

**M.G.N Manager** - Gestion d'entreprise simplifiée et professionnelle.

Fait avec ❤️ pour les entrepreneurs et les équipes.
