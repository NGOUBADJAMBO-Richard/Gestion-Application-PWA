# M.G.N Manager - PWA Configuration

## 📱 Progressive Web App Features

Cette application est configurée comme une PWA (Progressive Web App) avec les fonctionnalités suivantes :

### ✅ Fonctionnalités Implémentées

1. **Manifest.json** - Configuration PWA complète
   - Nom et icônes de l'application
   - Couleur de thème personnalisée (#004aad)
   - Mode standalone pour une expérience native

2. **Thème Dark/Light**
   - Changement fluide avec animation
   - Sauvegarde de la préférence en localStorage
   - Icônes Soleil/Lune dans la barre supérieure

3. **Multi-langue (FR/EN)**
   - Système i18n complet
   - Traductions pour toutes les pages
   - Bouton de changement de langue

4. **Design Moderne**
   - Polices : Syne (titres) + Space Grotesk (corps)
   - Couleurs corporate : Bleu #004aad, Graphite #545454
   - Style SaaS Dashboard professionnel

### 📦 Structure des Fichiers

```
src/
├── app/
│   ├── contexts/
│   │   ├── ThemeContext.tsx      # Gestion du thème
│   │   ├── LanguageContext.tsx   # Système i18n
│   │   └── AuthContext.tsx       # Auth mockée
│   ├── data/
│   │   └── mockData.ts           # Données de démonstration
│   ├── pages/
│   │   ├── Dashboard.tsx         # Tableau de bord avec stats
│   │   ├── Projects.tsx          # CRUD Projets complet
│   │   ├── Clients.tsx           # Gestion clientèle
│   │   ├── Invoicing.tsx         # Facturation
│   │   ├── Support.tsx           # Système de tickets
│   │   └── Help.tsx              # Documentation
│   ├── components/
│   │   ├── Layout.tsx            # Layout principal avec sidebar
│   │   └── ui/                   # Composants UI réutilisables
│   ├── routes.tsx                # Configuration React Router
│   └── App.tsx                   # Point d'entrée
└── styles/
    ├── fonts.css                 # Import Google Fonts
    └── theme.css                 # Variables CSS personnalisées
```

### 🚀 Installation PWA

#### Desktop (Chrome/Edge)
1. Ouvrir l'application dans le navigateur
2. Cliquer sur l'icône d'installation dans la barre d'adresse
3. Ou Menu → "Installer M.G.N Manager"

#### Mobile
- **iOS (Safari)** : Partager → Ajouter à l'écran d'accueil
- **Android (Chrome)** : Menu → Installer l'application

### 🔧 Pour Activer le Mode Hors-Ligne

Pour une vraie PWA avec support offline, il faudrait ajouter :

1. **Service Worker**
   ```bash
   npm install vite-plugin-pwa -D
   ```

2. **Configuration Vite** (`vite.config.ts`)
   ```typescript
   import { VitePWA } from 'vite-plugin-pwa'
   
   plugins: [
     VitePWA({
       registerType: 'autoUpdate',
       manifest: {
         // Charger depuis /public/manifest.json
       },
       workbox: {
         globPatterns: ['**/*.{js,css,html,png,jpg,svg}']
       }
     })
   ]
   ```

### 📊 Fonctionnalités Principales

#### 1. Dashboard
- Cartes statistiques (Revenus, Projets, Clients, Factures)
- Graphique de revenus (Recharts)
- Liste des projets récents

#### 2. Gestion Projets
- Tableau complet avec filtres
- CRUD (Create, Read, Update, Delete)
- Recherche en temps réel
- Filtrage par statut (Active, Completed, Pending)
- Barre de progression pour chaque projet

#### 3. Gestion Clients (CRM)
- Vue en grille responsive
- Recherche multi-critères
- Informations de contact
- Nombre de projets par client

#### 4. Facturation
- Liste des factures avec statuts
- Filtrage (Paid, Pending, Overdue)
- Téléchargement PDF (mockée)
- Calcul automatique des totaux

#### 5. Support & Maintenance
- Système de tickets
- Statuts (Open, In Progress, Closed)
- Priorités (Low, Medium, High)
- Filtrage et tri

#### 6. Aide
- Documentation intégrée
- FAQs avec accordion
- Guide d'installation PWA
- Présentation des fonctionnalités

### 🎨 Personnalisation

Les couleurs de la marque sont définies dans `/src/styles/theme.css` :
- **Primaire** : #004aad (Bleu)
- **Secondaire** : #545454 (Graphite)

Pour modifier les couleurs, éditez les variables CSS :
```css
--brand-blue: #004aad;
--brand-graphite: #545454;
--primary: #004aad;
```

### 🌐 Traductions

Pour ajouter une nouvelle langue, éditez `/src/app/contexts/LanguageContext.tsx` :
```typescript
const translations: Translations = {
  'key': { fr: 'Français', en: 'English', es: 'Español' }
}
```

### 🔐 Backend (Pour Production)

Cette version utilise des **données mockées**. Pour la production :

1. **Option 1 : Supabase**
   - Base de données PostgreSQL
   - Auth intégrée
   - Storage pour fichiers
   - Real-time subscriptions

2. **Option 2 : Firebase**
   - Firestore pour la DB
   - Firebase Auth
   - Cloud Storage
   - Cloud Functions

3. **Option 3 : Backend Custom**
   - Node.js + Express
   - PostgreSQL / MongoDB
   - JWT Auth
   - API REST ou GraphQL

### 📝 Notes Importantes

- **Sécurité** : Les données sensibles ne doivent PAS être stockées dans le localStorage
- **Performance** : Les Service Workers cachent les assets pour un chargement instantané
- **SEO** : Pour un meilleur référencement, considérez Next.js avec SSR
- **Mobile** : L'interface est 100% responsive et optimisée pour mobile

### 🎯 Prochaines Étapes

1. Intégrer un vrai backend (Supabase recommandé)
2. Ajouter le Service Worker pour le mode offline
3. Implémenter l'authentification réelle
4. Génération PDF pour les factures
5. Notifications Push
6. Upload de fichiers pour les clients
7. Time-tracking pour les projets
8. Analytics et rapports avancés

---

**Développé avec ❤️ par Claude pour M.G.N Manager**
