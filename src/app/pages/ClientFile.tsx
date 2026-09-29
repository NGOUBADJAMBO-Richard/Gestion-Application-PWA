import { useMemo } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Building2,
  Clock3,
  FileText,
  FolderKanban,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Timer,
  Wallet,
} from "lucide-react";

import { enrollmentBalance, learnerName } from "../../domain/academy";
import {
  PAYMENT_BEHAVIOUR_LABELS,
  computeClientFinancials,
  paymentBehaviour,
} from "../../domain/clientFile";
import { todayIso } from "../../domain/date";
import { computeClientConcentration } from "../../domain/executive";
import { effectiveStatus } from "../../domain/invoiceStatus";
import { describeProgress, milestoneProgress } from "../../domain/milestone";
import { formatMoney, money } from "../../domain/money";
import { computeProjectProfitability } from "../../domain/profitability";
import { formatDuration, laborCost, totalMinutes } from "../../domain/timeEntry";
import { netExpenses } from "../../domain/expense";
import { MilestoneBar } from "../components/MilestonePanel";
import { StatCard } from "../components/StatCard";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  toExecutiveDocuments,
  toRevenueDocuments,
} from "../data/documentTotals";
import {
  clientRepository,
  enrollmentRepository,
  expenseRepository,
  invoiceRepository,
  learnerRepository,
  projectRepository,
  sessionRepository,
  ticketRepository,
  timeEntryRepository,
} from "../data/repositories";
import { useCollection } from "../hooks/useCollection";
import { useCompanyProfile } from "../hooks/useCompanyProfile";

/**
 * Fiche client consolidée.
 *
 * Répondre à « où en est-on avec Akanda Group ? » demandait d'ouvrir quatre
 * écrans et de faire la somme de tête. La fiche qui existait tenait dans une
 * petite fenêtre : nom, téléphone, nombre de projets. Rien sur l'argent, rien
 * sur la façon dont le client paie, rien sur ce qui est en cours.
 *
 * L'ordre des sections suit les questions qu'on se pose : combien ça
 * rapporte, combien il doit, ce qui est en cours, ce qui a été échangé.
 */

function dateFr(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUT_DOCUMENT: Record<string, string> = {
  draft: "Brouillon",
  pending: "En attente",
  paid: "Réglée",
  overdue: "En retard",
  cancelled: "Annulée",
};

const NATURE_DOCUMENT: Record<string, string> = {
  quote: "Devis",
  invoice: "Facture",
  creditNote: "Avoir",
};

export function ClientFile() {
  const { clientId } = useParams<{ clientId: string }>();
  const { profile } = useCompanyProfile();
  const devise = profile.currency;
  const argent = (montant: number) => formatMoney(money(montant, devise));
  const aujourdHui = todayIso();

  const { items: clients, isLoading } = useCollection(clientRepository);
  const { items: projets } = useCollection(projectRepository);
  const { items: factures } = useCollection(invoiceRepository);
  const { items: saisies } = useCollection(timeEntryRepository);
  const { items: depenses } = useCollection(expenseRepository);
  const { items: tickets } = useCollection(ticketRepository);
  const { items: apprenants } = useCollection(learnerRepository);
  const { items: inscriptions } = useCollection(enrollmentRepository);
  const { items: sessions } = useCollection(sessionRepository);

  const client = clients.find((candidat) => candidat.id === clientId);

  const sesProjets = useMemo(
    () => projets.filter((projet) => projet.clientId === clientId),
    [projets, clientId],
  );

  const sesDocuments = useMemo(
    () =>
      [...factures]
        .filter((facture) => facture.clientId === clientId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [factures, clientId],
  );

  const bilan = useMemo(() => {
    const documents = toExecutiveDocuments(factures, devise);
    return computeClientFinancials({
      clientId: clientId ?? "",
      currency: devise,
      today: aujourdHui,
      documents,
      dueDates: new Map(factures.map((facture) => [facture.id, facture.dueDate])),
      paymentTermDays: profile.paymentTermDays,
      convertedQuoteNumbers: new Set(
        factures
          .filter((facture) => facture.convertedFrom !== undefined)
          .map((facture) => facture.convertedFrom as string),
      ),
    });
  }, [factures, devise, clientId, aujourdHui, profile.paymentTermDays]);

  /** Part de ce client dans le chiffre d'affaires total. */
  const part = useMemo(() => {
    const repartition = computeClientConcentration(
      toExecutiveDocuments(factures, devise),
      devise,
    );
    return repartition.ranking.find((ligne) => ligne.clientId === clientId);
  }, [factures, devise, clientId]);

  /** Coûts engagés sur les projets de ce client. */
  const effort = useMemo(() => {
    const idsProjets = new Set(sesProjets.map((projet) => projet.id));
    const sesSaisies = saisies.filter((saisie) => idsProjets.has(saisie.projectId));
    const sesDepenses = depenses.filter(
      (depense) => depense.projectId !== undefined && idsProjets.has(depense.projectId),
    );
    return {
      minutes: totalMinutes(sesSaisies),
      coutTemps: laborCost(sesSaisies, devise),
      depenses: netExpenses(sesDepenses, devise),
    };
  }, [sesProjets, saisies, depenses, devise]);

  const rentabilites = useMemo(() => {
    const documents = toRevenueDocuments(factures, devise);
    return new Map(
      sesProjets.map((projet) => [
        projet.id,
        computeProjectProfitability({
          projectId: projet.id,
          currency: devise,
          budget: money(Math.round(projet.budget), devise),
          documents,
          timeEntries: saisies,
          expenses: depenses,
        }),
      ]),
    );
  }, [sesProjets, factures, saisies, depenses, devise]);

  const sesTickets = tickets.filter((ticket) => ticket.clientId === clientId);

  /** Apprenants envoyés par ce client, avec leurs inscriptions. */
  const formation = useMemo(() => {
    const siens = apprenants.filter(
      (apprenant) => apprenant.clientId === clientId,
    );
    const idsApprenants = new Set(siens.map((apprenant) => apprenant.id));
    const leursInscriptions = inscriptions.filter((inscription) =>
      idsApprenants.has(inscription.learnerId),
    );
    return { apprenants: siens, inscriptions: leursInscriptions };
  }, [apprenants, inscriptions, clientId]);

  const sessionsParId = useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions],
  );
  const apprenantsParId = useMemo(
    () => new Map(apprenants.map((apprenant) => [apprenant.id, apprenant])),
    [apprenants],
  );

  if (isLoading) {
    return (
      <p className="p-6 text-sm text-muted-foreground" aria-live="polite">
        Chargement de la fiche…
      </p>
    );
  }

  if (client === undefined) {
    return (
      <div className="space-y-4">
        <h1>Client introuvable</h1>
        <p className="text-muted-foreground">
          Ce client a peut-être été supprimé. Ses projets et ses factures, eux,
          existent toujours et continuent de le désigner.
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4" />
            Retour au répertoire
          </Link>
        </Button>
      </div>
    );
  }

  const comportement = paymentBehaviour(bilan);

  return (
    <div className="space-y-6">
      <header className="enter wave-surface -mx-4 px-4 py-6 lg:-mx-6 lg:px-6">
        <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2 mb-2">
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4" />
            Répertoire
          </Link>
        </Button>
        <p className="section-label">Fiche client</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1>{client.company}</h1>
            <p className="mt-1 text-muted-foreground">{client.name}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {client.email.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <a href={`mailto:${client.email}`} className="hover:underline">
                    {client.email}
                  </a>
                </span>
              )}
              {client.phone.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  <a href={`tel:${client.phone}`} className="hover:underline">
                    {client.phone}
                  </a>
                </span>
              )}
              {bilan.firstDocumentAt !== null && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Client depuis le {dateFr(bilan.firstDocumentAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            {client.archivedAt !== undefined && (
              <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-300">
                Archivé le {dateFr(client.archivedAt)}
              </Badge>
            )}
            <Badge
              className={
                comportement === "late"
                  ? "bg-destructive/10 text-destructive"
                  : comportement === "slow"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : comportement === "onTime"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
              }
            >
              {PAYMENT_BEHAVIOUR_LABELS[comportement]}
            </Badge>
            {bilan.paymentDays !== null && (
              <span className="text-xs text-muted-foreground">
                {Math.round(bilan.paymentDays)} jours en moyenne, pour{" "}
                {profile.paymentTermDays} accordés
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="enter-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chiffre d'affaires HT"
          value={{ to: bilan.revenue.amount, format: argent }}
          hint={
            part === undefined
              ? "Aucune pièce émise."
              : `${part.sharePercent.toFixed(0)} % du chiffre d'affaires de l'agence`
          }
          icon={Wallet}
        />
        <StatCard
          label="Encours"
          value={{ to: bilan.outstanding.amount, format: argent }}
          hint={
            bilan.overdueCount === 0
              ? "Rien d'échu."
              : `dont ${argent(bilan.overdue.amount)} échus sur ${bilan.overdueCount} pièce(s)`
          }
          icon={Receipt}
          tone={bilan.overdueCount > 0 ? "negative" : "neutral"}
          href="/invoicing"
        />
        <StatCard
          label="Temps passé"
          value={{
            to: effort.minutes,
            format: (valeur) => formatDuration(Math.round(valeur)),
          }}
          hint={`${argent(effort.coutTemps.amount)} de coût interne`}
          icon={Timer}
          href="/time"
        />
        <StatCard
          label="Documents"
          value={{
            to: bilan.invoiceCount + bilan.quoteCount + bilan.creditNoteCount,
            format: (valeur) => String(valeur),
          }}
          hint={`${bilan.invoiceCount} facture(s) · ${bilan.quoteCount} devis · ${bilan.creditNoteCount} avoir(s)`}
          icon={FileText}
          href="/invoicing"
        />
      </div>

      {bilan.openQuotes > 0 && (
        <Card className="border-amber-500/40">
          <CardContent className="flex items-start gap-3 pt-6 text-sm">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {bilan.openQuotes} devis en attente de réponse. Une relance
              commerciale vaut souvent mieux qu&rsquo;un devis oublié.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary-ink" aria-hidden="true" />
              Projets
            </CardTitle>
            <CardDescription>
              Avancement par jalons livrés, et marge réelle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sesProjets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun projet pour ce client.
              </p>
            ) : (
              <ul className="space-y-4">
                {sesProjets.map((projet) => {
                  const marge = rentabilites.get(projet.id);
                  const avancement = milestoneProgress(
                    projet.milestones,
                    aujourdHui,
                  );
                  return (
                    <li
                      key={projet.id}
                      className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{projet.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Échéance {dateFr(projet.deadline)} &middot; budget{" "}
                            {argent(Math.round(projet.budget))}
                          </p>
                        </div>
                        {marge !== undefined && (
                          <span
                            className={`amount shrink-0 text-sm ${
                              marge.margin.amount < 0
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {argent(marge.margin.amount)}
                          </span>
                        )}
                      </div>

                      <MilestoneBar milestones={projet.milestones} />
                      <p className="text-xs text-muted-foreground">
                        {describeProgress(avancement)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Coûts engagés</CardTitle>
            <CardDescription>Sur l&rsquo;ensemble de ses projets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temps passé</span>
              <span className="amount">{formatDuration(effort.minutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coût du temps</span>
              <span className="amount">{argent(effort.coutTemps.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dépenses imputées</span>
              <span className="amount">{argent(effort.depenses.amount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span>Marge dégagée</span>
              <span
                className={`amount ${
                  bilan.revenue.amount -
                    effort.coutTemps.amount -
                    effort.depenses.amount <
                  0
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {argent(
                  bilan.revenue.amount -
                    effort.coutTemps.amount -
                    effort.depenses.amount,
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Recette hors taxes moins le temps et les dépenses non refacturées.
              Les frais de structure n&rsquo;y sont pas répartis.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents commerciaux</CardTitle>
          <CardDescription>Du plus récent au plus ancien.</CardDescription>
        </CardHeader>
        <CardContent>
          {sesDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun document pour ce client.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Nature</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>État</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sesDocuments.map((facture) => {
                    const etat = effectiveStatus(facture, aujourdHui);
                    return (
                      <TableRow key={facture.id}>
                        <TableCell className="whitespace-nowrap">
                          {facture.number.length > 0 ? facture.number : "—"}
                        </TableCell>
                        <TableCell>{NATURE_DOCUMENT[facture.kind]}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {dateFr(facture.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {facture.dueDate === "" ? "—" : dateFr(facture.dueDate)}
                        </TableCell>
                        <TableCell className="amount whitespace-nowrap">
                          {argent(facture.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              etat === "overdue"
                                ? "bg-destructive/10 text-destructive"
                                : etat === "paid"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : etat === "cancelled"
                                    ? "bg-slate-500/10 text-slate-600 dark:text-slate-300"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }
                          >
                            {STATUT_DOCUMENT[etat] ?? etat}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {formation.apprenants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap
                  className="h-5 w-5 text-primary-ink"
                  aria-hidden="true"
                />
                Formation
              </CardTitle>
              <CardDescription>
                Apprenants envoyés par cette entreprise.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {formation.inscriptions.map((inscription) => {
                  const apprenant = apprenantsParId.get(inscription.learnerId);
                  const session = sessionsParId.get(inscription.sessionId);
                  const solde = enrollmentBalance(inscription, devise, aujourdHui);
                  return (
                    <li
                      key={inscription.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate">
                          {apprenant === undefined
                            ? "Apprenant supprimé"
                            : learnerName(apprenant)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {session?.title ?? "Session supprimée"}
                        </p>
                      </div>
                      <span
                        className={`amount shrink-0 text-xs ${
                          solde.overdue.length > 0 ? "text-destructive" : ""
                        }`}
                      >
                        {solde.settled
                          ? "soldé"
                          : `${argent(solde.balance.amount)} dus`}
                      </span>
                    </li>
                  );
                })}
                {formation.inscriptions.length === 0 && (
                  <li className="text-muted-foreground">
                    {formation.apprenants.length} apprenant(s) enregistré(s),
                    aucune inscription.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        {sesTickets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary-ink" aria-hidden="true" />
                Demandes de support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {sesTickets.map((ticket) => (
                  <li
                    key={ticket.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="min-w-0 truncate">{ticket.title}</span>
                    <Badge
                      className={
                        ticket.status === "closed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0"
                      }
                    >
                      {ticket.status === "closed"
                        ? "Clôturé"
                        : ticket.status === "in-progress"
                          ? "En cours"
                          : "Ouvert"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
