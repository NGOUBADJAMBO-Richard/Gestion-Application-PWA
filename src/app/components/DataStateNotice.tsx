import { AlertTriangle, Loader2, X } from "lucide-react";

interface DataStateNoticeProps {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onDismiss: () => void;
  /** Nom de la collection, pour un message de chargement explicite. */
  readonly label?: string;
}

/**
 * État de chargement et d'erreur d'une collection.
 *
 * Les erreurs du domaine et du stockage portent déjà un message en français
 * qui dit quoi faire — « exporte une sauvegarde, puis vide la corbeille »,
 * « restaure la dernière sauvegarde ». On les affiche telles quelles plutôt
 * que de les remplacer par « une erreur est survenue », qui n'aide personne.
 *
 * `role="alert"` et `aria-live` font annoncer le message par un lecteur
 * d'écran : une erreur muette pour un utilisateur aveugle est une erreur
 * invisible.
 */
export function DataStateNotice({
  isLoading,
  error,
  onDismiss,
  label = "les données",
}: DataStateNoticeProps) {
  if (error !== null) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
      >
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <p className="flex-1 text-foreground">{error}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Masquer ce message"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <p
        aria-live="polite"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Chargement de {label}…
      </p>
    );
  }

  return null;
}
