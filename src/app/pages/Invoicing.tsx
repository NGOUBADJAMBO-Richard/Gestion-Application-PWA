import React, { useState } from "react";
import {
  Download,
  FileOutput,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { todayIso } from "../../domain/date";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import type { Invoice, InvoiceItem } from "../data/mockData";
import { invoiceRepository } from "../data/repositories";
import { useCollection } from "../hooks/useCollection";
import { DataStateNotice } from "../components/DataStateNotice";
import { ClientSelect } from "../components/ClientSelect";
import { useClientIndex } from "../hooks/useClientIndex";
import { useCompanyProfile } from "../hooks/useCompanyProfile";
import { defaultVatPercent } from "../../domain/companyProfile";
import { nextNumber } from "../../domain/numbering";
import { addDays } from "../../domain/date";
import {
  canDeleteDocument,
  canEditDocument,
  canIssueCreditNote,
} from "../../domain/rules";
import { daysOverdue, effectiveStatus } from "../../domain/invoiceStatus";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { computeDocumentTotals } from "../../domain/invoice";
import { money } from "../../domain/money";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { formatCurrencyXAF } from "../utils/currency";

/** Filtres de la liste. Un compteur par état évite d’avoir à ouvrir chacun. */
/** Natures de document. Chacune a sa séquence de numérotation. */
const NATURES = [
  { valeur: "invoice", libelle: "Factures", prefixe: "FAC" },
  { valeur: "quote", libelle: "Devis", prefixe: "DEV" },
  { valeur: "creditNote", libelle: "Avoirs", prefixe: "AV" },
] as const;

const FILTRES = [
  { valeur: "all", cle: "invoicing.all" },
  { valeur: "draft", cle: "invoicing.draft" },
  { valeur: "pending", cle: "invoicing.pending" },
  { valeur: "overdue", cle: "invoicing.overdue" },
  { valeur: "paid", cle: "invoicing.paid" },
  { valeur: "cancelled", cle: "invoicing.cancelled" },
] as const;

export function Invoicing() {
  const { t } = useLanguage();
  // Les donnees vivent dans le depot : la saisie survit au rechargement.
  const {
    items: invoices,
    isLoading,
    error,
    create,
    update,
    remove,
    dismissError,
  } = useCollection(invoiceRepository);
  const { nameOf } = useClientIndex();
  const { profile } = useCompanyProfile();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [natureFilter, setNatureFilter] =
    useState<Invoice["kind"]>("invoice");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [pdfPendingId, setPdfPendingId] = useState<string | null>(null);
  const [factureASupprimer, setFactureASupprimer] = useState<Invoice | null>(null);

  /**
   * jsPDF pèse 455 ko (148 ko compressés) et ne sert qu'au clic sur
   * « télécharger ». Un import dynamique le sort du chargement initial :
   * le module n'arrive qu'au premier PDF réellement demandé.
   */
  const handleDownloadPdf = async (invoice: Invoice) => {
    setPdfPendingId(invoice.id);
    try {
      const { generateInvoicePDF } = await import("../utils/pdfGenerator");
      generateInvoicePDF(invoice, nameOf(invoice.clientId));
    } catch (error) {
      console.error("Génération du PDF impossible", error);
      toast.error("Le PDF n'a pas pu être généré.", {
        description: "Vérifie que la facture est complète, puis réessaie.",
      });
    } finally {
      setPdfPendingId(null);
    }
  };
  // Le taux vient des Paramètres : aucun taux fiscal n’est écrit en dur ici.
  const createEmptyItem = (idSeed = Date.now().toString()): InvoiceItem => ({
    id: idSeed,
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: defaultVatPercent(profile),
  });

  /**
   * Totaux de la facture, calculés par le domaine.
   *
   * Le calcul qui vivait ici arrondissait trois fois de façon indépendante :
   * le sous-total, la TVA, puis leur somme. Le pied de facture ne se
   * recomposait pas — 3,5 x 1 XAF à 18 % affichait sous-total 4, TVA 1 et
   * total 4. computeDocumentTotals garantit HT + TVA = TTC par construction.
   *
   * Une saisie en cours peut être invalide (quantité vide, prix négatif) : on
   * n’affiche pas un total faux, on renvoie zéro et on laisse la validation
   * du formulaire faire son travail.
  */
  const calculateInvoiceTotals = (items: InvoiceItem[]) => {
    try {
      const totaux = computeDocumentTotals(
        items.map((item) => ({
          id: item.id,
          label: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: money(Math.round(Number(item.unitPrice) || 0), profile.currency),
          discountPercent: 0,
          vatRatePercent: Number(item.taxRate) || 0,
        })),
        profile.currency,
      );
      return {
        subtotal: totaux.subtotal.amount,
        taxAmount: totaux.totalVat.amount,
        total: totaux.total.amount,
      };
    } catch {
      return { subtotal: 0, taxAmount: 0, total: 0 };
    }
  };
  const [formData, setFormData] = useState<Omit<Invoice, "id">>({
    number: "",
    kind: "invoice",
    clientId: "",
    items: [createEmptyItem("item-1")],
    amount: 0,
    status: "draft",
    date: "",
    dueDate: "",
    paymentMethod: "bank-transfer",
    paymentTerms: "Paiement sous 30 jours",
    notes: "",
  });

  const previewTotals = calculateInvoiceTotals(formData.items);

  const aujourdHui = todayIso();

  /** Statut reel : le retard se deduit de l echeance, sans ecriture en base. */
  const statutDe = (facture: Invoice) => effectiveStatus(facture, aujourdHui);

  const documentsDeLaNature = invoices.filter(
    (facture) => facture.kind === natureFilter,
  );

  const filteredInvoices =
    statusFilter === "all"
      ? documentsDeLaNature
      : documentsDeLaNature.filter(
          (facture) => statutDe(facture) === statusFilter,
        );

  const getStatusColor = (status: Invoice["status"]) => {
    switch (status) {
      case "paid":
        return "bg-success/10 text-success border-success/20";
      case "pending":
        return "bg-warning/10 text-warning border-warning/20";
      case "overdue":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "cancelled":
        return "bg-muted text-muted-foreground border-border line-through";
      case "draft":
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  /**
   * Trois montants distincts plutôt qu’un total unique.
   *
   * Additionner le payé, l’attendu et le retard dans une seule somme ne
   * répond à aucune question : on veut savoir ce qui est rentré, ce qui doit
   * rentrer, et ce qui aurait déjà dû rentrer.
   */
  const resume = filteredInvoices.reduce(
    (cumul, facture) => {
      const statut = statutDe(facture);
      if (statut === "paid") cumul.encaisse += facture.amount;
      if (statut === "pending") cumul.attendu += facture.amount;
      if (statut === "overdue") cumul.retard += facture.amount;
      return cumul;
    },
    { encaisse: 0, attendu: 0, retard: 0 },
  );

  const handleCreate = (kind: Invoice["kind"] = "invoice") => {
    setEditingInvoice(null);
    setFormData({
      kind,
      // Pas de numero : il est attribue a l emission, jamais a la creation.
      // Le calcul precedent utilisait invoices.length + 1, qui reattribue un
      // numero deja pris des qu une facture est supprimee.
      number: "",
      clientId: "",
      items: [
        {
          ...createEmptyItem(),
          description: "Prestation de services",
        },
      ],
      amount: 0,
      status: "draft",
      date: todayIso(),
      // Un devis porte une date de validité, une facture une échéance de
      // règlement : les deux se rangent dans le même champ.
      dueDate: addDays(
        todayIso(),
        kind === "quote" ? 30 : profile.paymentTermDays,
      ),
      paymentMethod: "bank-transfer",
      paymentTerms: "Paiement sous 30 jours",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      number: invoice.number,
      kind: invoice.kind,
      ...(invoice.cancels === undefined ? {} : { cancels: invoice.cancels }),
      ...(invoice.convertedFrom === undefined
        ? {}
        : { convertedFrom: invoice.convertedFrom }),
      clientId: invoice.clientId,
      items: invoice.items.map((item) => ({ ...item })),
      amount: invoice.amount,
      status: invoice.status,
      date: invoice.date,
      dueDate: invoice.dueDate,
      paymentMethod: invoice.paymentMethod,
      paymentTerms: invoice.paymentTerms,
      notes: invoice.notes || "",
    });
    setIsDialogOpen(true);
  };

  /**
   * Emission.
   *
   * Le numero nest attribue quici, a partir des numeros deja pris, et jamais
   * a la creation du brouillon : un brouillon abandonne ne doit pas laisser
   * de trou dans la sequence.
   */
  const handleIssue = (invoice: Invoice) => {
    const numero = nextNumber(
      invoices.map((facture) => facture.number),
      invoice.kind,
      Number(invoice.date.slice(0, 4)) || new Date().getFullYear(),
    );
    void update(invoice.id, { number: numero, status: "pending" }).then(() => {
      // Émettre un avoir annule la facture qu’il désigne : sans cela, la
      // créance resterait au restant dû alors qu’elle a été neutralisée.
      if (invoice.kind === "creditNote" && invoice.cancels !== undefined) {
        const annulee = invoices.find(
          (facture) => facture.number === invoice.cancels,
        );
        if (annulee !== undefined) {
          void update(annulee.id, { status: "cancelled" });
        }
      }

      toast.success(`Document ${numero} émis.`, {
        description: "Il ne peut plus être modifié ni supprimé.",
      });
    });
  };

  /**
   * Conversion d’un devis accepté en facture.
   *
   * Le devis n’est pas transformé : il reste en place, accepté, et la facture
   * garde une référence vers lui. Un devis qui disparaîtrait en devenant
   * facture rendrait impossible de justifier ce qui avait été proposé.
   */
  const handleConvertToInvoice = (devis: Invoice) => {
    void create({
      number: "",
      kind: "invoice",
      convertedFrom: devis.number || devis.id,
      clientId: devis.clientId,
      items: devis.items.map((ligne) => ({ ...ligne })),
      amount: devis.amount,
      status: "draft",
      date: todayIso(),
      dueDate: addDays(todayIso(), profile.paymentTermDays),
      paymentMethod: devis.paymentMethod,
      paymentTerms: devis.paymentTerms,
      notes: devis.notes ?? "",
    }).then(() => {
      setNatureFilter("invoice");
      toast.success("Facture créée depuis le devis.", {
        description: "Elle est en brouillon : vérifie-la avant de l’émettre.",
      });
    });
  };

  /**
   * Avoir d’annulation.
   *
   * Les lignes sont reprises au négatif : la somme de la facture et de son
   * avoir vaut exactement zéro, ce qu’un test du domaine vérifie.
   */
  const handleCreateCreditNote = (facture: Invoice) => {
    const decision = canIssueCreditNote(
      { status: facture.status === "draft" ? "draft" : "issued" },
      [],
    );
    if (!decision.allowed) {
      toast.error("Avoir impossible", { description: decision.reason });
      return;
    }
    if (facture.status === "cancelled") {
      toast.error("Avoir impossible", {
        description:
          "Cette facture est déjà annulée. Un second avoir annulerait deux fois le même montant.",
      });
      return;
    }

    void create({
      number: "",
      kind: "creditNote",
      cancels: facture.number || facture.id,
      clientId: facture.clientId,
      items: facture.items.map((ligne) => ({
        ...ligne,
        unitPrice: -ligne.unitPrice,
      })),
      amount: -facture.amount,
      status: "draft",
      date: todayIso(),
      dueDate: todayIso(),
      paymentMethod: facture.paymentMethod,
      paymentTerms: facture.paymentTerms,
      notes: `Annulation de la facture ${facture.number}`,
    }).then(() => {
      setNatureFilter("creditNote");
      toast.success("Avoir créé en brouillon.", {
        description: `Il annulera la facture ${facture.number} à son émission.`,
      });
    });
  };

  const handleEditGuarded = (invoice: Invoice) => {
    const decision = canEditDocument(
      invoice.status === "draft" ? "draft" : "issued",
    );
    if (!decision.allowed) {
      toast.error("Modification impossible", { description: decision.reason });
      return;
    }
    handleEdit(invoice);
  };

  const handleItemChange = (
    itemId: string,
    field: keyof Omit<InvoiceItem, "id">,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        if (field === "description") {
          return { ...item, description: String(value) };
        }

        const numericValue = Number(value) || 0;
        if (field === "quantity") {
          return { ...item, quantity: Math.max(1, numericValue) };
        }
        if (field === "unitPrice") {
          return { ...item, unitPrice: Math.max(0, numericValue) };
        }
        return { ...item, taxRate: Math.min(100, Math.max(0, numericValue)) };
      }),
    }));
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items:
        prev.items.length > 1
          ? prev.items.filter((item) => item.id !== itemId)
          : prev.items,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Omit<Invoice, "id"> = {
      number: formData.number.trim(),
      kind: formData.kind,
      ...(formData.cancels === undefined ? {} : { cancels: formData.cancels }),
      ...(formData.convertedFrom === undefined
        ? {}
        : { convertedFrom: formData.convertedFrom }),
      clientId: formData.clientId,
      items: formData.items.map((item) => ({
        ...item,
        description: item.description.trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        taxRate: Math.min(100, Math.max(0, Number(item.taxRate) || 0)),
      })),
      amount: 0,
      status: formData.status,
      date: formData.date,
      dueDate: formData.dueDate,
      paymentMethod: formData.paymentMethod,
      paymentTerms: formData.paymentTerms.trim(),
      notes: formData.notes?.trim() || "",
    };

    const totals = calculateInvoiceTotals(payload.items);
    payload.amount = totals.total;

    const hasInvalidItem = payload.items.some((item) => !item.description);

    if (
      !payload.number ||
      !payload.clientId ||
      payload.items.length === 0 ||
      hasInvalidItem ||
      !payload.date ||
      !payload.dueDate ||
      !payload.paymentTerms
    ) {
      return;
    }

    if (editingInvoice) {
      void update(editingInvoice.id, payload);
    } else {
      void create(payload);
    }

    setIsDialogOpen(false);
    setEditingInvoice(null);
  };

  return (
    <div className="space-y-6">
      <DataStateNotice
        isLoading={isLoading}
        error={error}
        onDismiss={dismissError}
        label="les factures"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1>{t("invoicing.title")}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{filteredInvoices.length} document(s)</span>
            <span aria-hidden="true">&middot;</span>
            <span>
              <span className="text-success">
                {formatCurrencyXAF(resume.encaisse)}
              </span>{" "}
              encaissé
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>
              <span className="text-warning">
                {formatCurrencyXAF(resume.attendu)}
              </span>{" "}
              attendu
            </span>
            {resume.retard > 0 && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span>
                  <span className="text-destructive">
                    {formatCurrencyXAF(resume.retard)}
                  </span>{" "}
                  en retard
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleCreate("quote")}
          >
            <Plus className="w-4 h-4" />
            Nouveau devis
          </Button>
          <Button className="gap-2" onClick={() => handleCreate("invoice")}>
            <Plus className="w-4 h-4" />
            {t("invoicing.new")}
          </Button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Nature du document"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {NATURES.map((nature) => {
          const actif = natureFilter === nature.valeur;
          const compte = invoices.filter(
            (facture) => facture.kind === nature.valeur,
          ).length;

          return (
            <button
              key={nature.valeur}
              type="button"
              role="tab"
              aria-selected={actif}
              onClick={() => {
                setNatureFilter(nature.valeur);
                setStatusFilter("all");
              }}
              className={`-mb-px border-b-2 px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.04em] transition-colors ${
                actif
                  ? "border-primary text-primary-ink"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {nature.libelle}
              <span className="ml-2 tabular-nums opacity-70">{compte}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-6">
          {FILTRES.map((filtre) => {
            const actif = statusFilter === filtre.valeur;
            const compte =
              filtre.valeur === "all"
                ? documentsDeLaNature.length
                : documentsDeLaNature.filter(
                    (facture) => statutDe(facture) === filtre.valeur,
                  ).length;

            return (
              <button
                key={filtre.valeur}
                type="button"
                className="filter-pill"
                aria-pressed={actif}
                onClick={() => setStatusFilter(filtre.valeur)}
              >
                {t(filtre.cle)}
                <span className="ml-2 tabular-nums opacity-70">{compte}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("invoicing.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoicing.number")}</TableHead>
                  <TableHead>{t("projects.client")}</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead>{t("invoicing.amount")}</TableHead>
                  <TableHead>{t("invoicing.date")}</TableHead>
                  <TableHead>{t("invoicing.dueDate")}</TableHead>
                  <TableHead>{t("projects.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <div>
                        {invoice.number === "" ? (
                          <span className="text-muted-foreground">
                            Sans numéro
                          </span>
                        ) : (
                          invoice.number
                        )}
                      </div>
                      <div className="max-w-[240px] truncate text-xs text-muted-foreground">
                        {invoice.cancels !== undefined
                          ? `Annule ${invoice.cancels}`
                          : invoice.convertedFrom !== undefined
                            ? `Issu du devis ${invoice.convertedFrom}`
                            : (invoice.items[0]?.description ?? "—")}
                      </div>
                    </TableCell>
                    <TableCell>{nameOf(invoice.clientId)}</TableCell>
                    <TableCell>{invoice.items.length} ligne(s)</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrencyXAF(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate === ""
                        ? "—"
                        : new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
                      {daysOverdue(invoice, aujourdHui) > 0 && (
                        <span className="block text-xs text-destructive">
                          {daysOverdue(invoice, aujourdHui)} jour(s) de retard
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(statutDe(invoice))}>
                        {t(`invoicing.${statutDe(invoice)}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {invoice.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => handleIssue(invoice)}
                            className="mr-1"
                            title="Attribuer un numéro et émettre le document"
                          >
                            {t("invoicing.issue")}
                          </Button>
                        )}

                        {invoice.kind === "quote" &&
                          invoice.status !== "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-1 gap-1"
                              onClick={() => handleConvertToInvoice(invoice)}
                              title="Créer une facture reprenant ce devis"
                            >
                              <FileOutput className="h-4 w-4" />
                              Facturer
                            </Button>
                          )}

                        {invoice.kind === "invoice" &&
                          invoice.status !== "draft" &&
                          invoice.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-1"
                              onClick={() => handleCreateCreditNote(invoice)}
                              aria-label={`Émettre un avoir pour ${invoice.number}`}
                              title="Annuler cette facture par un avoir"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGuarded(invoice)}
                          aria-label={`Modifier la facture ${invoice.number || "en brouillon"}`}
                          disabled={invoice.status !== "draft"}
                          title={
                            invoice.status === "draft"
                              ? "Modifier ce brouillon"
                              : "Une facture émise ne se modifie plus : émets un avoir"
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFactureASupprimer(invoice)}
                          aria-label={`Supprimer la facture ${invoice.number || "en brouillon"}`}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDownloadPdf(invoice)}
                          aria-label={`Télécharger le PDF de la facture ${invoice.number}`}
                          disabled={pdfPendingId === invoice.id}
                          title="Télécharger PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingInvoice(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? t("common.edit") : t("invoicing.new")}
              </DialogTitle>
              <DialogDescription>{t("invoicing.manageData")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-number">
                    {t("invoicing.number")}
                  </Label>
                  <Input
                    id="invoice-number"
                    value={formData.number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        number: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-status">{t("projects.status")}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Invoice["status"]) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger id="invoice-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">
                        {t("invoicing.paid")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("invoicing.pending")}
                      </SelectItem>
                      <SelectItem value="overdue">
                        {t("invoicing.overdue")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-client">{t("projects.client")}</Label>
                <ClientSelect
                  id="invoice-client"
                  value={formData.clientId}
                  onChange={(clientId) =>
                    setFormData((prev) => ({ ...prev, clientId }))
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Lignes d'articles</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter une ligne
                  </Button>
                </div>

                {formData.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 p-3 border rounded-lg"
                  >
                    <div className="col-span-12">
                      <Label htmlFor={`item-desc-${item.id}`}>
                        Description {index + 1}
                      </Label>
                      <Input
                        id={`item-desc-${item.id}`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="Ex: Développement module facturation"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Label htmlFor={`item-qty-${item.id}`}>Qté</Label>
                      <Input
                        id={`item-qty-${item.id}`}
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(item.id, "quantity", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="col-span-4">
                      <Label htmlFor={`item-price-${item.id}`}>PU (XAF)</Label>
                      <Input
                        id={`item-price-${item.id}`}
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(item.id, "unitPrice", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Label htmlFor={`item-tax-${item.id}`}>TVA %</Label>
                      <Input
                        id={`item-tax-${item.id}`}
                        type="number"
                        min={0}
                        max={100}
                        value={item.taxRate}
                        onChange={(e) =>
                          handleItemChange(item.id, "taxRate", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="col-span-2 flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={formData.items.length === 1}
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-amount">Total TTC</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  min={0}
                  value={previewTotals.total}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Sous-total: {formatCurrencyXAF(previewTotals.subtotal)} | TVA:{" "}
                  {formatCurrencyXAF(previewTotals.taxAmount)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-payment-method">
                    Mode de paiement
                  </Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: Invoice["paymentMethod"]) =>
                      setFormData((prev) => ({ ...prev, paymentMethod: value }))
                    }
                  >
                    <SelectTrigger id="invoice-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank-transfer">
                        Virement bancaire
                      </SelectItem>
                      <SelectItem value="mobile-money">Mobile Money</SelectItem>
                      <SelectItem value="card">Carte</SelectItem>
                      <SelectItem value="cash">Espèces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-payment-terms">
                    Conditions de paiement
                  </Label>
                  <Input
                    id="invoice-payment-terms"
                    value={formData.paymentTerms}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTerms: e.target.value,
                      }))
                    }
                    placeholder="Ex: Paiement sous 30 jours"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-notes">Notes (optionnel)</Label>
                <Textarea
                  id="invoice-notes"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Ex: Paiement par virement bancaire sous 15 jours"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-date">{t("invoicing.date")}</Label>
                  <Input
                    id="invoice-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-due-date">
                    {t("invoicing.dueDate")}
                  </Label>
                  <Input
                    id="invoice-due-date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dueDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit">
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={factureASupprimer !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) setFactureASupprimer(null);
        }}
        subject={
          factureASupprimer === null
            ? ""
            : factureASupprimer.number === ""
              ? "ce brouillon"
              : `la facture ${factureASupprimer.number}`
        }
        decision={canDeleteDocument(
          factureASupprimer?.status === "draft" ? "draft" : "issued",
        )}
        consequence="Ce brouillon n’a pas de numéro : le supprimer ne laisse aucun trou dans la séquence comptable."
        onConfirm={() => {
          if (factureASupprimer !== null) void remove(factureASupprimer.id);
          setFactureASupprimer(null);
        }}
      />
    </div>
  );
}
