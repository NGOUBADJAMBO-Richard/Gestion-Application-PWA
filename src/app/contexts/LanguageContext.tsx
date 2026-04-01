import React, { createContext, useContext, useState } from 'react';

type Language = 'fr' | 'en';

interface Translations {
  [key: string]: {
    fr: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.dashboard': { fr: 'Tableau de Bord', en: 'Dashboard' },
  'nav.clients': { fr: 'Clients', en: 'Clients' },
  'nav.projects': { fr: 'Projets', en: 'Projects' },
  'nav.invoicing': { fr: 'Facturation', en: 'Invoicing' },
  'nav.support': { fr: 'Support', en: 'Support' },
  'nav.account': { fr: 'Mon compte', en: 'My account' },
  'nav.help': { fr: 'Aide', en: 'Help' },
  'nav.logout': { fr: 'Déconnexion', en: 'Logout' },
  
  // Dashboard
  'dashboard.title': { fr: 'Tableau de Bord', en: 'Dashboard' },
  'dashboard.welcome': { fr: 'Bienvenue sur M.G.N Manager', en: 'Welcome to M.G.N Manager' },
  'dashboard.totalRevenue': { fr: 'Chiffre d\'Affaires', en: 'Total Revenue' },
  'dashboard.activeProjects': { fr: 'Projets Actifs', en: 'Active Projects' },
  'dashboard.totalClients': { fr: 'Clients Total', en: 'Total Clients' },
  'dashboard.pendingInvoices': { fr: 'Factures en Attente', en: 'Pending Invoices' },
  'dashboard.recentProjects': { fr: 'Projets Récents', en: 'Recent Projects' },
  'dashboard.revenueOverview': { fr: 'Aperçu des Revenus', en: 'Revenue Overview' },
  'dashboard.monthlyRevenueYear': { fr: 'Revenus mensuels sur 2026', en: 'Monthly revenue for 2026' },
  'dashboard.latestUpdates': { fr: 'Dernieres mises a jour projets', en: 'Latest project updates' },
  'dashboard.vsLastMonth': { fr: 'vs mois precedent', en: 'vs last month' },
  
  // Projects
  'projects.title': { fr: 'Gestion des Projets', en: 'Project Management' },
  'projects.new': { fr: 'Nouveau Projet', en: 'New Project' },
  'projects.search': { fr: 'Rechercher un projet...', en: 'Search projects...' },
  'projects.filter': { fr: 'Filtrer', en: 'Filter' },
  'projects.all': { fr: 'Tous', en: 'All' },
  'projects.status.active': { fr: 'En Cours', en: 'Active' },
  'projects.status.completed': { fr: 'Terminé', en: 'Completed' },
  'projects.status.pending': { fr: 'En Attente', en: 'Pending' },
  'projects.name': { fr: 'Nom du Projet', en: 'Project Name' },
  'projects.client': { fr: 'Client', en: 'Client' },
  'projects.status': { fr: 'Statut', en: 'Status' },
  'projects.deadline': { fr: 'Échéance', en: 'Deadline' },
  'projects.budget': { fr: 'Budget', en: 'Budget' },
  'projects.progress': { fr: 'Progression', en: 'Progress' },
  'projects.actions': { fr: 'Actions', en: 'Actions' },
  'projects.edit': { fr: 'Modifier', en: 'Edit' },
  'projects.delete': { fr: 'Supprimer', en: 'Delete' },
  
  // Clients
  'clients.title': { fr: 'Gestion Clientèle', en: 'Client Management' },
  'clients.new': { fr: 'Nouveau Client', en: 'New Client' },
  'clients.name': { fr: 'Nom', en: 'Name' },
  'clients.email': { fr: 'Email', en: 'Email' },
  'clients.phone': { fr: 'Téléphone', en: 'Phone' },
  'clients.company': { fr: 'Entreprise', en: 'Company' },
  'clients.projects': { fr: 'Projets', en: 'Projects' },
  
  // Invoicing
  'invoicing.title': { fr: 'Facturation & Devis', en: 'Invoicing & Quotes' },
  'invoicing.new': { fr: 'Nouvelle Facture', en: 'New Invoice' },
  'invoicing.paid': { fr: 'Payée', en: 'Paid' },
  'invoicing.pending': { fr: 'En Attente', en: 'Pending' },
  'invoicing.overdue': { fr: 'En Retard', en: 'Overdue' },
  'invoicing.all': { fr: 'Toutes', en: 'All' },
  'invoicing.listTitle': { fr: 'Liste des Factures', en: 'Invoices List' },
  'invoicing.number': { fr: 'Numero', en: 'Number' },
  'invoicing.amount': { fr: 'Montant', en: 'Amount' },
  'invoicing.date': { fr: 'Date', en: 'Date' },
  'invoicing.dueDate': { fr: 'Echeance', en: 'Due Date' },
  'invoicing.manageData': { fr: 'Gerez les donnees de la facture', en: 'Manage invoice data' },
  
  // Support
  'support.title': { fr: 'Support & Maintenance', en: 'Support & Maintenance' },
  'support.new': { fr: 'Nouveau Ticket', en: 'New Ticket' },
  'support.open': { fr: 'Ouvert', en: 'Open' },
  'support.inProgress': { fr: 'En Cours', en: 'In Progress' },
  'support.closed': { fr: 'Fermé', en: 'Closed' },
  
  // Common
  'common.search': { fr: 'Rechercher...', en: 'Search...' },
  'common.save': { fr: 'Enregistrer', en: 'Save' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.delete': { fr: 'Supprimer', en: 'Delete' },
  'common.edit': { fr: 'Modifier', en: 'Edit' },
  'common.view': { fr: 'Voir', en: 'View' },
  'common.loading': { fr: 'Chargement...', en: 'Loading...' },
  'common.actions': { fr: 'Actions', en: 'Actions' },

  // Brand
  'brand.businessSuite': { fr: 'Suite de Gestion', en: 'Business Suite' },
  'brand.platformActive': { fr: 'Plateforme de gestion active', en: 'Management platform active' },

  // Projects extras
  'projects.allTitle': { fr: 'Tous les Projets', en: 'All Projects' },
  'projects.detailsHint': { fr: 'Renseignez les details du projet', en: 'Fill in the project details below' },
  'projects.enterName': { fr: 'Nom du projet', en: 'Enter project name' },
  'projects.clientName': { fr: 'Nom du client', en: 'Client name' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('mgn-language');
    return (saved as Language) || 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mgn-language', lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
