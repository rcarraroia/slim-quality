import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricsCards } from "@/components/dashboards/affiliate/MetricsCards";
import { ClicksChart } from "@/components/dashboards/affiliate/ClicksChart";
import { ConversionsChart } from "@/components/dashboards/affiliate/ConversionsChart";
import { CommissionsBreakdownChart } from "@/components/dashboards/affiliate/CommissionsBreakdownChart";
import { RecentConversionsTable } from "@/components/dashboards/affiliate/RecentConversionsTable";
import { RecentCommissionsTable } from "@/components/dashboards/affiliate/RecentCommissionsTable";
import { AffiliateNetworkView } from "@/components/dashboards/affiliate/AffiliateNetworkView";
import { ReferralLinkCopy } from "@/components/affiliates/ReferralLinkCopy";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { usePeriodFilter } from "@/hooks/usePeriodFilter";
import { affiliateService } from "@/services/affiliate-frontend.service";
import { TrendingUp } from "lucide-react";

export default function AffiliateDashboardInicio() {
  const { period, changePeriod, getApiParams } = usePeriodFilter('30d');

  // Queries para dados do dashboard
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['affiliate-dashboard', getApiParams()],
    queryFn: () => affiliateService.getMyDashboard(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: clicksData, isLoading: clicksLoading } = useQuery({
    queryKey: ['affiliate-clicks', getApiParams()],
    queryFn: () => affiliateService.getMyClicks(getApiParams()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: conversionsData, isLoading: conversionsLoading } = useQuery({
    queryKey: ['affiliate-conversions', getApiParams()],
    queryFn: () => affiliateService.getMyConversions({ limit: 8 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: commissionsBreakdown, isLoading: commissionsBreakdownLoading } = useQuery({
    queryKey: ['affiliate-commissions-breakdown'],
    queryFn: () => affiliateService.getMyCommissions({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      // Processar dados para o gráfico de pizza
      const breakdown = [
        { level: 'N1 (15%)', percentage: 15, valueCents: 0, color: '#10B981' },
        { level: 'N2 (3%)', percentage: 3, valueCents: 0, color: '#059669' },
        { level: 'N3 (2%)', percentage: 2, valueCents: 0, color: '#047857' },
      ];
      
      data?.commissions?.forEach((commission: any) => {
        const levelIndex = commission.level - 1;
        if (levelIndex >= 0 && levelIndex < 3) {
          breakdown[levelIndex].valueCents += commission.commission_value_cents;
        }
      });
      
      return breakdown.filter(item => item.valueCents > 0);
    },
  });

  const { data: recentConversions, isLoading: recentConversionsLoading } = useQuery({
    queryKey: ['affiliate-recent-conversions'],
    queryFn: () => affiliateService.getMyConversions({ limit: 10 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentCommissions, isLoading: recentCommissionsLoading } = useQuery({
    queryKey: ['affiliate-recent-commissions'],
    queryFn: () => affiliateService.getMyCommissions({ limit: 10 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: networkData, isLoading: networkLoading } = useQuery({
    queryKey: ['affiliate-network'],
    queryFn: () => affiliateService.getMyNetwork(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  const { data: referralLink } = useQuery({
    queryKey: ['affiliate-referral-link'],
    queryFn: () => affiliateService.getMyReferralLink(),
    staleTime: 60 * 60 * 1000, // 1 hora
  });

  return (
    <div className="space-y-6">
      {/* Header com filtro de período */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Acompanhe sua performance como afiliado</p>
        </div>
        <PeriodFilter value={period} onChange={changePeriod} />
      </div>

      {/* Métricas Principais */}
      <MetricsCards 
        data={dashboardData?.metrics} 
        loading={dashboardLoading} 
        period={period.label}
      />

      {/* Link de Indicação */}
      {referralLink && (
        <ReferralLinkCopy
          referralCode={referralLink.code}
          referralUrl={referralLink.url}
          qrCodeUrl={referralLink.qr_code}
        />
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ClicksChart
          data={clicksData?.daily_clicks}
          loading={clicksLoading}
          period={period.label}
        />
        
        <ConversionsChart
          data={conversionsData}
          loading={conversionsLoading}
          period={period.label}
        />
        
        <CommissionsBreakdownChart
          data={commissionsBreakdown}
          loading={commissionsBreakdownLoading}
        />
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentConversionsTable
          data={recentConversions}
          loading={recentConversionsLoading}
        />
        
        <RecentCommissionsTable
          data={recentCommissions?.commissions}
          loading={recentCommissionsLoading}
        />
      </div>

      {/* Rede */}
      <AffiliateNetworkView
        data={networkData}
        loading={networkLoading}
      />

      {/* Metas e Desafios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Metas do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Vendas Diretas (N1)</span>
                <span className="text-sm text-muted-foreground">
                  {dashboardData?.metrics?.total_conversions || 0} / 15
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${Math.min(((dashboardData?.metrics?.total_conversions || 0) / 15) * 100, 100)}%` 
                  }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Faltam {Math.max(15 - (dashboardData?.metrics?.total_conversions || 0), 0)} vendas para bater a meta e ganhar bônus de R$ 500
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Novos Indicados</span>
                <span className="text-sm text-muted-foreground">
                  {networkData?.totalDirects || 0} / 5
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${Math.min(((networkData?.totalDirects || 0) / 5) * 100, 100)}%` 
                  }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Indique mais {Math.max(5 - (networkData?.totalDirects || 0), 0)} pessoas e ganhe acesso ao curso de vendas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
