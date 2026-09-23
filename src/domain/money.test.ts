import { describe, expect, it } from "vitest";

import {
  CurrencyMismatchError,
  InvalidAmountError,
  add,
  allocate,
  applyDiscount,
  compare,
  distribute,
  equals,
  formatMoney,
  fromMajorUnit,
  money,
  multiply,
  negate,
  percentOf,
  roundHalfUp,
  subtract,
  sum,
  toMajorUnit,
  zero,
} from "./money";

const xaf = (amount: number) => money(amount, "XAF");
const eur = (amount: number) => money(amount, "EUR");

describe("construction", () => {
  it("refuse un montant à virgule", () => {
    expect(() => money(12.5, "XAF")).toThrow(InvalidAmountError);
  });

  it("refuse NaN et l'infini", () => {
    expect(() => money(Number.NaN, "EUR")).toThrow(InvalidAmountError);
    expect(() => money(Number.POSITIVE_INFINITY, "EUR")).toThrow(InvalidAmountError);
  });

  it("accepte un entier négatif, nécessaire aux avoirs", () => {
    expect(money(-1500, "XAF").amount).toBe(-1500);
  });
});

describe("addition et soustraction", () => {
  it("additionne sans dérive, là où les flottants en produisent une", () => {
    // 0.1 + 0.2 !== 0.3 en IEEE 754. En centimes, 10 + 20 === 30, exactement.
    expect(add(eur(10), eur(20))).toEqual(eur(30));
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it("refuse d'additionner deux devises différentes", () => {
    expect(() => add(xaf(1000), eur(1000))).toThrow(CurrencyMismatchError);
  });

  it("nomme les deux devises dans le message d'erreur", () => {
    expect(() => add(xaf(1), eur(1))).toThrow(/XAF.*EUR|EUR.*XAF/);
  });

  it("soustrait et peut passer sous zéro", () => {
    expect(subtract(xaf(1000), xaf(2500))).toEqual(xaf(-1500));
  });

  it("somme une liste", () => {
    expect(sum([xaf(1000), xaf(2500), xaf(300)])).toEqual(xaf(3800));
  });

  it("exige une devise pour sommer une liste vide", () => {
    expect(() => sum([])).toThrow();
    expect(sum([], "XAF")).toEqual(xaf(0));
  });
});

describe("arrondi commercial", () => {
  it("arrondit le demi vers le haut", () => {
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
  });

  it("est symétrique autour de zéro, contrairement à Math.round", () => {
    // Math.round(-0.5) vaut -0 : un avoir ne serait pas le miroir exact de sa
    // facture. Ici, -0,5 va bien à -1.
    expect(roundHalfUp(-0.5)).toBe(-1);
    expect(roundHalfUp(-1.5)).toBe(-2);
    expect(Math.round(-0.5)).not.toBe(-1);
  });

  it("garantit roundHalfUp(-x) === -roundHalfUp(x)", () => {
    for (const value of [0.5, 1.5, 2.5, 12.34, 999.995, 0.4999]) {
      expect(roundHalfUp(-value)).toBe(-roundHalfUp(value));
    }
  });
});

describe("allocate — répartition sans perte", () => {
  it("ne perd aucune unité, même quand la division tombe mal", () => {
    const parts = allocate(xaf(100), 3);
    expect(parts.map((p) => p.amount)).toEqual([34, 33, 33]);
    expect(sum(parts)).toEqual(xaf(100));
  });

  it("répartit le reliquat sur les premières parts", () => {
    expect(allocate(xaf(10), 4).map((p) => p.amount)).toEqual([3, 3, 2, 2]);
  });

  it("conserve la somme pour tout montant et tout nombre de parts", () => {
    for (const amount of [1, 7, 100, 999, 123457]) {
      for (const parts of [2, 3, 7, 12]) {
        expect(sum(allocate(xaf(amount), parts))).toEqual(xaf(amount));
      }
    }
  });

  it("traite un montant négatif en miroir", () => {
    expect(allocate(xaf(-100), 3).map((p) => p.amount)).toEqual([-34, -33, -33]);
    expect(sum(allocate(xaf(-100), 3))).toEqual(xaf(-100));
  });

  it("refuse un nombre de parts absurde", () => {
    expect(() => allocate(xaf(100), 0)).toThrow(RangeError);
    expect(() => allocate(xaf(100), 2.5)).toThrow(RangeError);
  });
});

describe("remise", () => {
  it("applique une remise de 7 % sur un montant courant", () => {
    expect(applyDiscount(xaf(12000), 7)).toEqual(xaf(11160));
  });

  it("arrondit de façon déterministe sur une ligne à 1 XAF remisée de 50 %", () => {
    // Le cas piège : 0,5 franc n'existe pas. La règle du demi supérieur
    // tranche à 1, et elle tranche toujours pareil.
    expect(applyDiscount(xaf(1), 50)).toEqual(xaf(1));
    expect(applyDiscount(xaf(1), 50)).toEqual(applyDiscount(xaf(1), 50));
  });

  it("une remise de 0 % ne change rien, une remise de 100 % annule", () => {
    expect(applyDiscount(xaf(9999), 0)).toEqual(xaf(9999));
    expect(applyDiscount(xaf(9999), 100)).toEqual(xaf(0));
  });

  it("refuse une remise hors bornes", () => {
    expect(() => applyDiscount(xaf(100), -1)).toThrow(RangeError);
    expect(() => applyDiscount(xaf(100), 101)).toThrow(RangeError);
  });
});

describe("unité majeure et affichage", () => {
  it("convertit une saisie en euros vers les centimes", () => {
    expect(fromMajorUnit(12.5, "EUR")).toEqual(eur(1250));
    expect(fromMajorUnit(0.07, "EUR")).toEqual(eur(7));
  });

  it("ne crée pas de sous-unité en XAF, qui n'en a pas", () => {
    expect(fromMajorUnit(1500, "XAF")).toEqual(xaf(1500));
    expect(toMajorUnit(xaf(1500))).toBe(1500);
  });

  it("affiche le franc CFA sans décimale", () => {
    const rendu = formatMoney(xaf(1250000));
    expect(rendu).not.toMatch(/[.,]\d\d/);
    expect(rendu).toMatch(/1\s?250\s?000/);
  });

  it("affiche l'euro avec deux décimales", () => {
    expect(formatMoney(eur(1250))).toMatch(/12,50/);
  });
});

describe("comparaison", () => {
  it("ordonne et détecte l'égalité", () => {
    expect(compare(xaf(100), xaf(200))).toBeLessThan(0);
    expect(compare(xaf(200), xaf(100))).toBeGreaterThan(0);
    expect(compare(xaf(100), xaf(100))).toBe(0);
    expect(equals(xaf(100), xaf(100))).toBe(true);
  });

  it("ne considère jamais égaux deux montants de devises différentes", () => {
    expect(equals(xaf(100), eur(100))).toBe(false);
    expect(() => compare(xaf(100), eur(100))).toThrow(CurrencyMismatchError);
  });
});

describe("avoir — le miroir doit être exact", () => {
  it("facture + avoir = 0, sur des montants qui tombent mal", () => {
    for (const amount of [1, 7, 12345, 99999, 1000001]) {
      const facture = xaf(amount);
      const avoir = negate(facture);
      expect(add(facture, avoir)).toEqual(xaf(0));
    }
  });

  it("un avoir remisé annule exactement la ligne remisée", () => {
    const ligne = applyDiscount(multiply(xaf(12500), 3), 7);
    expect(add(ligne, negate(ligne))).toEqual(xaf(0));
  });
});

describe("absence de dérive sur un gros volume", () => {
  it("mille lignes sommées restent exactes", () => {
    const lignes = Array.from({ length: 1000 }, () => percentOf(xaf(12345), 18));
    const attendu = percentOf(xaf(12345), 18).amount * 1000;
    expect(sum(lignes)).toEqual(xaf(attendu));
  });

  it("le total ne dépend pas de l'ordre des lignes", () => {
    const lignes = [xaf(1), xaf(99999), xaf(7), xaf(123), xaf(4567)];
    const inverse = [...lignes].reverse();
    expect(sum(lignes)).toEqual(sum(inverse));
  });

  it("zéro reste neutre", () => {
    expect(add(xaf(4242), zero("XAF"))).toEqual(xaf(4242));
  });
});

describe("distribute — ventilation au prorata", () => {
  it("conserve le total, même quand le prorata tombe mal", () => {
    const parts = distribute(xaf(100), [1, 1, 1]);
    expect(sum(parts)).toEqual(xaf(100));
    expect(parts.map((p) => p.amount)).toEqual([34, 33, 33]);
  });

  it("respecte les poids", () => {
    const parts = distribute(xaf(1000), [70, 30]);
    expect(parts.map((p) => p.amount)).toEqual([700, 300]);
  });

  it("attribue le reliquat au plus fort reste, pas au premier venu", () => {
    // Parts exactes : 16,66 / 16,66 / 66,66 -> les trois ont le même reste,
    // l'unité restante revient donc au premier indice, de façon reproductible.
    const parts = distribute(xaf(100), [25, 25, 100]);
    expect(sum(parts)).toEqual(xaf(100));
  });

  it("est reproductible", () => {
    const a = distribute(xaf(777), [3, 5, 11, 2]);
    const b = distribute(xaf(777), [3, 5, 11, 2]);
    expect(a).toEqual(b);
  });

  it("répartit également quand tous les poids sont nuls", () => {
    expect(sum(distribute(xaf(10), [0, 0, 0]))).toEqual(xaf(10));
  });

  it("traite un montant négatif en miroir", () => {
    expect(sum(distribute(xaf(-100), [1, 1, 1]))).toEqual(xaf(-100));
  });

  it("conserve le total sur des poids aléatoires", () => {
    for (let essai = 0; essai < 200; essai += 1) {
      const weights = Array.from({ length: 2 + (essai % 7) }, (_u, i) => (essai * 7 + i * 13) % 97);
      const montant = xaf((essai * 991) % 100000);
      expect(sum(distribute(montant, weights))).toEqual(montant);
    }
  });

  it("refuse un poids négatif", () => {
    expect(() => distribute(xaf(100), [1, -1])).toThrow(RangeError);
  });
});
