import { useState } from "react";
import { AlertTriangle, Eraser } from "lucide-react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { clearActivity } from "../data/activityLog";
import { ALL_REPOSITORIES } from "../data/repositories";
import { resetNotificationJournal } from "../data/notificationJournal";
import { useCompanyProfile } from "../hooks/useCompanyProfile";

/**
 * Remise à zéro des données.
 *
 * Retirer les jeux d'essai du code ne vide pas un navigateur qui les a déjà
 * enregistrés : ils ont été écrits à la première ouverture et y restent. Sans
 * ce bouton, la seule issue serait d'effacer les données du site depuis les
 * réglages du navigateur — ce qui emporterait aussi le mot de passe et le code
 * de récupération.
 *
 * ## Deux garde-fous, et pas un de plus
 *
 * La confirmation demande de **saisir le nom de l'entreprise**. Une case à
 * cocher se coche sans lire ; recopier un nom oblige à regarder ce qu'on fait.
 * Au-delà, empiler les confirmations n'ajoute rien : on les traverse sans les
 * lire, et la protection réelle reste la sauvegarde.
 *
 * Le profil d'entreprise, le mot de passe et le code de récupération ne sont
 * **pas** effacés : ils ne sont pas des données de travail, et les perdre
 * fermerait l'accès à l'application.
 */
export function ResetPanel() {
  const { profile } = useCompanyProfile();
  const [saisie, setSaisie] = useState("");
  const [occupe, setOccupe] = useState(false);

  const attendu = profile.name.trim();
  const confirme = saisie.trim() === attendu && attendu.length > 0;

  const purger = async () => {
    if (!confirme) return;
    setOccupe(true);
    try {
      // La corbeille est vidée aussi : une remise à zéro qui laisserait les
      // éléments supprimés ne serait pas une remise à zéro.
      for (const depot of Object.values(ALL_REPOSITORIES)) {
        await depot.bulkSet([]);
        for (const supprime of await depot.listDeleted()) {
          await depot.purge(supprime.id);
        }
      }
      clearActivity();
      resetNotificationJournal();

      toast.success("Données effacées.", {
        description:
          "L'application est repartie de zéro. Le profil d'entreprise et l'accès sont conservés.",
      });
      setSaisie("");
    } catch (cause) {
      toast.error("La remise à zéro a échoué.", {
        description:
          cause instanceof Error
            ? cause.message
            : "Recharge la page, puis réessaie.",
      });
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eraser className="h-5 w-5 text-destructive" aria-hidden="true" />
          Repartir de zéro
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="flex items-start gap-2 border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <span>
            Efface <strong>définitivement</strong> clients, projets, documents
            commerciaux, temps, dépenses, formations et journal — corbeille
            comprise. Il n&rsquo;y a pas de retour en arrière : exporte une
            sauvegarde avant, si tu veux pouvoir revenir dessus.
          </span>
        </p>

        <p className="text-sm text-muted-foreground">
          Le profil d&rsquo;entreprise, le mot de passe et le code de
          récupération sont conservés : ce ne sont pas des données de travail, et
          les perdre fermerait l&rsquo;accès à l&rsquo;application.
        </p>

        <div className="space-y-2">
          <Label htmlFor="confirmation-purge">
            Pour confirmer, saisis le nom de l&rsquo;entreprise :{" "}
            <span className="font-mono">{attendu}</span>
          </Label>
          <Input
            id="confirmation-purge"
            value={saisie}
            onChange={(event) => setSaisie(event.target.value)}
            placeholder={attendu}
            autoComplete="off"
          />
        </div>

        <Button
          variant="destructive"
          disabled={!confirme || occupe}
          onClick={() => void purger()}
          className="gap-2"
        >
          <Eraser className="h-4 w-4" />
          {occupe ? "Effacement…" : "Effacer toutes les données"}
        </Button>
      </CardContent>
    </Card>
  );
}
