import { useState, useEffect } from 'react';
import { Bell, Plus, X, Clock, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  customer_id?: string;
  customer_name?: string;
  created_at: string;
}

interface ReminderSystemProps {
  customerId?: string;
  showAll?: boolean;
}

export function ReminderSystem({ customerId, showAll = false }: ReminderSystemProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as const,
    customer_id: customerId || ''
  });

  useEffect(() => {
    loadReminders();
  }, [customerId, filter]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      // Simulação - substituir por chamada real à API
      const mockReminders: Reminder[] = [
        {
          id: '1',
          title: 'Ligar para cliente sobre proposta',
          description: 'Discutir condições de pagamento',
          due_date: new Date(Date.now() + 86400000).toISOString(),
          priority: 'high',
          status: 'pending',
          customer_id: customerId,
          customer_name: 'João Silva',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Enviar documentação adicional',
          due_date: new Date(Date.now() + 172800000).toISOString(),
          priority: 'medium',
          status: 'pending',
          customer_id: customerId,
          customer_name: 'Maria Santos',
          created_at: new Date().toISOString()
        }
      ];
      
      let filtered = mockReminders;
      if (filter !== 'all') {
        filtered = mockReminders.filter(r => r.status === filter);
      }
      if (customerId) {
        filtered = filtered.filter(r => r.customer_id === customerId);
      }
      
      setReminders(filtered);
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
      toast.error('Erro ao carregar lembretes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (reminder?: Reminder) => {
    if (reminder) {
      setEditingReminder(reminder);
      setFormData({
        title: reminder.title,
        description: reminder.description || '',
        due_date: new Date(reminder.due_date).toISOString().slice(0, 16),
        priority: reminder.priority,
        customer_id: reminder.customer_id || ''
      });
    } else {
      setEditingReminder(null);
      setFormData({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        customer_id: customerId || ''
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.due_date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Simulação - substituir por chamada real à API
      if (editingReminder) {
        toast.success('Lembrete atualizado com sucesso');
      } else {
        toast.success('Lembrete criado com sucesso');
      }
      
      setModalOpen(false);
      loadReminders();
    } catch (error) {
      console.error('Erro ao salvar lembrete:', error);
      toast.error('Erro ao salvar lembrete');
    }
  };

  const handleComplete = async (reminderId: string) => {
    try {
      // Simulação - substituir por chamada real à API
      toast.success('Lembrete marcado como concluído');
      loadReminders();
    } catch (error) {
      console.error('Erro ao completar lembrete:', error);
      toast.error('Erro ao completar lembrete');
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return;

    try {
      // Simulação - substituir por chamada real à API
      toast.success('Lembrete excluído com sucesso');
      loadReminders();
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error);
      toast.error('Erro ao excluir lembrete');
    }
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta'
  };

  const priorityIcons = {
    low: Clock,
    medium: AlertCircle,
    high: AlertCircle
  };

  const formatDueDate = (date: string) => {
    const dueDate = new Date(date);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Atrasado ${Math.abs(diffDays)} dia(s)`, color: 'text-red-600' };
    } else if (diffDays === 0) {
      return { text: 'Hoje', color: 'text-orange-600' };
    } else if (diffDays === 1) {
      return { text: 'Amanhã', color: 'text-yellow-600' };
    } else if (diffDays <= 7) {
      return { text: `Em ${diffDays} dias`, color: 'text-blue-600' };
    } else {
      return { text: dueDate.toLocaleDateString('pt-BR'), color: 'text-muted-foreground' };
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Lembretes
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => handleOpenModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : reminders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum lembrete encontrado
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {reminders.map(reminder => {
                  const PriorityIcon = priorityIcons[reminder.priority];
                  const dueInfo = formatDueDate(reminder.due_date);

                  return (
                    <div
                      key={reminder.id}
                      className="p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{reminder.title}</h4>
                            <Badge className={priorityColors[reminder.priority]}>
                              <PriorityIcon className="h-3 w-3 mr-1" />
                              {priorityLabels[reminder.priority]}
                            </Badge>
                          </div>

                          {reminder.description && (
                            <p className="text-sm text-muted-foreground">
                              {reminder.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm">
                            <span className={`flex items-center gap-1 ${dueInfo.color}`}>
                              <Calendar className="h-3 w-3" />
                              {dueInfo.text}
                            </span>
                            {showAll && reminder.customer_name && (
                              <span className="text-muted-foreground">
                                Cliente: {reminder.customer_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {reminder.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleComplete(reminder.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenModal(reminder)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(reminder.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReminder ? 'Editar Lembrete' : 'Novo Lembrete'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Ligar para cliente..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">
                Data e Hora <span className="text-destructive">*</span>
              </Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Adicione detalhes sobre o lembrete..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingReminder ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
