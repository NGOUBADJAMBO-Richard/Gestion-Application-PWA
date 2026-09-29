/**
 * Notifications du système.
 *
 * Le centre d'alertes ne sert qu'une fois l'application ouverte. Or une facture
 * ne devient pas urgente parce qu'on a ouvert l'application : elle l'est déjà
 * depuis trois semaines. Les notifications font le chemin inverse — c'est
 * l'échéance qui vient chercher l'utilisateur.
 *
 * ## Ce qui est fait, et ce qui ne l'est pas
 *
 * Il n'y a **pas de serveur**, donc pas de notification poussée : rien
 * n'arrive quand l'application est fermée. Ce qui est possible sans backend,
 * et qui est fait ici, c'est de notifier à l'ouverture et pendant l'usage —
 * y compris quand l'onglet est en arrière-plan, ce qui couvre le cas réel
 * d'une application laissée ouverte toute la journée.
 *
 * Promettre davantage demanderait un serveur de push, des clés VAPID et un
 * abonnement par appareil. Ce serait mentir que de l'afficher comme disponible.
 *
 * ## Sobriété
 *
 * Seules les alertes critiques notifient, et jamais deux fois la même. Une
 * notification par facture en retard chaque matin ferait désactiver la
 * fonction en trois jours — et avec elle, celles qui comptaient.
 */

export type NotificationSupport =
  | "unsupported"
  | "granted"
  | "denied"
  | "default";

/** État de l'autorisation, sans jamais la demander. */
export function notificationSupport(): NotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  const permission = Notification.permission;
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  return "default";
}

/**
 * Demande l'autorisation.
 *
 * À n'appeler que depuis un geste explicite de l'utilisateur : les navigateurs
 * refusent — et à juste titre — une demande spontanée au chargement.
 */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (notificationSupport() === "unsupported") return "unsupported";
  try {
    const reponse = await Notification.requestPermission();
    return reponse === "granted"
      ? "granted"
      : reponse === "denied"
        ? "denied"
        : "default";
  } catch {
    // Certains navigateurs lèvent au lieu de refuser dans un contexte non
    // sécurisé : on traite l'échec comme un refus plutôt que de planter.
    return "denied";
  }
}

export interface NotificationPayload {
  readonly title: string;
  readonly body: string;
  /** Regroupe les notifications d'un même sujet : la nouvelle remplace l'ancienne. */
  readonly tag: string;
  /** Écran à ouvrir au clic, chemin relatif. */
  readonly href?: string;
}

/**
 * Affiche une notification.
 *
 * Passe par le service worker quand il est disponible : une notification émise
 * par la page disparaît avec elle, celle du service worker survit à la
 * fermeture de l'onglet et porte une action au clic.
 *
 * Renvoie `false` plutôt que de lever quand rien n'a pu être affiché — un
 * échec de notification ne doit jamais interrompre ce que l'utilisateur est en
 * train de faire.
 */
export async function showNotification(
  payload: NotificationPayload,
): Promise<boolean> {
  if (notificationSupport() !== "granted") return false;

  const options: NotificationOptions = {
    body: payload.body,
    tag: payload.tag,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: { href: payload.href ?? "/" },
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration !== undefined) {
        await registration.showNotification(payload.title, options);
        return true;
      }
    }

    new Notification(payload.title, options);
    return true;
  } catch {
    return false;
  }
}
