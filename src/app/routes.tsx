import { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router";

import { Layout } from "./components/Layout";
import { useAuth } from "./contexts/AuthContext";

/**
 * Chargement par écran.
 *
 * Tout partait dans le fragment initial, y compris Recharts — 76 ko
 * compressés — qui ne sert qu'au tableau de bord, et jsPDF qui ne sert qu'au
 * téléchargement d'une facture. Chaque écran est désormais chargé à sa
 * première ouverture.
 *
 * `Login` reste en chargement direct : c'est le premier écran vu, l'y
 * différer ajouterait une attente là où elle se voit le plus.
 */
import { Login } from "./pages/Login";

const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Clients = lazy(() =>
  import("./pages/Clients").then((m) => ({ default: m.Clients })),
);
const Projects = lazy(() =>
  import("./pages/Projects").then((m) => ({ default: m.Projects })),
);
const Invoicing = lazy(() =>
  import("./pages/Invoicing").then((m) => ({ default: m.Invoicing })),
);
const Support = lazy(() =>
  import("./pages/Support").then((m) => ({ default: m.Support })),
);
const Settings = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.Settings })),
);
const Account = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.Account })),
);
const Help = lazy(() =>
  import("./pages/Help").then((m) => ({ default: m.Help })),
);
const NotFound = lazy(() =>
  import("./pages/NotFound").then((m) => ({ default: m.NotFound })),
);

/**
 * Attente pendant le chargement d'un écran.
 *
 * Volontairement sobre : un écran de chargement voyant, pour un fragment qui
 * arrive en quelques dizaines de millisecondes sur un appareil déjà visité,
 * fait paraître l'application plus lente qu'elle ne l'est.
 */
function EcranEnAttente() {
  return (
    <p className="p-6 text-sm text-muted-foreground" aria-live="polite">
      Chargement…
    </p>
  );
}

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // La destination demandée est transmise à l’écran de connexion : après
    // déverrouillage on y revient, au lieu de retomber sur l’accueil.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <Suspense fallback={<EcranEnAttente />}>
      <Layout />
    </Suspense>
  );
}

function LoginRoute() {
  const { isAuthenticated, pendingRecoveryCode } = useAuth();
  const location = useLocation();
  const destination =
    typeof (location.state as { from?: unknown } | null)?.from === "string"
      ? (location.state as { from: string }).from
      : "/";

  // Un code de récupération vient d’être émis : il n’est affiché qu’une seule
  // fois. On ne quitte pas l’écran avant confirmation qu’il a été noté.
  if (isAuthenticated && pendingRecoveryCode === null) {
    return <Navigate to={destination} replace />;
  }

  return <Login />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginRoute,
  },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "clients", Component: Clients },
      { path: "account", Component: Account },
      { path: "projects", Component: Projects },
      { path: "invoicing", Component: Invoicing },
      { path: "support", Component: Support },
      { path: "settings", Component: Settings },
      { path: "help", Component: Help },
      { path: "*", Component: NotFound },
    ],
  },
]);
