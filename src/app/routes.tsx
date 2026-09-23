import { createBrowserRouter, Navigate, useLocation } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Clients } from "./pages/Clients";
import { Projects } from "./pages/Projects";
import { Invoicing } from "./pages/Invoicing";
import { Support } from "./pages/Support";
import { Help } from "./pages/Help";
import { NotFound } from "./pages/NotFound";
import { Login } from "./pages/Login";
import { Account } from "./pages/Account";
import { Settings } from "./pages/Settings";
import { useAuth } from "./contexts/AuthContext";

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // La destination demandée est transmise à l’écran de connexion : après
    // déverrouillage on y revient, au lieu de retomber sur l’accueil.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Layout />;
}

function LoginRoute() {
  const { isAuthenticated, pendingRecoveryCode } = useAuth();
  const location = useLocation();
  const destination =
    typeof (location.state as { from?: unknown } | null)?.from === "string"
      ? ((location.state as { from: string }).from)
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
