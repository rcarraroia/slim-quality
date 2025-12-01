import { useState } from "react";
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
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMyCommissions } from "@/hooks/useMyCommissions";

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

export default function AffiliateDashboardComissoes() {
  const { commissions, summary, loading, error } = useMyCommissions();
  const [selectedComissao, setSelectedComissao] = useState<Comissao | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");

  // Convert API data to component format
  const comissoesData: Comissao[] = (commissions as any[])?.map((c: any) => ({
    id: c.id,
    tipo: c.level === 1 ? "N1" : c.level === 2 ? "N2" : "N3",
    valor: c.amountCents / 100,
    venda: `#${c.orderId}`,
    cliente: c.customerName || "Cliente",
    produto: c.productName || "Produto",
    data: c.createdAt,
    status: c.status === "paid" ? "pago" : c.status === "pending" ? "pendente" : "processando"
  })) || [];

  const filteredComissoes = comissoesData.filter(c => {
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
                R$ {totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">Já Recebido</p>
              <p className="text-3xl font-bold text-success">
                R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">A Receber</p>
              <p className="text-3xl font-bold text-warning">
                R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <option value="N1">Nível 1</option>
                <option value="N2">Nível 2</option>
                <option value="N3">Nível 3</option>
              </select>

              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                    R$ {comissao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

          {filteredComissoes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma comissão encontrada</p>
            </div>
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
                  R$ {selectedComissao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
