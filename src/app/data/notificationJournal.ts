import { storageKey } from "../../branding";

/**
 * Préférence de notification et mémoire des alertes déjà signalées.
 *
 * Deux valeurs, un seul fichier : elles ne servent qu'ensemble, et les séparer
 * obligerait à les lire dans le même ordre à deux endroits.
 *
 * La mémoire des alertes signalées est **taillée sur les alertes encore
 * vivantes** à chaque passage. C'est ce qui permet à une condition résolue puis
 * réapparue de notifier à nouveau : une facture relancée, réglée, puis une
 * seconde facture qui dérape le mois suivant méritent chacune leur signal.
 * Garder l'historique complet aurait rendu la seconde muette.
 */

const CLE_ACTIVATION = storageKey("notifications-enabled");
const CLE_SIGNALEES = storageKey("notifications-sent");

const listeners = new Set<() => void>();

export function notificationsEnabled(): boolean {
  try {
    return localStorage.getItem(CLE_ACTIVATION) === "true";
  } catch {
    return false;
  }
}

export function setNotificationsEnabled(actif: boolean): void {
  try {
    localStorage.setItem(CLE_ACTIVATION, actif ? "true" : "false");
    // Couper puis rallumer doit re-signaler ce qui est encore en cours :
    // sinon on rallume et il ne se passe rien, ce qui ressemble à une panne.
    if (!actif) localStorage.removeItem(CLE_SIGNALEES);
  } catch {
    // Stockage indisponible : la préférence ne survivra pas au rechargement,
    // ce qui est préférable à un écran qui refuse de répondre.
  }
  for (const listener of listeners) listener();
}

export function subscribeNotificationSettings(listener: () => void): () => void {
  listeners.add(listener);

  const surAutreOnglet = (event: StorageEvent) => {
    if (event.key === CLE_ACTIVATION) listener();
  };
  window.addEventListener("storage", surAutreOnglet);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", surAutreOnglet);
  };
}

function lireSignalees(): readonly string[] {
  try {
    const brut = localStorage.getItem(CLE_SIGNALEES);
    if (brut === null) return [];
    const valeur: unknown = JSON.parse(brut);
    return Array.isArray(valeur) ? valeur.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Parmi les alertes données, celles qui n'ont pas encore été signalées.
 *
 * Met à jour la mémoire dans la foulée, et la réduit aux alertes vivantes.
 * L'appelant n'a donc rien à ranger : il notifie ce qu'on lui rend.
 */
export function takeUnnotified(alertIds: readonly string[]): readonly string[] {
  const dejaVues = new Set(lireSignalees());
  const nouvelles = alertIds.filter((id) => !dejaVues.has(id));

  try {
    // On ne garde que les alertes encore présentes : une alerte disparue doit
    // pouvoir re-signaler si elle revient.
    localStorage.setItem(CLE_SIGNALEES, JSON.stringify(alertIds));
  } catch {
    // Sans mémoire, on re-signalerait à chaque ouverture. Plutôt que ça, on
    // considère tout comme déjà vu : mieux vaut manquer une notification que
    // d'en répéter une à l'infini.
    return [];
  }

  return nouvelles;
}

/** Oublie tout ce qui a été signalé. Sert aux tests et à la purge. */
export function resetNotificationJournal(): void {
  try {
    localStorage.removeItem(CLE_SIGNALEES);
  } catch {
    // Rien à faire : il n'y avait pas de mémoire à effacer.
  }
}
