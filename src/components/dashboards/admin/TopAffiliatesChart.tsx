/**
 * Top Affiliates Chart Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartWrapper } from '@/components/shared/ChartWrapper';

interface TopAffiliateData {
  name: string;
  totalCommissionsCents: number;
  totalSales: number;
  conversionRate: number;
}

interface TopAffiliatesChartProps {
  data?: TopAffiliateData[];
  loading?: boolean;
  error?: string;
}

export const TopAffiliatesChart = ({ data, loading, error }: TopAffiliatesChartProps) => {
  const isEmpty = !data || data.length === 0;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-success">
            Comissões: <span className="font-semibold">{formatCurrency(data.totalCommissionsCents)}</span>
          </p>
          <p className="text-blue-600">
            Vendas: <span className="font-semibold">{data.totalSales}</span>
          </p>
          <p className="text-purple-600">
            Conversão: <span className="font-semibold">{data.conversionRate.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Truncar nomes longos para o eixo Y
  const processedData = data?.map(item => ({
    ...item,
    displayName: item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name,
  }));

  return (
    <ChartWrapper
      title="Top 10 Afiliados"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      height="h-96"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={processedData} 
          layout="horizontal"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          
          <XAxis 
            type="number"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => formatCurrency(value)}
          />
          
          <YAxis 
            type="category"
            dataKey="displayName"
            stroke="#6B7280"
            fontSize={12}
            width={75}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey="totalCommissionsCents" 
            fill="url(#topAffiliatesGradient)"
            radius={[0, 4, 4, 0]}
          />
          
          <defs>
            <linearGradient id="topAffiliatesGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.6} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};