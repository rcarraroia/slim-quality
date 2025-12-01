import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, MessageCircle, Users, Plus, ChevronLeft, ChevronRight, User } from 'lucide-react'; // Adicionado User
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { mockAgendamentos } from '@/data/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Agendamento = typeof mockAgendamentos[0];

const tipoConfig = {
  Ligação: { icon: '📞', color: 'bg-blue-500/10 text-blue-500' },
  Reunião: { icon: '👥', color: 'bg-success/10 text-success' },
  WhatsApp: { icon: '📱', color: 'bg-primary/10 text-primary' },
  Lembrete: { icon: '🔔', color: 'bg-warning/10 text-warning' },
};

export default function Agendamentos() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDayClick = (day: Date) => {
    setDate(day);
    // Simular carregamento de agendamentos para o dia
  };

  const handleNewAppointment = () => {
    setSelectedAgendamento(null);
    setIsModalOpen(true);
  };

  const handleViewDetails = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
  };

  const upcomingAppointments = mockAgendamentos.filter(a => a.status === 'pendente').slice(0, 3);

  // Mock para visualização semanal
  const weeklyView = [
    { day: 'Segunda 14/Out', appointments: [mockAgendamentos[1]] },
    { day: 'Terça 15/Out', appointments: [] },
    { day: 'Quarta 16/Out', appointments: [mockAgendamentos[3]] },
    { day: 'Quinta 17/Out', appointments: [mockAgendamentos[0]] },
    { day: 'Sexta 18/Out', appointments: [mockAgendamentos[2]] },
  ];

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      {/* Lado Esquerdo (30%) */}
      <div className="w-full lg:w-1/3 space-y-6 flex-shrink-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDayClick}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAppointments.map((app) => {
              const config = tipoConfig[app.tipo];
              return (
                <div 
                  key={app.id} 
                  className={cn("p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow", config.color)}
                  onClick={() => handleViewDetails(app)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <p className="font-medium text-sm">{app.cliente}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-7">{app.assunto}</p>
                  <p className="text-xs text-muted-foreground mt-1 ml-7 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {app.hora}
                  </p>
                </div>
              );
            })}
            <Button variant="link" className="w-full justify-end">Ver todos →</Button>
          </CardContent>
        </Card>
      </div>

      {/* Lado Direito (70%) */}
      <div className="w-full lg:w-2/3 space-y-6 flex-grow">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Visualização Semanal</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleNewAppointment} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Agendamento
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 border rounded-lg overflow-hidden bg-card">
          {weeklyView.map((col, index) => (
            <div key={index} className="border-r last:border-r-0">
              <div className="p-3 bg-muted/50 border-b">
                <p className="font-semibold text-sm">{col.day.split(' ')[0]}</p>
                <p className="text-xs text-muted-foreground">{col.day.split(' ')[1]}</p>
              </div>
              <div className="h-[calc(100vh-250px)] overflow-y-auto p-2 space-y-2">
                {col.appointments.map((app) => {
                  const config = tipoConfig[app.tipo];
                  return (
                    <Card 
                      key={app.id} 
                      className={cn("p-3 cursor-pointer hover:shadow-lg transition-shadow", config.color)}
                      onClick={() => handleViewDetails(app)}
                    >
                      <p className="text-xs font-bold flex items-center gap-1">
                        {config.icon} {app.hora}
                      </p>
                      <p className="text-sm font-medium mt-1">{app.cliente}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.assunto}</p>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Detalhes/Criação */}
      <Dialog open={isModalOpen || !!selectedAgendamento} onOpenChange={() => { setIsModalOpen(false); setSelectedAgendamento(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAgendamento ? 'Detalhes do Agendamento' : 'Criar Novo Agendamento'}</DialogTitle>
          </DialogHeader>
          
          {selectedAgendamento ? (
            <div className="space-y-4">
              <Card className="p-4 bg-muted/50 space-y-2">
                <p className="text-2xl font-bold text-primary">{selectedAgendamento.assunto}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> {selectedAgendamento.data} às {selectedAgendamento.hora}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Cliente: {selectedAgendamento.cliente}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> Responsável: {selectedAgendamento.responsavel}</p>
              </Card>
              <Textarea defaultValue="Cliente comprou Queen há 5 dias. Verificar se produto chegou bem." rows={4} readOnly={!isModalOpen} />
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline">Editar</Button>
                <Button variant="default">Concluir</Button>
                <Button variant="destructive">Cancelar</Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Agendamento</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ligação">Ligação</SelectItem>
                    <SelectItem value="Reunião">Reunião</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Lembrete">Lembrete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Hora Início</Label>
                  <Input type="time" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input placeholder="Buscar cliente..." />
              </div>
              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input placeholder="Ex: Follow-up pós-venda" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Criar Agendamento</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}