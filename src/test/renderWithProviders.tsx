import type { ReactElement } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { AuthProvider } from "../app/contexts/AuthContext";
import { LanguageProvider } from "../app/contexts/LanguageContext";
import { ThemeProvider } from "../app/contexts/ThemeContext";

/**
 * Monte un écran avec la même pile de contextes que l'application.
 *
 * Sans ce montage réel, un test passerait alors que l'écran plante à
 * l'ouverture faute d'un fournisseur — le genre de panne qui ne se voit qu'à
 * l'exécution, précisément ce qu'on cherche à attraper ici.
 */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>,
  );
}
