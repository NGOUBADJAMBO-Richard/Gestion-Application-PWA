/**
 * Rentabilité par projet.
 *
 * Jusqu'ici l'application savait dire ce qu'un projet avait rapporté. Elle ne
 * savait pas dire ce qu'il avait coûté, donc jamais s'il avait été rentable.
 * C'est la seule question qui décide si l'on refait ce type de mission, à quel
 * prix, et pour quel client.
 *
 * ## Conventions de calcul, et pourquoi
 *
 * - **La recette est le hors taxes.** La TVA collectée n'appartient pas à
 *   l'entreprise : elle transite. Une marge calculée sur le TTC surestime la
 *   rentabilité d'exactement le taux de TVA.
 * - **Les brouillons et les devis ne comptent pas.** Un devis n'est pas une
 *   recette, c'est une espérance. Les compter produirait des marges
 *   confortables sur des affaires jamais signées.
 * - **Une facture annulée reste comptée, et son avoir la compense.** Exclure
 *   la facture *et* compter l'avoir retirerait deux fois le même montant. Les
 *   deux pièces existent au registre, leur somme vaut zéro : c'est exactement
 *   ce que l'on veut lire.
 * - **Le coût du temps et les dépenses non refacturées pèsent sur la marge ;
 *   les dépenses refacturées non.** Un domaine acheté 12 000 F et refacturé
 *   12 000 F traverse l'entreprise sans l'appauvrir.
 *
 * ## Frontière de couches
 *
 * Ce module ne connaît ni `Invoice` ni le stockage : il reçoit des documents
 * déjà réduits à leur portée financière (`RevenueDocument`). La conversion est
 * le travail de la couche application, qui seule sait lire des lignes de
 * facture.
 *
 * Ce module est pur.
 */

import { type Expense, netExpenses, rebilledExpenses } from "./expense";
import {
  add,
  type CurrencyCode,
  divide,
  isZero,
  type Money,
  subtract,
  sum,
} from "./money";
import {
  billableMinutes,
  laborCost,
  type TimeEntry,
  toHours,
  totalMinutes,
} from "./timeEntry";

/**
 * Un document commercial réduit à ce qui compte pour la rentabilité.
 *
 * `net` et `total` sont signés : négatifs pour un avoir, afin que la somme des
 * pièces d'un projet donne directement sa recette nette.
 */
export interface RevenueDocument {
  readonly id: string;
  readonly number: string;
  readonly kind: "quote" | "invoice" | "creditNote";
  readonly status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  /** Projet rattaché. Absent pour les pièces antérieures au rattachement. */
  readonly projectId?: string | undefined;
  /** Total hors taxes, signé. */
  readonly net: Money;
  /** Total toutes taxes comprises, signé. */
  readonly total: Money;
  /** Encaissements enregistrés, TTC. */
  readonly collected: Money;
}

export interface ProjectProfitability {
  readonly projectId: string;
  readonly currency: CurrencyCode;
  /** Prix de vente prévu au projet. */
  readonly budget: Money;

  /** Recette hors taxes des pièces émises. */
  readonly revenue: Money;
  /** Dû toutes taxes comprises des pièces émises. */
  readonly billedTotal: Money;
  readonly collected: Money;
  /** Reste à encaisser. Négatif si le client a trop versé. */
  readonly outstanding: Money;

  readonly laborCost: Money;
  /** Dépenses supportées par l'entreprise. */
  readonly expenseCost: Money;
  /** Dépenses avancées puis refacturées : hors marge, mais sorties de caisse. */
  readonly rebilledExpenseCost: Money;
  readonly totalCost: Money;

  /** Recette hors taxes moins coûts. Négative si le projet a coûté plus qu'il n'a rapporté. */
  readonly margin: Money;
  /** Marge en pourcentage de la recette. `null` si rien n'a encore été facturé. */
  readonly marginPercent: number | null;

  readonly minutesLogged: number;
  readonly billableMinutes: number;
  /** Recette par heure réellement passée. `null` si aucun temps saisi. */
  readonly revenuePerHour: Money | null;

  /** Part du budget déjà facturée, en pourcentage. `null` si budget nul. */
  readonly billedVsBudgetPercent: number | null;
  /** Part du budget consommée en coûts, en pourcentage. `null` si budget nul. */
  readonly costVsBudgetPercent: number | null;

  /**
   * Signal de dérive : le projet a consommé plus de coûts qu'il ne rapportera
   * au budget prévu. Vrai même si rien n'est encore facturé — c'est justement
   * le moment où l'alerte sert.
   */
  readonly overBudget: boolean;
}

/** Une pièce compte-t-elle comme recette ? */
function isIssuedRevenue(document: RevenueDocument): boolean {
  if (document.kind === "quote") return false;
  // Un brouillon n'a pas de numéro et n'engage rien.
  if (document.status === "draft") return false;
  return true;
}

function percentOfBase(value: Money, base: Money): number | null {
  if (isZero(base)) return null;
  return (value.amount / base.amount) * 100;
}

export interface ProfitabilityInput {
  readonly projectId: string;
  readonly currency: CurrencyCode;
  readonly budget: Money;
  /** Toutes les pièces connues : le filtrage par projet est fait ici. */
  readonly documents: readonly RevenueDocument[];
  readonly timeEntries: readonly TimeEntry[];
  readonly expenses: readonly Expense[];
}

export function computeProjectProfitability(
  input: ProfitabilityInput,
): ProjectProfitability {
  const { projectId, currency, budget } = input;

  const pieces = input.documents.filter(
    (document) => document.projectId === projectId && isIssuedRevenue(document),
  );
  const temps = input.timeEntries.filter((entry) => entry.projectId === projectId);
  const depenses = input.expenses.filter(
    (expense) => expense.projectId === projectId,
  );

  const revenue = sum(
    pieces.map((document) => document.net),
    currency,
  );
  const billedTotal = sum(
    pieces.map((document) => document.total),
    currency,
  );
  const collected = sum(
    pieces.map((document) => document.collected),
    currency,
  );

  const cout = laborCost(temps, currency);
  const depensesNettes = netExpenses(depenses, currency);
  const depensesRefacturees = rebilledExpenses(depenses, currency);
  const totalCost = add(cout, depensesNettes);

  const margin = subtract(revenue, totalCost);
  const minutes = totalMinutes(temps);

  return {
    projectId,
    currency,
    budget,
    revenue,
    billedTotal,
    collected,
    outstanding: subtract(billedTotal, collected),
    laborCost: cout,
    expenseCost: depensesNettes,
    rebilledExpenseCost: depensesRefacturees,
    totalCost,
    margin,
    marginPercent: percentOfBase(margin, revenue),
    minutesLogged: minutes,
    billableMinutes: billableMinutes(temps),
    revenuePerHour: minutes === 0 ? null : divide(revenue, toHours(minutes)),
    billedVsBudgetPercent: percentOfBase(revenue, budget),
    costVsBudgetPercent: percentOfBase(totalCost, budget),
    overBudget: !isZero(budget) && totalCost.amount > budget.amount,
  };
}

export interface PortfolioProfitability {
  readonly currency: CurrencyCode;
  readonly projects: readonly ProjectProfitability[];
  readonly revenue: Money;
  readonly totalCost: Money;
  readonly margin: Money;
  readonly marginPercent: number | null;
  readonly minutesLogged: number;
  /**
   * Pièces émises sans projet rattaché.
   *
   * Signalées et non réparties : imputer au hasard une facture à un projet
   * inventerait une rentabilité. Cette liste dit exactement quelle part du
   * chiffre d'affaires échappe encore à l'analyse.
   */
  readonly unassignedDocuments: readonly RevenueDocument[];
  readonly unassignedRevenue: Money;
  /** Dépenses de structure : réelles, mais imputables à aucun projet. */
  readonly overheadExpenses: Money;
  /** Temps saisi sur un projet qui n'existe plus. */
  readonly orphanMinutes: number;
}

export interface PortfolioInput {
  readonly currency: CurrencyCode;
  readonly projects: readonly { readonly id: string; readonly budget: Money }[];
  readonly documents: readonly RevenueDocument[];
  readonly timeEntries: readonly TimeEntry[];
  readonly expenses: readonly Expense[];
}

export function computePortfolioProfitability(
  input: PortfolioInput,
): PortfolioProfitability {
  const { currency } = input;

  const projects = input.projects.map((project) =>
    computeProjectProfitability({
      projectId: project.id,
      currency,
      budget: project.budget,
      documents: input.documents,
      timeEntries: input.timeEntries,
      expenses: input.expenses,
    }),
  );

  const revenue = sum(
    projects.map((project) => project.revenue),
    currency,
  );
  const totalCost = sum(
    projects.map((project) => project.totalCost),
    currency,
  );
  const margin = subtract(revenue, totalCost);

  const nonRattachees = input.documents.filter(
    (document) =>
      isIssuedRevenue(document) &&
      (document.projectId === undefined || document.projectId.length === 0),
  );

  const idsProjets = new Set(input.projects.map((project) => project.id));
  const structure = input.expenses.filter(
    (expense) =>
      expense.projectId === undefined ||
      expense.projectId.length === 0 ||
      !idsProjets.has(expense.projectId),
  );
  const tempsOrphelin = input.timeEntries.filter(
    (entry) => !idsProjets.has(entry.projectId),
  );

  return {
    currency,
    projects,
    revenue,
    totalCost,
    margin,
    marginPercent: percentOfBase(margin, revenue),
    minutesLogged: projects.reduce(
      (total, project) => total + project.minutesLogged,
      0,
    ),
    unassignedDocuments: nonRattachees,
    unassignedRevenue: sum(
      nonRattachees.map((document) => document.net),
      currency,
    ),
    overheadExpenses: netExpenses(structure, currency),
    orphanMinutes: totalMinutes(tempsOrphelin),
  };
}

/**
 * Classement par marge, du meilleur au pire.
 *
 * Les projets sans aucune activité — ni facture, ni temps, ni dépense — sont
 * écartés : ils ne sont pas rentables à zéro, ils sont simplement vides, et
 * les faire figurer au milieu du classement brouillerait la lecture.
 */
export function rankByMargin(
  projects: readonly ProjectProfitability[],
): readonly ProjectProfitability[] {
  return projects
    .filter(
      (project) =>
        !isZero(project.revenue) ||
        !isZero(project.totalCost) ||
        project.minutesLogged > 0,
    )
    .slice()
    .sort((a, b) => b.margin.amount - a.margin.amount);
}

/** Total des coûts de toutes natures, y compris les avances refacturées. */
export function cashOut(project: ProjectProfitability): Money {
  return add(project.totalCost, project.rebilledExpenseCost);
}

