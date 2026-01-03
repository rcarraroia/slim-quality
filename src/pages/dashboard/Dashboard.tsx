import { useState, useEffect } from 'react';
import { MessageSquare, DollarSign, TrendingUp, Target, PackageOpen } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';

interface Conversation {
  id: string;
  customer: {
    name: string;
  };
  last_message_at: string;
  updated_at: string;
  status: string;
}

interface Order {
  id: string;
  created_at: string;
  total_cents: number;
  status: string;
  customer_name: string;
  order_items: {
    product_name: string;
  }[];
}

export default function Dashboard() {
  const [vendasRecentes, setVendasRecentes] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    conversasAtivas: 0,
    vendasMes: 0,
    taxaConversao: 0,
    ticketMedio: 0
  });

  // Usar hook de conversas em tempo real
  const { conversations: conversasRecentes, channelCounts } = useRealtimeConversations();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('📊 Carregando dados do dashboard...');
      setLoading(true);
      await Promise.all([
        loadOrders(),
        loadStats()
      ]);
      console.log('✅ Dados do dashboard carregados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      // Não bloquear o dashboard por erro - mostrar dados vazios
    } finally {
      setLoading(false);
    }
  };

  // Remover loadConversations - agora usa useRealtimeConversations

  const loadOrders = async () => {
    try {
      console.log('📦 Carregando pedidos...');
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          total_cents,
          status,
          customer_name,
          order_items(product_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Erro ao carregar vendas:', error);
        return;
      }
      
      console.log(`✅ ${data?.length || 0} pedidos carregados`);
      setVendasRecentes(data || []);
    } catch (error) {
      console.error('💥 Erro geral ao carregar pedidos:', error);
      setVendasRecentes([]);
    }
  };

  const loadStats = async () => {
    try {
      console.log('📈 Carregando estatísticas...');
      
      // Conversas ativas
      const { count: conversasCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Vendas do mês atual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_cents')
        .gte('created_at', startOfMonth.toISOString());

      const vendasMes = ordersData?.reduce((acc, order) => acc + (order.total_cents / 100), 0) || 0;
      const quantidadeVendas = ordersData?.length || 0;
      const ticketMedio = quantidadeVendas > 0 ? vendasMes / quantidadeVendas : 0;

      const newStats = {
        conversasAtivas: conversasCount || 0,
        vendasMes,
        taxaConversao: 0, // Calcular depois se necessário
        ticketMedio
      };
      
      console.log('✅ Estatísticas carregadas:', newStats);
      setStats(newStats);
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      // Manter stats padrão em caso de erro
      setStats({
        conversasAtivas: 0,
        vendasMes: 0,
        taxaConversao: 0,
        ticketMedio: 0
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <PackageOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={MessageSquare}
          label="Conversas Ativas"
          value={stats.conversasAtivas}
          iconColor="text-primary"
        />
        <StatCard
          icon={DollarSign}
          label="Vendas do Mês"
          value={`R$ ${stats.vendasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-success"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value={`${stats.taxaConversao.toFixed(1)}%`}
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Target}
          label="Ticket Médio"
          value={`R$ ${stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-secondary"
        />
      </div>

      {/* Conversas Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Conversas Recentes
            {/* Badges de canal */}
            <div className="flex gap-1">
              {channelCounts.whatsapp > 0 && (
                <Badge variant="secondary" className="text-xs">
                  WhatsApp: {channelCounts.whatsapp}
                </Badge>
              )}
              {channelCounts.site > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Site: {channelCounts.site}
                </Badge>
              )}
              {channelCounts.email > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Email: {channelCounts.email}
                </Badge>
              )}
            </div>
          </CardTitle>
          <Link to="/dashboard/conversas">
            <Button variant="outline" size="sm">Ver Todas</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {conversasRecentes.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma conversa recente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversasRecentes.map((conversa) => (
                <Link
                  key={conversa.id}
                  to={`/dashboard/conversas/${conversa.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conversa.customer?.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{conversa.customer?.name || 'Cliente'}</p>
                      <StatusBadge status={conversa.status as any} />
                      {/* Badge do canal */}
                      <Badge variant="outline" className="text-xs">
                        {conversa.channel === 'whatsapp' && '📱 WhatsApp'}
                        {conversa.channel === 'site' && '🌐 Site'}
                        {conversa.channel === 'email' && '📧 Email'}
                        {conversa.channel === 'chat' && '💬 Chat'}
                        {conversa.channel === 'phone' && '📞 Telefone'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversa.last_message_at ? 'Última mensagem em ' + new Date(conversa.last_message_at).toLocaleString('pt-BR') : 'Sem mensagens'}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(conversa.updated_at).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendas Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vendas Recentes</CardTitle>
          <Link to="/dashboard/vendas">
            <Button variant="outline" size="sm">Ver Todas</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {vendasRecentes.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma venda recente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm">ID</th>
                    <th className="text-left p-3 font-medium text-sm">Cliente</th>
                    <th className="text-left p-3 font-medium text-sm">Produto</th>
                    <th className="text-left p-3 font-medium text-sm">Valor</th>
                    <th className="text-left p-3 font-medium text-sm">Status</th>
                    <th className="text-left p-3 font-medium text-sm">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasRecentes.map((venda, index) => (
                    <tr 
                      key={venda.id}
                      className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                    >
                      <td className="p-3 text-sm">#{venda.id.slice(0, 8)}</td>
                      <td className="p-3 text-sm">{venda.customer_name || 'N/A'}</td>
                      <td className="p-3 text-sm">
                        {venda.order_items?.[0]?.product_name || 'N/A'}
                      </td>
                      <td className="p-3 text-sm font-medium">
                        R$ {(venda.total_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={venda.status as any} />
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(venda.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
