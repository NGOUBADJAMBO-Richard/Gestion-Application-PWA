import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Conventions d'interface vérifiées sur le source.
 *
 * Ces règles ne se testent pas au rendu : elles produisent un écran qui
 * s'affiche parfaitement tout en disant la mauvaise chose. Un test de fumée les
 * laisse passer, un relecteur humain aussi. Les vérifier sur le texte du source
 * est la seule manière fiable de les arrêter.
 */

const RACINE = join(process.cwd(), "src");

function fichiersTsx(dossier: string): readonly string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) {
      // Les composants importés tels quels de shadcn ne sont pas notre code :
      // les corriger serait écrasé à la prochaine mise à jour.
      if (entree === "ui" || entree === "figma") continue;
      trouves.push(...fichiersTsx(chemin));
      continue;
    }
    if (entree.endsWith(".tsx") && !entree.endsWith(".test.tsx")) {
      trouves.push(chemin);
    }
  }
  return trouves;
}

const SOURCES = fichiersTsx(RACINE).map((chemin) => ({
  chemin: chemin.slice(RACINE.length + 1).replace(/\\/g, "/"),
  contenu: readFileSync(chemin, "utf8"),
}));

describe("entités HTML", () => {
  it("aucune entité dans une chaîne de caractères", () => {
    // JSX décode `&rsquo;` dans un attribut littéral et dans le texte, jamais
    // dans une expression. Placée dans une chaîne — un libellé calculé, une
    // branche de ternaire — l'entité s'affiche telle quelle à l'écran :
    // « le perdre mettrait l&rsquo;activité en cause ». Le rendu réussit, le
    // texte est faux, et aucun test de rendu ne s'en aperçoit.
    const fautifs: string[] = [];

    for (const { chemin, contenu } of SOURCES) {
      const lignes = contenu.split(/\r?\n/);
      lignes.forEach((ligne, index) => {
        for (const chaine of ligne.match(/"[^"\n]*"/g) ?? []) {
          if (/&(rsquo|lsquo|nbsp|ldquo|rdquo|mdash|ndash|amp);/.test(chaine)) {
            fautifs.push(`${chemin}:${index + 1} ${chaine.trim()}`);
          }
        }
      });
    }

    expect(fautifs).toEqual([]);
  });
});

describe("écrans", () => {
  const ECRANS = SOURCES.filter(({ chemin }) => chemin.startsWith("app/pages/"));

  it("chaque écran porte un titre de niveau 1", () => {
    // Un écran sans `h1` casse la navigation au lecteur d'écran et la
    // hiérarchie du document.
    for (const { chemin, contenu } of ECRANS) {
      if (chemin.endsWith("NotFound.tsx")) continue;
      expect(contenu, `${chemin} n'a pas de <h1>`).toMatch(/<h1[\s>]/);
    }
  });

  it("aucune couleur codée en dur dans les écrans", () => {
    // Les teintes viennent des jetons de la charte. Une couleur écrite à la
    // main ignore le thème sombre et échappe à tout changement de charte.
    const fautifs: string[] = [];

    for (const { chemin, contenu } of SOURCES) {
      // Le logo porte les couleurs de la marque, pas celles de l'interface :
      // ce sont des constantes d'identité, qui ne suivent ni le thème clair ni
      // le thème sombre. C'est la seule exception, et elle est nommée.
      if (chemin.endsWith("BrandLogo.tsx")) continue;

      const lignes = contenu.split(/\r?\n/);
      lignes.forEach((ligne, index) => {
        // Les valeurs arbitraires de Tailwind (`#004aad`) et les couleurs CSS
        // littérales. `var(--…)` et les classes de jeton sont acceptées.
        const trouve = ligne.match(/#[0-9a-fA-F]{6}\b|rgba?\([^)]*\)/);
        if (trouve !== null && !ligne.includes("--")) {
          fautifs.push(`${chemin}:${index + 1} ${trouve[0]}`);
        }
      });
    }

    expect(fautifs).toEqual([]);
  });
});
