/**
 * Chat Widget para site público - INTEGRAÇÃO REAL COM AGENTE
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
  autoOpen?: boolean;
}

export function ChatWidget({
  position = 'bottom-right',
  primaryColor = '#10b981',
  title = 'Fale Conosco',
  subtitle = 'Como podemos ajudar?',
  placeholder = 'Digite sua mensagem...',
  onClose,
  autoOpen = false
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
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
      // CONECTAR COM AGENTE REAL - Tentar múltiplas URLs
      let agentResponse = null;
      
      // 1. Tentar agente real em produção
      try {
        console.log('🤖 Tentando agente real...');
        const agentUrl = 'https://slimquality-agent.wpjtfd.easypanel.host/api/chat';
        
        const response = await fetch(agentUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessage,
            lead_id: `site_${sessionId}`,
            platform: 'site'
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.response) {
            agentResponse = data.response;
            console.log('✅ Agente real respondeu');
          }
        }
      } catch (error) {
        console.log('⚠️ Agente real não disponível:', error.message);
      }

      // 2. Se agente real falhou, tentar servidor Express local
      if (!agentResponse) {
        try {
          console.log('🔄 Tentando servidor Express...');
          const response = await fetch('/server/api/chat', {
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
            if (data.success && data.response) {
              agentResponse = data.response;
              console.log('✅ Servidor Express respondeu');
            }
          }
        } catch (error) {
          console.log('⚠️ Servidor Express não disponível:', error.message);
        }
      }

      // 3. Se tudo falhou, usar mensagem de fallback
      if (!agentResponse) {
        throw new Error('Todos os serviços indisponíveis');
      }

      // Sucesso - mostrar resposta
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: agentResponse,
        sender: 'agent',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
      setIsLoading(false);
      
      // Salvar conversa no Supabase para dashboard
      await saveConversationToSupabase(currentMessage, agentResponse);
      return;
      
    } catch (error) {
      console.error('❌ Erro ao conectar com agente:', error);
      
      // Fallback: Mensagem de erro amigável direcionando para WhatsApp
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Desculpe, estou com dificuldades técnicas no momento. 😔 Para um atendimento imediato, entre em contato pelo WhatsApp: (33) 99838-4177. Nossa equipe está pronta para te ajudar!",
        sender: 'agent',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // Função para salvar conversa no Supabase
  const saveConversationToSupabase = async (userMessage: string, agentResponse: string) => {
    try {
      // Usar o servidor Express como proxy para Supabase
      const response = await fetch('/server/api/save-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userMessage,
          agentResponse,
          channel: 'site'
        }),
      });
      
      if (response.ok) {
        console.log('✅ Conversa salva no dashboard');
      } else {
        console.log('⚠️ Erro ao salvar conversa no dashboard');
      }
    } catch (error) {
      console.log('⚠️ Erro ao salvar conversa:', error);
      // Não bloquear o chat por erro de salvamento
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
                    onKeyDown={handleKeyDown}
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