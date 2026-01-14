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
  Filter,
  Download,
  Eye,
  Loader2,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";
import { useToast } from "@/hooks/use-toast";

interface Comissao {
  id: string;
  tipo: "N1" | "N2" | "N3";
  valor: number;
  venda: string;
  cliente: string;
  produto: string;
  data: string;
  status: "pago" | "pendente" | "processando";
}

// Dados mockados removidos - agora usa apenas dados reais do Supabase

/**
 * Mapeia status da comissão do banco para o formato do componente
 */
const mapCommissionStatus = (status: string): "pago" | "pendente" | "processando" => {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'completed':
      return 'pago';
    case 'pending':
    case 'waiting':
      return 'pendente';
    case 'processing':
    case 'calculating':
      return 'processando';
    default:
      return 'pendente';
  }
};

export default function AffiliateDashboardComissoes() {
  const [selectedComissao, setSelectedComissao] = useState<Comissao | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    loadComissoes();
  }, [currentPage]);

  const loadComissoes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await affiliateFrontendService.getCommissions(currentPage, 20);
      
      // Converter dados da API para o formato esperado pelo componente
      const comissoesData = result.commissions.map((item: any) => ({
        id: item.id,
        tipo: item.type as "N1" | "N2" | "N3", // Service já retorna formatado como "N1", "N2", "N3"
        valor: item.amount || 0, // Service já converte centavos para reais
        venda: item.order?.id ? `#${item.order.id.slice(0, 8)}` : '#N/A',
        cliente: item.order?.customer_name || 'Cliente não informado',
        produto: 'Slim Quality', // Produto padrão por enquanto
        data: item.createdAt, // Service retorna createdAt
        status: mapCommissionStatus(item.status)
      }));
      
      setComissoes(comissoesData);
      setTotalPages(result.pagination?.totalPages || 1);
      
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      toast({
        title: "Erro ao carregar comissões",
        description: "Não foi possível carregar as comissões. Usando dados de exemplo.",
        variant: "destructive"
      });
      
      // Fallback para dados vazios em caso de erro
      setComissoes([]);
      
    } finally {
      setLoading(false);
    }
  };

  const filteredComissoes = comissoes.filter(c => {
    const matchesSearch = c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.venda.includes(searchTerm);
    const matchesStatus = statusFilter === "todos" || c.status === statusFilter;
    const matchesTipo = tipoFilter === "todos" || c.tipo === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const totalComissoes = filteredComissoes.reduce((sum, c) => sum + c.valor, 0);
  const totalPago = filteredComissoes.filter(c => c.status === "pago").reduce((sum, c) => sum + c.valor, 0);
  const totalPendente = filteredComissoes.filter(c => c.status === "pendente").reduce((sum, c) => sum + c.valor, 0);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">Total em Comissões</p>
              <p className="text-3xl font-bold text-primary">
                R$ {totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">Já Recebido</p>
              <p className="text-3xl font-bold text-success">
                R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">A Receber</p>
              <p className="text-3xl font-bold text-warning">
                R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Tabela */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Histórico de Comissões</CardTitle>
            
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
              </select>

              <select 
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="todos">Todos Níveis</option>
                <option value="N1">N1</option>
                <option value="N2">N2</option>
                <option value="N3">N3</option>
              </select>

              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    await affiliateFrontendService.exportReport('commissions');
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando comissões...</span>
            </div>
          ) : (
            <>
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComissoes.map((comissao) => (
                <TableRow key={comissao.id}>
                  <TableCell>
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                      comissao.tipo === "N1" ? "bg-primary/10 text-primary" :
                      comissao.tipo === "N2" ? "bg-secondary/10 text-secondary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {comissao.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono font-medium">{comissao.venda}</TableCell>
                  <TableCell>{comissao.cliente}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{comissao.produto}</TableCell>
                  <TableCell>{new Date(comissao.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-bold text-primary">
                    R$ {comissao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={comissao.status as any} />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedComissao(comissao)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredComissoes.length === 0 && !loading && (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma comissão encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'todos' || tipoFilter !== 'todos'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Suas comissões aparecerão aqui quando você gerar vendas'}
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
      <Dialog open={!!selectedComissao} onOpenChange={() => setSelectedComissao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Comissão</DialogTitle>
          </DialogHeader>
          {selectedComissao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-semibold">{selectedComissao.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Venda</p>
                  <p className="font-semibold font-mono">{selectedComissao.venda}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{selectedComissao.cliente}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-semibold">
                    {new Date(selectedComissao.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Produto</p>
                <p className="font-semibold">{selectedComissao.produto}</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <StatusBadge status={selectedComissao.status as any} />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Valor da Comissão</p>
                <p className="text-3xl font-bold text-primary">
                  R$ {selectedComissao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <Button className="w-full" onClick={() => setSelectedComissao(null)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}