import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ArrowLeft, Send, Phone, Mail, MessageSquare } from 'lucide-react';
import { supabase } from '@/config/supabase';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent';
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface Conversation {
  id: string;
  customer_id: string;
  channel: string;
  status: string;
  subject: string;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

export default function ConversaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Carregar conversa e mensagens
  useEffect(() => {
    if (!id) return;

    const loadConversation = async () => {
      try {
        // Carregar conversa
        const { data: conversationData, error: conversationError } = await supabase
          .from('conversations')
          .select(`
            *,
            customers!inner(
              id,
              name,
              email,
              phone
            )
          `)
          .eq('id', id)
          .single();

        if (conversationError) {
          console.error('Erro ao carregar conversa:', conversationError);
          return;
        }

        setConversation({
          ...conversationData,
          customer: conversationData.customers
        });

        // Carregar mensagens
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', id)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('Erro ao carregar mensagens:', messagesError);
          return;
        }

        setMessages(messagesData || []);
      } catch (error) {
        console.error('Erro geral:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [id]);

  // Enviar nova mensagem
  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation || sending) return;

    setSending(true);
    try {
      // Se for conversa do WhatsApp, enviar via Evolution API
      if (conversation.channel === 'whatsapp' && conversation.customer.phone) {
        const success = await sendWhatsAppMessage(conversation.customer.phone, newMessage);
        if (!success) {
          console.error('Falha ao enviar mensagem via WhatsApp');
          // Continuar para salvar no banco mesmo assim
        }
      }

      const messageData = {
        conversation_id: conversation.id,
        content: newMessage,
        sender_type: 'agent',
        sender_id: conversation.customer.id, // Usar customer_id como sender_id
        message_type: 'text'
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        return;
      }

      // Adicionar mensagem à lista
      setMessages(prev => [...prev, data]);
      setNewMessage('');

      // Atualizar timestamp da conversa
      await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          last_agent_message_at: new Date().toISOString()
        })
        .eq('id', conversation.id);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  // Função para enviar mensagem via WhatsApp Evolution API
  const sendWhatsAppMessage = async (phone: string, message: string): Promise<boolean> => {
    try {
      const agentUrl = 'https://api.slimquality.com.br';  // URL CORRETA
      const evolutionUrl = `${agentUrl}/send-whatsapp`;
      
      const response = await fetch(evolutionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''), // Remover caracteres não numéricos
          message: message
        }),
      });

      if (response.ok) {
        console.log('✅ Mensagem enviada via WhatsApp');
        return true;
      } else {
        console.error('❌ Erro ao enviar via WhatsApp:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro na integração WhatsApp:', error);
      return false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando conversa...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Conversa não encontrada</p>
        <Button onClick={() => navigate('/dashboard/conversas')} className="mt-4">
          Voltar às Conversas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard/conversas')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Conversa com {conversation.customer.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Informações do Cliente */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Informações do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {conversation.customer.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{conversation.customer.name}</p>
                <StatusBadge status={conversation.status} />
              </div>
            </div>

            <div className="space-y-2">
              {conversation.customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{conversation.customer.email}</span>
                </div>
              )}
              {conversation.customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{conversation.customer.phone}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Badge variant="outline">
                {conversation.channel === 'whatsapp' && '📱 WhatsApp'}
                {conversation.channel === 'site' && '🌐 Site'}
                {conversation.channel === 'email' && '📧 Email'}
                {conversation.channel === 'chat' && '💬 Chat'}
                {conversation.channel === 'phone' && '📞 Telefone'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Iniciada em {new Date(conversation.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Mensagens</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Área de mensagens */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma mensagem ainda
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.sender_type === 'agent'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_type === 'agent' 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {new Date(message.created_at).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input de nova mensagem */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}