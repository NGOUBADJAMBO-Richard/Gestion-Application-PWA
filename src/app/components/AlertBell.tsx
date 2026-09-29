import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Bell, CheckCircle2, Info } from "lucide-react";

import type { Alert, AlertSeverity } from "../../domain/alerts";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useAlerts } from "../hooks/useAlerts";

/**
 * Centre d'alertes.
 *
 * Ce qui demande une action se dispersait sur cinq écrans. Personne n'ouvre
 * cinq écrans chaque matin, donc personne ne voyait rien venir : une facture
 * passait de trente à soixante jours de retard sans que rien ne le signale.
 *
 * Il n'y a pas d'état « lu ». Une alerte disparaît quand le fait disparaît —
 * la facture est réglée, la sauvegarde est faite — pas quand on l'a regardée.
 * Pouvoir masquer un impayé d'un clic serait le meilleur moyen de l'oublier.
 */

const TONS: Record<
  AlertSeverity,
  { readonly texte: string; readonly fond: string; readonly icone: typeof Info }
> = {
  critical: {
    texte: "text-destructive",
    fond: "border-l-2 border-l-destructive",
    icone: AlertTriangle,
  },
  warning: {
    texte: "text-amber-600 dark:text-amber-400",
    fond: "border-l-2 border-l-amber-500",
    icone: AlertTriangle,
  },
  info: {
    texte: "text-muted-foreground",
    fond: "border-l-2 border-l-border",
    icone: Info,
  },
};

function LigneAlerte({
  alerte,
  onOuvrir,
}: {
  readonly alerte: Alert;
  readonly onOuvrir: (href: string) => void;
}) {
  const ton = TONS[alerte.severity];
  const Icone = ton.icone;

  return (
    <button
      type="button"
      onClick={() => onOuvrir(alerte.href)}
      className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-accent ${ton.fond}`}
    >
      <span className="flex items-start gap-2">
        <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${ton.texte}`} />
        <span className="min-w-0">
          <span className="block text-sm leading-snug">{alerte.title}</span>
          <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
            {alerte.detail}
          </span>
        </span>
      </span>
    </button>
  );
}

export function AlertBell() {
  const { alerts, summary } = useAlerts();

  // Les alertes sont déjà calculées ici : les notifier depuis un autre
  // composant obligerait à refaire le calcul, avec le risque que les deux
  // sources divergent.
  useAlertNotifications(alerts);
  const [ouvert, setOuvert] = useState(false);
  const navigate = useNavigate();

  const ouvrir = (href: string) => {
    setOuvert(false);
    void navigate(href);
  };

  // Le compteur ne porte que le critique et l'avertissement : gonfler la
  // pastille avec des informations ferait ignorer les deux premiers.
  const aTraiter = summary.critical + summary.warning;

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={
            aTraiter === 0
              ? "Alertes : rien à traiter"
              : `Alertes : ${aTraiter} à traiter`
          }
        >
          <Bell className="h-4 w-4" />
          {aTraiter > 0 && (
            <span
              className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[10px] font-medium text-white ${
                summary.critical > 0 ? "bg-destructive" : "bg-amber-500"
              }`}
            >
              {aTraiter > 9 ? "9+" : aTraiter}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="border-b border-border px-3 py-2.5">
          <p className="section-label">Alertes</p>
          <p className="text-sm mt-1">
            {alerts.length === 0
              ? "Rien à traiter."
              : `${summary.critical} critique(s), ${summary.warning} à surveiller, ${summary.info} pour information.`}
          </p>
        </div>

        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Aucune échéance dépassée, aucune dérive de budget.
          </div>
        ) : (
          <div className="max-h-[22rem] overflow-y-auto divide-y divide-border">
            {alerts.map((alerte) => (
              <LigneAlerte key={alerte.id} alerte={alerte} onOuvrir={ouvrir} />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
