import { defineConfig } from "vitest/config";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const NODE_MODULES = "node_modules/";

/**
 * Nom du paquet de plus haut niveau auquel appartient un module.
 * On compare des noms de paquets exacts et non des fragments de chemin :
 * un test sur la sous-chaîne « /react/ » attrape aussi `react-dom`, et le
 * découpage finit par produire des chunks circulaires.
 */
function packageOf(file: string): string | undefined {
  const at = file.lastIndexOf(NODE_MODULES);
  if (at === -1) return undefined;
  const rest = file.slice(at + NODE_MODULES.length);
  const parts = rest.split("/");
  if (parts[0] === undefined) return undefined;
  return parts[0].startsWith("@") ? `${parts[0]}/${parts[1] ?? ""}` : parts[0];
}

/** Familles lourdes isolées pour que le poids reste imputable à une cause. */
const CHUNKS: ReadonlyArray<readonly [string, (pkg: string) => boolean]> = [
  ["vendor-react", (p) => p === "react" || p === "react-dom" || p === "scheduler"],
  ["vendor-radix", (p) => p.startsWith("@radix-ui/")],
  ["vendor-charts", (p) => p === "recharts" || p.startsWith("d3-") || p === "victory-vendor"],
  ["vendor-pdf", (p) => p === "jspdf" || p === "canvg" || p === "dompurify" || p === "fflate"],
];

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
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const file = id.split("\\").join("/");
          const pkg = packageOf(file);
          if (pkg === undefined) return undefined;

          for (const [name, matches] of CHUNKS) {
            if (matches(pkg)) return name;
          }
          return "vendor-misc";
        },
      },
    },
  },
});
