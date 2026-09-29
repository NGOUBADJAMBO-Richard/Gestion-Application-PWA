import { describe, expect, it } from "vitest";

import {
  ACTIVITY_FAMILY_LABELS,
  ACTIVITY_LABELS,
  type ActivityEntry,
  type ActivityKind,
  activityFamily,
  appendActivity,
  filterActivity,
  groupActivityByDay,
  unreadSince,
} from "./activity";

function entree(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id: "a-1",
    at: "2026-04-20T09:30:00",
    kind: "documentIssued",
    title: "FAC-2026-005 émise",
    detail: "Akanda Group · 531 000 FCFA",
    ...overrides,
  };
}

describe("natures", () => {
  it("nomme chaque nature et chaque famille", () => {
    for (const libelle of Object.values(ACTIVITY_LABELS)) {
      expect(libelle.length).toBeGreaterThan(3);
    }
    for (const libelle of Object.values(ACTIVITY_FAMILY_LABELS)) {
      expect(libelle.length).toBeGreaterThan(2);
    }
  });

  it("range chaque nature dans une famille", () => {
    for (const nature of Object.keys(ACTIVITY_LABELS) as ActivityKind[]) {
      expect(["money", "work", "data"]).toContain(activityFamily(nature));
    }
  });

  it("classe l'argent, le travail et les données séparément", () => {
    expect(activityFamily("paymentRecorded")).toBe("money");
    expect(activityFamily("milestoneDelivered")).toBe("work");
    expect(activityFamily("backupExported")).toBe("data");
  });
});

describe("ajout", () => {
  it("place la nouvelle entrée en tête", () => {
    const journal = appendActivity([entree({ id: "vieux" })], entree({ id: "neuf" }));
    expect(journal.map((e) => e.id)).toEqual(["neuf", "vieux"]);
  });

  it("oublie le plus ancien au-delà de la limite", () => {
    let journal: readonly ActivityEntry[] = [];
    for (let index = 0; index < 5; index += 1) {
      journal = appendActivity(journal, entree({ id: `e-${index}` }), 3);
    }
    expect(journal.map((e) => e.id)).toEqual(["e-4", "e-3", "e-2"]);
  });

  it("garde toujours au moins une entrée, même sur une limite absurde", () => {
    expect(appendActivity([], entree(), 0)).toHaveLength(1);
  });

  it("ne modifie pas le journal reçu", () => {
    const source = [entree({ id: "a" })];
    appendActivity(source, entree({ id: "b" }));
    expect(source.map((e) => e.id)).toEqual(["a"]);
  });
});

describe("non lues", () => {
  const journal = [
    entree({ id: "c", at: "2026-04-20T11:00:00" }),
    entree({ id: "b", at: "2026-04-20T10:00:00" }),
    entree({ id: "a", at: "2026-04-19T18:00:00" }),
  ];

  it("rend tout quand rien n'a jamais été lu", () => {
    expect(unreadSince(journal, null)).toHaveLength(3);
  });

  it("ne rend que ce qui est postérieur à la lecture", () => {
    expect(unreadSince(journal, "2026-04-20T10:00:00").map((e) => e.id)).toEqual([
      "c",
    ]);
  });

  it("considère l'entrée lue à la seconde près comme lue", () => {
    // Marquer lu à l'instant d'une entrée ne doit pas la laisser non lue :
    // le compteur resterait bloqué à un.
    expect(unreadSince(journal, "2026-04-20T11:00:00")).toHaveLength(0);
  });
});

describe("filtres", () => {
  const journal = [
    entree({
      id: "a",
      kind: "paymentRecorded",
      title: "Encaissement Akanda",
      detail: "200 000 FCFA",
    }),
    entree({
      id: "b",
      kind: "milestoneDelivered",
      title: "Recette client livrée",
      detail: "E-commerce Business",
    }),
    entree({
      id: "c",
      kind: "backupExported",
      title: "Sauvegarde exportée",
      detail: "12 collections",
    }),
  ];

  it("filtre par famille", () => {
    expect(filterActivity(journal, { family: "work" }).map((e) => e.id)).toEqual([
      "b",
    ]);
  });

  it("cherche dans le titre et le détail", () => {
    expect(filterActivity(journal, { query: "akanda" }).map((e) => e.id)).toEqual([
      "a",
    ]);
    expect(
      filterActivity(journal, { query: "e-commerce" }).map((e) => e.id),
    ).toEqual(["b"]);
  });

  it("cherche aussi dans le libellé de la nature", () => {
    // Taper « relance » doit trouver les relances, même si le titre dit
    // « FAC-2026-003 ».
    const avecRelance = [
      ...journal,
      entree({ id: "d", kind: "reminderSent", title: "FAC-2026-003", detail: "" }),
    ];
    expect(
      filterActivity(avecRelance, { query: "relance" }).map((e) => e.id),
    ).toEqual(["d"]);
  });

  it("ignore la casse et les espaces autour", () => {
    expect(filterActivity(journal, { query: "  AKANDA " }).map((e) => e.id)).toEqual(
      ["a"],
    );
  });

  it("rend tout sans filtre", () => {
    expect(filterActivity(journal, {})).toHaveLength(3);
    expect(filterActivity(journal, { query: "   " })).toHaveLength(3);
  });

  it("combine famille et recherche", () => {
    expect(
      filterActivity(journal, { family: "money", query: "akanda" }).map((e) => e.id),
    ).toEqual(["a"]);
    expect(
      filterActivity(journal, { family: "data", query: "akanda" }),
    ).toHaveLength(0);
  });
});

describe("regroupement par jour", () => {
  it("range du plus récent au plus ancien", () => {
    const jours = groupActivityByDay([
      entree({ id: "a", at: "2026-04-19T18:00:00" }),
      entree({ id: "b", at: "2026-04-20T10:00:00" }),
      entree({ id: "c", at: "2026-04-20T11:00:00" }),
    ]);
    expect(jours.map((j) => j.date)).toEqual(["2026-04-20", "2026-04-19"]);
    expect(jours[0]?.entries.map((e) => e.id)).toEqual(["c", "b"]);
  });

  it("découpe sur la date écrite, sans repasser par UTC", () => {
    // Une action de 00 h 30 au Gabon appartient à ce jour-là. Repasser par
    // `Date` la rangerait la veille — le défaut que `date.ts` corrige.
    const jours = groupActivityByDay([entree({ at: "2026-04-20T00:30:00" })]);
    expect(jours[0]?.date).toBe("2026-04-20");
  });

  it("rend une liste vide pour un journal vide", () => {
    expect(groupActivityByDay([])).toEqual([]);
  });
});
