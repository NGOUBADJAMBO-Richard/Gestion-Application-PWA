import { storageKey } from "../../branding";
import { migrateLegacyNumber } from "../../domain/numbering";

/**
 * Reprise des données enregistrées avant le passage à la référence par
 * identifiant.
 *
 * Deux corrections, appliquées une seule fois :
 *
 * 1. Projets, factures et tickets désignaient leur client par son **nom
 *    d'entreprise**. Renommer un client rompait le lien sans le signaler. On
 *    résout chaque nom vers l'identifiant réel du client.
 * 2. Les factures étaient numérotées `INV-2026-001`. Le préfixe devient
 *    `FAC-`, **sans renuméroter** : l'année et le rang sont conservés, donc
 *    une facture déjà remise à un client garde sa place dans la séquence.
 *
 * Un nom qui ne correspond à aucun client existant n'est pas inventé : le
 * document conserve son ancien libellé dans `client`, et `clientId` reste
 * vide. L'interface affichera « Client supprimé » plutôt qu'un rattachement
 * arbitraire, ce qui serait pire qu'une absence.
 */

interface Envelope {
  schemaVersion: number;
  data: unknown[];
}

const COLLECTIONS_A_MIGRER = ["projects", "invoices", "tickets"] as const;

export interface LinkMigrationReport {
  readonly resolved: number;
  readonly unresolved: number;
  readonly renumbered: number;
}

function readEnvelope(storage: Storage, key: string): Envelope | null {
  try {
    const brut = storage.getItem(key);
    if (brut === null) return null;
    const parsed = JSON.parse(brut) as Envelope;
    return Array.isArray(parsed.data) ? parsed : null;
  } catch {
    return null;
  }
}

/** Index nom d'entreprise → identifiant, construit depuis les clients stockés. */
function buildClientIndex(storage: Storage): Map<string, string> {
  const index = new Map<string, string>();
  const enveloppe = readEnvelope(storage, storageKey("clients"));
  if (enveloppe === null) return index;

  for (const entree of enveloppe.data) {
    if (typeof entree !== "object" || entree === null) continue;
    const client = entree as { id?: unknown; company?: unknown };
    if (typeof client.id === "string" && typeof client.company === "string") {
      index.set(client.company.trim().toLowerCase(), client.id);
    }
  }
  return index;
}

export function migrateClientLinks(
  storage: Storage = localStorage,
): LinkMigrationReport {
  const index = buildClientIndex(storage);
  let resolved = 0;
  let unresolved = 0;
  let renumbered = 0;

  for (const collection of COLLECTIONS_A_MIGRER) {
    const key = storageKey(collection);
    const enveloppe = readEnvelope(storage, key);
    if (enveloppe === null) continue;

    let modifie = false;

    const data = enveloppe.data.map((entree) => {
      if (typeof entree !== "object" || entree === null) return entree;
      const record = { ...(entree as Record<string, unknown>) };

      if (typeof record.clientId !== "string" || record.clientId === "") {
        const ancienNom = record.client;
        if (typeof ancienNom === "string") {
          const trouve = index.get(ancienNom.trim().toLowerCase());
          if (trouve === undefined) {
            record.clientId = "";
            unresolved += 1;
          } else {
            record.clientId = trouve;
            delete record.client;
            resolved += 1;
          }
          modifie = true;
        }
      }

      if (collection === "invoices" && typeof record.number === "string") {
        const migre = migrateLegacyNumber(record.number);
        if (migre !== record.number) {
          record.number = migre;
          renumbered += 1;
          modifie = true;
        }
      }

      return record;
    });

    if (modifie) {
      try {
        storage.setItem(
          key,
          JSON.stringify({ schemaVersion: enveloppe.schemaVersion, data }),
        );
      } catch {
        // Écriture refusée : les données d'origine restent intactes, la
        // migration sera retentée au prochain démarrage.
      }
    }
  }

  return { resolved, unresolved, renumbered };
}
