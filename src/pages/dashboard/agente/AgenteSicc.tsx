import { useState } from 'react';
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
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AgenteSicc() {
  const { toast } = useToast();
  
  // Estado das configurações SICC
  const [config, setConfig] = useState({
    siccAtivo: true,
    thresholdAutoAprovacao: [75],
    modeloEmbedding: 'gte-small',
    quotaMemoria: 500
  });

  // Métricas SICC (simuladas - TODO: integrar com API real)
  const metricas = {
    totalMemorias: 347,
    quotaMaxima: config.quotaMemoria,
    ultimoAprendizado: '31/12/2025 14:30',
    taxaAutoAprovacao: 68,
    memoriasEstaSemanana: 23,
    precisaoMedia: 84.5
  };

  const alertas = [
    {
      tipo: 'warning',
      titulo: 'Quota próxima do limite',
      descricao: `${Math.round((metricas.totalMemorias / metricas.quotaMaxima) * 100)}% da quota utilizada`
    },
    {
      tipo: 'info',
      titulo: 'Aprendizados pendentes',
      descricao: '3 aprendizados aguardando aprovação manual'
    }
  ];

  const handleSaveConfig = async () => {
    try {
      // TODO: Integrar com API real
      console.log('Salvando configuração SICC:', config);
      
      toast({
        title: "Configuração SICC salva",
        description: "As configurações do sistema de aprendizado foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações SICC.",
        variant: "destructive",
      });
    }
  };

  const quotaPercentage = (metricas.totalMemorias / metricas.quotaMaxima) * 100;

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
                  checked={config.siccAtivo}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, siccAtivo: checked }))}
                />
              </div>

              {/* Threshold Auto-Aprovação */}
              <div className="space-y-2">
                <Label>Threshold Auto-Aprovação: {config.thresholdAutoAprovacao[0]}%</Label>
                <Slider
                  value={config.thresholdAutoAprovacao}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, thresholdAutoAprovacao: value }))}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                  disabled={!config.siccAtivo}
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
                  value={config.modeloEmbedding} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, modeloEmbedding: value }))}
                  disabled={!config.siccAtivo}
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
                  value={config.quotaMemoria}
                  onChange={(e) => setConfig(prev => ({ ...prev, quotaMemoria: parseInt(e.target.value) }))}
                  min={100}
                  max={2000}
                  disabled={!config.siccAtivo}
                />
                <p className="text-xs text-muted-foreground">
                  Número máximo de memórias armazenadas
                </p>
              </div>

              {/* Botão Salvar */}
              <Button onClick={handleSaveConfig} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
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
                  <span>{metricas.totalMemorias} / {metricas.quotaMaxima}</span>
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
                  <p className="text-sm text-muted-foreground">{metricas.ultimoAprendizado}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Taxa Auto-Aprovação</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metricas.taxaAutoAprovacao}%</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Esta Semana</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metricas.memoriasEstaSemanana} memórias</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Precisão Média</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metricas.precisaoMedia}%</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge variant={config.siccAtivo ? "default" : "secondary"} className="px-4 py-2">
                  {config.siccAtivo ? "✅ SICC Ativo" : "⏸️ SICC Inativo"}
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
              {alertas.map((alerta, index) => (
                <Alert key={index} variant={alerta.tipo === 'warning' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{alerta.titulo}:</strong> {alerta.descricao}
                  </AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}