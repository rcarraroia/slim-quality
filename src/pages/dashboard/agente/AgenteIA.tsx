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
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AgenteIA() {
  const navigate = useNavigate();

  // TODO: Integrar com hooks reais quando backend estiver pronto
  const agenteStatus = {
    online: true,
    modelo: 'GPT-4o',
    ultimaAtualizacao: '2025-01-01 10:30',
    aprendizadosPendentes: 3,
    uptime: 99.2,
    latenciaMedia: 1.2
  };

  const conversasRecentes = [
    {
      id: '1',
      dataHora: '31/12 14:30',
      canal: 'WhatsApp',
      status: 'Concluída',
      duracao: '5min',
      conversao: true
    },
    {
      id: '2',
      dataHora: '31/12 14:25',
      canal: 'Site',
      status: 'Ativa',
      duracao: '2min',
      conversao: false
    },
    {
      id: '3',
      dataHora: '31/12 14:20',
      canal: 'WhatsApp',
      status: 'Abandonada',
      duracao: '1min',
      conversao: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agente IA - Overview</h1>
          <p className="text-muted-foreground">
            Visão geral do status e performance do agente inteligente
          </p>
        </div>
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
              <div className={`h-2 w-2 rounded-full ${agenteStatus.online ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="text-2xl font-bold">
                {agenteStatus.online ? 'Online' : 'Offline'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Modelo: {agenteStatus.modelo}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agenteStatus.ultimaAtualizacao}</div>
            <p className="text-xs text-muted-foreground">
              Configuração do sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprendizados Pendentes</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{agenteStatus.aprendizadosPendentes}</div>
              {agenteStatus.aprendizadosPendentes > 0 && (
                <Badge variant="destructive" className="text-xs">
                  Pendente
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agenteStatus.uptime}%</div>
            <p className="text-xs text-muted-foreground">
              Latência: {agenteStatus.latenciaMedia}s
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
            {conversasRecentes.map((conversa) => (
              <div key={conversa.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium">{conversa.dataHora}</div>
                  <Badge variant={conversa.canal === 'Site' ? 'default' : 'secondary'}>
                    {conversa.canal === 'Site' ? '🌐 Site' : '📱 WhatsApp'}
                  </Badge>
                  <div className="text-sm text-muted-foreground">{conversa.status}</div>
                  <div className="text-sm text-muted-foreground">{conversa.duracao}</div>
                </div>
                <div>
                  {conversa.conversao ? (
                    <Badge variant="default">✅ Conversão</Badge>
                  ) : (
                    <Badge variant="outline">-</Badge>
                  )}
                </div>
              </div>
            ))}
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