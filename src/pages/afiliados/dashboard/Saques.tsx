import { useState } from "react";
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
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Saque {
  id: string;
  valor: number;
  dataSolicitacao: string;
  dataProcessamento: string | null;
  status: "aprovado" | "pendente" | "processando" | "rejeitado";
  metodoPagamento: string;
  chavePix: string;
}

const mockSaques: Saque[] = [
  {
    id: "S001",
    valor: 2500.00,
    dataSolicitacao: "2024-10-10",
    dataProcessamento: "2024-10-12",
    status: "aprovado",
    metodoPagamento: "PIX",
    chavePix: "carlos.mendes@email.com"
  },
  {
    id: "S002",
    valor: 1800.00,
    dataSolicitacao: "2024-10-11",
    dataProcessamento: null,
    status: "pendente",
    metodoPagamento: "PIX",
    chavePix: "carlos.mendes@email.com"
  },
  {
    id: "S003",
    valor: 3200.00,
    dataSolicitacao: "2024-09-25",
    dataProcessamento: "2024-09-26",
    status: "aprovado",
    metodoPagamento: "PIX",
    chavePix: "carlos.mendes@email.com"
  }
];

export default function AffiliateDashboardSaques() {
  const { toast } = useToast();
  const [showSaqueDialog, setShowSaqueDialog] = useState(false);
  const [valorSaque, setValorSaque] = useState("");
  
  const saldoDisponivel = 3200.00;
  const saldoBloqueado = 450.00; // comissões pendentes
  const totalSacado = 7500.00;

  const handleSolicitarSaque = () => {
    const valor = parseFloat(valorSaque);
    
    if (!valor || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para o saque.",
        variant: "destructive"
      });
      return;
    }

    if (valor > saldoDisponivel) {
      toast({
        title: "Saldo insuficiente",
        description: `Você só tem R$ ${saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} disponível para saque.`,
        variant: "destructive"
      });
      return;
    }

    // Simula solicitação de saque
    toast({
      title: "Saque solicitado!",
      description: `Sua solicitação de R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi enviada e será processada em até 48h.`,
    });
    
    setShowSaqueDialog(false);
    setValorSaque("");
  };

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
                  R$ {saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  R$ {saldoBloqueado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          <CardTitle>Histórico de Saques</CardTitle>
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
              {mockSaques.map((saque) => (
                <TableRow key={saque.id}>
                  <TableCell className="font-mono font-medium">{saque.id}</TableCell>
                  <TableCell className="font-bold text-primary">
                    R$ {saque.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {new Date(saque.dataSolicitacao).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {saque.dataProcessamento 
                      ? new Date(saque.dataProcessamento).toLocaleDateString('pt-BR')
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{saque.metodoPagamento}</span>
                      <span className="text-xs text-muted-foreground">
                        ({saque.chavePix})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={saque.status as any} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {mockSaques.length === 0 && (
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
                  max={saldoDisponivel}
                  step="0.01"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo: R$ 50,00 • Máximo disponível: R$ {saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Chave PIX Cadastrada</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <span className="text-sm">carlos.mendes@email.com</span>
              </div>
              <p className="text-xs text-muted-foreground">
                O pagamento será feito nesta chave PIX
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
