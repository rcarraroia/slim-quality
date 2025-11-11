import { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, List, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { appointmentFrontendService, type Appointment } from '@/services/frontend/appointment-frontend.service';

export default function Agendamentos() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadAppointments();
    loadTodayAppointments();
  }, [selectedDate]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      const data = await appointmentFrontendService.getCalendarAppointments(startOfMonth, endOfMonth);
      setAppointments(data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayAppointments = async () => {
    try {
      const data = await appointmentFrontendService.getTodayAppointments();
      setTodayAppointments(data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos de hoje:', error);
    }
  };

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800'
  };

  const statusLabels = {
    scheduled: 'Agendado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    no_show: 'Não compareceu'
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">
            {todayAppointments.length} agendamento(s) hoje
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Agendamentos de Hoje */}
      {todayAppointments.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Agendamentos de Hoje
          </h2>
          <div className="space-y-3">
            {todayAppointments.map(appointment => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{formatTime(appointment.scheduled_at)}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-medium">{appointment.title}</span>
                  </div>
                  {appointment.customer && (
                    <p className="text-sm text-muted-foreground">
                      {appointment.customer.name}
                    </p>
                  )}
                </div>
                <Badge className={statusColors[appointment.status]}>
                  {statusLabels[appointment.status]}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                >
                  Próximo
                </Button>
              </div>
            </div>

            {/* Calendário Simples */}
            <div className="grid grid-cols-7 gap-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center font-semibold text-sm p-2">
                  {day}
                </div>
              ))}
              
              {Array.from({ length: 35 }, (_, i) => {
                const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                const startDay = firstDay.getDay();
                const dayNumber = i - startDay + 1;
                const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNumber);
                const isCurrentMonth = dayNumber > 0 && dayNumber <= new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                const isToday = date.toDateString() === new Date().toDateString();
                const dayAppointments = appointments.filter(apt => 
                  new Date(apt.scheduled_at).toDateString() === date.toDateString()
                );

                return (
                  <div
                    key={i}
                    className={`
                      min-h-[80px] p-2 border rounded-lg
                      ${!isCurrentMonth ? 'bg-muted text-muted-foreground' : 'hover:bg-accent cursor-pointer'}
                      ${isToday ? 'border-primary border-2' : ''}
                    `}
                  >
                    {isCurrentMonth && (
                      <>
                        <div className="font-semibold text-sm mb-1">{dayNumber}</div>
                        {dayAppointments.length > 0 && (
                          <div className="space-y-1">
                            {dayAppointments.slice(0, 2).map(apt => (
                              <div
                                key={apt.id}
                                className="text-xs p-1 bg-primary/10 rounded truncate"
                              >
                                {formatTime(apt.scheduled_at)} {apt.title}
                              </div>
                            ))}
                            {dayAppointments.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayAppointments.length - 2} mais
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card className="p-6">
            {loading ? (
              <p className="text-center text-muted-foreground">Carregando...</p>
            ) : appointments.length === 0 ? (
              <p className="text-center text-muted-foreground">Nenhum agendamento encontrado</p>
            ) : (
              <div className="space-y-3">
                {appointments.map(appointment => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{appointment.title}</span>
                        <Badge className={statusColors[appointment.status]}>
                          {statusLabels[appointment.status]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          {new Date(appointment.scheduled_at).toLocaleDateString('pt-BR')} às{' '}
                          {formatTime(appointment.scheduled_at)}
                        </p>
                        {appointment.customer && (
                          <p>Cliente: {appointment.customer.name}</p>
                        )}
                        {appointment.location && (
                          <p>Local: {appointment.location}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appointmentFrontendService.formatDuration(appointment.duration_minutes)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
