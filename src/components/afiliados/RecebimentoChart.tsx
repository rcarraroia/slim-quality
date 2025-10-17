import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { mes: "Jan", valor: 420 },
  { mes: "Fev", valor: 680 },
  { mes: "Mar", valor: 850 },
  { mes: "Abr", valor: 1120 },
  { mes: "Mai", valor: 1050 },
  { mes: "Jun", valor: 980 },
  { mes: "Jul", valor: 1340 },
  { mes: "Ago", valor: 1180 },
  { mes: "Set", valor: 960 },
  { mes: "Out", valor: 892 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 border rounded-lg shadow-md">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-primary">
          {`R$ ${payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        </p>
      </div>
    );
  }
  return null;
};

export function RecebimentoChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Mensal de Recebimentos</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mockChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
            <YAxis 
              tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="valor" 
              fill="url(#colorPrimary)" 
              radius={[4, 4, 0, 0]}
            />
            {/* Gradient Definition */}
            <defs>
              <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.5}/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}