import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "./ui/card";

/**
 * Chiffre clé d'un écran.
 *
 * Les indicateurs d'en-tête étaient des boîtes identiques : même graisse pour
 * le libellé et pour le montant, aucun signe distinctif entre un chiffre neutre
 * et une marge négative. Rien n'y accrochait l'œil, donc tout se lisait à la
 * même vitesse — c'est-à-dire lentement.
 *
 * Trois niveaux de lecture : le libellé, le montant, la précision. Un ton,
 * parce qu'une marge négative doit se voir avant d'être lue. Et un compteur
 * qui monte à l'ouverture, assez court pour marquer l'arrivée du chiffre sans
 * jamais faire attendre sa lecture.
 */

export type StatTone = "neutral" | "positive" | "negative" | "warning";

const TONES: Record<StatTone, { value: string; icon: string; rule: string }> = {
  neutral: {
    value: "text-foreground",
    icon: "bg-primary/10 text-primary-ink",
    rule: "before:bg-primary",
  },
  positive: {
    value: "text-emerald-600 dark:text-emerald-400",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rule: "before:bg-emerald-500",
  },
  negative: {
    value: "text-destructive",
    icon: "bg-destructive/10 text-destructive",
    rule: "before:bg-destructive",
  },
  warning: {
    value: "text-amber-600 dark:text-amber-400",
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rule: "before:bg-amber-500",
  },
};

/** Valeur animée : le chiffre monte de zéro jusqu'à `to` à l'ouverture. */
export interface AnimatedValue {
  readonly to: number;
  readonly format: (value: number) => string;
}

/** Durée du compteur. Au-delà, on attend un chiffre au lieu de le lire. */
const COUNT_MS = 480;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    // `matchMedia` absent (environnement de test) : on ne suppose pas que le
    // mouvement est souhaité.
    return true;
  }
}

/**
 * Compteur ascendant.
 *
 * Part de zéro et s'arrête net sur la valeur exacte — jamais sur une
 * approximation due à l'interpolation. Une seule animation, au montage : un
 * chiffre qui se remet à compter à chaque rendu rendrait l'écran illisible
 * pendant la saisie.
 */
function useCountUp(target: number): number {
  const [valeur, setValeur] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const precedent = useRef(target);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValeur(target);
      precedent.current = target;
      return;
    }

    // Changement de valeur en cours d'usage (une saisie, un filtre) : on saute
    // à la nouvelle valeur. Rejouer le compteur ferait clignoter le tableau.
    if (precedent.current !== target) {
      setValeur(target);
      precedent.current = target;
      return;
    }

    const depart = performance.now();
    let image = 0;

    const avancer = (maintenant: number) => {
      const progres = Math.min(1, (maintenant - depart) / COUNT_MS);
      // Sortie amortie : le chiffre ralentit en approchant, ce qui se lit
      // comme un arrêt et non comme une coupure.
      const amorti = 1 - (1 - progres) ** 3;
      setValeur(progres === 1 ? target : target * amorti);
      if (progres < 1) image = requestAnimationFrame(avancer);
    };

    image = requestAnimationFrame(avancer);
    return () => cancelAnimationFrame(image);
  }, [target]);

  return valeur;
}

function ValeurAnimee({ value }: { readonly value: AnimatedValue }) {
  const courant = useCountUp(value.to);
  return <>{value.format(Math.round(courant))}</>;
}

export interface StatTrend {
  /** Variation en pourcentage. Négative pour une baisse. */
  readonly percent: number;
  readonly label: string;
  /**
   * Faux quand une baisse est une bonne nouvelle — un délai d'encaissement,
   * un encours. Sans cela, un impayé qui diminue s'afficherait en rouge.
   */
  readonly higherIsBetter?: boolean;
}

interface StatCardProps {
  readonly label: string;
  readonly value: string | AnimatedValue;
  readonly hint?: string;
  readonly tone?: StatTone;
  readonly icon?: LucideIcon;
  readonly trend?: StatTrend;
  /** Rend la carte cliquable vers l'écran qui permet d'agir. */
  readonly href?: string;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  trend,
  href,
}: StatCardProps) {
  const ton = TONES[tone];

  const contenu = (
    <Card
      className={`h-full ${href === undefined ? "" : "card-interactive"} relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:content-[''] ${ton.rule}`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className={`figure text-2xl mt-2 ${ton.value}`}>
              {typeof value === "string" ? value : <ValeurAnimee value={value} />}
            </p>
          </div>
          {Icon !== undefined && (
            // Carré, sans arrondi : la charte réserve les formes adoucies aux
            // surfaces, pas aux pastilles d'accent.
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110 ${ton.icon}`}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>

        {trend !== undefined && (
          <p
            className={`mt-2 flex items-center gap-1 text-sm ${
              (trend.higherIsBetter ?? true) === trend.percent >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            }`}
          >
            {trend.percent >= 0 ? (
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="amount">
              {trend.percent >= 0 ? "+" : ""}
              {trend.percent.toFixed(1)} %
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </p>
        )}

        {hint !== undefined && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href === undefined) return contenu;

  return (
    <Link to={href} className="group block h-full">
      {contenu}
    </Link>
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
        ? "var(--warning)"
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
