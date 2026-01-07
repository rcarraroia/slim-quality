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
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Search, Eye, Check, X, TrendingUp, DollarSign, PackageOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminCommissionsService, Commission } from "@/services/admin-commissions.service";
import { useAuth } from "@/hooks/useAuth";

export default function GestaoComissoes() {
  const [comissoes, setComissoes] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComissao, setSelectedComissao] = useState<Commission | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [nivelFilter, setNivelFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState({
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0,
    rejectedAmount: 0
  });
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  // Atualizar tasks.md marcando BLOCOS 4 e 5 como concluídos
  useEffect(() => {
    // Recarregar dados quando filtros mudam
    const timeoutId = setTimeout(() => {
      loadComissoes();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [statusFilter, nivelFilter, searchTerm]);

  const loadComissoes = async () => {
    try {
      setLoading(true);
      const response = await adminCommissionsService.getAll({
        search: searchTerm || undefined,
        status: statusFilter !== "todos" ? statusFilter : undefined,
        level: nivelFilter !== "todos" ? parseInt(nivelFilter) : undefined,
        limit: 100
      });

      if (response.success && response.data) {
        setComissoes(response.data.commissions);
        setSummary(response.data.summary);
      } else {
        toast({
          title: "Erro ao carregar comissões",
          description: response.error || "Não foi possível carregar a lista de comissões.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
      toast({
        title: "Erro ao carregar comissões",
        description: "Não foi possível carregar a lista de comissões.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (comissaoId: string) => {
    try {
      const response = await adminCommissionsService.approve(comissaoId);

      if (response.success) {
        toast({
          title: "Comissão aprovada",
          description: "A comissão foi aprovada com sucesso.",
        });
        loadComissoes();
      } else {
        toast({
          title: "Erro ao aprovar comissão",
          description: response.error || "Não foi possível aprovar a comissão.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao aprovar comissão:', error);
      toast({
        title: "Erro ao aprovar comissão",
        description: "Não foi possível aprovar a comissão.",
        variant: "destructive"
      });
    }
  };

  const handleRejeitar = async (comissaoId: string) => {
    try {
      const response = await adminCommissionsService.reject(comissaoId, "Rejeitada pelo administrador");

      if (response.success) {
        toast({
          title: "Comissão rejeitada",
          description: "A comissão foi rejeitada.",
        });
        loadComissoes();
      } else {
        toast({
          title: "Erro ao rejeitar comissão",
          description: response.error || "Não foi possível rejeitar a comissão.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao rejeitar comissão:', error);
      toast({
        title: "Erro ao rejeitar comissão",
        description: "Não foi possível rejeitar a comissão.",
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
              <p className="text-sm text-muted-foreground">Total de Comissões</p>
              <p className="text-2xl font-bold">{loading ? "..." : comissoes.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendentes de Aprovação</p>
              <p className="text-2xl font-bold text-yellow-600">
                {loading ? "..." : comissoes.filter(c => c.status === "pending").length}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Pendente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {loading ? "..." : `R$ ${summary.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pago</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? "..." : `R$ ${summary.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por afiliado ou venda..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovada</SelectItem>
              <SelectItem value="paid">Paga</SelectItem>
              <SelectItem value="rejected">Rejeitada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={nivelFilter} onValueChange={setNivelFilter} disabled={loading}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Níveis</SelectItem>
              <SelectItem value="1">Nível 1</SelectItem>
              <SelectItem value="2">Nível 2</SelectItem>
              <SelectItem value="3">Nível 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela de Comissões */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Afiliado</TableHead>
              <TableHead>Venda</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Valor Venda</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
                  <p className="text-muted-foreground">Carregando comissões...</p>
                </TableCell>
              </TableRow>
            ) : filteredComissoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12">
                  <PackageOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma comissão encontrada</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'todos' || nivelFilter !== 'todos'
                      ? 'Tente ajustar os filtros de busca'
                      : 'Nenhuma comissão registrada ainda'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredComissoes.map((comissao) => (
                <TableRow key={comissao.id}>
                  <TableCell className="font-medium">#{comissao.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{comissao.affiliate?.name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">#{comissao.affiliate_id.slice(0, 8)}</p>
                    </div>
                  </TableCell>
                  <TableCell>{comissao.order?.id?.slice(0, 8) || 'N/A'}</TableCell>
                  <TableCell>{comissao.order?.customer_name || 'N/A'}</TableCell>
                  <TableCell>
                    <p className="text-sm">{comissao.order?.product_name || 'N/A'}</p>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      N{comissao.level} ({comissao.percentage}%)
                    </span>
                  </TableCell>
                  <TableCell>
                    R$ {(comissao.order?.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-bold text-green-600">
                    R$ {comissao.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={comissao.status as any} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {comissao.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAprovar(comissao.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRejeitar(comissao.id)}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedComissao(comissao)}
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
      <Dialog open={!!selectedComissao} onOpenChange={() => setSelectedComissao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Comissão</DialogTitle>
            <DialogDescription>
              Informações completas da comissão #{selectedComissao?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedComissao && (
            <div className="space-y-6">
              {/* Informações da Venda */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações da Venda</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID da Venda</p>
                    <p className="font-medium">#{selectedComissao.order?.id?.slice(0, 8) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedComissao.order?.customer?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produto</p>
                    <p className="font-medium">{selectedComissao.order?.order_items?.[0]?.product?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor da Venda</p>
                    <p className="font-medium text-lg">
                      R$ {(selectedComissao.order?.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informações do Afiliado */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações do Afiliado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{selectedComissao.affiliate?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Afiliado</p>
                    <p className="font-medium">#{selectedComissao.affiliate_id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>

              {/* Cálculo da Comissão */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Cálculo da Comissão</h3>
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nível da Comissão:</span>
                      <span className="font-medium">
                        Nível {selectedComissao.level} ({selectedComissao.percentage}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor da Venda:</span>
                      <span className="font-medium">
                        R$ {(selectedComissao.order?.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Valor da Comissão:</span>
                      <span className="font-bold text-lg text-green-600">
                        R$ {selectedComissao.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
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
                      <StatusBadge status={selectedComissao.status as any} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Criação</p>
                    <p className="font-medium">
                      {new Date(selectedComissao.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {selectedComissao.paid_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Pagamento</p>
                      <p className="font-medium">
                        {new Date(selectedComissao.paid_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              {selectedComissao.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="gap-2"
                    onClick={() => {
                      handleAprovar(selectedComissao.id);
                      setSelectedComissao(null);
                    }}
                  >
                    <Check className="h-4 w-4" />
                    Aprovar Comissão
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => {
                      handleRejeitar(selectedComissao.id);
                      setSelectedComissao(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                    Rejeitar Comissão
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
