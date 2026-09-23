import { describe, expect, it } from "vitest";

import {
  INITIAL_LOCKOUT,
  type LockoutState,
  checkLockout,
  formatDelay,
  registerFailure,
  registerSuccess,
} from "./lockout";

const T0 = 1_758_600_000_000;

function apresEchecs(nombre: number, at: number = T0): LockoutState {
  let etat = INITIAL_LOCKOUT;
  for (let index = 0; index < nombre; index += 1) etat = registerFailure(etat, at);
  return etat;
}

describe("tolérance aux fautes de frappe", () => {
  it("laisse passer les deux premiers échecs sans délai", () => {
    expect(checkLockout(apresEchecs(1), T0).locked).toBe(false);
    expect(checkLockout(apresEchecs(2), T0).locked).toBe(false);
  });
});

describe("temporisation croissante", () => {
  it("verrouille 15 secondes au troisième échec", () => {
    const decision = checkLockout(apresEchecs(3), T0);
    expect(decision.locked).toBe(true);
    expect(decision.retryInSeconds).toBe(15);
  });

  it("allonge le délai à mesure des échecs", () => {
    const paliers = [3, 4, 5, 8, 12].map(
      (n) => checkLockout(apresEchecs(n), T0).retryInSeconds,
    );
    // Strictement croissant : chaque palier coûte plus cher que le précédent.
    for (let index = 1; index < paliers.length; index += 1) {
      expect(paliers[index]).toBeGreaterThan(paliers[index - 1] ?? 0);
    }
  });

  it("atteint une heure au douzième échec", () => {
    expect(checkLockout(apresEchecs(12), T0).retryInSeconds).toBe(3600);
  });

  it("ne bloque jamais définitivement : le délai finit toujours par s'écouler", () => {
    const etat = apresEchecs(50);
    const apresUneJournee = checkLockout(etat, T0 + 24 * 3600 * 1000);
    expect(apresUneJournee.locked).toBe(false);
  });
});

describe("écoulement du temps", () => {
  it("libère la tentative une fois le délai passé", () => {
    const etat = apresEchecs(3);
    expect(checkLockout(etat, T0 + 14_000).locked).toBe(true);
    expect(checkLockout(etat, T0 + 15_000).locked).toBe(false);
  });

  it("décompte les secondes restantes", () => {
    const etat = apresEchecs(4);
    expect(checkLockout(etat, T0 + 30_000).retryInSeconds).toBe(30);
  });
});

describe("messages", () => {
  it("dit combien de temps attendre et propose la récupération", () => {
    const decision = checkLockout(apresEchecs(5), T0);
    expect(decision.message).toMatch(/5 minutes/);
    expect(decision.message).toMatch(/récupération/i);
  });

  it("formate les durées sans unité absurde", () => {
    expect(formatDelay(1)).toBe("1 seconde");
    expect(formatDelay(15)).toBe("15 secondes");
    expect(formatDelay(60)).toBe("1 minute");
    expect(formatDelay(300)).toBe("5 minutes");
    expect(formatDelay(3600)).toBe("1 heure");
  });
});

describe("réussite", () => {
  it("remet le compteur à zéro", () => {
    expect(registerSuccess()).toEqual(INITIAL_LOCKOUT);
    expect(checkLockout(registerSuccess(), T0).locked).toBe(false);
  });
});
