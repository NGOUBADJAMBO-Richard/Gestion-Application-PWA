import { describe, expect, it } from "vitest";

import { idCreatedAt, isId, newId } from "./id";

describe("newId", () => {
  it("produit 26 caractères de l'alphabet de Crockford", () => {
    const id = newId();
    expect(id).toHaveLength(26);
    expect(isId(id)).toBe(true);
  });

  it("ne collisionne pas sur dix mille tirages", () => {
    const vus = new Set<string>();
    for (let index = 0; index < 10000; index += 1) vus.add(newId());
    expect(vus.size).toBe(10000);
  });

  it("se trie chronologiquement par comparaison de chaînes", () => {
    const ancien = newId(1_700_000_000_000);
    const recent = newId(1_800_000_000_000);
    expect(ancien < recent).toBe(true);
  });

  it("conserve l'ordre sur une série croissante", () => {
    const ids = [0, 1, 1000, 1_700_000_000_000, 1_900_000_000_000].map((t) => newId(t));
    expect([...ids].sort()).toEqual(ids);
  });

  it("restitue l'horodatage de création", () => {
    const instant = 1_758_600_000_000;
    expect(idCreatedAt(newId(instant))).toBe(instant);
  });

  it("refuse un horodatage absurde", () => {
    expect(() => newId(-1)).toThrow(RangeError);
    expect(() => newId(Number.NaN)).toThrow(RangeError);
  });
});

describe("isId", () => {
  it("rejette les lettres ambiguës exclues de l'alphabet", () => {
    expect(isId("IIIIIIIIIIIIIIIIIIIIIIIIII")).toBe(false);
    expect(isId("LLLLLLLLLLLLLLLLLLLLLLLLLL")).toBe(false);
  });

  it("rejette une longueur incorrecte", () => {
    expect(isId("01ARZ3NDEK")).toBe(false);
    expect(isId("")).toBe(false);
  });
});
