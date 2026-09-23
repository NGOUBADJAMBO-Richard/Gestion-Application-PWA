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
  if (!hasText(raw.id) || !hasText(raw.number)) return undefined;
  if (!Array.isArray(raw.items)) return undefined;
  return raw as unknown as Invoice;
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
