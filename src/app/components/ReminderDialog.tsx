import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, History, Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

import { todayIso } from "../../domain/date";
import {
  REMINDER_CHANNEL_LABELS,
  REMINDER_LEVELS,
  type Reminder,
  type ReminderChannel,
  type ReminderLevel,
  adviseReminder,
  levelSpec,
  mailToUrl,
  reminderMessage,
  reminderSubject,
  whatsAppUrl,
} from "../../domain/reminder";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

/**
 * Préparation d'une relance.
 *
 * L'application n'envoie rien elle-même : elle compose le message, l'ouvre dans
 * WhatsApp ou dans le client de messagerie, et enregistre que la relance est
 * partie. C'est délibéré — envoyer automatiquement suppose des identifiants et
 * la possibilité qu'une mise en demeure parte sans relecture chez le mauvais
 * client.
 *
 * Le message reste modifiable. Un modèle qu'on ne peut pas ajuster finit par ne
 * plus être employé du tout.
 */

export interface ReminderTarget {
  readonly invoiceId: string;
  readonly documentNumber: string;
  readonly clientName: string;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly formattedBalance: string;
  readonly dueDate: string;
  readonly daysOverdue: number;
}

interface ReminderDialogProps {
  readonly target: ReminderTarget | null;
  readonly history: readonly Reminder[];
  readonly companyName: string;
  readonly paymentDetails?: string | undefined;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRecord: (relance: Omit<Reminder, "id">) => void;
}

const ICONES: Record<ReminderChannel, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  email: Mail,
  phone: Phone,
  other: History,
};

export function ReminderDialog({
  target,
  history,
  companyName,
  paymentDetails,
  onOpenChange,
  onRecord,
}: ReminderDialogProps) {
  const historique = useMemo(
    () =>
      target === null
        ? []
        : history
            .filter((relance) => relance.invoiceId === target.invoiceId)
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [history, target],
  );

  const avis = useMemo(
    () => adviseReminder(target?.daysOverdue ?? 0, historique),
    [target, historique],
  );

  const [niveau, setNiveau] = useState<ReminderLevel>("courtesy");
  const [canal, setCanal] = useState<ReminderChannel>("whatsapp");
  const [message, setMessage] = useState("");
  // Vrai dès que l'utilisateur a retouché le texte : on cesse alors de le
  // régénérer, sinon changer de canal effacerait ce qu'il vient d'écrire.
  const [retouche, setRetouche] = useState(false);

  // À l'ouverture, le palier proposé est celui que le retard justifie.
  useEffect(() => {
    if (target === null) return;
    setNiveau(avis.level ?? "courtesy");
    setCanal("whatsapp");
    setRetouche(false);
    // `avis` dépend de `target` ; le recalcul à l'ouverture suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.invoiceId]);

  useEffect(() => {
    if (target === null || retouche) return;
    setMessage(
      reminderMessage(niveau, {
        clientName: target.clientName,
        documentNumber: target.documentNumber,
        formattedBalance: target.formattedBalance,
        dueDate: target.dueDate,
        daysOverdue: target.daysOverdue,
        companyName,
        paymentDetails,
      }),
    );
  }, [target, niveau, retouche, companyName, paymentDetails]);

  if (target === null) return null;

  const specification = levelSpec(niveau);

  const ouvrirCanal = () => {
    if (canal === "whatsapp") {
      const lien = whatsAppUrl(target.clientPhone, message);
      if (lien === null) {
        toast.error("Numéro inexploitable", {
          description: `« ${target.clientPhone || "vide"} » ne permet pas d'ouvrir WhatsApp. Corrige la fiche client, ou choisis un autre canal.`,
        });
        return;
      }
      window.open(lien, "_blank", "noopener,noreferrer");
      return;
    }

    if (canal === "email") {
      const lien = mailToUrl(
        target.clientEmail,
        reminderSubject(niveau, target.documentNumber),
        message,
      );
      if (lien === null) {
        toast.error("Adresse inexploitable", {
          description: `« ${target.clientEmail || "vide"} » n'est pas une adresse e-mail. Corrige la fiche client, ou choisis un autre canal.`,
        });
        return;
      }
      window.location.href = lien;
      return;
    }

    // Téléphone ou autre : rien à ouvrir, on copie le message pour l'avoir
    // sous les yeux pendant l'appel.
    void navigator.clipboard
      .writeText(message)
      .then(() => toast.success("Message copié."))
      .catch(() =>
        toast.error("Copie impossible", {
          description: "Sélectionne le texte et copie-le à la main.",
        }),
      );
  };

  const enregistrer = () => {
    onRecord({
      invoiceId: target.invoiceId,
      level: niveau,
      channel: canal,
      sentAt: todayIso(),
    });
    toast.success("Relance enregistrée.", {
      description: `${specification.label} — ${REMINDER_CHANNEL_LABELS[canal]}`,
    });
    onOpenChange(false);
  };

  const Icone = ICONES[canal];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relancer {target.documentNumber}</DialogTitle>
          <DialogDescription>
            {target.clientName} &middot; {target.formattedBalance} dus &middot;{" "}
            {target.daysOverdue} jour(s) de retard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {avis.alreadySent && (
            <p className="flex items-start gap-2 border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {avis.reason}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="relance-palier">Palier</Label>
              <Select
                value={niveau}
                onValueChange={(valeur) => {
                  setNiveau(valeur as ReminderLevel);
                  setRetouche(false);
                }}
              >
                <SelectTrigger id="relance-palier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_LEVELS.map((palier) => (
                    <SelectItem key={palier.level} value={palier.level}>
                      {palier.label} (dès J+{palier.fromDaysOverdue})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relance-canal">Canal</Label>
              <Select
                value={canal}
                onValueChange={(valeur) => setCanal(valeur as ReminderChannel)}
              >
                <SelectTrigger id="relance-canal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(REMINDER_CHANNEL_LABELS) as ReminderChannel[]
                  ).map((valeur) => (
                    <SelectItem key={valeur} value={valeur}>
                      {REMINDER_CHANNEL_LABELS[valeur]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{specification.intent}</p>

          <div className="space-y-2">
            <Label htmlFor="relance-message">Message</Label>
            <Textarea
              id="relance-message"
              rows={12}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setRetouche(true);
              }}
              className="font-sans text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Relis avant d&rsquo;envoyer. Rien n&rsquo;part automatiquement :
              le bouton ouvre la conversation avec le texte pré-rempli.
            </p>
          </div>

          {historique.length > 0 && (
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Relances déjà envoyées
              </p>
              <ul className="space-y-1.5 text-sm">
                {historique.map((relance) => (
                  <li key={relance.id} className="flex items-center gap-2">
                    <Badge className="bg-muted text-muted-foreground">
                      {new Date(`${relance.sentAt}T00:00:00`).toLocaleDateString(
                        "fr-FR",
                      )}
                    </Badge>
                    <span>{levelSpec(relance.level).label}</span>
                    <span className="text-muted-foreground">
                      &middot; {REMINDER_CHANNEL_LABELS[relance.channel]}
                    </span>
                    {relance.note !== undefined && (
                      <span className="text-muted-foreground truncate">
                        — {relance.note}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button variant="outline" className="gap-2" onClick={ouvrirCanal}>
            <Icone className="h-4 w-4" />
            {canal === "whatsapp"
              ? "Ouvrir WhatsApp"
              : canal === "email"
                ? "Ouvrir l'e-mail"
                : "Copier le message"}
          </Button>
          <Button className="gap-2" onClick={enregistrer}>
            <History className="h-4 w-4" />
            Enregistrer la relance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
