import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Save,
  TestTube,
  Send,
  RefreshCw,
  Bot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SubAgentCard from '@/components/SubAgentCard';
import agentService from '@/services/agent.service';
import { supabase } from '@/config/supabase';

interface AgentConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
}

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

interface TestPromptResponse {
  response: string;
  tokens_used: number;
  response_time_ms: number;
  model_used: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  time?: number;
}



export default function AgenteConfiguracao() {
  const { toast } = useToast();

  // Estado da configuração
  const [config, setConfig] = useState<AgentConfig>({
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 2000,
    system_prompt: ''
  });

  // Estado dos sub-agentes
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [isLoadingSubAgents, setIsLoadingSubAgents] = useState(true);
  const [isSavingSubAgent, setIsSavingSubAgent] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estado do chat de teste
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Olá! Como posso ajudá-lo hoje?' }
  ]);
  const [testMessage, setTestMessage] = useState('');
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);



  // Carregar configuração atual
  const loadConfig = async () => {
    try {
      const response = await agentService.getConfig();
      if (response.success && response.data) {
        setConfig(response.data);
        console.log('✅ Configuração carregada:', response.data);
      } else {
        throw new Error(response.error || 'Erro ao carregar configuração');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configuração:', error);
      toast({
        title: "Erro ao carregar configuração",
        description: "Usando configuração padrão.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar sub-agentes
  const loadSubAgents = async () => {
    try {
      const response = await agentService.getSubAgents();
      if (response.success && response.data) {
        setSubAgents(response.data);
        console.log('✅ Sub-agentes carregados:', response.data.length);
      } else {
        throw new Error(response.error || 'Erro ao carregar sub-agentes');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar sub-agentes:', error);
      toast({
        title: "Erro ao carregar sub-agentes",
        description: "Não foi possível carregar as configurações dos sub-agentes.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSubAgents(false);
    }
  };

  // Salvar sub-agente
  const handleSaveSubAgent = async (id: string, data: Partial<SubAgent>) => {
    setIsSavingSubAgent(true);
    try {
      const response = await agentService.updateSubAgent(id, data);

      if (response.success && response.data) {
        // Atualizar lista local
        setSubAgents(prev => prev.map(agent =>
          agent.id === id ? response.data! : agent
        ));

        toast({
          title: "Sub-agente atualizado",
          description: "As configurações foram salvas com sucesso.",
        });
      } else {
        throw new Error(response.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar sub-agente:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSavingSubAgent(false);
    }
  };

  // Restaurar padrões do sub-agente
  const handleResetSubAgent = async (id: string) => {
    setIsSavingSubAgent(true);
    try {
      const response = await agentService.resetSubAgent(id);

      if (response.success && response.data) {
        // Atualizar lista local
        setSubAgents(prev => prev.map(agent =>
          agent.id === id ? response.data! : agent
        ));

        toast({
          title: "Configuração restaurada",
          description: "As configurações padrão foram restauradas com sucesso.",
        });
      } else {
        throw new Error(response.error || 'Erro ao restaurar');
      }
    } catch (error) {
      console.error('❌ Erro ao restaurar configuração:', error);
      toast({
        title: "Erro ao restaurar",
        description: "Não foi possível restaurar as configurações. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSavingSubAgent(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadSubAgents();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await agentService.updateConfig(config);

      if (response.success) {
        toast({
          title: "Configuração salva",
          description: "As configurações do agente foram atualizadas com sucesso.",
        });
      } else {
        throw new Error(response.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrompt = async () => {
    if (!testMessage.trim()) return;

    setIsTestingPrompt(true);

    try {
      // Adicionar mensagem do usuário
      const newMessages = [...chatMessages, { role: 'user' as const, content: testMessage }];
      setChatMessages(newMessages);
      setTestMessage('');

      // Testar com API real
      const response = await agentService.testPrompt({
        prompt: testMessage,
        temperature: config.temperature,
        max_tokens: Math.min(config.max_tokens, 300)
      });

      if (response.success && response.data) {
        // Adicionar resposta do agente
        setChatMessages(prev => [...prev, {
          role: 'assistant' as const,
          content: response.data!.response,
          tokens: response.data!.tokens_used,
          time: response.data!.response_time_ms
        }]);
      } else {
        throw new Error(response.error || 'Erro ao processar');
      }
    } catch (error) {
      console.error('❌ Erro no teste de prompt:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: 'Erro ao processar mensagem. Verifique se o backend está funcionando.'
      }]);
    } finally {
      setIsTestingPrompt(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração do Agente</h1>
          <p className="text-muted-foreground">
            Configure os parâmetros do modelo de IA e sub-agentes especializados
          </p>
        </div>
        <Button onClick={() => { loadConfig(); loadSubAgents(); }} disabled={isLoading || isLoadingSubAgents}>
          <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isLoadingSubAgents) ? 'animate-spin' : ''}`} />
          Recarregar
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando configuração...</div>
      ) : (
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="geral">
              <Settings className="h-4 w-4 mr-2" />
              Configuração Geral
            </TabsTrigger>
            <TabsTrigger value="sub-agentes">
              <Bot className="h-4 w-4 mr-2" />
              Sub-Agentes ({subAgents.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">

            {/* Tab: Configuração Geral */}
            <TabsContent value="geral">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Configurações */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configurações do Modelo
                      </CardTitle>
                      <CardDescription>
                        Ajuste os parâmetros do modelo de linguagem
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Modelo LLM */}
                      <div className="space-y-2">
                        <Label htmlFor="modelo">Modelo LLM</Label>
                        <Select value={config.model} onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o modelo" />
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
                        <Label>Temperatura: {config.temperature}</Label>
                        <Slider
                          value={[config.temperature]}
                          onValueChange={(value) => setConfig(prev => ({ ...prev, temperature: value[0] }))}
                          max={2}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Mais conservador</span>
                          <span>Mais criativo</span>
                        </div>
                      </div>

                      {/* Max Tokens */}
                      <div className="space-y-2">
                        <Label htmlFor="maxTokens">Máximo de Tokens</Label>
                        <Input
                          id="maxTokens"
                          type="number"
                          value={config.max_tokens}
                          onChange={(e) => setConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                          min={100}
                          max={4000}
                        />
                      </div>

                      <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Salvando...' : 'Salvar Configuração'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* System Prompt */}
                  <Card>
                    <CardHeader>
                      <CardTitle>System Prompt</CardTitle>
                      <CardDescription>
                        Defina a personalidade e comportamento do agente
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={config.system_prompt}
                        onChange={(e) => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
                        rows={12}
                        placeholder="Digite o prompt do sistema..."
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Chat de Teste */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-5 w-5" />
                      Teste de Prompt
                    </CardTitle>
                    <CardDescription>
                      Teste o comportamento do agente com suas configurações
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Mensagens */}
                      <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-3">
                        {chatMessages.map((message, index) => (
                          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                              }`}>
                              <p className="text-sm">{message.content}</p>
                              {message.tokens && (
                                <p className="text-xs opacity-70 mt-1">
                                  {message.tokens} tokens • {message.time?.toFixed(0)}ms
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {isTestingPrompt && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 p-3 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                <span className="text-sm text-gray-600">Processando...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input de teste */}
                      <div className="flex space-x-2">
                        <Input
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          placeholder="Digite uma mensagem para testar..."
                          onKeyDown={(e) => e.key === 'Enter' && handleTestPrompt()}
                        />
                        <Button onClick={handleTestPrompt} disabled={isTestingPrompt || !testMessage.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Sub-Agentes */}
            <TabsContent value="sub-agentes">
              {isLoadingSubAgents ? (
                <div className="text-center py-8">Carregando sub-agentes...</div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {subAgents.map((agent) => (
                    <SubAgentCard
                      key={agent.id}
                      agent={agent}
                      onSave={handleSaveSubAgent}
                      onReset={handleResetSubAgent}
                      isSaving={isSavingSubAgent}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
