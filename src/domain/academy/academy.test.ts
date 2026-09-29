import { describe, expect, it } from "vitest";

import {
  AcademyError,
  CATALOGUE,
  CATALOGUE_GROUP_LABELS,
  type Enrollment,
  type Installment,
  type Learner,
  type TrainingSession,
  buildInstallments,
  canEnroll,
  computeAcademyMetrics,
  enrollmentBalance,
  learnerName,
  sessionOccupancy,
  validateEnrollment,
  validateLearner,
  validateSession,
} from "./index";

const XAF = "XAF" as const;

function session(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: "s-1",
    catalogueId: "m3",
    title: "React.js",
    startDate: "2026-04-06",
    endDate: "2026-04-24",
    capacity: 12,
    mode: "onsite",
    trainer: "Richard Ngoubadjambo",
    price: 70000,
    hours: 48,
    status: "confirmed",
    ...overrides,
  };
}

function apprenant(overrides: Partial<Learner> = {}): Learner {
  return {
    id: "a-1",
    firstName: "Sylvie",
    lastName: "Ondo",
    email: "s.ondo@example.ga",
    phone: "+241 66 20 14 07",
    ...overrides,
  };
}

function inscription(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: "i-1",
    sessionId: "s-1",
    learnerId: "a-1",
    status: "confirmed",
    agreedPrice: 70000,
    installments: [{ id: "ech-1", dueDate: "2026-04-06", amount: 70000 }],
    enrolledAt: "2026-03-30",
    ...overrides,
  };
}

describe("catalogue importé du site", () => {
  it("contient les sept modules du bootcamp et le bootcamp lui-même", () => {
    const codes = CATALOGUE.map((entree) => entree.code);
    for (const code of ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "BOOTCAMP"]) {
      expect(codes).toContain(code);
    }
  });

  it("reprend les tarifs du site sans les réinventer", () => {
    // Si ces montants changent sans que le site ait changé, c'est que le
    // fichier généré a été édité à la main — précisément ce qu'il interdit.
    const react = CATALOGUE.find((entree) => entree.code === "M3");
    expect(react?.amount).toBe(70000);
    expect(react?.hours).toBe(48);

    const bootcamp = CATALOGUE.find((entree) => entree.code === "BOOTCAMP");
    expect(bootcamp?.amount).toBe(300000);
    // Somme des heures des sept modules : 30+36+48+48+24+30+24.
    expect(bootcamp?.hours).toBe(240);
  });

  it("admet un prix au devis, distinct d'un prix nul", () => {
    const surMesure = CATALOGUE.find((entree) => entree.id === "intra-sur-mesure");
    expect(surMesure).toBeDefined();
    expect(surMesure?.amount).toBeNull();
  });

  it("nomme chaque groupe référencé", () => {
    for (const entree of CATALOGUE) {
      expect(CATALOGUE_GROUP_LABELS[entree.group]).toBeTruthy();
    }
  });
});

describe("échéancier", () => {
  it("découpe sans perdre une unité", () => {
    // 300 001 F en cinq fois : le reliquat va sur la première échéance.
    const echeances = buildInstallments(300001, 5, "2026-04-06", XAF);
    expect(echeances).toHaveLength(5);
    expect(echeances.reduce((total, e) => total + e.amount, 0)).toBe(300001);
    expect(echeances[0]?.amount).toBe(60001);
    expect(echeances[4]?.amount).toBe(60000);
  });

  it("espace les échéances de trente jours", () => {
    const echeances = buildInstallments(300000, 3, "2026-04-06", XAF);
    expect(echeances.map((e) => e.dueDate)).toEqual([
      "2026-04-06",
      "2026-05-06",
      "2026-06-05",
    ]);
  });

  it("accepte un paiement comptant comme une échéance unique", () => {
    const echeances = buildInstallments(70000, 1, "2026-04-06", XAF);
    expect(echeances).toHaveLength(1);
    expect(echeances[0]?.amount).toBe(70000);
  });

  it("refuse un nombre d'échéances absurde", () => {
    expect(() => buildInstallments(70000, 0, "2026-04-06", XAF)).toThrow(AcademyError);
    expect(() => buildInstallments(70000, 2.5, "2026-04-06", XAF)).toThrow(/entier/);
  });
});

describe("solde d'une inscription", () => {
  const echelonne: readonly Installment[] = [
    { id: "ech-1", dueDate: "2026-04-06", amount: 70000, paidAt: "2026-04-06" },
    { id: "ech-2", dueDate: "2026-05-06", amount: 70000 },
    { id: "ech-3", dueDate: "2026-06-05", amount: 70000 },
  ];

  it("distingue l'encaissé du contracté", () => {
    const solde = enrollmentBalance(
      inscription({ agreedPrice: 210000, installments: echelonne }),
      XAF,
      "2026-05-10",
    );
    expect(solde.total.amount).toBe(210000);
    expect(solde.paid.amount).toBe(70000);
    expect(solde.balance.amount).toBe(140000);
    expect(solde.settled).toBe(false);
  });

  it("signale les échéances dépassées", () => {
    const solde = enrollmentBalance(
      inscription({ agreedPrice: 210000, installments: echelonne }),
      XAF,
      "2026-05-10",
    );
    expect(solde.overdue.map((e) => e.id)).toEqual(["ech-2"]);
  });

  it("ne compte pas le jour même comme un retard", () => {
    // Cohérent avec les factures : on ne réclame pas le matin de l'échéance.
    const solde = enrollmentBalance(
      inscription({ agreedPrice: 210000, installments: echelonne }),
      XAF,
      "2026-05-06",
    );
    expect(solde.overdue).toHaveLength(0);
    expect(solde.next?.id).toBe("ech-2");
  });

  it("se solde quand tout est réglé", () => {
    const solde = enrollmentBalance(
      inscription({
        installments: [
          { id: "ech-1", dueDate: "2026-04-06", amount: 70000, paidAt: "2026-04-05" },
        ],
      }),
      XAF,
      "2026-06-01",
    );
    expect(solde.settled).toBe(true);
    expect(solde.balance.amount).toBe(0);
    expect(solde.next).toBeNull();
  });
});

describe("remplissage d'une session", () => {
  it("compte les inscrits retenus", () => {
    const remplissage = sessionOccupancy(session({ capacity: 4 }), [
      inscription({ id: "i-1", learnerId: "a-1" }),
      inscription({ id: "i-2", learnerId: "a-2" }),
    ]);
    expect(remplissage.taken).toBe(2);
    expect(remplissage.remaining).toBe(2);
    expect(remplissage.percent).toBe(50);
    expect(remplissage.full).toBe(false);
  });

  it("libère la place d'une inscription annulée ou abandonnée", () => {
    // Les compter afficherait « complet » alors qu'il reste des sièges, et
    // ferait refuser un apprenant sans raison.
    const remplissage = sessionOccupancy(session({ capacity: 2 }), [
      inscription({ id: "i-1", learnerId: "a-1" }),
      inscription({ id: "i-2", learnerId: "a-2", status: "cancelled" }),
      inscription({ id: "i-3", learnerId: "a-3", status: "dropped" }),
    ]);
    expect(remplissage.taken).toBe(1);
    expect(remplissage.full).toBe(false);
  });

  it("ignore les inscriptions d'une autre session", () => {
    const remplissage = sessionOccupancy(session(), [
      inscription({ id: "i-9", sessionId: "s-autre" }),
    ]);
    expect(remplissage.taken).toBe(0);
  });
});

describe("règles d'inscription", () => {
  it("accepte sur une session ouverte avec des places", () => {
    expect(canEnroll(session(), [], "a-1").allowed).toBe(true);
  });

  it("refuse sur une session annulée", () => {
    const decision = canEnroll(session({ status: "cancelled" }), [], "a-1");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.rule).toBe("session.cancelled");
  });

  it("refuse une inscription rétroactive sur une session terminée", () => {
    const decision = canEnroll(session({ status: "done" }), [], "a-1");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toMatch(/présence/);
  });

  it("refuse un doublon et désigne l'inscription existante", () => {
    const decision = canEnroll(session(), [inscription()], "a-1");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.rule).toBe("enrollment.duplicate");
      expect(decision.blockedBy).toEqual(["i-1"]);
    }
  });

  it("réinscrit un apprenant dont l'inscription avait été annulée", () => {
    const decision = canEnroll(
      session(),
      [inscription({ status: "cancelled" })],
      "a-1",
    );
    expect(decision.allowed).toBe(true);
  });

  it("refuse quand la session est complète, en disant quoi faire", () => {
    const decision = canEnroll(
      session({ capacity: 1 }),
      [inscription({ learnerId: "a-9" })],
      "a-1",
    );
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toMatch(/capacité|autre session/);
  });
});

describe("validation", () => {
  it("accepte une session complète", () => {
    expect(() => validateSession(session())).not.toThrow();
  });

  it("refuse une session qui finit avant de commencer", () => {
    expect(() =>
      validateSession(session({ startDate: "2026-04-24", endDate: "2026-04-06" })),
    ).toThrow(/avant d'avoir commencé/);
  });

  it("refuse une session sans place", () => {
    expect(() => validateSession(session({ capacity: 0 }))).toThrow(/au moins une place/);
  });

  it("exige un formateur", () => {
    expect(() => validateSession(session({ trainer: "  " }))).toThrow(/attestation/);
  });

  it("exige un moyen de contact pour un apprenant", () => {
    expect(() =>
      validateLearner(apprenant({ email: "", phone: "" })),
    ).toThrow(/moyen de contact/);
    expect(() =>
      validateLearner(apprenant({ email: "", phone: "+241 66 00 00 00" })),
    ).not.toThrow();
  });

  it("refuse un échéancier qui ne totalise pas le prix consenti", () => {
    // C'est le contrôle qui empêche une inscription de se solder « payée »
    // alors qu'il manque un franc.
    expect(() =>
      validateEnrollment(
        inscription({
          agreedPrice: 210000,
          installments: [{ id: "ech-1", dueDate: "2026-04-06", amount: 200000 }],
        }),
      ),
    ).toThrow(/totalise 200000 au lieu de 210000/);
  });

  it("refuse un taux de présence hors bornes", () => {
    expect(() =>
      validateEnrollment(inscription({ attendancePercent: 120 })),
    ).toThrow(/0 à 100/);
  });
});

describe("pilotage", () => {
  const sessions = [
    session({ id: "s-1", capacity: 4, startDate: "2026-04-06" }),
    session({ id: "s-2", capacity: 10, startDate: "2026-06-01", status: "planned" }),
    session({ id: "s-3", capacity: 8, status: "cancelled" }),
  ];
  const apprenants = [
    apprenant({ id: "a-1" }),
    apprenant({ id: "a-2" }),
    apprenant({ id: "a-3", archivedAt: "2026-02-01" }),
  ];
  const inscriptions = [
    inscription({
      id: "i-1",
      sessionId: "s-1",
      learnerId: "a-1",
      agreedPrice: 210000,
      attendancePercent: 90,
      installments: [
        { id: "e1", dueDate: "2026-04-06", amount: 70000, paidAt: "2026-04-06" },
        { id: "e2", dueDate: "2026-05-06", amount: 70000 },
        { id: "e3", dueDate: "2026-06-05", amount: 70000 },
      ],
    }),
    inscription({
      id: "i-2",
      sessionId: "s-1",
      learnerId: "a-2",
      agreedPrice: 56000,
      discountReason: "Étudiant, −20 %",
      attendancePercent: 70,
      installments: [
        { id: "e4", dueDate: "2026-04-06", amount: 56000, paidAt: "2026-04-06" },
      ],
    }),
    inscription({ id: "i-3", sessionId: "s-2", learnerId: "a-1", status: "cancelled" }),
  ];

  const metriques = computeAcademyMetrics(
    sessions,
    apprenants,
    inscriptions,
    XAF,
    "2026-05-20",
  );

  it("distingue le contracté de l'encaissé", () => {
    expect(metriques.contracted.amount).toBe(266000);
    expect(metriques.collected.amount).toBe(126000);
    expect(metriques.outstanding.amount).toBe(140000);
  });

  it("compte les échéances en retard", () => {
    expect(metriques.overdueInstallments).toBe(1);
    expect(metriques.overdueAmount.amount).toBe(70000);
  });

  it("écarte les inscriptions annulées du chiffre d'affaires", () => {
    expect(metriques.activeEnrollments).toBe(2);
  });

  it("ne compte pas les apprenants archivés", () => {
    expect(metriques.learnersCount).toBe(2);
  });

  it("moyenne le remplissage des sessions non annulées", () => {
    // s-1 : 2/4 = 50 %. s-2 : 0/10 = 0 % (l'inscription est annulée).
    // s-3 est annulée, donc écartée. Moyenne = 25 %.
    expect(metriques.fillRate).toBe(25);
  });

  it("moyenne la présence des inscriptions renseignées", () => {
    expect(metriques.attendanceRate).toBe(80);
  });

  it("compte les sessions à venir", () => {
    expect(metriques.upcomingCount).toBe(1);
  });

  it("rend null plutôt que zéro quand il n'y a rien à moyenner", () => {
    const vide = computeAcademyMetrics([], [], [], XAF, "2026-05-20");
    expect(vide.fillRate).toBeNull();
    expect(vide.attendanceRate).toBeNull();
    expect(vide.contracted.amount).toBe(0);
  });
});

describe("apprenant", () => {
  it("compose le nom affiché", () => {
    expect(learnerName(apprenant())).toBe("Sylvie Ondo");
  });
});
