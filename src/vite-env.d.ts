/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Événement d'installation proposé par le navigateur.
 *
 * `beforeinstallprompt` ne figure pas dans la bibliothèque standard de
 * TypeScript : il n'est implémenté que par les navigateurs Chromium. On le
 * déclare ici plutôt que de recourir à `any` au point d'appel.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}
