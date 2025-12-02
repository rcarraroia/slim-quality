import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { StatCard } from '@/components/dashboard/StatCard';
import { DollarSign, ShoppingCart, TrendingUp, Target, Eye, Download, PackageOpen } from 'lucide-react';
import { supabase } from '@/config/supabase';
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

interface Venda {
  id: string;
  created_at: string;
  customer_id: string;
  total_amount: number;
  payment_method: string;
  status: 'pending' | 'paid' | 'cancelled' | 'shipped';
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  order_items: {
    product: {
      name: string;
      dimensions: string;
    };
  }[];
}

export default function Vendas() {
  const [statusFilter, setStatusFilter] = useState('todos');
  const [periodoFilter, setPeriodoFilter] = useState('mes');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendas();
  }, [statusFilter, periodoFilter]);

  const loadVendas = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, email, phone),
          order_items(
            product:products(name, dimensions)
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVendas(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalVendas = vendas.reduce((acc, v) => acc + v.total_amount, 0);
  const quantidadeVendas = vendas.length;
  const ticketMedio = quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0;

  const handleViewDetails = (venda: Venda) => {
    setSelectedVenda(venda);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Mini Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total de Vendas"
          value={`R$ ${totalVendas.toLocaleString('pt-BR')}`}
          iconColor="text-success"
        />
        <StatCard
          icon={ShoppingCart}
          label="Vendas Realizadas"
          value={quantidadeVendas}
          iconColor="text-primary"
        />
        <StatCard
          icon={Target}
          label="Ticket Médio"
          value={`R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          iconColor="text-secondary"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value="34,2%"
          iconColor="text-blue-500"
        />
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
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
                <SelectItem value="enviado">Enviados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Semana</SelectItem>
                <SelectItem value="mes">Mês</SelectItem>
                <SelectItem value="ano">Ano</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vendas */}
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
                  <th className="text-left p-4 font-medium text-sm">Pagamento</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                  <th className="text-left p-4 font-medium text-sm">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Carregando vendas...
                    </td>
                  </tr>
                ) : vendas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhuma venda encontrada</h3>
                        <p className="text-muted-foreground">
                          As vendas aparecerão aqui quando forem realizadas
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vendas.map((venda, index) => (
                    <tr 
                      key={venda.id}
                      className={`border-b hover:bg-muted/50 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      }`}
                    >
                      <td className="p-4 text-sm font-medium">#{venda.id.slice(0, 8)}</td>
                      <td className="p-4 text-sm">
                        {new Date(venda.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-sm">{venda.customer?.name || 'N/A'}</td>
                      <td className="p-4 text-sm">
                        {venda.order_items?.[0]?.product?.name || 'N/A'}
                      </td>
                      <td className="p-4 text-sm font-semibold">
                        R$ {venda.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{venda.payment_method}</td>
                      <td className="p-4">
                        <StatusBadge status={venda.status} />
                      </td>
                      <td className="p-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetails(venda)}
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

      {/* Modal de Detalhes */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Venda #{selectedVenda?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedVenda && (
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações do Cliente</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{selectedVenda.customer?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedVenda.customer?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-medium">{selectedVenda.customer?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data:</span>
                    <p className="font-medium">
                      {new Date(selectedVenda.created_at).toLocaleDateString('pt-BR')}
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
                      {selectedVenda.order_items?.[0]?.product?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dimensões:</span>
                    <p className="font-medium">
                      {selectedVenda.order_items?.[0]?.product?.dimensions || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Preço:</span>
                    <p className="font-medium text-lg text-primary">
                      R$ {selectedVenda.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Pagamento</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Forma:</span>
                    <p className="font-medium">{selectedVenda.payment_method}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="mt-1">
                      <StatusBadge status={selectedVenda.status} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                  Fechar
                </Button>
                <Button>Editar Status</Button>
                <Button variant="secondary">Enviar Comprovante</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
