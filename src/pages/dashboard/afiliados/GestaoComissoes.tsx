import { useState } from "react";
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
import { Search, Eye, Check, X, TrendingUp, DollarSign } from "lucide-react";
import { useAdminCommissions } from "@/hooks/useAdminCommissions";


export default function GestaoComissoes() {
  const [selectedComissao, setSelectedComissao] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [nivelFilter, setNivelFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Hook para gerenciar dados de comissões
  const {
    loading,
    error,
    commissions,
    stats,
    approveCommission,
    rejectCommission
  } = useAdminCommissions();

  const filteredComissoes = commissions.filter((comissao: any) => {
    const matchesStatus = statusFilter === "todos" || comissao.status === statusFilter;
    const matchesNivel = nivelFilter === "todos" || comissao.level?.toString() === nivelFilter;
    const matchesSearch = comissao.affiliate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          comissao.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesNivel && matchesSearch;
  });

  const totalComissoesPendentes = filteredComissoes
    .filter((c: any) => c.status === "pending")
    .reduce((acc: number, c: any) => acc + (c.commission_value_cents || 0) / 100, 0);

  const totalComissoesPagas = filteredComissoes
    .filter((c: any) => c.status === "paid")
    .reduce((acc: number, c: any) => acc + (c.commission_value_cents || 0) / 100, 0);

  const handleAprovar = async (comissaoId: string) => {
    await approveCommission(comissaoId);
  };

  const handleRejeitar = async (comissaoId: string) => {
    await rejectCommission(comissaoId);
  };

  return (
    <div className="space-y-6">
      {/* Header com Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Comissões</p>
              <p className="text-2xl font-bold">{commissions.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendentes de Aprovação</p>
              <p className="text-2xl font-bold text-yellow-600">
                {commissions.filter((c: any) => c.status === "pending").length}
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
                R$ {totalComissoesPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                R$ {totalComissoesPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={nivelFilter} onValueChange={setNivelFilter}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Níveis</SelectItem>
              <SelectItem value="1">Nível 1 (10%)</SelectItem>
              <SelectItem value="2">Nível 2 (5%)</SelectItem>
              <SelectItem value="3">Nível 3 (2%)</SelectItem>
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
            {filteredComissoes.map((comissao: any) => (
              <TableRow key={comissao.id}>
                <TableCell className="font-medium">{comissao.id}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{comissao.affiliate_name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">{comissao.affiliate_id}</p>
                  </div>
                </TableCell>
                <TableCell>{comissao.order_number || 'N/A'}</TableCell>
                <TableCell>{comissao.customer_name || 'N/A'}</TableCell>
                <TableCell>
                  <p className="text-sm">{comissao.product_name || 'N/A'}</p>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    N{comissao.level || 1} ({comissao.percentage || 0}%)
                  </span>
                </TableCell>
                <TableCell>
                  R$ {((comissao.order_value_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="font-bold text-green-600">
                  R$ {((comissao.commission_value_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <StatusBadge status={comissao.status} />
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
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedComissao} onOpenChange={() => setSelectedComissao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Comissão</DialogTitle>
            <DialogDescription>
              Informações completas da comissão {selectedComissao?.id}
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
                    <p className="font-medium">{selectedComissao.vendaId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedComissao.cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produto</p>
                    <p className="font-medium">{selectedComissao.produto}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor da Venda</p>
                    <p className="font-medium text-lg">
                      R$ {selectedComissao.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    <p className="font-medium">{selectedComissao.afiliadoNome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Afiliado</p>
                    <p className="font-medium">{selectedComissao.afiliadoId}</p>
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
                        Nível {selectedComissao.nivel} ({selectedComissao.percentual}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor da Venda:</span>
                      <span className="font-medium">
                        R$ {selectedComissao.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Valor da Comissão:</span>
                      <span className="font-bold text-lg text-green-600">
                        R$ {selectedComissao.valorComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      <StatusBadge status={selectedComissao.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Criação</p>
                    <p className="font-medium">{selectedComissao.dataCriacao}</p>
                  </div>
                  {selectedComissao.dataPagamento && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Pagamento</p>
                      <p className="font-medium">{selectedComissao.dataPagamento}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              {selectedComissao.status === "pendente" && (
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
