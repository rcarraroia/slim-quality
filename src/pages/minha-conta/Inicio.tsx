/**
 * Página Inicial do Dashboard do Cliente
 * Rota: /minha-conta
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/config/supabase";
import { ShoppingBag, Package, Clock, CheckCircle, Loader2 } from "lucide-react";

interface OrderSummary {
  total: number;
  pending: number;
  completed: number;
  recent: Array<{
    id: string;
    created_at: string;
    status: string;
    total_cents: number;
  }>;
}

export default function CustomerInicio() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const [orders, setOrders] = useState<OrderSummary>({ total: 0, pending: 0, completed: 0, recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.customerId) {
      loadOrders();
    }
  }, [user?.customerId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Buscar pedidos do cliente
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, status, total_cents')
        .eq('customer_id', user?.customerId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const orderList = data || [];
      
      setOrders({
        total: orderList.length,
        pending: orderList.filter(o => ['pending', 'processing'].includes(o.status)).length,
        completed: orderList.filter(o => o.status === 'completed').length,
        recent: orderList
      });
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'pending': { label: 'Pendente', color: 'text-yellow-600' },
      'processing': { label: 'Processando', color: 'text-blue-600' },
      'shipped': { label: 'Enviado', color: 'text-purple-600' },
      'completed': { label: 'Entregue', color: 'text-green-600' },
      'cancelled': { label: 'Cancelado', color: 'text-red-600' }
    };
    return statusMap[status] || { label: status, color: 'text-gray-600' };
  };

  return (
    <div className="space-y-6">
      {/* Boas-vindas */}
      <div>
        <h2 className="text-2xl font-bold">Olá, {user?.name?.split(' ')[0]}! 👋</h2>
        <p className="text-muted-foreground">Bem-vindo à sua área do cliente Slim Quality.</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{orders.total}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{orders.pending}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{orders.completed}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pedidos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
          <CardDescription>Seus últimos pedidos na Slim Quality</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : orders.recent.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Você ainda não tem pedidos.</p>
              <Button 
                className="mt-4 bg-green-600 hover:bg-green-700"
                onClick={() => navigate('/produtos')}
              >
                Ver Produtos
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.recent.map((order) => {
                const status = getStatusLabel(order.status);
                return (
                  <div 
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/minha-conta/pedidos`)}
                  >
                    <div>
                      <p className="font-medium">Pedido #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(order.total_cents)}</p>
                      <p className={`text-sm ${status.color}`}>{status.label}</p>
                    </div>
                  </div>
                );
              })}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/minha-conta/pedidos')}
              >
                Ver Todos os Pedidos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
