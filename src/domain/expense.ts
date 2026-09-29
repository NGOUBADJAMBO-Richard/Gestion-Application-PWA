/**
 * Dépenses engagées.
 *
 * Le chiffre d'affaires ne dit rien de la santé d'une agence. Un projet
 * facturé 600 000 F qui a consommé 400 000 F de sous-traitance et deux
 * semaines d'un développeur n'est pas un bon projet — mais sans dépenses
 * enregistrées, l'application le présenterait comme tel.
 *
 * Choix assumé : **le montant saisi est ce qui a été payé, toutes taxes
 * comprises.** Aucune part de TVA n'est déduite ici. Traiter la TVA
 * récupérable demanderait de connaître le régime fiscal réel de l'entreprise,
 * ce qui n'est pas vérifié (voir docs/FISCALITE.md) ; afficher une marge
 * calculée sur une hypothèse fiscale fausse serait pire que de l'afficher
 * sur le montant réellement sorti de caisse.
 *
 * Ce module est pur.
 */

import { isIsoDate, type IsoDate } from "./date";
import { type CurrencyCode, type Money, money, sum } from "./money";

/**
 * Catégories de dépense.
 *
 * Liste fermée, volontairement courte : une liste libre produit « Hebergement »,
 * « hébergement » et « Hosting » dans la même base, et plus aucun total par
 * catégorie n'a de sens. « Autre » existe pour ne jamais bloquer une saisie.
 */
export const EXPENSE_CATEGORIES = [
  "subcontracting",
  "software",
  "hosting",
  "hardware",
  "travel",
  "marketing",
  "training",
  "fees",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  subcontracting: "Sous-traitance",
  software: "Logiciels et abonnements",
  hosting: "Hébergement et domaines",
  hardware: "Matériel",
  travel: "Déplacements",
  marketing: "Communication",
  training: "Formation",
  fees: "Frais bancaires et administratifs",
  other: "Autre",
};

export interface Expense {
  readonly id: string;
  readonly date: IsoDate;
  readonly label: string;
  /** Montant payé, en unité mineure. Strictement positif. */
  readonly amount: number;
  readonly category: ExpenseCategory;
  /**
   * Projet rattaché. Facultatif : un abonnement de comptabilité est une charge
   * de structure, pas le coût d'un projet. Forcer un rattachement pousserait à
   * imputer arbitrairement des frais généraux sur un chantier au hasard.
   */
  readonly projectId?: string | undefined;
  readonly supplier?: string | undefined;
  /**
   * Refacturée au client à l'identique.
   *
   * Un nom de domaine acheté 12 000 F et refacturé 12 000 F traverse
   * l'entreprise sans l'appauvrir : il ne doit pas peser sur la marge. En
   * revanche il reste une sortie de caisse, donc on l'enregistre et on le
   * distingue, au lieu de ne pas le saisir.
   */
  readonly rebilled: boolean;
  readonly notes?: string | undefined;
}

export class InvalidExpenseError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "InvalidExpenseError";
  }
}

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (
    typeof value === "string" &&
    (EXPENSE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function validateExpense(
  draft: Omit<Expense, "id">,
  options: { readonly today?: IsoDate } = {},
): void {
  if (!isIsoDate(draft.date)) {
    throw new InvalidExpenseError(
      "date",
      "La date de la dépense est absente ou invalide.",
    );
  }

  // Une dépense future est un engagement, pas une charge : l'enregistrer
  // fausserait la marge du mois en cours.
  if (options.today !== undefined && draft.date > options.today) {
    throw new InvalidExpenseError(
      "date",
      "Une dépense se saisit une fois engagée. Corrige la date.",
    );
  }

  if (draft.label.trim().length === 0) {
    throw new InvalidExpenseError(
      "label",
      "Nomme la dépense : un montant sans intitulé est injustifiable en contrôle.",
    );
  }

  if (!Number.isInteger(draft.amount) || draft.amount <= 0) {
    throw new InvalidExpenseError(
      "amount",
      "Le montant doit être un entier strictement positif. Un remboursement se saisit comme une recette, pas comme une dépense négative.",
    );
  }

  if (!isExpenseCategory(draft.category)) {
    throw new InvalidExpenseError("category", "Choisis une catégorie de dépense.");
  }

  if (draft.rebilled && (draft.projectId ?? "").trim().length === 0) {
    throw new InvalidExpenseError(
      "projectId",
      "Une dépense refacturée doit désigner le projet sur lequel elle sera refacturée.",
    );
  }
}

/** Total de toutes les dépenses fournies. */
export function totalExpenses(
  expenses: readonly Expense[],
  currency: CurrencyCode,
): Money {
  return sum(
    expenses.map((expense) => money(expense.amount, currency)),
    currency,
  );
}

/** Dépenses qui pèsent réellement sur la marge : celles qui ne sont pas refacturées. */
export function netExpenses(
  expenses: readonly Expense[],
  currency: CurrencyCode,
): Money {
  return totalExpenses(
    expenses.filter((expense) => !expense.rebilled),
    currency,
  );
}

/** Dépenses avancées pour le compte du client, puis refacturées. */
export function rebilledExpenses(
  expenses: readonly Expense[],
  currency: CurrencyCode,
): Money {
  return totalExpenses(
    expenses.filter((expense) => expense.rebilled),
    currency,
  );
}

export interface CategoryTotal {
  readonly category: ExpenseCategory;
  readonly label: string;
  readonly total: Money;
  readonly count: number;
}

/**
 * Totaux par catégorie, du plus lourd au plus léger.
 *
 * Les catégories sans dépense sont omises : une liste de neuf lignes dont sept
 * à zéro noie les deux qui comptent.
 */
export function totalsByCategory(
  expenses: readonly Expense[],
  currency: CurrencyCode,
): readonly CategoryTotal[] {
  const parCategorie = new Map<ExpenseCategory, Expense[]>();
  for (const expense of expenses) {
    const groupe = parCategorie.get(expense.category);
    if (groupe === undefined) parCategorie.set(expense.category, [expense]);
    else groupe.push(expense);
  }

  return [...parCategorie.entries()]
    .map(([category, groupe]) => ({
      category,
      label: EXPENSE_CATEGORY_LABELS[category],
      total: totalExpenses(groupe, currency),
      count: groupe.length,
    }))
    .sort(
      (a, b) => b.total.amount - a.total.amount || a.label.localeCompare(b.label, "fr"),
    );
}

/** Dépenses d'une période, bornes incluses. */
export function expensesBetween(
  expenses: readonly Expense[],
  from: IsoDate,
  to: IsoDate,
): readonly Expense[] {
  return expenses.filter((expense) => expense.date >= from && expense.date <= to);
}
