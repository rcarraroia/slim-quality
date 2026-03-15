import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, MessageSquare, Send, Users, Activity, Loader2 } from 'lucide-react';
import { agentService } from '@/services/agent.service';

interface Metrics {
  total_messages_received: number;
  total_messages_sent: number;
  total_conversations: number;
  active_conversations: number;
}

export function AgentMetrics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    total_messages_received: 0,
    total_messages_sent: 0,
    total_conversations: 0,
    active_conversations: 0,
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await agentService.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const metricCards = [
    {
      title: 'Mensagens Recebidas',
      value: metrics.total_messages_received,
      icon: MessageSquare,
      description: 'Total de mensagens recebidas',
    },
    {
      title: 'Mensagens Enviadas',
      value: metrics.total_messages_sent,
      icon: Send,
      description: 'Total de respostas enviadas',
    },
    {
      title: 'Conversas Totais',
      value: metrics.total_conversations,
      icon: Users,
      description: 'Número total de conversas',
    },
    {
      title: 'Conversas Ativas',
      value: metrics.active_conversations,
      icon: Activity,
      description: 'Conversas em andamento',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Métricas do Agente
          </CardTitle>
          <CardDescription>
            Estatísticas de uso e performance do seu agente
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
