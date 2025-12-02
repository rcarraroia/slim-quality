import { useState, useEffect } from 'react';
import { MessageSquare, DollarSign, TrendingUp, Target, PackageOpen } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';

interface Conversation {
  id: string;
  customer: {
    name: string;
  };
  last_message: string;
  updated_at: string;
  status: string;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  customer: {
    name: string;
  };
  order_items: {
    product: {
      name: string;
    };
  }[];
}

export default function Dashboard() {
  const [conversasRecentes, setConversasRecentes] = useState<Conversation[]>([]);
  const [vendasRecentes, setVendasRecentes] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    conversasAtivas: 0,
    vendasMes: 0,
    taxaConversao: 0,
    ticketMedio: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadConversations(),
        loadOrders(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        last_message,
        updated_at,
        status,
        customer:customers(name)
      `)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Erro ao carregar conversas:', error);
      return;
    }
    setConversasRecentes(data || []);
  };

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        total_amount,
        status,
        customer:customers(name),
        order_items(product:products(name))
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Erro ao carregar vendas:', error);
      return;
    }
    setVendasRecentes(data || []);
  };

  const loadStats = async () => {
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
      .select('total_amount')
      .gte('created_at', startOfMonth.toISOString());

    const vendasMes = ordersData?.reduce((acc, order) => acc + order.total_amount, 0) || 0;
    const quantidadeVendas = ordersData?.length || 0;
    const ticketMedio = quantidadeVendas > 0 ? vendasMes / quantidadeVendas : 0;

    setStats({
      conversasAtivas: conversasCount || 0,
      vendasMes,
      taxaConversao: 0, // Calcular depois se necessário
      ticketMedio
    });
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
          <CardTitle>Conversas Recentes</CardTitle>
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
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversa.last_message || 'Sem mensagens'}
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
                      <td className="p-3 text-sm">{venda.customer?.name || 'N/A'}</td>
                      <td className="p-3 text-sm">
                        {venda.order_items?.[0]?.product?.name || 'N/A'}
                      </td>
                      <td className="p-3 text-sm font-medium">
                        R$ {venda.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
