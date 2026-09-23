import { useState } from "react";
import { AlertTriangle, Info, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  type CompanyProfile,
  type VatRate,
  checkProfile,
} from "../../domain/companyProfile";
import { useCompanyProfile } from "../hooks/useCompanyProfile";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";

/**
 * Paramètres de l'entreprise.
 *
 * Tout ce qui est fiscal ou légal se règle ici : aucun taux et aucune mention
 * ne sont codés en dur ailleurs. Changer le taux de TVA ne recalcule pas les
 * factures déjà émises — elles sont figées, c'est le principe.
 */
export function Settings() {
  const { profile, save } = useCompanyProfile();
  const [draft, setDraft] = useState<CompanyProfile>(profile);

  const issues = checkProfile(draft);
  const bloquants = issues.filter((issue) => issue.severity === "blocking");
  const rappels = issues.filter((issue) => issue.severity === "advisory");

  const set = <K extends keyof CompanyProfile>(
    key: K,
    value: CompanyProfile[K],
  ) => setDraft((precedent) => ({ ...precedent, [key]: value }));

  const setVatRate = (index: number, patch: Partial<VatRate>) =>
    setDraft((precedent) => ({
      ...precedent,
      vatRates: precedent.vatRates.map((taux, i) =>
        i === index ? { ...taux, ...patch } : taux,
      ),
    }));

  const handleSave = () => {
    save(draft);
    toast.success("Paramètres enregistrés.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1>Paramètres</h1>
          <p className="mt-1 text-muted-foreground">
            Identité de l&rsquo;entreprise, fiscalité et mentions de facture
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" aria-hidden="true" />
          Enregistrer
        </Button>
      </div>

      {bloquants.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div>
            <p className="font-display font-bold">
              Ces informations manquent pour émettre une facture
            </p>
            <ul className="mt-1 list-disc pl-5">
              {bloquants.map((issue) => (
                <li key={issue.field}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>
            Ce bloc figure en tête de chaque devis et de chaque facture.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Champ label="Raison sociale" id="name">
            <Input
              id="name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Champ>

          <Champ label="Forme juridique" id="legalForm">
            <Input
              id="legalForm"
              value={draft.legalForm ?? ""}
              placeholder="SARL, SA, entreprise individuelle…"
              onChange={(e) => set("legalForm", e.target.value)}
            />
          </Champ>

          <Champ label="Adresse" id="address" className="md:col-span-2">
            <Textarea
              id="address"
              rows={2}
              value={draft.addressLines.join("\n")}
              placeholder={"Quartier, rue\nBoîte postale"}
              onChange={(e) =>
                set("addressLines", e.target.value.split("\n"))
              }
            />
          </Champ>

          <Champ label="Ville" id="city">
            <Input
              id="city"
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Champ>

          <Champ label="Pays" id="country">
            <Input
              id="country"
              value={draft.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </Champ>

          <Champ label="Téléphone" id="phone">
            <Input
              id="phone"
              value={draft.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Champ>

          <Champ label="Adresse e-mail" id="email">
            <Input
              id="email"
              type="email"
              value={draft.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </Champ>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fiscalité</CardTitle>
          <CardDescription>
            Identifiants et taux appliqués aux nouveaux documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className="flex items-start gap-3 border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
            role="note"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p>
              Le taux de 18 % proposé par défaut est le taux gabonais usuel,
              mais il <strong>n&rsquo;a pas été vérifié auprès d&rsquo;une
              source fiscale officielle</strong>. Fais confirmer ce taux et la
              liste des mentions obligatoires par un comptable avant tout usage
              réel.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Champ label="Numéro d'identification fiscale (NIF)" id="taxId">
              <Input
                id="taxId"
                value={draft.taxId ?? ""}
                onChange={(e) => set("taxId", e.target.value)}
              />
            </Champ>

            <Champ label="Registre du commerce (RCCM)" id="tradeRegister">
              <Input
                id="tradeRegister"
                value={draft.tradeRegister ?? ""}
                onChange={(e) => set("tradeRegister", e.target.value)}
              />
            </Champ>

            <Champ label="Régime fiscal" id="taxRegime">
              <Input
                id="taxRegime"
                value={draft.taxRegime ?? ""}
                onChange={(e) => set("taxRegime", e.target.value)}
              />
            </Champ>

            <Champ label="Conservation des pièces (années)" id="retention">
              <Input
                id="retention"
                type="number"
                min={1}
                value={draft.retentionYears}
                onChange={(e) =>
                  set("retentionYears", Number(e.target.value) || 1)
                }
              />
            </Champ>
          </div>

          <fieldset className="space-y-3">
            <legend className="font-display font-bold">Taux de TVA</legend>

            {draft.vatRates.map((taux, index) => (
              <div
                key={`${taux.label}-${index}`}
                className="flex flex-wrap items-end gap-3 border border-border p-3"
              >
                <div className="min-w-40 flex-1">
                  <Label htmlFor={`vat-label-${index}`}>Libellé</Label>
                  <Input
                    id={`vat-label-${index}`}
                    value={taux.label}
                    onChange={(e) => setVatRate(index, { label: e.target.value })}
                  />
                </div>

                <div className="w-28">
                  <Label htmlFor={`vat-percent-${index}`}>Taux %</Label>
                  <Input
                    id={`vat-percent-${index}`}
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={taux.percent}
                    onChange={(e) =>
                      setVatRate(index, { percent: Number(e.target.value) || 0 })
                    }
                  />
                </div>

                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="radio"
                    name="vat-default"
                    checked={taux.isDefault === true}
                    onChange={() =>
                      setDraft((precedent) => ({
                        ...precedent,
                        vatRates: precedent.vatRates.map((t, i) => ({
                          ...t,
                          isDefault: i === index,
                        })),
                      }))
                    }
                  />
                  Par défaut
                </label>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer le taux ${taux.label}`}
                  onClick={() =>
                    setDraft((precedent) => ({
                      ...precedent,
                      vatRates: precedent.vatRates.filter((_t, i) => i !== index),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() =>
                setDraft((precedent) => ({
                  ...precedent,
                  vatRates: [
                    ...precedent.vatRates,
                    { label: "Nouveau taux", percent: 0 },
                  ],
                }))
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter un taux
            </Button>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Numérotation, conditions de règlement et mentions de pied de page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Champ label="Préfixe des devis" id="quotePrefix">
              <Input
                id="quotePrefix"
                value={draft.quotePrefix}
                onChange={(e) => set("quotePrefix", e.target.value.toUpperCase())}
              />
            </Champ>

            <Champ label="Préfixe des factures" id="invoicePrefix">
              <Input
                id="invoicePrefix"
                value={draft.invoicePrefix}
                onChange={(e) => set("invoicePrefix", e.target.value.toUpperCase())}
              />
            </Champ>

            <Champ label="Préfixe des avoirs" id="creditNotePrefix">
              <Input
                id="creditNotePrefix"
                value={draft.creditNotePrefix}
                onChange={(e) =>
                  set("creditNotePrefix", e.target.value.toUpperCase())
                }
              />
            </Champ>
          </div>

          <p className="text-xs text-muted-foreground">
            Changer un préfixe n&rsquo;affecte que les documents à venir. Les
            numéros déjà attribués sont définitifs : les modifier créerait un
            trou dans la séquence comptable.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Champ label="Délai de paiement (jours)" id="paymentTermDays">
              <Input
                id="paymentTermDays"
                type="number"
                min={0}
                value={draft.paymentTermDays}
                onChange={(e) =>
                  set("paymentTermDays", Number(e.target.value) || 0)
                }
              />
            </Champ>

            <Champ label="Conditions de règlement" id="paymentTerms">
              <Input
                id="paymentTerms"
                value={draft.paymentTerms ?? ""}
                onChange={(e) => set("paymentTerms", e.target.value)}
              />
            </Champ>
          </div>

          <Champ label="Coordonnées bancaires / moyens de paiement" id="bankDetails">
            <Textarea
              id="bankDetails"
              rows={2}
              value={draft.bankDetails ?? ""}
              placeholder="Airtel Money, Moov Money, virement, espèces…"
              onChange={(e) => set("bankDetails", e.target.value)}
            />
          </Champ>

          <Champ
            label="Mentions de pied de facture (une par ligne)"
            id="footerMentions"
          >
            <Textarea
              id="footerMentions"
              rows={3}
              value={draft.invoiceFooterMentions.join("\n")}
              onChange={(e) =>
                set("invoiceFooterMentions", e.target.value.split("\n"))
              }
            />
          </Champ>
        </CardContent>
      </Card>

      {rappels.length > 0 && (
        <div className="flex items-start gap-3 border border-border bg-muted/40 px-4 py-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-display font-bold">Rappels</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {rappels.map((issue) => (
                <li key={issue.field}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" aria-hidden="true" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

/** Étiquette et champ associés, pour ne pas répéter la structure partout. */
function Champ({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
