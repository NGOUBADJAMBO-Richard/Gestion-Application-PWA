import { describe, expect, it } from "vitest";

import {
  PBKDF2_ITERATIONS,
  WeakPasswordError,
  checkPasswordStrength,
  createCredential,
  generateRecoveryCode,
  normalizeRecoveryCode,
  resetPassword,
  verifyPassword,
  verifyRecoveryCode,
} from "./credential";

/** Coût abaissé : les tests vérifient la logique, pas la lenteur de PBKDF2. */
const RAPIDE = 1000;

describe("coût de dérivation", () => {
  it("dépasse la recommandation OWASP de 600 000 itérations", () => {
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });
});

describe("création et vérification", () => {
  it("accepte le bon mot de passe", async () => {
    const { credential } = await createCredential("phrase de passe", RAPIDE);
    expect(await verifyPassword("phrase de passe", credential)).toBe(true);
  });

  it("refuse un mot de passe faux", async () => {
    const { credential } = await createCredential("phrase de passe", RAPIDE);
    expect(await verifyPassword("phrase de passé", credential)).toBe(false);
    expect(await verifyPassword("", credential)).toBe(false);
    expect(await verifyPassword("PHRASE DE PASSE", credential)).toBe(false);
  });

  it("refuse le mot de passe vide, qui ouvrait tout auparavant", async () => {
    // L'implémentation précédente ignorait le mot de passe : n'importe quelle
    // saisie, y compris vide, ouvrait la session en administrateur.
    const { credential } = await createCredential("phrase de passe", RAPIDE);
    expect(await verifyPassword("", credential)).toBe(false);
    expect(await verifyPassword("n importe quoi", credential)).toBe(false);
  });

  it("ne stocke jamais le mot de passe", async () => {
    const { credential } = await createCredential("mot-de-passe-secret", RAPIDE);
    const serialise = JSON.stringify(credential);
    expect(serialise).not.toContain("mot-de-passe-secret");
  });

  it("utilise un sel différent à chaque création", async () => {
    const a = await createCredential("phrase de passe", RAPIDE);
    const b = await createCredential("phrase de passe", RAPIDE);
    expect(a.credential.salt).not.toBe(b.credential.salt);
    // Même mot de passe, empreintes différentes : deux postes compromis
    // séparément ne se recoupent pas.
    expect(a.credential.hash).not.toBe(b.credential.hash);
  });

  it("enregistre l'algorithme et le coût, pour pouvoir durcir plus tard", async () => {
    const { credential } = await createCredential("phrase de passe", RAPIDE);
    expect(credential.algorithm).toBe("PBKDF2-SHA256");
    expect(credential.version).toBe(1);
    expect(credential.iterations).toBe(RAPIDE);
  });
});

describe("exigences sur le mot de passe", () => {
  it("refuse un mot de passe trop court", () => {
    expect(() => checkPasswordStrength("court")).toThrow(WeakPasswordError);
    expect(() => checkPasswordStrength("123456789")).toThrow(/10 caractères/);
  });

  it("refuse une suite de chiffres", () => {
    expect(() => checkPasswordStrength("12345678901234")).toThrow(/chiffres/);
  });

  it("accepte une phrase simple à retenir", () => {
    expect(() => checkPasswordStrength("le chat dort sur le toit")).not.toThrow();
  });

  it("empêche de créer un accès avec un mot de passe faible", async () => {
    await expect(createCredential("1234", RAPIDE)).rejects.toThrow(WeakPasswordError);
  });
});

describe("code de récupération", () => {
  it("fait quatre groupes de cinq caractères", () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{5}$/);
  });

  it("n'emploie aucun caractère ambigu", () => {
    for (let essai = 0; essai < 200; essai += 1) {
      expect(generateRecoveryCode()).not.toMatch(/[ILOU]/);
    }
  });

  it("ne se répète pas", () => {
    const vus = new Set<string>();
    for (let essai = 0; essai < 500; essai += 1) vus.add(generateRecoveryCode());
    expect(vus.size).toBe(500);
  });

  it("tolère une recopie approximative", () => {
    expect(normalizeRecoveryCode("abc de-FGHIJ")).toBe("ABCDEFGHIJ");
    expect(normalizeRecoveryCode("A1B2C-D3E4F")).toBe("A1B2CD3E4F");
  });

  it("ouvre la récupération, quelle que soit la casse et la ponctuation", async () => {
    const { credential, recoveryCode } = await createCredential("phrase de passe", RAPIDE);

    expect(await verifyRecoveryCode(recoveryCode, credential)).toBe(true);
    expect(await verifyRecoveryCode(recoveryCode.toLowerCase(), credential)).toBe(true);
    expect(await verifyRecoveryCode(recoveryCode.replace(/-/g, " "), credential)).toBe(true);
  });

  it("refuse un code faux", async () => {
    const { credential } = await createCredential("phrase de passe", RAPIDE);
    expect(await verifyRecoveryCode("AAAAA-BBBBB-CCCCC-DDDDD", credential)).toBe(false);
    expect(await verifyRecoveryCode("", credential)).toBe(false);
  });

  it("n'est pas stocké en clair", async () => {
    const { credential, recoveryCode } = await createCredential("phrase de passe", RAPIDE);
    expect(JSON.stringify(credential)).not.toContain(normalizeRecoveryCode(recoveryCode));
  });

  it("le mot de passe n'ouvre pas la récupération, et inversement", async () => {
    const { credential, recoveryCode } = await createCredential("phrase de passe", RAPIDE);

    expect(await verifyRecoveryCode("phrase de passe", credential)).toBe(false);
    expect(await verifyPassword(recoveryCode, credential)).toBe(false);
  });
});

describe("réinitialisation", () => {
  it("le nouveau mot de passe ouvre, l'ancien non", async () => {
    const initial = await createCredential("ancienne phrase", RAPIDE);
    const apres = await resetPassword("nouvelle phrase secrete", RAPIDE);

    expect(await verifyPassword("nouvelle phrase secrete", apres.credential)).toBe(true);
    expect(await verifyPassword("ancienne phrase", apres.credential)).toBe(false);
    expect(initial.credential.hash).not.toBe(apres.credential.hash);
  });

  it("émet un nouveau code de récupération : l'ancien a servi", async () => {
    const initial = await createCredential("ancienne phrase", RAPIDE);
    const apres = await resetPassword("nouvelle phrase secrete", RAPIDE);

    expect(apres.recoveryCode).not.toBe(initial.recoveryCode);
    expect(await verifyRecoveryCode(initial.recoveryCode, apres.credential)).toBe(false);
    expect(await verifyRecoveryCode(apres.recoveryCode, apres.credential)).toBe(true);
  });

  it("refuse un nouveau mot de passe faible", async () => {
    await expect(resetPassword("court", RAPIDE)).rejects.toThrow(WeakPasswordError);
  });
});
