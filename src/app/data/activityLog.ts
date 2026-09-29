import { storageKey } from "../../branding";
import {
  type ActivityEntry,
  type ActivityKind,
  appendActivity,
  unreadSince,
} from "../../domain/activity";
import { newId } from "../../domain/id";

/**
 * Persistance du journal d'activité.
 *
 * Volontairement hors du contrat `Repository` : une entrée de journal ne se
 * modifie pas, ne se supprime pas, et ne va pas à la corbeille. Lui donner les
 * mêmes opérations qu'un client ou qu'une facture inviterait à la réécrire, et
 * un journal réécrit ne prouve rien.
 *
 * La lecture est marquée par **une seule date**, pas par un drapeau sur chaque
 * entrée. C'est plus simple à tenir juste : il n'y a qu'une valeur à mettre à
 * jour, et aucune entrée ne peut rester « non lue » par oubli.
 */

const CLE_JOURNAL = storageKey("activity");
const CLE_LECTURE = storageKey("activity-read-at");

const listeners = new Set<() => void>();

function notifier(): void {
  for (const listener of listeners) listener();
}

export function readActivity(): readonly ActivityEntry[] {
  try {
    const brut = localStorage.getItem(CLE_JOURNAL);
    if (brut === null) return [];
    const valeur: unknown = JSON.parse(brut);
    if (!Array.isArray(valeur)) return [];
    // Une entrée illisible est écartée, pas corrigée : un journal partiel
    // reste utile, un journal qui fait tomber l'écran ne l'est pas.
    return valeur.filter(
      (entree: unknown): entree is ActivityEntry =>
        typeof entree === "object" &&
        entree !== null &&
        typeof (entree as ActivityEntry).id === "string" &&
        typeof (entree as ActivityEntry).at === "string" &&
        typeof (entree as ActivityEntry).title === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Horodatage local complet, à la seconde.
 *
 * Pas `toISOString()` : il convertit en temps universel et daterait de la
 * veille une action faite à 00 h 30 au Gabon — le défaut que `domain/date`
 * corrige pour les dates, transposé ici aux heures.
 */
function maintenant(reference: Date = new Date()): string {
  const deux = (valeur: number) => String(valeur).padStart(2, "0");
  return (
    `${String(reference.getFullYear()).padStart(4, "0")}-` +
    `${deux(reference.getMonth() + 1)}-${deux(reference.getDate())}T` +
    `${deux(reference.getHours())}:${deux(reference.getMinutes())}:` +
    `${deux(reference.getSeconds())}`
  );
}

export interface ActivityDraft {
  readonly kind: ActivityKind;
  readonly title: string;
  readonly detail?: string | undefined;
  readonly href?: string | undefined;
  readonly amount?: number | undefined;
}

/**
 * Consigne un événement.
 *
 * N'échoue jamais : consigner est un effet de bord du travail réel, et un
 * quota de stockage atteint ne doit pas empêcher d'émettre une facture. En
 * dernier recours, le journal est vidé et l'entrée courante conservée seule —
 * mieux vaut perdre l'historique que bloquer l'écriture.
 */
export function recordActivity(draft: ActivityDraft): void {
  const entree: ActivityEntry = {
    id: newId(),
    at: maintenant(),
    kind: draft.kind,
    title: draft.title,
    detail: draft.detail,
    href: draft.href,
    amount: draft.amount,
  };

  const suivant = appendActivity(readActivity(), entree);

  try {
    localStorage.setItem(CLE_JOURNAL, JSON.stringify(suivant));
  } catch {
    try {
      localStorage.setItem(CLE_JOURNAL, JSON.stringify([entree]));
    } catch {
      // Stockage indisponible : l'événement a bien eu lieu, seule sa trace
      // manque. On ne remonte pas l'échec à l'appelant.
      return;
    }
  }

  notifier();
}

export function readLastReadAt(): string | null {
  try {
    return localStorage.getItem(CLE_LECTURE);
  } catch {
    return null;
  }
}

export function markActivityRead(): void {
  try {
    localStorage.setItem(CLE_LECTURE, maintenant());
  } catch {
    // Sans mémoire de lecture, le compteur restera visible : gênant, pas
    // bloquant.
  }
  notifier();
}

export function unreadActivityCount(): number {
  return unreadSince(readActivity(), readLastReadAt()).length;
}

export function subscribeActivity(listener: () => void): () => void {
  listeners.add(listener);

  const surAutreOnglet = (event: StorageEvent) => {
    if (event.key === CLE_JOURNAL || event.key === CLE_LECTURE) listener();
  };
  window.addEventListener("storage", surAutreOnglet);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", surAutreOnglet);
  };
}

/** Efface le journal. Réservé à la purge des données et aux tests. */
export function clearActivity(): void {
  try {
    localStorage.removeItem(CLE_JOURNAL);
    localStorage.removeItem(CLE_LECTURE);
  } catch {
    // Rien à effacer.
  }
  notifier();
}
