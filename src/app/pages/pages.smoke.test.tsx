import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithProviders } from "../../test/renderWithProviders";
import { Clients } from "./Clients";
import { Dashboard } from "./Dashboard";
import { Help } from "./Help";
import { Invoicing } from "./Invoicing";
import { NotFound } from "./NotFound";
import { Projects } from "./Projects";
import { Settings } from "./Settings";
import { Support } from "./Support";
import { Time } from "./Time";

/**
 * Tests de fumée : chaque écran doit s'ouvrir sans planter, avec un stockage
 * vide comme avec les données de démonstration. Ils ne jugent pas l'apparence,
 * ils garantissent qu'aucun écran n'est cassé.
 */
describe("ouverture des écrans", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("le tableau de bord affiche son titre", async () => {
    renderWithProviders(<Dashboard />);
    expect(await screen.findByRole("heading", { level: 1, name: /tableau de bord/i })).toBeInTheDocument();
  });

  it("les clients s'affichent", async () => {
    renderWithProviders(<Clients />);
    expect(await screen.findByRole("heading", { level: 1, name: /client/i })).toBeInTheDocument();
  });

  it("les projets s'affichent", async () => {
    renderWithProviders(<Projects />);
    expect(await screen.findByRole("heading", { level: 1, name: /projet/i })).toBeInTheDocument();
  });

  it("le temps et la rentabilité s'affichent", async () => {
    renderWithProviders(<Time />);
    expect(
      await screen.findByRole("heading", { level: 1, name: /temps/i }),
    ).toBeInTheDocument();
    // Les trois onglets doivent exister : sans eux, l'écran n'expose que le
    // temps et la rentabilité reste inaccessible.
    expect(await screen.findByRole("tab", { name: "Temps" })).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: "Dépenses" })).toBeInTheDocument();
    expect(
      await screen.findByRole("tab", { name: "Rentabilité" }),
    ).toBeInTheDocument();
  });

  it("la facturation s'affiche", async () => {
    renderWithProviders(<Invoicing />);
    expect(await screen.findByRole("heading", { level: 1, name: /factur/i })).toBeInTheDocument();
  });

  it("le support s'affiche", async () => {
    renderWithProviders(<Support />);
    expect(await screen.findByRole("heading", { level: 1, name: /support|ticket/i })).toBeInTheDocument();
  });

  it("l'aide s'affiche", async () => {
    renderWithProviders(<Help />);
    expect(await screen.findByRole("heading", { level: 1, name: /aide|help/i })).toBeInTheDocument();
  });

  it("la page introuvable s'affiche", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText(/404/)).toBeInTheDocument();
  });
});

describe("écran Paramètres", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("propose le taux de TVA par défaut", async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByDisplayValue("18")).toBeInTheDocument();
  });

  it("avertit que le taux n'a pas été vérifié auprès d'une source fiscale", () => {
    renderWithProviders(<Settings />);
    expect(screen.getByRole("note")).toHaveTextContent(/comptable/i);
  });

  it("annonce ce qui manque pour émettre une facture", () => {
    renderWithProviders(<Settings />);
    // Le profil par défaut n'a pas d'adresse : on doit le dire avant, pas
    // laisser émettre une facture incomplète qu'il faudrait ensuite annuler.
    expect(screen.getByRole("alert")).toHaveTextContent(/adresse/i);
  });

  it("expose les préfixes de numérotation", () => {
    renderWithProviders(<Settings />);
    expect(screen.getByLabelText(/préfixe des factures/i)).toHaveValue("FAC");
    expect(screen.getByLabelText(/préfixe des avoirs/i)).toHaveValue("AV");
  });
});
