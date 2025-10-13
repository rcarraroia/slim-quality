import { MessageSquare, DollarSign, TrendingUp, Target } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { mockConversas, mockVendas } from '@/data/mockData';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const conversasRecentes = mockConversas.slice(0, 5);
  const vendasRecentes = mockVendas.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={MessageSquare}
          label="Conversas Ativas"
          value={47}
          trend={{ value: "+12% vs. semana passada", positive: true }}
          iconColor="text-primary"
        />
        <StatCard
          icon={DollarSign}
          label="Vendas de Outubro"
          value="R$ 187.420"
          trend={{ value: "+8% vs. setembro", positive: true }}
          iconColor="text-success"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value="34,2%"
          trend={{ value: "+2,3% vs. mês passado", positive: true }}
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Target}
          label="Ticket Médio"
          value="R$ 3.987"
          trend={{ value: "Estável", positive: false }}
          iconColor="text-secondary"
        />
      </div>

      {/* Conversas Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conversas Recentes</CardTitle>
          <Link to="/dashboard/conversas">
            <Button variant="outline" size="sm">Ver Todas</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversasRecentes.map((conversa) => (
              <Link
                key={conversa.id}
                to={`/dashboard/conversas/${conversa.id}`}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border"
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {conversa.nome.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{conversa.nome}</p>
                    <StatusBadge status={conversa.status} />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversa.ultimaMensagem}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">{conversa.hora}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vendas da Semana */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vendas da Semana</CardTitle>
          <Link to="/dashboard/vendas">
            <Button variant="outline" size="sm">Ver Todas</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-sm">ID</th>
                  <th className="text-left p-3 font-medium text-sm">Cliente</th>
                  <th className="text-left p-3 font-medium text-sm">Produto</th>
                  <th className="text-left p-3 font-medium text-sm">Valor</th>
                  <th className="text-left p-3 font-medium text-sm">Status</th>
                  <th className="text-left p-3 font-medium text-sm">Data</th>
                </tr>
              </thead>
              <tbody>
                {vendasRecentes.map((venda, index) => (
                  <tr 
                    key={venda.id}
                    className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                  >
                    <td className="p-3 text-sm">#{venda.id}</td>
                    <td className="p-3 text-sm">{venda.cliente}</td>
                    <td className="p-3 text-sm">{venda.produto}</td>
                    <td className="p-3 text-sm font-medium">
                      R$ {venda.valor.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={venda.status} />
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{venda.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
