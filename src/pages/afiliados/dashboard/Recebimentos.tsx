import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecebimentoChart } from "@/components/afiliados/RecebimentoChart";
import { Wallet, Download, Info, CreditCard, Clock, DollarSign, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";
import { useToast } from "@/hooks/use-toast";

interface Recebimento {
  id: number;
  data: string;
  descricao: string;
  origem: string;
  nivel: "N1" | "N2" | "N3";
  valor: number;
  status: "depositado" | "processando" | "aguardando";
}

export default function AffiliateDashboardRecebimentos() {
  const [periodo, setPeriodo] = useState("mes-atual");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [affiliate, setAffiliate] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar dados do afiliado
      const { isAffiliate, affiliate: affiliateData } = await affiliateFrontendService.checkAffiliateStatus();
      if (isAffiliate && affiliateData) {
        setAffiliate(affiliateData);
      }

      // Carregar withdrawals
      const withdrawalsResult = await affiliateFrontendService.getWithdrawals();
      setWithdrawals(withdrawalsResult.withdrawals);

    } catch (error) {
      console.error('Erro ao carregar recebimentos:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os recebimentos. Usando dados de exemplo.",
        variant: "destructive"
      });

      // Fallback para dados vazios
      setWithdrawals([]);
      
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatísticas dos dados reais
  const totalRecebido = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + ((w.amount_cents || 0) / 100), 0);

  const ultimoRecebimento = withdrawals.length > 0 
    ? (withdrawals[0].amount_cents || 0) / 100 
    : 0;

  const totalProcessando = withdrawals
    .filter(w => w.status === 'processing')
    .reduce((sum, w) => sum + ((w.amount_cents || 0) / 100), 0);

  // Gerar dados do gráfico a partir dos withdrawals reais
  const generateChartData = (withdrawals: any[]) => {
    const monthlyData: { [key: string]: number } = {};
    
    withdrawals.forEach(withdrawal => {
      if (withdrawal.status === 'completed') {
        const date = new Date(withdrawal.created_at);
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short' });
        const amount = (withdrawal.amount_cents || 0) / 100;
        
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
      }
    });

    // Converter para formato do gráfico
    return Object.entries(monthlyData).map(([mes, valor]) => ({
      mes: mes.charAt(0).toUpperCase() + mes.slice(1),
      valor
    }));
  };

  // Estados de loading e erro
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </div>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando recebimentos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aviso se usando dados de fallback */}
      {error && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Exibindo dados de exemplo. Verifique sua conexão com o backend.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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
              {affiliate?.walletId ? (
                <p className="text-sm font-medium">
                  Wallet ID configurada: <span className="font-mono text-primary">{affiliate.walletId}</span>
                </p>
              ) : (
                <p className="text-sm font-medium text-orange-600">
                  ⚠️ Wallet ID não configurada - Configure para receber comissões
                </p>
              )}
              <Link to="/afiliados/dashboard/configuracoes">
                <Button variant="link" className="h-auto p-0 text-primary">
                  {affiliate?.walletId ? 'Alterar Wallet ID' : 'Configurar Wallet ID'}
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
          label="Total Recebido"
          value={`R$ ${totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-success"
          trend={{ value: "Últimos 12 meses", positive: true }}
        />
        <StatCard
          icon={CreditCard}
          label="Último Recebimento"
          value={`R$ ${ultimoRecebimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-blue-500"
          trend={{ 
            value: withdrawals.length > 0 
              ? new Date(withdrawals[0].created_at).toLocaleDateString('pt-BR')
              : "Nenhum recebimento", 
            positive: ultimoRecebimento > 0 
          }}
        />
        <StatCard
          icon={Clock}
          label="Processando"
          value={`R$ ${totalProcessando.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-warning"
          trend={{ value: "Aguardando processamento", positive: false }}
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
            <Button variant="outline" size="sm" disabled={withdrawals.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Extrato
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {withdrawals.length > 0 ? (
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
                  {withdrawals.map((item, index) => (
                    <TableRow key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <TableCell className="font-mono text-sm">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">
                        Comissão venda #{item.commission?.order?.id?.slice(0, 8) || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.commission?.order?.customer_name || 'Cliente não informado'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.commission?.level === 1 ? "bg-primary/10 text-primary" :
                          item.commission?.level === 2 ? "bg-secondary/10 text-secondary" :
                          "bg-blue-500/10 text-blue-500"
                        }`}>
                          N{item.commission?.level || 1}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-success">
                        R$ {((item.amount_cents || 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={
                          item.status === 'completed' ? 'paga' :
                          item.status === 'processing' ? 'processando' :
                          'pendente'
                        } />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum recebimento ainda</h3>
                <p className="text-muted-foreground">
                  Seus recebimentos aparecerão aqui quando suas comissões forem processadas
                </p>
                {!affiliate?.walletId && (
                  <Link to="/afiliados/dashboard/configuracoes">
                    <Button className="mt-4">
                      Configurar Wallet ID
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução */}
      <RecebimentoChart 
        data={withdrawals.length > 0 ? generateChartData(withdrawals) : undefined}
      />

      {/* Informações Adicionais (rodapé) */}
      <Card className="bg-muted/50">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Estatísticas do Período
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total recebido:</p>
              <p className="font-bold text-lg">R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Recebimentos:</p>
              <p className="font-bold text-lg">{withdrawals.filter(w => w.status === 'completed').length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Média por recebimento:</p>
              <p className="font-bold text-lg">
                R$ {withdrawals.length > 0 
                  ? (totalRecebido / withdrawals.filter(w => w.status === 'completed').length || 1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  : '0,00'
                }
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status da conta:</p>
              <p className={`font-bold text-lg ${affiliate?.walletId ? 'text-success' : 'text-warning'}`}>
                {affiliate?.walletId ? 'Configurada' : 'Pendente'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}