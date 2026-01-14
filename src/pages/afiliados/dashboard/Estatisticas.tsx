import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  MousePointerClick,
  Loader2,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";

export default function AffiliateDashboardEstatisticas() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      const data = await affiliateFrontendService.getStats();
      setStats(data);
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      
      toast({
        title: "Erro ao carregar estatísticas",
        description: "Não foi possível carregar as estatísticas. Tente novamente.",
        variant: "destructive"
      });
      
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando estatísticas...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Estatísticas indisponíveis</h3>
        <p className="text-muted-foreground">
          Não foi possível carregar as estatísticas. Tente novamente mais tarde.
        </p>
      </div>
    );
  }

  const { overview, performance, conversionFunnel, networkGrowth } = stats;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Cliques</p>
                <p className="text-3xl font-bold text-primary">{overview.totalClicks}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MousePointerClick className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversões</p>
                <p className="text-3xl font-bold text-success">{overview.totalConversions}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-warning">{overview.conversionRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comissão Média</p>
                <p className="text-3xl font-bold text-info">R$ {overview.avgCommission}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          {performance && performance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="commissions" 
                  stroke="#10b981" 
                  name="Comissões (R$)"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="#3b82f6" 
                  name="Conversões"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Sem dados de performance ainda. Continue trabalhando!
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Funil de Conversão */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            {conversionFunnel && conversionFunnel.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionFunnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Sem dados de conversão ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crescimento da Rede */}
        <Card>
          <CardHeader>
            <CardTitle>Crescimento da Rede</CardTitle>
          </CardHeader>
          <CardContent>
            {networkGrowth && networkGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={networkGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="newAffiliates" 
                    stroke="#f59e0b" 
                    name="Novos Afiliados"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    name="Total Acumulado"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Sua rede ainda não começou a crescer
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total em Comissões</p>
              <p className="text-2xl font-bold text-success">
                R$ {overview.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Membro desde</p>
              <p className="text-2xl font-bold text-primary">
                {new Date(overview.memberSince).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Dias como afiliado</p>
              <p className="text-2xl font-bold text-info">
                {Math.floor((Date.now() - new Date(overview.memberSince).getTime()) / (1000 * 60 * 60 * 24))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
