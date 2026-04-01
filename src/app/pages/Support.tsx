import React, { useState } from 'react';
import { Plus, Clock, CheckCircle2, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import { Ticket, mockTickets } from '../data/mockData';
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

export function Support() {
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [formData, setFormData] = useState<Omit<Ticket, 'id'>>({
    title: '',
    client: '',
    status: 'open',
    priority: 'medium',
    created: new Date().toISOString().split('T')[0],
  });

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(ticket => ticket.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'in-progress': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'closed': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'medium': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case 'low': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
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
      client: '',
      status: 'open',
      priority: 'medium',
      created: new Date().toISOString().split('T')[0],
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title,
      client: ticket.client,
      status: ticket.status,
      priority: ticket.priority,
      created: ticket.created,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTickets(prev => prev.filter(ticket => ticket.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Omit<Ticket, 'id'> = {
      title: formData.title.trim(),
      client: formData.client.trim(),
      status: formData.status,
      priority: formData.priority,
      created: formData.created,
    };

    if (!payload.title || !payload.client || !payload.created) {
      return;
    }

    if (editingTicket) {
      setTickets(prev =>
        prev.map(ticket =>
          ticket.id === editingTicket.id ? { ...ticket, ...payload } : ticket,
        ),
      );
    } else {
      setTickets(prev => [...prev, { id: Date.now().toString(), ...payload }]);
    }

    setIsDialogOpen(false);
    setEditingTicket(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1>{t('support.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {filteredTickets.length} tickets
          </p>
        </div>
        <Button className="gap-2" style={{ backgroundColor: '#004aad' }} onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          {t('support.new')}
        </Button>
      </div>

      {/* Status Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              style={statusFilter === 'all' ? { backgroundColor: '#004aad' } : {}}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'open' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('open')}
              style={statusFilter === 'open' ? { backgroundColor: '#004aad' } : {}}
            >
              {t('support.open')}
            </Button>
            <Button
              variant={statusFilter === 'in-progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('in-progress')}
              style={statusFilter === 'in-progress' ? { backgroundColor: '#004aad' } : {}}
            >
              {t('support.inProgress')}
            </Button>
            <Button
              variant={statusFilter === 'closed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('closed')}
              style={statusFilter === 'closed' ? { backgroundColor: '#004aad' } : {}}
            >
              {t('support.closed')}
            </Button>
          </div>
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
                    style={{ backgroundColor: '#004aad15' }}
                  >
                    <StatusIcon className="w-5 h-5" style={{ color: '#004aad' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-medium">{ticket.title}</h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge className={getStatusColor(ticket.status)}>
                          {t(`support.${ticket.status === 'in-progress' ? 'inProgress' : ticket.status}`)}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(ticket)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(ticket.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{ticket.client}</span>
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
                Gerez les informations du ticket de support
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
                <Input
                  id="ticket-client"
                  value={formData.client}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <Label htmlFor="ticket-priority">Priorite</Label>
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
              <Button type="submit" style={{ backgroundColor: '#004aad' }}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
