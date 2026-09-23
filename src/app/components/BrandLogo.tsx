import { useId } from "react";

import { BRAND } from "../../branding";

type LogoSize = "sm" | "md" | "lg";

interface BrandLogoProps {
  size?: LogoSize;
  /** Affiche le nom et la signature à côté de la marque. */
  showText?: boolean;
  /**
   * `color` : la marque telle qu'elle est, tuile navy comprise.
   * `mono`  : une seule couleur héritée du texte, pour les surfaces déjà
   *           colorées où la tuile navy ferait une tache.
   */
  mode?: "color" | "mono";
  subtitle?: string;
  className?: string;
}

const TILE: Record<LogoSize, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const TITLE: Record<LogoSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

/** Couleurs de la marque, reprises de `public/icon-512.png`. */
const INK = "#E2E8F0";
const ACCENT = "#60A5FA";
const TILE_BG = "#0F172A";

/**
 * Marque de CodeWave Studio.
 *
 * Le logo d'agence complet — monogramme, mot-symbole CODEWAVE et signature
 * manuscrite — devient illisible en dessous de 120 px : dans une barre
 * latérale de 40 px, c'est une tache. La marque applicative existe déjà
 * (`icon-512.png`) : tuile navy, « MGN » dont le G porte l'accent bleu, et
 * l'onde CodeWave. On la redessine ici en SVG.
 *
 * Pourquoi pas le PNG directement : à 32 px le PNG est flou sur écran
 * standard, il ne suit pas le thème, et il impose son fond. Le SVG inline est
 * net à toute taille et accepte une variante monochrome.
 */
export function BrandLogo({
  size = "md",
  showText = true,
  mode = "color",
  subtitle = BRAND.tagline.fr,
  className = "",
}: BrandLogoProps) {
  const titleId = useId();
  const isMono = mode === "mono";

  const ink = isMono ? "currentColor" : INK;
  const accent = isMono ? "currentColor" : ACCENT;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        className={`${TILE[size]} shrink-0`}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{`${BRAND.name} — ${BRAND.company}`}</title>

        {!isMono && <rect width="64" height="64" rx="12.5" fill={TILE_BG} />}

        {/* textLength fige la largeur du monogramme : le logo ne doit pas
            deborder de sa tuile selon que Syne est chargee ou non. */}
        <text
          x="32"
          y="41"
          textAnchor="middle"
          fontFamily="Syne, system-ui, sans-serif"
          fontSize="26"
          fontWeight="800"
          textLength="48"
          lengthAdjust="spacingAndGlyphs"
        >
          <tspan fill={ink}>M</tspan>
          <tspan fill={accent}>G</tspan>
          <tspan fill={ink}>N</tspan>
        </text>

        {/* L'onde : la signature graphique de CodeWave. */}
        <path
          d="M8 52q8-6 16 0t16 0t16 0"
          fill="none"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <div className="min-w-0">
          <p
            className={`${TITLE[size]} font-display font-bold leading-tight tracking-tight text-foreground truncate`}
          >
            {BRAND.name}
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground truncate">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
