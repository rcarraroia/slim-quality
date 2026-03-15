import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, Loader2, Save } from 'lucide-react';
import { agentService } from '@/services/agent.service';
import { useToast } from '@/hooks/use-toast';

export function AgentConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    agent_name: 'BIA',
    agent_personality: '',
    tone: 'amigavel' as 'amigavel' | 'formal' | 'casual' | 'tecnico',
    knowledge_enabled: true,
    tts_enabled: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await agentService.getConfig();
      setConfig(data);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await agentService.updateConfig(config);
      toast({
        title: 'Configuração salva',
        description: 'As alterações foram aplicadas com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração do Agente
        </CardTitle>
        <CardDescription>
          Personalize o comportamento e personalidade do seu agente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="agent_name">Nome do Agente</Label>
          <Input
            id="agent_name"
            value={config.agent_name}
            onChange={(e) => setConfig({ ...config, agent_name: e.target.value })}
            placeholder="BIA"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tone">Tom de Voz</Label>
          <Select value={config.tone} onValueChange={(value: any) => setConfig({ ...config, tone: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amigavel">Amigável</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="personality">Personalidade (Opcional)</Label>
          <Textarea
            id="personality"
            value={config.agent_personality || ''}
            onChange={(e) => setConfig({ ...config, agent_personality: e.target.value })}
            placeholder="Descreva como você quer que seu agente se comporte..."
            rows={4}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Usar Aprendizados (Napkin)</Label>
            <p className="text-sm text-muted-foreground">
              Permite que o agente use conhecimentos aprendidos
            </p>
          </div>
          <Switch
            checked={config.knowledge_enabled}
            onCheckedChange={(checked) => setConfig({ ...config, knowledge_enabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Respostas em Áudio</Label>
            <p className="text-sm text-muted-foreground">
              Enviar respostas como mensagens de voz
            </p>
          </div>
          <Switch
            checked={config.tts_enabled}
            onCheckedChange={(checked) => setConfig({ ...config, tts_enabled: checked })}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configuração
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
