import { describe, expect, it } from "vitest";

import {
  REMINDER_LEVELS,
  type Reminder,
  adviseReminder,
  levelSpec,
  mailToUrl,
  reminderMessage,
  reminderSubject,
  toWhatsAppNumber,
  whatsAppUrl,
} from "./reminder";

function relance(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: "r-1",
    invoiceId: "f-1",
    level: "courtesy",
    channel: "whatsapp",
    sentAt: "2026-04-02",
    ...overrides,
  };
}

const contexte = {
  clientName: "Akanda Group",
  documentNumber: "FAC-2026-003",
  formattedBalance: "70 800 FCFA",
  dueDate: "2026-03-28",
  daysOverdue: 12,
  companyName: "M.G.N CodeWave",
};

describe("échelle de relance", () => {
  it("monte dans l'ordre, sans trou de seuil", () => {
    const seuils = REMINDER_LEVELS.map((palier) => palier.fromDaysOverdue);
    expect(seuils).toEqual([...seuils].sort((a, b) => a - b));
    expect(seuils[0]).toBe(1);
  });

  it("décrit ce que chaque palier cherche à obtenir", () => {
    for (const palier of REMINDER_LEVELS) {
      expect(levelSpec(palier.level).intent.length).toBeGreaterThan(20);
    }
  });
});

describe("palier dû", () => {
  it("ne relance pas une facture à jour", () => {
    const avis = adviseReminder(0, []);
    expect(avis.level).toBeNull();
    expect(avis.reason).toMatch(/pas en retard/);
  });

  it("ne relance pas une facture en avance", () => {
    expect(adviseReminder(-5, []).level).toBeNull();
  });

  it("propose le rappel courtois dès le premier jour", () => {
    expect(adviseReminder(1, []).level).toBe("courtesy");
    expect(adviseReminder(7, []).level).toBe("courtesy");
  });

  it("passe à la relance ferme à huit jours", () => {
    expect(adviseReminder(8, []).level).toBe("firm");
    expect(adviseReminder(20, []).level).toBe("firm");
  });

  it("passe à la mise en demeure à trois semaines", () => {
    expect(adviseReminder(21, []).level).toBe("formal");
    expect(adviseReminder(90, []).level).toBe("formal");
  });

  it("retient la dernière relance envoyée, pas la première", () => {
    const avis = adviseReminder(25, [
      relance({ id: "r-1", sentAt: "2026-04-02", level: "courtesy" }),
      relance({ id: "r-2", sentAt: "2026-04-10", level: "firm" }),
    ]);
    expect(avis.last?.id).toBe("r-2");
  });

  it("signale qu'un palier a déjà été envoyé sans l'interdire", () => {
    // Un client injoignable se relance deux fois : on informe, on ne bloque pas.
    const avis = adviseReminder(10, [relance({ level: "firm", sentAt: "2026-04-08" })]);
    expect(avis.level).toBe("firm");
    expect(avis.alreadySent).toBe(true);
    expect(avis.reason).toMatch(/injoignable/);
  });

  it("ne considère pas un palier inférieur comme déjà envoyé", () => {
    const avis = adviseReminder(25, [relance({ level: "courtesy" })]);
    expect(avis.level).toBe("formal");
    expect(avis.alreadySent).toBe(false);
  });

  it("considère un palier supérieur comme couvrant le palier dû", () => {
    // Une mise en demeure envoyée, puis un règlement partiel qui ramène le
    // retard à dix jours : renvoyer une relance ferme serait un recul absurde.
    const avis = adviseReminder(10, [relance({ level: "formal" })]);
    expect(avis.alreadySent).toBe(true);
  });
});

describe("messages", () => {
  it("le rappel courtois suppose l'oubli et ne menace de rien", () => {
    const message = reminderMessage("courtesy", contexte);
    expect(message).toMatch(/oubli/);
    expect(message).not.toMatch(/suspend|recouvrement|demeure/i);
  });

  it("la relance ferme demande une date et propose un échéancier", () => {
    const message = reminderMessage("firm", contexte);
    expect(message).toMatch(/date/);
    expect(message).toMatch(/échéancier/);
  });

  it("la mise en demeure annonce une conséquence concrète", () => {
    // Une mise en demeure sans conséquence n'est qu'une relance de plus.
    const message = reminderMessage("formal", contexte);
    expect(message).toMatch(/suspendues/);
    expect(message).toMatch(/huit jours/);
  });

  it("porte le numéro, le montant et l'échéance en toutes lettres", () => {
    for (const niveau of ["courtesy", "firm", "formal"] as const) {
      const message = reminderMessage(niveau, contexte);
      expect(message).toContain("FAC-2026-003");
      expect(message).toContain("70 800 FCFA");
      expect(message).toContain("28 mars 2026");
      expect(message).toContain("M.G.N CodeWave");
    }
  });

  it("rappelle les moyens de paiement quand ils sont renseignés", () => {
    const message = reminderMessage("courtesy", {
      ...contexte,
      paymentDetails: "Airtel Money 066 19 89 18",
    });
    expect(message).toMatch(/Moyens de paiement/);
    expect(message).toContain("Airtel Money");
  });

  it("n'ajoute pas de section vide quand ils ne le sont pas", () => {
    expect(reminderMessage("courtesy", { ...contexte, paymentDetails: "  " })).not.toMatch(
      /Moyens de paiement/,
    );
  });

  it("donne un objet de courriel distinct par palier", () => {
    const objets = (["courtesy", "firm", "formal"] as const).map((niveau) =>
      reminderSubject(niveau, "FAC-2026-003"),
    );
    expect(new Set(objets).size).toBe(3);
    for (const objet of objets) expect(objet).toContain("FAC-2026-003");
  });
});

describe("numéro WhatsApp", () => {
  it("accepte le format international gabonais", () => {
    expect(toWhatsAppNumber("+241 66 19 89 18")).toBe("24166198918");
  });

  it("préfixe un numéro local du 241", () => {
    expect(toWhatsAppNumber("066 19 89 18")).toBe("24166198918");
    expect(toWhatsAppNumber("66 19 89 18")).toBe("24166198918");
  });

  it("supporte les séparateurs usuels", () => {
    expect(toWhatsAppNumber("06-61-98-91-8")).toBe("24166198918");
    expect(toWhatsAppNumber("(241) 66.19.89.18")).toBe("24166198918");
  });

  it("respecte un indicatif étranger explicite", () => {
    // Préfixer du 241 un numéro français ouvrirait une conversation avec un
    // inconnu, sans rien dire.
    expect(toWhatsAppNumber("+33 6 12 34 56 78")).toBe("33612345678");
    expect(toWhatsAppNumber("0033612345678")).toBe("33612345678");
  });

  it("refuse ce qui n'est pas exploitable plutôt que d'inventer", () => {
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber("   ")).toBeNull();
    expect(toWhatsAppNumber("à venir")).toBeNull();
    expect(toWhatsAppNumber("12 34")).toBeNull();
    expect(toWhatsAppNumber("+241")).toBeNull();
  });
});

describe("liens", () => {
  it("compose un lien wa.me avec le message encodé", () => {
    const lien = whatsAppUrl("+241 66 19 89 18", "Bonjour & merci");
    expect(lien).toBe("https://wa.me/24166198918?text=Bonjour%20%26%20merci");
  });

  it("ne compose pas de lien sur un numéro inexploitable", () => {
    expect(whatsAppUrl("à venir", "Bonjour")).toBeNull();
  });

  it("compose un lien mailto avec objet et corps", () => {
    const lien = mailToUrl("contact@example.ga", "Relance", "Bonjour,\nMerci");
    expect(lien).toContain("mailto:contact%40example.ga");
    expect(lien).toContain("subject=Relance");
    expect(lien).toContain("Bonjour%2C%0AMerci");
  });

  it("ne compose pas de lien sur une adresse invalide", () => {
    expect(mailToUrl("", "o", "c")).toBeNull();
    expect(mailToUrl("pas-une-adresse", "o", "c")).toBeNull();
  });
});
