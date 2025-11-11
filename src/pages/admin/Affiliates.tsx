/**
 * Complete Admin Affiliates Page
 * Sprint 4: Sistema de Afiliados Multinível
 * Página administrativa completa integrando todos os componentes
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminMetricsCards } from "@/components/dashboards/admin/AdminMetricsCards";
import { TopAffiliatesChart } from "@/components/dashboards/admin/TopAffiliatesChart";
import { NetworkGrowthChart } from "@/components/dashboards/admin/NetworkGrowthChart";
import { NetworkDepthChart } from "@/components/dashboards/admin/NetworkDepthChart";
import { ConversionFunnelChart } from "@/components/dashboards/admin/ConversionFunnelChart";
import { AffiliatesTable } from "@/components/dashboards/admin/AffiliatesTable";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { usePeriodFilter } from "@/hooks/usePeriodFilter";
import { useAdminAffiliates } from "@/hooks/useAdminAffiliates";

export default function AdminAffiliatesPage() {
  const { period, setPeriod } = usePeriodFilter();
  
  // Hook personalizado para gerenciar dados administrativos
  const {
    loading,
    error,
    metrics,
    topAffiliates,
    networkGrowth,
    networkDepth,
    conversionFunnel,
    affiliatesTable,
    updateAffiliateStatus,
    exportData,
    loadAllData
  } = useAdminAffiliates({ period });

  // Handlers simplificados (lógica movida para o hook)
  const handleStatusChange = (affiliateId: string, newStatus: string) => {
    updateAffiliateStatus(affiliateId, newStatus);
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    exportData(format);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Afiliados</h1>
          <p className="text-muted-foreground">
            Painel administrativo completo do sistema de afiliados multinível
          </p>
        </div>
        
        <PeriodFilter 
          value={period} 
          onChange={setPeriod}
          className="w-full md:w-auto"
        />
      </div>

      {/* Métricas Principais */}
      <AdminMetricsCards 
        data={metrics} 
        loading={loading} 
      />

      {/* Tabs com Gráficos e Tabela */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="network">Rede</TabsTrigger>
          <TabsTrigger value="management">Gestão</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Afiliados</CardTitle>
              </CardHeader>
              <CardContent>
                <TopAffiliatesChart 
                  data={topAffiliates}
                  loading={loading}
                  error={error}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crescimento da Rede</CardTitle>
              </CardHeader>
              <CardContent>
                <NetworkGrowthChart 
                  data={networkGrowth}
                  loading={loading}
                  error={error}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Performance */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversionFunnelChart 
                data={conversionFunnel}
                loading={loading}
                error={error}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Rede */}
        <TabsContent value="network" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Profundidade</CardTitle>
            </CardHeader>
            <CardContent>
              <NetworkDepthChart 
                data={networkDepth}
                loading={loading}
                error={error}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Gestão */}
        <TabsContent value="management" className="space-y-6">
          <AffiliatesTable 
            data={affiliatesTable}
            loading={loading}
            onStatusChange={handleStatusChange}
            onExport={handleExport}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}