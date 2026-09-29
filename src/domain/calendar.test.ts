import { describe, expect, it } from "vitest";

import {
  CALENDAR_KIND_LABELS,
  type CalendarInput,
  type CalendarInvoice,
  collectEvents,
  eventsBetween,
  groupByDay,
  monthGrid,
  sameMonth,
  shiftMonth,
  startOfMonth,
  summarize,
  weekGrid,
} from "./calendar";

const TODAY = "2026-04-20";

function entree(overrides: Partial<CalendarInput> = {}): CalendarInput {
  return {
    today: TODAY,
    invoices: [],
    milestones: [],
    sessions: [],
    installments: [],
    quoteValidityDays: 30,
    ...overrides,
  };
}

function facture(overrides: Partial<CalendarInvoice> = {}): CalendarInvoice {
  return {
    id: "f-1",
    number: "FAC-2026-003",
    kind: "invoice",
    status: "pending",
    clientName: "Akanda Group",
    dueDate: "2026-04-30",
    balance: 70800,
    formattedBalance: "70 800 FCFA",
    ...overrides,
  };
}

describe("factures", () => {
  it("place l'échéance et dit ce qui est en jeu", () => {
    const [evenement] = collectEvents(entree({ invoices: [facture()] }));
    expect(evenement?.date).toBe("2026-04-30");
    expect(evenement?.kind).toBe("invoiceDue");
    expect(evenement?.tone).toBe("due");
    expect(evenement?.detail).toContain("70 800 FCFA");
    expect(evenement?.amount).toBe(70800);
  });

  it("marque en retard une échéance passée", () => {
    const [evenement] = collectEvents(
      entree({ invoices: [facture({ dueDate: "2026-04-10" })] }),
    );
    expect(evenement?.tone).toBe("late");
  });

  it("ne considère pas le jour même comme un retard", () => {
    const [evenement] = collectEvents(
      entree({ invoices: [facture({ dueDate: TODAY })] }),
    );
    expect(evenement?.tone).toBe("due");
  });

  it("retire du calendrier une facture réglée", () => {
    // La laisser ferait chercher une action qui n'existe plus.
    expect(
      collectEvents(entree({ invoices: [facture({ status: "paid" })] })),
    ).toEqual([]);
    expect(
      collectEvents(entree({ invoices: [facture({ balance: 0 })] })),
    ).toEqual([]);
  });

  it("ignore les brouillons et les pièces annulées", () => {
    for (const statut of ["draft", "cancelled"] as const) {
      expect(
        collectEvents(entree({ invoices: [facture({ status: statut })] })),
      ).toEqual([]);
    }
  });

  it("distingue l'expiration d'un devis d'une créance", () => {
    const [evenement] = collectEvents(
      entree({
        invoices: [facture({ kind: "quote", number: "DEV-2026-004" })],
      }),
    );
    expect(evenement?.kind).toBe("quoteExpiry");
    expect(evenement?.title).toContain("expire");
  });

  it("ignore une échéance absente", () => {
    expect(
      collectEvents(entree({ invoices: [facture({ dueDate: "" })] })),
    ).toEqual([]);
  });
});

describe("jalons", () => {
  const jalon = {
    projectId: "p-1",
    projectName: "E-commerce Business",
    milestoneId: "j-4",
    label: "Recette client",
    dueDate: "2026-04-25",
  };

  it("place un jalon à venir à sa date prévue", () => {
    const [evenement] = collectEvents(entree({ milestones: [jalon] }));
    expect(evenement?.date).toBe("2026-04-25");
    expect(evenement?.tone).toBe("due");
    expect(evenement?.detail).toBe("E-commerce Business");
  });

  it("range un jalon livré à sa date de livraison", () => {
    // C'est le jour où il s'est passé quelque chose, pas la date prévue.
    const [evenement] = collectEvents(
      entree({
        milestones: [{ ...jalon, dueDate: "2026-04-10", doneAt: "2026-04-14" }],
      }),
    );
    expect(evenement?.date).toBe("2026-04-14");
    expect(evenement?.tone).toBe("done");
  });

  it("marque en retard un jalon dépassé et non livré", () => {
    const [evenement] = collectEvents(
      entree({ milestones: [{ ...jalon, dueDate: "2026-04-01" }] }),
    );
    expect(evenement?.tone).toBe("late");
  });
});

describe("sessions", () => {
  const session = {
    id: "s-1",
    title: "React.js",
    startDate: "2026-05-11",
    endDate: "2026-05-29",
    cancelled: false,
    taken: 4,
    capacity: 10,
  };

  it("pose un repère au début et à la fin", () => {
    const evenements = collectEvents(entree({ sessions: [session] }));
    expect(evenements.map((e) => e.kind)).toEqual(["sessionStart", "sessionEnd"]);
    expect(evenements[0]?.detail).toContain("4 inscrit(s) sur 10");
  });

  it("n'en pose qu'un pour une session d'un seul jour", () => {
    const evenements = collectEvents(
      entree({
        sessions: [{ ...session, startDate: "2026-06-13", endDate: "2026-06-13" }],
      }),
    );
    expect(evenements).toHaveLength(1);
  });

  it("retire une session annulée", () => {
    expect(
      collectEvents(entree({ sessions: [{ ...session, cancelled: true }] })),
    ).toEqual([]);
  });
});

describe("échéances de formation", () => {
  const echeance = {
    enrollmentId: "in-1",
    installmentId: "ech-3",
    learnerName: "Yannick Moussavou",
    sessionTitle: "Bootcamp FullStack MERN",
    dueDate: "2026-04-10",
    amount: 48000,
    formattedAmount: "48 000 FCFA",
    paid: false,
  };

  it("signale une échéance dépassée", () => {
    const [evenement] = collectEvents(entree({ installments: [echeance] }));
    expect(evenement?.tone).toBe("late");
    expect(evenement?.amount).toBe(48000);
  });

  it("garde une échéance réglée comme repère, sans montant en jeu", () => {
    const [evenement] = collectEvents(
      entree({ installments: [{ ...echeance, paid: true }] }),
    );
    expect(evenement?.tone).toBe("done");
    expect(evenement?.amount).toBe(0);
  });
});

describe("tri et regroupement", () => {
  it("classe par date, puis par urgence", () => {
    const evenements = collectEvents(
      entree({
        invoices: [
          facture({ id: "a", dueDate: "2026-04-25" }),
          facture({ id: "b", number: "FAC-2026-001", dueDate: "2026-04-10" }),
        ],
        milestones: [
          {
            projectId: "p",
            projectName: "P",
            milestoneId: "m",
            label: "Jalon livré",
            dueDate: "2026-04-10",
            doneAt: "2026-04-10",
          },
        ],
      }),
    );
    // Même jour : la facture en retard passe avant le jalon livré.
    expect(evenements[0]?.date).toBe("2026-04-10");
    expect(evenements[0]?.tone).toBe("late");
    expect(evenements[1]?.tone).toBe("done");
  });

  it("rend un identifiant stable d'un calcul à l'autre", () => {
    const parametres = entree({ invoices: [facture()] });
    expect(collectEvents(parametres).map((e) => e.id)).toEqual(
      collectEvents(parametres).map((e) => e.id),
    );
  });

  it("regroupe par jour en totalisant les montants", () => {
    const jours = groupByDay(
      collectEvents(
        entree({
          invoices: [
            facture({ id: "a", dueDate: "2026-04-30", balance: 70800 }),
            facture({
              id: "b",
              number: "FAC-2026-005",
              dueDate: "2026-04-30",
              balance: 100000,
            }),
          ],
        }),
      ),
    );
    expect(jours).toHaveLength(1);
    expect(jours[0]?.amount).toBe(170800);
    expect(jours[0]?.events).toHaveLength(2);
    expect(jours[0]?.hasLate).toBe(false);
  });

  it("omet les jours sans événement", () => {
    expect(groupByDay([])).toEqual([]);
  });

  it("filtre sur une période, bornes incluses", () => {
    const evenements = collectEvents(
      entree({
        invoices: [
          facture({ id: "a", dueDate: "2026-04-30" }),
          facture({ id: "b", number: "FAC-1", dueDate: "2026-05-31" }),
        ],
      }),
    );
    expect(
      eventsBetween(evenements, "2026-04-01", "2026-04-30").map((e) => e.id),
    ).toEqual(["invoice:a"]);
  });

  it("résume sans compter ce qui est déjà livré", () => {
    const resume = summarize(
      collectEvents(
        entree({
          invoices: [facture({ dueDate: "2026-04-10", balance: 70800 })],
          installments: [
            {
              enrollmentId: "i",
              installmentId: "e",
              learnerName: "A",
              sessionTitle: "S",
              dueDate: "2026-04-01",
              amount: 48000,
              formattedAmount: "48 000",
              paid: true,
            },
          ],
        }),
      ),
    );
    expect(resume.total).toBe(2);
    expect(resume.late).toBe(1);
    expect(resume.amountAtStake).toBe(70800);
  });

  it("nomme chaque nature d'événement", () => {
    for (const libelle of Object.values(CALENDAR_KIND_LABELS)) {
      expect(libelle.length).toBeGreaterThan(5);
    }
  });
});

describe("grilles", () => {
  it("borne le mois", () => {
    expect(startOfMonth("2026-04-20")).toBe("2026-04-01");
  });

  it("décale les mois, y compris par-dessus l'année", () => {
    expect(shiftMonth("2026-04-01", 1)).toBe("2026-05-01");
    expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
    expect(shiftMonth("2026-04-20", -4)).toBe("2025-12-01");
  });

  it("rend six semaines complètes, lundi en tête", () => {
    const grille = monthGrid("2026-04-01");
    expect(grille).toHaveLength(42);
    // Le 1er avril 2026 est un mercredi : la grille démarre le lundi 30 mars.
    expect(grille[0]).toBe("2026-03-30");
    expect(grille[41]).toBe("2026-05-10");
  });

  it("démarre bien au lundi quand le mois commence un dimanche", () => {
    // Le 1er février 2026 est un dimanche : la grille démarre le 26 janvier.
    expect(monthGrid("2026-02-01")[0]).toBe("2026-01-26");
  });

  it("démarre au jour même quand le mois commence un lundi", () => {
    // Le 1er juin 2026 est un lundi.
    expect(monthGrid("2026-06-01")[0]).toBe("2026-06-01");
  });

  it("rend sept jours pour une semaine, lundi en tête", () => {
    const semaine = weekGrid("2026-04-23");
    expect(semaine).toHaveLength(7);
    expect(semaine[0]).toBe("2026-04-20");
    expect(semaine[6]).toBe("2026-04-26");
  });

  it("ramène un dimanche à la semaine qui vient de s'écouler", () => {
    // Le 26 avril 2026 est un dimanche : sa semaine commence le lundi 20.
    expect(weekGrid("2026-04-26")[0]).toBe("2026-04-20");
  });

  it("reconnaît deux dates du même mois", () => {
    expect(sameMonth("2026-04-01", "2026-04-30")).toBe(true);
    expect(sameMonth("2026-04-30", "2026-05-01")).toBe(false);
  });

  it("rend une grille vide sur une date illisible plutôt que de planter", () => {
    expect(monthGrid("pas-une-date")).toEqual([]);
    expect(weekGrid("pas-une-date")).toEqual([]);
  });
});
