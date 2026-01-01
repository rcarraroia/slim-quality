import { useState } from 'react';
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
  MessageSquare
} from 'lucide-react';

export default function AgenteMetricas() {
  const [periodo, setPeriodo] = useState('7d');

  // Dados simulados - TODO: integrar com API real
  const metricas = {
    uptime: 99.2,
    latenciaMedia: 1.2,
    accuracyRate: 84.5,
    tokensConsumidos: 125430,
    respostasGeradas: 1247
  };

  // Dados para gráfico de latência por hora
  const latenciaData = [
    { hora: '00h', latencia: 0.8 },
    { hora: '02h', latencia: 0.9 },
    { hora: '04h', latencia: 0.7 },
    { hora: '06h', latencia: 1.1 },
    { hora: '08h', latencia: 1.4 },
    { hora: '10h', latencia: 1.6 },
    { hora: '12h', latencia: 1.8 },
    { hora: '14h', latencia: 1.5 },
    { hora: '16h', latencia: 1.3 },
    { hora: '18h', latencia: 1.7 },
    { hora: '20h', latencia: 1.4 },
    { hora: '22h', latencia: 1.1 }
  ];

  // Dados para gráfico de tokens por modelo
  const tokensData = [
    { modelo: 'GPT-4o', tokens: 85430, cor: '#3b82f6' },
    { modelo: 'GPT-4o Mini', tokens: 25000, cor: '#10b981' },
    { modelo: 'Claude Sonnet', tokens: 15000, cor: '#f59e0b' }
  ];

  // Dados para gráfico de tipos de pergunta
  const tiposPerguntaData = [
    { tipo: 'Produtos', valor: 35, cor: '#3b82f6' },
    { tipo: 'Preços', valor: 25, cor: '#10b981' },
    { tipo: 'Dúvidas Técnicas', valor: 20, cor: '#f59e0b' },
    { tipo: 'Suporte', valor: 15, cor: '#ef4444' },
    { tipo: 'Outros', valor: 5, cor: '#8b5cf6' }
  ];

  const handleExportCSV = () => {
    // TODO: Implementar exportação CSV
    console.log('Exportando dados para CSV...');
  };

  const handleExportPDF = () => {
    // TODO: Implementar exportação PDF
    console.log('Exportando relatório PDF...');
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
            <div className="text-2xl font-bold">{metricas.uptime}%</div>
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
            <div className="text-2xl font-bold">{metricas.latenciaMedia}s</div>
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
            <div className="text-2xl font-bold">{metricas.accuracyRate}%</div>
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
            <div className="text-2xl font-bold">{metricas.tokensConsumidos.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{metricas.respostasGeradas}</div>
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
              <LineChart data={latenciaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value}s`, 'Latência']}
                  labelFormatter={(label) => `Hora: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="latencia" 
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
              <BarChart data={tokensData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="modelo" />
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
                  <div className="text-4xl font-bold text-green-500">{metricas.uptime}%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                  <Badge variant="default" className="mt-2">
                    Excelente
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
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - metricas.uptime / 100)}`}
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
                  data={tiposPerguntaData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ tipo, valor }) => `${tipo}: ${valor}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="valor"
                >
                  {tiposPerguntaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
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