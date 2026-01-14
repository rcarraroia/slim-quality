import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search, 
  Download,
  Eye,
  Loader2,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Package
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";
import { useToast } from "@/hooks/use-toast";

interface Venda {
  id: string;
  orderId: string;
  data: string;
  cliente: string;
  produto: string;
  valorTotal: number;
  comissao: number;
  nivel: "N1" | "N2" | "N3";
  status: "pago" | "pendente" | "cancelado" | "processando";
}

/**
 * Mapeia status do pedido do banco para o formato do componente
 */
const mapOrderStatus = (status: string): "pago" | "pendente" | "cancelado" | "processando" => {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'completed':
    case 'delivered':
      return 'pago';
    case 'pending':
    case 'waiting':
    case 'awaiting_payment':
      return 'pendente';
    case 'cancelled':
    case 'canceled':
    case 'refunded':
      return 'cancelado';
    case 'processing':
    case 'preparing':
    case 'shipping':
      return 'processando';
    default:
      return 'pendente';
  }
};

export default function AffiliateDashboardVendas() {
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [nivelFilter, setNivelFilter] = useState("todos");
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    loadVendas();
  }, [currentPage]);

  const loadVendas = async () => {
    try {
      setLoading(true);
      
      const result = await affiliateFrontendService.getSales(currentPage, 20);
      
      // Converter dados da API para o formato esperado pelo componente
      const vendasData = result.sales.map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        data: item.createdAt,
        cliente: item.customerName || 'Cliente não informado',
        produto: item.productName || 'Slim Quality',
        valorTotal: item.totalValue || 0,
        comissao: item.commissionValue || 0,
        nivel: item.level as "N1" | "N2" | "N3",
        status: mapOrderStatus(item.status)
      }));
      
      setVendas(vendasData);
      setTotalPages(result.pagination?.totalPages || 1);
      
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      
      toast({
        title: "Erro ao carregar vendas",
        description: "Não foi possível carregar as vendas. Tente novamente.",
        variant: "destructive"
      });
      
      setVendas([]);
      
    } finally {
      setLoading(false);
    }
  };

  const filteredVendas = vendas.filter(v => {
    const matchesSearch = v.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.orderId.includes(searchTerm);
    const matchesStatus = statusFilter === "todos" || v.status === statusFilter;
    const matchesNivel = nivelFilter === "todos" || v.nivel === nivelFilter;
    
    return matchesSearch && matchesStatus && matchesNivel;
  });

  const totalVendas = filteredVendas.length;
  const valorTotalVendido = filteredVendas.reduce((sum, v) => sum + v.valorTotal, 0);
  const comissoesGeradas = filteredVendas.reduce((sum, v) => sum + v.comissao, 0);
  const taxaConversao = totalVendas > 0 ? ((filteredVendas.filter(v => v.status === 'pago').length / totalVendas) * 100).toFixed(1) : '0.0';

  const handleExport = () => {
    // TODO: Implementar exportação CSV
    toast({
      title: "Exportação em desenvolvimento",
      description: "A funcionalidade de exportação será implementada em breve.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Vendas</p>
                <p className="text-3xl font-bold text-primary">{totalVendas}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-3xl font-bold text-success">
                  R$ {valorTotalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comissões Geradas</p>
                <p className="text-3xl font-bold text-warning">
                  R$ {comissoesGeradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-info">{taxaConversao}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Tabela */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Histórico de Vendas</CardTitle>
            
            <div className="flex flex-wrap gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="todos">Todos Status</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="processando">Processando</option>
                <option value="cancelado">Cancelado</option>
              </select>

              <select 
                value={nivelFilter}
                onChange={(e) => setNivelFilter(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="todos">Todos Níveis</option>
                <option value="N1">Nível 1</option>
                <option value="N2">Nível 2</option>
                <option value="N3">Nível 3</option>
              </select>

              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando vendas...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-mono font-medium">
                        #{venda.orderId.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {new Date(venda.data).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{venda.cliente}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {venda.produto}
                      </TableCell>
                      <TableCell className="font-semibold">
                        R$ {venda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        R$ {venda.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                          venda.nivel === "N1" ? "bg-primary/10 text-primary" :
                          venda.nivel === "N2" ? "bg-secondary/10 text-secondary" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {venda.nivel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={venda.status as any} />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedVenda(venda)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredVendas.length === 0 && !loading && (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma venda encontrada</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'todos' || nivelFilter !== 'todos'
                      ? 'Tente ajustar os filtros de busca'
                      : 'Suas vendas aparecerão aqui quando você gerar conversões'}
                  </p>
                </div>
              )}

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedVenda} onOpenChange={() => setSelectedVenda(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedVenda && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pedido</p>
                  <p className="font-semibold font-mono">#{selectedVenda.orderId.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-semibold">
                    {new Date(selectedVenda.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{selectedVenda.cliente}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nível</p>
                  <p className="font-semibold">{selectedVenda.nivel}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Produto</p>
                <p className="font-semibold">{selectedVenda.produto}</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <StatusBadge status={selectedVenda.status as any} />
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                  <p className="text-2xl font-bold text-success">
                    R$ {selectedVenda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sua Comissão</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {selectedVenda.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-primary/10 p-4">
                <p className="text-sm text-primary font-semibold">
                  💰 Esta venda gerou R$ {selectedVenda.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de comissão para você!
                </p>
              </div>

              <Button className="w-full" onClick={() => setSelectedVenda(null)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
