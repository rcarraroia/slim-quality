import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecebimentoChart } from "@/components/afiliados/RecebimentoChart";
import { Wallet, Download, Info, CreditCard, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface Recebimento {
  id: number;
  data: string;
  descricao: string;
  origem: string;
  nivel: "N1" | "N2" | "N3";
  valor: number;
  status: "depositado" | "processando" | "aguardando";
}

const mockRecebimentos: Recebimento[] = [
  { id: 1, data: "12/Out 14:23", descricao: "Comissão venda #1047", origem: "Maria Silva", nivel: "N1", valor: 523.50, status: "depositado" }, // Atualizado
  { id: 2, data: "11/Out 10:15", descricao: "Comissão venda #1046", origem: "João Costa", nivel: "N2", valor: 98.70, status: "depositado" }, // Atualizado
  { id: 3, data: "10/Out 16:40", descricao: "Comissão venda #1045", origem: "Fernanda Lima", nivel: "N1", valor: 733.50, status: "processando" }, // Atualizado
  { id: 4, data: "09/Out 09:30", descricao: "Comissão venda #1044", origem: "Roberto Santos", nivel: "N3", valor: 63.80, status: "depositado" }, // Atualizado
  { id: 5, data: "08/Out 15:55", descricao: "Comissão venda #1043", origem: "Ana Costa", nivel: "N1", valor: 493.50, status: "depositado" }, // Atualizado
  { id: 6, data: "07/Out 18:12", descricao: "Comissão venda #1042", origem: "Paula Souza", nivel: "N2", valor: 98.70, status: "depositado" }, // Atualizado
  { id: 7, data: "06/Out 11:45", descricao: "Comissão venda #1041", origem: "André Lima", nivel: "N1", valor: 523.50, status: "depositado" }, // Atualizado
  { id: 8, data: "05/Out 14:20", descricao: "Comissão venda #1040", origem: "Carla Mendes", nivel: "N2", valor: 98.70, status: "depositado" }, // Atualizado
  { id: 9, data: "04/Out 09:55", descricao: "Comissão venda #1039", origem: "Lucas Silva", nivel: "N1", valor: 523.50, status: "depositado" }, // Atualizado
  { id: 10, data: "03/Out 16:00", descricao: "Comissão venda #1038", origem: "Pedro Rocha", nivel: "N1", valor: 493.50, status: "depositado" }, // Atualizado
  { id: 11, data: "02/Out 12:30", descricao: "Comissão venda #1037", origem: "Mariana Alves", nivel: "N3", valor: 97.80, status: "depositado" }, // King 2%
  { id: 12, data: "01/Out 08:00", descricao: "Comissão venda #1036", origem: "Gustavo Lima", nivel: "N1", valor: 733.50, status: "depositado" }, // King 15%
  { id: 13, data: "28/Set 17:00", descricao: "Comissão venda #1035", origem: "Helena Costa", nivel: "N2", valor: 104.70, status: "depositado" }, // Queen 3%
  { id: 14, data: "27/Set 10:00", descricao: "Comissão venda #1034", origem: "Felipe Santos", nivel: "N1", valor: 523.50, status: "depositado" }, // Queen 15%
  { id: 15, data: "26/Set 14:00", descricao: "Comissão venda #1033", origem: "Leticia Souza", nivel: "N1", valor: 493.50, status: "depositado" }, // Padrão 15%
  { id: 16, data: "25/Set 09:00", descricao: "Comissão venda #1032", origem: "Ricardo Alves", nivel: "N2", valor: 98.70, status: "depositado" }, // Padrão 3%
  { id: 17, data: "24/Set 16:00", descricao: "Comissão venda #1031", origem: "Patrícia Mendes", nivel: "N1", valor: 733.50, status: "depositado" }, // King 15%
  { id: 18, data: "23/Set 11:00", descricao: "Comissão venda #1030", origem: "Bruno Rocha", nivel: "N3", valor: 63.80, status: "depositado" }, // Solteiro 2%
  { id: 19, data: "22/Set 15:00", descricao: "Comissão venda #1029", origem: "Camila Lima", nivel: "N1", valor: 523.50, status: "depositado" }, // Queen 15%
  { id: 20, data: "21/Set 10:00", descricao: "Comissão venda #1028", origem: "Daniel Costa", nivel: "N2", valor: 98.70, status: "depositado" }, // Padrão 3%
  { id: 21, data: "20/Set 14:00", descricao: "Comissão venda #1027", origem: "Elisa Santos", nivel: "N1", valor: 478.50, status: "depositado" }, // Solteiro 15%
  { id: 22, data: "19/Set 09:00", descricao: "Comissão venda #1026", origem: "Gabriel Oliveira", nivel: "N1", valor: 733.50, status: "depositado" }, // King 15%
  { id: 23, data: "18/Set 16:00", descricao: "Comissão venda #1025", origem: "Isabela Pereira", nivel: "N2", valor: 104.70, status: "depositado" }, // Queen 3%
  { id: 24, data: "17/Set 11:00", descricao: "Comissão venda #1024", origem: "João Victor", nivel: "N1", valor: 523.50, status: "depositado" }, // Queen 15%
  { id: 25, data: "16/Set 15:00", descricao: "Comissão venda #1023", origem: "Laura Mendes", nivel: "N3", valor: 97.80, status: "depositado" }, // King 2%
  { id: 26, data: "15/Set 10:00", descricao: "Comissão venda #1022", origem: "Marcelo Silva", nivel: "N1", valor: 493.50, status: "depositado" }, // Padrão 15%
  { id: 27, data: "14/Set 14:00", descricao: "Comissão venda #1021", origem: "Natália Rocha", nivel: "N2", valor: 98.70, status: "depositado" }, // Padrão 3%
  { id: 28, data: "13/Set 09:00", descricao: "Comissão venda #1020", origem: "Otávio Lima", nivel: "N1", valor: 733.50, status: "depositado" }, // King 15%
  { id: 29, data: "12/Set 16:00", descricao: "Comissão venda #1019", origem: "Priscila Costa", nivel: "N1", valor: 523.50, status: "aguardando" }, // Queen 15%
  { id: 30, data: "11/Set 11:00", descricao: "Comissão venda #1018", origem: "Quiteria Santos", nivel: "N2", valor: 104.70, status: "depositado" }, // Queen 3%
];

const statusMap: Record<Recebimento['status'], { label: string; status: any }> = {
  depositado: { label: 'Depositado', status: 'paga' },
  processando: { label: 'Processando', status: 'processando' },
  aguardando: { label: 'Aguardando', status: 'pendente' },
};

export default function AffiliateDashboardRecebimentos() {
  const [periodo, setPeriodo] = useState("mes-atual");

  // Recalculando valores de Outubro (mock)
  const totalRecebidoOutubro = mockRecebimentos.filter(r => r.data.includes('Out') && r.status === 'depositado').reduce((sum, r) => sum + r.valor, 0); // 523.50 + 98.70 + 63.80 + 493.50 + 98.70 + 523.50 + 493.50 + 97.80 = 2393.00
  const ultimoRecebimento = 523.50; // Atualizado
  const totalProcessando = mockRecebimentos.filter(r => r.status === 'processando').reduce((sum, r) => sum + r.valor, 0); // 733.50
  const totalLifetime = 12450.00; // Mantido mockado
  const mediaMensal = 1037.50; // Mantido mockado
  const maiorRecebimento = 1340.00; // Mantido mockado
  const menorRecebimento = 420.00; // Mantido mockado

  const filteredRecebimentos = mockRecebimentos.filter(r => {
    // Lógica de filtro simplificada para o mock
    if (periodo === 'mes-atual') {
      return r.data.includes('Out');
    }
    return true;
  });

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
              <Link to="/afiliados/dashboard/configuracoes">
                <Button variant="link" className="h-auto p-0 text-primary">
                  Alterar Wallet ID
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={DollarSign}
          label="Recebido em Outubro"
          value={`R$ ${totalRecebidoOutubro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-success"
          trend={{ value: "Última atualização: hoje", positive: true }}
        />
        <StatCard
          icon={CreditCard}
          label="Último Recebimento"
          value={`R$ ${ultimoRecebimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-blue-500"
          trend={{ value: "12/Out/25 - Venda de Maria Silva", positive: true }}
        />
        <StatCard
          icon={Clock}
          label="Processando"
          value={`R$ ${totalProcessando.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-warning"
          trend={{ value: "Previsão: 13/Out/25", positive: false }}
        />
      </div>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Histórico de Recebimentos</CardTitle>
          <div className="flex gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes-atual">Este Mês</SelectItem>
                <SelectItem value="ultimos-3-meses">Últimos 3 Meses</SelectItem>
                <SelectItem value="ano">Último Ano</SelectItem>
                <SelectItem value="personalizado" disabled>Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar Extrato
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
                {filteredRecebimentos.map((item, index) => (
                  <TableRow key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <TableCell className="font-mono text-sm">{item.data}</TableCell>
                    <TableCell className="font-medium">{item.descricao}</TableCell>
                    <TableCell>{item.origem}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.nivel === "N1" ? "bg-primary/10 text-primary" :
                        item.nivel === "N2" ? "bg-secondary/10 text-secondary" :
                        "bg-blue-500/10 text-blue-500"
                      }`}>
                        {item.nivel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-success">
                      R$ {item.valor.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={statusMap[item.status].status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução */}
      <RecebimentoChart />

      {/* Informações Adicionais (rodapé) */}
      <Card className="bg-muted/50">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Estatísticas do Período (últimos 12 meses)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total recebido:</p>
              <p className="font-bold text-lg">R$ {totalLifetime.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Média mensal:</p>
              <p className="font-bold text-lg">R$ {mediaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Maior recebimento:</p>
              <p className="font-bold text-lg">R$ {maiorRecebimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">(Julho)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Menor recebimento:</p>
              <p className="font-bold text-lg">R$ {menorRecebimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">(Janeiro)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Taxa de crescimento:</p>
              <p className="font-bold text-lg text-success">+112%</p>
              <p className="text-xs text-muted-foreground">(no período)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}