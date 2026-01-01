import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { Search, Plus, MessageSquare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Conversas() {
  const [statusFilter, setStatusFilter] = useState('todas');
  const [channelFilter, setChannelFilter] = useState('todos');
  const [periodoFilter, setPeriodoFilter] = useState('7dias');
  const [searchQuery, setSearchQuery] = useState('');

  // Usar hook de conversas em tempo real
  const { conversations, loading, channelCounts } = useRealtimeConversations();

  const filteredConversas = conversations.filter(conversa => {
    if (statusFilter !== 'todas' && conversa.status !== statusFilter) return false;
    if (channelFilter !== 'todos' && conversa.channel !== channelFilter) return false;
    if (searchQuery && !conversa.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="open">Ativas</SelectItem>
                <SelectItem value="pending">Aguardando Resposta</SelectItem>
                <SelectItem value="in_progress">Em Negociação</SelectItem>
                <SelectItem value="closed">Finalizadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Novo filtro por canal */}
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Canais</SelectItem>
                <SelectItem value="whatsapp">📱 WhatsApp ({channelCounts.whatsapp})</SelectItem>
                <SelectItem value="site">🌐 Site ({channelCounts.site})</SelectItem>
                <SelectItem value="email">📧 Email ({channelCounts.email})</SelectItem>
                <SelectItem value="chat">💬 Chat ({channelCounts.chat})</SelectItem>
                <SelectItem value="phone">📞 Telefone ({channelCounts.phone})</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou mensagem..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conversa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Conversas */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground">Carregando conversas...</p>
            </div>
          </div>
        ) : filteredConversas.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filteredConversas.map((conversa) => (
            <Card key={conversa.id} className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {conversa.customer?.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{conversa.customer?.name || 'Cliente'}</h3>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={conversa.status} />
                        {/* Badge do canal */}
                        <Badge variant="outline" className="text-xs">
                          {conversa.channel === 'whatsapp' && '📱 WhatsApp'}
                          {conversa.channel === 'site' && '🌐 Site'}
                          {conversa.channel === 'email' && '📧 Email'}
                          {conversa.channel === 'chat' && '💬 Chat'}
                          {conversa.channel === 'phone' && '📞 Telefone'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(conversa.updated_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-muted-foreground">
                      {conversa.last_message_at 
                        ? `Última mensagem em ${new Date(conversa.last_message_at).toLocaleString('pt-BR')}`
                        : 'Sem mensagens'
                      }
                    </p>

                    <div className="flex items-center gap-2">
                      {conversa.session_id && (
                        <Badge variant="secondary">
                          Sessão: {conversa.session_id.slice(0, 8)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="default">Ver Conversa</Button>
                      <Button variant="outline">Marcar como Prioridade</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
