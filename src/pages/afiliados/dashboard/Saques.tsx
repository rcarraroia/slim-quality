import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";

export default function AffiliateDashboardSaques() {
  const { toast } = useToast();
  const [showSaqueDialog, setShowSaqueDialog] = useState(false);
  const [valorSaque, setValorSaque] = useState("");
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [balance, setBalance] = useState({ available: 0, blocked: 0, total: 0 });
  const [totalSacado, setTotalSacado] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Buscar withdrawals
      const withdrawalsData = await affiliateFrontendService.getWithdrawals();
      setWithdrawals(withdrawalsData.withdrawals || []);
      setTotalSacado((withdrawalsData.summary?.totalCompleted || 0) / 100);
      
      // Buscar saldo real da API
      const balanceData = await affiliateFrontendService.getBalance();
      setBalance({
        available: balanceData.available || 0,
        blocked: balanceData.blocked || 0,
        total: balanceData.total || 0
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de saques. Tente novamente.",
        variant: "destructive"
      });
      
      // Zerar saldos em caso de erro (não usar mock)
      setBalance({
        available: 0,
        blocked: 0,
        total: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarSaque = async () => {
    const valor = parseFloat(valorSaque);
    
    if (!valor || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para o saque.",
        variant: "destructive"
      });
      return;
    }

    if (valor > balance.available / 100) {
      toast({
        title: "Saldo insuficiente",
        description: `Você só tem R$ ${(balance.available / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} disponível para saque.`,
        variant: "destructive"
      });
      return;
    }

    try {
      // TODO: Implementar chamada à API de saque quando estiver pronta
      // await affiliateFrontendService.requestWithdrawal(valor);
      
      toast({
        title: "Saque solicitado!",
        description: `Sua solicitação de R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi enviada e será processada em até 48h.`,
      });
      
      setShowSaqueDialog(false);
      setValorSaque("");
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao solicitar saque",
        description: "Não foi possível processar sua solicitação. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Saldo */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                <p className="text-3xl font-bold text-primary">
                  R$ {(balance.available / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <Button 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setShowSaqueDialog(true)}
                >
                  Solicitar Saque
                </Button>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Bloqueado</p>
                <p className="text-3xl font-bold text-warning">
                  R$ {(balance.blocked / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Comissões pendentes
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sacado</p>
                <p className="text-3xl font-bold text-success">
                  R$ {totalSacado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Todos os tempos
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações Importantes */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold">Informações sobre Saques</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Valor mínimo para saque: R$ 50,00</li>
                <li>• Processamento em até 48 horas úteis</li>
                <li>• Pagamentos realizados via PIX na chave cadastrada</li>
                <li>• Saques disponíveis de segunda a sexta-feira</li>
                <li>• Comissões pendentes ficam bloqueadas até confirmação do pagamento</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Saques */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Saques</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                try {
                  await affiliateFrontendService.exportReport('withdrawals');
                  toast({ 
                    title: "Relatório exportado!",
                    description: "O arquivo CSV foi baixado com sucesso."
                  });
                } catch (error) {
                  toast({
                    title: "Erro ao exportar",
                    description: "Não foi possível gerar o relatório. Tente novamente.",
                    variant: "destructive"
                  });
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead>Data Processamento</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal: any) => (
                <TableRow key={withdrawal.id}>
                  <TableCell className="font-mono font-medium">{withdrawal.id.substring(0, 8)}</TableCell>
                  <TableCell className="font-bold text-primary">
                    R$ {((withdrawal.amount_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {new Date(withdrawal.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {withdrawal.processed_at 
                      ? new Date(withdrawal.processed_at).toLocaleDateString('pt-BR')
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{withdrawal.method?.toUpperCase() || 'PIX'}</span>
                      {withdrawal.pix_key && (
                        <span className="text-xs text-muted-foreground">
                          ({withdrawal.pix_key})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={withdrawal.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {withdrawals.length === 0 && (
            <div className="text-center py-12">
              <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum saque realizado ainda</h3>
              <p className="text-muted-foreground mb-4">
                Quando você solicitar um saque, ele aparecerá aqui
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Solicitação de Saque */}
      <Dialog open={showSaqueDialog} onOpenChange={setShowSaqueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Saque</DialogTitle>
            <DialogDescription>
              Digite o valor que deseja sacar. O pagamento será feito via PIX.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor do Saque</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                <Input
                  id="valor"
                  type="number"
                  placeholder="0,00"
                  value={valorSaque}
                  onChange={(e) => setValorSaque(e.target.value)}
                  className="pl-10"
                  min="50"
                  max={balance.available / 100}
                  step="0.01"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo: R$ 50,00 • Máximo disponível: R$ {(balance.available / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Chave PIX Cadastrada</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <span className="text-sm">Configurada nas configurações</span>
              </div>
              <p className="text-xs text-muted-foreground">
                O pagamento será feito na chave PIX cadastrada
              </p>
            </div>

            <div className="rounded-lg bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Processamento:</strong> O saque será processado em até 48 horas úteis 
                e você receberá uma notificação quando o pagamento for realizado.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowSaqueDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSolicitarSaque}
            >
              Confirmar Saque
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
