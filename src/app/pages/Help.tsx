import {
  AlertTriangle,
  Building2,
  Download,
  FileText,
  FolderKanban,
  HardDrive,
  KeyRound,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useLanguage } from "../contexts/LanguageContext";
import { BRAND } from "../../branding";

/**
 * Aide.
 *
 * La version précédente était à moitié en anglais et annonçait des
 * fonctionnalités inexistantes : « synchronisation instantanée sur tous vos
 * appareils » alors que rien ne sort de l'appareil, « chiffrement de niveau
 * entreprise » alors que les données ne sont pas chiffrées, un forum
 * communautaire et des tutoriels vidéo qui n'existent pas.
 *
 * Une aide qui promet ce que le produit ne fait pas est pire qu'une absence
 * d'aide : elle fait prendre des risques. Tout ce qui suit décrit le
 * comportement réel.
 */

const PREMIERS_PAS = [
  {
    icone: Building2,
    titre: "1. Renseigner l’entreprise",
    texte:
      "Paramètres : raison sociale, adresse, identifiants fiscaux et taux de TVA. Sans adresse, l’application refuse d’émettre une facture.",
    lien: "/settings",
    lienTexte: "Ouvrir les paramètres",
  },
  {
    icone: Users,
    titre: "2. Créer les clients",
    texte:
      "Chaque projet, facture et ticket se rattache à un client de ce répertoire. Renommer un client met à jour tous ses documents.",
    lien: "/clients",
    lienTexte: "Ouvrir les clients",
  },
  {
    icone: FolderKanban,
    titre: "3. Ouvrir les projets",
    texte:
      "Budget, échéance et avancement. Le tableau de bord additionne les budgets des projets actifs.",
    lien: "/projects",
    lienTexte: "Ouvrir les projets",
  },
  {
    icone: FileText,
    titre: "4. Facturer",
    texte:
      "Les totaux, la TVA par tranche et le net à payer sont calculés automatiquement. Le PDF se télécharge depuis la liste.",
    lien: "/invoicing",
    lienTexte: "Ouvrir la facturation",
  },
];

const QUESTIONS = [
  {
    question: "Où sont enregistrées mes données ?",
    reponse:
      "Uniquement dans ce navigateur, sur cet appareil. Rien n’est envoyé sur un serveur. La contrepartie est directe : vider les données du site dans les réglages du navigateur, changer d’ordinateur ou réinstaller le système efface tout. Exporte régulièrement une sauvegarde depuis « Mon compte ».",
  },
  {
    question: "Le mot de passe protège-t-il vraiment mes données ?",
    reponse:
      "Il protège contre l’accès occasionnel : un poste laissé ouvert, un bureau partagé. Il ne chiffre pas les données, qui restent lisibles pour quelqu’un qui a la main sur la machine déverrouillée. Ce choix est délibéré : chiffrer voudrait dire qu’un mot de passe oublié détruit définitivement la comptabilité.",
  },
  {
    question: "J’ai oublié mon mot de passe.",
    reponse:
      "Utilise le code de récupération affiché lors de la première protection de l’appareil, via « Mot de passe oublié ? » sur l’écran de connexion. Sans ce code ni le mot de passe, il faudra repartir d’une sauvegarde exportée.",
  },
  {
    question: "Puis-je modifier une facture déjà émise ?",
    reponse:
      "Non, et c’est volontaire. Une facture remise à un client ne se corrige pas : on émet un avoir qui l’annule, puis une nouvelle facture. Supprimer une facture émise laisserait un trou dans la séquence de numérotation, ce que la comptabilité n’admet pas.",
  },
  {
    question: "Le taux de TVA de 18 % est-il le bon ?",
    reponse:
      "C’est le taux gabonais usuel, mais il n’a pas été vérifié auprès d’une source fiscale officielle. Il est modifiable dans Paramètres, tout comme les mentions légales. Fais confirmer l’ensemble par un comptable avant tout usage réel.",
  },
  {
    question: "L’application fonctionne-t-elle hors ligne ?",
    reponse:
      "Pas encore. Les données sont bien locales, mais l’installation hors connexion n’est pas terminée. Garde l’onglet ouvert ou relance l’application depuis le serveur local.",
  },
  {
    question: "Comment changer de thème ou de langue ?",
    reponse:
      "Les deux boutons se trouvent en haut à droite : le globe pour la langue, le soleil ou la lune pour le thème. Le choix est conservé sur cet appareil.",
  },
];

export function Help() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <header className="wave-surface -mx-4 px-4 py-8 lg:-mx-6 lg:px-6">
        <p className="section-label">Prise en main</p>
        <h1 className="mt-2">{t("nav.help")}</h1>
        <p className="mt-1 text-muted-foreground">
          Ce que fait {BRAND.name}, et ce qu’il ne fait pas.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PREMIERS_PAS.map((etape) => (
          <Card key={etape.titre} className="flex h-full flex-col">
            <CardHeader className="pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <etape.icone className="h-5 w-5 text-primary-ink" aria-hidden="true" />
              </span>
              <CardTitle className="mt-3 text-base">{etape.titre}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              <p className="text-sm text-muted-foreground">{etape.texte}</p>
              <Link
                to={etape.lien}
                className="text-sm text-primary-ink underline-offset-4 hover:underline"
              >
                {etape.lienTexte}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
            À savoir avant de commencer
          </CardTitle>
          <CardDescription>
            Trois points qui évitent une mauvaise surprise.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex gap-3">
            <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm">
              <strong className="font-display">Tout vit sur cet appareil.</strong>{" "}
              Aucune sauvegarde automatique ailleurs.{" "}
              <Link to="/account" className="text-primary-ink underline-offset-4 hover:underline">
                Exporte une sauvegarde
              </Link>{" "}
              régulièrement.
            </p>
          </div>

          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm">
              <strong className="font-display">Les données ne sont pas chiffrées.</strong>{" "}
              Le mot de passe empêche l’accès occasionnel, pas l’inspection par
              quelqu’un qui a la machine en main.
            </p>
          </div>

          <div className="flex gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm">
              <strong className="font-display">Garde ton code de récupération.</strong>{" "}
              Il n’est affiché qu’une fois et c’est la seule issue en cas d’oubli
              du mot de passe.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions fréquentes</CardTitle>
          <CardDescription>Réponses conformes au comportement réel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {QUESTIONS.map((entree, index) => (
              <AccordionItem key={entree.question} value={`q-${index}`}>
                <AccordionTrigger className="text-left">
                  {entree.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {entree.reponse}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" aria-hidden="true" />
            Besoin d’aide ?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            {BRAND.company} &middot;{" "}
            <a
              href={`mailto:${BRAND.contact.email}`}
              className="text-primary-ink underline-offset-4 hover:underline"
            >
              {BRAND.contact.email}
            </a>{" "}
            &middot; {BRAND.contact.phone}
          </p>
          <p className="mt-1">
            <a
              href={BRAND.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-ink underline-offset-4 hover:underline"
            >
              Site de l’agence
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
