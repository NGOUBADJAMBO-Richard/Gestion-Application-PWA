import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { Button } from "./ui/button";
import { BRAND } from "../../branding";

/**
 * Mise à jour et installation.
 *
 * Deux messages, jamais imposés :
 *
 * - une nouvelle version est prête : on le dit et on laisse recharger. Un
 *   rechargement automatique au milieu d'une saisie de facture ferait perdre
 *   le travail en cours ;
 * - l'application peut être installée : on le propose une fois. Le navigateur
 *   ne réémet l'événement qu'à une prochaine visite, donc insister n'aurait
 *   servi à rien.
 */
/** Refus d’installation, mémorisé pour la session courante. */
const CLE_REFUS = "codewave-studio:install-refuse";

export function PwaStatus() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  // Le refus vaut pour la session : reproposer à chaque rechargement
  // transforme une proposition en harcèlement.
  const [installMasque, setInstallMasque] = useState(() => {
    try {
      return sessionStorage.getItem(CLE_REFUS) === "1";
    } catch {
      return false;
    }
  });

  const refuserInstallation = () => {
    setInstallMasque(true);
    try {
      sessionStorage.setItem(CLE_REFUS, "1");
    } catch {
      // Stockage refusé : le masquage reste valable pour cette page.
    }
  };

  useEffect(() => {
    const surInvite = (event: BeforeInstallPromptEvent) => {
      // Sans preventDefault, Chrome affiche sa propre barre, au moment qu'il
      // choisit et sans rapport avec ce que fait l'utilisateur.
      event.preventDefault();
      setInstallEvent(event);
    };

    window.addEventListener("beforeinstallprompt", surInvite);
    return () => window.removeEventListener("beforeinstallprompt", surInvite);
  }, []);

  if (needRefresh) {
    return (
      <div
        role="status"
        className="fixed bottom-4 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 border-2 border-primary bg-card p-4 shadow-lg"
      >
        <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" aria-hidden="true" />
        <div className="flex-1 text-sm">
          <p className="font-display font-bold">Nouvelle version disponible</p>
          <p className="mt-1 text-muted-foreground">
            Recharge quand tu veux. Rien n’est perdu : tes données restent sur
            cet appareil.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void updateServiceWorker(true)}>
              Recharger
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNeedRefresh(false)}
            >
              Plus tard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (installEvent !== null && !installMasque) {
    return (
      <div
        role="status"
        className="fixed bottom-4 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 border border-border bg-card p-4 shadow-lg"
      >
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" aria-hidden="true" />
        <div className="flex-1 text-sm">
          <p className="font-display font-bold">Installer {BRAND.name}</p>
          <p className="mt-1 text-muted-foreground">
            L’application s’ouvrira dans sa propre fenêtre et fonctionnera sans
            connexion.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                void installEvent.prompt().finally(() => setInstallEvent(null));
              }}
            >
              Installer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={refuserInstallation}
            >
              Pas maintenant
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={refuserInstallation}
          aria-label="Masquer la proposition d’installation"
          className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return null;
}
