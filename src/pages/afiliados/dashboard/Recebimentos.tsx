import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatCard } from "@/components/dashboard/StatCard";
import { Wallet, Download, Info, TrendingUp, Clock, DollarSign } from "lucide-react";
import { useState } from "react";

const recebimentos = [
  { id: 1, data: "12/Out 14:23", descricao: "Comissão venda #1047", origem: "Maria Silva", nivel: "N1", valor: 429.00, status: "recebida" },
  { id: 2, data: "11/Out 10:15", descricao: "Comissão venda #1046", origem: "João Costa", nivel: "N2", valor: 184.50, status: "recebida" },
  { id: 3, data: "10/Out 16:40", descricao: "Comissão venda #1045", origem: "Fernanda Lima", nivel: "N1", valor: 489.00, status: "processando" },
  { id: 4, data: "09/Out 09:30", descricao: "Comissão venda #1044", origem: "Roberto Santos", nivel: "N3", valor: 59.80, status: "recebida" },
  { id: 5, data: "08/Out 18:12", descricao: "Comissão venda #1043", origem: "Paula Souza", nivel: "N2", valor: 245.00, status: "recebida" },
  { id: 6, data: "07/Out 11:45", descricao: "Comissão venda #1042", origem: "André Lima", nivel: "N1", valor: 489.00, status: "recebida" },
  { id: 7, data: "06/Out 14:20", descricao: "Comissão venda #1041", origem: "Carla Mendes", nivel: "N2", valor: 184.50, status: "recebida" },
  { id: 8, data: "05/Out 09:55", descricao: "Comissão venda #1040", origem: "Lucas Silva", nivel: "N1", valor: 429.00, status: "recebida" },
];

export default function AffiliateDashboardRecebimentos() {
  const [periodo, setPeriodo] = useState("mes-atual");

  return (
    <div className="space-y-6">
      {/* Box Informativo */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Info className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-lg">Recebimento Automático via Asaas</h3>
              <p className="text-sm text-muted-foreground">
                Suas comissões são depositadas automaticamente na sua conta Asaas através do sistema de split de pagamento. 
                Não é necessário solicitar saques.
              </p>
              <p className="text-sm font-medium">
                Wallet ID configurada: <span className="font-mono text-primary">wal_000005162549</span>
              </p>
              <Button variant="link" className="h-auto p-0 text-primary">
                Alterar Wallet ID
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={DollarSign}
          label="Recebido em Outubro"
          value="R$ 892,00"
          iconColor="text-success"
        />
        <StatCard
          icon={Clock}
          label="Último Recebimento"
          value="R$ 429,00"
          iconColor="text-primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Processando"
          value="R$ 489,00"
          iconColor="text-orange-600"
        />
      </div>

      {/* Tabela de Recebimentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Histórico de Recebimentos</CardTitle>
          <div className="flex gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes-atual">Este Mês</SelectItem>
                <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
                <SelectItem value="ultimos-3-meses">Últimos 3 Meses</SelectItem>
                <SelectItem value="ano">Este Ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recebimentos.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.data}</TableCell>
                  <TableCell className="font-medium">{item.descricao}</TableCell>
                  <TableCell>{item.origem}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.nivel === "N1" ? "bg-primary/10 text-primary" :
                      item.nivel === "N2" ? "bg-secondary/10 text-secondary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {item.nivel}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-success">
                    R$ {item.valor.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status as any} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal de Recebimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-around gap-2">
            {[
              { mes: "Jan", valor: 750 },
              { mes: "Fev", valor: 620 },
              { mes: "Mar", valor: 890 },
              { mes: "Abr", valor: 1100 },
              { mes: "Mai", valor: 950 },
              { mes: "Jun", valor: 1200 },
              { mes: "Jul", valor: 1050 },
              { mes: "Ago", valor: 1350 },
              { mes: "Set", valor: 1180 },
              { mes: "Out", valor: 892 }
            ].map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-gradient-to-t from-primary to-primary/50 rounded-t-md transition-all hover:opacity-80"
                  style={{ height: `${(item.valor / 1500) * 100}%` }}
                />
                <span className="text-xs font-medium">{item.mes}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
