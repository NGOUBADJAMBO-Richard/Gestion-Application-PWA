import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useProjectIndex } from "../hooks/useProjectIndex";

/**
 * Valeur interne du choix « aucun projet ».
 *
 * Radix refuse une `SelectItem` de valeur vide, car la chaîne vide est déjà
 * l'absence de sélection. On passe donc par un jeton, converti en `undefined`
 * à la sortie : l'appelant ne manipule jamais ce détail d'implémentation.
 */
const AUCUN = "__aucun__";

interface ProjectSelectProps {
  readonly id: string;
  readonly value: string | undefined;
  readonly onChange: (projectId: string | undefined) => void;
  /** Restreint la liste aux projets d'un client donné. */
  readonly clientId?: string | undefined;
  /**
   * Autorise l'absence de rattachement. Vrai pour une dépense de structure ou
   * une prestation ponctuelle, faux pour une saisie de temps — un temps sans
   * projet ne se rentabilise pas.
   */
  readonly allowNone?: boolean;
  readonly noneLabel?: string;
}

export function ProjectSelect({
  id,
  value,
  onChange,
  clientId,
  allowNone = false,
  noneLabel = "Aucun projet",
}: ProjectSelectProps) {
  const { projects } = useProjectIndex();

  // Filtré sur le client quand il est connu : proposer les projets des autres
  // clients sur une facture invite à l'erreur d'imputation. Le projet déjà
  // sélectionné reste listé, sinon la valeur enregistrée disparaîtrait de
  // l'affichage sans avoir été changée.
  const proposables = projects.filter(
    (project) =>
      clientId === undefined ||
      clientId.length === 0 ||
      project.clientId === clientId ||
      project.id === value,
  );

  if (proposables.length === 0 && !allowNone) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun projet enregistré pour ce client. Crée-le d&rsquo;abord dans
        l&rsquo;onglet Projets.
      </p>
    );
  }

  return (
    <Select
      value={value === undefined || value.length === 0 ? AUCUN : value}
      onValueChange={(suivant) =>
        onChange(suivant === AUCUN ? undefined : suivant)
      }
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Choisir un projet" />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={AUCUN}>{noneLabel}</SelectItem>}
        {proposables.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
