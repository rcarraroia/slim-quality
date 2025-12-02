import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Search, Eye, Check, X, Wallet, Clock, TrendingDown, PackageOpen } from "lucide-react";
import { supabase } from "@/config/supabase";
import { useToast } from "@/hooks/use-toast";

interface Withdrawal {
  id: string;
  affiliate_id: string;
  amount: number;
  pix_key: string;
  payment_method: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  affiliate: {
    name: string;
  };
}

export default function Solicitacoes() {
  const [saques, setSaques] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSaque, setSelectedSaque] = useState<Withdrawal | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadSaques();
  }, []);

  const loadSaques = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          affiliate:affiliates(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSaques(data || []);
    } catch (error) {
      console.error('Erro ao carregar saques:', error);
      toast({
        title: "Erro ao carregar solicitações",
        description: "Não foi possível carregar as solicitações de saque.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSaques = saques.filter(saque => {
    const matchesStatus = statusFilter === "todos" || saque.status === statusFilter;
    const matchesSearch = 
      saque.affiliate?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saque.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPendente = filteredSaques
    .filter(s => s.status === "pending")
    .reduce((acc, s) => acc + s.amount, 0);

  const totalProcessado = filteredSaques
    .filter(s => s.status === "approved")
    .reduce((acc, s) => acc + s.amount, 0);

  const handleAprovar = async (saqueId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', saqueId);

      if (error) throw error;

      toast({
        title: "Saque aprovado",
        description: "A solicitação de saque foi aprovada com sucesso.",
      });

      loadSaques();
    } catch (error) {
      console.error('Erro ao aprovar saque:', error);
      toast({
        title: "Erro ao aprovar saque",
        description: "Não foi possível aprovar a solicitação.",
        variant: "destructive"
      });
    }
  };

  const handleRejeitar = async (saqueId: string, motivo: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'rejected',
          processed_at: new Date().toISOString(),
          rejection_reason: motivo
        })
        .eq('id', saqueId);

      if (error) throw error;

      toast({
        title: "Saque rejeitado",
        description: "A solicitação de saque foi rejeitada.",
      });

      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedSaque(null);
      loadSaques();
    } catch (error) {
      console.error('Erro ao rejeitar saque:', error);
      toast({
        title: "Erro ao rejeitar saque",
        description: "Não foi possível rejeitar a solicitação.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Solicitações</p>
              <p className="text-2xl font-bold">{loading ? "..." : saques.length}</p>
            </div>
            <Wallet className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aguardando Aprovação</p>
              <p className="text-2xl font-bold text-warning">
                {loading ? "..." : saques.filter(s => s.status === "pending").length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Pendente</p>
              <p className="text-2xl font-bold text-warning">
                {loading ? "..." : `R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Processado</p>
              <p className="text-2xl font-bold text-success">
                {loading ? "..." : `R$ ${totalProcessado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
            <Check className="h-8 w-8 text-success" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por afiliado ou ID..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela de Saques */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Afiliado</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Chave PIX</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Data Solicitação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
                  <p className="text-muted-foreground">Carregando solicitações...</p>
                </TableCell>
              </TableRow>
            ) : filteredSaques.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <PackageOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação encontrada</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'todos'
                      ? 'Tente ajustar os filtros de busca'
                      : 'Nenhuma solicitação de saque ainda'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredSaques.map((saque) => (
                <TableRow key={saque.id}>
                  <TableCell className="font-medium">#{saque.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{saque.affiliate?.name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">#{saque.affiliate_id.slice(0, 8)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-success">
                    R$ {saque.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {saque.pix_key || 'N/A'}
                    </code>
                  </TableCell>
                  <TableCell>{saque.payment_method || 'PIX'}</TableCell>
                  <TableCell>
                    {new Date(saque.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={saque.status as any} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {saque.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAprovar(saque.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedSaque(saque);
                              setShowRejectDialog(true);
                            }}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedSaque(saque)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedSaque && !showRejectDialog} onOpenChange={() => setSelectedSaque(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação de Saque</DialogTitle>
            <DialogDescription>
              Informações completas da solicitação #{selectedSaque?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedSaque && (
            <div className="space-y-6">
              {/* Informações do Afiliado */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações do Afiliado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{selectedSaque.affiliate?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Afiliado</p>
                    <p className="font-medium">#{selectedSaque.affiliate_id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>

              {/* Informações do Saque */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações do Saque</h3>
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">Valor Solicitado:</span>
                      <span className="text-2xl font-bold text-green-600">
                        R$ {selectedSaque.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Método de Pagamento:</span>
                      <span className="font-medium">{selectedSaque.payment_method || 'PIX'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chave PIX:</span>
                      <code className="bg-background px-2 py-1 rounded text-sm">
                        {selectedSaque.pix_key || 'N/A'}
                      </code>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Status e Datas */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Status e Datas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status Atual</p>
                    <div className="mt-1">
                      <StatusBadge status={selectedSaque.status as any} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Solicitação</p>
                    <p className="font-medium">
                      {new Date(selectedSaque.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {selectedSaque.processed_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Processamento</p>
                      <p className="font-medium">
                        {new Date(selectedSaque.processed_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Motivo de Rejeição (se aplicável) */}
              {selectedSaque.status === "rejected" && selectedSaque.rejection_reason && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Motivo da Rejeição</h3>
                  <Card className="p-4 bg-destructive/10 border-destructive/20">
                    <p className="text-sm">{selectedSaque.rejection_reason}</p>
                  </Card>
                </div>
              )}

              {/* Ações */}
              {selectedSaque.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="gap-2"
                    onClick={() => {
                      handleAprovar(selectedSaque.id);
                      setSelectedSaque(null);
                    }}
                  >
                    <Check className="h-4 w-4" />
                    Aprovar e Processar Saque
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <X className="h-4 w-4" />
                    Rejeitar Solicitação
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação de Saque</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para o afiliado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="motivo">Motivo da Rejeição</Label>
              <Textarea
                id="motivo"
                placeholder="Ex: Saldo insuficiente, documentação pendente, dados bancários incorretos..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedSaque && handleRejeitar(selectedSaque.id, rejectReason)}
                disabled={!rejectReason.trim()}
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
