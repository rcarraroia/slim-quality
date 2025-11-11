import { Clock, User, ShoppingCart, Tag, MessageSquare, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TimelineEvent } from '@/services/frontend/customer-frontend.service';

interface TimelineViewProps {
  events: TimelineEvent[];
}

const eventIcons: Record<string, any> = {
  note: User,
  order_created: ShoppingCart,
  payment_confirmed: ShoppingCart,
  order_status_changed: ShoppingCart,
  tag_added: Tag,
  conversation_started: MessageSquare,
  appointment_scheduled: Calendar,
  affiliate_registered: User,
};

const eventColors: Record<string, string> = {
  note: 'text-blue-500',
  order_created: 'text-green-500',
  payment_confirmed: 'text-green-600',
  order_status_changed: 'text-yellow-500',
  tag_added: 'text-purple-500',
  conversation_started: 'text-blue-500',
  appointment_scheduled: 'text-orange-500',
  affiliate_registered: 'text-indigo-500',
};

export function TimelineView({ events }: TimelineViewProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    return d.toLocaleDateString('pt-BR');
  };

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum evento registrado ainda</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = eventIcons[event.event_type] || Clock;
        const color = eventColors[event.event_type] || 'text-gray-500';

        return (
          <div key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full bg-background border-2 ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 h-full bg-border mt-2" />
              )}
            </div>

            <Card className="flex-1 p-4 mb-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{event.title}</h4>
                <span className="text-sm text-muted-foreground">
                  {formatDate(event.created_at)}
                </span>
              </div>

              {event.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {event.description}
                </p>
              )}

              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(event.metadata).slice(0, 3).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
