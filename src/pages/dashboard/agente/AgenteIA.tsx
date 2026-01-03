import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Settings, 
  TestTube, 
  FileText, 
  Activity,
  Clock,
  Brain,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '../../../lib/api';

interface AgentStatus {
  status: string;
  uptime_seconds: number;
  model: string;
  sicc_enabled: boolean;
  last_activity: string;
}

interface ConversationSummary {
  id: string;
  customer_name?: string;
  channel: string;
  last_message: string;
  message_count: number;
  updated_at: string;
  status: string;
}

interface AgentMetrics {
  uptime_hours: number;
  total_conversations: number;
  avg_response_time_ms: number;
  success_rate: number;
  tokens_used_today: number;
}

export default function AgenteIA() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estados para dados reais das APIs
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Função para buscar status do agente
  const fetchAgentStatus = async () => {
    try {
      const response = await apiClient.get<AgentStatus>('/api/agent/status');
      setAgentStatus(response.data);
      console.log('✅ Status do agente atualizado:', response.data);
    } catch (error) {
      console.error('❌ Erro ao buscar status do agente:', error);
    }
  };

  // Função para buscar conversas recentes
  const fetchConversations = async () => {
    try {
      const response = await apiClient.get<ConversationSummary[]>('/api/agent/conversations?limit=5');
      setConversations(response.data);
      console.log('✅ Conversas atualizadas:', response.data);
    } catch (error) {
      console.error('❌ Erro ao buscar conversas:', error);
    }
  };

  // Função para buscar métricas básicas
  const fetchMetrics = async () => {
    try {
      const response = await apiClient.get<AgentMetrics>('/api/agent/metrics');
      setMetrics(response.data);
      console.log('✅ Métricas atualizadas:', response.data);
    } catch (error) {
      console.error('❌ Erro ao buscar métricas:', error);
    }
  };

  // Função para carregar todos os dados
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAgentStatus(),
        fetchConversations(),
        fetchMetrics()
      ]);
      setLastUpdate(new Date().toLocaleString('pt-BR'));
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível conectar com a API do agente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    loadAllData();
  }, []);

  // Auto-refresh a cada 30s para status
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgentStatus();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Função para refresh manual
  const handleRefresh = async () => {
    await loadAllData();
    toast({
      title: "Dados atualizados",
      description: "Status do agente foi atualizado com sucesso.",
    });
  };

  // Calcular uptime em formato legível
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Determinar status de conversão
  const getConversionStatus = (conversation: ConversationSummary) => {
    return conversation.status === 'completed' && conversation.message_count > 3;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agente IA - Overview</h1>
          <p className="text-muted-foreground">
            Visão geral do status e performance do agente inteligente
          </p>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground mt-1">
              Última atualização: {lastUpdate}
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Agente</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${agentStatus?.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <div className="text-2xl font-bold">
                {agentStatus?.status === 'online' ? 'Online' : agentStatus?.status || 'Carregando...'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Modelo: {agentStatus?.model || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agentStatus ? formatUptime(agentStatus.uptime_seconds) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              SICC: {agentStatus?.sicc_enabled ? 'Ativo' : 'Inativo'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Hoje</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{metrics?.total_conversations || 0}</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa de sucesso: {metrics ? (metrics.success_rate * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? metrics.avg_response_time_ms.toFixed(0) : 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Tokens hoje: {metrics?.tokens_used_today || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Últimas Conversas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Últimas Conversas
          </CardTitle>
          <CardDescription>
            Conversas recentes processadas pelo agente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversations.length > 0 ? (
              conversations.map((conversa) => (
                <div key={conversa.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium">
                      {new Date(conversa.updated_at).toLocaleString('pt-BR')}
                    </div>
                    <Badge variant={conversa.channel === 'site' ? 'default' : 'secondary'}>
                      {conversa.channel === 'site' ? '🌐 Site' : '📱 WhatsApp'}
                    </Badge>
                    <div className="text-sm text-muted-foreground">{conversa.status}</div>
                    <div className="text-sm text-muted-foreground">{conversa.message_count} msgs</div>
                  </div>
                  <div>
                    {getConversionStatus(conversa) ? (
                      <Badge variant="default">✅ Conversão</Badge>
                    ) : (
                      <Badge variant="outline">-</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                {isLoading ? 'Carregando conversas...' : 'Nenhuma conversa encontrada'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Testar Agente
            </CardTitle>
            <CardDescription>
              Teste o agente com mensagens personalizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Abrir Chat de Teste
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ver Logs
            </CardTitle>
            <CardDescription>
              Visualizar logs detalhados do agente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Abrir Logs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Link para Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração Rápida
          </CardTitle>
          <CardDescription>
            Acesse as configurações do agente para ajustes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => navigate('/dashboard/agente/configuracao')}
            className="w-full"
          >
            Configurar Agente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}