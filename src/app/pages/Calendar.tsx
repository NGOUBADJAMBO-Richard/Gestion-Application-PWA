import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";

import {
  CALENDAR_KIND_LABELS,
  type CalendarEvent,
  type CalendarTone,
  eventsBetween,
  groupByDay,
  monthGrid,
  sameMonth,
  shiftMonth,
  startOfMonth,
  summarize,
  weekGrid,
} from "../../domain/calendar";
import { toIsoDate } from "../../domain/date";
import { formatMoney, money } from "../../domain/money";
import { StatCard } from "../components/StatCard";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { useCompanyProfile } from "../hooks/useCompanyProfile";

/**
 * Calendrier des échéances.
 *
 * Les dates qui engagent l'agence vivaient sur cinq écrans. Savoir ce qui
 * tombe la semaine prochaine demandait de les ouvrir tous.
 *
 * Deux vues, parce qu'elles répondent à deux questions différentes : le mois
 * dit « quand est-ce que ça tombe », la semaine dit « qu'est-ce que je fais
 * maintenant ». Une seule des deux aurait forcé à choisir laquelle sacrifier.
 */

type Vue = "month" | "week";

const TONS: Record<CalendarTone, { point: string; texte: string }> = {
  late: { point: "bg-destructive", texte: "text-destructive" },
  due: { point: "bg-primary", texte: "text-foreground" },
  neutral: { point: "bg-muted-foreground/50", texte: "text-muted-foreground" },
  done: { point: "bg-emerald-500", texte: "text-muted-foreground line-through" },
};

const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

function jourDuMois(date: string): string {
  return String(Number(date.slice(8, 10)));
}

function libelleMois(date: string): string {
  const jour = new Date(`${date}T00:00:00`);
  if (Number.isNaN(jour.getTime())) return date;
  return jour.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function libelleJour(date: string): string {
  const jour = new Date(`${date}T00:00:00`);
  if (Number.isNaN(jour.getTime())) return date;
  return jour.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function Calendar() {
  const { events, today } = useCalendarEvents();
  const { profile } = useCompanyProfile();
  const navigate = useNavigate();
  const argent = (montant: number) =>
    formatMoney(money(montant, profile.currency));

  const [vue, setVue] = useState<Vue>("month");
  const [ancre, setAncre] = useState(today);

  const jours = useMemo(
    () => (vue === "month" ? monthGrid(ancre) : weekGrid(ancre)),
    [vue, ancre],
  );

  const parJour = useMemo(() => {
    const debut = jours[0] ?? today;
    const fin = jours[jours.length - 1] ?? today;
    return new Map(
      groupByDay(eventsBetween(events, debut, fin)).map((jour) => [
        jour.date,
        jour,
      ]),
    );
  }, [events, jours, today]);

  const resume = useMemo(() => {
    const debut = jours[0] ?? today;
    const fin = jours[jours.length - 1] ?? today;
    return summarize(eventsBetween(events, debut, fin));
  }, [events, jours, today]);

  const decaler = (sens: 1 | -1) => {
    if (vue === "month") {
      setAncre(shiftMonth(startOfMonth(ancre), sens));
      return;
    }
    const reference = new Date(`${ancre}T00:00:00`);
    reference.setDate(reference.getDate() + sens * 7);
    setAncre(toIsoDate(reference));
  };

  const titre =
    vue === "month"
      ? libelleMois(ancre)
      : `Semaine du ${libelleJour(jours[0] ?? ancre)}`;

  const ouvrir = (evenement: CalendarEvent) => {
    void navigate(evenement.href);
  };

  return (
    <div className="space-y-6">
      <header className="enter wave-surface -mx-4 px-4 py-6 lg:-mx-6 lg:px-6">
        <p className="section-label">Échéancier</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1>Calendrier</h1>
            <p className="mt-1 text-muted-foreground">
              Factures, jalons, sessions et échéances de formation, au même
              endroit.
            </p>
          </div>
          <Button variant="outline" onClick={() => setAncre(today)}>
            Aujourd&rsquo;hui
          </Button>
        </div>
      </header>

      <div className="enter-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Échéances sur la période"
          value={{ to: resume.total, format: (valeur) => String(valeur) }}
          hint={`${resume.due} à venir`}
          icon={CalendarDays}
        />
        <StatCard
          label="En retard"
          value={{ to: resume.late, format: (valeur) => String(valeur) }}
          hint={
            resume.late === 0
              ? "Rien de dépassé sur la période."
              : "Dates passées sans règlement ni livraison."
          }
          icon={AlertTriangle}
          tone={resume.late === 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Montant en jeu"
          value={{ to: resume.amountAtStake, format: argent }}
          hint="Créances et échéances de formation encore ouvertes."
          icon={Wallet}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={vue} onValueChange={(valeur) => setVue(valeur as Vue)}>
          <TabsList>
            <TabsTrigger value="month">Mois</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => decaler(-1)}
            aria-label={vue === "month" ? "Mois précédent" : "Semaine précédente"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[13rem] text-center text-sm first-letter:uppercase">
            {titre}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => decaler(1)}
            aria-label={vue === "month" ? "Mois suivant" : "Semaine suivante"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {vue === "month" ? (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-7 gap-px border border-border bg-border">
              {JOURS.map((jour) => (
                <div
                  key={jour}
                  className="bg-card px-2 py-1.5 text-center text-xs uppercase tracking-wider text-muted-foreground"
                >
                  {jour}
                </div>
              ))}

              {jours.map((date) => {
                const jour = parJour.get(date);
                const horsMois = !sameMonth(date, ancre);
                const estAujourdHui = date === today;
                return (
                  <div
                    key={date}
                    className={`min-h-[6.5rem] bg-card p-1.5 ${
                      horsMois ? "opacity-45" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`amount inline-flex h-6 w-6 items-center justify-center text-xs ${
                          estAujourdHui
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {jourDuMois(date)}
                      </span>
                      {jour !== undefined && jour.amount > 0 && (
                        <span
                          className={`amount text-[10px] ${
                            jour.hasLate ? "text-destructive" : "text-muted-foreground"
                          }`}
                        >
                          {argent(jour.amount)}
                        </span>
                      )}
                    </div>

                    <ul className="mt-1 space-y-0.5">
                      {(jour?.events ?? []).slice(0, 3).map((evenement) => (
                        <li key={evenement.id}>
                          <button
                            type="button"
                            onClick={() => ouvrir(evenement)}
                            title={`${CALENDAR_KIND_LABELS[evenement.kind]} — ${evenement.title}`}
                            className="flex w-full items-center gap-1 text-left transition-colors hover:bg-accent"
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 ${TONS[evenement.tone].point}`}
                              aria-hidden="true"
                            />
                            <span
                              className={`truncate text-[11px] leading-tight ${TONS[evenement.tone].texte}`}
                            >
                              {evenement.title}
                            </span>
                          </button>
                        </li>
                      ))}
                      {(jour?.events.length ?? 0) > 3 && (
                        <li className="pl-2.5 text-[10px] text-muted-foreground">
                          +{(jour?.events.length ?? 0) - 3} autre(s)
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jours.map((date) => {
            const jour = parJour.get(date);
            const estAujourdHui = date === today;
            return (
              <Card
                key={date}
                className={estAujourdHui ? "border-l-2 border-l-primary" : ""}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="first-letter:uppercase">
                      {libelleJour(date)}
                      {estAujourdHui && (
                        <Badge className="ml-2 bg-primary/10 text-primary-ink">
                          aujourd&rsquo;hui
                        </Badge>
                      )}
                    </p>
                    {jour !== undefined && jour.amount > 0 && (
                      <span
                        className={`amount text-sm ${
                          jour.hasLate ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {argent(jour.amount)}
                      </span>
                    )}
                  </div>

                  {jour === undefined ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Rien ce jour-là.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-border border-t border-border">
                      {jour.events.map((evenement) => (
                        <li key={evenement.id}>
                          <button
                            type="button"
                            onClick={() => ouvrir(evenement)}
                            className="flex w-full items-start gap-3 py-2.5 text-left transition-colors hover:bg-accent"
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 ${TONS[evenement.tone].point}`}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block text-sm ${TONS[evenement.tone].texte}`}
                              >
                                {evenement.title}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {CALENDAR_KIND_LABELS[evenement.kind]} &middot;{" "}
                                {evenement.detail}
                              </span>
                            </span>
                            {evenement.tone === "late" && (
                              <AlertTriangle
                                className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarRange className="h-4 w-4" aria-hidden="true" />
            Légende
          </span>
          {(
            [
              ["late", "dépassé"],
              ["due", "à venir"],
              ["neutral", "repère"],
              ["done", "fait"],
            ] as const
          ).map(([ton, libelle]) => (
            <span key={ton} className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 ${TONS[ton].point}`}
                aria-hidden="true"
              />
              {libelle}
            </span>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
