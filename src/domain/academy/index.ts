/**
 * CodeWave Academy — sessions, apprenants, inscriptions.
 *
 * L'agence vend deux choses : des prestations et des formations. L'application
 * ne connaissait que les premières. Une session de formation n'est pourtant pas
 * un projet déguisé : elle a une capacité, des dates fermes, des apprenants qui
 * paient parfois en cinq fois, et une présence à constater. Modéliser ça comme
 * un projet aurait fait perdre exactement ce qui compte.
 *
 * ## Trois décisions structurantes
 *
 * 1. **Le titre et le prix sont figés à la création de la session**, copiés
 *    depuis le catalogue. Le catalogue évolue — une hausse de tarif ne doit pas
 *    réécrire le prix d'une session déjà vendue.
 * 2. **L'échéancier est calculé, jamais saisi.** Découper 300 000 F en cinq
 *    fois à la main donne cinq fois 60 000 F, ou cinq fois 60 000 F et un franc
 *    perdu si le montant ne tombe pas rond. `allocate` garantit que la somme
 *    des échéances égale toujours le total.
 * 3. **Une inscription annulée garde ses versements.** Rembourser est une
 *    opération, pas un effacement : les sommes déjà encaissées restent
 *    lisibles.
 *
 * Ce module est pur.
 */

import { addDays, isIsoDate, type IsoDate } from "../date";
import { allocate, type CurrencyCode, type Money, money, sum } from "../money";
import type { Decision } from "../rules";

export type { CatalogueEntry } from "./catalogue.generated";
export {
  CATALOGUE,
  CATALOGUE_GROUP_LABELS,
  CATALOGUE_IMPORTED_AT,
} from "./catalogue.generated";

// ---------------------------------------------------------------- Sessions

export type SessionMode = "onsite" | "remote" | "inhouse";

export const SESSION_MODE_LABELS: Record<SessionMode, string> = {
  onsite: "Présentiel",
  remote: "Distanciel",
  inhouse: "Intra-entreprise",
};

export type SessionStatus =
  | "planned"
  | "confirmed"
  | "running"
  | "done"
  | "cancelled";

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  planned: "Planifiée",
  confirmed: "Confirmée",
  running: "En cours",
  done: "Terminée",
  cancelled: "Annulée",
};

export interface TrainingSession {
  readonly id: string;
  /** Entrée du catalogue d'origine, pour la traçabilité du tarif. */
  readonly catalogueId: string;
  /** Intitulé figé à la création : le catalogue peut changer, pas l'historique. */
  readonly title: string;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  /** Nombre de places. Strictement positif. */
  readonly capacity: number;
  readonly mode: SessionMode;
  readonly trainer: string;
  readonly location?: string | undefined;
  /** Prix public de la session, en unité mineure. */
  readonly price: number;
  /** Volume horaire, repris du catalogue. */
  readonly hours: number;
  readonly status: SessionStatus;
  readonly notes?: string | undefined;
}

// -------------------------------------------------------------- Apprenants

export interface Learner {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly city?: string | undefined;
  /**
   * Entreprise qui l'envoie, le cas échéant. Une formation intra-entreprise se
   * facture au client, pas à l'apprenant.
   */
  readonly clientId?: string | undefined;
  readonly notes?: string | undefined;
  readonly archivedAt?: string | undefined;
}

export function learnerName(learner: Learner): string {
  return `${learner.firstName} ${learner.lastName}`.trim();
}

// ------------------------------------------------------------ Inscriptions

export type EnrollmentStatus =
  | "pending"
  | "confirmed"
  | "attended"
  | "dropped"
  | "cancelled";

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  attended: "Suivie",
  dropped: "Abandon",
  cancelled: "Annulée",
};

/** Une échéance de l'échéancier d'une inscription. */
export interface Installment {
  readonly id: string;
  readonly dueDate: IsoDate;
  /** Montant dû, en unité mineure. */
  readonly amount: number;
  /** Date d'encaissement. Absente tant que l'échéance n'est pas réglée. */
  readonly paidAt?: IsoDate | undefined;
}

export interface Enrollment {
  readonly id: string;
  readonly sessionId: string;
  readonly learnerId: string;
  readonly status: EnrollmentStatus;
  /**
   * Prix réellement consenti, en unité mineure.
   *
   * Distinct du prix public : le site annonce −20 % pour les étudiants et les
   * demandeurs d'emploi. Enregistrer la remise plutôt que de modifier le prix
   * de la session permet de savoir, en fin d'année, ce qu'elles ont coûté.
   */
  readonly agreedPrice: number;
  readonly discountReason?: string | undefined;
  readonly installments: readonly Installment[];
  readonly enrolledAt: IsoDate;
  /** Taux de présence en pourcentage, constaté en fin de session. */
  readonly attendancePercent?: number | undefined;
}

// ---------------------------------------------------------------- Erreurs

export class AcademyError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "AcademyError";
  }
}

// ------------------------------------------------------------- Échéancier

/** Écart par défaut entre deux échéances, en jours. */
export const INSTALLMENT_INTERVAL_DAYS = 30;

/**
 * Découpe un montant en échéances mensuelles, sans perdre une unité.
 *
 * La première échéance tombe à la date donnée — en pratique à l'inscription —
 * puis toutes les trente jours. `allocate` répartit le reliquat sur les
 * premières échéances : cinq fois 300 001 F donnent 60 001, 60 000, 60 000,
 * 60 000, 60 000, et jamais 300 000 au total.
 */
export function buildInstallments(
  total: number,
  count: number,
  firstDueDate: IsoDate,
  currency: CurrencyCode,
): readonly Installment[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new AcademyError(
      "installments",
      "Le nombre d'échéances doit être un entier d'au moins 1.",
    );
  }
  if (!Number.isInteger(total) || total < 0) {
    throw new AcademyError(
      "agreedPrice",
      "Le montant à échelonner doit être un entier positif ou nul.",
    );
  }
  if (!isIsoDate(firstDueDate)) {
    throw new AcademyError("dueDate", "La date de première échéance est invalide.");
  }

  const parts = allocate(money(total, currency), count);
  return parts.map((part, index) => ({
    id: `ech-${index + 1}`,
    dueDate: addDays(firstDueDate, index * INSTALLMENT_INTERVAL_DAYS),
    amount: part.amount,
  }));
}

export interface EnrollmentBalance {
  readonly total: Money;
  readonly paid: Money;
  readonly balance: Money;
  /** Échéances dues et non réglées à la date de référence. */
  readonly overdue: readonly Installment[];
  /** Prochaine échéance à venir, réglée ou non. */
  readonly next: Installment | null;
  readonly settled: boolean;
}

export function enrollmentBalance(
  enrollment: Enrollment,
  currency: CurrencyCode,
  today: IsoDate,
): EnrollmentBalance {
  const total = sum(
    enrollment.installments.map((echeance) => money(echeance.amount, currency)),
    currency,
  );
  const paid = sum(
    enrollment.installments
      .filter((echeance) => echeance.paidAt !== undefined)
      .map((echeance) => money(echeance.amount, currency)),
    currency,
  );

  const impayees = enrollment.installments.filter(
    (echeance) => echeance.paidAt === undefined,
  );

  return {
    total,
    paid,
    balance: money(total.amount - paid.amount, currency),
    // Le jour de l'échéance n'est pas un retard : on ne réclame pas le matin
    // même. Cohérent avec `invoiceStatus`.
    overdue: impayees.filter((echeance) => echeance.dueDate < today),
    next: impayees[0] ?? null,
    settled: impayees.length === 0,
  };
}

// ------------------------------------------------------------- Remplissage

export interface Occupancy {
  readonly taken: number;
  readonly capacity: number;
  readonly remaining: number;
  /** Taux de remplissage en pourcentage. `null` si la capacité est nulle. */
  readonly percent: number | null;
  readonly full: boolean;
}

/**
 * Places occupées.
 *
 * Les inscriptions annulées et les abandons libèrent leur place : les compter
 * afficherait une session complète alors qu'il reste des sièges, et ferait
 * refuser un apprenant sans raison.
 */
export function sessionOccupancy(
  session: TrainingSession,
  enrollments: readonly Enrollment[],
): Occupancy {
  const retenues = enrollments.filter(
    (inscription) =>
      inscription.sessionId === session.id &&
      inscription.status !== "cancelled" &&
      inscription.status !== "dropped",
  );
  const taken = retenues.length;
  return {
    taken,
    capacity: session.capacity,
    remaining: Math.max(0, session.capacity - taken),
    percent: session.capacity === 0 ? null : (taken / session.capacity) * 100,
    full: taken >= session.capacity,
  };
}

/** Une inscription est-elle possible ? */
export function canEnroll(
  session: TrainingSession,
  enrollments: readonly Enrollment[],
  learnerId: string,
): Decision {
  if (session.status === "cancelled") {
    return {
      allowed: false,
      rule: "session.cancelled",
      reason:
        "Cette session est annulée. Planifie une nouvelle session, ou inscris l'apprenant sur une autre date.",
    };
  }

  if (session.status === "done") {
    return {
      allowed: false,
      rule: "session.done",
      reason:
        "Cette session est terminée. Une inscription rétroactive fausserait le taux de présence et le chiffre d'affaires du mois.",
    };
  }

  const dejaInscrit = enrollments.find(
    (inscription) =>
      inscription.sessionId === session.id &&
      inscription.learnerId === learnerId &&
      inscription.status !== "cancelled",
  );
  if (dejaInscrit !== undefined) {
    return {
      allowed: false,
      rule: "enrollment.duplicate",
      reason:
        "Cet apprenant est déjà inscrit à cette session. Ouvre son inscription plutôt que d'en créer une seconde.",
      blockedBy: [dejaInscrit.id],
    };
  }

  const remplissage = sessionOccupancy(session, enrollments);
  if (remplissage.full) {
    return {
      allowed: false,
      rule: "session.full",
      reason: `Session complète : ${remplissage.taken} inscrits pour ${session.capacity} places. Augmente la capacité ou ouvre une autre session.`,
    };
  }

  return { allowed: true };
}

// -------------------------------------------------------------- Validation

export function validateSession(
  draft: Omit<TrainingSession, "id">,
): void {
  if (draft.title.trim().length === 0) {
    throw new AcademyError("title", "La session doit porter un intitulé.");
  }
  if (!isIsoDate(draft.startDate)) {
    throw new AcademyError("startDate", "La date de début est absente ou invalide.");
  }
  if (!isIsoDate(draft.endDate)) {
    throw new AcademyError("endDate", "La date de fin est absente ou invalide.");
  }
  if (draft.endDate < draft.startDate) {
    throw new AcademyError(
      "endDate",
      "La session se terminerait avant d'avoir commencé. Vérifie les deux dates.",
    );
  }
  if (!Number.isInteger(draft.capacity) || draft.capacity < 1) {
    throw new AcademyError(
      "capacity",
      "Une session doit offrir au moins une place.",
    );
  }
  if (!Number.isInteger(draft.price) || draft.price < 0) {
    throw new AcademyError(
      "price",
      "Le prix doit être un entier positif ou nul, exprimé en unité mineure.",
    );
  }
  if (!Number.isFinite(draft.hours) || draft.hours < 0) {
    throw new AcademyError("hours", "Le volume horaire doit être positif ou nul.");
  }
  if (draft.trainer.trim().length === 0) {
    throw new AcademyError(
      "trainer",
      "Nomme le formateur : une attestation sans formateur n'a aucune valeur.",
    );
  }
}

export function validateLearner(draft: Omit<Learner, "id">): void {
  if (draft.firstName.trim().length === 0 || draft.lastName.trim().length === 0) {
    throw new AcademyError("name", "Le nom et le prénom de l'apprenant sont requis.");
  }
  // Contrôle volontairement minimal : un format d'adresse trop strict rejette
  // des adresses valides, et l'application n'envoie aucun courriel elle-même.
  if (draft.email.trim().length > 0 && !draft.email.includes("@")) {
    throw new AcademyError("email", "L'adresse e-mail ne ressemble pas à une adresse.");
  }
  if (draft.email.trim().length === 0 && draft.phone.trim().length === 0) {
    throw new AcademyError(
      "contact",
      "Renseigne au moins un moyen de contact : téléphone ou e-mail.",
    );
  }
}

export function validateEnrollment(draft: Omit<Enrollment, "id">): void {
  if (draft.sessionId.trim().length === 0) {
    throw new AcademyError("sessionId", "L'inscription doit désigner une session.");
  }
  if (draft.learnerId.trim().length === 0) {
    throw new AcademyError("learnerId", "L'inscription doit désigner un apprenant.");
  }
  if (!Number.isInteger(draft.agreedPrice) || draft.agreedPrice < 0) {
    throw new AcademyError(
      "agreedPrice",
      "Le prix consenti doit être un entier positif ou nul.",
    );
  }
  if (draft.installments.length === 0) {
    throw new AcademyError(
      "installments",
      "L'inscription doit porter au moins une échéance, même unique.",
    );
  }

  const somme = draft.installments.reduce(
    (total, echeance) => total + echeance.amount,
    0,
  );
  if (somme !== draft.agreedPrice) {
    throw new AcademyError(
      "installments",
      `L'échéancier totalise ${somme} au lieu de ${draft.agreedPrice}. Recalcule-le plutôt que de corriger une échéance à la main.`,
    );
  }

  if (
    draft.attendancePercent !== undefined &&
    (draft.attendancePercent < 0 || draft.attendancePercent > 100)
  ) {
    throw new AcademyError(
      "attendancePercent",
      "Le taux de présence va de 0 à 100 %.",
    );
  }
}

// ---------------------------------------------------------------- Pilotage

export interface AcademyMetrics {
  readonly currency: CurrencyCode;
  readonly sessionsCount: number;
  readonly upcomingCount: number;
  readonly learnersCount: number;
  /** Inscriptions retenues : ni annulées, ni abandonnées. */
  readonly activeEnrollments: number;
  /** Chiffre d'affaires formation consenti, échéances comprises. */
  readonly contracted: Money;
  readonly collected: Money;
  readonly outstanding: Money;
  /** Échéances dues et impayées. */
  readonly overdueInstallments: number;
  readonly overdueAmount: Money;
  /** Taux de remplissage moyen des sessions non annulées. `null` si aucune. */
  readonly fillRate: number | null;
  /** Taux de présence moyen des inscriptions renseignées. `null` si aucune. */
  readonly attendanceRate: number | null;
}

export function computeAcademyMetrics(
  sessions: readonly TrainingSession[],
  learners: readonly Learner[],
  enrollments: readonly Enrollment[],
  currency: CurrencyCode,
  today: IsoDate,
): AcademyMetrics {
  const retenues = enrollments.filter(
    (inscription) =>
      inscription.status !== "cancelled" && inscription.status !== "dropped",
  );

  const soldes = retenues.map((inscription) =>
    enrollmentBalance(inscription, currency, today),
  );

  const contracted = sum(
    soldes.map((solde) => solde.total),
    currency,
  );
  const collected = sum(
    soldes.map((solde) => solde.paid),
    currency,
  );

  const enRetard = soldes.flatMap((solde) => solde.overdue);

  const vivantes = sessions.filter((session) => session.status !== "cancelled");
  const remplissages = vivantes
    .map((session) => sessionOccupancy(session, enrollments).percent)
    .filter((taux): taux is number => taux !== null);

  const presences = retenues
    .map((inscription) => inscription.attendancePercent)
    .filter((taux): taux is number => taux !== undefined);

  const moyenne = (valeurs: readonly number[]) =>
    valeurs.length === 0
      ? null
      : valeurs.reduce((total, valeur) => total + valeur, 0) / valeurs.length;

  return {
    currency,
    sessionsCount: sessions.length,
    upcomingCount: vivantes.filter((session) => session.startDate >= today).length,
    learnersCount: learners.filter((apprenant) => apprenant.archivedAt === undefined)
      .length,
    activeEnrollments: retenues.length,
    contracted,
    collected,
    outstanding: money(contracted.amount - collected.amount, currency),
    overdueInstallments: enRetard.length,
    overdueAmount: sum(
      enRetard.map((echeance) => money(echeance.amount, currency)),
      currency,
    ),
    fillRate: moyenne(remplissages),
    attendanceRate: moyenne(presences),
  };
}
