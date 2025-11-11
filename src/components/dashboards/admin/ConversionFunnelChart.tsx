/**
 * Conversion Funnel Chart Component
 * Sprint 4: Sistema de Afiliados Multinível
 * Gráfico de funil mostrando conversão de afiliados
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartWrapper } from '@/components/shared/ChartWrapper';

interface FunnelStageData {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

interface ConversionFunnelChartProps {
  data?: FunnelStageData[];
  loading?: boolean;
  error?: string;
}

const STAGE_COLORS = {
  'Cadastrados': '#3B82F6',
  'Aprovados': '#10B981',
  'Com Cliques': '#F59E0B',
  'Primeira Venda': '#EF4444',
  'Ativos': '#8B5CF6'
};

export const ConversionFunnelChart = ({ data, loading, error }: ConversionFunnelChartProps) => {
  const isEmpty = !data || data.length === 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-lg font-bold" style={{ color: data.color }}>
            {data.count} afiliados
          </p>
          <p className="text-sm text-gray-600">
            {data.percentage.toFixed(1)}% do total inicial
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ x, y, width, height, value, payload }: any) => {
    return (
      <text 
        x={x + width / 2} 
        y={y + height / 2} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="middle"
        fontSize={14}
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  return (
    <ChartWrapper
      title="Funil de Conversão de Afiliados"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      height="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          
          <XAxis 
            dataKey="stage" 
            stroke="#6B7280"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey="count" 
            label={<CustomLabel />}
            radius={[4, 4, 0, 0]}
          >
            {data?.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={STAGE_COLORS[entry.stage as keyof typeof STAGE_COLORS] || '#6B7280'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Indicadores de Conversão */}
      {data && data.length > 1 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {data.slice(1).map((stage, index) => {
            const previousStage = data[index];
            const conversionRate = previousStage.count > 0 
              ? ((stage.count / previousStage.count) * 100).toFixed(1)
              : '0.0';
            
            return (
              <div key={stage.stage} className="text-center">
                <p className="text-gray-600">{previousStage.stage} → {stage.stage}</p>
                <p className="font-bold text-lg" style={{ color: stage.color }}>
                  {conversionRate}%
                </p>
              </div>
            );
          })}
        </div>
      )}
    </ChartWrapper>
  );
};