/**
 * Network Depth Chart Component
 * Sprint 4: Sistema de Afiliados Multinível
 * Gráfico de pizza mostrando distribuição por profundidade da rede
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartWrapper } from '@/components/shared/ChartWrapper';

interface NetworkDepthData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface NetworkDepthChartProps {
  data?: NetworkDepthData[];
  loading?: boolean;
  error?: string;
}

const COLORS = {
  'Apenas N1': '#3B82F6',
  'N1 + N2': '#10B981', 
  'N1 + N2 + N3': '#F59E0B',
  'Sem Rede': '#6B7280'
};

export const NetworkDepthChart = ({ data, loading, error }: NetworkDepthChartProps) => {
  const isEmpty = !data || data.length === 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">
            <span className="font-semibold">{data.value}</span> afiliados ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null; // Não mostrar label para fatias muito pequenas
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ChartWrapper
      title="Distribuição por Profundidade da Rede"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      height="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data?.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name as keyof typeof COLORS] || '#6B7280'} 
              />
            ))}
          </Pie>
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};