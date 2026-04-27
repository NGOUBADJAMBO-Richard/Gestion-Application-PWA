import React, { useState } from "react";
import { Plus, Download, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { Invoice, InvoiceItem, mockInvoices } from "../data/mockData";
import { generateInvoicePDF } from "../utils/pdfGenerator";
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

export function Invoicing() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const createEmptyItem = (idSeed = Date.now().toString()): InvoiceItem => ({
    id: idSeed,
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
  });

  const calculateInvoiceTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      0,
    );
    const taxAmount = items.reduce(
      (sum, item) =>
        sum +
        (Number(item.quantity) || 0) *
          (Number(item.unitPrice) || 0) *
          ((Number(item.taxRate) || 0) / 100),
      0,
    );

    return {
      subtotal: Math.round(subtotal),
      taxAmount: Math.round(taxAmount),
      total: Math.round(subtotal + taxAmount),
    };
  };

  const [formData, setFormData] = useState<Omit<Invoice, "id">>({
    number: "",
    client: "",
    items: [createEmptyItem("item-1")],
    amount: 0,
    status: "pending",
    date: "",
    dueDate: "",
    paymentMethod: "bank-transfer",
    paymentTerms: "Paiement sous 30 jours",
    notes: "",
  });

  const previewTotals = calculateInvoiceTotals(formData.items);

  const filteredInvoices =
    statusFilter === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "overdue":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + inv.amount,
    0,
  );

  const handleCreate = () => {
    setEditingInvoice(null);
    setFormData({
      number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`,
      client: "",
      items: [
        {
          ...createEmptyItem(),
          description: "Prestation de services",
        },
      ],
      amount: 0,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      dueDate: "",
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
      client: invoice.client,
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

  const handleDelete = (id: string) => {
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
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
      client: formData.client.trim(),
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
      !payload.client ||
      payload.items.length === 0 ||
      hasInvalidItem ||
      !payload.date ||
      !payload.dueDate ||
      !payload.paymentTerms
    ) {
      return;
    }

    if (editingInvoice) {
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === editingInvoice.id
            ? { ...invoice, ...payload }
            : invoice,
        ),
      );
    } else {
      setInvoices((prev) => [
        ...prev,
        { id: Date.now().toString(), ...payload },
      ]);
    }

    setIsDialogOpen(false);
    setEditingInvoice(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1>{t("invoicing.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {filteredInvoices.length} factures - Total:{" "}
            {formatCurrencyXAF(totalAmount)}
          </p>
        </div>
        <Button
          className="gap-2"
          style={{ backgroundColor: "#004aad" }}
          onClick={handleCreate}
        >
          <Plus className="w-4 h-4" />
          {t("invoicing.new")}
        </Button>
      </div>

      {/* Status Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              style={
                statusFilter === "all" ? { backgroundColor: "#004aad" } : {}
              }
            >
              {t("invoicing.all")}
            </Button>
            <Button
              variant={statusFilter === "paid" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("paid")}
              style={
                statusFilter === "paid" ? { backgroundColor: "#004aad" } : {}
              }
            >
              {t("invoicing.paid")}
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
              style={
                statusFilter === "pending" ? { backgroundColor: "#004aad" } : {}
              }
            >
              {t("invoicing.pending")}
            </Button>
            <Button
              variant={statusFilter === "overdue" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("overdue")}
              style={
                statusFilter === "overdue" ? { backgroundColor: "#004aad" } : {}
              }
            >
              {t("invoicing.overdue")}
            </Button>
          </div>
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
                      <div>{invoice.number}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {invoice.items[0]?.description || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{invoice.client}</TableCell>
                    <TableCell>{invoice.items.length} ligne(s)</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrencyXAF(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {t(`invoicing.${invoice.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(invoice)}
                          title="Éditer"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateInvoicePDF(invoice)}
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
                <Input
                  id="invoice-client"
                  value={formData.client}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, client: e.target.value }))
                  }
                  required
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
              <Button type="submit" style={{ backgroundColor: "#004aad" }}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
