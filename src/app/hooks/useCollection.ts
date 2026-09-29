import { useCallback, useEffect, useState } from "react";

import type { Entity, Repository } from "../../infra/repository";

/**
 * Relie un composant React à un dépôt.
 *
 * Remplace le motif `useState(mockClients)` qui régnait dans les pages : la
 * saisie y vivait dans la mémoire du composant et disparaissait au
 * rechargement. Ici, toute écriture passe par le dépôt, qui persiste et
 * prévient les autres onglets.
 *
 * Les erreurs ne sont jamais avalées : `error` porte le message destiné à
 * l'utilisateur, et l'appelant décide comment l'afficher.
 */
export interface CollectionApi<T extends Entity> {
  readonly items: readonly T[];
  readonly isLoading: boolean;
  readonly error: string | null;
  create: (draft: Omit<T, "id">) => Promise<T | undefined>;
  update: (id: string, patch: Partial<Omit<T, "id">>) => Promise<T | undefined>;
  remove: (id: string) => Promise<boolean>;
  dismissError: () => void;
}

/**
 * Message destiné à l'utilisateur.
 *
 * Les erreurs du domaine et de l'infrastructure portent déjà un texte en
 * français qui dit quoi faire ; on ne le remplace pas par un libellé générique.
 */
function messageOf(cause: unknown): string {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  return "Une erreur inattendue est survenue. Recharge la page, puis réessaie.";
}

export function useCollection<T extends Entity>(
  repository: Repository<T>,
): CollectionApi<T> {
  const [items, setItems] = useState<readonly T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;

    const charger = () => {
      repository
        .list()
        .then((liste) => {
          if (!annule) setItems(liste);
        })
        .catch((cause: unknown) => {
          if (!annule) setError(messageOf(cause));
        })
        .finally(() => {
          if (!annule) setIsLoading(false);
        });
    };

    charger();

    // Le dépôt prévient aussi bien après une écriture locale qu'après une
    // écriture venue d'un autre onglet.
    const desabonner = repository.subscribe(charger);

    return () => {
      annule = true;
      desabonner();
    };
  }, [repository]);

  const create = useCallback(
    async (draft: Omit<T, "id">) => {
      try {
        return await repository.create(draft);
      } catch (cause) {
        setError(messageOf(cause));
        return undefined;
      }
    },
    [repository],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Omit<T, "id">>) => {
      try {
        return await repository.update(id, patch);
      } catch (cause) {
        setError(messageOf(cause));
        return undefined;
      }
    },
    [repository],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await repository.remove(id);
        return true;
      } catch (cause) {
        setError(messageOf(cause));
        return false;
      }
    },
    [repository],
  );

  const dismissError = useCallback(() => setError(null), []);

  return { items, isLoading, error, create, update, remove, dismissError };
}
