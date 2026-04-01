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
import { Client, mockClients, mockProjects } from "../data/mockData";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
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
  const [clients, setClients] = useState<Client[]>(mockClients);
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

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

  const handleDelete = (id: string) => {
    setClients((prev) => prev.filter((client) => client.id !== id));
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
      avatar: formData.avatar?.trim() || undefined,
    };

    if (!payload.name || !payload.email || !payload.phone || !payload.company) {
      return;
    }

    if (editingClient) {
      setClients((prev) =>
        prev.map((client) =>
          client.id === editingClient.id ? { ...client, ...payload } : client,
        ),
      );
    } else {
      setClients((prev) => [
        ...prev,
        { id: Date.now().toString(), ...payload },
      ]);
    }

    setIsDialogOpen(false);
    setEditingClient(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1>{t("clients.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {filteredClients.length} clients
          </p>
        </div>
        <Button
          className="gap-2"
          style={{ backgroundColor: "#004aad" }}
          onClick={handleCreate}
        >
          <Plus className="w-4 h-4" />
          {t("clients.new")}
        </Button>
      </div>

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
                  <AvatarFallback className="bg-[#004aad] text-white">
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
                  {client.projects} {t("clients.projects").toLowerCase()}
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
                >
                  <Pencil className="w-4 h-4" />
                  {t("common.edit")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleDelete(client.id)}
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
              <div className="grid grid-cols-2 gap-4">
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
              <Button type="submit" style={{ backgroundColor: "#004aad" }}>
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
                  <AvatarFallback className="bg-[#004aad] text-white">
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
                  <span className="text-muted-foreground">Telephone:</span>{" "}
                  {selectedClient.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Nombre de projets:
                  </span>{" "}
                  {selectedClient.projects}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Projets associes</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {mockProjects
                    .filter(
                      (project) => project.client === selectedClient.company,
                    )
                    .map((project) => (
                      <div
                        key={project.id}
                        className="text-sm border border-border rounded-md px-3 py-2"
                      >
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Statut: {project.status} | Echeance:{" "}
                          {project.deadline}
                        </p>
                      </div>
                    ))}

                  {mockProjects.filter(
                    (project) => project.client === selectedClient.company,
                  ).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucun projet associe.
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
    </div>
  );
}
