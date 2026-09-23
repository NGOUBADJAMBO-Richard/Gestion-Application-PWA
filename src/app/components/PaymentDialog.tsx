import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  PAYMENT_METHOD_LABELS,
  type Payment,
  type PaymentMethod,
  computeSettlement,
  validatePayment,
} from "../../domain/payment";
import { formatCurrencyXAF } from "../utils/currency";
import { todayIso } from "../../domain/date";
import { newId } from "../../domain/id";

interface PaymentDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly documentNumber: string;
  readonly documentDate: string;
  readonly total: number;
  readonly payments: readonly Payment[];
  readonly onRecord: (payment: Payment) => void;
}

/**
 * Enregistrement d'un encaissement.
 *
 * Le montant est pré-rempli avec le solde restant : c'est le cas le plus
 * fréquent, et le corriger est plus rapide que de le saisir entièrement.
 */
export function PaymentDialog({
  open,
  onOpenChange,
  documentNumber,
  documentDate,
  total,
  payments,
  onRecord,
}: PaymentDialogProps) {
  const reglement = computeSettlement(total, payments);
  const [montant, setMontant] = useState(String(Math.max(0, reglement.balance)));
  const [date, setDate] = useState(todayIso());
  const [methode, setMethode] = useState<PaymentMethod>("mobile-money");
  const [reference, setReference] = useState("");

  const enregistrer = () => {
    const valeur = Math.round(Number(montant));
    try {
      validatePayment(valeur, date, documentDate);
    } catch (cause) {
      toast.error("Encaissement refusé", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return;
    }

    onRecord({
      id: newId(),
      date,
      amount: valeur,
      method: methode,
      ...(reference.trim() === "" ? {} : { reference: reference.trim() }),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encaisser {documentNumber}</DialogTitle>
          <DialogDescription>
            Total {formatCurrencyXAF(total)} &middot; déjà réglé{" "}
            {formatCurrencyXAF(reglement.paid)} &middot; reste{" "}
            {formatCurrencyXAF(reglement.balance)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paiement-montant">Montant encaissé (FCFA)</Label>
            <Input
              id="paiement-montant"
              type="number"
              min={1}
              step={1}
              value={montant}
              onChange={(event) => setMontant(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paiement-date">Date</Label>
              <Input
                id="paiement-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paiement-methode">Moyen</Label>
              <Select
                value={methode}
                onValueChange={(valeur: PaymentMethod) => setMethode(valeur)}
              >
                <SelectTrigger id="paiement-methode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
                  ).map((cle) => (
                    <SelectItem key={cle} value={cle}>
                      {PAYMENT_METHOD_LABELS[cle]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paiement-reference">Référence (facultatif)</Label>
            <Input
              id="paiement-reference"
              value={reference}
              placeholder="Numéro de transaction, de chèque…"
              onChange={(event) => setReference(event.target.value)}
            />
          </div>

          {payments.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium">Encaissements précédents</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {payments.map((encaissement) => (
                  <li key={encaissement.id} className="flex justify-between gap-3">
                    <span>
                      {new Date(encaissement.date).toLocaleDateString("fr-FR")}{" "}
                      &middot; {PAYMENT_METHOD_LABELS[encaissement.method]}
                    </span>
                    <span className="tabular-nums">
                      {formatCurrencyXAF(encaissement.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={enregistrer}>Enregistrer l’encaissement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
