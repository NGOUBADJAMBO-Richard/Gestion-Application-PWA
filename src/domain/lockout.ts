/**
 * Temporisation après échecs de connexion.
 *
 * Sans elle, un mot de passe de dix caractères se casse par essais successifs :
 * rien n'empêche d'en tenter des milliers par minute. La parade n'est pas de
 * bloquer définitivement — ce serait offrir à un tiers le moyen d'enfermer le
 * propriétaire hors de sa propre comptabilité — mais de ralentir assez pour
 * rendre l'attaque inintéressante.
 *
 * Module pur : il prend un état et l'heure, et rend une décision.
 */

export interface LockoutState {
  readonly failedAttempts: number;
  /** Instant du dernier échec, en millisecondes. */
  readonly lastFailureAt: number;
}

export const INITIAL_LOCKOUT: LockoutState = {
  failedAttempts: 0,
  lastFailureAt: 0,
};

/**
 * Paliers de temporisation, en secondes.
 *
 * Les deux premiers échecs passent sans délai : une faute de frappe ne doit
 * pas être punie. Ensuite la durée croît vite.
 */
const PALIERS: ReadonlyArray<readonly [attempts: number, seconds: number]> = [
  [3, 15],
  [4, 60],
  [5, 300],
  [8, 900],
  [12, 3600],
];

export interface LockoutDecision {
  readonly locked: boolean;
  /** Secondes restantes avant la prochaine tentative autorisée. */
  readonly retryInSeconds: number;
  readonly message?: string;
}

function delayFor(failedAttempts: number): number {
  let secondes = 0;
  for (const [seuil, duree] of PALIERS) {
    if (failedAttempts >= seuil) secondes = duree;
  }
  return secondes;
}

/** Formate une durée en français, sans unité absurde comme « 120 secondes ». */
export function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  const heures = Math.ceil(minutes / 60);
  return `${heures} heure${heures > 1 ? "s" : ""}`;
}

/** Dit si une tentative est permise maintenant. */
export function checkLockout(
  state: LockoutState,
  now: number = Date.now(),
): LockoutDecision {
  const delai = delayFor(state.failedAttempts);
  if (delai === 0) return { locked: false, retryInSeconds: 0 };

  const ecoule = (now - state.lastFailureAt) / 1000;
  const restant = Math.ceil(delai - ecoule);

  if (restant <= 0) return { locked: false, retryInSeconds: 0 };

  return {
    locked: true,
    retryInSeconds: restant,
    message:
      `Trop de tentatives échouées. Réessaie dans ${formatDelay(restant)}. ` +
      "Si tu as oublié le mot de passe, utilise ton code de récupération.",
  };
}

/** Enregistre un échec. */
export function registerFailure(
  state: LockoutState,
  now: number = Date.now(),
): LockoutState {
  return { failedAttempts: state.failedAttempts + 1, lastFailureAt: now };
}

/** Remet le compteur à zéro après une réussite. */
export function registerSuccess(): LockoutState {
  return INITIAL_LOCKOUT;
}
