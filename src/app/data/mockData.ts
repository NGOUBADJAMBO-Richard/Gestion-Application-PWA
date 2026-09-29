import type { Expense } from "../../domain/expense";
import type { Payment } from "../../domain/payment";
import type { TimeEntry } from "../../domain/timeEntry";

export type { Expense, TimeEntry };

export interface Client {
  id: string;
  name: string;
  /**
   * Date d’archivage. Un client porteur de factures émises ne se supprime
   * pas : on l’archive, ce qui le sort des listes sans rien détruire.
   */
  // Le `| undefined` explicite est requis par exactOptionalPropertyTypes :
  // sans lui, on ne peut pas remettre le champ à vide pour désarchiver.
  archivedAt?: string | undefined;
  email: string;
  phone: string;
  company: string;
  projects: number;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  /** Reference au client par identifiant : un nom d’entreprise n’est pas une clé. */
  clientId: string;
  status: "active" | "completed" | "pending";
  deadline: string;
  budget: number;
  progress: number;
  description?: string;
}

export interface Invoice {
  id: string;
  number: string;
  /**
   * Nature du document.
   *
   * Devis, facture et avoir partagent la même structure — un client, des
   * lignes, des totaux — et ne diffèrent que par leur portée comptable. En
   * faire trois entités distinctes dupliquerait le calcul des totaux, la
   * numérotation et le rendu PDF, avec la certitude de les voir diverger.
   */
  kind: "quote" | "invoice" | "creditNote";
  /** Facture annulée par cet avoir. */
  cancels?: string | undefined;
  /** Devis à l’origine de cette facture, pour la traçabilité commerciale. */
  convertedFrom?: string | undefined;
  /**
   * Encaissements. Une facture se règle souvent en plusieurs fois — acompte
   * à la commande, solde à la livraison — et sans ce suivi il faut choisir
   * entre la marquer payée à tort ou impayée à tort.
   */
  payments?: Payment[] | undefined;
  /** Reference au client par identifiant : un nom d’entreprise n’est pas une clé. */
  clientId: string;
  /**
   * Projet rattaché.
   *
   * Facultatif, pour deux raisons : les pièces enregistrées avant ce champ ne
   * l’ont pas, et une prestation ponctuelle — une consultation, un dépannage —
   * n’appartient légitimement à aucun projet. Sans rattachement, la pièce reste
   * comptée au chiffre d’affaires mais signalée comme non analysée : la
   * rattacher au hasard inventerait une rentabilité.
   */
  projectId?: string | undefined;
  items: InvoiceItem[];
  amount: number;
  /**
   * Cycle de vie comptable.
   * `draft`     : brouillon, sans numero, librement modifiable et supprimable.
   * `pending`   : emise, en attente de reglement.
   * `paid`      : reglee.
   * `overdue`   : emise, echeance depassee.
   * `cancelled` : annulee par un avoir.
   */
  status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  date: string;
  dueDate: string;
  paymentMethod: "bank-transfer" | "mobile-money" | "cash" | "card";
  paymentTerms: string;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface Ticket {
  id: string;
  title: string;
  /** Reference au client par identifiant : un nom d’entreprise n’est pas une clé. */
  clientId: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high";
  created: string;
}

/**
 * Données de démonstration.
 *
 * Contexte réel de l'agence : entreprises de Libreville, numéros gabonais,
 * montants en francs CFA repris de la grille tarifaire publiée sur le site
 * (assets/js/data/content.js). Les montants précédents — 12 500, 22 500 —
 * étaient des ordres de grandeur européens sans rapport avec l'activité.
 *
 * Elles ne sont écrites qu'à la première ouverture et disparaissent dès que
 * de vraies données existent.
 */
export const mockClients: Client[] = [
  {
    id: "1",
    name: "Sylvie Ondo",
    email: "s.ondo@akandagroup.ga",
    phone: "+241 66 20 14 07",
    company: "Akanda Group",
    projects: 3,
  },
  {
    id: "2",
    name: "Patrick Mba",
    email: "p.mba@nzengayi-btp.ga",
    phone: "+241 77 31 68 22",
    company: "Nzeng-Ayong BTP",
    projects: 2,
  },
  {
    id: "3",
    name: "Aurélie Koumba",
    email: "contact@estuaire-pharma.ga",
    phone: "+241 62 45 90 11",
    company: "Estuaire Pharma",
    projects: 4,
  },
  {
    id: "4",
    name: "Hervé Ndong",
    email: "herve@okoume-tech.com",
    phone: "+241 74 08 53 96",
    company: "Okoumé Tech",
    projects: 1,
  },
];

export const mockProjects: Project[] = [
  {
    id: "1",
    name: "E-commerce Business",
    clientId: "1",
    status: "active",
    deadline: "2026-05-15",
    budget: 450000,
    progress: 65,
    description:
      "Boutique en ligne, produits illimités, paiement Airtel Money et Moov Money",
  },
  {
    id: "2",
    name: "Application mobile Flutter",
    clientId: "2",
    status: "active",
    deadline: "2026-06-30",
    budget: 600000,
    progress: 40,
    description: "Application de suivi de chantier, iOS et Android",
  },
  {
    id: "3",
    name: "Audit SEO complet",
    clientId: "3",
    status: "pending",
    deadline: "2026-04-20",
    budget: 45000,
    progress: 10,
    description: "Audit technique, sémantique et netlinking",
  },
  {
    id: "4",
    name: "Logo et identité visuelle",
    clientId: "4",
    status: "completed",
    deadline: "2026-03-10",
    budget: 25000,
    progress: 100,
    description: "Logo, charte graphique et déclinaisons",
  },
  {
    id: "5",
    name: "Site vitrine Pro",
    clientId: "3",
    status: "active",
    deadline: "2026-05-28",
    budget: 175000,
    progress: 30,
    description: "Dix pages, blog intégré, optimisation SEO de base",
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: "1",
    number: "FAC-2026-001",
    kind: "invoice",
    projectId: "1",
    clientId: "1",
    items: [
      {
        id: "1-1",
        description: "E-commerce — Business (produits illimités)",
        quantity: 1,
        unitPrice: 450000,
        taxRate: 18,
      },
      {
        id: "1-2",
        description: "Nom de domaine (1 an)",
        quantity: 1,
        unitPrice: 12000,
        taxRate: 18,
      },
    ],
    amount: 545160,
    status: "paid",
    date: "2026-03-01",
    dueDate: "2026-03-31",
    paymentMethod: "bank-transfer",
    paymentTerms: "Paiement à réception de facture",
    notes: "Merci pour votre confiance.",
  },
  {
    id: "2",
    number: "FAC-2026-002",
    kind: "invoice",
    projectId: "2",
    clientId: "2",
    items: [
      {
        id: "2-1",
        description: "Application mobile (Flutter) — acompte 50 %",
        quantity: 1,
        unitPrice: 300000,
        taxRate: 18,
      },
    ],
    amount: 354000,
    status: "pending",
    date: "2026-03-15",
    dueDate: "2026-04-15",
    paymentMethod: "mobile-money",
    paymentTerms: "Paiement sous 30 jours",
  },
  {
    id: "3",
    number: "FAC-2026-003",
    kind: "invoice",
    projectId: "5",
    clientId: "3",
    items: [
      {
        id: "3-1",
        description: "Maintenance mensuelle",
        quantity: 3,
        unitPrice: 12000,
        taxRate: 18,
      },
      {
        id: "3-2",
        description: "Sécurité avancée (WAF & CDN)",
        quantity: 3,
        unitPrice: 8000,
        taxRate: 18,
      },
    ],
    amount: 70800,
    status: "overdue",
    date: "2026-02-26",
    dueDate: "2026-03-28",
    paymentMethod: "bank-transfer",
    paymentTerms: "Paiement sous 30 jours",
  },
  {
    id: "4",
    number: "FAC-2026-004",
    kind: "invoice",
    projectId: "4",
    clientId: "4",
    items: [
      {
        id: "4-1",
        description: "Logo & identité visuelle",
        quantity: 1,
        unitPrice: 25000,
        taxRate: 18,
      },
      {
        id: "4-2",
        description: "Consultation stratégie digitale",
        quantity: 2,
        unitPrice: 15000,
        taxRate: 18,
      },
    ],
    amount: 64900,
    status: "paid",
    date: "2026-03-10",
    dueDate: "2026-04-10",
    paymentMethod: "cash",
    paymentTerms: "Paiement à réception de facture",
  },
];

export const mockTickets: Ticket[] = [
  {
    id: "1",
    title: "Le paiement Airtel Money échoue au dernier écran",
    clientId: "1",
    status: "in-progress",
    priority: "high",
    created: "2026-03-28",
  },
  {
    id: "2",
    title: "Ajouter une page « Nos réalisations »",
    clientId: "2",
    status: "open",
    priority: "medium",
    created: "2026-03-30",
  },
  {
    id: "3",
    title: "Certificat SSL à renouveler",
    clientId: "3",
    status: "closed",
    priority: "medium",
    created: "2026-03-25",
  },
];

/** Chiffre d'affaires mensuel, en francs CFA. */
export const mockRevenueData = [
  { month: "Jan", revenue: 285000 },
  { month: "Fév", revenue: 412000 },
  { month: "Mar", revenue: 368000 },
  { month: "Avr", revenue: 545000 },
  { month: "Mai", revenue: 490000 },
  { month: "Juin", revenue: 623000 },
];

/**
 * Temps passé, en minutes.
 *
 * Coûts horaires internes plausibles pour Libreville : développement 8 000 F,
 * graphisme 6 000 F, rédaction 5 000 F. Ce sont des coûts, pas des tarifs de
 * vente — c'est la distinction qui rend la marge lisible.
 */
export const mockTimeEntries: TimeEntry[] = [
  {
    id: "t-1",
    projectId: "1",
    date: "2026-03-02",
    minutes: 480,
    description: "Intégration du catalogue et des fiches produit",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-2",
    projectId: "1",
    date: "2026-03-04",
    minutes: 420,
    description: "Passerelle Airtel Money : tunnel de paiement",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-3",
    projectId: "1",
    date: "2026-03-06",
    minutes: 300,
    description: "Panier et gestion des stocks",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-4",
    projectId: "1",
    date: "2026-03-09",
    minutes: 240,
    description: "Reprise du tunnel après retour client",
    billable: false,
    hourlyCost: 8000,
  },
  {
    id: "t-5",
    projectId: "1",
    date: "2026-03-11",
    minutes: 480,
    description: "Tableau de bord vendeur",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-6",
    projectId: "1",
    date: "2026-03-13",
    minutes: 480,
    description: "Recette fonctionnelle et corrections",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-7",
    projectId: "2",
    date: "2026-03-16",
    minutes: 480,
    description: "Architecture Flutter et navigation",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-8",
    projectId: "2",
    date: "2026-03-18",
    minutes: 480,
    description: "Synchronisation hors ligne des relevés de chantier",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-9",
    projectId: "2",
    date: "2026-03-20",
    minutes: 420,
    description: "Prise de photos géolocalisées",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-10",
    projectId: "2",
    date: "2026-03-23",
    minutes: 480,
    description: "Export PDF des rapports de chantier",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-11",
    projectId: "2",
    date: "2026-03-25",
    minutes: 480,
    description: "Reprise complète du module de synchronisation",
    billable: false,
    hourlyCost: 8000,
  },
  {
    id: "t-12",
    projectId: "2",
    date: "2026-03-27",
    minutes: 360,
    description: "Publication sur les magasins d'applications",
    billable: true,
    hourlyCost: 8000,
  },
  {
    id: "t-13",
    projectId: "3",
    date: "2026-03-24",
    minutes: 240,
    description: "Exploration technique et relevé des erreurs d'indexation",
    billable: true,
    hourlyCost: 5000,
  },
  {
    id: "t-14",
    projectId: "4",
    date: "2026-03-03",
    minutes: 240,
    description: "Recherches et pistes graphiques",
    billable: true,
    hourlyCost: 6000,
  },
  {
    id: "t-15",
    projectId: "4",
    date: "2026-03-05",
    minutes: 120,
    description: "Déclinaisons et charte d'usage",
    billable: true,
    hourlyCost: 6000,
  },
  {
    id: "t-16",
    projectId: "5",
    date: "2026-03-26",
    minutes: 300,
    description: "Maquette et intégration de la page d'accueil",
    billable: true,
    hourlyCost: 8000,
  },
];

/**
 * Dépenses engagées.
 *
 * Trois dépenses sont refacturées à l'identique — domaine, hébergement : elles
 * traversent l'entreprise sans l'appauvrir et ne doivent donc pas peser sur la
 * marge. Les autres sont des charges réelles, dont deux de structure.
 */
export const mockExpenses: Expense[] = [
  {
    id: "d-1",
    date: "2026-03-01",
    label: "Nom de domaine .ga (1 an)",
    amount: 12000,
    category: "hosting",
    projectId: "1",
    supplier: "Registrar Gabon",
    rebilled: true,
  },
  {
    id: "d-2",
    date: "2026-03-17",
    label: "Maquettes UI sous-traitées",
    amount: 120000,
    category: "subcontracting",
    projectId: "2",
    supplier: "Studio Mandji",
    rebilled: false,
    notes: "Douze écrans, deux tours de correction.",
  },
  {
    id: "d-3",
    date: "2026-03-01",
    label: "Abonnement Figma (mensuel)",
    amount: 9000,
    category: "software",
    rebilled: false,
  },
  {
    id: "d-4",
    date: "2026-03-26",
    label: "Hébergement mutualisé (1 an)",
    amount: 48000,
    category: "hosting",
    projectId: "5",
    supplier: "Registrar Gabon",
    rebilled: true,
  },
  {
    id: "d-5",
    date: "2026-03-19",
    label: "Déplacements chantier Nzeng-Ayong",
    amount: 15000,
    category: "travel",
    projectId: "2",
    rebilled: false,
  },
  {
    id: "d-6",
    date: "2026-03-31",
    label: "Frais bancaires du trimestre",
    amount: 3500,
    category: "fees",
    rebilled: false,
  },
  {
    id: "d-7",
    date: "2026-03-12",
    label: "Cartes de visite et flyers",
    amount: 25000,
    category: "marketing",
    rebilled: false,
  },
];
