/**
 * Network Growth Chart Component
 * Sprint 4: Sistema de Afiliados Multinível
 * Gráfico de crescimento da rede nos últimos 12 meses
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartWrapper } from '@/components/shared/ChartWrapper';

interface NetworkGrowthData {
  month: string;
  totalAffiliates: number;
  activeAffiliates: number;
  affiliatesWithSales: number;
}

interface NetworkGrowthChartProps {
  data?: NetworkGrowthData[];
  loading?: boolean;
  error?: string;
}

export const NetworkGrowthChart = ({ data, loading, error }: NetworkGrowthChartProps) => {
  const isEmpty = !data || data.length === 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: <span className="font-semibold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartWrapper
      title="Crescimento da Rede (12 meses)"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      height="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          
          <XAxis 
            dataKey="month" 
            stroke="#6B7280"
            fontSize={12}
          />
          
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend />
          
          <Line 
            type="monotone" 
            dataKey="totalAffiliates" 
            stroke="#3B82F6" 
            strokeWidth={3}
            name="Total de Afiliados"
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          />
          
          <Line 
            type="monotone" 
            dataKey="activeAffiliates" 
            stroke="#10B981" 
            strokeWidth={3}
            name="Afiliados Ativos"
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
          />
          
          <Line 
            type="monotone" 
            dataKey="affiliatesWithSales" 
            stroke="#F59E0B" 
            strokeWidth={3}
            name="Com Vendas"
            dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};