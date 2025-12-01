/**
 * useAdminCommissions Hook
 * Sprint 7: Correções Críticas
 * 
 * Hook para gerenciamento de comissões (admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionService } from '@/services/affiliates/commission.service';
import { useToast } from '@/hooks/use-toast';

export interface CommissionFilters {
  page?: number;
  limit?: number;
  status?: string;
  affiliate_id?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Hook para listar comissões (admin)
 */
export function useAdminCommissions(filters: CommissionFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'commissions', filters],
    queryFn: async () => {
      const result = await commissionService.getAllCommissions(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para buscar comissão por ID (admin)
 */
export function useAdminCommission(id: string) {
  return useQuery({
    queryKey: ['admin', 'commission', id],
    queryFn: async () => {
      const result = await commissionService.getById(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!id,
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para estatísticas de comissões (admin)
 */
export function useCommissionStats(filters?: CommissionFilters) {
  return useQuery({
    queryKey: ['admin', 'commissions', 'stats', filters],
    queryFn: async () => {
      const result = await commissionService.getStats(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para marcar comissão como paga (admin)
 */
export function useMarkCommissionAsPaid() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, adminId }: { id: string; adminId: string }) => {
      const result = await commissionService.markCommissionAsPaid(id, adminId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commission', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions', 'stats'] });

      toast({
        title: 'Comissão marcada como paga',
        description: 'A comissão foi marcada como paga com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao marcar comissão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
