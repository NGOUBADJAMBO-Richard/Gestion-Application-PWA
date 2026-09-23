import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useClientIndex } from "../hooks/useClientIndex";

interface ClientSelectProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (clientId: string) => void;
}

/**
 * Choix d'un client existant.
 *
 * Remplace le champ de texte libre où l'on retapait le nom de l'entreprise à
 * chaque document. Deux gains : la moindre faute de frappe ne crée plus un
 * client fantôme, et renommer un client se répercute partout, puisque le
 * document ne retient qu'un identifiant.
 */
export function ClientSelect({ id, value, onChange }: ClientSelectProps) {
  const { clients } = useClientIndex();

  if (clients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun client enregistré. Crée d&rsquo;abord un client dans l&rsquo;onglet
        Clients.
      </p>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Choisir un client" />
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.company} — {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
