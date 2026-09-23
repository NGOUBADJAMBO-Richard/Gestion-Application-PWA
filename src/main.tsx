import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";
import { migrateClientLinks } from "./infra/storage/clientLinkMigration";
import { migrateLegacyStorageKeys } from "./infra/storage/legacyMigration";
import "./styles/index.css";

// Avant tout rendu : les clés « mgn-* » de M.G.N Manager sont reprises sous le
// préfixe « codewave-studio ». Un utilisateur qui met à jour ne doit pas
// retrouver une session fermée et un thème réinitialisé.
migrateLegacyStorageKeys();

// Puis la reprise des données elles-mêmes : rattachement des documents à leur
// client par identifiant, et passage des numéros INV- en FAC-.
migrateClientLinks();

const container = document.getElementById("root");
if (container === null) {
  throw new Error(
    "Élément #root introuvable : index.html a été modifié et ne contient plus le point de montage.",
  );
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
