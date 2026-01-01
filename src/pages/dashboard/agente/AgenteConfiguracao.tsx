import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Save, 
  TestTube, 
  MessageSquare,
  Send,
  Bot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AgenteConfiguracao() {
  const { toast } = useToast();
  
  // Estado da configuração
  const [config, setConfig] = useState({
    modelo: 'gpt-4o',
    temperatura: [0.7],
    maxTokens: 2000,
    systemPrompt: `Você é um especialista em colchões magnéticos terapêuticos da Slim Quality.

Sua missão é ajudar clientes a encontrar a solução ideal para seus problemas de saúde relacionados ao sono, dores nas costas e circulação.

PRODUTOS DISPONÍVEIS:
- Solteiro (88x188x28cm): R$ 3.190,00
- Padrão (138x188x28cm): R$ 3.290,00 (mais vendido)
- Queen (158x198x30cm): R$ 3.490,00
- King (193x203x30cm): R$ 4.890,00

TECNOLOGIAS INCLUÍDAS:
- Sistema Magnético (240 ímãs de 800 Gauss)
- Infravermelho Longo
- Energia Bioquântica
- Vibromassagem (8 motores)
- Densidade Progressiva
- Cromoterapia
- Perfilado High-Tech
- Tratamento Sanitário

ABORDAGEM:
- Seja consultivo, não vendedor
- Foque nos benefícios para a saúde
- Faça perguntas sobre problemas específicos
- Apresente preço como "investimento na saúde"
- Ofereça condições de pagamento
- Seja empático e educativo`
  });

  // Estado do chat de teste
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Olá! Como posso ajudá-lo hoje?' }
  ]);
  const [testMessage, setTestMessage] = useState('');
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);

  const handleSaveConfig = async () => {
    try {
      // TODO: Integrar com API real
      console.log('Salvando configuração:', config);
      
      toast({
        title: "Configuração salva",
        description: "As configurações do agente foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleTestPrompt = async () => {
    if (!testMessage.trim()) return;

    setIsTestingPrompt(true);
    
    try {
      // Adicionar mensagem do usuário
      const newMessages = [...chatMessages, { role: 'user', content: testMessage }];
      setChatMessages(newMessages);
      setTestMessage('');

      // Simular resposta do agente (TODO: integrar com API real)
      setTimeout(() => {
        const responses = [
          "Entendo sua preocupação com dores nas costas. Nosso colchão magnético pode realmente ajudar! O sistema de 240 ímãs melhora a circulação sanguínea, o que reduz inflamações e alivia dores. Qual é o seu principal problema: dor ao acordar, durante a noite, ou ambos?",
          "Ótima pergunta sobre tamanhos! Para um casal, recomendo o Queen (158x198x30cm) por R$ 3.490. Ele oferece espaço confortável e todas as 8 tecnologias terapêuticas. O investimento se paga rapidamente com a melhoria na qualidade do sono. Posso explicar as condições de pagamento?",
          "O colchão magnético é especialmente eficaz para problemas de circulação! O infravermelho longo penetra 4-5cm na pele, aquecendo os tecidos e melhorando o fluxo sanguíneo. Muitos clientes relatam redução no inchaço das pernas já na primeira semana. Você tem problemas específicos de circulação?"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        setChatMessages(prev => [...prev, { role: 'assistant', content: randomResponse }]);
        setIsTestingPrompt(false);
      }, 1500);
      
    } catch (error) {
      toast({
        title: "Erro no teste",
        description: "Não foi possível testar o prompt. Tente novamente.",
        variant: "destructive",
      });
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
            Configure os parâmetros do modelo de IA e teste prompts
          </p>
        </div>
      </div>

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
                <Select value={config.modelo} onValueChange={(value) => setConfig(prev => ({ ...prev, modelo: value }))}>
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
                <Label>Temperatura: {config.temperatura[0]}</Label>
                <Slider
                  value={config.temperatura}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, temperatura: value }))}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Controla a criatividade das respostas (0 = conservador, 1 = criativo)
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  min={100}
                  max={4000}
                />
                <p className="text-xs text-muted-foreground">
                  Limite máximo de tokens por resposta
                </p>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={config.systemPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Instruções base para o comportamento do agente
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <Button onClick={handleSaveConfig} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configuração
                </Button>
                <Button variant="outline" onClick={handleTestPrompt}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Testar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Chat */}
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Preview Chat
              </CardTitle>
              <CardDescription>
                Teste o agente com as configurações atuais
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mensagens */}
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="h-4 w-4" />
                          <Badge variant="outline" className="text-xs">
                            {config.modelo}
                          </Badge>
                        </div>
                      )}
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
                
                {isTestingPrompt && (
                  <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        <span className="text-sm">Digitando...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Input de Teste */}
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem para testar..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTestPrompt()}
                  disabled={isTestingPrompt}
                />
                <Button 
                  onClick={handleTestPrompt} 
                  disabled={!testMessage.trim() || isTestingPrompt}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}