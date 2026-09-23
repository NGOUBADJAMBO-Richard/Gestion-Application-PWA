import { storageKey } from "../../branding";

/**
 * Reprise des clés de stockage de « M.G.N Manager ».
 *
 * L'application écrivait sous des clés `mgn-*`. Le renommage en
 * « CodeWave Studio » les rend invisibles : un utilisateur qui met à jour
 * retrouverait une session fermée, un thème réinitialisé et sa langue perdue.
 *
 * La migration recopie, vérifie que la copie est fidèle, et ne supprime
 * l'ancienne clé qu'ensuite. Si l'écriture échoue — quota atteint, stockage
 * refusé en navigation privée — l'ancienne clé est conservée : perdre la
 * donnée serait pire que garder un doublon.
 */
const LEGACY_KEYS: ReadonlyArray<readonly [legacy: string, current: string]> = [
  ["mgn-user", storageKey("user")],
  ["mgn-theme", storageKey("theme")],
  ["mgn-language", storageKey("language")],
];

export interface MigrationReport {
  /** Clés effectivement recopiées lors de cet appel. */
  migrated: readonly string[];
  /** Clés ignorées car la cible contenait déjà une valeur. */
  skipped: readonly string[];
  /** Clés dont la recopie a échoué ; l'original est intact. */
  failed: readonly string[];
}

/**
 * Migre les clés héritées. L'opération est idempotente : la relancer sur un
 * stockage déjà migré ne fait rien et ne signale aucune erreur.
 */
export function migrateLegacyStorageKeys(
  storage: Storage = localStorage,
): MigrationReport {
  const migrated: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const [legacy, current] of LEGACY_KEYS) {
    let legacyValue: string | null;
    try {
      legacyValue = storage.getItem(legacy);
    } catch {
      // Stockage inaccessible (navigation privée verrouillée) : rien à migrer.
      failed.push(legacy);
      continue;
    }

    if (legacyValue === null) continue;

    // La cible prime : une valeur écrite sous le nouveau nom est plus récente
    // que l'ancienne, et l'écraser ferait régresser l'utilisateur.
    if (storage.getItem(current) !== null) {
      removeQuietly(storage, legacy);
      skipped.push(legacy);
      continue;
    }

    try {
      storage.setItem(current, legacyValue);
    } catch {
      failed.push(legacy);
      continue;
    }

    // On ne supprime qu'après avoir relu : une écriture silencieusement
    // tronquée par le quota ne doit pas emporter l'original.
    if (storage.getItem(current) !== legacyValue) {
      failed.push(legacy);
      continue;
    }

    removeQuietly(storage, legacy);
    migrated.push(legacy);
  }

  return { migrated, skipped, failed };
}

function removeQuietly(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Impossible de nettoyer : sans conséquence, la nouvelle clé fait foi.
  }
}
