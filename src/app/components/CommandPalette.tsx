import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Receipt,
  Search,
  Timer,
  Users,
} from "lucide-react";

import { learnerName } from "../../domain/academy";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "./ui/command";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import {
  clientRepository,
  invoiceRepository,
  learnerRepository,
  projectRepository,
  sessionRepository,
} from "../data/repositories";
import { useCollection } from "../hooks/useCollection";

/**
 * Recherche globale.
 *
 * Retrouver une facture demandait d'ouvrir Facturation, choisir la bonne
 * nature, puis filtrer. Quatre gestes pour une information qu'on a déjà en
 * tête. Ici on tape le nom du client, et on y est.
 *
 * Le raccourci est Ctrl+K (Cmd+K sur Mac), la convention que tout le monde
 * connaît. Il est aussi accessible par un bouton visible : un raccourci qui
 * n'existe que dans la documentation n'est utilisé par personne.
 *
 * La recherche porte sur ce qui est déjà en mémoire — aucune requête, aucun
 * index à maintenir. À l'échelle d'une agence, quelques centaines
 * d'enregistrements se filtrent plus vite que le temps de frappe.
 */

interface CommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const RACCOURCIS = [
  { label: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Projets", href: "/projects", icon: FolderKanban },
  { label: "Facturation", href: "/invoicing", icon: FileText },
  { label: "Temps & rentabilité", href: "/time", icon: Timer },
  { label: "CodeWave Academy", href: "/academy", icon: GraduationCap },
] as const;

/** Nombre de résultats affichés par catégorie. Au-delà, on affine la recherche. */
const MAX_PAR_GROUPE = 5;

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [requete, setRequete] = useState("");

  const { items: clients } = useCollection(clientRepository);
  const { items: projets } = useCollection(projectRepository);
  const { items: factures } = useCollection(invoiceRepository);
  const { items: sessions } = useCollection(sessionRepository);
  const { items: apprenants } = useCollection(learnerRepository);

  // La requête ne survit pas à la fermeture : rouvrir sur l'ancienne recherche
  // donne l'impression que rien n'a été pris en compte.
  useEffect(() => {
    if (!open) setRequete("");
  }, [open]);

  const clientsParId = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  const aller = (href: string) => {
    onOpenChange(false);
    void navigate(href);
  };

  const q = requete.trim().toLowerCase();
  const correspond = (...champs: readonly (string | undefined)[]) =>
    q.length === 0 ||
    champs.some((champ) => (champ ?? "").toLowerCase().includes(q));

  const clientsTrouves = clients
    .filter((client) => correspond(client.company, client.name, client.email))
    .slice(0, MAX_PAR_GROUPE);

  const projetsTrouves = projets
    .filter((projet) =>
      correspond(projet.name, clientsParId.get(projet.clientId)?.company),
    )
    .slice(0, MAX_PAR_GROUPE);

  const facturesTrouvees = factures
    .filter((facture) =>
      correspond(facture.number, clientsParId.get(facture.clientId)?.company),
    )
    .slice(0, MAX_PAR_GROUPE);

  const sessionsTrouvees = sessions
    .filter((session) => correspond(session.title, session.trainer))
    .slice(0, MAX_PAR_GROUPE);

  const apprenantsTrouves = apprenants
    .filter((apprenant) =>
      correspond(apprenant.firstName, apprenant.lastName, apprenant.email),
    )
    .slice(0, MAX_PAR_GROUPE);

  const aucunResultat =
    q.length > 0 &&
    clientsTrouves.length === 0 &&
    projetsTrouves.length === 0 &&
    facturesTrouvees.length === 0 &&
    sessionsTrouvees.length === 0 &&
    apprenantsTrouves.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[560px]">
        <DialogTitle className="sr-only">Recherche globale</DialogTitle>
        <Command
          // Le filtrage est fait ci-dessus, sur les champs qui ont un sens
          // métier. Le score approximatif de cmdk remonterait un apprenant
          // pour une recherche de facture.
          shouldFilter={false}
        >
          <CommandInput
            placeholder="Chercher un client, un projet, une facture…"
            value={requete}
            onValueChange={setRequete}
          />
          <CommandList>
            {aucunResultat && (
              <CommandEmpty>
                Rien ne correspond à « {requete.trim()} ».
              </CommandEmpty>
            )}

            {q.length === 0 && (
              <CommandGroup heading="Aller à">
                {RACCOURCIS.map((raccourci) => (
                  <CommandItem
                    key={raccourci.href}
                    value={raccourci.label}
                    onSelect={() => aller(raccourci.href)}
                  >
                    <raccourci.icon />
                    <span>{raccourci.label}</span>
                  </CommandItem>
                ))}
                <CommandItem value="Nouvelle facture" onSelect={() => aller("/invoicing")}>
                  <Plus />
                  <span>Nouveau document commercial</span>
                  <CommandShortcut>Facturation</CommandShortcut>
                </CommandItem>
                <CommandItem value="Saisir du temps" onSelect={() => aller("/time")}>
                  <Timer />
                  <span>Saisir du temps</span>
                  <CommandShortcut>Temps</CommandShortcut>
                </CommandItem>
                <CommandItem value="Ajouter une dépense" onSelect={() => aller("/time")}>
                  <Receipt />
                  <span>Ajouter une dépense</span>
                  <CommandShortcut>Temps</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            )}

            {clientsTrouves.length > 0 && (
              <CommandGroup heading="Clients">
                {clientsTrouves.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`client-${client.id}`}
                    onSelect={() => aller("/clients")}
                  >
                    <Users />
                    <span>{client.company}</span>
                    <CommandShortcut>{client.name}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {projetsTrouves.length > 0 && (
              <CommandGroup heading="Projets">
                {projetsTrouves.map((projet) => (
                  <CommandItem
                    key={projet.id}
                    value={`projet-${projet.id}`}
                    onSelect={() => aller("/projects")}
                  >
                    <FolderKanban />
                    <span>{projet.name}</span>
                    <CommandShortcut>
                      {clientsParId.get(projet.clientId)?.company ?? "—"}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {facturesTrouvees.length > 0 && (
              <CommandGroup heading="Documents">
                {facturesTrouvees.map((facture) => (
                  <CommandItem
                    key={facture.id}
                    value={`facture-${facture.id}`}
                    onSelect={() => aller("/invoicing")}
                  >
                    <FileText />
                    <span>
                      {facture.number.length > 0 ? facture.number : "Brouillon"}
                    </span>
                    <CommandShortcut>
                      {clientsParId.get(facture.clientId)?.company ?? "—"}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {sessionsTrouvees.length > 0 && (
              <CommandGroup heading="Sessions">
                {sessionsTrouvees.map((session) => (
                  <CommandItem
                    key={session.id}
                    value={`session-${session.id}`}
                    onSelect={() => aller("/academy")}
                  >
                    <GraduationCap />
                    <span>{session.title}</span>
                    <CommandShortcut>{session.startDate}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {apprenantsTrouves.length > 0 && (
              <CommandGroup heading="Apprenants">
                {apprenantsTrouves.map((apprenant) => (
                  <CommandItem
                    key={apprenant.id}
                    value={`apprenant-${apprenant.id}`}
                    onSelect={() => aller("/academy")}
                  >
                    <Users />
                    <span>{learnerName(apprenant)}</span>
                    <CommandShortcut>{apprenant.city ?? ""}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bouton d'ouverture, avec le raccourci affiché.
 *
 * Visible plutôt que caché : un raccourci qui n'existe que dans l'aide n'est
 * découvert par personne.
 */
export function CommandTrigger({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Rechercher</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 border border-border px-1.5 py-0.5 text-[10px] font-mono">
        Ctrl K
      </kbd>
    </button>
  );
}
