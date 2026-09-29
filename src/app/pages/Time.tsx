import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Pencil,
  Plus,
  Receipt,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { todayIso } from "../../domain/date";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type Expense,
  type ExpenseCategory,
  rebilledExpenses,
  totalExpenses,
  totalsByCategory,
  validateExpense,
} from "../../domain/expense";
import { formatMoney, money } from "../../domain/money";
import {
  computePortfolioProfitability,
  rankByMargin,
} from "../../domain/profitability";
import {
  billableMinutes,
  formatDuration,
  laborCost,
  parseDuration,
  type TimeEntry,
  totalMinutes,
  validateTimeEntry,
} from "../../domain/timeEntry";
import { DataStateNotice } from "../components/DataStateNotice";
import { ProjectSelect } from "../components/ProjectSelect";
import { Meter, StatCard } from "../components/StatCard";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { toRevenueDocuments } from "../data/documentTotals";
import {
  expenseRepository,
  invoiceRepository,
  timeEntryRepository,
} from "../data/repositories";
import { useCollection } from "../hooks/useCollection";
import { useCompanyProfile } from "../hooks/useCompanyProfile";
import { useProjectIndex } from "../hooks/useProjectIndex";

/**
 * Temps, dépenses et rentabilité.
 *
 * L'application savait dire ce qu'un projet avait rapporté ; elle ne savait pas
 * dire ce qu'il avait coûté. Trois onglets comblent ce trou et se répondent :
 * le temps et les dépenses sont les deux sources de coût, la rentabilité en est
 * la lecture. Les séparer en trois écrans obligerait à naviguer pour
 * comprendre un seul chiffre.
 */

type Onglet = "time" | "expenses" | "profitability";

/** Formulaire de saisie du temps. La durée reste du texte jusqu'à validation. */
interface FormulaireTemps {
  readonly projectId: string | undefined;
  readonly date: string;
  readonly duree: string;
  readonly description: string;
  readonly billable: boolean;
  readonly hourlyCost: string;
}

interface FormulaireDepense {
  readonly projectId: string | undefined;
  readonly date: string;
  readonly label: string;
  readonly amount: string;
  readonly category: ExpenseCategory;
  readonly supplier: string;
  readonly rebilled: boolean;
  readonly notes: string;
}

function formulaireTempsVide(coutParDefaut: number): FormulaireTemps {
  return {
    projectId: undefined,
    date: todayIso(),
    duree: "",
    description: "",
    billable: true,
    hourlyCost: String(coutParDefaut),
  };
}

function formulaireDepenseVide(): FormulaireDepense {
  return {
    projectId: undefined,
    date: todayIso(),
    label: "",
    amount: "",
    category: "other",
    supplier: "",
    rebilled: false,
    notes: "",
  };
}

/** Couleur d'un pourcentage de marge, du confortable au préoccupant. */
function tonDeMarge(percent: number | null): string {
  if (percent === null) return "text-muted-foreground";
  if (percent < 0) return "text-destructive";
  if (percent < 20) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function Time() {
  const { profile } = useCompanyProfile();
  const devise = profile.currency;
  const argent = (montant: number) => formatMoney(money(montant, devise));

  const {
    items: saisies,
    isLoading: chargementTemps,
    error: erreurTemps,
    create: creerTemps,
    update: majTemps,
    remove: supprimerTemps,
    dismissError: oublierErreurTemps,
  } = useCollection(timeEntryRepository);

  const {
    items: depenses,
    isLoading: chargementDepenses,
    error: erreurDepenses,
    create: creerDepense,
    update: majDepense,
    remove: supprimerDepense,
    dismissError: oublierErreurDepenses,
  } = useCollection(expenseRepository);

  const { items: factures } = useCollection(invoiceRepository);
  const { projects, nameOf } = useProjectIndex();

  const [onglet, setOnglet] = useState<Onglet>("time");

  const [dialogueTemps, setDialogueTemps] = useState(false);
  const [tempsEnEdition, setTempsEnEdition] = useState<TimeEntry | null>(null);
  const [formTemps, setFormTemps] = useState<FormulaireTemps>(() =>
    formulaireTempsVide(profile.defaultHourlyCost),
  );

  const [dialogueDepense, setDialogueDepense] = useState(false);
  const [depenseEnEdition, setDepenseEnEdition] = useState<Expense | null>(null);
  const [formDepense, setFormDepense] = useState<FormulaireDepense>(
    formulaireDepenseVide,
  );

  const [tempsASupprimer, setTempsASupprimer] = useState<TimeEntry | null>(null);
  const [depenseASupprimer, setDepenseASupprimer] = useState<Expense | null>(
    null,
  );

  const aujourdHui = todayIso();

  const portefeuille = useMemo(
    () =>
      computePortfolioProfitability({
        currency: devise,
        projects: projects.map((project) => ({
          id: project.id,
          budget: money(Math.round(project.budget), devise),
        })),
        documents: toRevenueDocuments(factures, devise),
        timeEntries: saisies,
        expenses: depenses,
      }),
    [devise, projects, factures, saisies, depenses],
  );

  const classement = useMemo(
    () => rankByMargin(portefeuille.projects),
    [portefeuille],
  );

  // Les listes vont du plus récent au plus ancien : on relit d'abord ce qu'on
  // vient de saisir, jamais ce qu'on a saisi il y a six mois.
  const saisiesTriees = useMemo(
    () => [...saisies].sort((a, b) => b.date.localeCompare(a.date)),
    [saisies],
  );
  const depensesTriees = useMemo(
    () => [...depenses].sort((a, b) => b.date.localeCompare(a.date)),
    [depenses],
  );

  /**
   * Dépenses réellement retenues dans la marge consolidée.
   *
   * La carte affichait le total de toutes les dépenses, frais de structure
   * compris — alors que la marge, elle, ne retient que celles imputées à un
   * projet. Les quatre chiffres d'en-tête ne se recomposaient donc pas :
   * recette − temps − dépenses ne tombait pas sur la marge affichée.
   */
  const depensesDeProjet = portefeuille.projects.reduce(
    (total, projet) => total + projet.expenseCost.amount,
    0,
  );

  const minutesTotales = totalMinutes(saisies);
  const minutesFacturables = billableMinutes(saisies);
  const coutTemps = laborCost(saisies, devise);

  const ouvrirCreationTemps = () => {
    setTempsEnEdition(null);
    setFormTemps(formulaireTempsVide(profile.defaultHourlyCost));
    setDialogueTemps(true);
  };

  const ouvrirEditionTemps = (entree: TimeEntry) => {
    setTempsEnEdition(entree);
    setFormTemps({
      projectId: entree.projectId,
      date: entree.date,
      duree: formatDuration(entree.minutes).replace(/\s/g, ""),
      description: entree.description,
      billable: entree.billable,
      hourlyCost: String(entree.hourlyCost),
    });
    setDialogueTemps(true);
  };

  const enregistrerTemps = (evenement: React.FormEvent) => {
    evenement.preventDefault();

    let minutes: number;
    try {
      minutes = parseDuration(formTemps.duree);
    } catch (cause) {
      toast.error("Durée illisible", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return;
    }

    const brouillon: Omit<TimeEntry, "id"> = {
      projectId: formTemps.projectId ?? "",
      date: formTemps.date,
      minutes,
      description: formTemps.description.trim(),
      billable: formTemps.billable,
      hourlyCost: Math.round(Number(formTemps.hourlyCost) || 0),
    };

    try {
      validateTimeEntry(brouillon, { today: aujourdHui });
    } catch (cause) {
      toast.error("Saisie refusée", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return;
    }

    const suite =
      tempsEnEdition === null
        ? creerTemps(brouillon)
        : majTemps(tempsEnEdition.id, brouillon);

    void suite.then((resultat) => {
      if (resultat === undefined) return;
      toast.success(
        tempsEnEdition === null ? "Temps enregistré." : "Saisie corrigée.",
        { description: `${formatDuration(minutes)} sur ${nameOf(brouillon.projectId)}` },
      );
      setDialogueTemps(false);
      setTempsEnEdition(null);
    });
  };

  const ouvrirCreationDepense = () => {
    setDepenseEnEdition(null);
    setFormDepense(formulaireDepenseVide());
    setDialogueDepense(true);
  };

  const ouvrirEditionDepense = (depense: Expense) => {
    setDepenseEnEdition(depense);
    setFormDepense({
      projectId: depense.projectId,
      date: depense.date,
      label: depense.label,
      amount: String(depense.amount),
      category: depense.category,
      supplier: depense.supplier ?? "",
      rebilled: depense.rebilled,
      notes: depense.notes ?? "",
    });
    setDialogueDepense(true);
  };

  const enregistrerDepense = (evenement: React.FormEvent) => {
    evenement.preventDefault();

    const brouillon: Omit<Expense, "id"> = {
      date: formDepense.date,
      label: formDepense.label.trim(),
      amount: Math.round(Number(formDepense.amount) || 0),
      category: formDepense.category,
      projectId: formDepense.projectId,
      supplier: formDepense.supplier.trim() || undefined,
      rebilled: formDepense.rebilled,
      notes: formDepense.notes.trim() || undefined,
    };

    try {
      validateExpense(brouillon, { today: aujourdHui });
    } catch (cause) {
      toast.error("Dépense refusée", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return;
    }

    const suite =
      depenseEnEdition === null
        ? creerDepense(brouillon)
        : majDepense(depenseEnEdition.id, brouillon);

    void suite.then((resultat) => {
      if (resultat === undefined) return;
      toast.success(
        depenseEnEdition === null ? "Dépense enregistrée." : "Dépense corrigée.",
        { description: `${brouillon.label} — ${argent(brouillon.amount)}` },
      );
      setDialogueDepense(false);
      setDepenseEnEdition(null);
    });
  };

  return (
    <div className="space-y-6">
      <DataStateNotice
        isLoading={chargementTemps || chargementDepenses}
        error={erreurTemps ?? erreurDepenses}
        onDismiss={erreurTemps === null ? oublierErreurDepenses : oublierErreurTemps}
        label="le temps et les dépenses"
      />

      <header className="enter wave-surface -mx-4 px-4 py-6 lg:-mx-6 lg:px-6">
        <p className="section-label">Comptabilité analytique</p>
        <div className="flex flex-col gap-4 mt-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1>Temps &amp; rentabilité</h1>
            <p className="text-muted-foreground mt-1">
              Ce que chaque projet rapporte, et ce qu&rsquo;il coûte réellement.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={ouvrirCreationTemps}>
              <Timer className="w-4 h-4" />
              Saisir du temps
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={ouvrirCreationDepense}
            >
              <Receipt className="w-4 h-4" />
              Ajouter une dépense
            </Button>
          </div>
        </div>
      </header>

      {/* Chiffres d'ensemble */}
      <div className="enter-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Temps saisi"
          value={formatDuration(minutesTotales)}
          hint={`dont ${formatDuration(minutesFacturables)} refacturable`}
          icon={Clock}
        />
        <StatCard
          label="Coût du temps"
          value={argent(coutTemps.amount)}
          hint="aux coûts horaires figés à la saisie"
          icon={Timer}
        />
        <StatCard
          label="Dépenses imputées aux projets"
          value={argent(depensesDeProjet)}
          hint={
            `+ ${argent(portefeuille.overheadExpenses.amount)} de structure · + ${argent(rebilledExpenses(depenses, devise).amount)} refacturés`
          }
          icon={Receipt}
        />
        <StatCard
          label="Marge consolidée"
          value={argent(portefeuille.margin.amount)}
          tone={
            portefeuille.marginPercent === null
              ? "neutral"
              : portefeuille.margin.amount < 0
                ? "negative"
                : portefeuille.marginPercent < 20
                  ? "warning"
                  : "positive"
          }
          icon={portefeuille.margin.amount < 0 ? TrendingDown : TrendingUp}
          hint={
            portefeuille.marginPercent === null
              ? "aucune pièce émise"
              : `${portefeuille.marginPercent.toFixed(1)} % du chiffre d'affaires HT`
          }
        />
      </div>

      {/* Angles morts de l'analyse : dits, jamais comblés au hasard. */}
      {(portefeuille.unassignedDocuments.length > 0 ||
        portefeuille.orphanMinutes > 0) && (
        <Card className="border-amber-500/40">
          <CardContent className="pt-6 flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm space-y-1">
              {portefeuille.unassignedDocuments.length > 0 && (
                <p>
                  {portefeuille.unassignedDocuments.length} pièce(s) émise(s)
                  pour {argent(portefeuille.unassignedRevenue.amount)} HT ne sont
                  rattachées à aucun projet : elles comptent au chiffre
                  d&rsquo;affaires mais pas à la rentabilité. Ouvre la
                  facturation pour les rattacher.
                </p>
              )}
              {portefeuille.orphanMinutes > 0 && (
                <p>
                  {formatDuration(portefeuille.orphanMinutes)} sont saisies sur
                  un projet supprimé. Réaffecte-les depuis l&rsquo;onglet Temps.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={onglet} onValueChange={(valeur) => setOnglet(valeur as Onglet)}>
        <TabsList>
          <TabsTrigger value="time">Temps</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="profitability">Rentabilité</TabsTrigger>
        </TabsList>
      </Tabs>

      {onglet === "time" && (
        <Card>
          <CardHeader>
            <CardTitle>Saisies de temps</CardTitle>
          </CardHeader>
          <CardContent>
            {saisiesTriees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun temps saisi. Sans temps, la marge d&rsquo;un projet n&rsquo;est
                pas calculable : seul son prix est connu.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="table-zebra">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Projet</TableHead>
                      <TableHead>Tâche</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Coût</TableHead>
                      <TableHead>Refacturable</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saisiesTriees.map((entree) => (
                      <TableRow key={entree.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(`${entree.date}T00:00:00`).toLocaleDateString(
                            "fr-FR",
                          )}
                        </TableCell>
                        <TableCell>{nameOf(entree.projectId)}</TableCell>
                        <TableCell className="max-w-[18rem]">
                          {entree.description}
                        </TableCell>
                        <TableCell className="amount whitespace-nowrap">
                          {formatDuration(entree.minutes)}
                        </TableCell>
                        <TableCell className="amount whitespace-nowrap">
                          {argent(laborCost([entree], devise).amount)}
                        </TableCell>
                        <TableCell>
                          {entree.billable ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Oui
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Non
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => ouvrirEditionTemps(entree)}
                              aria-label={`Modifier la saisie du ${entree.date}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTempsASupprimer(entree)}
                              aria-label={`Supprimer la saisie du ${entree.date}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {onglet === "expenses" && (
        <div className="space-y-6">
          {depensesTriees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Répartition par poste</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {totalsByCategory(depenses, devise).map((ligne) => {
                  const part =
                    (ligne.total.amount /
                      Math.max(1, totalExpenses(depenses, devise).amount)) *
                    100;
                  return (
                    <div key={ligne.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          {ligne.label}{" "}
                          <span className="text-muted-foreground">
                            ({ligne.count})
                          </span>
                        </span>
                        <span className="amount">{argent(ligne.total.amount)}</span>
                      </div>
                      <div className="meter">
                        <span style={{ width: `${part}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Dépenses enregistrées</CardTitle>
            </CardHeader>
            <CardContent>
              {depensesTriees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune dépense enregistrée.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="table-zebra">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Intitulé</TableHead>
                        <TableHead>Poste</TableHead>
                        <TableHead>Projet</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Refacturée</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {depensesTriees.map((depense) => (
                        <TableRow key={depense.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(
                              `${depense.date}T00:00:00`,
                            ).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell className="max-w-[16rem]">
                            {depense.label}
                            {depense.supplier !== undefined &&
                              depense.supplier.length > 0 && (
                                <span className="block text-xs text-muted-foreground">
                                  {depense.supplier}
                                </span>
                              )}
                          </TableCell>
                          <TableCell>
                            {EXPENSE_CATEGORY_LABELS[depense.category]}
                          </TableCell>
                          <TableCell>{nameOf(depense.projectId)}</TableCell>
                          <TableCell className="amount whitespace-nowrap">
                            {argent(depense.amount)}
                          </TableCell>
                          <TableCell>
                            {depense.rebilled ? (
                              <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                Oui
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Non
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => ouvrirEditionDepense(depense)}
                                aria-label={`Modifier la dépense ${depense.label}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDepenseASupprimer(depense)}
                                aria-label={`Supprimer la dépense ${depense.label}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {onglet === "profitability" && (
        <div className="space-y-4">
          {classement.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Aucun projet n&rsquo;a encore d&rsquo;activité : ni pièce émise, ni
                temps, ni dépense. La rentabilité apparaîtra dès la première
                saisie.
              </CardContent>
            </Card>
          ) : (
            classement.map((projet) => {
              const nom = nameOf(projet.projectId);
              const enPerte = projet.margin.amount < 0;
              return (
                <Card key={projet.projectId}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-lg">{nom}</h2>
                        <p className="text-sm text-muted-foreground">
                          Budget {argent(projet.budget.amount)} &middot;{" "}
                          {formatDuration(projet.minutesLogged)} passées
                          {projet.revenuePerHour !== null && (
                            <>
                              {" "}
                              &middot; {argent(projet.revenuePerHour.amount)} /
                              heure
                            </>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`figure text-2xl flex items-center gap-2 sm:justify-end ${tonDeMarge(projet.marginPercent)}`}
                        >
                          {enPerte ? (
                            <TrendingDown className="w-5 h-5" />
                          ) : (
                            <TrendingUp className="w-5 h-5" />
                          )}
                          {argent(projet.margin.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {projet.marginPercent === null
                            ? "rien de facturé"
                            : `marge de ${projet.marginPercent.toFixed(1)} %`}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm lg:grid-cols-4">
                      {[
                        ["Facturé HT", projet.revenue.amount],
                        ["Coût du temps", projet.laborCost.amount],
                        ["Dépenses", projet.expenseCost.amount],
                        ["Reste à encaisser", projet.outstanding.amount],
                      ].map(([libelle, montant]) => (
                        <div key={libelle as string}>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {libelle}
                          </p>
                          <p className="amount mt-1">
                            {argent(montant as number)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {projet.costVsBudgetPercent !== null && (
                      <Meter
                        percent={projet.costVsBudgetPercent}
                        label="Budget consommé en coûts"
                      />
                    )}

                    {/*
                      Dépasser le budget et perdre de l'argent sont deux
                      faits distincts. Un projet peut consommer 144 % du
                      budget prévu et rester rentable, parce que la
                      facturation a suivi — une prestation ajoutée en cours
                      de route. Annoncer « ne sera pas rentable » dans ce cas
                      est simplement faux, et une alerte fausse finit par ne
                      plus être lue.
                    */}
                    {projet.overBudget &&
                      (projet.margin.amount <= 0 ? (
                        <p className="flex items-center gap-2 text-sm text-destructive">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          Les coûts dépassent le budget prévu et la
                          facturation ne les couvre pas : ce projet perd de
                          l&rsquo;argent.
                        </p>
                      ) : (
                        <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          Les coûts dépassent le budget prévu, mais la
                          facturation a suivi. À surveiller au prochain devis
                          de ce type.
                        </p>
                      ))}
                  </CardContent>
                </Card>
              );
            })
          )}

          {portefeuille.overheadExpenses.amount > 0 && (
            <Card>
              <CardContent className="pt-6 text-sm">
                <p className="text-muted-foreground">
                  Frais de structure, imputables à aucun projet
                </p>
                <p className="text-xl mt-1">
                  {argent(portefeuille.overheadExpenses.amount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ils ne sont volontairement pas répartis entre les projets :
                  une clé de répartition arbitraire fabriquerait des marges
                  fausses.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Saisie du temps */}
      <Dialog
        open={dialogueTemps}
        onOpenChange={(ouvert) => {
          setDialogueTemps(ouvert);
          if (!ouvert) setTempsEnEdition(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={enregistrerTemps}>
            <DialogHeader>
              <DialogTitle>
                {tempsEnEdition === null
                  ? "Saisir du temps"
                  : "Corriger la saisie"}
              </DialogTitle>
              <DialogDescription>
                Le coût horaire est figé au moment de la saisie : une
                augmentation ne réécrit pas la marge des projets déjà livrés.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="temps-projet">Projet</Label>
                <ProjectSelect
                  id="temps-projet"
                  value={formTemps.projectId}
                  onChange={(projectId) =>
                    setFormTemps((prev) => ({ ...prev, projectId }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="temps-date">Date</Label>
                  <Input
                    id="temps-date"
                    type="date"
                    max={aujourdHui}
                    value={formTemps.date}
                    onChange={(e) =>
                      setFormTemps((prev) => ({ ...prev, date: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temps-duree">Durée</Label>
                  <Input
                    id="temps-duree"
                    value={formTemps.duree}
                    onChange={(e) =>
                      setFormTemps((prev) => ({ ...prev, duree: e.target.value }))
                    }
                    placeholder="1h30"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    « 1h30 », « 90 » ou « 1,5h » — au choix.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="temps-tache">Tâche</Label>
                <Input
                  id="temps-tache"
                  value={formTemps.description}
                  onChange={(e) =>
                    setFormTemps((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Intégration de la page tarifs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temps-cout">
                  Coût horaire interne ({devise})
                </Label>
                <Input
                  id="temps-cout"
                  type="number"
                  min={0}
                  step={500}
                  value={formTemps.hourlyCost}
                  onChange={(e) =>
                    setFormTemps((prev) => ({
                      ...prev,
                      hourlyCost: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Ce que cette heure coûte à l&rsquo;entreprise, pas ce qu&rsquo;elle
                  est vendue. La valeur par défaut se règle dans Paramètres.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="temps-refacturable" className="leading-snug">
                  Refacturable au client
                  <span className="block text-xs text-muted-foreground font-normal">
                    Une reprise offerte reste un coût : décoche-la.
                  </span>
                </Label>
                <Switch
                  id="temps-refacturable"
                  checked={formTemps.billable}
                  onCheckedChange={(coche) =>
                    setFormTemps((prev) => ({ ...prev, billable: coche }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogueTemps(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="gap-2">
                <Clock className="w-4 h-4" />
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Saisie d'une dépense */}
      <Dialog
        open={dialogueDepense}
        onOpenChange={(ouvert) => {
          setDialogueDepense(ouvert);
          if (!ouvert) setDepenseEnEdition(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={enregistrerDepense}>
            <DialogHeader>
              <DialogTitle>
                {depenseEnEdition === null
                  ? "Ajouter une dépense"
                  : "Corriger la dépense"}
              </DialogTitle>
              <DialogDescription>
                Le montant saisi est celui réellement payé, toutes taxes
                comprises.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="depense-intitule">Intitulé</Label>
                <Input
                  id="depense-intitule"
                  value={formDepense.label}
                  onChange={(e) =>
                    setFormDepense((prev) => ({ ...prev, label: e.target.value }))
                  }
                  placeholder="Hébergement mutualisé (1 an)"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="depense-date">Date</Label>
                  <Input
                    id="depense-date"
                    type="date"
                    max={aujourdHui}
                    value={formDepense.date}
                    onChange={(e) =>
                      setFormDepense((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depense-montant">Montant ({devise})</Label>
                  <Input
                    id="depense-montant"
                    type="number"
                    min={1}
                    value={formDepense.amount}
                    onChange={(e) =>
                      setFormDepense((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="depense-poste">Poste</Label>
                  <Select
                    value={formDepense.category}
                    onValueChange={(valeur) =>
                      setFormDepense((prev) => ({
                        ...prev,
                        category: valeur as ExpenseCategory,
                      }))
                    }
                  >
                    <SelectTrigger id="depense-poste">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((categorie) => (
                        <SelectItem key={categorie} value={categorie}>
                          {EXPENSE_CATEGORY_LABELS[categorie]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depense-fournisseur">Fournisseur</Label>
                  <Input
                    id="depense-fournisseur"
                    value={formDepense.supplier}
                    onChange={(e) =>
                      setFormDepense((prev) => ({
                        ...prev,
                        supplier: e.target.value,
                      }))
                    }
                    placeholder="Facultatif"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="depense-projet">Projet</Label>
                <ProjectSelect
                  id="depense-projet"
                  value={formDepense.projectId}
                  allowNone
                  noneLabel="Frais de structure (aucun projet)"
                  onChange={(projectId) =>
                    setFormDepense((prev) => ({
                      ...prev,
                      projectId,
                      // Sans projet, il n'y a personne à refacturer.
                      rebilled: projectId === undefined ? false : prev.rebilled,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="depense-refacturee" className="leading-snug">
                  Refacturée au client
                  <span className="block text-xs text-muted-foreground font-normal">
                    Avancée puis répercutée à l&rsquo;identique : hors marge.
                  </span>
                </Label>
                <Switch
                  id="depense-refacturee"
                  checked={formDepense.rebilled}
                  disabled={formDepense.projectId === undefined}
                  onCheckedChange={(coche) =>
                    setFormDepense((prev) => ({ ...prev, rebilled: coche }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depense-notes">Notes</Label>
                <Textarea
                  id="depense-notes"
                  value={formDepense.notes}
                  onChange={(e) =>
                    setFormDepense((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Facultatif"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogueDepense(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="gap-2">
                <Plus className="w-4 h-4" />
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={tempsASupprimer !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) setTempsASupprimer(null);
        }}
        subject={
          tempsASupprimer === null
            ? ""
            : `la saisie de ${formatDuration(tempsASupprimer.minutes)} du ${tempsASupprimer.date}`
        }
        decision={{ allowed: true }}
        consequence="La saisie part à la corbeille et la marge du projet est recalculée."
        onConfirm={() => {
          if (tempsASupprimer !== null) void supprimerTemps(tempsASupprimer.id);
          setTempsASupprimer(null);
        }}
      />

      <ConfirmDelete
        open={depenseASupprimer !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) setDepenseASupprimer(null);
        }}
        subject={
          depenseASupprimer === null
            ? ""
            : `la dépense « ${depenseASupprimer.label} »`
        }
        decision={{ allowed: true }}
        consequence="La dépense part à la corbeille et la marge du projet est recalculée."
        onConfirm={() => {
          if (depenseASupprimer !== null)
            void supprimerDepense(depenseASupprimer.id);
          setDepenseASupprimer(null);
        }}
      />
    </div>
  );
}
