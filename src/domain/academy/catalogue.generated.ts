/**
 * Catalogue CodeWave Academy — FICHIER GÉNÉRÉ, NE PAS MODIFIER À LA MAIN.
 *
 * Source : le site vitrine, `assets/js/data/content-formations.js`.
 * Régénérer : `npm run import:catalogue -- "<racine du site>"`.
 *
 * Il est commité pour que l'application n'exige jamais la présence du site sur
 * la machine. Toute correction de tarif se fait sur le site, puis ici par
 * régénération : une modification directe serait écrasée au prochain import et,
 * entre-temps, ferait diverger le prix affiché du prix vendu.
 *
 * Montants en unité mineure XAF (le franc lui-même). `null` signifie « prix
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
{
    "mern": "Modules du bootcamp, à l'unité",
    "parcours": "Parcours courts",
    "ateliers": "Ateliers métiers",
    "intra": "Formation en entreprise",
    "bootcamp": "Bootcamp"
  };

export const CATALOGUE: readonly CatalogueEntry[] = [
  {
    "id": "m1",
    "code": "M1",
    "group": "mern",
    "title": "Fondamentaux du Web (HTML, CSS, Git)",
    "summary": null,
    "hours": 30,
    "amount": 40000,
    "maxParticipants": null
  },
  {
    "id": "m2",
    "code": "M2",
    "group": "mern",
    "title": "JavaScript moderne (ES6+)",
    "summary": null,
    "hours": 36,
    "amount": 50000,
    "maxParticipants": null
  },
  {
    "id": "m3",
    "code": "M3",
    "group": "mern",
    "title": "React.js",
    "summary": null,
    "hours": 48,
    "amount": 70000,
    "maxParticipants": null
  },
  {
    "id": "m4",
    "code": "M4",
    "group": "mern",
    "title": "Node.js & Express",
    "summary": null,
    "hours": 48,
    "amount": 70000,
    "maxParticipants": null
  },
  {
    "id": "m5",
    "code": "M5",
    "group": "mern",
    "title": "MongoDB & Mongoose",
    "summary": null,
    "hours": 24,
    "amount": 40000,
    "maxParticipants": null
  },
  {
    "id": "m6",
    "code": "M6",
    "group": "mern",
    "title": "Intégration FullStack & déploiement",
    "summary": null,
    "hours": 30,
    "amount": 45000,
    "maxParticipants": null
  },
  {
    "id": "m7",
    "code": "M7",
    "group": "mern",
    "title": "Projet final encadré & soutenance",
    "summary": null,
    "hours": 24,
    "amount": 45000,
    "maxParticipants": null
  },
  {
    "id": "parcours-front",
    "code": null,
    "group": "parcours",
    "title": "Parcours Front-End React",
    "summary": "M1 + M2 + M3 : du premier fichier HTML à une application React.",
    "hours": 114,
    "amount": 140000,
    "maxParticipants": null
  },
  {
    "id": "parcours-back",
    "code": null,
    "group": "parcours",
    "title": "Parcours Back-End Node",
    "summary": "M2 + M4 + M5 : API sécurisées et bases de données.",
    "hours": 108,
    "amount": 140000,
    "maxParticipants": null
  },
  {
    "id": "maitriser-mon-site",
    "code": null,
    "group": "ateliers",
    "title": "Atelier « Maîtriser mon site »",
    "summary": "Vous repartez capable de gérer votre site seul.",
    "hours": 3,
    "amount": 15000,
    "maxParticipants": null
  },
  {
    "id": "emailing-pro",
    "code": null,
    "group": "ateliers",
    "title": "Emailing Pro & automatisation",
    "summary": "Votre première campagne est envoyée pendant l'atelier.",
    "hours": 2,
    "amount": 20000,
    "maxParticipants": null
  },
  {
    "id": "ia-entrepreneurs",
    "code": null,
    "group": "ateliers",
    "title": "IA pour entrepreneurs",
    "summary": "5 cas d'usage appliqués à votre activité.",
    "hours": 6,
    "amount": 25000,
    "maxParticipants": null
  },
  {
    "id": "seo-debutants",
    "code": null,
    "group": "ateliers",
    "title": "SEO pour débutants",
    "summary": "Un plan de mots-clés et 3 pages optimisées.",
    "hours": 6,
    "amount": 25000,
    "maxParticipants": null
  },
  {
    "id": "cybersecurite-tpe",
    "code": null,
    "group": "ateliers",
    "title": "Cybersécurité des TPE / PME",
    "summary": "Un plan de sécurisation pour votre entreprise.",
    "hours": 8,
    "amount": 30000,
    "maxParticipants": null
  },
  {
    "id": "bureautique-pro",
    "code": null,
    "group": "ateliers",
    "title": "Bureautique professionnelle",
    "summary": "Vos modèles Word, Excel et PowerPoint.",
    "hours": 15,
    "amount": 30000,
    "maxParticipants": null
  },
  {
    "id": "wordpress",
    "code": null,
    "group": "ateliers",
    "title": "WordPress : créez votre site",
    "summary": "Un site WordPress en ligne.",
    "hours": 12,
    "amount": 35000,
    "maxParticipants": null
  },
  {
    "id": "community-management-canva",
    "code": null,
    "group": "ateliers",
    "title": "Community management & Canva",
    "summary": "Un calendrier éditorial et 10 visuels.",
    "hours": 12,
    "amount": 35000,
    "maxParticipants": null
  },
  {
    "id": "ecommerce-mobile-money",
    "code": null,
    "group": "ateliers",
    "title": "E-commerce & Mobile Money",
    "summary": "Une boutique avec paiement Airtel Money et Moov Money.",
    "hours": 10,
    "amount": 40000,
    "maxParticipants": null
  },
  {
    "id": "seo-avance-analytics",
    "code": null,
    "group": "ateliers",
    "title": "SEO avancé & Analytics",
    "summary": "Un tableau de bord et un plan d'action.",
    "hours": 12,
    "amount": 45000,
    "maxParticipants": null
  },
  {
    "id": "ui-ux-figma",
    "code": null,
    "group": "ateliers",
    "title": "UI/UX Design avec Figma",
    "summary": "Une maquette complète prête à être développée.",
    "hours": 20,
    "amount": 55000,
    "maxParticipants": null
  },
  {
    "id": "intra-demi-journee",
    "code": null,
    "group": "intra",
    "title": "Atelier sur site — demi-journée",
    "summary": null,
    "hours": null,
    "amount": 90000,
    "maxParticipants": 8
  },
  {
    "id": "intra-journee",
    "code": null,
    "group": "intra",
    "title": "Journée complète sur site",
    "summary": null,
    "hours": null,
    "amount": 160000,
    "maxParticipants": 12
  },
  {
    "id": "intra-sur-mesure",
    "code": null,
    "group": "intra",
    "title": "Parcours sur mesure",
    "summary": null,
    "hours": null,
    "amount": null,
    "maxParticipants": null
  },
  {
    "id": "bootcamp-mern",
    "code": "BOOTCAMP",
    "group": "bootcamp",
    "title": "Bootcamp FullStack MERN",
    "summary": "Devenez développeur web en 5 mois : MongoDB, Express, React et Node.js, avec 7 projets pour votre portfolio. Aucune connaissance en programmation exigée.",
    "hours": 240,
    "amount": 300000,
    "maxParticipants": 12
  }
];

/** Date de la dernière importation, pour repérer un catalogue oublié. */
export const CATALOGUE_IMPORTED_AT = "2026-09-29";
