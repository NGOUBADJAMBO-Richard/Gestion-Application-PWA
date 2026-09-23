import React, { useState } from "react";
import { useNavigate } from "react-router";
import { KeyRound, ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { BrandLogo } from "../components/BrandLogo";
import { useTheme } from "../contexts/ThemeContext";
import { RecoveryCodeNotice } from "../components/RecoveryCodeNotice";

type Mode = "setup" | "unlock" | "recover";

export function Login() {
  const {
    status,
    setUp,
    unlock,
    recover,
    pendingRecoveryCode,
    acknowledgeRecoveryCode,
  } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>(
    status === "unconfigured" ? "setup" : "unlock",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      setBusy(true);

      if (mode === "setup") {
        if (password !== confirmation) {
          setError("Les deux mots de passe ne correspondent pas.");
          return;
        }
        await setUp(email.trim(), password);
        return;
      }

      if (mode === "recover") {
        if (password !== confirmation) {
          setError("Les deux mots de passe ne correspondent pas.");
          return;
        }
        await recover(recoveryCode, password);
        return;
      }

      await unlock(password);
      navigate("/", { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Opération impossible. Réessaie.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (pendingRecoveryCode !== null) {
    return (
      <div className="wave-surface min-h-screen flex items-center justify-center p-4">
        <RecoveryCodeNotice
          code={pendingRecoveryCode}
          onAcknowledge={() => {
            acknowledgeRecoveryCode();
            navigate("/", { replace: true });
          }}
        />
      </div>
    );
  }

  const titre =
    mode === "setup"
      ? "Protéger cet appareil"
      : mode === "recover"
        ? "Récupérer l'accès"
        : "Connexion";

  const description =
    mode === "setup"
      ? "Choisis le mot de passe qui ouvrira CodeWave Studio sur cet appareil."
      : mode === "recover"
        ? "Saisis ton code de récupération, puis choisis un nouveau mot de passe."
        : "Saisis ton mot de passe pour ouvrir ton espace.";

  return (
    <div className="wave-surface min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl overflow-hidden border-border/70 surface-card">
        <div className="grid md:grid-cols-[1fr_1.1fr]">
          <div className="brand-gradient p-8 text-white hidden md:flex flex-col justify-between">
            <div>
              <BrandLogo size="lg" showText={false} mode="color" />
              <p className="mt-6 text-2xl font-display font-bold leading-tight">
                Pilotez vos clients, projets et factures depuis un seul espace.
              </p>
            </div>

            <div className="space-y-3 text-sm text-white/85">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Vos données restent sur cet appareil. Aucune n&rsquo;est envoyée
                sur un serveur.
              </p>
              <p>Conçu pour les équipes et les entreprises au Gabon.</p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <CardHeader className="px-0 pt-0">
              <div className="md:hidden mb-4">
                <BrandLogo size="md" mode={theme === "dark" ? "mono" : "color"} />
              </div>
              <CardTitle>{titre}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>

            <CardContent className="px-0 pb-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "setup" && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse e-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="prenom@exemple.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Elle identifie le compte sur cet appareil. Elle n&rsquo;est
                      envoyée nulle part.
                    </p>
                  </div>
                )}

                {mode === "recover" && (
                  <div className="space-y-2">
                    <Label htmlFor="recovery">Code de récupération</Label>
                    <Input
                      id="recovery"
                      required
                      value={recoveryCode}
                      onChange={(event) => setRecoveryCode(event.target.value)}
                      placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {mode === "unlock" ? "Mot de passe" : "Nouveau mot de passe"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete={
                      mode === "unlock" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  {mode !== "unlock" && (
                    <p className="text-xs text-muted-foreground">
                      Au moins 10 caractères. Une phrase facile à retenir fait un
                      bon mot de passe.
                    </p>
                  )}
                </div>

                {mode !== "unlock" && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmation">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmation"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                    />
                  </div>
                )}

                {error !== "" && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={busy} className="w-full">
                  {busy
                    ? "Vérification…"
                    : mode === "setup"
                      ? "Protéger et entrer"
                      : mode === "recover"
                        ? "Récupérer l'accès"
                        : "Se connecter"}
                </Button>

                {status !== "unconfigured" && (
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 text-sm text-primary-ink underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode(mode === "recover" ? "unlock" : "recover");
                      setError("");
                      setPassword("");
                      setConfirmation("");
                    }}
                  >
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    {mode === "recover"
                      ? "Revenir à la connexion"
                      : "Mot de passe oublié ?"}
                  </button>
                )}
              </form>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}
