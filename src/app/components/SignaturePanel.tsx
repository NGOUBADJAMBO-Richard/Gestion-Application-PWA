import { useRef, useState } from "react";
import { PenLine, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import type { CompanyProfile } from "../../domain/companyProfile";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

/**
 * Signature portée sur les documents commerciaux.
 *
 * Un devis sans signature n'engage personne : le client ne sait ni qui lui
 * écrit, ni à qui répondre. Le nom et la qualité sont toujours imprimés ;
 * l'image manuscrite, facultative, vient par-dessus.
 *
 * ## Pourquoi une limite de taille
 *
 * L'image est rangée avec le profil, dans le stockage du navigateur, dont le
 * quota se compte en mégaoctets pour **toutes** les données de l'application.
 * Une photo de signature prise au téléphone pèse deux à cinq mégaoctets : la
 * conserver telle quelle remplirait le quota et ferait échouer l'enregistrement
 * du profil entier, factures comprises. On la redimensionne donc avant de la
 * ranger, et on refuse ce qui ne peut pas l'être.
 */

/** Largeur maximale retenue, en pixels. Au-delà, le PDF n'y gagne rien. */
const LARGEUR_MAX = 600;

/** Taille maximale du fichier accepté en entrée, avant redimensionnement. */
const POIDS_MAX_OCTETS = 4 * 1024 * 1024;

/**
 * Redimensionne et réencode en PNG.
 *
 * Le PNG conserve la transparence : une signature scannée sur fond blanc
 * masquerait le cadre du PDF, alors qu'un PNG détouré s'y pose proprement.
 */
async function preparerSignature(fichier: File): Promise<string> {
  if (fichier.size > POIDS_MAX_OCTETS) {
    throw new Error(
      "Image trop lourde (plus de 4 Mo). Prends une photo plus légère, ou recadre-la.",
    );
  }

  const source = await new Promise<string>((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(String(lecteur.result));
    lecteur.onerror = () => reject(new Error("Lecture du fichier impossible."));
    lecteur.readAsDataURL(fichier);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () =>
      reject(new Error("Ce fichier n'est pas une image exploitable."));
    element.src = source;
  });

  const ratio = Math.min(1, LARGEUR_MAX / Math.max(1, image.naturalWidth));
  const largeur = Math.max(1, Math.round(image.naturalWidth * ratio));
  const hauteur = Math.max(1, Math.round(image.naturalHeight * ratio));

  const toile = document.createElement("canvas");
  toile.width = largeur;
  toile.height = hauteur;
  const contexte = toile.getContext("2d");
  if (contexte === null) {
    throw new Error("Le navigateur n'a pas pu préparer l'image.");
  }
  contexte.drawImage(image, 0, 0, largeur, hauteur);

  return toile.toDataURL("image/png");
}

interface SignaturePanelProps {
  readonly draft: CompanyProfile;
  readonly set: <K extends keyof CompanyProfile>(
    cle: K,
    valeur: CompanyProfile[K],
  ) => void;
}

export function SignaturePanel({ draft, set }: SignaturePanelProps) {
  const champFichier = useRef<HTMLInputElement>(null);
  const [occupe, setOccupe] = useState(false);

  const choisir = async (fichier: File) => {
    setOccupe(true);
    try {
      const prepare = await preparerSignature(fichier);
      set("signatureDataUrl", prepare);
      toast.success("Signature enregistrée.", {
        description: "Elle apparaîtra sur les devis, factures et avoirs.",
      });
    } catch (cause) {
      toast.error("Signature refusée", {
        description: cause instanceof Error ? cause.message : undefined,
      });
    } finally {
      setOccupe(false);
      // Sans cette remise à zéro, rechoisir le même fichier après une erreur
      // ne déclencherait aucun événement.
      if (champFichier.current !== null) champFichier.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="signatoryName">Nom du signataire</Label>
          <Input
            id="signatoryName"
            value={draft.signatoryName}
            onChange={(event) => set("signatoryName", event.target.value)}
            placeholder="Richard Ngoubadjambo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signatoryRole">Qualité</Label>
          <Input
            id="signatoryRole"
            value={draft.signatoryRole}
            onChange={(event) => set("signatoryRole", event.target.value)}
            placeholder="Gérant"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Signature manuscrite</Label>

        {draft.signatureDataUrl !== undefined &&
        draft.signatureDataUrl.length > 0 ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="border border-border bg-white p-2">
              {/* Fond blanc imposé : une signature noire sur le fond sombre de
                  l'application serait invisible, alors qu'elle s'imprimera
                  bien sur le PDF. */}
              <img
                src={draft.signatureDataUrl}
                alt="Signature enregistrée"
                className="h-16 w-auto object-contain"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => set("signatureDataUrl", undefined)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
              Retirer
            </Button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Aucune image. Le nom et la qualité suffisent à identifier le
            signataire.
          </p>
        )}

        <input
          ref={champFichier}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          onChange={(event) => {
            const fichier = event.target.files?.[0];
            if (fichier !== undefined) void choisir(fichier);
          }}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={occupe}
          onClick={() => champFichier.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {occupe ? "Préparation…" : "Choisir une image"}
        </Button>

        <p className="text-xs text-muted-foreground">
          PNG ou JPEG, 4 Mo au plus. L&rsquo;image est redimensionnée avant
          d&rsquo;être rangée : elle partage le quota du navigateur avec toutes
          les données de l&rsquo;application. Un PNG détouré rend mieux
          qu&rsquo;un scan sur fond blanc.
        </p>
      </div>
    </div>
  );
}
