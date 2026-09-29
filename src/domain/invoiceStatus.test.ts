import { describe, expect, it } from "vitest";

import { daysOverdue, effectiveStatus, isDueSoon } from "./invoiceStatus";

const AUJOURDHUI = "2026-09-23";

describe("retard déduit de l'échéance", () => {
  it("une facture en attente dont l'échéance est passée devient en retard", () => {
    // Le retard était saisi à la main : une facture échue restait « en
    // attente » jusqu'à ce que quelqu'un pense à la modifier.
    expect(
      effectiveStatus({ status: "pending", dueDate: "2026-09-01" }, AUJOURDHUI),
    ).toBe("overdue");
  });

  it("le jour de l'échéance, la facture n'est pas encore en retard", () => {
    expect(
      effectiveStatus({ status: "pending", dueDate: AUJOURDHUI }, AUJOURDHUI),
    ).toBe("pending");
  });

  it("une échéance à venir reste en attente", () => {
    expect(
      effectiveStatus({ status: "pending", dueDate: "2026-10-15" }, AUJOURDHUI),
    ).toBe("pending");
  });

  it("une facture marquée en retard redevient en attente si l'échéance est repoussée", () => {
    expect(
      effectiveStatus({ status: "overdue", dueDate: "2026-12-01" }, AUJOURDHUI),
    ).toBe("pending");
  });

  it("une facture réglée ne devient jamais en retard", () => {
    expect(
      effectiveStatus({ status: "paid", dueDate: "2020-01-01" }, AUJOURDHUI),
    ).toBe("paid");
  });

  it("un brouillon et une facture annulée sont hors du calcul", () => {
    expect(
      effectiveStatus({ status: "draft", dueDate: "2020-01-01" }, AUJOURDHUI),
    ).toBe("draft");
    expect(
      effectiveStatus({ status: "cancelled", dueDate: "2020-01-01" }, AUJOURDHUI),
    ).toBe("cancelled");
  });

  it("une échéance absente laisse le statut inchangé", () => {
    expect(effectiveStatus({ status: "pending", dueDate: "" }, AUJOURDHUI)).toBe(
      "pending",
    );
  });
});

describe("jours de retard", () => {
  it("compte les jours depuis l'échéance", () => {
    expect(
      daysOverdue({ status: "pending", dueDate: "2026-09-13" }, AUJOURDHUI),
    ).toBe(10);
  });

  it("vaut zéro quand la facture n'est pas en retard", () => {
    expect(
      daysOverdue({ status: "pending", dueDate: "2026-10-01" }, AUJOURDHUI),
    ).toBe(0);
    expect(
      daysOverdue({ status: "paid", dueDate: "2020-01-01" }, AUJOURDHUI),
    ).toBe(0);
  });
});

describe("échéance proche", () => {
  it("signale une échéance dans les sept jours", () => {
    expect(
      isDueSoon({ status: "pending", dueDate: "2026-09-27" }, AUJOURDHUI),
    ).toBe(true);
  });

  it("ne signale pas une échéance lointaine", () => {
    expect(
      isDueSoon({ status: "pending", dueDate: "2026-11-01" }, AUJOURDHUI),
    ).toBe(false);
  });

  it("ne signale pas une facture déjà en retard : elle a son propre avertissement", () => {
    expect(
      isDueSoon({ status: "pending", dueDate: "2026-09-01" }, AUJOURDHUI),
    ).toBe(false);
  });
});
