import { beforeEach, describe, expect, it } from "vitest";

import {
  notificationsEnabled,
  resetNotificationJournal,
  setNotificationsEnabled,
  takeUnnotified,
} from "./notificationJournal";

describe("préférence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("est coupée par défaut", () => {
    // Notifier sans avoir été autorisé serait une intrusion, et les
    // navigateurs le refusent de toute façon.
    expect(notificationsEnabled()).toBe(false);
  });

  it("se garde d'une ouverture à l'autre", () => {
    setNotificationsEnabled(true);
    expect(notificationsEnabled()).toBe(true);
  });

  it("oublie ce qui a été signalé quand on la coupe", () => {
    // Sinon, couper puis rallumer ne produirait plus rien : l'utilisateur
    // rallume, ne voit aucune notification, et croit à une panne.
    setNotificationsEnabled(true);
    takeUnnotified(["overdue:f-1"]);
    setNotificationsEnabled(false);
    setNotificationsEnabled(true);
    expect(takeUnnotified(["overdue:f-1"])).toEqual(["overdue:f-1"]);
  });
});

describe("mémoire des alertes signalées", () => {
  beforeEach(() => {
    localStorage.clear();
    resetNotificationJournal();
  });

  it("rend les alertes jamais signalées", () => {
    expect(takeUnnotified(["a", "b"])).toEqual(["a", "b"]);
  });

  it("ne rend pas deux fois la même", () => {
    takeUnnotified(["a", "b"]);
    expect(takeUnnotified(["a", "b"])).toEqual([]);
  });

  it("rend uniquement les nouvelles d'une salve mixte", () => {
    takeUnnotified(["a"]);
    expect(takeUnnotified(["a", "b"])).toEqual(["b"]);
  });

  it("re-signale une alerte résolue puis réapparue", () => {
    // Une facture relancée, réglée, puis une seconde qui dérape le mois
    // suivant : garder l'historique complet aurait rendu la seconde muette.
    takeUnnotified(["overdue:f-1"]);
    takeUnnotified([]);
    expect(takeUnnotified(["overdue:f-1"])).toEqual(["overdue:f-1"]);
  });

  it("oublie les alertes disparues sans toucher aux autres", () => {
    takeUnnotified(["a", "b"]);
    takeUnnotified(["b"]);
    const suite = takeUnnotified(["a", "b"]);
    expect(suite).toEqual(["a"]);
  });

  it("supporte une mémoire corrompue sans planter", () => {
    // Un stockage modifié à la main, ou écrit par une version antérieure.
    localStorage.setItem("codewave-studio:notifications-sent", "{pas du json");
    expect(takeUnnotified(["a"])).toEqual(["a"]);
  });

  it("ignore les entrées qui ne sont pas des identifiants", () => {
    localStorage.setItem(
      "codewave-studio:notifications-sent",
      JSON.stringify(["a", 42, null]),
    );
    expect(takeUnnotified(["a", "b"])).toEqual(["b"]);
  });

  it("rend une liste vide pour une salve vide", () => {
    expect(takeUnnotified([])).toEqual([]);
  });
});
