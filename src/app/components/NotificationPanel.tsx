import { useEffect, useState } from "react";
import { Bell, BellOff, Info } from "lucide-react";
import { toast } from "sonner";

import {
  type NotificationSupport,
  notificationSupport,
  requestNotificationPermission,
  showNotification,
} from "../../infra/notifications";
import {
  notificationsEnabled,
  setNotificationsEnabled,
  subscribeNotificationSettings,
} from "../data/notificationJournal";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

/**
 * Réglage des notifications.
 *
 * Deux états distincts, qu'il faut séparer sous peine d'un écran incompréhensible :
 * l'autorisation du navigateur — qu'on ne peut que demander, jamais reprendre —
 * et la préférence dans l'application, qui reste modifiable. Un utilisateur qui
 * a refusé au niveau du navigateur doit le lire ici, sinon il bascule
 * l'interrupteur et rien ne se passe.
 */
export function NotificationPanel() {
  const [autorisation, setAutorisation] = useState<NotificationSupport>(
    notificationSupport,
  );
  const [actif, setActif] = useState(notificationsEnabled);
  const [demandeEnCours, setDemandeEnCours] = useState(false);

  useEffect(
    () => subscribeNotificationSettings(() => setActif(notificationsEnabled())),
    [],
  );

  const basculer = async (souhaite: boolean) => {
    if (!souhaite) {
      setNotificationsEnabled(false);
      setActif(false);
      return;
    }

    let etat = autorisation;
    if (etat === "default") {
      setDemandeEnCours(true);
      // La demande doit partir d'un geste : les navigateurs refusent une
      // demande spontanée au chargement, et à juste titre.
      etat = await requestNotificationPermission();
      setAutorisation(etat);
      setDemandeEnCours(false);
    }

    if (etat !== "granted") {
      toast.error("Notifications refusées", {
        description:
          etat === "unsupported"
            ? "Ce navigateur ne sait pas afficher de notifications."
            : "Le navigateur les bloque pour ce site. Autorise-les dans ses réglages, puis reviens ici.",
      });
      return;
    }

    setNotificationsEnabled(true);
    setActif(true);
  };

  const essayer = () => {
    void showNotification({
      title: "CodeWave Studio",
      body: "Les notifications fonctionnent. Tu seras prévenu des impayés et des échéances dépassées.",
      tag: "test",
      href: "/",
    }).then((affichee) => {
      if (!affichee) {
        toast.error("Rien n'a pu être affiché.", {
          description:
            "Vérifie que les notifications du système ne sont pas coupées pour ce navigateur.",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {actif && autorisation === "granted" ? (
            <Bell className="h-5 w-5 text-primary-ink" aria-hidden="true" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
          Notifications
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <Label htmlFor="notifications-actives" className="flex-col items-start gap-1 leading-snug">
            Me prévenir des points critiques
            <span className="block text-xs font-normal text-muted-foreground mt-1">
              Impayés de plus de trois semaines, échéances de formation
              dépassées, projets en perte, sauvegarde manquante.
            </span>
          </Label>
          <Switch
            id="notifications-actives"
            checked={actif && autorisation === "granted"}
            disabled={autorisation === "unsupported" || demandeEnCours}
            onCheckedChange={(coche) => void basculer(coche)}
          />
        </div>

        {autorisation === "denied" && (
          <p className="flex items-start gap-2 border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Le navigateur bloque les notifications pour ce site. L&rsquo;application
            ne peut pas revenir sur ce refus : il faut l&rsquo;autoriser dans les
            réglages du navigateur.
          </p>
        )}

        {autorisation === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            Ce navigateur ne sait pas afficher de notifications. Le centre
            d&rsquo;alertes, dans la barre du haut, reste disponible.
          </p>
        )}

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Les notifications arrivent quand l&rsquo;application est ouverte,
            même en arrière-plan. Il n&rsquo;y a aucun serveur : rien ne peut
            être envoyé lorsqu&rsquo;elle est fermée. Une même alerte n&rsquo;est
            jamais signalée deux fois.
          </span>
        </p>

        {actif && autorisation === "granted" && (
          <Button variant="outline" size="sm" onClick={essayer} className="gap-2">
            <Bell className="h-4 w-4" />
            Envoyer une notification d&rsquo;essai
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
