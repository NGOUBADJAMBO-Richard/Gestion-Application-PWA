import { AlertTriangle, Ban } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import type { Decision } from "../../domain/rules";

interface ConfirmDeleteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Ce qui va être supprimé, nommé : « la facture FAC-2026-004 ». */
  readonly subject: string;
  /** Décision du domaine. Un refus bloque la suppression et explique pourquoi. */
  readonly decision: Decision;
  /** Conséquence, affichée quand la suppression est possible. */
  readonly consequence?: string;
  readonly onConfirm: () => void;
}

/**
 * Confirmation avant suppression.
 *
 * Jusqu'ici, un seul clic sur l'icône de corbeille supprimait sans rien
 * demander — et sans vérifier qu'on avait le droit. On pouvait effacer un
 * client portant des factures émises, ce qui laisse une comptabilité qui
 * référence un tiers introuvable.
 *
 * La décision vient du domaine : cette fenêtre ne la recalcule pas, elle
 * l'affiche. Quand elle est négative, il n'y a pas de bouton « supprimer
 * quand même » : une règle comptable qu'on peut contourner d'un clic n'est
 * pas une règle.
 */
export function ConfirmDelete({
  open,
  onOpenChange,
  subject,
  decision,
  consequence,
  onConfirm,
}: ConfirmDeleteProps) {
  const refuse = !decision.allowed;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {refuse ? (
              <Ban className="h-5 w-5 text-destructive" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
            )}
            {refuse ? "Suppression impossible" : `Supprimer ${subject} ?`}
          </AlertDialogTitle>

          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {refuse ? (
                <p>{decision.reason}</p>
              ) : (
                <>
                  <p>
                    {consequence ??
                      "L’élément part à la corbeille et reste récupérable."}
                  </p>
                  <p className="text-xs">
                    Cette action peut être annulée depuis la corbeille.
                  </p>
                </>
              )}

              {refuse &&
                decision.blockedBy !== undefined &&
                decision.blockedBy.length > 0 && (
                  <ul className="max-h-32 list-disc overflow-auto pl-5 text-xs">
                    {decision.blockedBy.slice(0, 12).map((identifiant) => (
                      <li key={identifiant}>{identifiant}</li>
                    ))}
                    {decision.blockedBy.length > 12 && (
                      <li>et {decision.blockedBy.length - 12} autre(s)…</li>
                    )}
                  </ul>
                )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>{refuse ? "Fermer" : "Annuler"}</AlertDialogCancel>
          {!refuse && (
            <AlertDialogAction
              onClick={onConfirm}
              className="border-2 border-destructive bg-destructive text-destructive-foreground hover:brightness-110"
            >
              Supprimer
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
