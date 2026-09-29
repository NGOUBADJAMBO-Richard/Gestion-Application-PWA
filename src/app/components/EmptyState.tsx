import type { LucideIcon } from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

/**
 * Écran sans données.
 *
 * Une liste vide qui n'affiche qu'une barre de recherche ressemble à un écran
 * cassé : rien ne dit si la donnée manque, si le filtre est trop étroit, ou si
 * la page n'a pas fini de charger. Elle doit dire trois choses — ce qu'il n'y a
 * pas, à quoi ça sert, et le geste à faire.
 *
 * Distinct du cas « aucun résultat » : là, il ne faut surtout pas proposer de
 * créer quelque chose, mais d'élargir la recherche. Le message est donc passé
 * par l'appelant, qui seul sait dans lequel des deux cas il se trouve.
 */
interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string | undefined;
  readonly onAction?: (() => void) | undefined;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center bg-primary/10 text-primary-ink"
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </span>

        <h2 className="text-lg">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>

        {actionLabel !== undefined && onAction !== undefined && (
          <Button onClick={onAction} className="mt-2">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
