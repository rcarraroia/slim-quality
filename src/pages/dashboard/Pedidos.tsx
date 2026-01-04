import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatCardSkeleton } from '@/components/dashboard/StatCardSkeleton';
import { Package, Clock, CheckCircle, XCircle, Eye, Download, PackageOpen, RefreshCw, AlertCircle } from 'lucide-react';
import { SupabaseService, Order } from '@/services/SupabaseService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Pedidos() {
  const [statusFilter, setStatusFilter] = useState('todos');
  const [periodoFilter, setPeriodoFilter] = useState('mes');
  const [clienteFilter, setClienteFilter] = useState('');
  const [produtoFilter, setProdutoFilter] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Order | null>(null);
  const [pedidos, setPedidos] = useState<Order[]>([]);
  const [todosPedidos, setTodosPedidos] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const [metricas, setMetricas] = useState({
    totalPedidos: 0,
    pedidosPendentes: 0,
    pedidosPagos: 0,
    pedidosCancelados: 0
  });

  useEffect(() => {
    loadPedidos();
  }, [periodoFilter]);

  useEffect(() => {
    applyFilters();
  }, [statusFilter, clienteFilter, produtoFilter, currentPage, todosPedidos]);

  const loadPedidos = async () => {
    try {
      console.log('📦 Carregando página de pedidos...');
      setLoading(true);
      setError(null);
      
      // Buscar TODOS os pedidos (não apenas vendas pagas)
      const pedidosData = await SupabaseService.getAllOrders();
      const metricasData = await SupabaseService.getDashboardMetrics(periodoFilter as any);
      
      setTodosPedidos(pedidosData);
      setMetricas({
        totalPedidos: metricasData.pedidos_realizados,
        pedidosPendentes: metricasData.pedidos_pendentes,
        pedidosPagos: metricasData.vendas_confirmadas,
        pedidosCancelados: metricasData.pedidos_cancelados
      });
      
      console.log(`✅ ${pedidosData.length} pedidos carregados`);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos:', error);
      setError('Erro ao carregar pedidos. Verifique sua conexão.');
      setTodosPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      await loadPedidos();
    } else {
      setError('Múltiplas tentativas falharam. Verifique sua conexão com a internet.');
    }
  };

  const applyFilters = () => {
    let pedidosFiltrados = [...todosPedidos];

    // Filtro por status
    if (statusFilter !== 'todos') {
      pedidosFiltrados = pedidosFiltrados.filter(pedido => pedido.status === statusFilter);
    }

    // Filtro por cliente
    if (clienteFilter) {
      pedidosFiltrados = pedidosFiltrados.filter(pedido => 
        pedido.customer_name?.toLowerCase().includes(clienteFilter.toLowerCase())
      );
    }

    // Filtro por produto
    if (produtoFilter) {
      pedidosFiltrados = pedidosFiltrados.filter(pedido => 
        pedido.order_items?.[0]?.product_name?.toLowerCase().includes(produtoFilter.toLowerCase())
      );
    }

    // Implementar paginação
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pedidosPaginados = pedidosFiltrados.slice(startIndex, endIndex);
    
    setPedidos(pedidosPaginados);
    setTotalPages(Math.ceil(pedidosFiltrados.length / itemsPerPage));
  };

  const resetFilters = () => {
    setStatusFilter('todos');
    setClienteFilter('');
    setProdutoFilter('');
    setCurrentPage(1);
  };

  const handleViewDetails = (pedido: Order) => {
    setSelectedPedido(pedido);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                disabled={retryCount >= 3}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {retryCount >= 3 ? 'Limite atingido' : 'Tentar novamente'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mini Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={Package}
              label="Total de Pedidos"
              value={metricas.totalPedidos}
              iconColor="text-blue-600"
            />
            <StatCard
              icon={Clock}
              label="Pedidos Pendentes"
              value={metricas.pedidosPendentes}
              iconColor="text-orange-500"
            />
            <StatCard
              icon={CheckCircle}
              label="Pedidos Pagos"
              value={metricas.pedidosPagos}
              iconColor="text-success"
            />
            <StatCard
              icon={XCircle}
              label="Pedidos Cancelados"
              value={metricas.pedidosCancelados}
              iconColor="text-destructive"
            />
          </>
        )}
      </div>

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Mês</SelectItem>
                <SelectItem value="trimestre">Trimestre</SelectItem>
                <SelectItem value="ano">Ano</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Buscar por cliente..."
              value={clienteFilter}
              onChange={(e) => setClienteFilter(e.target.value)}
              className="w-[200px]"
            />

            <Input
              placeholder="Buscar por produto..."
              value={produtoFilter}
              onChange={(e) => setProdutoFilter(e.target.value)}
              className="w-[200px]"
            />

            <Button variant="outline" onClick={resetFilters}>
              Limpar Filtros
            </Button>

            <div className="flex-1" />

            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pedidos */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium text-sm">ID</th>
                  <th className="text-left p-4 font-medium text-sm">Data</th>
                  <th className="text-left p-4 font-medium text-sm">Cliente</th>
                  <th className="text-left p-4 font-medium text-sm">Produto</th>
                  <th className="text-left p-4 font-medium text-sm">Valor</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                  <th className="text-left p-4 font-medium text-sm">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Carregando pedidos...
                    </td>
                  </tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
                        <p className="text-muted-foreground">
                          Os pedidos aparecerão aqui quando forem realizados
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pedidos.map((pedido, index) => (
                    <tr 
                      key={pedido.id}
                      className={`border-b hover:bg-muted/50 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      }`}
                    >
                      <td className="p-4 text-sm font-medium">#{pedido.id.slice(0, 8)}</td>
                      <td className="p-4 text-sm">
                        {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-sm">{pedido.customer_name || 'N/A'}</td>
                      <td className="p-4 text-sm">
                        {pedido.order_items?.[0]?.product_name || 'N/A'}
                      </td>
                      <td className="p-4 text-sm font-semibold">
                        R$ {(pedido.total_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={pedido.status as any} />
                      </td>
                      <td className="p-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetails(pedido)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pedido #{selectedPedido?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações do Cliente</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{selectedPedido.customer_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedPedido.customer_email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-medium">{selectedPedido.customer_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data:</span>
                    <p className="font-medium">
                      {new Date(selectedPedido.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações do Produto</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Produto:</span>
                    <p className="font-medium">
                      {selectedPedido.order_items?.[0]?.product_name || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Preço:</span>
                    <p className="font-medium text-lg text-primary">
                      R$ {(selectedPedido.total_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Status do Pedido</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status Atual:</span>
                    <div className="mt-1">
                      <StatusBadge status={selectedPedido.status as any} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                  Fechar
                </Button>
                <Button>Alterar Status</Button>
                <Button variant="secondary">Enviar Notificação</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}