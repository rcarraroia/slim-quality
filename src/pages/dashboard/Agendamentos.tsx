import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Plus, PackageOpen } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/config/supabase';

interface Appointment {
  id: string;
  customer_id: string;
  scheduled_date: string;
  scheduled_time: string;
  type: string;
  status: string;
  notes: string;
  customer: {
    name: string;
    phone: string;
  };
}

const tipoConfig: { [key: string]: { icon: string; color: string } } = {
  call: { icon: '📞', color: 'bg-blue-500/10 text-blue-500' },
  meeting: { icon: '👥', color: 'bg-success/10 text-success' },
  whatsapp: { icon: '📱', color: 'bg-primary/10 text-primary' },
  reminder: { icon: '🔔', color: 'bg-warning/10 text-warning' },
};

export default function Agendamentos() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      // Buscar agendamentos do mês selecionado
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(name, phone)
        `)
        .gte('scheduled_date', startOfMonth.toISOString().split('T')[0])
        .lte('scheduled_date', endOfMonth.toISOString().split('T')[0])
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (day: Date | undefined) => {
    if (day) {
      setDate(day);
      setSelectedDate(day);
    }
  };

  const handleNewAppointment = () => {
    // Implementar modal de novo agendamento
    console.log('Novo agendamento');
  };

  // Filtrar agendamentos do dia selecionado
  const dayAppointments = appointments.filter(apt => {
    if (!date) return false;
    const aptDate = new Date(apt.scheduled_date);
    return aptDate.toDateString() === date.toDateString();
  });

  // Próximos agendamentos
  const upcomingAppointments = appointments
    .filter(apt => apt.status === 'pending')
    .slice(0, 5);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-6">
      {/* Lado Esquerdo - Calendário */}
      <div className="w-full lg:w-1/3 space-y-6 flex-shrink-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDayClick}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Próximos Agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Próximos
              </span>
              <Button size="sm" onClick={handleNewAppointment}>
                <Plus className="h-4 w-4 mr-1" />
                Novo
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <PackageOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum agendamento próximo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => {
                  const config = tipoConfig[apt.type] || tipoConfig.call;
                  return (
                    <div
                      key={apt.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-xl flex-shrink-0`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{apt.customer?.name || 'Cliente'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(apt.scheduled_date).toLocaleDateString('pt-BR')} às {apt.scheduled_time}
                          </p>
                          {apt.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {apt.notes}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                          {apt.type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lado Direito - Agendamentos do Dia */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>
              Agendamentos de {date?.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
                <p className="text-muted-foreground">Carregando agendamentos...</p>
              </div>
            ) : dayAppointments.length === 0 ? (
              <div className="text-center py-12">
                <PackageOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum agendamento para este dia</h3>
                <p className="text-muted-foreground mb-4">
                  Selecione outro dia ou crie um novo agendamento
                </p>
                <Button onClick={handleNewAppointment} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Agendamento
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {dayAppointments.map((apt) => {
                  const config = tipoConfig[apt.type] || tipoConfig.call;
                  return (
                    <div
                      key={apt.id}
                      className="p-4 rounded-lg border hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                          {config.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{apt.customer?.name || 'Cliente'}</h4>
                              <p className="text-sm text-muted-foreground">
                                {apt.customer?.phone || 'Sem telefone'}
                              </p>
                            </div>
                            <Badge 
                              variant={apt.status === 'pending' ? 'secondary' : 'default'}
                              className="flex-shrink-0"
                            >
                              {apt.status === 'pending' ? 'Pendente' : 
                               apt.status === 'completed' ? 'Concluído' : 
                               apt.status === 'cancelled' ? 'Cancelado' : apt.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {apt.scheduled_time}
                            </span>
                            <span className="flex items-center gap-1">
                              {config.icon} {apt.type}
                            </span>
                          </div>
                          {apt.notes && (
                            <p className="text-sm bg-muted/50 p-2 rounded">
                              {apt.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
