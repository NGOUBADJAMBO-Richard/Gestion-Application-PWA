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
  client: string;
  status: 'active' | 'completed' | 'pending';
  deadline: string;
  budget: number;
  progress: number;
  description?: string;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
  dueDate: string;
}

export interface Ticket {
  id: string;
  title: string;
  client: string;
  status: 'open' | 'in-progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created: string;
}

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Sophie Martin',
    email: 'sophie.martin@techcorp.fr',
    phone: '+33 6 12 34 56 78',
    company: 'TechCorp',
    projects: 3,
  },
  {
    id: '2',
    name: 'Jean Dupont',
    email: 'j.dupont@innovate.com',
    phone: '+33 6 23 45 67 89',
    company: 'Innovate Solutions',
    projects: 2,
  },
  {
    id: '3',
    name: 'Marie Laurent',
    email: 'marie.l@digitalagency.fr',
    phone: '+33 6 34 56 78 90',
    company: 'Digital Agency',
    projects: 5,
  },
  {
    id: '4',
    name: 'Pierre Dubois',
    email: 'p.dubois@startup.io',
    phone: '+33 6 45 67 89 01',
    company: 'Startup Inc',
    projects: 1,
  },
];

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Refonte Site E-commerce',
    client: 'TechCorp',
    status: 'active',
    deadline: '2026-05-15',
    budget: 25000,
    progress: 65,
    description: 'Refonte complète du site e-commerce avec nouvelles fonctionnalités',
  },
  {
    id: '2',
    name: 'Application Mobile iOS',
    client: 'Innovate Solutions',
    status: 'active',
    deadline: '2026-06-30',
    budget: 45000,
    progress: 40,
    description: 'Développement d\'une application mobile native iOS',
  },
  {
    id: '3',
    name: 'Dashboard Analytics',
    client: 'Digital Agency',
    status: 'pending',
    deadline: '2026-04-20',
    budget: 15000,
    progress: 10,
    description: 'Création d\'un dashboard d\'analytics en temps réel',
  },
  {
    id: '4',
    name: 'Identité Visuelle',
    client: 'Startup Inc',
    status: 'completed',
    deadline: '2026-03-15',
    budget: 8000,
    progress: 100,
    description: 'Refonte complète de l\'identité visuelle',
  },
  {
    id: '5',
    name: 'SEO & Content Marketing',
    client: 'TechCorp',
    status: 'active',
    deadline: '2026-07-10',
    budget: 12000,
    progress: 30,
    description: 'Optimisation SEO et stratégie de contenu',
  },
  {
    id: '6',
    name: 'Maintenance Site Web',
    client: 'Digital Agency',
    status: 'active',
    deadline: '2026-12-31',
    budget: 6000,
    progress: 50,
    description: 'Maintenance continue et mises à jour',
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-2026-001',
    client: 'TechCorp',
    amount: 12500,
    status: 'paid',
    date: '2026-03-01',
    dueDate: '2026-03-31',
  },
  {
    id: '2',
    number: 'INV-2026-002',
    client: 'Innovate Solutions',
    amount: 22500,
    status: 'pending',
    date: '2026-03-15',
    dueDate: '2026-04-15',
  },
  {
    id: '3',
    number: 'INV-2026-003',
    client: 'Digital Agency',
    amount: 7500,
    status: 'overdue',
    date: '2026-02-28',
    dueDate: '2026-03-28',
  },
  {
    id: '4',
    number: 'INV-2026-004',
    client: 'Startup Inc',
    amount: 8000,
    status: 'paid',
    date: '2026-03-10',
    dueDate: '2026-04-10',
  },
];

export const mockTickets: Ticket[] = [
  {
    id: '1',
    title: 'Bug sur la page de paiement',
    client: 'TechCorp',
    status: 'in-progress',
    priority: 'high',
    created: '2026-03-28',
  },
  {
    id: '2',
    title: 'Demande de modification du logo',
    client: 'Innovate Solutions',
    status: 'open',
    priority: 'low',
    created: '2026-03-30',
  },
  {
    id: '3',
    title: 'Performance lente sur mobile',
    client: 'Digital Agency',
    status: 'closed',
    priority: 'medium',
    created: '2026-03-25',
  },
];

export const mockRevenueData = [
  { month: 'Jan', revenue: 45000 },
  { month: 'Fév', revenue: 52000 },
  { month: 'Mar', revenue: 48000 },
  { month: 'Avr', revenue: 61000 },
  { month: 'Mai', revenue: 55000 },
  { month: 'Juin', revenue: 67000 },
];
