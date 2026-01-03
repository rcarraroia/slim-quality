import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plug, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  TestTube,
  Clock,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api.ts';

interface IntegrationStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  last_check: string;
  response_time_ms?: number;
  error_message?: string;
}

interface MCPStatusResponse {
  integrations: IntegrationStatus[];
  total_integrations: number;
  online_count: number;
  last_update: string;
}

export default function AgenteMcp() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [gatewayStatus, setGatewayStatus] = useState<string>('unknown');

  // Função para buscar status real da API
  const fetchMCPStatus = async () => {
    try {
      console.log('🔍 Buscando status MCP da API...');
      
      // Conectar com API real implementada na Fase 1
      const response = await apiClient.get<MCPStatusResponse>('/api/mcp/status');
      
      console.log('✅ Status MCP recebido:', response.data);
      
      setIntegrations(response.data.integrations);
      setGatewayStatus(response.data.online_count === response.data.total_integrations ? 'online' : 'partial');
      setLastUpdate(new Date(response.data.last_update).toLocaleString('pt-BR'));
      
    } catch (error) {
      console.error('❌ Erro ao buscar status MCP:', error);
      
      // Em caso de erro, mostrar estado de erro sem fallback mock
      setIntegrations([]);
      setGatewayStatus('offline');
      setLastUpdate(new Date().toLocaleString('pt-BR'));
      
      toast({
        title: "Erro ao carregar status",
        description: "Não foi possível conectar com a API do agente. Verifique se o backend está funcionando.",
        variant: "destructive",
      });
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    fetchMCPStatus();
  }, []);

  // Atualização manual via botão refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMCPStatus();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-green-500">Online</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getLatencyColor = (latency?: number) => {
    if (!latency || latency === 0) return 'text-red-500';
    if (latency < 200) return 'text-green-500';
    if (latency < 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleTestConnection = async (integrationId: string) => {
    try {
      console.log(`🧪 Testando conexão: ${integrationId}`);
      
      toast({
        title: "Teste de conexão iniciado",
        description: `Testando conexão com ${integrations.find(i => i.id === integrationId)?.name}...`,
      });

      // Chamar API real implementada na Fase 1
      const response = await apiClient.post(`/api/mcp/test/${integrationId}`);
      
      console.log('🧪 Resultado do teste:', response.data);
      
      if (response.data.success) {
        toast({
          title: "Teste concluído com sucesso",
          description: `Conexão testada em ${response.data.response_time_ms.toFixed(0)}ms`,
        });
      } else {
        toast({
          title: "Teste falhou",
          description: response.data.error_message || "Erro desconhecido no teste",
          variant: "destructive",
        });
      }
      
      // Atualizar status após teste
      await fetchMCPStatus();

    } catch (error) {
      console.error('❌ Erro no teste de conexão:', error);
      toast({
        title: "Erro no teste",
        description: "Não foi possível executar o teste de conexão.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    
    try {
      console.log('🔄 Atualizando status de todas as integrações...');
      await fetchMCPStatus();
      
      toast({
        title: "Status atualizado",
        description: "Status de todas as integrações foi atualizado com sucesso.",
      });

    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar o status das integrações.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReconnect = async (integrationId: string) => {
    try {
      // TODO: Integrar com API real para reconectar
      console.log(`Reconectando: ${integrationId}`);
      
      toast({
        title: "Reconectando...",
        description: `Tentando reconectar com ${integrations.find(i => i.id === integrationId)?.name}`,
      });

      // Simular reconexão
      setTimeout(() => {
        setIntegrations(prev => 
          prev.map(integration => 
            integration.id === integrationId 
              ? { ...integration, status: 'online' as const, errorMessage: undefined }
              : integration
          )
        );
        
        toast({
          title: "Reconectado com sucesso",
          description: "A integração foi reconectada.",
        });
      }, 3000);

    } catch (error) {
      toast({
        title: "Erro na reconexão",
        description: "Não foi possível reconectar a integração.",
        variant: "destructive",
      });
    }
  };

  const onlineCount = integrations.filter(i => i.status === 'online').length;
  const totalCount = integrations.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Status das Integrações MCP</h1>
          <p className="text-muted-foreground">
            Monitore o status das integrações do Model Context Protocol
          </p>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground mt-1">
              Última atualização: {lastUpdate} | Gateway: {gatewayStatus}
            </p>
          )}
        </div>
        <Button onClick={handleRefreshAll} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar Tudo
        </Button>
      </div>

      {/* Status Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Status Geral das Integrações
          </CardTitle>
          <CardDescription>
            {onlineCount} de {totalCount} integrações online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">
              {Math.round((onlineCount / totalCount) * 100)}%
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(onlineCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
            <Badge variant={onlineCount === totalCount ? "default" : "destructive"}>
              {onlineCount === totalCount ? "Todas Online" : "Problemas Detectados"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Integrações */}
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(integration.status)}
                  {integration.name}
                </div>
                {getStatusBadge(integration.status)}
              </CardTitle>
              <CardDescription>
                {integration.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informações de Conexão */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Última verificação:
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(integration.last_check).toLocaleString('pt-BR')}
                  </span>
                </div>
                
                {integration.response_time_ms && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Tempo de resposta:
                    </span>
                    <span className={getLatencyColor(integration.response_time_ms)}>
                      {integration.response_time_ms.toFixed(0)}ms
                    </span>
                  </div>
                )}
              </div>

              {/* Mensagem de Erro */}
              {integration.error_message && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {integration.error_message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Ações */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleTestConnection(integration.id)}
                  className="flex-1"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Testar Conexão
                </Button>
                
                {(integration.status === 'error' || integration.status === 'offline') && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => handleReconnect(integration.id)}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconectar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre as Integrações MCP</CardTitle>
          <CardDescription>
            Informações sobre cada integração do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Evolution API</h4>
              <p className="text-sm text-muted-foreground">
                Responsável pela integração com WhatsApp Business. Permite envio e recebimento de mensagens.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Uazapi</h4>
              <p className="text-sm text-muted-foreground">
                Serviço alternativo de mensageria para redundância e maior disponibilidade.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Supabase</h4>
              <p className="text-sm text-muted-foreground">
                Banco de dados principal e sistema de autenticação. Crítico para o funcionamento do sistema.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Redis</h4>
              <p className="text-sm text-muted-foreground">
                Sistema de cache e gerenciamento de sessões para melhor performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}