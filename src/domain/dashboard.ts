import { type CurrencyCode, type Money, money, sum, zero } from "./money";

/**
 * Indicateurs du tableau de bord.
 *
 * L'écran affichait des valeurs écrites en dur — un chiffre d'affaires de
 * 328 000 000 FCFA qui ne correspondait à aucune facture, et des variations
 * « +12,5 % » inventées. Un indicateur faux est pire qu'un indicateur absent :
 * on prend des décisions dessus.
 *
 * Tout est calculé ici, à partir des documents réels, et testé.
 */

export type InvoiceStatus = "paid" | "pending" | "overdue";

/** Vue minimale d'une facture, pour que le domaine ignore la forme des écrans. */
export interface InvoiceSnapshot {
  readonly amount: number;
  readonly status: InvoiceStatus;
  /** Date d'émission, au format AAAA-MM-JJ. */
  readonly date: string;
  readonly dueDate: string;
}

export interface ProjectSnapshot {
  readonly status: "active" | "completed" | "pending";
  readonly budget: number;
}

export interface Kpi {
  readonly value: Money;
  /** Variation par rapport à la période précédente, en pourcentage. */
  readonly changePercent: number | null;
}

export interface CountKpi {
  readonly value: number;
  readonly change: number | null;
}

export interface DashboardMetrics {
  /** Encaissé : total des factures réglées sur la période. */
  readonly collected: Kpi;
  /** Restant dû : factures en attente et en retard. */
  readonly outstanding: Money;
  readonly overdueAmount: Money;
  readonly overdueCount: number;
  readonly activeProjects: CountKpi;
  readonly clientCount: number;
  readonly pendingInvoices: number;
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function shiftMonth(key: string, delta: number): string {
  const annee = Number(key.slice(0, 4));
  const mois = Number(key.slice(5, 7));
  const total = annee * 12 + (mois - 1) + delta;
  const nouvelleAnnee = Math.floor(total / 12);
  const nouveauMois = (total % 12) + 1;
  return `${String(nouvelleAnnee).padStart(4, "0")}-${String(nouveauMois).padStart(2, "0")}`;
}

/**
 * Variation entre deux périodes, en pourcentage.
 *
 * Renvoie `null` quand la période précédente est vide : afficher « +100 % »
 * parce qu'on est passé de zéro à une facture serait trompeur, et « +0 % »
 * serait faux.
 */
function changePercent(courant: number, precedent: number): number | null {
  if (precedent === 0) return null;
  return ((courant - precedent) / precedent) * 100;
}

export interface MonthlyRevenue {
  /** Clé AAAA-MM, pour trier sans ambiguïté. */
  readonly key: string;
  /** Libellé court à afficher : « janv. », « févr. ». */
  readonly label: string;
  readonly revenue: number;
}

const MOIS_COURTS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/**
 * Chiffre d'affaires encaissé, mois par mois.
 *
 * Les mois sans facture apparaissent à zéro plutôt que d'être omis : un
 * graphique qui saute un mois creux laisse croire à une croissance continue.
 */
export function computeMonthlyRevenue(
  invoices: readonly InvoiceSnapshot[],
  monthCount: number,
  reference: string,
): readonly MonthlyRevenue[] {
  const dernierMois = monthKey(reference);
  const cles: string[] = [];
  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    cles.push(shiftMonth(dernierMois, -offset));
  }

  const encaisseParMois = new Map<string, number>();
  for (const facture of invoices) {
    if (facture.status !== "paid") continue;
    const cle = monthKey(facture.date);
    encaisseParMois.set(cle, (encaisseParMois.get(cle) ?? 0) + facture.amount);
  }

  return cles.map((key) => ({
    key,
    label: MOIS_COURTS[Number(key.slice(5, 7)) - 1] ?? key,
    revenue: encaisseParMois.get(key) ?? 0,
  }));
}

/** Indicateurs de tête, calculés sur le mois de référence. */
export function computeDashboardMetrics(
  invoices: readonly InvoiceSnapshot[],
  projects: readonly ProjectSnapshot[],
  clientCount: number,
  currency: CurrencyCode,
  reference: string,
): DashboardMetrics {
  const moisCourant = monthKey(reference);
  const moisPrecedent = shiftMonth(moisCourant, -1);

  const encaisseSur = (cle: string) =>
    invoices
      .filter((f) => f.status === "paid" && monthKey(f.date) === cle)
      .reduce((total, f) => total + f.amount, 0);

  const encaisseCourant = encaisseSur(moisCourant);

  const enAttente = invoices.filter((f) => f.status === "pending");
  const enRetard = invoices.filter((f) => f.status === "overdue");

  const restantDu = [...enAttente, ...enRetard].reduce(
    (total, f) => total + f.amount,
    0,
  );

  const projetsActifs = projects.filter((p) => p.status === "active").length;

  return {
    collected: {
      value: money(encaisseCourant, currency),
      changePercent: changePercent(encaisseCourant, encaisseSur(moisPrecedent)),
    },
    outstanding: money(restantDu, currency),
    overdueAmount: money(
      enRetard.reduce((total, f) => total + f.amount, 0),
      currency,
    ),
    overdueCount: enRetard.length,
    activeProjects: { value: projetsActifs, change: null },
    clientCount,
    pendingInvoices: enAttente.length,
  };
}

/** Valeur totale du portefeuille de projets en cours. */
export function computeActivePipeline(
  projects: readonly ProjectSnapshot[],
  currency: CurrencyCode,
): Money {
  const montants = projects
    .filter((projet) => projet.status === "active")
    .map((projet) => money(projet.budget, currency));
  return montants.length === 0 ? zero(currency) : sum(montants, currency);
}
