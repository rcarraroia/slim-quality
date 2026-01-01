/**
 * Chat Widget para site público
 * Sprint 5: Painel Admin - Agente IA
 */

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface ChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  onClose?: () => void;
  autoOpen?: boolean; // Nova prop para controlar abertura automática
}

export function ChatWidget({
  position = 'bottom-right',
  primaryColor = '#10b981',
  title = 'Fale Conosco',
  subtitle = 'Como podemos ajudar?',
  placeholder = 'Digite sua mensagem...',
  onClose,
  autoOpen = false // Por padrão não abre automaticamente
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(autoOpen); // Usar prop autoOpen
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Abrir automaticamente quando autoOpen for true
  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
    }
  }, [autoOpen]);

  // Mensagem de boas-vindas
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        content: 'Olá! 👋 Sou a BIA, assistente da Slim Quality. Como posso ajudar você hoje?',
        sender: 'agent',
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Tentar API real primeiro
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          sessionId,
          customerName: 'Visitante do Site'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.response,
            sender: 'agent',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, agentMessage]);
          return;
        }
      }
    } catch (error) {
      console.log('API não disponível, usando respostas locais...');
    }

    // Fallback: Respostas inteligentes locais
    setTimeout(() => {
      let agentResponse = "Obrigado pela sua mensagem! Sou a BIA, consultora da Slim Quality. Como posso te ajudar hoje?";
      
      const messageLower = currentMessage.toLowerCase();
      
      if (messageLower.includes('dor') || messageLower.includes('coluna') || messageLower.includes('costas') || messageLower.includes('lombar')) {
        agentResponse = "Entendo que você tem dores nas costas! 😔 Nossos colchões magnéticos são especialmente desenvolvidos para alívio de dores e melhora da postura. A magnetoterapia ajuda a relaxar os músculos e melhorar a circulação. Gostaria de saber mais sobre como pode te ajudar?";
      } else if (messageLower.includes('sono') || messageLower.includes('dormir') || messageLower.includes('insônia') || messageLower.includes('acordar')) {
        agentResponse = "Problemas de sono são muito comuns! 😴 Nossos colchões com tecnologia magnética e infravermelho longo ajudam a relaxar o corpo e melhorar a qualidade do sono. Muitos clientes relatam dormir melhor já na primeira semana. Posso te explicar como funciona?";
      } else if (messageLower.includes('preço') || messageLower.includes('valor') || messageLower.includes('quanto') || messageLower.includes('custa')) {
        agentResponse = "Nossos colchões custam a partir de R$ 3.190 (solteiro) até R$ 4.890 (king). 💰 Isso dá menos de R$ 9 por dia - menos que uma pizza! Considerando os benefícios para sua saúde e qualidade de vida, é um investimento que vale muito a pena. Quer saber sobre as opções de pagamento?";
      } else if (messageLower.includes('entrega') || messageLower.includes('frete') || messageLower.includes('prazo') || messageLower.includes('envio')) {
        agentResponse = "Fazemos entrega para todo o Brasil! 🚚 O prazo varia de 5 a 15 dias úteis dependindo da sua região. O frete é calculado no checkout. Qual sua cidade para eu verificar o prazo exato?";
      } else if (messageLower.includes('olá') || messageLower.includes('oi') || messageLower.includes('bom dia') || messageLower.includes('boa tarde') || messageLower.includes('boa noite')) {
        agentResponse = "Olá! 👋 Sou a BIA, consultora da Slim Quality. Estou aqui para te ajudar a encontrar a solução ideal para seus problemas de sono e dores. Nossos colchões magnéticos já transformaram a vida de milhares de pessoas. Como posso te ajudar hoje?";
      } else if (messageLower.includes('magnético') || messageLower.includes('magnetoterapia') || messageLower.includes('tecnologia')) {
        agentResponse = "Que bom que você quer saber sobre nossa tecnologia! 🧲 Nossos colchões têm 240 ímãs de neodímio que criam um campo magnético terapêutico. Isso melhora a circulação, reduz dores e acelera a recuperação muscular. Também temos infravermelho longo, vibromassagem e outras 6 tecnologias. Quer que eu detalhe alguma específica?";
      } else if (messageLower.includes('fibromialgia') || messageLower.includes('artrite') || messageLower.includes('artrose') || messageLower.includes('reumatismo')) {
        agentResponse = "Entendo sua preocupação com essas condições. 🩺 Nossos colchões magnéticos são especialmente indicados para fibromialgia, artrite e outras condições inflamatórias. A magnetoterapia ajuda a reduzir a inflamação e a dor. Muitos clientes com essas condições relatam melhora significativa. Gostaria de conversar sobre seu caso específico?";
      } else if (messageLower.includes('circulação') || messageLower.includes('varizes') || messageLower.includes('pernas') || messageLower.includes('inchaço')) {
        agentResponse = "Problemas circulatórios são muito comuns! 🩸 A magnetoterapia do nosso colchão melhora significativamente a circulação sanguínea, ajudando com varizes, pernas pesadas e inchaço. O campo magnético estimula o fluxo sanguíneo durante toda a noite. Você sente esses sintomas com frequência?";
      } else if (messageLower.includes('comprar') || messageLower.includes('pedido') || messageLower.includes('finalizar')) {
        agentResponse = "Que ótimo que você quer adquirir seu colchão! 🛒 Para finalizar seu pedido com segurança e receber todas as orientações, vou te conectar com nossa equipe especializada. Entre em contato pelo WhatsApp: (33) 99838-4177 ou clique no botão WhatsApp do site. Eles vão te ajudar com tudo!";
      } else if (messageLower.includes('whatsapp') || messageLower.includes('telefone') || messageLower.includes('contato')) {
        agentResponse = "Claro! Você pode falar diretamente com nossa equipe pelo WhatsApp: (33) 99838-4177 📱 Eles estão disponíveis para tirar todas as suas dúvidas e te ajudar a escolher o colchão ideal. Também pode clicar no botão verde do WhatsApp aqui no site!";
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: agentResponse,
        sender: 'agent',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 1000); // Simular tempo de resposta humano
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Chat Window */}
      {isOpen && (
        <Card className={`w-80 h-96 mb-4 shadow-2xl transition-all duration-300 ${
          isMinimized ? 'h-14' : 'h-96'
        }`}>
          <CardHeader className="p-3 border-b" style={{ backgroundColor: primaryColor }}>
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-white text-green-600 text-sm">
                    BIA
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-medium">{title}</CardTitle>
                  <p className="text-xs opacity-90">{subtitle}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={() => {
                    setIsOpen(false);
                    onClose?.();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {!isMinimized && (
            <>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="h-64 overflow-y-auto p-3 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-2 rounded-lg text-sm ${
                          message.sender === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 p-2 rounded-lg text-sm text-gray-600">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>

              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="sm"
                    style={{ backgroundColor: primaryColor }}
                    className="text-white hover:opacity-90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      )}
    </div>
  );
}