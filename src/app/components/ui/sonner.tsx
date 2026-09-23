import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "../../contexts/ThemeContext";

/**
 * L'export Figma d'origine lisait le thème via `next-themes`, une seconde
 * source de vérité qui ignorait le ThemeProvider de l'application : les toasts
 * restaient en clair quand l'interface passait en sombre. On branche ici le
 * contexte réel, et la dépendance `next-themes` disparaît.
 */
const Toaster = (props: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
