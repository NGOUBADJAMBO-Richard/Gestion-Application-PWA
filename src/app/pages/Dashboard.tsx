import { useMemo } from "react";
import {
  AlertTriangle,
  FileText,
  FolderKanban,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Clock3,
  Percent,
  PieChart,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { useClientIndex } from "../hooks/useClientIndex";
import { useCollection } from "../hooks/useCollection";
import { useCompanyProfile } from "../hooks/useCompanyProfile";
import { invoiceRepository, projectRepository } from "../data/repositories";
import { toExecutiveDocuments } from "../data/documentTotals";
import { Meter, StatCard } from "../components/StatCard";
import {
  MilestoneBar,
  MilestoneSummary,
} from "../components/MilestonePanel";
import {
  computeCashPosition,
  computeClientConcentration,
  computeCollectionDelay,
  computeQuoteConversion,
} from "../../domain/executive";
import {
  computeActivePipeline,
  computeDashboardMetrics,
  computeMonthlyRevenue,
} from "../../domain/dashboard";
import { formatMoney } from "../../domain/money";
import { todayIso } from "../../domain/date";
import { formatCompactXAF } from "../utils/currency";

/**
 * Tableau de bord.
 *
 * Tout ce qui s'affiche ici était écrit en dur : un chiffre d'affaires de
 * 328 000 000 FCFA qui ne correspondait à aucune facture, des variations
 * « +12,5 % » inventées, et des compteurs lus depuis les données de
 * démonstration plutôt que depuis les dépôts — créer un client ne changeait
 * rien à l'écran. Tout est désormais calculé sur les documents réels.
 */
export function Dashboard() {
  const { t } = useLanguage();
  const { nameOf, clients } = useClientIndex();
  const { profile } = useCompanyProfile();
  const { items: invoices } = useCollection(invoiceRepository);
  const { items: projects } = useCollection(projectRepository);

  const aujourdhui = todayIso();

  /**
   * Un devis n’engage rien : il ne doit compter ni dans le chiffre d’affaires
   * ni dans le restant dû. Les avoirs, eux, comptent au négatif et viennent
   * donc légitimement en déduction.
   */
  const documentsComptables = invoices.filter(
    (facture) => facture.kind !== "quote",
  );

  const metrics = useMemo(
    () =>
      computeDashboardMetrics(
        documentsComptables.map((f) => ({
          amount: f.amount,
          status: f.status,
          date: f.date,
          dueDate: f.dueDate,
        })),
        projects.map((p) => ({ status: p.status, budget: p.budget })),
        clients.length,
        profile.currency,
        aujourdhui,
      ),
    [documentsComptables, projects, clients.length, profile.currency, aujourdhui],
  );

  const pipeline = useMemo(
    () =>
      computeActivePipeline(
        projects.map((p) => ({ status: p.status, budget: p.budget })),
        profile.currency,
      ),
    [projects, profile.currency],
  );

  const revenus = useMemo(
    () =>
      computeMonthlyRevenue(
        documentsComptables.map((f) => ({
          amount: f.amount,
          status: f.status,
          date: f.date,
          dueDate: f.dueDate,
        })),
        6,
        aujourdhui,
      ),
    [documentsComptables, aujourdhui],
  );

  const documentsExecutifs = useMemo(
    () => toExecutiveDocuments(invoices, profile.currency),
    [invoices, profile.currency],
  );

  const delai = useMemo(
    () => computeCollectionDelay(documentsExecutifs),
    [documentsExecutifs],
  );

  const conversion = useMemo(
    () =>
      computeQuoteConversion(
        documentsExecutifs,
        profile.currency,
        aujourdhui,
        profile.paymentTermDays,
      ),
    [documentsExecutifs, profile.currency, profile.paymentTermDays, aujourdhui],
  );

  const concentration = useMemo(
    () => computeClientConcentration(documentsExecutifs, profile.currency),
    [documentsExecutifs, profile.currency],
  );

  const tresorerie = useMemo(
    () =>
      computeCashPosition(
        documentsExecutifs,
        profile.currency,
        aujourdhui,
        new Map(invoices.map((facture) => [facture.id, facture.dueDate])),
      ),
    [documentsExecutifs, invoices, profile.currency, aujourdhui],
  );

  const projetsRecents = useMemo(
    () => [...projects].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 5),
    [projects],
  );

  const cartes = [
    {
      titre: "Encaissé ce mois",
      valeur: formatMoney(metrics.collected.value),
      variation: metrics.collected.changePercent,
      icone: Wallet,
      teinte: "text-primary-ink",
      fond: "bg-primary/10",
      lien: "/invoicing",
    },
    {
      titre: "Restant dû",
      valeur: formatMoney(metrics.outstanding),
      detail: `${metrics.pendingInvoices} facture(s) en attente`,
      icone: FileText,
      teinte: "text-warning",
      fond: "bg-warning/10",
      lien: "/invoicing",
    },
    {
      titre: t("dashboard.activeProjects"),
      valeur: String(metrics.activeProjects.value),
      detail: `${formatCompactXAF(pipeline.amount)} en cours`,
      icone: FolderKanban,
      teinte: "text-success",
      fond: "bg-success/10",
      lien: "/projects",
    },
    {
      titre: t("dashboard.totalClients"),
      valeur: String(metrics.clientCount),
      detail: clients.length === 0 ? "Aucun client enregistré" : "Portefeuille",
      icone: Users,
      teinte: "text-primary-ink",
      fond: "bg-primary/10",
      lien: "/clients",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="enter wave-surface -mx-4 px-4 py-8 lg:-mx-6 lg:px-6">
        <p className="section-label">Vue d’ensemble</p>
        <h1 className="mt-2">{t("dashboard.title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {profile.name} &middot; {new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {metrics.overdueCount > 0 && (
        <Link
          to="/invoicing"
          className="flex items-start gap-3 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm transition-colors hover:bg-destructive/15"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <span>
            <strong className="font-display">
              {metrics.overdueCount} facture(s) en retard
            </strong>{" "}
            pour {formatMoney(metrics.overdueAmount)}. Relance à prévoir.
          </span>
        </Link>
      )}

      <div className="enter-stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cartes.map((carte) => (
          <Link key={carte.titre} to={carte.lien} className="block">
            <Card data-slot="card" className="card-interactive h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardDescription>{carte.titre}</CardDescription>
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${carte.fond}`}
                  >
                    <carte.icone className={`h-5 w-5 ${carte.teinte}`} aria-hidden="true" />
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {carte.valeur}
                </p>
                {carte.variation !== undefined && carte.variation !== null ? (
                  <p
                    className={`mt-1 flex items-center gap-1 text-sm ${
                      carte.variation >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {carte.variation >= 0 ? (
                      <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="h-4 w-4" aria-hidden="true" />
                    )}
                    {carte.variation >= 0 ? "+" : ""}
                    {carte.variation.toFixed(1)} % {t("dashboard.vsLastMonth")}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {carte.detail ?? "Pas de comparaison disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/*
        Indicateurs de direction.

        Les quatre cartes du dessus disent l'état ; celles-ci disent la
        tendance et le risque — en combien de temps on est payé, quelle part
        des devis se transforme, et de qui dépend le chiffre d'affaires.
      */}
      <section className="space-y-4">
        <p className="section-label">Pilotage</p>

        <div className="enter-stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Délai moyen d’encaissement"
            value={
              delai.weightedDays === null
                ? "—"
                : `${Math.round(delai.weightedDays)} jours`
            }
            hint={
              delai.weightedDays === null
                ? "Aucune facture soldée : le délai apparaîtra au premier règlement."
                : `médiane ${Math.round(delai.medianDays ?? 0)} j sur ${delai.sampleSize} facture(s)`
            }
            icon={Clock3}
            tone={
              delai.weightedDays === null
                ? "neutral"
                : delai.weightedDays > profile.paymentTermDays
                  ? "warning"
                  : "positive"
            }
          />

          <StatCard
            label="Devis transformés"
            value={
              conversion.ratePercent === null
                ? "—"
                : `${conversion.ratePercent.toFixed(0)} %`
            }
            hint={
              conversion.ratePercent === null
                ? "Aucun devis émis."
                : `${conversion.converted} sur ${conversion.issued} · ${conversion.pending} encore valide(s)`
            }
            icon={Percent}
            tone={
              conversion.ratePercent === null
                ? "neutral"
                : conversion.ratePercent >= 40
                  ? "positive"
                  : "warning"
            }
          />

          <StatCard
            label="À encaisser"
            value={formatMoney(tresorerie.receivable)}
            hint={
              `dont ${formatMoney(tresorerie.overdue)} déjà échus`
            }
            icon={Wallet}
            tone={tresorerie.overdue.amount > 0 ? "negative" : "neutral"}
          />

          <StatCard
            label="Premier client"
            value={
              concentration.topSharePercent === null
                ? "—"
                : `${concentration.topSharePercent.toFixed(0)} % du CA`
            }
            hint={
              concentration.topSharePercent === null
                ? "Aucun chiffre d’affaires enregistré."
                : concentration.dependent
                  ? "Dépendance forte : le perdre mettrait l’activité en cause."
                  : "Portefeuille réparti."
            }
            icon={PieChart}
            tone={concentration.dependent ? "warning" : "neutral"}
          />
        </div>

        {concentration.ranking.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Répartition du chiffre d&rsquo;affaires</CardTitle>
              <CardDescription>
                Hors taxes, avoirs déduits. Les devis n&rsquo;y figurent pas :
                ils n&rsquo;engagent rien.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {concentration.ranking.slice(0, 5).map((ligne) => (
                <Meter
                  key={ligne.clientId}
                  percent={ligne.sharePercent}
                  label={`${nameOf(ligne.clientId)} — ${formatMoney(ligne.revenue)}`}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>{t("dashboard.revenueOverview")}</CardTitle>
            <CardDescription>
              Encaissements des six derniers mois, en {profile.currency}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenus.every((mois) => mois.revenue === 0) ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Aucun encaissement sur la période. Le graphique se remplira dès
                qu’une facture sera marquée payée.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[...revenus]} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="degradeRevenus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                    opacity={0.5}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                    opacity={0.5}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(valeur: number) => formatCompactXAF(valeur)}
                    width={72}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-accent)", opacity: 0.35 }}
                    formatter={(valeur: number) => [formatCompactXAF(valeur), "Encaissé"]}
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius)",
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="url(#degradeRevenus)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={56}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.recentProjects")}</CardTitle>
            <CardDescription>Par échéance la plus proche</CardDescription>
          </CardHeader>
          <CardContent>
            {projetsRecents.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Aucun projet. Crée le premier depuis l’onglet Projets.
              </p>
            ) : (
              <ul className="space-y-4">
                {projetsRecents.map((projet) => (
                  <li key={projet.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{projet.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {nameOf(projet.clientId)}
                        </p>
                      </div>
                      <Badge className={badgeStatut(projet.status)}>
                        {t(`projects.status.${projet.status}`)}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <MilestoneBar milestones={projet.milestones} />
                      <MilestoneSummary milestones={projet.milestones} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Teintes d'état, prises aux jetons plutôt qu'à une palette parallèle. */
function badgeStatut(status: "active" | "completed" | "pending"): string {
  switch (status) {
    case "active":
      return "bg-primary/10 text-primary-ink border-primary/20";
    case "completed":
      return "bg-success/10 text-success border-success/20";
    case "pending":
      return "bg-warning/10 text-warning border-warning/20";
  }
}
