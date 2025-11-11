/**
 * Admin Metrics Cards Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { StatCard } from '@/components/dashboard/StatCard';
import { Users, DollarSign, TrendingUp, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminMetricsData {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingAffiliates: number;
  inactiveAffiliates: number;
  totalCommissionsPaidCents: number;
  pendingCommissionsCents: number;
  overallConversionRate: number;
  averageConversionRate: number;
  topPerformerRate: number;
  networkGrowthRate: number;
  newAffiliatesThisMonth: number;
  monthlyGrowthTarget: number;
  affiliatesTrend?: number;
  commissionsTrend?: number;
  conversionTrend?: number;
  growthTrend?: number;
}

interface AdminMetricsCardsProps {
  data?: AdminMetricsData;
  loading?: boolean;
}

export const AdminMetricsCards = ({ data, loading }: AdminMetricsCardsProps) => {
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
            <Skeleton className="h-8 w-8 mb-4" />
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="col-span-full text-center py-8 text-gray-500">
          Erro ao carregar métricas administrativas
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Card 1: Total de Afiliados */}
      <StatCard
        icon={Users}
        label="Total de Afiliados"
        value={data.totalAffiliates.toString()}
        trend={data.affiliatesTrend ? {
          value: `${data.activeAffiliates} ativos, ${data.pendingAffiliates} pendentes`,
          positive: data.affiliatesTrend > 0,
        } : {
          value: `${data.activeAffiliates} ativos, ${data.pendingAffiliates} pendentes`,
          positive: false,
        }}
        iconColor="text-primary"
      />

      {/* Card 2: Comissões Pagas */}
      <StatCard
        icon={DollarSign}
        label="Comissões Pagas"
        value={formatCurrency(data.totalCommissionsPaidCents)}
        trend={data.commissionsTrend ? {
          value: `${formatCurrency(data.pendingCommissionsCents)} pendente`,
          positive: data.commissionsTrend > 0,
        } : {
          value: `${formatCurrency(data.pendingCommissionsCents)} pendente`,
          positive: false,
        }}
        iconColor="text-success"
      />

      {/* Card 3: Taxa de Conversão Geral */}
      <StatCard
        icon={Target}
        label="Taxa de Conversão"
        value={formatPercentage(data.overallConversionRate)}
        trend={data.conversionTrend ? {
          value: `Média: ${formatPercentage(data.averageConversionRate)} | Top: ${formatPercentage(data.topPerformerRate)}`,
          positive: data.conversionTrend > 0,
        } : {
          value: `Média: ${formatPercentage(data.averageConversionRate)}`,
          positive: false,
        }}
        iconColor="text-blue-500"
      />

      {/* Card 4: Crescimento da Rede */}
      <StatCard
        icon={TrendingUp}
        label="Crescimento Mensal"
        value={data.newAffiliatesThisMonth.toString()}
        trend={data.growthTrend ? {
          value: `Meta: ${data.monthlyGrowthTarget} (${formatPercentage((data.newAffiliatesThisMonth / data.monthlyGrowthTarget) * 100)})`,
          positive: data.growthTrend > 0,
        } : {
          value: `Meta: ${data.monthlyGrowthTarget}`,
          positive: false,
        }}
        iconColor="text-secondary"
      />
    </div>
  );
};