import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, HardDrive, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  type BackupPreview,
  backupFileName,
  createBackup,
  parseBackup,
  previewBackup,
  serializeBackup,
} from "../../infra/backup";
import { readStorageHealth, requestPersistentStorage } from "../../infra/repository";
import { readAllCollections, restoreAllCollections } from "../data/repositories";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const APP_VERSION = "2.0.0";
/** Au-delà de ce taux d'occupation, on alerte avant la saturation. */
const SEUIL_ALERTE = 0.8;

interface PendingImport {
  readonly fileName: string;
  readonly preview: BackupPreview;
  readonly collections: Record<string, readonly unknown[]>;
}

/**
 * Sauvegarde et restauration.
 *
 * Toutes les données de l'agence vivent dans ce navigateur. Vider les données
 * du site, changer de machine ou réinstaller le système les efface. Cet écran
 * est la seule protection qui existe contre cette perte — d'où sa place dans
 * « Mon compte » plutôt que dans un réglage avancé.
 */
export function BackupPanel() {
  const [health, setHealth] = useState<{ used: number; quota: number; ratio: number; persisted: boolean } | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let annule = false;
    void readStorageHealth().then((etat) => {
      if (!annule) {
        setHealth({
          used: etat.usedBytes,
          quota: etat.quotaBytes,
          ratio: etat.ratio,
          persisted: etat.persisted,
        });
      }
    });
    return () => {
      annule = true;
    };
  }, []);

  const handleExport = async () => {
    setBusy(true);
    try {
      const collections = await readAllCollections();
      const enveloppe = await createBackup(collections, APP_VERSION);
      const blob = new Blob([serializeBackup(enveloppe)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = backupFileName();
      lien.click();
      URL.revokeObjectURL(url);

      toast.success("Sauvegarde exportée.", {
        description: "Range ce fichier ailleurs que sur cet appareil.",
      });
    } catch (cause) {
      toast.error("L'export a échoué.", { description: messageOf(cause) });
    } finally {
      setBusy(false);
    }
  };

  const handleFileChosen = async (file: File) => {
    setBusy(true);
    try {
      const enveloppe = await parseBackup(await file.text());
      const actuel = await readAllCollections();
      setPending({
        fileName: file.name,
        preview: previewBackup(enveloppe, actuel),
        collections: enveloppe.collections,
      });
    } catch (cause) {
      toast.error("Sauvegarde refusée.", { description: messageOf(cause) });
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (pending === null) return;
    setBusy(true);
    try {
      await restoreAllCollections(pending.collections);
      setPending(null);
      toast.success("Sauvegarde restaurée.");
    } catch (cause) {
      toast.error("La restauration a échoué.", { description: messageOf(cause) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" aria-hidden="true" />
          Données et sauvegarde
        </CardTitle>
        <CardDescription>
          Toutes les données de l&rsquo;agence sont enregistrées dans ce
          navigateur, et nulle part ailleurs. Vider les données du site ou
          changer d&rsquo;appareil les efface définitivement.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleExport()} disabled={busy} className="gap-2">
            <Download className="h-4 w-4" aria-hidden="true" />
            Exporter une sauvegarde
          </Button>

          <Button
            variant="outline"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Restaurer un fichier
          </Button>

          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Choisir un fichier de sauvegarde"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFileChosen(file);
            }}
          />
        </div>

        {health !== null && (
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Espace utilisé : <strong className="text-foreground">{formatBytes(health.used)}</strong>
              {health.quota > 0 && <> sur {formatBytes(health.quota)}</>}
            </p>

            {health.ratio >= SEUIL_ALERTE && (
              <p role="alert" className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Le stockage est presque saturé. Exporte une sauvegarde, puis vide
                la corbeille.
              </p>
            )}

            {!health.persisted && (
              <p className="text-muted-foreground">
                Ces données peuvent être effacées par le navigateur s&rsquo;il
                manque d&rsquo;espace.{" "}
                <button
                  type="button"
                  className="text-primary-ink underline underline-offset-2"
                  onClick={() => {
                    void requestPersistentStorage().then((accorde) => {
                      setHealth((etat) => (etat ? { ...etat, persisted: accorde } : etat));
                      toast[accorde ? "success" : "error"](
                        accorde
                          ? "Conservation durable accordée."
                          : "Le navigateur a refusé la conservation durable.",
                      );
                    });
                  }}
                >
                  Demander leur conservation durable
                </button>
              </p>
            )}
          </div>
        )}

        {pending !== null && (
          <div
            role="alert"
            className="space-y-3 border border-border bg-muted/40 p-4 text-sm"
          >
            <p className="font-display font-bold">
              Confirmer la restauration de {pending.fileName}
            </p>
            <p className="text-muted-foreground">
              Sauvegarde du {new Date(pending.preview.exportedAt).toLocaleString("fr-FR")}
            </p>

            <ul className="space-y-1">
              {pending.preview.diffs.map((diff) => (
                <li key={diff.collection}>
                  <strong className="text-foreground">{diff.collection}</strong>{" "}
                  : {diff.overwritten} écrasé(s), {diff.added} ajouté(s),{" "}
                  <span className={diff.lost > 0 ? "text-destructive" : undefined}>
                    {diff.lost} perdu(s)
                  </span>
                </li>
              ))}
            </ul>

            {pending.preview.hasLosses && (
              <p className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Des données présentes uniquement sur cet appareil seront perdues.
                Exporte d&rsquo;abord une sauvegarde de l&rsquo;état actuel.
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Button onClick={() => void handleConfirmImport()} disabled={busy}>
                Restaurer
              </Button>
              <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function messageOf(cause: unknown): string {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  return "Erreur inattendue.";
}
