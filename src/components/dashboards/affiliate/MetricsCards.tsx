/**
 * Affiliate Metrics Cards Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { StatCard } from '@/components/dashboard/StatCard';
import { MousePointer, Target, DollarSign, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricsData {
  totalClicks: number;
  conversionRate: number;
  totalConversions: number;
  totalCommissionsCents: number;
  pendingCommissionsCents: number;
  activeNetworkSize: number;
  directAffiliates: number;
  indirectAffiliates: number;
  clicksTrend?: number;
  conversionTrend?: number;
  commissionsTrend?: number;
  networkTrend?: number;
}

interface MetricsCardsProps {
  data?: MetricsData;
  loading?: boolean;
  period: string;
}

export const MetricsCards = ({ data, loading, period }: MetricsCardsProps) => {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 border rounded-lg">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="col-span-full text-center py-8 text-gray-500">
          Erro ao carregar métricas
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Card 1: Total de Cliques */}
      <StatCard
        icon={MousePointer}
        label="Total de Cliques"
        value={data.totalClicks.toLocaleString('pt-BR')}
        trend={data.clicksTrend ? {
          value: `${data.clicksTrend > 0 ? '+' : ''}${data.clicksTrend}% vs. período anterior`,
          positive: data.clicksTrend > 0,
        } : undefined}
        iconColor="text-blue-500"
      />

      {/* Card 2: Taxa de Conversão */}
      <StatCard
        icon={Target}
        label="Taxa de Conversão"
        value={formatPercentage(data.conversionRate)}
        trend={data.conversionTrend ? {
          value: `${data.totalConversions} conversões`,
          positive: data.conversionTrend > 0,
        } : undefined}
        iconColor="text-success"
      />

      {/* Card 3: Comissões Totais */}
      <StatCard
        icon={DollarSign}
        label="Comissões Totais"
        value={formatCurrency(data.totalCommissionsCents)}
        trend={{
          value: `${formatCurrency(data.pendingCommissionsCents)} pendente`,
          positive: false,
        }}
        iconColor="text-primary"
      />

      {/* Card 4: Rede Ativa */}
      <StatCard
        icon={Users}
        label="Rede Ativa"
        value={data.activeNetworkSize.toString()}
        trend={{
          value: `${data.directAffiliates} diretos, ${data.indirectAffiliates} indiretos`,
          positive: data.networkTrend ? data.networkTrend > 0 : false,
        }}
        iconColor="text-secondary"
      />
    </div>
  );
};