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

interface IntegrationStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  lastConnection: string;
  latency: number;
  description: string;
  errorMessage?: string;
}

export default function AgenteMcp() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    {
      id: 'evolution-api',
      name: 'Evolution API',
      status: 'online',
      lastConnection: 'há 2 minutos',
      latency: 120,
      description: 'API para integração com WhatsApp Business'
    },
    {
      id: 'uazapi',
      name: 'Uazapi',
      status: 'online',
      lastConnection: 'há 1 minuto',
      latency: 85,
      description: 'Serviço de mensageria alternativo'
    },
    {
      id: 'supabase',
      name: 'Supabase',
      status: 'error',
      lastConnection: 'há 15 minutos',
      latency: 0,
      description: 'Banco de dados e autenticação',
      errorMessage: 'Connection timeout - verificar configuração'
    },
    {
      id: 'redis',
      name: 'Redis',
      status: 'warning',
      lastConnection: 'há 30 segundos',
      latency: 450,
      description: 'Cache e sessões',
      errorMessage: 'Latência alta detectada'
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Atualização manual via botão refresh (sem polling automático)
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Integrar com API real para buscar status
    console.log('Atualizando status das integrações...');
    
    // Simular delay de API
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
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
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency === 0) return 'text-red-500';
    if (latency < 200) return 'text-green-500';
    if (latency < 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleTestConnection = async (integrationId: string) => {
    try {
      // TODO: Integrar com API real para testar conexão
      console.log(`Testando conexão: ${integrationId}`);
      
      toast({
        title: "Teste de conexão iniciado",
        description: `Testando conexão com ${integrations.find(i => i.id === integrationId)?.name}...`,
      });

      // Simular teste
      setTimeout(() => {
        toast({
          title: "Teste concluído",
          description: "Conexão testada com sucesso!",
        });
      }, 2000);

    } catch (error) {
      toast({
        title: "Erro no teste",
        description: "Não foi possível testar a conexão.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    
    try {
      // TODO: Integrar com API real para atualizar status
      console.log('Atualizando status de todas as integrações...');
      
      // Simular atualização
      setTimeout(() => {
        toast({
          title: "Status atualizado",
          description: "Status de todas as integrações foi atualizado.",
        });
        setIsRefreshing(false);
      }, 2000);

    } catch (error) {
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar o status das integrações.",
        variant: "destructive",
      });
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
                    Última conexão:
                  </span>
                  <span className="text-muted-foreground">{integration.lastConnection}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Latência:
                  </span>
                  <span className={getLatencyColor(integration.latency)}>
                    {integration.latency > 0 ? `${integration.latency}ms` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {integration.errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {integration.errorMessage}
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