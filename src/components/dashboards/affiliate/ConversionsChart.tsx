/**
 * Conversions Chart Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartWrapper } from '@/components/shared/ChartWrapper';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversionData {
  week: string;
  conversions: number;
  totalValueCents: number;
}

interface ConversionsChartProps {
  data?: ConversionData[];
  loading?: boolean;
  error?: string;
  period: string;
}

export const ConversionsChart = ({ data, loading, error, period }: ConversionsChartProps) => {
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
          <p className="text-green-600">
            Conversões: <span className="font-semibold">{data.conversions}</span>
          </p>
          <p className="text-blue-600">
            Valor Total: <span className="font-semibold">{formatCurrency(data.totalValueCents)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartWrapper
      title="Conversões por Semana"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      height="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          
          <XAxis 
            dataKey="week" 
            stroke="#6B7280"
            fontSize={12}
          />
          
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey="conversions" 
            fill="#10B981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};