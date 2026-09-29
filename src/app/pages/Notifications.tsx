import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  History,
  Info,
  Search,
} from "lucide-react";

import {
  ACTIVITY_FAMILY_LABELS,
  ACTIVITY_LABELS,
  type ActivityEntry,
  type ActivityFamily,
  activityFamily,
  filterActivity,
  groupActivityByDay,
} from "../../domain/activity";
import type { Alert, AlertSeverity } from "../../domain/alerts";
import { StatCard } from "../components/StatCard";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useActivity } from "../hooks/useActivity";
import { useAlerts } from "../hooks/useAlerts";

/**
 * Notifications internes.
 *
 * Deux questions, deux onglets, et il faut résister à l'envie de les mélanger :
 *
 * - **À traiter** : ce qui réclame une action. Dérivé de l'état courant, sans
 *   état « lu » — une alerte disparaît quand le fait disparaît. Pouvoir masquer
 *   un impayé d'un clic serait le meilleur moyen de l'oublier.
 * - **Journal** : ce qui a été fait. Append-only, avec une marque de lecture.
 *   Une entrée ne se modifie ni ne se supprime : un journal qu'on peut
 *   réécrire ne prouve rien.
 *
 * Les confondre donnerait une liste où une facture émise il y a trois semaines
 * côtoie un impayé à relancer aujourd'hui, et où « tout marquer lu » ferait
 * disparaître les deux.
 */

type Onglet = "todo" | "journal";

const TONS_ALERTE: Record<
  AlertSeverity,
  { bord: string; texte: string; icone: typeof Info }
> = {
  critical: {
    bord: "border-l-2 border-l-destructive",
    texte: "text-destructive",
    icone: AlertTriangle,
  },
  warning: {
    bord: "border-l-2 border-l-amber-500",
    texte: "text-amber-600 dark:text-amber-400",
    icone: AlertTriangle,
  },
  info: {
    bord: "border-l-2 border-l-border",
    texte: "text-muted-foreground",
    icone: Info,
  },
};

const TONS_JOURNAL: Record<ActivityFamily, string> = {
  money: "bg-primary/10 text-primary-ink",
  work: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  data: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

function heure(at: string): string {
  return at.slice(11, 16);
}

function jourFr(date: string): string {
  const jour = new Date(`${date}T00:00:00`);
  if (Number.isNaN(jour.getTime())) return date;
  return jour.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function Notifications() {
  const { alerts, summary } = useAlerts();
  const { entries, unreadCount, markRead } = useActivity();
  const navigate = useNavigate();

  const [onglet, setOnglet] = useState<Onglet>(
    // On ouvre sur ce qui réclame une action quand il y en a : c'est la
    // raison pour laquelle on vient sur cet écran.
    () => (summary.critical + summary.warning > 0 ? "todo" : "journal"),
  );
  const [famille, setFamille] = useState<ActivityFamily | "all">("all");
  const [recherche, setRecherche] = useState("");

  const journal = useMemo(
    () =>
      groupActivityByDay(
        filterActivity(entries, {
          family: famille === "all" ? undefined : famille,
          query: recherche,
        }),
      ),
    [entries, famille, recherche],
  );

  const ouvrirAlerte = (alerte: Alert) => {
    void navigate(alerte.href);
  };

  const ouvrirEntree = (entree: ActivityEntry) => {
    if (entree.href !== undefined) void navigate(entree.href);
  };

  return (
    <div className="space-y-6">
      <header className="enter wave-surface -mx-4 px-4 py-6 lg:-mx-6 lg:px-6">
        <p className="section-label">Suivi</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1>Notifications</h1>
            <p className="mt-1 text-muted-foreground">
              Ce qui réclame une action, et ce qui a été fait.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markRead} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Marquer le journal comme lu
            </Button>
          )}
        </div>
      </header>

      <div className="enter-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="À traiter"
          value={{
            to: summary.critical + summary.warning,
            format: (valeur) => String(valeur),
          }}
          hint={`${summary.critical} critique(s) · ${summary.info} pour information`}
          icon={BellRing}
          tone={
            summary.critical > 0
              ? "negative"
              : summary.warning > 0
                ? "warning"
                : "positive"
          }
        />
        <StatCard
          label="Nouveautés au journal"
          value={{ to: unreadCount, format: (valeur) => String(valeur) }}
          hint={
            unreadCount === 0
              ? "Tout a été lu."
              : "Depuis la dernière fois que tu as ouvert cet écran."
          }
          icon={History}
        />
        <StatCard
          label="Événements consignés"
          value={{ to: entries.length, format: (valeur) => String(valeur) }}
          hint="Le journal conserve les 400 derniers."
          icon={History}
        />
      </div>

      <Tabs value={onglet} onValueChange={(valeur) => setOnglet(valeur as Onglet)}>
        <TabsList>
          <TabsTrigger value="todo">
            À traiter {alerts.length > 0 && `(${alerts.length})`}
          </TabsTrigger>
          <TabsTrigger value="journal">
            Journal {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {onglet === "todo" ? (
        alerts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Aucune échéance dépassée, aucune dérive de budget, sauvegarde à
              jour.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {alerts.map((alerte) => {
                  const ton = TONS_ALERTE[alerte.severity];
                  const Icone = ton.icone;
                  return (
                    <li key={alerte.id}>
                      <button
                        type="button"
                        onClick={() => ouvrirAlerte(alerte)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${ton.bord}`}
                      >
                        <Icone
                          className={`mt-0.5 h-4 w-4 shrink-0 ${ton.texte}`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm">{alerte.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {alerte.detail}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={recherche}
                  onChange={(event) => setRecherche(event.target.value)}
                  placeholder="Chercher dans le journal…"
                  aria-label="Chercher dans le journal"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="filter-pill"
                  aria-pressed={famille === "all"}
                  onClick={() => setFamille("all")}
                >
                  Tout
                </button>
                {(
                  Object.keys(ACTIVITY_FAMILY_LABELS) as ActivityFamily[]
                ).map((valeur) => (
                  <button
                    key={valeur}
                    type="button"
                    className="filter-pill"
                    aria-pressed={famille === valeur}
                    onClick={() => setFamille(valeur)}
                  >
                    {ACTIVITY_FAMILY_LABELS[valeur]}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {journal.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {entries.length === 0
                  ? "Le journal est vide. Il se remplira dès la première facture émise, le premier encaissement ou le premier jalon livré."
                  : "Aucun événement ne correspond à cette recherche."}
              </CardContent>
            </Card>
          ) : (
            journal.map((jour) => (
              <Card key={jour.date}>
                <CardContent className="pt-6">
                  <p className="section-label first-letter:uppercase">
                    {jourFr(jour.date)}
                  </p>
                  <ul className="mt-3 divide-y divide-border border-t border-border">
                    {jour.entries.map((entree) => (
                      <li key={entree.id}>
                        <button
                          type="button"
                          onClick={() => ouvrirEntree(entree)}
                          disabled={entree.href === undefined}
                          className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent"
                        >
                          <span className="amount w-11 shrink-0 pt-0.5 text-xs text-muted-foreground">
                            {heure(entree.at)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm">{entree.title}</span>
                            {entree.detail !== undefined &&
                              entree.detail.length > 0 && (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {entree.detail}
                                </span>
                              )}
                          </span>
                          <Badge
                            className={`shrink-0 ${TONS_JOURNAL[activityFamily(entree.kind)]}`}
                          >
                            {ACTIVITY_LABELS[entree.kind]}
                          </Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
