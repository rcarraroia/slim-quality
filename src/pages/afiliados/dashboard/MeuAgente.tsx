import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Settings, Brain, BarChart3 } from 'lucide-react';
import { AgentStatus } from '@/components/affiliates/agent/AgentStatus';
import { AgentConfig } from '@/components/affiliates/agent/AgentConfig';
import { AgentNapkin } from '@/components/affiliates/agent/AgentNapkin';
import { AgentMetrics } from '@/components/affiliates/agent/AgentMetrics';
import { agentService } from '@/services/agent.service';
import { useToast } from '@/hooks/use-toast';

export default function MeuAgente() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const { toast } = useToast();

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const statusData = await agentService.getStatus();
      setStatus(statusData.state);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = () => {
    loadStatus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Agente BIA</h1>
        <p className="text-muted-foreground mt-2">
          Configure e gerencie seu assistente virtual inteligente
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="napkin" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Aprendizados
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Métricas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <AgentStatus 
            status={status} 
            onStatusChange={handleStatusChange}
          />
        </TabsContent>

        <TabsContent value="config">
          <AgentConfig />
        </TabsContent>

        <TabsContent value="napkin">
          <AgentNapkin />
        </TabsContent>

        <TabsContent value="metrics">
          <AgentMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
