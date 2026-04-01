import { createBrowserRouter, Navigate } from "react-router";
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
import { useAuth } from "./contexts/AuthContext";

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
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
      { path: "help", Component: Help },
      { path: "*", Component: NotFound },
    ],
  },
]);
