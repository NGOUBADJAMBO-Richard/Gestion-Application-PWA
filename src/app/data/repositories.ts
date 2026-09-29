import { LocalStorageRepository } from "../../infra/localStorageRepo";
import type { Repository } from "../../infra/repository";
import type {
  Enrollment,
  Learner,
  TrainingSession,
} from "../../domain/academy";
import { isExpenseCategory } from "../../domain/expense";
import type { Reminder } from "../../domain/reminder";
import {
  mockEnrollments,
  mockLearners,
  mockReminders,
  mockSessions,
} from "./academyData";
import type { Expense } from "../../domain/expense";
import type { TimeEntry } from "../../domain/timeEntry";
import {
  type Client,
  type Invoice,
  type Project,
  type Ticket,
  mockClients,
  mockExpenses,
  mockInvoices,
  mockProjects,
  mockTickets,
  mockTimeEntries,
} from "./mockData";

/**
 * Dépôts de l'application.
 *
 * Jusqu'ici, chaque page faisait `useState(mockClients)` : la saisie vivait
 * dans la mémoire du composant et disparaissait au rechargement. Rien n'était
 * conservé. Ces dépôts donnent à l'application sa persistance.
 *
 * Chaque collection fournit un `parse` : une entrée relue qui n'a pas la forme
 * attendue est écartée, au lieu d'être laissée traverser et de faire tomber un
 * écran sans rapport plus tard.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseClient(raw: unknown): Client | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id) || !hasText(raw.name)) return undefined;
  return raw as unknown as Client;
}

function parseProject(raw: unknown): Project | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id) || !hasText(raw.name)) return undefined;
  if (typeof raw.budget !== "number") return undefined;
  return raw as unknown as Project;
}

function parseInvoice(raw: unknown): Invoice | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id)) return undefined;
  if (!Array.isArray(raw.items)) return undefined;

  // Normalisation à la lecture, pour les documents enregistrés avant que ces
  // champs existent : un brouillon n’a pas de numéro, et un document antérieur
  // à la distinction devis/facture/avoir est une facture.
  return {
    ...(raw as unknown as Invoice),
    number: typeof raw.number === "string" ? raw.number : "",
    kind:
      raw.kind === "quote" || raw.kind === "creditNote"
        ? raw.kind
        : "invoice",
    payments: Array.isArray(raw.payments) ? raw.payments : [],
  };
}

function parseTicket(raw: unknown): Ticket | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id) || !hasText(raw.title)) return undefined;
  return raw as unknown as Ticket;
}

/**
 * Une saisie de temps illisible est écartée, pas corrigée.
 *
 * Une durée négative ou fractionnaire fausserait tous les coûts en aval sans
 * qu'aucun écran ne le signale. La refuser à la lecture coûte une ligne
 * perdue ; la laisser passer coûte une marge fausse.
 */
function parseTimeEntry(raw: unknown): TimeEntry | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id) || !hasText(raw.projectId) || !hasText(raw.date)) {
    return undefined;
  }
  if (!Number.isInteger(raw.minutes) || (raw.minutes as number) <= 0) {
    return undefined;
  }
  if (!Number.isInteger(raw.hourlyCost) || (raw.hourlyCost as number) < 0) {
    return undefined;
  }
  return {
    ...(raw as unknown as TimeEntry),
    description: typeof raw.description === "string" ? raw.description : "",
    billable: raw.billable !== false,
  };
}

function parseExpense(raw: unknown): Expense | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id) || !hasText(raw.date) || !hasText(raw.label)) {
    return undefined;
  }
  if (!Number.isInteger(raw.amount) || (raw.amount as number) <= 0) {
    return undefined;
  }
  return {
    ...(raw as unknown as Expense),
    // Une catégorie inconnue — renommée, ou venue d'une sauvegarde plus
    // récente — devient « Autre » : la dépense reste comptée, ce qui importe
    // davantage que sa classification.
    category: isExpenseCategory(raw.category) ? raw.category : "other",
    rebilled: raw.rebilled === true,
  };
}


/**
 * Une session illisible est écartée.
 *
 * Une capacité nulle ou négative ferait afficher un taux de remplissage
 * infini et refuserait toute inscription sans expliquer pourquoi.
 */
function parseSession(raw: unknown): TrainingSession | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id) || !hasText(raw.title)) return undefined;
  if (!hasText(raw.startDate) || !hasText(raw.endDate)) return undefined;
  if (!Number.isInteger(raw.capacity) || (raw.capacity as number) < 1) {
    return undefined;
  }
  return {
    ...(raw as unknown as TrainingSession),
    // Champs apparus après coup : une session enregistrée avant eux reste
    // exploitable plutôt que d'être perdue.
    mode: raw.mode === "remote" || raw.mode === "inhouse" ? raw.mode : "onsite",
    price: Number.isInteger(raw.price) ? (raw.price as number) : 0,
    hours: typeof raw.hours === "number" ? raw.hours : 0,
    trainer: typeof raw.trainer === "string" ? raw.trainer : "",
  };
}

function parseLearner(raw: unknown): Learner | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id)) return undefined;
  if (!hasText(raw.firstName) && !hasText(raw.lastName)) return undefined;
  return {
    ...(raw as unknown as Learner),
    firstName: typeof raw.firstName === "string" ? raw.firstName : "",
    lastName: typeof raw.lastName === "string" ? raw.lastName : "",
    email: typeof raw.email === "string" ? raw.email : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
  };
}

/**
 * Une inscription sans échéancier cohérent est écartée.
 *
 * Le solde se lit sur l'échéancier : sans lui, l'inscription apparaîtrait
 * soldée alors que rien n'a été encaissé.
 */
function parseEnrollment(raw: unknown): Enrollment | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id) || !hasText(raw.sessionId) || !hasText(raw.learnerId)) {
    return undefined;
  }
  if (!Array.isArray(raw.installments) || raw.installments.length === 0) {
    return undefined;
  }
  return {
    ...(raw as unknown as Enrollment),
    agreedPrice: Number.isInteger(raw.agreedPrice)
      ? (raw.agreedPrice as number)
      : 0,
  };
}

function parseReminder(raw: unknown): Reminder | undefined {
  if (!isRecord(raw)) return undefined;
  if (!hasText(raw.id) || !hasText(raw.invoiceId) || !hasText(raw.sentAt)) {
    return undefined;
  }
  const niveau = raw.level;
  return {
    ...(raw as unknown as Reminder),
    level: niveau === "firm" || niveau === "formal" ? niveau : "courtesy",
  };
}

export const clientRepository: Repository<Client> = new LocalStorageRepository<Client>({
  collection: "clients",
  parse: parseClient,
  seed: () => mockClients,
});

export const projectRepository: Repository<Project> = new LocalStorageRepository<Project>({
  collection: "projects",
  parse: parseProject,
  seed: () => mockProjects,
});

export const invoiceRepository: Repository<Invoice> = new LocalStorageRepository<Invoice>({
  collection: "invoices",
  parse: parseInvoice,
  seed: () => mockInvoices,
});

export const ticketRepository: Repository<Ticket> = new LocalStorageRepository<Ticket>({
  collection: "tickets",
  parse: parseTicket,
  seed: () => mockTickets,
});

export const timeEntryRepository: Repository<TimeEntry> =
  new LocalStorageRepository<TimeEntry>({
    collection: "time-entries",
    parse: parseTimeEntry,
    seed: () => mockTimeEntries,
  });

export const expenseRepository: Repository<Expense> =
  new LocalStorageRepository<Expense>({
    collection: "expenses",
    parse: parseExpense,
    seed: () => mockExpenses,
  });

export const sessionRepository: Repository<TrainingSession> =
  new LocalStorageRepository<TrainingSession>({
    collection: "academy-sessions",
    parse: parseSession,
    seed: () => mockSessions,
  });

export const learnerRepository: Repository<Learner> =
  new LocalStorageRepository<Learner>({
    collection: "academy-learners",
    parse: parseLearner,
    seed: () => mockLearners,
  });

export const enrollmentRepository: Repository<Enrollment> =
  new LocalStorageRepository<Enrollment>({
    collection: "academy-enrollments",
    parse: parseEnrollment,
    seed: () => mockEnrollments,
  });

/**
 * Historique des relances.
 *
 * Stocké, et non déduit : savoir qu'une mise en demeure est partie le 14 est
 * le seul moyen de ne pas l'envoyer deux fois.
 */
export const reminderRepository: Repository<Reminder> =
  new LocalStorageRepository<Reminder>({
    collection: "reminders",
    parse: parseReminder,
    seed: () => mockReminders,
  });

/** Toutes les collections, indexées par nom. Sert à l'export de sauvegarde. */
export const ALL_REPOSITORIES = {
  clients: clientRepository,
  projects: projectRepository,
  invoices: invoiceRepository,
  tickets: ticketRepository,
  timeEntries: timeEntryRepository,
  expenses: expenseRepository,
  academySessions: sessionRepository,
  academyLearners: learnerRepository,
  academyEnrollments: enrollmentRepository,
  reminders: reminderRepository,
} as const;

export type CollectionName = keyof typeof ALL_REPOSITORIES;

/**
 * État courant de toutes les collections, corbeille comprise.
 *
 * La corbeille est incluse volontairement : une sauvegarde qui perdrait les
 * éléments supprimés rendrait la restauration impossible pour quelqu'un qui
 * cherche justement à récupérer une suppression.
 */
export async function readAllCollections(): Promise<
  Record<string, readonly unknown[]>
> {
  const entries = await Promise.all(
    Object.entries(ALL_REPOSITORIES).map(async ([name, repository]) => {
      const [vivants, supprimes] = await Promise.all([
        repository.list(),
        repository.listDeleted(),
      ]);
      return [name, [...vivants, ...supprimes]] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/**
 * Remplace le contenu de chaque collection connue.
 *
 * Une collection absente de la sauvegarde est laissée telle quelle plutôt que
 * vidée : l'aperçu d'import a déjà signalé la perte éventuelle, et détruire
 * au-delà de ce qui a été annoncé serait une trahison de la confirmation.
 */
export async function restoreAllCollections(
  collections: Record<string, readonly unknown[]>,
): Promise<void> {
  for (const [name, repository] of Object.entries(ALL_REPOSITORIES)) {
    const items = collections[name];
    if (items === undefined) continue;
    await repository.bulkSet(items as never);
  }
}
