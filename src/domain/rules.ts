/**
 * Règles d'intégrité du domaine.
 *
 * Ce module ne touche à rien : il répond à des questions. « Puis-je supprimer
 * ce client ? », « cette facture peut-elle encore être modifiée ? ». Les
 * réponses portent une raison exploitable, parce qu'un refus qui ne dit pas
 * pourquoi est un refus incompréhensible.
 *
 * Pur : aucune dépendance, aucun accès au stockage.
 */

export type DocumentStatus =
  | "draft"
  | "issued"
  | "sent"
  | "partiallyPaid"
  | "paid"
  | "overdue"
  | "cancelled";

export interface Allowed {
  readonly allowed: true;
}

export interface Refused {
  readonly allowed: false;
  /** Identifiant stable de la règle, pour les tests et la journalisation. */
  readonly rule: string;
  /** Message destiné à l'utilisateur : ce qui bloque, et quoi faire. */
  readonly reason: string;
  /** Entités qui bloquent, quand la règle en désigne. */
  readonly blockedBy?: readonly string[];
}

export type Decision = Allowed | Refused;

const ALLOWED: Allowed = { allowed: true };

function refuse(rule: string, reason: string, blockedBy?: readonly string[]): Refused {
  return blockedBy === undefined
    ? { allowed: false, rule, reason }
    : { allowed: false, rule, reason, blockedBy };
}

/**
 * Transitions d'état autorisées.
 *
 * `cancelled` n'a aucune sortie : une facture annulée l'est définitivement,
 * et on n'annule pas une annulation. Repartir d'une facture annulée se fait en
 * en émettant une nouvelle.
 */
const TRANSITIONS: Record<DocumentStatus, readonly DocumentStatus[]> = {
  draft: ["issued", "cancelled"],
  issued: ["sent", "partiallyPaid", "paid", "overdue", "cancelled"],
  sent: ["partiallyPaid", "paid", "overdue", "cancelled"],
  partiallyPaid: ["paid", "overdue", "cancelled"],
  overdue: ["partiallyPaid", "paid", "cancelled"],
  paid: ["cancelled"],
  cancelled: [],
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: "brouillon",
  issued: "émise",
  sent: "envoyée",
  partiallyPaid: "partiellement payée",
  paid: "payée",
  overdue: "en retard",
  cancelled: "annulée",
};

export function canTransition(from: DocumentStatus, to: DocumentStatus): Decision {
  if (from === to) return ALLOWED;
  if (TRANSITIONS[from].includes(to)) return ALLOWED;

  return refuse(
    "document.transition",
    `Une facture ${STATUS_LABEL[from]} ne peut pas passer à « ${STATUS_LABEL[to]} ».` +
      (from === "cancelled"
        ? " Une facture annulée est définitive : émets-en une nouvelle."
        : ""),
  );
}

/**
 * Un document émis est figé.
 *
 * On ne corrige pas une facture remise à un client : on émet un **avoir** qui
 * l'annule, puis une nouvelle facture. C'est la règle qui protège la
 * continuité de la numérotation et la piste d'audit.
 */
export function canEditDocument(status: DocumentStatus): Decision {
  if (status === "draft") return ALLOWED;

  return refuse(
    "document.immutable",
    `Cette facture est ${STATUS_LABEL[status]} : elle ne peut plus être modifiée. ` +
      "Émets un avoir pour l'annuler, puis une nouvelle facture.",
  );
}

/** Un brouillon se supprime librement ; un document émis, jamais. */
export function canDeleteDocument(status: DocumentStatus): Decision {
  if (status === "draft") return ALLOWED;

  return refuse(
    "document.immutable",
    `Cette facture est ${STATUS_LABEL[status]} : la supprimer effacerait un numéro ` +
      "de la séquence comptable. Émets un avoir pour l'annuler.",
  );
}

export interface ClientDependencies {
  /** Identifiants des factures rattachées, brouillons exclus. */
  readonly issuedInvoiceIds: readonly string[];
  /** Identifiants des projets en cours rattachés. */
  readonly activeProjectIds: readonly string[];
}

/**
 * Suppression d'un client.
 *
 * Un client porteur de factures émises ne se supprime pas : l'obligation de
 * conservation comptable impose de garder de quoi justifier chaque écriture.
 * On propose l'archivage, qui sort le client des listes sans rien détruire.
 */
export function canDeleteClient(dependencies: ClientDependencies): Decision {
  const { issuedInvoiceIds, activeProjectIds } = dependencies;

  if (issuedInvoiceIds.length > 0) {
    return refuse(
      "client.hasIssuedInvoices",
      `Ce client porte ${issuedInvoiceIds.length} facture(s) émise(s). ` +
        "La conservation comptable interdit de les détacher : archive le client, " +
        "il sortira des listes sans que rien ne soit perdu.",
      issuedInvoiceIds,
    );
  }

  if (activeProjectIds.length > 0) {
    return refuse(
      "client.hasActiveProjects",
      `Ce client a ${activeProjectIds.length} projet(s) en cours. ` +
        "Termine ou réaffecte ces projets avant de le supprimer.",
      activeProjectIds,
    );
  }

  return ALLOWED;
}

export interface ProjectDependencies {
  readonly linkedInvoiceIds: readonly string[];
}

export function canDeleteProject(dependencies: ProjectDependencies): Decision {
  if (dependencies.linkedInvoiceIds.length > 0) {
    return refuse(
      "project.hasInvoices",
      `Ce projet est rattaché à ${dependencies.linkedInvoiceIds.length} facture(s). ` +
        "Supprime le rattachement sur ces factures, ou archive le projet.",
      dependencies.linkedInvoiceIds,
    );
  }
  return ALLOWED;
}

/**
 * Un avoir doit désigner une facture réellement annulable.
 *
 * Deux avoirs sur la même facture annuleraient deux fois le même montant.
 */
export function canIssueCreditNote(
  invoice: { readonly status: DocumentStatus } | undefined,
  existingCreditNoteIds: readonly string[] = [],
): Decision {
  if (invoice === undefined) {
    return refuse(
      "creditNote.missingInvoice",
      "Un avoir doit désigner la facture qu'il annule. Sélectionne-la d'abord.",
    );
  }

  if (invoice.status === "draft") {
    return refuse(
      "creditNote.invoiceIsDraft",
      "Cette facture est encore un brouillon : supprime-la, un avoir n'a pas lieu d'être.",
    );
  }

  if (invoice.status === "cancelled") {
    return refuse(
      "creditNote.alreadyCancelled",
      "Cette facture est déjà annulée. Un second avoir annulerait deux fois le même montant.",
      existingCreditNoteIds,
    );
  }

  return ALLOWED;
}

/** Raccourci de lecture, pour les composants. */
export function reasonOf(decision: Decision): string | undefined {
  return decision.allowed ? undefined : decision.reason;
}
