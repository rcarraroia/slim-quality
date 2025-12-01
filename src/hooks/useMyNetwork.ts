/**
 * My Network Hook
 * Hook para gerenciar rede do afiliado logado
 */

import { useState, useEffect, useCallback } from 'react';
import { affiliateFrontendService } from '@/services/affiliate-frontend.service';
import { useToast } from '@/hooks/use-toast';

interface UseMyNetworkOptions {
  autoLoad?: boolean;
}

export const useMyNetwork = (options: UseMyNetworkOptions = {}) => {
  const { autoLoad = true } = options;
  const { toast } = useToast();

  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados
  const [network, setNetwork] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  // Carregar rede
  const loadNetwork = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await affiliateFrontendService.getMyNetwork();
      setNetwork(data);
    } catch (err) {
      const errorMessage = 'Erro ao carregar rede';
      setError(errorMessage);

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar estatísticas da rede (placeholder - implementar quando disponível)
  const loadStats = useCallback(async () => {
    try {
      // TODO: Implementar quando o método estiver disponível no service
      setStats({
        totalDirect: 0,
        totalNetwork: 0,
        activeMembers: 0
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas da rede:', err);
      // Não mostra toast para erro de stats
    }
  }, []);

  // Carregar todos os dados
  const loadAllData = useCallback(async () => {
    await Promise.all([loadNetwork(), loadStats()]);
  }, [loadNetwork, loadStats]);

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
    network,
    stats,

    // Ações
    loadNetwork,
    loadStats,
    loadAllData,

    // Refresh
    refresh: loadAllData
  };
};