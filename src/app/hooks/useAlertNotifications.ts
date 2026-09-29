import { useEffect, useRef } from "react";

import type { Alert } from "../../domain/alerts";
import { notificationSupport, showNotification } from "../../infra/notifications";
import { notificationsEnabled, takeUnnotified } from "../data/notificationJournal";

/**
 * Transforme les alertes critiques en notifications du système.
 *
 * Trois garde-fous, chacun pour une manière de rendre la fonction odieuse :
 *
 * 1. **Seules les alertes critiques notifient.** Un rappel d'échéance à cinq
 *    jours n'a pas à interrompre qui que ce soit ; noyer les impayés sous les
 *    informations ferait désactiver la fonction en trois jours.
 * 2. **Jamais deux fois la même.** La mémoire est tenue par
 *    `notificationJournal`, et elle est réduite aux alertes vivantes pour
 *    qu'une condition résolue puis réapparue puisse re-signaler.
 * 3. **Trois notifications au maximum par salve.** Douze factures en retard
 *    d'un coup — le cas d'une première ouverture — donneraient douze fenêtres
 *    empilées. On en montre trois, la dernière disant combien restent.
 */

/** Au-delà, on résume plutôt que d'empiler. */
const MAX_PAR_SALVE = 3;

export function useAlertNotifications(alerts: readonly Alert[]): void {
  // Les alertes se recalculent à chaque rendu : sans ce verrou, deux rendus
  // rapprochés lanceraient deux salves concurrentes sur les mêmes identifiants.
  const enCours = useRef(false);

  useEffect(() => {
    if (!notificationsEnabled()) return;
    if (notificationSupport() !== "granted") return;
    if (enCours.current) return;

    const critiques = alerts.filter((alerte) => alerte.severity === "critical");
    if (critiques.length === 0) {
      // On passe quand même par le journal : il doit oublier les alertes
      // résolues, sinon elles ne re-signaleraient jamais.
      takeUnnotified([]);
      return;
    }

    const nouvelles = takeUnnotified(critiques.map((alerte) => alerte.id));
    if (nouvelles.length === 0) return;

    const aNotifier = critiques.filter((alerte) => nouvelles.includes(alerte.id));

    enCours.current = true;
    void (async () => {
      try {
        for (const alerte of aNotifier.slice(0, MAX_PAR_SALVE)) {
          await showNotification({
            title: alerte.title,
            body: alerte.detail,
            tag: alerte.id,
            href: alerte.href,
          });
        }

        const restantes = aNotifier.length - MAX_PAR_SALVE;
        if (restantes > 0) {
          await showNotification({
            title: `${restantes} autre(s) point(s) à traiter`,
            body: "Ouvre le centre d'alertes pour la liste complète.",
            tag: "alertes-resume",
            href: "/",
          });
        }
      } finally {
        enCours.current = false;
      }
    })();
  }, [alerts]);
}
