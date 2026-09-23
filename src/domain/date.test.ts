import { describe, expect, it } from "vitest";

import { addDays, isIsoDate, todayIso, toIsoDate } from "./date";

describe("toIsoDate", () => {
  it("formate en AAAA-MM-JJ avec remplissage par des zéros", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toIsoDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("lit le calendrier local et non l'instant UTC", () => {
    // 1er mars 2026, 00 h 30, heure locale. Au Gabon (UTC+1) cet instant vaut
    // le 28 février 23 h 30 en temps universel : `toISOString()` renverrait
    // donc « 2026-02-28 » et daterait la facture de la veille.
    const justeApresMinuit = new Date(2026, 2, 1, 0, 30, 0);
    expect(toIsoDate(justeApresMinuit)).toBe("2026-03-01");
  });

  it("refuse une date invalide au lieu de produire « NaN-NaN-NaN »", () => {
    expect(() => toIsoDate(new Date("pas une date"))).toThrow(RangeError);
  });
});

describe("todayIso", () => {
  it("accepte une date de référence, pour que les tests ne dépendent pas de l'horloge", () => {
    expect(todayIso(new Date(2026, 8, 23))).toBe("2026-09-23");
  });

  it("produit une date ISO valide sans argument", () => {
    expect(isIsoDate(todayIso())).toBe(true);
  });
});

describe("isIsoDate", () => {
  it("accepte une date réelle", () => {
    expect(isIsoDate("2026-09-23")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true); // année bissextile
  });

  it("rejette un jour qui n'existe pas au calendrier", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2025-02-29")).toBe(false); // 2025 n'est pas bissextile
  });

  it("rejette un format approchant", () => {
    expect(isIsoDate("2026-9-23")).toBe(false);
    expect(isIsoDate("23/09/2026")).toBe(false);
    expect(isIsoDate("2026-09-23T00:00:00")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("addDays", () => {
  it("franchit une fin de mois", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("franchit une fin d'année", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("gère le 29 février d'une année bissextile", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("accepte un décalage négatif", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("calcule une échéance à 30 jours", () => {
    expect(addDays("2026-09-23", 30)).toBe("2026-10-23");
  });

  it("refuse une date ISO invalide", () => {
    expect(() => addDays("pas-une-date", 1)).toThrow(RangeError);
  });
});
