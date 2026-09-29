/**
 * Alertes internes.
 *
 * Ce qui demande une action se dispersait sur cinq écrans : une facture en
 * retard dans Facturation, une échéance de formation dans Academy, un projet
 * qui dérive dans Rentabilité. Personne n'ouvre cinq écrans chaque matin, donc
 * personne ne voyait rien venir.
 *
 * ## Dérivées, jamais stockées
 *
 * Une alerte n'est pas un enregistrement : c'est une lecture de l'état actuel.
 * La stocker obligerait à la créer, la mettre à jour et la supprimer à chaque
 * changement — trois occasions de laisser traîner une alerte qui n'a plus lieu
 * d'être. Ici, une facture réglée fait disparaître son alerte par construction.
 *
 * Conséquence assumée : il n'y a pas d'état « lu ». Une alerte disparaît quand
 * le fait disparaît, pas quand on l'a regardée. C'est le bon comportement pour
 * un impayé ; ce serait le mauvais pour une notification sociale — l'application
 * n'en a pas.
 *
 * Ce module est pur.
 */

import type { IsoDate } from "./date";

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertKind =
  | "invoiceOverdue"
  | "invoiceDueSoon"
  | "quoteExpiring"
  | "installmentOverdue"
  | "sessionStarting"
  | "projectOverBudget"
  | "backupStale"
  | "draftPending";

export interface Alert {
  /** Identifiant stable : deux calculs successifs rendent le même. */
  readonly id: string;
  readonly kind: AlertKind;
  readonly severity: AlertSeverity;
  readonly title: string;
  /** Ce qu'il faut faire, pas seulement ce qui se passe. */
  readonly detail: string;
  /** Écran à ouvrir pour agir. */
  readonly href: string;
  /**
   * Clé de tri secondaire : plus le nombre est élevé, plus c'est urgent à
   * gravité égale. Jours de retard, montant, jours restants inversés.
   */
  readonly weight: number;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/** Délai au-delà duquel une sauvegarde est jugée trop ancienne, en jours. */
export const BACKUP_STALE_DAYS = 7;

/** Fenêtre d'anticipation : une échéance à moins de N jours est signalée. */
export const DUE_SOON_DAYS = 5;

/** Écart en jours entre deux dates ISO. Positif si `to` est après `from`. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const debut = new Date(`${from}T00:00:00`);
  const fin = new Date(`${to}T00:00:00`);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) return 0;
  return Math.round((fin.getTime() - debut.getTime()) / 86_400_000);
}

/** Documents réduits à ce qui déclenche une alerte. */
export interface AlertInvoice {
  readonly id: string;
  readonly number: string;
  readonly kind: "quote" | "invoice" | "creditNote";
  readonly status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  readonly clientName: string;
  readonly dueDate: IsoDate;
  /** Reste dû, déjà formaté. */
  readonly formattedBalance: string;
  readonly balance: number;
}

export interface AlertInstallment {
  readonly enrollmentId: string;
  readonly installmentId: string;
  readonly learnerName: string;
  readonly sessionTitle: string;
  readonly dueDate: IsoDate;
  readonly formattedAmount: string;
  readonly amount: number;
}

export interface AlertSession {
  readonly id: string;
  readonly title: string;
  readonly startDate: IsoDate;
  readonly taken: number;
  readonly capacity: number;
}

export interface AlertProject {
  readonly id: string;
  readonly name: string;
  readonly costVsBudgetPercent: number;
  readonly marginNegative: boolean;
}

export interface AlertInput {
  readonly today: IsoDate;
  readonly invoices: readonly AlertInvoice[];
  readonly installments: readonly AlertInstallment[];
  readonly sessions: readonly AlertSession[];
  readonly projects: readonly AlertProject[];
  /** Date de la dernière sauvegarde exportée. `null` si jamais. */
  readonly lastBackupAt: IsoDate | null;
}

export function computeAlerts(input: AlertInput): readonly Alert[] {
  const { today } = input;
  const alertes: Alert[] = [];

  for (const document of input.invoices) {
    if (document.status === "cancelled") continue;

    if (document.kind === "invoice" && document.status === "draft") {
      // Un brouillon oublié est une recette qui n'existe pas encore.
      alertes.push({
        id: `draft:${document.id}`,
        kind: "draftPending",
        severity: "info",
        title: `Facture en brouillon pour ${document.clientName}`,
        detail:
          "Elle n'a pas de numéro et ne compte nulle part tant qu'elle n'est pas émise.",
        href: "/invoicing",
        weight: document.balance,
      });
      continue;
    }

    if (document.status === "draft") continue;

    const retard = daysBetween(document.dueDate, today);

    if (document.kind === "quote") {
      // Un devis expire : passé sa date de validité, le prix n'engage plus.
      if (retard >= 0 && document.status !== "paid") {
        alertes.push({
          id: `quote:${document.id}`,
          kind: "quoteExpiring",
          severity: "info",
          title: `Devis ${document.number} expiré`,
          detail: `Validité dépassée de ${retard} jour(s) pour ${document.clientName}. Relance, ou émets un nouveau devis.`,
          href: "/invoicing",
          weight: retard,
        });
      }
      continue;
    }

    if (document.status === "paid" || document.balance <= 0) continue;

    if (retard > 0) {
      alertes.push({
        id: `overdue:${document.id}`,
        kind: "invoiceOverdue",
        severity: retard >= 21 ? "critical" : "warning",
        title: `${document.number} en retard de ${retard} jour(s)`,
        detail: `${document.formattedBalance} dus par ${document.clientName}. Prépare une relance.`,
        href: "/invoicing",
        weight: retard,
      });
    } else if (retard >= -DUE_SOON_DAYS) {
      alertes.push({
        id: `duesoon:${document.id}`,
        kind: "invoiceDueSoon",
        severity: "info",
        title: `${document.number} échoit dans ${-retard} jour(s)`,
        detail: `${document.formattedBalance} attendus de ${document.clientName}.`,
        href: "/invoicing",
        weight: DUE_SOON_DAYS + retard,
      });
    }
  }

  for (const echeance of input.installments) {
    const retard = daysBetween(echeance.dueDate, today);
    if (retard <= 0) continue;
    alertes.push({
      id: `installment:${echeance.enrollmentId}:${echeance.installmentId}`,
      kind: "installmentOverdue",
      severity: retard >= 15 ? "critical" : "warning",
      title: `Échéance de formation en retard de ${retard} jour(s)`,
      detail: `${echeance.formattedAmount} dus par ${echeance.learnerName} — ${echeance.sessionTitle}.`,
      href: "/academy",
      weight: retard,
    });
  }

  for (const session of input.sessions) {
    const avant = daysBetween(today, session.startDate);
    if (avant < 0 || avant > 14) continue;
    // Une session à moitié vide qui démarre dans dix jours se remplit encore ;
    // la même la veille ne se remplit plus. L'alerte sert tant qu'elle est
    // actionnable.
    const sousRempli = session.capacity > 0 && session.taken / session.capacity < 0.5;
    if (!sousRempli && avant > 3) continue;
    alertes.push({
      id: `session:${session.id}`,
      kind: "sessionStarting",
      severity: sousRempli && avant <= 7 ? "warning" : "info",
      title:
        avant === 0
          ? `« ${session.title} » démarre aujourd'hui`
          : `« ${session.title} » démarre dans ${avant} jour(s)`,
      detail: `${session.taken} inscrit(s) sur ${session.capacity} places.`,
      href: "/academy",
      weight: 14 - avant,
    });
  }

  for (const projet of input.projects) {
    if (!projet.marginNegative && projet.costVsBudgetPercent <= 100) continue;
    alertes.push({
      id: `project:${projet.id}`,
      kind: "projectOverBudget",
      severity: projet.marginNegative ? "critical" : "warning",
      title: `« ${projet.name} » dépasse son budget`,
      detail: projet.marginNegative
        ? `${projet.costVsBudgetPercent.toFixed(0)} % du budget consommé, et la facturation ne couvre pas les coûts.`
        : `${projet.costVsBudgetPercent.toFixed(0)} % du budget consommé. La facturation suit pour l'instant.`,
      href: "/time",
      weight: projet.costVsBudgetPercent,
    });
  }

  // La sauvegarde est la seule protection contre la perte de données : tout
  // vit dans ce navigateur, et un profil effacé n'est pas récupérable.
  const anciennete =
    input.lastBackupAt === null ? null : daysBetween(input.lastBackupAt, today);
  if (anciennete === null) {
    alertes.push({
      id: "backup:never",
      kind: "backupStale",
      severity: "critical",
      title: "Aucune sauvegarde exportée",
      detail:
        "Tout vit dans ce navigateur. Un profil effacé est définitivement perdu : exporte une sauvegarde.",
      href: "/settings",
      weight: 9999,
    });
  } else if (anciennete > BACKUP_STALE_DAYS) {
    alertes.push({
      id: "backup:stale",
      kind: "backupStale",
      severity: "warning",
      title: `Dernière sauvegarde il y a ${anciennete} jours`,
      detail: "Exporte une sauvegarde : tout ce qui a été saisi depuis est à risque.",
      href: "/settings",
      weight: anciennete,
    });
  }

  return alertes.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.weight - a.weight ||
      a.id.localeCompare(b.id),
  );
}

export interface AlertSummary {
  readonly total: number;
  readonly critical: number;
  readonly warning: number;
  readonly info: number;
}

export function summarizeAlerts(alerts: readonly Alert[]): AlertSummary {
  return {
    total: alerts.length,
    critical: alerts.filter((alerte) => alerte.severity === "critical").length,
    warning: alerts.filter((alerte) => alerte.severity === "warning").length,
    info: alerts.filter((alerte) => alerte.severity === "info").length,
  };
}
