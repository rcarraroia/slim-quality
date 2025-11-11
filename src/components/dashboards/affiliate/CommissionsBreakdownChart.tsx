/**
 * Commissions Breakdown Chart Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartWrapper } from '@/components/shared/ChartWrapper';

interface CommissionBreakdownData {
  level: string;
  percentage: number;
  valueCents: number;
  color: string;
}

interface CommissionsBreakdownChartProps {
  data?: CommissionBreakdownData[];
  loading?: boolean;
  error?: string;
}

export const CommissionsBreakdownChart = ({ data, loading, error }: CommissionsBreakdownChartProps) => {
  const isEmpty = !data || data.length === 0;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.level}</p>
          <p className="text-sm">
            Percentual: <span className="font-semibold">{data.percentage}%</span>
          </p>
          <p className="text-sm">
            Valor: <span className="font-semibold">{formatCurrency(data.valueCents)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
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
        {`${percentage}%`}
      </text>
    );
  };

  return (
    <ChartWrapper
      title="Comissões por Nível"
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
            dataKey="valueCents"
          >
            {data?.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>
                {value} ({entry.payload.percentage}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};