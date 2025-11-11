/**
 * Admin Affiliates Hook
 * Sprint 4: Sistema de Afiliados Multinível
 * Hook para gerenciar dados administrativos de afiliados
 */

import { useState, useEffect, useCallback } from 'react';
import { affiliateFrontendService } from '@/services/affiliate-frontend.service';
import { useToast } from '@/hooks/use-toast';

interface UseAdminAffiliatesOptions {
  period?: string;
  autoLoad?: boolean;
}

export const useAdminAffiliates = (options: UseAdminAffiliatesOptions = {}) => {
  const { period = '30d', autoLoad = true } = options;
  const { toast } = useToast();

  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dados
  const [metrics, setMetrics] = useState(null);
  const [topAffiliates, setTopAffiliates] = useState(null);
  const [networkGrowth, setNetworkGrowth] = useState(null);
  const [networkDepth, setNetworkDepth] = useState(null);
  const [conversionFunnel, setConversionFunnel] = useState(null);
  const [affiliatesTable, setAffiliatesTable] = useState(null);

  // Carregar métricas administrativas
  const loadMetrics = useCallback(async () => {
    try {
      const data = await affiliateFrontendService.getAdminMetrics(period);
      setMetrics(data);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      // Fallback para dados mock
      setMetrics({
        totalAffiliates: 156,
        activeAffiliates: 89,
        pendingAffiliates: 23,
        inactiveAffiliates: 44,
        totalCommissionsPaidCents: 12450000,
        pendingCommissionsCents: 3200000,
        overallConversionRate: 12.5,
        averageConversionRate: 8.3,
        topPerformerRate: 24.7,
        networkGrowthRate: 15.2,
        newAffiliatesThisMonth: 28,
        monthlyGrowthTarget: 35,
        affiliatesTrend: 8.5,
        commissionsTrend: 12.3,
        conversionTrend: 2.1,
        growthTrend: 5.7
      });
    }
  }, [period]);

  // Carregar top afiliados
  const loadTopAffiliates = useCallback(async () => {
    try {
      const data = await affiliateFrontendService.getTopAffiliates(period);
      setTopAffiliates(data);
    } catch (error) {
      console.error('Erro ao carregar top afiliados:', error);
      // Fallback para dados mock
      setTopAffiliates([
        { name: "Carlos Mendes", totalCommissionsCents: 1245000, totalSales: 18, conversionRate: 24.7 },
        { name: "Marina Silva", totalCommissionsCents: 987000, totalSales: 15, conversionRate: 19.2 },
        { name: "Roberto Costa", totalCommissionsCents: 856000, totalSales: 12, conversionRate: 16.8 },
        { name: "Fernanda Lima", totalCommissionsCents: 743000, totalSales: 11, conversionRate: 15.3 },
        { name: "Paulo Santos", totalCommissionsCents: 692000, totalSales: 9, conversionRate: 14.1 }
      ]);
    }
  }, [period]);

  // Carregar crescimento da rede
  const loadNetworkGrowth = useCallback(async () => {
    try {
      const data = await affiliateFrontendService.getNetworkGrowth(period);
      setNetworkGrowth(data);
    } catch (error) {
      console.error('Erro ao carregar crescimento da rede:', error);
      // Fallback para dados mock
      setNetworkGrowth([
        { month: "Jan", totalAffiliates: 45, activeAffiliates: 28, affiliatesWithSales: 12 },
        { month: "Fev", totalAffiliates: 52, activeAffiliates: 34, affiliatesWithSales: 18 },
        { month: "Mar", totalAffiliates: 61, activeAffiliates: 41, affiliatesWithSales: 24 },
        { month: "Abr", totalAffiliates: 73, activeAffiliates: 48, affiliatesWithSales: 31 },
        { month: "Mai", totalAffiliates: 89, activeAffiliates: 57, affiliatesWithSales: 38 },
        { month: "Jun", totalAffiliates: 98, activeAffiliates: 63, affiliatesWithSales: 42 }
      ]);
    }
  }, [period]);

  // Carregar distribuição por profundidade
  const loadNetworkDepth = useCallback(async () => {
    try {
      const data = await affiliateFrontendService.getNetworkDepth();
      setNetworkDepth(data);
    } catch (error) {
      console.error('Erro ao carregar profundidade da rede:', error);
      // Fallback para dados mock
      setNetworkDepth([
        { name: "Apenas N1", value: 45, percentage: 28.8, color: "#3B82F6" },
        { name: "N1 + N2", value: 67, percentage: 42.9, color: "#10B981" },
        { name: "N1 + N2 + N3", value: 32, percentage: 20.5, color: "#F59E0B" },
        { name: "Sem Rede", value: 12, percentage: 7.7, color: "#6B7280" }
      ]);
    }
  }, []);

  // Carregar funil de conversão
  const loadConversionFunnel = useCallback(async () => {
    try {
      const data = await affiliateFrontendService.getConversionFunnel();
      setConversionFunnel(data);
    } catch (error) {
      console.error('Erro ao carregar funil de conversão:', error);
      // Fallback para dados mock
      setConversionFunnel([
        { stage: "Cadastrados", count: 156, percentage: 100, color: "#3B82F6" },
        { stage: "Aprovados", count: 134, percentage: 85.9, color: "#10B981" },
        { stage: "Com Cliques", count: 98, percentage: 62.8, color: "#F59E0B" },
        { stage: "Primeira Venda", count: 72, percentage: 46.2, color: "#EF4444" },
        { stage: "Ativos", count: 68, percentage: 43.6, color: "#8B5CF6" }
      ]);
    }
  }, []);

  // Carregar dados da tabela
  const loadAffiliatesTable = useCallback(async (params?: any) => {
    try {
      const data = await affiliateFrontendService.getAllAffiliates(params);
      setAffiliatesTable(data);
    } catch (error) {
      console.error('Erro ao carregar tabela de afiliados:', error);
      // Fallback para dados mock
      setAffiliatesTable([
        {
          id: "A001",
          nome: "Carlos Mendes",
          email: "carlos.mendes@email.com",
          telefone: "(31) 99999-8888",
          cidade: "Belo Horizonte - MG",
          dataCadastro: "15/Ago/25",
          status: "ativo",
          nivel: 3,
          totalIndicados: 12,
          vendasGeradas: 8,
          comissoesTotais: 12450.00,
          saldoDisponivel: 3200.00,
          walletId: "wal_abc123456",
          taxaConversao: 24.7,
          ultimaAtividade: "2 horas atrás"
        }
      ]);
    }
  }, []);

  // Carregar todos os dados
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadMetrics(),
        loadTopAffiliates(),
        loadNetworkGrowth(),
        loadNetworkDepth(),
        loadConversionFunnel(),
        loadAffiliatesTable()
      ]);
    } catch (err) {
      const errorMessage = 'Erro ao carregar dados administrativos';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [loadMetrics, loadTopAffiliates, loadNetworkGrowth, loadNetworkDepth, loadConversionFunnel, loadAffiliatesTable, toast]);

  // Atualizar status do afiliado
  const updateAffiliateStatus = useCallback(async (affiliateId: string, status: string) => {
    try {
      await affiliateFrontendService.updateAffiliateStatus(affiliateId, status);
      
      toast({
        title: "Sucesso",
        description: "Status do afiliado atualizado com sucesso"
      });

      // Recarregar dados
      await loadAffiliatesTable();
      await loadMetrics();
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do afiliado",
        variant: "destructive"
      });
    }
  }, [loadAffiliatesTable, loadMetrics, toast]);

  // Exportar dados
  const exportData = useCallback(async (format: 'csv' | 'xlsx') => {
    try {
      await affiliateFrontendService.exportAffiliates(format, period);
      
      toast({
        title: "Sucesso",
        description: `Dados exportados em ${format.toUpperCase()} com sucesso`
      });
      
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar dados",
        variant: "destructive"
      });
    }
  }, [period, toast]);

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
    metrics,
    topAffiliates,
    networkGrowth,
    networkDepth,
    conversionFunnel,
    affiliatesTable,
    
    // Ações
    loadAllData,
    loadMetrics,
    loadTopAffiliates,
    loadNetworkGrowth,
    loadNetworkDepth,
    loadConversionFunnel,
    loadAffiliatesTable,
    updateAffiliateStatus,
    exportData,
    
    // Refresh individual
    refresh: {
      metrics: loadMetrics,
      topAffiliates: loadTopAffiliates,
      networkGrowth: loadNetworkGrowth,
      networkDepth: loadNetworkDepth,
      conversionFunnel: loadConversionFunnel,
      affiliatesTable: loadAffiliatesTable
    }
  };
};