import { describe, expect, it } from "vitest";

import {
  InvalidMilestoneError,
  MILESTONE_TEMPLATES,
  type Milestone,
  buildFromTemplate,
  describeProgress,
  milestoneProgress,
  sortMilestones,
  validateMilestone,
} from "./milestone";

const TODAY = "2026-03-20";

function jalon(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: "j-1",
    label: "Maquettes validées",
    dueDate: "2026-03-10",
    ...overrides,
  };
}

describe("validation", () => {
  it("accepte un jalon nommé et daté", () => {
    expect(() => validateMilestone(jalon())).not.toThrow();
  });

  it("refuse un intitulé vide, en disant pourquoi", () => {
    expect(() => validateMilestone(jalon({ label: "   " }))).toThrow(
      /ne dit pas ce qui doit être livré/,
    );
  });

  it("refuse une date absente ou illisible", () => {
    expect(() => validateMilestone(jalon({ dueDate: "" }))).toThrow(
      InvalidMilestoneError,
    );
    expect(() => validateMilestone(jalon({ dueDate: "10/03/2026" }))).toThrow(
      InvalidMilestoneError,
    );
  });

  it("refuse une date de livraison illisible", () => {
    expect(() => validateMilestone(jalon({ doneAt: "hier" }))).toThrow(/livraison/);
  });
});

describe("ordre", () => {
  it("classe par date prévue", () => {
    const tries = sortMilestones([
      jalon({ id: "b", dueDate: "2026-04-01" }),
      jalon({ id: "a", dueDate: "2026-03-01" }),
    ]);
    expect(tries.map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("reste stable à date égale", () => {
    const tries = sortMilestones([
      jalon({ id: "z", label: "Zéro", dueDate: "2026-03-01" }),
      jalon({ id: "a", label: "Alpha", dueDate: "2026-03-01" }),
    ]);
    expect(tries.map((j) => j.id)).toEqual(["a", "z"]);
  });

  it("ne modifie pas la liste reçue", () => {
    const source = [jalon({ id: "b", dueDate: "2026-04-01" }), jalon({ id: "a" })];
    sortMilestones(source);
    expect(source.map((j) => j.id)).toEqual(["b", "a"]);
  });
});

describe("avancement", () => {
  const projet = [
    jalon({ id: "j1", label: "Cadrage", dueDate: "2026-03-02", doneAt: "2026-03-02" }),
    jalon({ id: "j2", label: "Maquettes", dueDate: "2026-03-09", doneAt: "2026-03-11" }),
    jalon({ id: "j3", label: "Intégration", dueDate: "2026-03-16", doneAt: "2026-03-16" }),
    jalon({ id: "j4", label: "Paiement Airtel", dueDate: "2026-03-26" }),
    jalon({ id: "j5", label: "Recette client", dueDate: "2026-04-02" }),
  ];

  it("compte les livrés et ce qui reste", () => {
    const avancement = milestoneProgress(projet, TODAY);
    expect(avancement.total).toBe(5);
    expect(avancement.done).toBe(3);
    expect(avancement.remaining).toBe(2);
  });

  it("désigne le prochain jalon et le délai", () => {
    const avancement = milestoneProgress(projet, TODAY);
    expect(avancement.next?.label).toBe("Paiement Airtel");
    expect(avancement.daysToNext).toBe(6);
  });

  it("rend un délai négatif pour un jalon déjà dépassé", () => {
    const avancement = milestoneProgress(projet, "2026-04-05");
    expect(avancement.next?.label).toBe("Paiement Airtel");
    expect(avancement.daysToNext).toBe(-10);
  });

  it("liste les jalons en retard", () => {
    const avancement = milestoneProgress(projet, "2026-03-30");
    expect(avancement.late.map((j) => j.label)).toEqual(["Paiement Airtel"]);
  });

  it("ne compte pas le jour même comme un retard", () => {
    // On ne déclare pas un livrable en retard le matin où il est dû.
    const avancement = milestoneProgress(projet, "2026-03-26");
    expect(avancement.late).toHaveLength(0);
  });

  it("dérive le pourcentage au lieu de le faire saisir", () => {
    expect(milestoneProgress(projet, TODAY).donePercent).toBe(60);
  });

  it("rend null plutôt que zéro quand aucun jalon n'est défini", () => {
    // Zéro laisserait croire que rien n'est fait ; null dit qu'on ne sait pas.
    const vide = milestoneProgress([], TODAY);
    expect(vide.donePercent).toBeNull();
    expect(vide.next).toBeNull();
    expect(vide.daysToNext).toBeNull();
    expect(vide.allDone).toBe(false);
  });

  it("reconnaît un projet entièrement livré", () => {
    const tout = projet.map((j) => ({ ...j, doneAt: j.doneAt ?? "2026-04-02" }));
    const avancement = milestoneProgress(tout, "2026-04-10");
    expect(avancement.allDone).toBe(true);
    expect(avancement.next).toBeNull();
    expect(avancement.donePercent).toBe(100);
    expect(avancement.late).toHaveLength(0);
  });

  it("ne considère pas un jalon livré en retard comme en retard", () => {
    // « Maquettes » était dû le 09, livré le 11 : le fait est passé.
    const avancement = milestoneProgress(projet, TODAY);
    expect(avancement.late.map((j) => j.label)).not.toContain("Maquettes");
  });
});

describe("résumé", () => {
  it("dit ce qui vient ensuite, pas seulement le compte", () => {
    const resume = describeProgress(
      milestoneProgress(
        [
          jalon({ id: "a", label: "Cadrage", dueDate: "2026-03-02", doneAt: "2026-03-02" }),
          jalon({ id: "b", label: "Recette client", dueDate: "2026-03-26" }),
        ],
        TODAY,
      ),
    );
    expect(resume).toContain("1 jalon(s) sur 2");
    expect(resume).toContain("Recette client");
    expect(resume).toContain("dans 6 jour(s)");
  });

  it("annonce un retard", () => {
    const resume = describeProgress(
      milestoneProgress([jalon({ label: "Recette", dueDate: "2026-03-10" })], TODAY),
    );
    expect(resume).toContain("en retard de 10 jour(s)");
  });

  it("dit « aujourd'hui » plutôt que « dans 0 jour »", () => {
    const resume = describeProgress(
      milestoneProgress([jalon({ label: "Recette", dueDate: TODAY })], TODAY),
    );
    expect(resume).toContain("aujourd'hui");
  });

  it("distingue l'absence de jalon du projet terminé", () => {
    expect(describeProgress(milestoneProgress([], TODAY))).toBe(
      "Aucun jalon défini",
    );
    expect(
      describeProgress(
        milestoneProgress([jalon({ doneAt: "2026-03-10" })], TODAY),
      ),
    ).toBe("Tous les jalons livrés (1)");
  });
});

describe("modèles", () => {
  it("couvrent les prestations vendues sur le site", () => {
    const identifiants = MILESTONE_TEMPLATES.map((modele) => modele.id);
    expect(identifiants).toContain("site-vitrine");
    expect(identifiants).toContain("e-commerce");
    expect(identifiants).toContain("application-mobile");
  });

  it("chaque modèle est nommé et ordonné", () => {
    for (const modele of MILESTONE_TEMPLATES) {
      expect(modele.label.length).toBeGreaterThan(2);
      expect(modele.steps.length).toBeGreaterThanOrEqual(4);
      const decalages = modele.steps.map((etape) => etape.offsetDays);
      expect(decalages).toEqual([...decalages].sort((a, b) => a - b));
      expect(decalages[0]).toBe(0);
    }
  });

  it("place les dates à partir du départ donné", () => {
    const modele = MILESTONE_TEMPLATES.find((m) => m.id === "identite-visuelle");
    expect(modele).toBeDefined();
    const jalons = buildFromTemplate(
      modele as (typeof MILESTONE_TEMPLATES)[number],
      "2026-03-02",
      (index) => `t-${index}`,
    );
    expect(jalons[0]?.dueDate).toBe("2026-03-02");
    expect(jalons[1]?.dueDate).toBe("2026-03-09");
    expect(jalons.map((j) => j.id)).toEqual(["t-0", "t-1", "t-2", "t-3"]);
  });

  it("traverse un changement de mois", () => {
    const jalons = buildFromTemplate(
      { id: "x", label: "X", steps: [{ label: "A", offsetDays: 10 }] },
      "2026-02-25",
      () => "t",
    );
    expect(jalons[0]?.dueDate).toBe("2026-03-07");
  });

  it("refuse une date de départ invalide", () => {
    expect(() =>
      buildFromTemplate(
        { id: "x", label: "X", steps: [] },
        "pas une date",
        () => "t",
      ),
    ).toThrow(InvalidMilestoneError);
  });

  it("ne livre aucun jalon d'avance", () => {
    for (const modele of MILESTONE_TEMPLATES) {
      const jalons = buildFromTemplate(modele, "2026-03-02", (i) => String(i));
      expect(jalons.every((j) => j.doneAt === undefined)).toBe(true);
    }
  });
});
