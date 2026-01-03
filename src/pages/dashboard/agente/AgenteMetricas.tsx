import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  Zap, 
  Target,
  Download,
  FileText,
  Activity,
  Cpu,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface AgentMetrics {
  uptime: number;
  average_latency: number;
  accuracy_rate: number;
  tokens_consumed: number;
  responses_generated: number;
  latency_by_hour: Array<{ hour: string; latency: number }>;
  tokens_by_model: Array<{ model: string; tokens: number; color: string }>;
  question_types: Array<{ type: string; percentage: number; color: string }>;
}

export default function AgenteMetricas() {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState('7d');
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar métricas
  const loadMetrics = async () => {
    try {
      const response = await axios.get<AgentMetrics>(`/api/agent/metrics?period=${periodo}`);
      setMetrics(response.data);
      console.log('✅ Métricas carregadas:', response.data);
    } catch (error) {
      console.error('❌ Erro ao carregar métricas:', error);
      toast({
        title: "Erro ao carregar métricas",
        description: "Não foi possível carregar as métricas do agente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [periodo]);

  const handleExportCSV = async () => {
    try {
      const response = await axios.post('/api/agent/export', {
        format: 'csv',
        period: periodo
      }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agent-metrics-${periodo}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: "Exportação concluída",
        description: "Dados exportados para CSV com sucesso.",
      });
    } catch (error) {
      console.error('❌ Erro ao exportar CSV:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await axios.post('/api/agent/export', {
        format: 'pdf',
        period: periodo
      }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agent-report-${periodo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: "Relatório gerado",
        description: "Relatório PDF gerado com sucesso.",
      });
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar o relatório PDF.",
        variant: "destructive",
      });
    }
  };

  const getPeriodoLabel = (periodo: string) => {
    switch (periodo) {
      case '1d': return 'Hoje';
      case '7d': return 'Últimos 7 dias';
      case '30d': return 'Últimos 30 dias';
      case 'custom': return 'Período customizado';
      default: return 'Últimos 7 dias';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Métricas do Agente IA</h1>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando métricas do agente...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Métricas do Agente IA</h1>
            <p className="text-muted-foreground">Erro ao carregar dados</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p>Não foi possível carregar as métricas. Tente novamente.</p>
          <Button onClick={loadMetrics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas do Agente IA</h1>
          <p className="text-muted-foreground">
            Análise técnica de performance e comportamento do agente
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={loadMetrics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Hoje</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="custom">Período customizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uptime}%</div>
            <p className="text-xs text-muted-foreground">
              Disponibilidade do agente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latência Média</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.average_latency}s</div>
            <p className="text-xs text-muted-foreground">
              Tempo de resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accuracy_rate}%</div>
            <p className="text-xs text-muted-foreground">
              Respostas corretas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Consumidos</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.tokens_consumed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {getPeriodoLabel(periodo)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respostas Geradas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responses_generated}</div>
            <p className="text-xs text-muted-foreground">
              {getPeriodoLabel(periodo)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latência por Hora */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Latência por Hora
            </CardTitle>
            <CardDescription>
              Tempo de resposta ao longo do dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.latency_by_hour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value}s`, 'Latência']}
                  labelFormatter={(label) => `Hora: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tokens por Modelo LLM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Tokens por Modelo LLM
            </CardTitle>
            <CardDescription>
              Distribuição de uso por modelo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.tokens_by_model}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString(), 'Tokens']}
                />
                <Bar dataKey="tokens" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Uptime Gauge (Simulado com Progress) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Uptime Percentage
            </CardTitle>
            <CardDescription>
              Disponibilidade do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-500">{metrics.uptime}%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                  <Badge variant="default" className="mt-2">
                    {metrics.uptime >= 99 ? 'Excelente' : metrics.uptime >= 95 ? 'Bom' : 'Atenção'}
                  </Badge>
                </div>
              </div>
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - metrics.uptime / 100)}`}
                  className="text-green-500"
                />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Tipos de Pergunta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Distribuição de Tipos de Pergunta
            </CardTitle>
            <CardDescription>
              Categorias mais frequentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.question_types}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="percentage"
                >
                  {metrics.question_types.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Botões de Exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Dados
          </CardTitle>
          <CardDescription>
            Baixe os dados das métricas em diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={handleExportCSV} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={handleExportPDF} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}