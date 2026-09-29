import { useState } from "react";
import { Check, CircleDashed, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { todayIso } from "../../domain/date";
import { newId } from "../../domain/id";
import {
  MILESTONE_TEMPLATES,
  type Milestone,
  buildFromTemplate,
  milestoneProgress,
  sortMilestones,
  validateMilestone,
} from "../../domain/milestone";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

/**
 * Jalons d'un projet.
 *
 * Le pourcentage d'avancement se remplace ici par une liste de livrables. La
 * différence tient en un geste : on ne déclare plus « 65 % », on coche
 * « Maquettes validées ». L'avancement s'en déduit, et le retard aussi.
 *
 * Les modèles existent parce que saisir sept jalons à la main pour chaque
 * projet revient à ne les saisir pour aucun. Ils se posent en un clic, puis se
 * renomment et se redatent librement.
 */

interface MilestonePanelProps {
  readonly milestones: readonly Milestone[];
  /** Sert de date de départ aux modèles. */
  readonly startDate: string;
  readonly onChange: (milestones: readonly Milestone[]) => void;
}

function dateCourte(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function MilestonePanel({
  milestones,
  startDate,
  onChange,
}: MilestonePanelProps) {
  const [intitule, setIntitule] = useState("");
  const [echeance, setEcheance] = useState(todayIso());
  const [modele, setModele] = useState("");

  const aujourdHui = todayIso();
  const tries = sortMilestones(milestones);
  const avancement = milestoneProgress(milestones, aujourdHui);

  const ajouter = () => {
    const brouillon: Omit<Milestone, "id"> = {
      label: intitule.trim(),
      dueDate: echeance,
    };
    try {
      validateMilestone(brouillon);
    } catch (cause) {
      toast.error("Jalon refusé", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return;
    }
    onChange([...milestones, { ...brouillon, id: newId() }]);
    setIntitule("");
  };

  const poserModele = (id: string) => {
    const choisi = MILESTONE_TEMPLATES.find((candidat) => candidat.id === id);
    if (choisi === undefined) return;
    // Les jalons du modèle s'ajoutent à ceux qui existent plutôt que de les
    // remplacer : écraser un travail déjà saisi sans le demander serait une
    // perte sèche.
    onChange([
      ...milestones,
      ...buildFromTemplate(choisi, startDate || aujourdHui, () => newId()),
    ]);
    setModele("");
    toast.success(`Modèle « ${choisi.label} » posé.`, {
      description: `${choisi.steps.length} jalons ajoutés. Renomme et redate librement.`,
    });
  };

  const basculer = (jalon: Milestone) => {
    onChange(
      milestones.map((candidat) =>
        candidat.id === jalon.id
          ? jalon.doneAt === undefined
            ? { ...candidat, doneAt: aujourdHui }
            : { id: candidat.id, label: candidat.label, dueDate: candidat.dueDate }
          : candidat,
      ),
    );
  };

  const supprimer = (id: string) => {
    onChange(milestones.filter((jalon) => jalon.id !== id));
  };

  const redater = (id: string, dueDate: string) => {
    onChange(
      milestones.map((jalon) => (jalon.id === id ? { ...jalon, dueDate } : jalon)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          {avancement.total === 0 ? (
            <span className="text-muted-foreground">
              Aucun jalon. Pose un modèle, ou ajoute-les un par un.
            </span>
          ) : (
            <>
              <span className="amount">
                {avancement.done} / {avancement.total}
              </span>{" "}
              <span className="text-muted-foreground">livrés</span>
              {avancement.late.length > 0 && (
                <span className="text-destructive">
                  {" "}
                  &middot; {avancement.late.length} en retard
                </span>
              )}
            </>
          )}
        </p>

        <div className="flex items-center gap-2">
          <Select value={modele} onValueChange={poserModele}>
            <SelectTrigger className="w-[190px]" aria-label="Poser un modèle de jalons">
              <Wand2 className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Poser un modèle" />
            </SelectTrigger>
            <SelectContent>
              {MILESTONE_TEMPLATES.map((candidat) => (
                <SelectItem key={candidat.id} value={candidat.id}>
                  {candidat.label} ({candidat.steps.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tries.length > 0 && (
        <ul className="divide-y divide-border border border-border">
          {tries.map((jalon) => {
            const livre = jalon.doneAt !== undefined;
            const enRetard = !livre && jalon.dueDate < aujourdHui;
            return (
              <li
                key={jalon.id}
                className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/50"
              >
                <button
                  type="button"
                  onClick={() => basculer(jalon)}
                  aria-pressed={livre}
                  aria-label={
                    livre
                      ? `Marquer « ${jalon.label} » comme non livré`
                      : `Marquer « ${jalon.label} » comme livré`
                  }
                  className={`flex h-6 w-6 shrink-0 items-center justify-center border transition-colors ${
                    livre
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {livre ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <CircleDashed className="h-4 w-4" />
                  )}
                </button>

                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    livre ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {jalon.label}
                </span>

                {livre ? (
                  <span className="shrink-0 text-xs text-emerald-600 dark:text-emerald-400">
                    livré le {dateCourte(jalon.doneAt as string)}
                  </span>
                ) : (
                  <Input
                    type="date"
                    value={jalon.dueDate}
                    onChange={(event) => redater(jalon.id, event.target.value)}
                    aria-label={`Date prévue de « ${jalon.label} »`}
                    className={`h-8 w-[9.5rem] shrink-0 text-xs ${
                      enRetard ? "border-destructive text-destructive" : ""
                    }`}
                  />
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => supprimer(jalon.id)}
                  aria-label={`Supprimer le jalon « ${jalon.label} »`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={intitule}
          onChange={(event) => setIntitule(event.target.value)}
          onKeyDown={(event) => {
            // Entrée ajoute le jalon sans valider le formulaire du projet :
            // sans cela, taper Entrée ici enregistrerait et fermerait tout.
            if (event.key === "Enter") {
              event.preventDefault();
              ajouter();
            }
          }}
          placeholder="Recette client"
          aria-label="Intitulé du jalon"
          className="flex-1"
        />
        <Input
          type="date"
          value={echeance}
          onChange={(event) => setEcheance(event.target.value)}
          aria-label="Date prévue du jalon"
          className="sm:w-[11rem]"
        />
        <Button type="button" variant="outline" onClick={ajouter} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}

interface MilestoneDialogProps {
  readonly open: boolean;
  readonly projectName: string;
  readonly milestones: readonly Milestone[];
  readonly startDate: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (milestones: readonly Milestone[]) => void;
}

/** Gestion des jalons hors du formulaire de projet, depuis la liste. */
export function MilestoneDialog({
  open,
  projectName,
  milestones,
  startDate,
  onOpenChange,
  onSave,
}: MilestoneDialogProps) {
  const [brouillon, setBrouillon] = useState<readonly Milestone[]>(milestones);
  const [ancre, setAncre] = useState(milestones);

  // Rouvrir sur un autre projet doit repartir de ses jalons, pas de ceux du
  // précédent. On compare la source plutôt que de dépendre d'un effet.
  if (ancre !== milestones) {
    setAncre(milestones);
    setBrouillon(milestones);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Jalons — {projectName}</DialogTitle>
          <DialogDescription>
            L&rsquo;avancement se déduit des jalons livrés. Il ne se saisit plus :
            un pourcentage écrit à la main est une impression, pas une mesure.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <MilestonePanel
            milestones={brouillon}
            startDate={startDate}
            onChange={setBrouillon}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              onSave(brouillon);
              onOpenChange(false);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Résumé compact pour une ligne de tableau. */
export function MilestoneSummary({
  milestones,
}: {
  readonly milestones: readonly Milestone[];
}) {
  const avancement = milestoneProgress(milestones, todayIso());

  if (avancement.total === 0) {
    return (
      <span className="text-sm text-muted-foreground">Aucun jalon défini</span>
    );
  }

  const jours = avancement.daysToNext ?? 0;

  return (
    <div className="min-w-0">
      <p className="text-sm">
        <span className="amount">
          {avancement.done} / {avancement.total}
        </span>{" "}
        <span className="text-muted-foreground">livrés</span>
      </p>
      {avancement.allDone ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Tous les jalons livrés
        </p>
      ) : (
        avancement.next !== null && (
          <p
            className={`truncate text-xs ${
              jours < 0 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {avancement.next.label} &middot;{" "}
            {jours < 0
              ? `en retard de ${-jours} j`
              : jours === 0
                ? "aujourd'hui"
                : `dans ${jours} j`}
          </p>
        )
      )}
    </div>
  );
}

/** Jauge dérivée des jalons, pour les écrans qui veulent une barre. */
export function MilestoneBar({
  milestones,
}: {
  readonly milestones: readonly Milestone[];
}) {
  const avancement = milestoneProgress(milestones, todayIso());
  if (avancement.donePercent === null) return null;

  return (
    <div
      className="meter"
      role="meter"
      aria-valuenow={avancement.done}
      aria-valuemin={0}
      aria-valuemax={avancement.total}
      aria-label={`${avancement.done} jalons livrés sur ${avancement.total}`}
    >
      <span
        style={{
          width: `${avancement.donePercent}%`,
          ["--meter-fill" as string]:
            avancement.late.length > 0 ? "var(--warning)" : "var(--primary)",
        }}
      />
    </div>
  );
}
