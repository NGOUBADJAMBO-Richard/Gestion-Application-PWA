import React, { useState } from "react";
import {
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useLanguage } from "../contexts/LanguageContext";
import type { Client } from "../data/mockData";
import { invoiceRepository, projectRepository } from "../data/repositories";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { canDeleteClient } from "../../domain/rules";
import { Archive, ArchiveRestore } from "lucide-react";
import { todayIso } from "../../domain/date";
import { clientRepository } from "../data/repositories";
import { useCollection } from "../hooks/useCollection";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { DataStateNotice } from "../components/DataStateNotice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";

export function Clients() {
  const { t } = useLanguage();
  // Les donnees vivent dans le depot, pas dans la memoire du composant :
  // la saisie survit au rechargement et se propage aux autres onglets.
  const {
    items: clients,
    isLoading,
    error,
    create,
    update,
    remove,
    dismissError,
  } = useCollection(clientRepository);
  // Les projets et factures reels, pour compter les rattachements et decider
  // si une suppression est possible. L ecran lisait jusqu ici les donnees de
  // demonstration : le detail d un client montrait des projets qui n etaient
  // pas les siens.
  const { items: projects } = useCollection(projectRepository);
  const { items: invoices } = useCollection(invoiceRepository);
  const [clientASupprimer, setClientASupprimer] = useState<Client | null>(null);
  const [montrerArchives, setMontrerArchives] = useState(false);

  /** Archiver sort le client des listes sans rien detruire ni detacher. */
  const basculerArchive = (client: Client) => {
    void update(
      client.id,
      client.archivedAt === undefined
        ? { archivedAt: todayIso() }
        : { archivedAt: undefined },
    );
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Client, "id">>({
    name: "",
    email: "",
    phone: "",
    company: "",
    projects: 0,
    avatar: "",
  });

  const recherche = searchQuery.trim().toLowerCase();
  const filteredClients = clients.filter((client) => {
    if (client.archivedAt !== undefined && !montrerArchives) return false;
    if (recherche === "") return true;
    return (
      client.name.toLowerCase().includes(recherche) ||
      client.email.toLowerCase().includes(recherche) ||
      client.company.toLowerCase().includes(recherche)
    );
  });

  const nombreArchives = clients.filter(
    (client) => client.archivedAt !== undefined,
  ).length;

  const handleCreate = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      projects: 0,
      avatar: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      projects: client.projects,
      avatar: client.avatar || "",
    });
    setIsDialogOpen(true);
  };

  /** Projets et factures rattaches a un client, pour l affichage et la regle. */
  const rattachements = (clientId: string) => ({
    projets: projects.filter((projet) => projet.clientId === clientId),
    factures: invoices.filter((facture) => facture.clientId === clientId),
  });

  const decisionSuppression = (client: Client | null) => {
    if (client === null) return { allowed: true } as const;
    const { projets, factures } = rattachements(client.id);
    return canDeleteClient({
      // Une facture encore en brouillon ne bloque pas : elle n a pas de
      // numero et peut disparaitre sans trouer la sequence comptable.
      issuedInvoiceIds: factures.map((facture) => facture.number),
      activeProjectIds: projets
        .filter((projet) => projet.status === "active")
        .map((projet) => projet.name),
    });
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Omit<Client, "id"> = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      company: formData.company.trim(),
      projects: Number(formData.projects) || 0,
      // exactOptionalPropertyTypes : une propriete optionnelle est absente,
      // jamais presente avec la valeur undefined.
      ...(formData.avatar?.trim() ? { avatar: formData.avatar.trim() } : {}),
    };

    if (!payload.name || !payload.email || !payload.phone || !payload.company) {
      return;
    }

    if (editingClient) {
      void update(editingClient.id, payload);
    } else {
      // Identifiant attribue par le depot : Date.now() collisionne des que deux
      // creations tombent dans la meme milliseconde.
      void create(payload);
    }

    setIsDialogOpen(false);
    setEditingClient(null);
  };

  return (
    <div className="space-y-6">
      <DataStateNotice
        isLoading={isLoading}
        error={error}
        onDismiss={dismissError}
        label="les clients"
      />

      <header className="wave-surface -mx-4 px-4 py-6 lg:-mx-6 lg:px-6">
        <p className="section-label">Répertoire</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
        <div>
          <h1>{t("clients.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {filteredClients.length} client(s)
            {nombreArchives > 0 && (
              <>
                {" "}
                &middot;{" "}
                <button
                  type="button"
                  className="text-primary-ink underline-offset-4 hover:underline"
                  onClick={() => setMontrerArchives((etat) => !etat)}
                >
                  {montrerArchives
                    ? "masquer les archivés"
                    : `${nombreArchives} archivé(s)`}
                </button>
              </>
            )}
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={handleCreate}
        >
          <Plus className="w-4 h-4" />
          {t("clients.new")}
        </Button>
        </div>
      </header>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {client.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{client.name}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">
                    {client.company}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>
                  {rattachements(client.id).projets.length}{" "}
                  {rattachements(client.id).projets.length > 1
                    ? "projets"
                    : "projet"}
                </span>
              </div>
              <div className="pt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleView(client)}
                >
                  {t("common.view")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => handleEdit(client)}
                  aria-label={`Modifier ${client.company}`}
                >
                  <Pencil className="w-4 h-4" />
                  {t("common.edit")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => basculerArchive(client)}
                  aria-label={
                    client.archivedAt === undefined
                      ? `Archiver ${client.company}`
                      : `Sortir ${client.company} des archives`
                  }
                  title={
                    client.archivedAt === undefined
                      ? "Archiver : le client sort des listes sans rien perdre"
                      : "Remettre dans les listes"
                  }
                >
                  {client.archivedAt === undefined ? (
                    <Archive className="w-4 h-4" />
                  ) : (
                    <ArchiveRestore className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setClientASupprimer(client)}
                  aria-label={`Supprimer ${client.company}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingClient(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingClient ? t("common.edit") : t("clients.new")}
              </DialogTitle>
              <DialogDescription>
                Renseignez les informations du client
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">{t("clients.name")}</Label>
                <Input
                  id="client-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">{t("clients.email")}</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client-phone">{t("clients.phone")}</Label>
                  <Input
                    id="client-phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-projects">
                    {t("clients.projects")}
                  </Label>
                  <Input
                    id="client-projects"
                    type="number"
                    min={0}
                    value={formData.projects}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        projects: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-company">{t("clients.company")}</Label>
                <Input
                  id="client-company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit">
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setSelectedClient(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Fiche client</DialogTitle>
            <DialogDescription>
              Informations detaillees du client selectionne
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedClient.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedClient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClient.company}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  {selectedClient.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Téléphone:</span>{" "}
                  {selectedClient.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Nombre de projets:
                  </span>{" "}
                  {rattachements(selectedClient.id).projets.length}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Projets associés</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {rattachements(selectedClient.id).projets.map((project) => (
                      <div
                        key={project.id}
                        className="text-sm border border-border rounded-md px-3 py-2"
                      >
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Statut: {project.status} | Échéance :{" "}
                          {project.deadline}
                        </p>
                      </div>
                    ))}

                  {rattachements(selectedClient.id).projets.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucun projet associé.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={clientASupprimer !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) setClientASupprimer(null);
        }}
        subject={
          clientASupprimer === null
            ? ""
            : `le client ${clientASupprimer.company}`
        }
        decision={decisionSuppression(clientASupprimer)}
        consequence="Le client part à la corbeille. Ses projets et factures restent en place et continueront de le désigner."
        onConfirm={() => {
          if (clientASupprimer !== null) void remove(clientASupprimer.id);
          setClientASupprimer(null);
        }}
      />
    </div>
  );
}
