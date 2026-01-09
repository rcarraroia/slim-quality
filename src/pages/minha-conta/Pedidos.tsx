/**
 * Página de Pedidos do Cliente
 * Rota: /minha-conta/pedidos
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/config/supabase";
import { Package, Loader2, ChevronRight } from "lucide-react";

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  payment_method?: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_price_cents: number;
  }>;
}

export default function CustomerPedidos() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.customerId) {
      loadOrders();
    }
  }, [user?.customerId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, 
          created_at, 
          status, 
          total_cents,
          payment_method,
          order_items (
            product_name,
            quantity,
            unit_price_cents
          )
        `)
        .eq('customer_id', user?.customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
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
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'pending': { label: 'Pendente', variant: 'outline' },
      'paid': { label: 'Pago', variant: 'default' },
      'processing': { label: 'Processando', variant: 'secondary' },
      'shipped': { label: 'Enviado', variant: 'default' },
      'completed': { label: 'Entregue', variant: 'default' },
      'cancelled': { label: 'Cancelado', variant: 'destructive' }
    };
    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Meus Pedidos</h2>
        <p className="text-muted-foreground">Acompanhe todos os seus pedidos</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Você ainda não realizou nenhuma compra.
            </p>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => navigate('/produtos')}
            >
              Ver Produtos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Pedido #{order.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {formatDate(order.created_at)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent>
                {/* Items do pedido */}
                {order.items && order.items.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span>{formatCurrency(item.unit_price_cents * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <span className="text-sm text-muted-foreground">Total: </span>
                    <span className="font-bold text-lg">{formatCurrency(order.total_cents)}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    Ver Detalhes
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
