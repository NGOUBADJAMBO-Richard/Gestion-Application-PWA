import { describe, expect, it } from "vitest";

import {
  type Decision,
  type DocumentStatus,
  canDeleteClient,
  canDeleteDocument,
  canDeleteProject,
  canEditDocument,
  canIssueCreditNote,
  canTransition,
  reasonOf,
} from "./rules";

/** Un refus doit toujours dire quoi faire, pas seulement que c'est interdit. */
function expectRefusExploitable(decision: Decision, motifAttendu: RegExp) {
  expect(decision.allowed).toBe(false);
  if (decision.allowed) return;
  expect(decision.rule.length).toBeGreaterThan(0);
  expect(decision.reason).toMatch(motifAttendu);
}

describe("transitions d'état", () => {
  it("autorise le chemin nominal", () => {
    expect(canTransition("draft", "issued").allowed).toBe(true);
    expect(canTransition("issued", "sent").allowed).toBe(true);
    expect(canTransition("sent", "partiallyPaid").allowed).toBe(true);
    expect(canTransition("partiallyPaid", "paid").allowed).toBe(true);
  });

  it("tolère une transition vers le même état", () => {
    expect(canTransition("paid", "paid").allowed).toBe(true);
  });

  it("interdit de revenir au brouillon depuis un état émis", () => {
    expectRefusExploitable(canTransition("issued", "draft"), /brouillon|modifi/i);
    expectRefusExploitable(canTransition("paid", "draft"), /brouillon|modifi/i);
  });

  it("une facture annulée est définitive", () => {
    const etats: DocumentStatus[] = ["draft", "issued", "sent", "paid"];
    for (const cible of etats) {
      expectRefusExploitable(canTransition("cancelled", cible), /définitive|nouvelle/i);
    }
  });
});

describe("immuabilité du document émis", () => {
  it("un brouillon se modifie et se supprime", () => {
    expect(canEditDocument("draft").allowed).toBe(true);
    expect(canDeleteDocument("draft").allowed).toBe(true);
  });

  it("une facture émise ne se modifie plus, et l'alternative est nommée", () => {
    expectRefusExploitable(canEditDocument("issued"), /avoir/i);
    expectRefusExploitable(canEditDocument("paid"), /avoir/i);
  });

  it("une facture émise ne se supprime pas : ce serait un trou dans la séquence", () => {
    expectRefusExploitable(canDeleteDocument("sent"), /séquence|avoir/i);
  });
});

describe("suppression d'un client", () => {
  it("autorisée quand rien n'est rattaché", () => {
    expect(
      canDeleteClient({ issuedInvoiceIds: [], activeProjectIds: [] }).allowed,
    ).toBe(true);
  });

  it("refusée quand des factures sont émises, avec l'archivage proposé", () => {
    const decision = canDeleteClient({
      issuedInvoiceIds: ["FAC-2026-001", "FAC-2026-002"],
      activeProjectIds: [],
    });
    expectRefusExploitable(decision, /archive/i);
    if (!decision.allowed) {
      expect(decision.blockedBy).toEqual(["FAC-2026-001", "FAC-2026-002"]);
    }
  });

  it("refusée quand des projets sont en cours", () => {
    expectRefusExploitable(
      canDeleteClient({ issuedInvoiceIds: [], activeProjectIds: ["p1"] }),
      /projet/i,
    );
  });

  it("les factures priment sur les projets dans le message", () => {
    const decision = canDeleteClient({
      issuedInvoiceIds: ["FAC-2026-001"],
      activeProjectIds: ["p1"],
    });
    if (!decision.allowed) expect(decision.rule).toBe("client.hasIssuedInvoices");
  });
});

describe("suppression d'un projet", () => {
  it("refusée quand des factures y sont rattachées", () => {
    expectRefusExploitable(
      canDeleteProject({ linkedInvoiceIds: ["FAC-2026-004"] }),
      /rattach|archive/i,
    );
  });

  it("autorisée sinon", () => {
    expect(canDeleteProject({ linkedInvoiceIds: [] }).allowed).toBe(true);
  });
});

describe("émission d'un avoir", () => {
  it("autorisée sur une facture émise", () => {
    expect(canIssueCreditNote({ status: "issued" }).allowed).toBe(true);
    expect(canIssueCreditNote({ status: "paid" }).allowed).toBe(true);
  });

  it("refusée sans facture désignée", () => {
    expectRefusExploitable(canIssueCreditNote(undefined), /désigne|sélectionne/i);
  });

  it("refusée sur un brouillon : il suffit de le supprimer", () => {
    expectRefusExploitable(canIssueCreditNote({ status: "draft" }), /brouillon|supprime/i);
  });

  it("refusée sur une facture déjà annulée : pas de double annulation", () => {
    expectRefusExploitable(
      canIssueCreditNote({ status: "cancelled" }, ["AV-2026-001"]),
      /déjà annulée|deux fois/i,
    );
  });
});

describe("reasonOf", () => {
  it("ne renvoie rien quand c'est autorisé", () => {
    expect(reasonOf(canTransition("draft", "issued"))).toBeUndefined();
  });

  it("renvoie le message quand c'est refusé", () => {
    expect(reasonOf(canEditDocument("paid"))).toMatch(/avoir/i);
  });
});
