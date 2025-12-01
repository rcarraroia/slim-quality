/**
 * Sales Hook
 * Hook para gerenciar vendas do admin
 */

import { useState, useEffect, useCallback } from 'react';
import { orderService } from '@/services/sales/order.service';
import { useToast } from '@/hooks/use-toast';

interface UseSalesOptions {
  limit?: number;
  autoLoad?: boolean;
}

export const useSales = (options: UseSalesOptions = {}) => {
  const { limit = 5, autoLoad = true } = options;
  const { toast } = useToast();

  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados
  const [sales, setSales] = useState<any[]>([]);

  // Carregar vendas
  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await orderService.getAllOrders({ limit, page: 1 });
      const data = result.success && result.data ? result.data.data.map(order => ({
        id: order.id,
        cliente: order.customer_name,
        produto: order.items?.[0]?.product_name || 'Produto',
        valor: order.total_cents / 100,
        status: order.status,
        data: new Date(order.createdAt).toLocaleDateString('pt-BR')
      })) : [];
      setSales(data);
    } catch (err) {
      const errorMessage = 'Erro ao carregar vendas';
      setError(errorMessage);

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [limit, toast]);

  // Carregar dados automaticamente
  useEffect(() => {
    if (autoLoad) {
      loadSales();
    }
  }, [autoLoad, loadSales]);

  return {
    // Estados
    loading,
    error,

    // Dados
    sales,

    // Ações
    loadSales,

    // Refresh
    refresh: loadSales
  };
};