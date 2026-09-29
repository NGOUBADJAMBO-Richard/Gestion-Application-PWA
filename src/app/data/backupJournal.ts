import { storageKey } from "../../branding";
import { todayIso, type IsoDate } from "../../domain/date";

/**
 * Date de la dernière sauvegarde exportée.
 *
 * Tout vit dans le stockage de ce navigateur : un profil effacé, un disque
 * remplacé, et rien n'est récupérable. La seule protection est un export
 * régulier — encore faut-il savoir quand il a eu lieu. Sans cette trace,
 * l'application ne pouvait pas rappeler qu'aucune sauvegarde n'a jamais été
 * faite, ce qui est précisément le cas le plus dangereux.
 *
 * Une seule valeur, pas une collection : l'historique complet des exports
 * n'apprendrait rien de plus que le dernier.
 */

const KEY = storageKey("last-backup");

const listeners = new Set<() => void>();

export function readLastBackup(): IsoDate | null {
  try {
    const valeur = localStorage.getItem(KEY);
    return valeur === null || valeur.length === 0 ? null : valeur;
  } catch {
    // Stockage indisponible (navigation privée, quota) : on ne prétend pas
    // qu'une sauvegarde existe.
    return null;
  }
}

export function recordBackup(date: IsoDate = todayIso()): void {
  try {
    localStorage.setItem(KEY, date);
  } catch {
    // Échec silencieux : l'export a bien eu lieu, seule sa trace manque.
    // Faire échouer l'export pour ça serait une régression.
  }
  for (const listener of listeners) listener();
}

export function subscribeBackup(listener: () => void): () => void {
  listeners.add(listener);

  const surAutreOnglet = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", surAutreOnglet);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", surAutreOnglet);
  };
}
