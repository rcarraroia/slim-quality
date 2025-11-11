import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { conversationFrontendService, type Conversation } from '@/services/frontend/conversation-frontend.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Conversas() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, [statusFilter, channelFilter, searchQuery]);

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

      {/* Lista de Conversas */}
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
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {conversation.customer?.name.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {conversation.customer?.name || 'Cliente'}
                        </h3>
                        {conversation.subject && (
                          <p className="text-sm text-muted-foreground">{conversation.subject}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={conversation.status} />
                        <span className="text-sm text-muted-foreground">
                          {formatTime(conversation.updated_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {channelLabels[conversation.channel] || conversation.channel}
                      </Badge>
                      <Badge variant="secondary">
                        {conversation.priority === 'urgent' ? '🔴 Urgente' :
                         conversation.priority === 'high' ? '🟠 Alta' :
                         conversation.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}
                      </Badge>
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <Badge className="bg-red-500">
                          {conversation.unread_count} nova(s)
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="default">Ver Conversa</Button>
                      <Button variant="outline">Atribuir</Button>
                      {conversation.status === 'open' && (
                        <Button 
                          variant="outline"
                          onClick={() => conversationFrontendService.closeConversation(conversation.id)}
                        >
                          Fechar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
