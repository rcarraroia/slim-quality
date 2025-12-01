/**
 * My Commissions Hook
 * Hook para gerenciar comissões do afiliado logado
 */

import { useState, useEffect, useCallback } from 'react';
import { commissionFrontendService } from '@/services/commission-frontend.service';
import { useToast } from '@/hooks/use-toast';

interface UseMyCommissionsOptions {
  page?: number;
  limit?: number;
  status?: string;
  autoLoad?: boolean;
}

export const useMyCommissions = (options: UseMyCommissionsOptions = {}) => {
  const { page = 1, limit = 20, status, autoLoad = true } = options;
  const { toast } = useToast();

  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados
  const [commissions, setCommissions] = useState(null);
  const [summary, setSummary] = useState(null);

  // Carregar comissões
  const loadCommissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { page, limit, status };
      const data = await commissionFrontendService.getMyCommissions(params);

      setCommissions(data);
    } catch (err) {
      const errorMessage = 'Erro ao carregar comissões';
      setError(errorMessage);

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, toast]);

  // Carregar resumo de comissões
  const loadSummary = useCallback(async () => {
    try {
      const data = await commissionFrontendService.getMyCommissionsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Erro ao carregar resumo de comissões:', err);
      // Não mostra toast para erro de resumo
    }
  }, []);

  // Carregar todos os dados
  const loadAllData = useCallback(async () => {
    await Promise.all([loadCommissions(), loadSummary()]);
  }, [loadCommissions, loadSummary]);

  // Carregar dados automaticamente
  useEffect(() => {
    if (autoLoad) {
      loadAllData();
    }
  }, [autoLoad, loadAllData]);

  return {
    // Estados
    loading,
    error,

    // Dados
    commissions,
    summary,

    // Ações
    loadCommissions,
    loadSummary,
    loadAllData,

    // Refresh
    refresh: loadAllData
  };
};