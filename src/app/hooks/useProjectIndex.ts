import { useCallback, useMemo } from "react";

import type { Project } from "../data/entities";
import { projectRepository } from "../data/repositories";
import { useCollection } from "./useCollection";

/** Libellé affiché quand un identifiant ne correspond à aucun projet vivant. */
export const PROJET_INTROUVABLE = "Projet supprimé";

/** Libellé affiché pour une pièce ou une dépense non rattachée. */
export const SANS_PROJET = "Non rattaché";

/**
 * Répertoire des projets, pour résoudre un identifiant en nom.
 *
 * Même raisonnement que pour les clients : le rattachement passe par
 * l'identifiant, le nom n'est qu'un affichage. Un projet renommé ne rompt donc
 * ni l'imputation d'un temps, ni celle d'une dépense.
 */
export function useProjectIndex(): {
  projects: readonly Project[];
  byId: ReadonlyMap<string, Project>;
  nameOf: (projectId: string | undefined) => string;
} {
  const { items: projects } = useCollection(projectRepository);

  const byId = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const nameOf = useCallback(
    (projectId: string | undefined) => {
      if (projectId === undefined || projectId.length === 0) return SANS_PROJET;
      return byId.get(projectId)?.name ?? PROJET_INTROUVABLE;
    },
    [byId],
  );

  return { projects, byId, nameOf };
}
