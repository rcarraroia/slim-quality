import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Search, Plus, MessageSquare, Send, X, Phone, Mail, MessageCircle } from 'lucide-react';
import { conversationFrontendService, type Conversation, type Message } from '@/services/frontend/conversation-frontend.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Conversas() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Chat state
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, [statusFilter, channelFilter, searchQuery]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const result = await conversationFrontendService.getMyConversations({
        status: statusFilter as any,
        channel: channelFilter,
        search: searchQuery,
        limit: 50
      });
      setConversations(result.data);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await conversationFrontendService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Erro ao carregar contador:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const result = await conversationFrontendService.getMessages(conversationId, { limit: 100 });
      setMessages(result.data);
      
      // Marcar como lidas
      await conversationFrontendService.markAsRead(conversationId);
      loadUnreadCount();
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      await conversationFrontendService.sendMessage(selectedConversation.id, {
        content: newMessage,
        message_type: 'text'
      });
      
      setNewMessage('');
      await loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    return d.toLocaleDateString('pt-BR');
  };

  const channelLabels: Record<string, string> = {
    whatsapp: 'WhatsApp',
    email: 'Email',
    phone: 'Telefone',
    chat: 'Chat',
    sms: 'SMS'
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversas</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 && `${unreadCount} não lida(s) • `}
            {conversations.length} conversa(s) total
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conversa
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="open">Abertas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="closed">Fechadas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os canais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Split: Lista + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Conversas */}
        <div className={`${selectedConversation ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-4`}>
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Carregando conversas...</p>
              </CardContent>
            </Card>
          ) : conversations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
              </CardContent>
            </Card>
          ) : (
            conversations.map((conversation) => (
              <Card 
                key={conversation.id} 
                className={`hover:shadow-lg transition-all cursor-pointer border-l-4 ${
                  selectedConversation?.id === conversation.id 
                    ? 'border-l-primary bg-accent' 
                    : 'border-l-transparent hover:border-l-primary'
                }`}
                onClick={() => handleSelectConversation(conversation)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conversation.customer?.name.split(' ').map(n => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate">
                          {conversation.customer?.name || 'Cliente'}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.updated_at)}
                        </span>
                      </div>
                      
                      {conversation.subject && (
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {conversation.subject}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {getChannelIcon(conversation.channel)}
                          <span className="ml-1">{channelLabels[conversation.channel]}</span>
                        </Badge>
                        {conversation.unread_count && conversation.unread_count > 0 && (
                          <Badge className="bg-red-500 text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Interface de Chat */}
        {selectedConversation && (
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-16rem)] flex flex-col">
              {/* Header do Chat */}
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedConversation.customer?.name.split(' ').map(n => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedConversation.customer?.name || 'Cliente'}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getChannelIcon(selectedConversation.channel)}
                          <span className="ml-1">{channelLabels[selectedConversation.channel]}</span>
                        </Badge>
                        <StatusBadge status={selectedConversation.status} />
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleCloseChat}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Área de Mensagens */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Carregando mensagens...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.direction === 'outbound'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input de Mensagem */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={sending}
                  />
                  <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
