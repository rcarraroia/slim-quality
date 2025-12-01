/**
 * useAdminAffiliates Hook
 * Sprint 7: Correções Críticas
 * 
 * Hook para gerenciamento de afiliados (admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAffiliateService } from '@/services/affiliates/admin-affiliate.service';
import { useToast } from '@/hooks/use-toast';

export interface AffiliateFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Hook para listar afiliados (admin)
 */
export function useAdminAffiliates(filters: AffiliateFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'affiliates', filters],
    queryFn: async () => {
      const result = await adminAffiliateService.getAllAffiliates(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para buscar afiliado por ID (admin)
 */
export function useAdminAffiliate(id: string) {
  return useQuery({
    queryKey: ['admin', 'affiliate', id],
    queryFn: async () => {
      const result = await adminAffiliateService.getAffiliateById(id);
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
 * Hook para atualizar status de afiliado (admin)
 */
export function useUpdateAffiliateStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => {
      const result = await adminAffiliateService.updateAffiliateStatus(id, status, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['admin', 'affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate', variables.id] });

      toast({
        title: 'Status atualizado',
        description: 'Status do afiliado foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para buscar rede de afiliado (admin)
 */
export function useAffiliateNetwork(id: string) {
  return useQuery({
    queryKey: ['admin', 'affiliate', id, 'network'],
    queryFn: async () => {
      const result = await adminAffiliateService.getAffiliateNetwork(id);
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
 * Hook para estatísticas de afiliados (admin)
 */
export function useAffiliateStats() {
  return useQuery({
    queryKey: ['admin', 'affiliates', 'stats'],
    queryFn: async () => {
      const result = await adminAffiliateService.getAffiliateStats();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minuto
  });
}
