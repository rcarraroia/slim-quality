import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Bot } from 'lucide-react';

interface SubAgent {
  id: string;
  agent_name: string;
  domain: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
}

interface SubAgentCardProps {
  agent: SubAgent;
  onSave: (id: string, data: Partial<SubAgent>) => Promise<void>;
  onReset: (id: string) => Promise<void>;
  isSaving?: boolean;
}

const domainColors: Record<string, string> = {
  router: 'bg-purple-500',
  discovery: 'bg-blue-500',
  sales: 'bg-green-500',
  support: 'bg-orange-500'
};

const domainLabels: Record<string, string> = {
  router: 'Roteador',
  discovery: 'Descoberta',
  sales: 'Vendas',
  support: 'Suporte'
};

export default function SubAgentCard({ agent, onSave, onReset, isSaving = false }: SubAgentCardProps) {
  const [localAgent, setLocalAgent] = useState<SubAgent>(agent);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    await onSave(agent.id, {
      system_prompt: localAgent.system_prompt,
      model: localAgent.model,
      temperature: localAgent.temperature,
      max_tokens: localAgent.max_tokens
    });
    setIsEditing(false);
  };

  const handleReset = async () => {
    if (confirm(`Tem certeza que deseja restaurar as configurações padrão do ${agent.agent_name}?`)) {
      await onReset(agent.id);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setLocalAgent(agent);
    setIsEditing(false);
  };

  return (
    <Card className={`${isEditing ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${domainColors[agent.domain]}`}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{agent.agent_name}</CardTitle>
              <CardDescription>
                <Badge variant="outline" className="mt-1">
                  {domainLabels[agent.domain]}
                </Badge>
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={handleReset} disabled={isSaving}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restaurar
                </Button>
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Modelo LLM */}
        <div className="space-y-2">
          <Label>Modelo LLM</Label>
          <Select 
            value={localAgent.model} 
            onValueChange={(value) => setLocalAgent(prev => ({ ...prev, model: value }))}
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="claude-sonnet">Claude Sonnet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Temperatura */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Temperatura</Label>
            <span className="text-sm text-muted-foreground">{localAgent.temperature.toFixed(1)}</span>
          </div>
          <Slider
            value={[localAgent.temperature]}
            onValueChange={(value) => setLocalAgent(prev => ({ ...prev, temperature: value[0] }))}
            max={2}
            min={0}
            step={0.1}
            disabled={!isEditing}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Preciso</span>
            <span>Criativo</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <Label>Máximo de Tokens</Label>
          <Input
            type="number"
            value={localAgent.max_tokens}
            onChange={(e) => setLocalAgent(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
            min={100}
            max={4000}
            disabled={!isEditing}
          />
          <p className="text-xs text-muted-foreground">
            Entre 100 e 4000 tokens
          </p>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <Label>System Prompt</Label>
          <Textarea
            value={localAgent.system_prompt}
            onChange={(e) => setLocalAgent(prev => ({ ...prev, system_prompt: e.target.value }))}
            rows={6}
            disabled={!isEditing}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Define o comportamento e personalidade do agente
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
