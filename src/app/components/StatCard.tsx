import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "./ui/card";

/**
 * Chiffre clé d'un écran.
 *
 * Les quatre indicateurs d'en-tête étaient quatre boîtes identiques : même
 * graisse pour le libellé et pour le montant, aucune hiérarchie, aucun signe
 * distinctif entre un chiffre neutre et une marge négative. Rien n'y accrochait
 * l'œil, donc tout se lisait à la même vitesse — c'est-à-dire lentement.
 *
 * Trois niveaux de lecture : le libellé, le montant, la précision. Et un ton,
 * parce qu'une marge négative doit se voir avant d'être lue.
 */

export type StatTone = "neutral" | "positive" | "negative" | "warning";

const TONES: Record<StatTone, { value: string; icon: string }> = {
  neutral: { value: "text-foreground", icon: "bg-primary/10 text-primary-ink" },
  positive: {
    value: "text-emerald-600 dark:text-emerald-400",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  negative: {
    value: "text-destructive",
    icon: "bg-destructive/10 text-destructive",
  },
  warning: {
    value: "text-amber-600 dark:text-amber-400",
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly tone?: StatTone;
  readonly icon?: LucideIcon;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
}: StatCardProps) {
  const ton = TONES[tone];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className={`figure text-2xl mt-2 ${ton.value}`}>{value}</p>
          </div>
          {Icon !== undefined && (
            // Carré, sans arrondi : la charte réserve les formes adoucies aux
            // surfaces, pas aux pastilles d'accent.
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center ${ton.icon}`}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        {hint !== undefined && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface MeterProps {
  /** Pourcentage. Au-delà de 100, la barre sature mais le ton change. */
  readonly percent: number;
  readonly label: string;
}

/**
 * Jauge de consommation.
 *
 * `Progress` peignait toujours la même barre bleue : à 23 % comme à 98 % du
 * budget, rien ne distinguait le confort de l'alerte. Ici la couleur porte
 * l'information au même titre que la longueur.
 */
export function Meter({ percent, label }: MeterProps) {
  const ton =
    percent > 100
      ? "var(--destructive)"
      : percent > 85
        ? "#d97706"
        : "var(--primary)";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="amount">{percent.toFixed(0)} %</span>
      </div>
      <div
        className="meter"
        role="meter"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <span
          style={{
            width: `${Math.min(100, Math.max(0, percent))}%`,
            ["--meter-fill" as string]: ton,
          }}
        />
      </div>
    </div>
  );
}
