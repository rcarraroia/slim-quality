import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Save, 
  AlertTriangle, 
  TrendingUp,
  Database,
  Clock,
  Target,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api.ts';

interface SiccConfig {
  enabled: boolean;
  confidence_threshold: number; // Decimal 0-1 (ex: 0.75 = 75%)
  embedding_model: string;
  max_memories: number;
}

interface SiccMetrics {
  total_memories: number;
  quota_max: number;
  last_learning: string;
  auto_approval_rate: number;
  memories_this_week: number;
  average_accuracy: number;
}

interface SiccAlert {
  type: 'warning' | 'info' | 'error';
  title: string;
  description: string;
}

export default function AgenteSicc() {
  const { toast } = useToast();
  
  // Estados
  const [config, setConfig] = useState<SiccConfig>({
    enabled: false,
    confidence_threshold: 0.75, // Decimal 0-1 (75% = 0.75)
    embedding_model: 'gte-small',
    max_memories: 500
  });

  const [metrics, setMetrics] = useState<SiccMetrics>({
    total_memories: 0,
    quota_max: 500,
    last_learning: '',
    auto_approval_rate: 0,
    memories_this_week: 0,
    average_accuracy: 0
  });

  const [alerts, setAlerts] = useState<SiccAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar dados
  const loadData = async () => {
    try {
      const [configResponse, metricsResponse, alertsResponse] = await Promise.all([
        apiClient.get<SiccConfig>('/api/sicc/config'),
        apiClient.get<SiccMetrics>('/api/sicc/metrics'),
        apiClient.get<SiccAlert[]>('/api/sicc/alerts')
      ]);

      setConfig(configResponse.data);
      setMetrics(metricsResponse.data);
      setAlerts(alertsResponse.data);
      
      console.log('✅ Dados SICC carregados:', {
        config: configResponse.data,
        metrics: metricsResponse.data,
        alerts: alertsResponse.data
      });
    } catch (error) {
      console.error('❌ Erro ao carregar dados SICC:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações do SICC.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh para métricas e alertas a cada 60s
  useEffect(() => {
    const interval = setInterval(() => {
      // Recarregar apenas métricas e alertas, não config
      loadData();
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await apiClient.post('/api/sicc/config', config);
      
      toast({
        title: "Configuração SICC salva",
        description: "As configurações do sistema de aprendizado foram atualizadas.",
      });

      // Recarregar dados após salvar para refletir mudanças
      await loadData();
      
    } catch (error) {
      console.error('❌ Erro ao salvar configuração SICC:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações SICC.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const quotaPercentage = metrics.quota_max > 0 ? (metrics.total_memories / metrics.quota_max) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sistema de Aprendizado Contínuo (SICC)</h1>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando configurações do SICC...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistema de Aprendizado Contínuo (SICC)</h1>
          <p className="text-muted-foreground">
            Configure e monitore o sistema inteligente de aprendizado do agente
          </p>
        </div>
        <Button onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configurações SICC */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Configurações SICC
              </CardTitle>
              <CardDescription>
                Ajuste os parâmetros do sistema de aprendizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SICC Ativo */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sicc-ativo">SICC Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar/desativar o sistema de aprendizado
                  </p>
                </div>
                <Switch
                  id="sicc-ativo"
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              {/* Threshold Auto-Aprovação */}
              <div className="space-y-2">
                <Label>Threshold Auto-Aprovação: {Math.round(config.confidence_threshold * 100)}%</Label>
                <Slider
                  value={[config.confidence_threshold * 100]} // Converter para 0-100 para o slider
                  onValueChange={(value) => setConfig(prev => ({ ...prev, confidence_threshold: value[0] / 100 }))} // Converter de volta para 0-1
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                  disabled={!config.enabled}
                />
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Valores baixos podem aprovar respostas inadequadas. Recomendado: 70-85%
                  </AlertDescription>
                </Alert>
              </div>

              {/* Modelo Embedding */}
              <div className="space-y-2">
                <Label htmlFor="modelo-embedding">Modelo Embedding</Label>
                <Select 
                  value={config.embedding_model} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, embedding_model: value }))}
                  disabled={!config.enabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gte-small">GTE-small (Rápido)</SelectItem>
                    <SelectItem value="openai-ada">OpenAI Ada (Preciso)</SelectItem>
                    <SelectItem value="sentence-transformers">Sentence Transformers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quota Memórias */}
              <div className="space-y-2">
                <Label htmlFor="quota-memoria">Quota de Memórias</Label>
                <Input
                  id="quota-memoria"
                  type="number"
                  value={config.max_memories}
                  onChange={(e) => setConfig(prev => ({ ...prev, max_memories: parseInt(e.target.value) }))}
                  min={100}
                  max={2000}
                  disabled={!config.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Número máximo de memórias armazenadas
                </p>
              </div>

              {/* Botão Salvar */}
              <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Métricas e Status */}
        <div className="space-y-6">
          {/* Métricas SICC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Métricas SICC
              </CardTitle>
              <CardDescription>
                Status atual do sistema de aprendizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Uso da Quota */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Memórias</span>
                  <span>{metrics.total_memories} / {metrics.quota_max}</span>
                </div>
                <Progress value={quotaPercentage} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {quotaPercentage.toFixed(1)}% da quota utilizada
                </p>
              </div>

              {/* Métricas Gerais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Último Aprendizado</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {metrics.last_learning || 'Nenhum ainda'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Taxa Auto-Aprovação</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metrics.auto_approval_rate}%</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Esta Semana</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metrics.memories_this_week} memórias</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Precisão Média</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metrics.average_accuracy}%</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge variant={config.enabled ? "default" : "secondary"} className="px-4 py-2">
                  {config.enabled ? "✅ SICC Ativo" : "⏸️ SICC Inativo"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Alertas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alertas do Sistema
              </CardTitle>
              <CardDescription>
                Notificações importantes sobre o SICC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum alerta no momento
                </p>
              ) : (
                alerts.map((alerta, index) => (
                  <Alert key={index} variant={alerta.type === 'warning' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{alerta.title}:</strong> {alerta.description}
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}