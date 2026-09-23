import { useState } from "react";
import { AlertTriangle, Check, Copy, ShieldCheck } from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface RecoveryCodeNoticeProps {
  readonly code: string;
  readonly onAcknowledge: () => void;
}

/**
 * Remise du code de récupération.
 *
 * Ce code n'est affiché qu'une fois : il n'est pas conservé en clair, seule sa
 * dérivation l'est. L'écran oblige donc à confirmer explicitement qu'il a été
 * noté — sans cette case, on passerait outre en une seconde, et le jour où le
 * mot de passe est oublié, il n'y a plus d'issue.
 */
export function RecoveryCodeNotice({ code, onAcknowledge }: RecoveryCodeNoticeProps) {
  const [confirme, setConfirme] = useState(false);
  const [copie, setCopie] = useState(false);

  const copier = () => {
    void navigator.clipboard
      .writeText(code)
      .then(() => setCopie(true))
      .catch(() => setCopie(false));
  };

  return (
    <Card className="w-full max-w-xl surface-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary-ink" aria-hidden="true" />
          Note ton code de récupération
        </CardTitle>
        <CardDescription>
          C&rsquo;est la seule façon de retrouver l&rsquo;accès si tu oublies ton
          mot de passe. Il ne sera plus jamais affiché.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <p
          className="select-all border-2 border-primary bg-muted/50 px-4 py-4 text-center font-mono text-lg tracking-widest"
          data-testid="recovery-code"
        >
          {code}
        </p>

        <Button variant="outline" onClick={copier} className="w-full gap-2">
          {copie ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" /> Copié
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" /> Copier le code
            </>
          )}
        </Button>

        <p
          role="alert"
          className="flex items-start gap-2 border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <span>
            Écris-le sur papier et range-le ailleurs que sur cet ordinateur. Sans
            lui ni ton mot de passe, les données ne seront plus accessibles.
          </span>
        </p>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={confirme}
            onChange={(event) => setConfirme(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>J&rsquo;ai noté ce code et je l&rsquo;ai rangé en lieu sûr.</span>
        </label>

        <Button disabled={!confirme} onClick={onAcknowledge} className="w-full">
          Entrer dans l&rsquo;application
        </Button>
      </CardContent>
    </Card>
  );
}
