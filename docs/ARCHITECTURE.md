# 🏗️ M.G.N Manager - Architecture Technique

## 📋 Stack Technique

### Frontend
- **Framework**: React 18.3.1 avec TypeScript
- **Bundler**: Vite 6.3.5 (Build ultra-rapide)
- **Routing**: React Router 7.13.0 (Data mode)
- **Styling**: Tailwind CSS 4.1.12
- **UI Components**: Radix UI + shadcn/ui
- **Charts**: Recharts 2.15.2
- **Icons**: Lucide React

### Design System
- **Polices**:
  - Titres: `Syne` (Google Fonts)
  - Corps: `Space Grotesk` (Google Fonts)
- **Couleurs Corporate**:
  - Primaire: `#004aad` (Bleu)
  - Secondaire: `#545454` (Graphite)
- **Thèmes**: Light/Dark avec transition fluide

## 📁 Structure du Projet

```
m-g-n-manager/
│
├── public/                      # Assets statiques
│   ├── manifest.json           # Configuration PWA
│   ├── favicon.svg             # Icône navigateur
│   ├── icon-192.svg            # Icône PWA 192x192
│   └── icon-512.svg            # Icône PWA 512x512
│
├── src/
│   ├── app/
│   │   ├── contexts/           # Contexts React
│   │   │   ├── ThemeContext.tsx       # Gestion du thème
│   │   │   ├── LanguageContext.tsx    # i18n FR/EN
│   │   │   └── AuthContext.tsx        # Authentification
│   │   │
│   │   ├── data/
│   │   │   └── mockData.ts            # Données de démonstration
│   │   │
│   │   ├── pages/              # Pages de l'application
│   │   │   ├── Dashboard.tsx          # Tableau de bord
│   │   │   ├── Projects.tsx           # Gestion projets (CRUD)
│   │   │   ├── Clients.tsx            # CRM
│   │   │   ├── Invoicing.tsx          # Facturation
│   │   │   ├── Support.tsx            # Tickets
│   │   │   └── Help.tsx               # Documentation
│   │   │
│   │   ├── components/         # Composants React
│   │   │   ├── Layout.tsx             # Layout principal
│   │   │   ├── ui/                    # Composants UI réutilisables
│   │   │   └── figma/                 # Composants Figma
│   │   │
│   │   ├── routes.tsx                 # Configuration routing
│   │   └── App.tsx                    # Composant racine
│   │
│   ├── styles/                 # Styles globaux
│   │   ├── fonts.css                  # Import fonts
│   │   ├── tailwind.css               # Config Tailwind
│   │   ├── theme.css                  # Variables CSS
│   │   └── index.css                  # Point d'entrée CSS
│   │
│   └── main.tsx                # Point d'entrée JS
│
├── index.html                  # HTML principal
├── vite.config.ts             # Configuration Vite
├── package.json               # Dépendances
├── README-PWA.md              # Documentation PWA
└── ARCHITECTURE.md            # Ce fichier
```

## 🔄 Flux de Données

### Contexts (State Management)

```
ThemeContext
├── theme: 'light' | 'dark'
├── toggleTheme()
└── setTheme(theme)

LanguageContext
├── language: 'fr' | 'en'
├── setLanguage(lang)
└── t(key) → traduction

AuthContext
├── user: User | null
├── login(email, password)
├── logout()
└── isAuthenticated: boolean
```

### Routing Structure

```
/ (Layout)
├── / (Dashboard)
├── /clients (Clients)
├── /projects (Projects)
├── /invoicing (Invoicing)
├── /support (Support)
└── /help (Help)
```

## 🎨 Design Tokens

### Couleurs (theme.css)

```css
/* Brand Colors */
--brand-blue: #004aad;
--brand-graphite: #545454;

/* Light Mode */
--background: #ffffff;
--foreground: oklch(0.145 0 0);
--primary: #004aad;
--muted-foreground: #545454;

/* Dark Mode */
--background: #0a0a0a;
--card: #141414;
--primary: #004aad;
```

### Typographie

```css
--font-family-heading: 'Syne', sans-serif;
--font-family-body: 'Space Grotesk', sans-serif;
```

## 📊 Modèles de Données

### Client
```typescript
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  projects: number;
  avatar?: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'completed' | 'pending';
  deadline: string;
  budget: number;
  progress: number;
  description?: string;
}
```

### Invoice
```typescript
interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
  dueDate: string;
}
```

### Ticket
```typescript
interface Ticket {
  id: string;
  title: string;
  client: string;
  status: 'open' | 'in-progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created: string;
}
```

## 🚀 Fonctionnalités Implémentées

### ✅ Dashboard
- 4 cartes statistiques avec icônes colorées
- Graphique de revenus (Bar Chart)
- Liste des projets récents avec badges de statut
- Design Bento Grid moderne

### ✅ Gestion Projets
- **CRUD Complet**:
  - Create: Dialog avec formulaire
  - Read: Tableau avec toutes les données
  - Update: Edition via Dialog
  - Delete: Suppression avec confirmation
- **Filtres**:
  - Recherche par nom/client
  - Filtrage par statut
- **Affichage**:
  - Tableau responsive
  - Barre de progression
  - Badges de statut colorés

### ✅ CRM (Clients)
- Vue en grille (3 colonnes desktop)
- Cartes clients avec avatar
- Informations de contact (email, téléphone)
- Nombre de projets par client
- Recherche globale

### ✅ Facturation
- Liste des factures avec statuts
- Filtres par statut (Paid, Pending, Overdue)
- Calcul automatique des totaux
- Badges de statut colorés
- Format monétaire EUR

### ✅ Support
- Système de tickets
- Filtres par statut
- Priorités visuelles (High, Medium, Low)
- Icônes de statut
- Timeline des créations

### ✅ Aide
- Ressources documentaires (4 sections)
- FAQs avec Accordion
- Guide d'installation PWA
- Présentation des fonctionnalités clés

### ✅ Système i18n
- Français (par défaut)
- Anglais
- Traductions complètes
- Bouton de changement de langue

### ✅ Thème Dark/Light
- Mode clair professionnel
- Mode sombre (#0a0a0a)
- Transition fluide
- Persistance localStorage
- Icône Soleil/Lune

## 🔧 Configuration PWA

### Manifest.json
```json
{
  "name": "M.G.N Manager",
  "short_name": "MGN Manager",
  "display": "standalone",
  "theme_color": "#004aad",
  "background_color": "#ffffff"
}
```

### Meta Tags (index.html)
```html
<meta name="theme-color" content="#004aad" />
<link rel="manifest" href="/manifest.json" />
```

## 🎯 Prochaines Étapes (Production)

### 1. Backend Integration
- [ ] Connecter Supabase ou Firebase
- [ ] Implémenter authentification réelle
- [ ] Migration vers base de données réelle
- [ ] API REST ou GraphQL

### 2. PWA Avancée
- [ ] Service Worker (vite-plugin-pwa)
- [ ] Mode hors-ligne complet
- [ ] Cache stratégies
- [ ] Synchronisation background

### 3. Fonctionnalités Avancées
- [ ] Génération PDF (factures)
- [ ] Upload de fichiers
- [ ] Notifications Push
- [ ] Time-tracking
- [ ] Tableau Kanban pour projets
- [ ] Analytics & Rapports
- [ ] Export CSV/Excel
- [ ] Calendrier intégré

### 4. Sécurité
- [ ] JWT tokens
- [ ] HTTPS obligatoire
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] Row Level Security (RLS)

### 5. Performance
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Image optimization
- [ ] Bundle size optimization
- [ ] Lighthouse score > 90

## 📦 Packages Principaux

```json
{
  "react": "18.3.1",
  "react-router": "7.13.0",
  "tailwindcss": "4.1.12",
  "recharts": "2.15.2",
  "lucide-react": "0.487.0",
  "next-themes": "0.4.6",
  "@radix-ui/*": "latest"
}
```

## 🎨 Composants UI Disponibles

- Accordion, Alert, Avatar
- Badge, Button, Calendar
- Card, Checkbox, Dialog
- Dropdown, Form, Input
- Label, Popover, Progress
- Select, Separator, Sheet
- Sidebar, Skeleton, Switch
- Table, Tabs, Textarea
- Tooltip, Toggle

## 💡 Bonnes Pratiques Utilisées

1. **TypeScript strict** pour la sécurité des types
2. **Contexts** pour state management global
3. **Composants réutilisables** (DRY principle)
4. **Responsive design** (Mobile-first)
5. **Accessibilité** (Radix UI primitives)
6. **Performance** (React.memo, lazy loading)
7. **SEO-friendly** (Semantic HTML)
8. **Dark mode** support natif
9. **i18n** architecture extensible
10. **Code organization** claire et modulaire

## 🔗 Ressources

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://radix-ui.com)
- [Recharts](https://recharts.org)
- [Vite](https://vitejs.dev)
- [PWA Guide](https://web.dev/progressive-web-apps)

---

**Version**: 1.0.0  
**Dernière mise à jour**: Avril 2026  
**Développé pour**: M.G.N Manager
