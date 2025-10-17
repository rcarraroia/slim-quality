import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/StatCard';
import { DollarSign, ShoppingCart, Target, TrendingUp, Download, Users, CheckCircle } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Mock Data
const revenueData = [
  { name: '1 Out', receita: 5000, vendas: 2 },
  { name: '5 Out', receita: 8000, vendas: 3 },
  { name: '10 Out', receita: 12000, vendas: 5 },
  { name: '15 Out', receita: 15000, vendas: 4 },
  { name: '20 Out', receita: 10000, vendas: 3 },
  { name: '25 Out', receita: 18000, vendas: 6 },
  { name: '30 Out', receita: 22000, vendas: 7 },
];

const productSalesData = [
  { name: 'Queen', value: 35, color: 'hsl(var(--primary))' },
  { name: 'Casal', value: 40, color: 'hsl(var(--secondary))' },
  { name: 'King', value: 20, color: 'hsl(var(--accent))' },
  { name: 'Solteiro', value: 5, color: 'hsl(var(--muted-foreground))' },
];

const regionSalesData = [
  { region: 'Minas Gerais', vendas: 22 },
  { region: 'São Paulo', vendas: 15 },
  { region: 'Rio de Janeiro', vendas: 10 },
  { region: 'Outras', vendas: 8 },
];

const topClients = [
  { cliente: 'João Silva', ltv: 12450, compras: 3, ultimaCompra: '12/Out/25' },
  { cliente: 'Maria Santos', ltv: 8970, compras: 2, ultimaCompra: '10/Out/25' },
  { cliente: 'Ana Lima', ltv: 7380, compras: 2, ultimaCompra: '08/Out/25' },
];

const topAffiliates = [
  { afiliado: 'Carlos Mendes', vendas: 12, comissoes: 5230, conversao: '67%' },
  { afiliado: 'Juliana Costa', vendas: 8, comissoes: 3410, conversao: '52%' },
  { afiliado: 'Roberto Lima', vendas: 5, comissoes: 2150, conversao: '45%' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 border rounded-lg shadow-md text-sm">
        <p className="font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-primary">Receita: R$ {payload[0].value.toLocaleString('pt-BR')}</p>
        <p className="text-secondary">Vendas: {payload[1].value}</p>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [periodo, setPeriodo] = useState('mes');

  const funnelSteps = [
    { label: 'Visitantes', value: 1247, icon: '👁️', conversion: 100 },
    { label: 'Iniciaram Compra', value: 498, icon: '🛒', conversion: 40 },
    { label: 'Finalizaram Pagamento', value: 339, icon: '💳', conversion: 68 },
    { label: 'Entregas Confirmadas', value: 312, icon: '✅', conversion: 92 },
  ];

  return (
    <div className="space-y-6">
      {/* Período Seletor */}
      <div className="flex flex-wrap gap-2">
        {['Hoje', 'Semana', 'Mês', 'Trimestre', 'Ano', 'Personalizado'].map(p => (
          <Button 
            key={p} 
            variant={periodo === p.toLowerCase() ? 'default' : 'outline'}
            onClick={() => setPeriodo(p.toLowerCase())}
          >
            {p}
          </Button>
        ))}
      </div>

      {/* Seção 1: Visão Geral */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="Receita Total"
          value="R$ 187.420"
          trend={{ value: "+8% vs. período anterior", positive: true }}
          iconColor="text-success"
        />
        <StatCard
          icon={ShoppingCart}
          label="Vendas"
          value={47}
          trend={{ value: "+12% vs. período anterior", positive: true }}
          iconColor="text-primary"
        />
        <StatCard
          icon={Target}
          label="Ticket Médio"
          value="R$ 3.987"
          trend={{ value: "-2% vs. período anterior", positive: false }}
          iconColor="text-secondary"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value="34.2%"
          trend={{ value: "+2.3% vs. período anterior", positive: true }}
          iconColor="text-blue-500"
        />
      </div>

      {/* Seção 2: Gráfico Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Receita e Vendas ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" stroke="hsl(var(--primary))" tickFormatter={(value) => `R$ ${value / 1000}k`} />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--secondary))" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="vendas" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Seção 3: Gráficos Lado a Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productSalesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  {productSalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas por Região</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={regionSalesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="region" stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Seção 4: Funil e Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funil */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnelSteps.map((step, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-lg flex items-center gap-2">
                    {step.icon} {step.label}
                  </p>
                  <p className="font-bold text-xl">{step.value.toLocaleString()}</p>
                </div>
                {index < funnelSteps.length - 1 && (
                  <div className="flex items-center gap-2">
                    <Progress value={step.conversion} className="h-2 flex-1" />
                    <span className="text-sm text-muted-foreground">{step.conversion}% de conversão</span>
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4 border-t">
              <p className="text-lg font-semibold">Taxa de Conversão Geral: 25%</p>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Top Clientes (LTV)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>LTV</TableHead>
                    <TableHead>Compras</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClients.map((client, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{client.cliente}</TableCell>
                      <TableCell className="font-bold text-primary">R$ {client.ltv.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{client.compras}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle className="text-lg">Top Afiliados</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Comissões</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAffiliates.map((aff, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{aff.afiliado}</TableCell>
                      <TableCell>{aff.vendas}</TableCell>
                      <TableCell className="font-bold text-success">R$ {aff.comissoes.toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seção 6: Relatórios Exportáveis */}
      <Card>
        <CardHeader><CardTitle>Relatórios Exportáveis</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: 'Relatório de Vendas', desc: 'Todas as vendas do período com detalhes', format: 'Excel' },
              { title: 'Relatório de Clientes', desc: 'Lista completa de clientes com LTV', format: 'CSV' },
              { title: 'Relatório de Comissões', desc: 'Comissões pagas e pendentes aos afiliados', format: 'PDF' },
              { title: 'Relatório Financeiro', desc: 'Demonstrativo financeiro completo', format: 'Excel' },
            ].map((report, i) => (
              <Card key={i} className="p-4 space-y-3">
                <h4 className="font-semibold">{report.title}</h4>
                <p className="text-sm text-muted-foreground">{report.desc}</p>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Download className="h-4 w-4" /> Exportar {report.format}
                </Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}