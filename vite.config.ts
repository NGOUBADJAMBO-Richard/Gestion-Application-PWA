import { defineConfig } from "vitest/config";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    /**
     * Service worker.
     *
     * Le paquet vite-plugin-pwa était installé depuis le début et n’a jamais
     * été branché : l’application portait « PWA » dans son nom sans en être
     * une, et l’aide promettait un mode hors ligne qui n’existait pas.
     *
     * autoUpdate : une version corrigée ne doit pas attendre que l’utilisateur
     * ferme tous ses onglets. La bascule reste annoncée dans l’interface.
     */
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: false,
      workbox: {
        // L’application est une page unique : toute route inconnue doit
        // retomber sur index.html, sinon /invoicing renvoie une 404 hors ligne.
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Les polices sont embarquées : sans elles, l’interface hors ligne
        // perdrait sa typographie, ce qui était déjà le défaut du CDN.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Désactivé en développement : un service worker qui met en cache
        // pendant qu’on développe masque les modifications.
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  assetsInclude: ["**/*.csv"],

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/infra/**"],
    },
  },

  build: {
    /*
     * Pas de découpage manuel.
     *
     * Le réglage précédent forçait chaque famille de paquets dans un fragment
     * nommé, ce qui donnait une lecture claire des poids mais empêchait Vite
     * de respecter les frontières d’import dynamique : jsPDF partait au
     * démarrage — 147 ko compressés — alors qu’il n’est demandé qu’au
     * téléchargement d’une facture.
     *
     * Le découpage par écran donne désormais la même lisibilité, et Vite
     * place chaque dépendance dans le fragment qui la demande réellement.
     */
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        // Le découpage automatique produisait trente-quatre fragments, dont
        // quatorze sous 2 ko : autant de requêtes pour quelques centaines
        // d’octets. Ceux-là sont fusionnés avec leur voisin.
        experimentalMinChunkSize: 20_000,
      },
    },
  },
});
