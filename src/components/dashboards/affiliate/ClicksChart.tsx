/**
 * Clicks Chart Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartWrapper } from '@/components/shared/ChartWrapper';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClickData {
  date: string;
  clicks: number;
  conversions?: number;
}

interface ClicksChartProps {
  data?: ClickData[];
  loading?: boolean;
  error?: string;
  period: string;
}

export const ClicksChart = ({ data, loading, error, period }: ClicksChartProps) => {
  const isEmpty = !data || data.length === 0;

  const formatTooltipDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{formatTooltipDate(label)}</p>
          <p className="text-blue-600">
            Cliques: <span className="font-semibold">{payload[0].value}</span>
          </p>
          {payload[0].payload.conversions !== undefined && (
            <p className="text-green-600">
              Conversões: <span className="font-semibold">{payload[0].payload.conversions}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const formatXAxisDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <ChartWrapper
      title="Cliques por Dia"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      height="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxisDate}
            stroke="#6B7280"
            fontSize={12}
          />
          
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="clicks"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#clicksGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};