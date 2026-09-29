/**
 * Clic sur une notification.
 *
 * Sans ce script, une notification s'affiche mais ne mène nulle part : le clic
 * la ferme et c'est tout. Une alerte qui dit « FAC-2026-003 en retard » sans
 * ouvrir la facturation oblige à refaire le chemin à la main, ce qui suffit à
 * la rendre inutile.
 *
 * Chargé par le service worker généré (`workbox.importScripts`) : le code de
 * mise en cache est produit par Workbox et ne doit pas être édité, mais il peut
 * importer ce complément.
 *
 * Règle de navigation : si une fenêtre de l'application est déjà ouverte, on la
 * ramène au premier plan et on la navigue. Ouvrir un second onglet à chaque
 * notification laisserait l'utilisateur avec dix onglets de la même
 * application, tous en train d'écrire dans le même stockage.
 */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destination = event.notification.data?.href ?? "/";
  const cible = new URL(destination, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((fenetres) => {
        for (const fenetre of fenetres) {
          // Même origine : on réutilise la fenêtre plutôt que d'en ouvrir une.
          if (new URL(fenetre.url).origin !== self.location.origin) continue;
          return fenetre.focus().then((focalisee) => {
            if ("navigate" in focalisee) return focalisee.navigate(cible);
            return focalisee;
          });
        }
        return self.clients.openWindow(cible);
      })
      .catch(() => {
        // Une fenêtre fermée entre-temps, une navigation refusée : la
        // notification a déjà été fermée, il n'y a rien à rattraper.
      }),
  );
});
