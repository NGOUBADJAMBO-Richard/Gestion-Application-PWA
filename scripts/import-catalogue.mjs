#!/usr/bin/env node
/**
 * Importe le catalogue CodeWave Academy depuis le site vitrine.
 *
 * Le site et l'application sont deux dépôts distincts : recopier les tarifs à
 * la main garantissait qu'ils divergent, et qu'un module vendu 70 000 F sur le
 * site soit facturé 50 000 F depuis l'application. Ce script transcrit la
 * source unique — `assets/js/data/content-formations.js` — en un module
 * TypeScript **commité**, pour que l'application ne dépende jamais de la
 * présence du site sur la machine.
 *
 * Usage :
 *   npm run import:catalogue -- "C:/chemin/vers/codewave-website-com"
 *   CODEWAVE_SITE=/chemin/vers/le/site npm run import:catalogue
 *
 * Sans argument, quelques emplacements voisins sont tentés. En cas d'échec le
 * script s'arrête en disant quoi faire : il ne réécrit jamais le fichier
 * généré avec des valeurs devinées.
 */

import { createContext, runInContext } from "node:vm";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "..");
const SORTIE = join(RACINE, "src", "domain", "academy", "catalogue.generated.ts");

const CHEMIN_RELATIF = join("assets", "js", "data", "content-formations.js");

/** Emplacements tentés quand aucun chemin n'est fourni. */
const PISTES = [
  process.env.CODEWAVE_SITE,
  process.argv[2],
  resolve(RACINE, "..", "codewave-website-com"),
  resolve(RACINE, "..", "..", "codewave-website-com"),
].filter((piste) => typeof piste === "string" && piste.length > 0);

function trouverSource() {
  for (const piste of PISTES) {
    // Le chemin donné peut désigner la racine du site ou le fichier lui-même.
    const candidats = piste.endsWith(".js") ? [piste] : [join(piste, CHEMIN_RELATIF)];
    for (const candidat of candidats) {
      if (existsSync(candidat)) return candidat;
    }
  }
  return null;
}

const source = trouverSource();
if (source === null) {
  console.error(
    [
      "Catalogue introuvable.",
      "",
      "Indique la racine du site vitrine :",
      '  npm run import:catalogue -- "C:/chemin/vers/codewave-website-com"',
      "",
      "Emplacements tentés :",
      ...PISTES.map((piste) => `  - ${piste}`),
      "",
      "Le fichier généré n'a pas été touché.",
    ].join("\n"),
  );
  process.exit(1);
}

/**
 * Le fichier du site est un script classique, sans `export` : il déclare des
 * constantes au premier niveau. On l'exécute dans un contexte isolé puis on
 * relit ces constantes, plutôt que de l'analyser par expression régulière —
 * une regex se casse au premier retour à la ligne déplacé.
 */
const NOMS_ATTENDUS = ["formationsCatalog", "bootcampMern", "formationGroups"];

let exporte;
try {
  // Les `const` de premier niveau vivent dans la portée lexicale du script et
  // n'apparaissent pas sur l'objet global : on ajoute donc une expression
  // finale qui les rassemble, et c'est sa valeur que `runInContext` renvoie.
  const rassemble = `
;({ ${NOMS_ATTENDUS.join(", ")} });`;
  exporte = runInContext(readFileSync(source, "utf8") + rassemble, createContext({}), {
    filename: source,
  });
} catch (cause) {
  console.error(`Le catalogue n'a pas pu être évalué : ${cause.message}`);
  process.exit(1);
}

const lire = (nom) => {
  const valeur = exporte[nom];
  if (valeur === undefined) {
    console.error(
      `« ${nom} » est absent du catalogue du site. Sa structure a changé : adapte ce script avant de régénérer.`,
    );
    process.exit(1);
  }
  return valeur;
};

const catalogue = lire("formationsCatalog");
const bootcamp = lire("bootcampMern");
const groupes = lire("formationGroups");

/** Une entrée de catalogue réduite à ce dont l'application a besoin. */
function normaliser(entree) {
  const montant = entree.amount;
  return {
    id: String(entree.id),
    code: typeof entree.code === "string" ? entree.code : null,
    group: String(entree.group ?? "mern"),
    title: String(entree.title?.fr ?? entree.id),
    summary: typeof entree.summary?.fr === "string" ? entree.summary.fr : null,
    // Heures absentes sur l'intra-entreprise : la durée y est négociée.
    hours: typeof entree.hours === "number" ? entree.hours : null,
    // Montant nul pour le sur-mesure : le prix se fixe au devis.
    amount: typeof montant === "number" ? montant : null,
    maxParticipants:
      typeof entree.maxParticipants === "number" ? entree.maxParticipants : null,
  };
}

const entrees = catalogue.map(normaliser);
entrees.push({
  id: String(bootcamp.id),
  code: "BOOTCAMP",
  group: "bootcamp",
  title: String(bootcamp.title.fr),
  summary: String(bootcamp.summary.fr),
  // Le bootcamp vaut la somme des heures de ses modules.
  hours: catalogue
    .filter((entree) => bootcamp.modules.includes(entree.id))
    .reduce((total, entree) => total + (entree.hours ?? 0), 0),
  amount: Number(bootcamp.amount),
  maxParticipants: Number(bootcamp.maxLearners),
});

const libellesGroupes = Object.fromEntries([
  ...groupes.map((groupe) => [String(groupe.id), String(groupe.title.fr)]),
  ["bootcamp", "Bootcamp"],
]);

const fichier = `/**
 * Catalogue CodeWave Academy — FICHIER GÉNÉRÉ, NE PAS MODIFIER À LA MAIN.
 *
 * Source : le site vitrine, \`assets/js/data/content-formations.js\`.
 * Régénérer : \`npm run import:catalogue -- "<racine du site>"\`.
 *
 * Il est commité pour que l'application n'exige jamais la présence du site sur
 * la machine. Toute correction de tarif se fait sur le site, puis ici par
 * régénération : une modification directe serait écrasée au prochain import et,
 * entre-temps, ferait diverger le prix affiché du prix vendu.
 *
 * Montants en unité mineure XAF (le franc lui-même). \`null\` signifie « prix
 * fixé au devis », jamais « gratuit ».
 */

export interface CatalogueEntry {
  readonly id: string;
  readonly code: string | null;
  readonly group: string;
  readonly title: string;
  readonly summary: string | null;
  readonly hours: number | null;
  readonly amount: number | null;
  readonly maxParticipants: number | null;
}

export const CATALOGUE_GROUP_LABELS: Readonly<Record<string, string>> =
${JSON.stringify(libellesGroupes, null, 2).replace(/^/gm, "  ").trim()};

export const CATALOGUE: readonly CatalogueEntry[] = ${JSON.stringify(entrees, null, 2)
  .replace(/^/gm, "")
  .trim()};

/** Date de la dernière importation, pour repérer un catalogue oublié. */
export const CATALOGUE_IMPORTED_AT = "${new Date().toISOString().slice(0, 10)}";
`;

writeFileSync(SORTIE, fichier, "utf8");
console.log(
  `Catalogue importé : ${entrees.length} entrées depuis ${source}\n  -> ${SORTIE}`,
);
