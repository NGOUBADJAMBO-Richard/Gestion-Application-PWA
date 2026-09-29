import { describe, expect, it } from "vitest";

import {
  BACKUP_FORMAT,
  BackupError,
  backupFileName,
  computeChecksum,
  createBackup,
  parseBackup,
  previewBackup,
  serializeBackup,
} from "./backup";

const collections = {
  clients: [
    { id: "c1", name: "TechCorp" },
    { id: "c2", name: "Innovate" },
  ],
  invoices: [{ id: "f1", number: "FAC-2026-001", amount: 450000 }],
};

describe("empreinte", () => {
  it("est stable pour un même contenu", async () => {
    expect(await computeChecksum(collections)).toBe(await computeChecksum(collections));
  });

  it("ne dépend pas de l'ordre des clés", async () => {
    const a = await computeChecksum({ clients: [{ id: "c1", name: "X" }] });
    const b = await computeChecksum({ clients: [{ name: "X", id: "c1" }] });
    expect(a).toBe(b);
  });

  it("change dès qu'une donnée change", async () => {
    const avant = await computeChecksum(collections);
    const apres = await computeChecksum({
      ...collections,
      invoices: [{ id: "f1", number: "FAC-2026-001", amount: 450001 }],
    });
    expect(apres).not.toBe(avant);
  });

  it("fait 64 caractères hexadécimaux", async () => {
    expect(await computeChecksum(collections)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("cycle export → import", () => {
  it("restitue exactement les données exportées", async () => {
    const enveloppe = await createBackup(collections, "2.0.0");
    const relu = await parseBackup(serializeBackup(enveloppe));

    expect(relu.collections).toEqual(collections);
    expect(relu.format).toBe(BACKUP_FORMAT);
  });

  it("survit à une purge complète : export, vidage, réimport", async () => {
    const enveloppe = await createBackup(collections, "2.0.0");
    const fichier = serializeBackup(enveloppe);

    // Le poste est réinstallé, il ne reste rien.
    const apresPurge: Record<string, readonly unknown[]> = {};

    const restaure = await parseBackup(fichier);
    const apercu = previewBackup(restaure, apresPurge);

    expect(restaure.collections).toEqual(collections);
    expect(apercu.hasLosses).toBe(false);
    expect(apercu.diffs.find((d) => d.collection === "clients")?.added).toBe(2);
  });

  it("produit un nom de fichier horodaté et triable", () => {
    const nom = backupFileName(new Date("2026-09-23T14:05:09Z"));
    expect(nom).toBe("codewave-studio-sauvegarde-2026-09-23-14-05-09.json");
  });
});

describe("refus d'un fichier douteux", () => {
  it("refuse ce qui n'est pas du JSON", async () => {
    await expect(parseBackup("pas du json")).rejects.toThrow(BackupError);
    await expect(parseBackup("pas du json")).rejects.toThrow(/lisible/i);
  });

  it("refuse un JSON qui n'est pas une sauvegarde", async () => {
    await expect(parseBackup(JSON.stringify({ hello: "world" }))).rejects.toThrow(
      /pas une sauvegarde/i,
    );
  });

  it("refuse une sauvegarde d'un format plus récent", async () => {
    const enveloppe = await createBackup(collections, "2.0.0");
    const futur = { ...enveloppe, formatVersion: 99 };

    await expect(parseBackup(JSON.stringify(futur))).rejects.toThrow(/mets l/i);
  });

  it("détecte un contenu modifié après export", async () => {
    const enveloppe = await createBackup(collections, "2.0.0");
    // Quelqu'un ouvre le fichier et change un montant à la main.
    const altere = {
      ...enveloppe,
      collections: {
        ...enveloppe.collections,
        invoices: [{ id: "f1", number: "FAC-2026-001", amount: 9999999 }],
      },
    };

    await expect(parseBackup(JSON.stringify(altere))).rejects.toThrow(
      /empreinte|modifié|endommagé/i,
    );
  });

  it("le message d'alerte dit ce qu'on risque", async () => {
    const enveloppe = await createBackup(collections, "2.0.0");
    const altere = { ...enveloppe, collections: { clients: [] } };

    await expect(parseBackup(JSON.stringify(altere))).rejects.toThrow(/écraser/i);
  });
});

describe("aperçu avant import", () => {
  it("annonce ce qui sera écrasé, ajouté et perdu", async () => {
    const enveloppe = await createBackup(
      {
        clients: [
          { id: "c1", name: "TechCorp (sauvegarde)" },
          { id: "c3", name: "Nouveau" },
        ],
      },
      "2.0.0",
    );

    const apercu = previewBackup(enveloppe, {
      clients: [
        { id: "c1", name: "TechCorp (local)" },
        { id: "c2", name: "Present seulement en local" },
      ],
    });

    const clients = apercu.diffs.find((d) => d.collection === "clients");
    expect(clients?.overwritten).toBe(1); // c1
    expect(clients?.added).toBe(1); // c3
    expect(clients?.lost).toBe(1); // c2
    expect(apercu.hasLosses).toBe(true);
  });

  it("signale une collection absente de la sauvegarde comme entièrement perdue", async () => {
    const enveloppe = await createBackup({ clients: [] }, "2.0.0");

    const apercu = previewBackup(enveloppe, {
      clients: [],
      invoices: [{ id: "f1" }],
    });

    expect(apercu.diffs.find((d) => d.collection === "invoices")?.lost).toBe(1);
    expect(apercu.hasLosses).toBe(true);
  });

  it("ne signale aucune perte quand la sauvegarde couvre tout le local", async () => {
    const enveloppe = await createBackup(collections, "2.0.0");
    const apercu = previewBackup(enveloppe, collections);

    expect(apercu.hasLosses).toBe(false);
    expect(apercu.diffs.find((d) => d.collection === "clients")?.overwritten).toBe(2);
  });

  it("trie les collections, pour un aperçu stable d'un import à l'autre", async () => {
    const enveloppe = await createBackup(
      { invoices: [], clients: [], projects: [] },
      "2.0.0",
    );
    const apercu = previewBackup(enveloppe, {});

    expect(apercu.diffs.map((d) => d.collection)).toEqual([
      "clients",
      "invoices",
      "projects",
    ]);
  });
});
