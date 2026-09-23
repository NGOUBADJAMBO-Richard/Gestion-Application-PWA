import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "./ui/input";

interface PasswordInputProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly autoComplete?: "current-password" | "new-password";
  readonly required?: boolean;
  readonly placeholder?: string;
}

/**
 * Champ de mot de passe avec bascule d'affichage.
 *
 * Masquer la saisie protège d'un regard par-dessus l'épaule, mais rend la
 * frappe impossible à relire — au moment précis où l'on définit un mot de
 * passe qu'il faudra retenir, ou quand une tentative échoue sans qu'on sache
 * si c'est une faute de frappe. La bascule laisse l'utilisateur décider.
 *
 * L'état revient toujours à « masqué » au montage : révéler doit être un
 * geste délibéré, jamais l'état par défaut.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "current-password",
  required = false,
  placeholder,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const descriptionId = useId();

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        required={required}
        autoComplete={autoComplete}
        aria-describedby={descriptionId}
        onChange={(event) => onChange(event.target.value)}
        className="pr-11"
        {...(placeholder === undefined ? {} : { placeholder })}
      />

      <button
        type="button"
        onClick={() => setVisible((precedent) => !precedent)}
        // aria-pressed dit l'état, pas seulement l'action : un lecteur d'écran
        // doit pouvoir annoncer si le mot de passe est actuellement visible.
        aria-pressed={visible}
        aria-label={
          visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
        }
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      <span id={descriptionId} className="sr-only">
        {visible
          ? "Le mot de passe est actuellement visible à l’écran."
          : "Le mot de passe est masqué."}
      </span>
    </div>
  );
}
