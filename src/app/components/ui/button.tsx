import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

/**
 * Boutons de CodeWave Studio.
 *
 * La charte du site distingue deux registres, et cette distinction est reprise
 * telle quelle :
 *
 * - `default` et `outline` sont des **actions engageantes**. Le site leur donne
 *   des angles droits, Syne 700 en majuscules et un interlettrage de 0,06 em.
 *   C'est la signature la plus reconnaissable de la marque.
 * - `secondary`, `ghost`, `link` et `icon` sont des **commandes d'outillage** :
 *   une icône de suppression dans une ligne de tableau, un bouton de tri. Les
 *   passer en majuscules anguleuses alourdirait chaque écran sans rien
 *   signifier. Ils gardent la forme discrète d'origine.
 */
const CHARTE_ACTION =
  "rounded-none font-display font-bold uppercase tracking-[0.06em]";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Charte : dégradé 135°, ombre bleue et léger relèvement au survol.
        default: `${CHARTE_ACTION} text-primary-foreground border-2 border-primary bg-[linear-gradient(135deg,#004AAD,#0062E6)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_24px_rgba(0,74,173,0.35)]`,
        outline: `${CHARTE_ACTION} border-2 border-border bg-transparent text-foreground hover:border-primary-ink hover:text-primary-ink`,
        destructive:
          `${CHARTE_ACTION} border-2 border-destructive bg-destructive text-destructive-foreground hover:brightness-110`,
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-11 px-7 has-[>svg]:px-5",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
