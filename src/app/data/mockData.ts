export interface Client {
  id: string;
  name: string;
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
  /** Reference au client par identifiant : un nom d’entreprise n’est pas une clé. */
  clientId: string;
  items: InvoiceItem[];
  amount: number;
  status: "paid" | "pending" | "overdue";
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
