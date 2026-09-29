import { useCallback, useMemo } from "react";

import type { Client } from "../data/entities";
import { clientRepository } from "../data/repositories";
import { useCollection } from "./useCollection";

/** Libellé affiché quand un identifiant ne correspond à aucun client vivant. */
export const CLIENT_INTROUVABLE = "Client supprimé";

/**
 * Répertoire des clients, pour résoudre un identifiant en nom.
 *
 * Projets, factures et tickets désignaient leur client par son **nom
 * d'entreprise**. Renommer un client rompait donc silencieusement le lien :
 * les documents restaient rattachés à un nom qui n'existait plus, et aucune
 * alerte ne le signalait. La référence passe par l'identifiant, et le nom
 * n'est plus qu'un affichage.
 */
export function useClientIndex(): {
  clients: readonly Client[];
  byId: ReadonlyMap<string, Client>;
  nameOf: (clientId: string) => string;
} {
  const { items: clients } = useCollection(clientRepository);

  const byId = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  const nameOf = useCallback(
    (clientId: string) => byId.get(clientId)?.company ?? CLIENT_INTROUVABLE,
    [byId],
  );

  return { clients, byId, nameOf };
}
