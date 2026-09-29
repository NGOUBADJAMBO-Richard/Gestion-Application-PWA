import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Pencil,
  Trash2,
  FolderKanban,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import type { Project } from "../data/mockData";
import { projectRepository } from "../data/repositories";
import { useCollection } from "../hooks/useCollection";
import { DataStateNotice } from "../components/DataStateNotice";
import { ClientSelect } from "../components/ClientSelect";
import { useClientIndex } from "../hooks/useClientIndex";
import { invoiceRepository } from "../data/repositories";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { canDeleteProject } from "../../domain/rules";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { formatCurrencyXAF } from "../utils/currency";
import { formatMoney, money } from "../../domain/money";
import { computeProjectProfitability } from "../../domain/profitability";
import { toRevenueDocuments } from "../data/documentTotals";
import { expenseRepository, timeEntryRepository } from "../data/repositories";
import { useCompanyProfile } from "../hooks/useCompanyProfile";
import { formatDuration } from "../../domain/timeEntry";
import { StatCard } from "../components/StatCard";

export function Projects() {
  const { t } = useLanguage();
  // Les donnees vivent dans le depot : la saisie survit au rechargement.
  const {
    items: projects,
    isLoading,
    error,
    create,
    update,
    remove,
    dismissError,
  } = useCollection(projectRepository);
  const { nameOf } = useClientIndex();
  const { items: invoices } = useCollection(invoiceRepository);
  const { items: saisies } = useCollection(timeEntryRepository);
  const { items: depenses } = useCollection(expenseRepository);
  const { profile } = useCompanyProfile();

  /**
   * Rentabilité de chaque projet, indexée par identifiant.
   *
   * Calculée ici et non dans la boucle de rendu : recalculer pour chaque ligne
   * à chaque frappe dans le champ de recherche relirait toutes les factures.
   */
  const rentabilites = useMemo(() => {
    const documents = toRevenueDocuments(invoices, profile.currency);
    return new Map(
      projects.map((projet) => [
        projet.id,
        computeProjectProfitability({
          projectId: projet.id,
          currency: profile.currency,
          budget: money(Math.round(projet.budget), profile.currency),
          documents,
          timeEntries: saisies,
          expenses: depenses,
        }),
      ]),
    );
  }, [projects, invoices, saisies, depenses, profile.currency]);
  const [projetASupprimer, setProjetASupprimer] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<Omit<Project, "id">>({
    name: "",
    clientId: "",
    status: "pending",
    deadline: "",
    budget: 0,
    progress: 0,
    description: "",
  });

  /**
   * Le portefeuille de projets en quatre chiffres.
   *
   * La liste disait combien de projets existaient, jamais ce qu'ils valaient
   * ni lesquels dérivaient. Les rentabilités sont déjà calculées ligne à
   * ligne : on les agrège plutôt que de refaire le travail.
   */
  const bilan = useMemo(() => {
    const lignes = [...rentabilites.values()];
    return {
      actifs: projects.filter((projet) => projet.status === "active").length,
      budgetEnCours: projects
        .filter((projet) => projet.status === "active")
        .reduce((cumul, projet) => cumul + Math.round(projet.budget), 0),
      marge: lignes.reduce((cumul, ligne) => cumul + ligne.margin.amount, 0),
      // Ce qui compte est de perdre de l'argent, pas de dépasser un budget.
      //
      // La première version croisait les deux conditions et annonçait
      // « aucun projet ne perd d'argent » alors que deux en perdaient : leurs
      // coûts restaient sous le budget, mais la facturation n'avait pas
      // suivi. Le dépassement de budget reste signalé sur la fiche du
      // projet ; ici on compte les pertes.
      enPerte: lignes.filter(
        (ligne) =>
          ligne.margin.amount < 0 &&
          (ligne.revenue.amount !== 0 || ligne.totalCost.amount !== 0),
      ).length,
      horsBudget: lignes.filter((ligne) => ligne.overBudget).length,
    };
  }, [projects, rentabilites]);

  const argent = (montant: number) =>
    formatMoney(money(montant, profile.currency));

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nameOf(project.clientId).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "completed":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      clientId: project.clientId,
      status: project.status,
      deadline: project.deadline,
      budget: project.budget,
      progress: project.progress,
      description: project.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({
      name: "",
      clientId: "",
      status: "pending",
      deadline: "",
      budget: 0,
      progress: 0,
      description: "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Project, "id"> = {
      name: formData.name.trim(),
      clientId: formData.clientId,
      status: formData.status,
      deadline: formData.deadline,
      budget: Number(formData.budget) || 0,
      progress: Number(formData.progress) || 0,
      description: formData.description?.trim() || "",
    };

    if (!payload.name || !payload.clientId || !payload.deadline) {
      return;
    }

    if (editingProject) {
      void update(editingProject.id, payload);
    } else {
      void create(payload);
    }

    setIsDialogOpen(false);
    setEditingProject(null);
  };

  return (
    <div className="space-y-6">
      <DataStateNotice
        isLoading={isLoading}
        error={error}
        onDismiss={dismissError}
        label="les projets"
      />

      <header className="enter wave-surface -mx-4 px-4 py-6 lg:-mx-6 lg:px-6">
        <p className="section-label">Suivi</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
        <div>
          <h1>{t("projects.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {filteredProjects.length} {t("projects.title").toLowerCase()}
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={handleCreate}
        >
          <Plus className="w-4 h-4" />
          {t("projects.new")}
        </Button>
        </div>
      </header>


      <div className="enter-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Projets actifs"
          value={{ to: bilan.actifs, format: (valeur) => String(valeur) }}
          hint={`${projects.length} au total`}
          icon={FolderKanban}
        />
        <StatCard
          label="Budget en cours"
          value={{ to: bilan.budgetEnCours, format: argent }}
          hint="Prix de vente des projets actifs."
          icon={Wallet}
        />
        <StatCard
          label="Marge consolidée"
          value={{ to: bilan.marge, format: argent }}
          hint="Facturé hors taxes, moins le temps et les dépenses."
          icon={TrendingUp}
          tone={bilan.marge < 0 ? "negative" : "positive"}
          href="/time"
        />
        <StatCard
          label="Projets en perte"
          value={{ to: bilan.enPerte, format: (valeur) => String(valeur) }}
          hint={
            bilan.enPerte === 0
              ? "Chaque projet couvre ses coûts."
              : bilan.horsBudget === 0
                ? "Coûts supérieurs à ce qui a été facturé."
                : `dont ${bilan.horsBudget} au-delà du budget prévu`
          }
          icon={AlertTriangle}
          tone={bilan.enPerte === 0 ? "positive" : "negative"}
          href="/time"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("projects.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("projects.all")}</SelectItem>
                  <SelectItem value="active">
                    {t("projects.status.active")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("projects.status.completed")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("projects.status.pending")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("projects.allTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("projects.name")}</TableHead>
                  <TableHead>{t("projects.client")}</TableHead>
                  <TableHead>{t("projects.status")}</TableHead>
                  <TableHead>{t("projects.deadline")}</TableHead>
                  <TableHead>{t("projects.budget")}</TableHead>
                  <TableHead>Marge</TableHead>
                  <TableHead>{t("projects.progress")}</TableHead>
                  <TableHead className="text-right">
                    {t("projects.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>{nameOf(project.clientId)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(project.status)}>
                        {t(`projects.status.${project.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(project.deadline).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>{formatCurrencyXAF(project.budget)}</TableCell>
                    <TableCell>
                      {(() => {
                        const marge = rentabilites.get(project.id);
                        if (marge === undefined) return null;
                        const rien =
                          marge.revenue.amount === 0 &&
                          marge.totalCost.amount === 0;
                        if (rien) {
                          return (
                            <span className="text-sm text-muted-foreground">
                              Pas d&rsquo;activité
                            </span>
                          );
                        }
                        return (
                          <div className="whitespace-nowrap">
                            <span
                              className={
                                marge.margin.amount < 0
                                  ? "text-destructive"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }
                            >
                              {formatMoney(marge.margin)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatDuration(marge.minutesLogged)} passées
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress} className="w-16" />
                        <span className="text-sm text-muted-foreground">
                          {project.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(project)}
                          aria-label={`Modifier le projet ${project.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProjetASupprimer(project)}
                          aria-label={`Supprimer le projet ${project.name}`}
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
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingProject(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingProject ? t("projects.edit") : t("projects.new")}
              </DialogTitle>
              <DialogDescription>{t("projects.detailsHint")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("projects.name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t("projects.enterName")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">{t("projects.client")}</Label>
                <ClientSelect
                  id="client"
                  value={formData.clientId}
                  onChange={(clientId) =>
                    setFormData((prev) => ({ ...prev, clientId }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">{t("projects.status")}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Project["status"]) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        {t("projects.status.pending")}
                      </SelectItem>
                      <SelectItem value="active">
                        {t("projects.status.active")}
                      </SelectItem>
                      <SelectItem value="completed">
                        {t("projects.status.completed")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">{t("projects.deadline")}</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deadline: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">{t("projects.budget")}</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      budget: Number(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="progress">{t("projects.progress")}</Label>
                <Input
                  id="progress"
                  type="number"
                  value={formData.progress}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      progress: Number(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit">
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={projetASupprimer !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) setProjetASupprimer(null);
        }}
        subject={
          projetASupprimer === null ? "" : `le projet ${projetASupprimer.name}`
        }
        decision={canDeleteProject({
          // Une facture rattachee documente une prestation : supprimer le
          // projet la laisserait orpheline.
          //
          // Le rapprochement se faisait sur le client, faute de rattachement
          // au projet : un client portant deux projets voyait donc la
          // suppression de l'un bloquée par les factures de l'autre. On compare
          // maintenant le projet lui-meme.
          linkedInvoiceIds: invoices
            .filter(
              (facture) =>
                projetASupprimer !== null &&
                facture.projectId === projetASupprimer.id,
            )
            .map((facture) => facture.number || "brouillon"),
        })}
        consequence={(() => {
          const marge =
            projetASupprimer === null
              ? undefined
              : rentabilites.get(projetASupprimer.id);
          const base = "Le projet part à la corbeille et reste récupérable.";
          if (marge === undefined || marge.minutesLogged === 0) return base;
          return `${base} Les ${formatDuration(marge.minutesLogged)} saisies dessus seront signalées comme orphelines dans Temps & rentabilité.`;
        })()}
        onConfirm={() => {
          if (projetASupprimer !== null) void remove(projetASupprimer.id);
          setProjetASupprimer(null);
        }}
      />
    </div>
  );
}
