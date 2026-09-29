import { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router";
import {
  FileText,
  FolderKanban,
  Globe,
  GraduationCap,
  Headphones,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  SlidersHorizontal,
  Sun,
  Timer,
  UserCircle2,
  Users,
  X,
} from "lucide-react";

import { BRAND } from "../../branding";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { AlertBell } from "./AlertBell";
import { BrandLogo } from "./BrandLogo";
import { CommandPalette, CommandTrigger } from "./CommandPalette";
import { Button } from "./ui/button";

/**
 * Charpente de l'application.
 *
 * La navigation comptait dix entrées à plat, du tableau de bord à l'aide, sans
 * hiérarchie : il fallait relire toute la liste pour trouver un écran. Elle est
 * désormais groupée par intention — piloter, produire, assister, régler — ce
 * qui ramène la recherche à trois lignes au lieu de dix.
 *
 * La barre du haut porte les deux accès transverses : la recherche globale
 * (Ctrl+K) et les alertes. Ce sont les deux seules choses dont on a besoin
 * depuis n'importe quel écran.
 */

interface EntreeNav {
  readonly key: string;
  readonly href: string;
  readonly icon: typeof LayoutDashboard;
}

interface GroupeNav {
  readonly titre: string;
  readonly entrees: readonly EntreeNav[];
}

export function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOuverte, setPaletteOuverte] = useState(false);

  // Ctrl+K, ou Cmd+K sur Mac. La convention est assez répandue pour qu'on
  // l'attende ; la détourner ferait perdre du temps à tout le monde.
  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      if ((evenement.ctrlKey || evenement.metaKey) && evenement.key === "k") {
        evenement.preventDefault();
        setPaletteOuverte((ouvert) => !ouvert);
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, []);

  const groupes: readonly GroupeNav[] = [
    {
      titre: "Pilotage",
      entrees: [{ key: "nav.dashboard", href: "/", icon: LayoutDashboard }],
    },
    {
      titre: "Activité",
      entrees: [
        { key: "nav.clients", href: "/clients", icon: Users },
        { key: "nav.projects", href: "/projects", icon: FolderKanban },
        { key: "nav.invoicing", href: "/invoicing", icon: FileText },
        { key: "nav.time", href: "/time", icon: Timer },
        { key: "nav.academy", href: "/academy", icon: GraduationCap },
      ],
    },
    {
      titre: "Assistance",
      entrees: [
        { key: "nav.support", href: "/support", icon: Headphones },
        { key: "nav.help", href: "/help", icon: HelpCircle },
      ],
    },
    {
      titre: "Réglages",
      entrees: [
        { key: "nav.settings", href: "/settings", icon: SlidersHorizontal },
        { key: "nav.account", href: "/account", icon: UserCircle2 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t("nav.closeMenu")}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
        fixed top-0 left-0 h-full w-72 bg-card/90 border-r border-border z-50 surface-card
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
      >
        <div className="flex flex-col h-full">
          <div className="h-20 flex items-center justify-between px-5 border-b border-border">
            <BrandLogo
              size="sm"
              mode={theme === "dark" ? "mono" : "color"}
              subtitle={t("brand.businessSuite")}
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
              title={t("nav.closeMenu")}
              aria-label={t("nav.closeMenu")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {groupes.map((groupe) => (
              <div key={groupe.titre} className="space-y-1">
                <p className="section-label px-3 pb-1">{groupe.titre}</p>
                {groupe.entrees.map((entree) => (
                  <NavLink
                    key={entree.href}
                    to={entree.href}
                    end={entree.href === "/"}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      group flex items-center gap-3 px-3 py-2.5 transition-all duration-150
                      ${
                        isActive
                          ? "nav-active bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent hover:translate-x-0.5"
                      }
                    `}
                  >
                    <entree.icon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{t(entree.key)}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              {t("nav.logout")}
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72 min-h-screen flex flex-col">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden shrink-0"
              title={t("nav.openMenu")}
              aria-label={t("nav.openMenu")}
            >
              <Menu className="w-6 h-6" />
            </button>

            <CommandTrigger onClick={() => setPaletteOuverte(true)} />

            <div className="hidden xl:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t("brand.platformActive")}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1 shrink-0">
              <AlertBell />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
                className="gap-2"
                aria-label={t("nav.toggleLanguage")}
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language.toUpperCase()}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                aria-label={t("nav.toggleTheme")}
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6 flex-1">
          <Outlet />
        </main>

        <footer className="border-t border-border bg-card/60">
          <div className="px-4 lg:px-6 py-4 text-sm text-muted-foreground">
            {BRAND.company} &middot;{" "}
            <a
              href={BRAND.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-ink hover:underline"
            >
              Site de l&rsquo;agence
            </a>
          </div>
        </footer>
      </div>

      <CommandPalette open={paletteOuverte} onOpenChange={setPaletteOuverte} />
    </div>
  );
}
