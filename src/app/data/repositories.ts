import { LocalStorageRepository } from "../../infra/localStorageRepo";
import type { Repository } from "../../infra/repository";
import {
  type Client,
  type Invoice,
  type Project,
  type Ticket,
  mockClients,
  mockInvoices,
  mockProjects,
  mockTickets,
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

/** Toutes les collections, indexées par nom. Sert à l'export de sauvegarde. */
export const ALL_REPOSITORIES = {
  clients: clientRepository,
  projects: projectRepository,
  invoices: invoiceRepository,
  tickets: ticketRepository,
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
