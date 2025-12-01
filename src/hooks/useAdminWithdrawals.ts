/**
 * useAdminWithdrawals Hook
 * Sprint 7: Correções Críticas
 * 
 * Hook para gerenciamento de saques (admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { withdrawalService } from '@/services/affiliates/withdrawal.service';
import { useToast } from '@/hooks/use-toast';

export interface WithdrawalFilters {
  page?: number;
  limit?: number;
  status?: string;
  affiliate_id?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Hook para listar saques (admin)
 */
export function useAdminWithdrawals(filters: WithdrawalFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'withdrawals', filters],
    queryFn: async () => {
      const result = await withdrawalService.getAllWithdrawals(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para buscar saque por ID (admin)
 */
export function useAdminWithdrawal(id: string) {
  return useQuery({
    queryKey: ['admin', 'withdrawal', id],
    queryFn: async () => {
      const result = await withdrawalService.getById(id);
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
 * Hook para estatísticas de saques (admin)
 */
export function useWithdrawalStats() {
  return useQuery({
    queryKey: ['admin', 'withdrawals', 'stats'],
    queryFn: async () => {
      const result = await withdrawalService.getStats();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para aprovar saque (admin)
 */
export function useApproveWithdrawal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      adminId,
      reason,
    }: {
      id: string;
      adminId: string;
      reason?: string;
    }) => {
      const result = await withdrawalService.approveWithdrawal(id, adminId, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawal', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals', 'stats'] });

      toast({
        title: 'Saque aprovado',
        description: 'O saque foi aprovado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao aprovar saque',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para rejeitar saque (admin)
 */
export function useRejectWithdrawal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      adminId,
      reason,
    }: {
      id: string;
      adminId: string;
      reason: string;
    }) => {
      const result = await withdrawalService.rejectWithdrawal(id, adminId, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawal', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals', 'stats'] });

      toast({
        title: 'Saque rejeitado',
        description: 'O saque foi rejeitado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao rejeitar saque',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
