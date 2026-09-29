import React, { useState } from 'react';
import { Plus, Clock, CheckCircle2, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { todayIso } from '../../domain/date';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import type { Ticket } from '../data/entities';
import { ticketRepository } from '../data/repositories';
import { useCollection } from '../hooks/useCollection';
import { DataStateNotice } from '../components/DataStateNotice';
import { ClientSelect } from '../components/ClientSelect';
import { useClientIndex } from '../hooks/useClientIndex';
import { ConfirmDelete } from '../components/ConfirmDelete';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

/** Filtres de la liste des tickets. « All » était resté en anglais. */
const FILTRES_TICKET = [
  { valeur: 'all', libelle: 'Tous' },
  { valeur: 'open', libelle: 'Ouverts' },
  { valeur: 'in-progress', libelle: 'En cours' },
  { valeur: 'closed', libelle: 'Fermés' },
] as const;

export function Support() {
  const { t } = useLanguage();
  // Les donnees vivent dans le depot : la saisie survit au rechargement.
  const {
    items: tickets,
    isLoading,
    error,
    create,
    update,
    remove,
    dismissError,
  } = useCollection(ticketRepository);
  const { nameOf } = useClientIndex();
  const [ticketASupprimer, setTicketASupprimer] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [formData, setFormData] = useState<Omit<Ticket, 'id'>>({
    title: '',
    clientId: '',
    status: 'open',
    priority: 'medium',
    created: todayIso(),
  });

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(ticket => ticket.status === statusFilter);

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'open': return 'bg-warning/10 text-warning border-warning/20';
      case 'in-progress': return 'bg-primary/10 text-primary-ink border-primary/20';
      case 'closed': return 'bg-success/10 text-success border-success/20';
    }
  };

  /** Les priorités étaient affichées en brut : « high », « low », « medium ». */
  const PRIORITE_LIBELLE: Record<Ticket['priority'], string> = {
    high: 'Haute',
    medium: 'Moyenne',
    low: 'Basse',
  };

  const getPriorityColor = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return AlertCircle;
      case 'in-progress': return Clock;
      case 'closed': return CheckCircle2;
      default: return AlertCircle;
    }
  };

  const handleCreate = () => {
    setEditingTicket(null);
    setFormData({
      title: '',
      clientId: '',
      status: 'open',
      priority: 'medium',
      created: todayIso(),
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title,
      clientId: ticket.clientId,
      status: ticket.status,
      priority: ticket.priority,
      created: ticket.created,
    });
    setIsDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Omit<Ticket, 'id'> = {
      title: formData.title.trim(),
      clientId: formData.clientId,
      status: formData.status,
      priority: formData.priority,
      created: formData.created,
    };

    if (!payload.title || !payload.clientId || !payload.created) {
      return;
    }

    if (editingTicket) {
      void update(editingTicket.id, payload);
    } else {
      void create(payload);
    }

    setIsDialogOpen(false);
    setEditingTicket(null);
  };

  return (
    <div className="space-y-6">
      <DataStateNotice
        isLoading={isLoading}
        error={error}
        onDismiss={dismissError}
        label="les tickets"
      />

      <header className="wave-surface -mx-4 px-4 py-6 lg:-mx-6 lg:px-6">
        <p className="section-label">Assistance</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
        <div>
          <h1>{t('support.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {filteredTickets.length} tickets
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          {t('support.new')}
        </Button>
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-6">
          {FILTRES_TICKET.map((filtre) => {
            const actif = statusFilter === filtre.valeur;
            const compte =
              filtre.valeur === 'all'
                ? tickets.length
                : tickets.filter((ticket) => ticket.status === filtre.valeur)
                    .length;

            return (
              <button
                key={filtre.valeur}
                type="button"
                className="filter-pill"
                aria-pressed={actif}
                onClick={() => setStatusFilter(filtre.valeur)}
              >
                {filtre.libelle}
                <span className="ml-2 tabular-nums opacity-70">{compte}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="grid gap-4">
        {filteredTickets.map((ticket) => {
          const StatusIcon = getStatusIcon(ticket.status);
          return (
            <Card key={ticket.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
                  >
                    <StatusIcon className="w-5 h-5" style={{ color: 'var(--primary-ink)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-medium">{ticket.title}</h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge className={getStatusColor(ticket.status)}>
                          {t(`support.${ticket.status === 'in-progress' ? 'inProgress' : ticket.status}`)}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {PRIORITE_LIBELLE[ticket.priority]}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(ticket)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTicketASupprimer(ticket)}
                          aria-label={`Supprimer le ticket ${ticket.title}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{nameOf(ticket.clientId)}</span>
                      <span>•</span>
                      <span>{new Date(ticket.created).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTicket(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingTicket ? t('common.edit') : t('support.new')}</DialogTitle>
              <DialogDescription>
                Gérez les informations du ticket de support
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-title">Titre</Label>
                <Input
                  id="ticket-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-client">{t('projects.client')}</Label>
                <ClientSelect
                  id="ticket-client"
                  value={formData.clientId}
                  onChange={(clientId) => setFormData(prev => ({ ...prev, clientId }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ticket-status">{t('projects.status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Ticket['status']) =>
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger id="ticket-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t('support.open')}</SelectItem>
                      <SelectItem value="in-progress">{t('support.inProgress')}</SelectItem>
                      <SelectItem value="closed">{t('support.closed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticket-priority">Priorité</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: Ticket['priority']) =>
                      setFormData(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger id="ticket-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">low</SelectItem>
                      <SelectItem value="medium">medium</SelectItem>
                      <SelectItem value="high">high</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticket-date">Date</Label>
                  <Input
                    id="ticket-date"
                    type="date"
                    value={formData.created}
                    onChange={(e) => setFormData(prev => ({ ...prev, created: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={ticketASupprimer !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) setTicketASupprimer(null);
        }}
        subject={
          ticketASupprimer === null ? "" : `le ticket « ${ticketASupprimer.title} »`
        }
        decision={{ allowed: true }}
        consequence="Le ticket part à la corbeille et reste récupérable."
        onConfirm={() => {
          if (ticketASupprimer !== null) void remove(ticketASupprimer.id);
          setTicketASupprimer(null);
        }}
      />
    </div>
  );
}
