import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/StatCard';
import { DollarSign, ShoppingCart, Target, TrendingUp, Download, PackageOpen } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/config/supabase';

interface RevenueData {
  name: string;
  receita: number;
  vendas: number;
}

interface TopClient {
  customer_id: string;
  customer_name: string;
  total_amount: number;
  order_count: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [stats, setStats] = useState({
    totalReceita: 0,
    totalVendas: 0,
    ticketMedio: 0,
    crescimento: 0
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRevenueData(),
        loadTopClients(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueData = async () => {
    // Buscar vendas dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao carregar receita:', error);
      return;
    }

    // Agrupar por dia
    const groupedData: { [key: string]: { receita: number; vendas: number } } = {};
    
    data?.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short' 
      });
      
      if (!groupedData[date]) {
        groupedData[date] = { receita: 0, vendas: 0 };
      }
      
      groupedData[date].receita += order.total_amount;
      groupedData[date].vendas += 1;
    });

    const chartData = Object.entries(groupedData).map(([name, data]) => ({
      name,
      receita: data.receita,
      vendas: data.vendas
    }));

    setRevenueData(chartData);
  };

  const loadTopClients = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        customer_id,
        total_amount,
        customer:customers(name)
      `);

    if (error) {
      console.error('Erro ao carregar top clientes:', error);
      return;
    }

    // Agrupar por cliente
    const clientMap: { [key: string]: { name: string; total: number; count: number } } = {};
    
    data?.forEach(order => {
      const customerId = order.customer_id;
      const customerName = (order.customer as any)?.name || 'N/A';
      
      if (!clientMap[customerId]) {
        clientMap[customerId] = { name: customerName, total: 0, count: 0 };
      }
      
      clientMap[customerId].total += order.total_amount;
      clientMap[customerId].count += 1;
    });

    // Converter para array e ordenar
    const topClientsArray = Object.entries(clientMap)
      .map(([id, data]) => ({
        customer_id: id,
        customer_name: data.name,
        total_amount: data.total,
        order_count: data.count
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5);

    setTopClients(topClientsArray);
  };

  const loadStats = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount');

    if (error) {
      console.error('Erro ao carregar stats:', error);
      return;
    }

    const totalReceita = data?.reduce((acc, order) => acc + order.total_amount, 0) || 0;
    const totalVendas = data?.length || 0;
    const ticketMedio = totalVendas > 0 ? totalReceita / totalVendas : 0;

    setStats({
      totalReceita,
      totalVendas,
      ticketMedio,
      crescimento: 0 // Calcular depois se necessário
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <PackageOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics & Relatórios</h2>
          <p className="text-muted-foreground">Análise detalhada de desempenho</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="Receita Total"
          value={`R$ ${stats.totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-success"
        />
        <StatCard
          icon={ShoppingCart}
          label="Total de Vendas"
          value={stats.totalVendas}
          iconColor="text-primary"
        />
        <StatCard
          icon={Target}
          label="Ticket Médio"
          value={`R$ ${stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-secondary"
        />
        <StatCard
          icon={TrendingUp}
          label="Crescimento"
          value={`${stats.crescimento.toFixed(1)}%`}
          iconColor="text-blue-500"
        />
      </div>

      {/* Gráfico de Receita */}
      <Card>
        <CardHeader>
          <CardTitle>Receita e Vendas - Últimos 30 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.length === 0 ? (
            <div className="text-center py-12">
              <PackageOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum dado disponível</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="receita" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Receita (R$)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="vendas" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Vendas"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Clientes por LTV</CardTitle>
        </CardHeader>
        <CardContent>
          {topClients.length === 0 ? (
            <div className="text-center py-8">
              <PackageOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>LTV</TableHead>
                  <TableHead>Compras</TableHead>
                  <TableHead>Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((client) => (
                  <TableRow key={client.customer_id}>
                    <TableCell className="font-medium">{client.customer_name}</TableCell>
                    <TableCell className="text-primary font-semibold">
                      R$ {client.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{client.order_count}</TableCell>
                    <TableCell>
                      R$ {(client.total_amount / client.order_count).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
