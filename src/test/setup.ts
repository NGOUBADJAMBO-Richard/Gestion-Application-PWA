import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

/**
 * Stockage local pour les tests.
 *
 * jsdom 25 crée bien une fenêtre, mais n'expose pas `localStorage`. Comme
 * l'application y conserve l'intégralité de ses données, aucun écran ne
 * pourrait être monté dans un test sans ce substitut.
 *
 * L'implémentation respecte le contrat `Storage`, y compris la conversion en
 * chaîne des valeurs et des clés : un test qui passerait ici grâce à une
 * approximation ne prouverait rien sur le comportement réel du navigateur.
 */
class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.entries.get(String(key)) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.entries.delete(String(key));
  }

  clear(): void {
    this.entries.clear();
  }
}

function install(name: "localStorage" | "sessionStorage"): void {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, name, {
    value: storage,
    writable: true,
    configurable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, {
      value: storage,
      writable: true,
      configurable: true,
    });
  }
}

install("localStorage");
install("sessionStorage");

// Chaque test repart d'un stockage vide : un test qui hérite de l'état du
// précédent passe ou échoue selon l'ordre d'exécution, ce qui ne prouve rien.
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

/**
 * `ResizeObserver` n'existe pas dans jsdom.
 *
 * Recharts s'en sert pour adapter les graphiques à leur conteneur : sans ce
 * substitut, le tableau de bord ne peut pas être monté dans un test. Le
 * substitut ne mesure rien — dans un environnement sans mise en page réelle,
 * il n'y a rien à mesurer — il évite seulement que l'absence de l'API fasse
 * échouer un rendu par ailleurs correct.
 */
class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: NoopResizeObserver,
    writable: true,
    configurable: true,
  });
}

/** `matchMedia` manque aussi, et le thème comme les requêtes de média l'utilisent. */
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
    writable: true,
    configurable: true,
  });
}
