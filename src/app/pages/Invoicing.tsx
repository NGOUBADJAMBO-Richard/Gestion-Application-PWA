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
import { Invoice, mockInvoices } from "../data/mockData";
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
  const [formData, setFormData] = useState<Omit<Invoice, "id">>({
    number: "",
    client: "",
    amount: 0,
    status: "pending",
    date: "",
    dueDate: "",
  });

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
      amount: 0,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      dueDate: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      number: invoice.number,
      client: invoice.client,
      amount: invoice.amount,
      status: invoice.status,
      date: invoice.date,
      dueDate: invoice.dueDate,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Omit<Invoice, "id"> = {
      number: formData.number.trim(),
      client: formData.client.trim(),
      amount: Number(formData.amount) || 0,
      status: formData.status,
      date: formData.date,
      dueDate: formData.dueDate,
    };

    if (
      !payload.number ||
      !payload.client ||
      !payload.date ||
      !payload.dueDate
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
                      {invoice.number}
                    </TableCell>
                    <TableCell>{invoice.client}</TableCell>
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
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                        <Button variant="ghost" size="sm">
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
        <DialogContent className="sm:max-w-[520px]">
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

              <div className="space-y-2">
                <Label htmlFor="invoice-amount">{t("invoicing.amount")}</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  min={0}
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: Number(e.target.value) || 0,
                    }))
                  }
                  required
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
