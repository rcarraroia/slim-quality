/**
 * Advanced Affiliates Table Component
 * Sprint 4: Sistema de Afiliados Multinível
 * Tabela administrativa completa com filtros avançados
 */

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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { 
  Search, 
  Eye, 
  UserCheck, 
  UserX, 
  Download, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AffiliateTableData {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  dataCadastro: string;
  status: "ativo" | "pendente" | "inativo";
  nivel: number;
  totalIndicados: number;
  vendasGeradas: number;
  comissoesTotais: number;
  saldoDisponivel: number;
  walletId: string;
  taxaConversao: number;
  ultimaAtividade: string;
}

interface AffiliatesTableProps {
  data?: AffiliateTableData[];
  loading?: boolean;
  onStatusChange?: (affiliateId: string, newStatus: string) => void;
  onExport?: (format: 'csv' | 'xlsx') => void;
}

type SortField = keyof AffiliateTableData;
type SortDirection = 'asc' | 'desc';

export const AffiliatesTable = ({ 
  data = [], 
  loading, 
  onStatusChange,
  onExport 
}: AffiliatesTableProps) => {
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateTableData | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<SortField>('dataCadastro');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [nivelFilter, setNivelFilter] = useState("todos");
  const [periodoFilter, setPeriodoFilter] = useState("todos");

  // Função de ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtrar e ordenar dados
  const filteredAndSortedData = data
    .filter(affiliate => {
      const matchesSearch = affiliate.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           affiliate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           affiliate.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || affiliate.status === statusFilter;
      const matchesNivel = nivelFilter === "todos" || affiliate.nivel.toString() === nivelFilter;
      
      return matchesSearch && matchesStatus && matchesNivel;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);

  // Seleção em massa
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(paginatedData.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(item => item !== id));
    }
  };

  // Ações em massa
  const handleBulkAction = (action: string) => {
    console.log(`Ação em massa: ${action} para ${selectedItems.length} itens`);
    // Implementar ações em massa
    setSelectedItems([]);
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros Avançados */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou ID..."
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
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={nivelFilter} onValueChange={setNivelFilter}>
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

            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Períodos</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.length} selecionados
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkAction('activate')}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Ativar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkAction('deactivate')}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Desativar
                  </Button>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onExport?.('csv')}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onExport?.('xlsx')}
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <SortableHeader field="nome">Afiliado</SortableHeader>
              <SortableHeader field="email">Contato</SortableHeader>
              <SortableHeader field="dataCadastro">Cadastro</SortableHeader>
              <SortableHeader field="nivel">Nível</SortableHeader>
              <SortableHeader field="totalIndicados">Indicados</SortableHeader>
              <SortableHeader field="vendasGeradas">Vendas</SortableHeader>
              <SortableHeader field="comissoesTotais">Comissões</SortableHeader>
              <SortableHeader field="taxaConversao">Conversão</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((affiliate) => (
              <TableRow key={affiliate.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedItems.includes(affiliate.id)}
                    onCheckedChange={(checked) => handleSelectItem(affiliate.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback>
                        {affiliate.nome.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{affiliate.nome}</p>
                      <p className="text-sm text-muted-foreground">{affiliate.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{affiliate.email}</p>
                    <p className="text-xs text-muted-foreground">{affiliate.telefone}</p>
                  </div>
                </TableCell>
                <TableCell>{affiliate.dataCadastro}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {affiliate.nivel}
                  </span>
                </TableCell>
                <TableCell>{affiliate.totalIndicados}</TableCell>
                <TableCell>{affiliate.vendasGeradas}</TableCell>
                <TableCell className="font-medium">
                  R$ {affiliate.comissoesTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <span className={`text-sm font-medium ${
                    affiliate.taxaConversao >= 10 ? 'text-green-600' :
                    affiliate.taxaConversao >= 5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {affiliate.taxaConversao.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={affiliate.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedAffiliate(affiliate)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      {affiliate.status === "ativo" ? (
                        <DropdownMenuItem onClick={() => onStatusChange?.(affiliate.id, "inativo")}>
                          <UserX className="h-4 w-4 mr-2" />
                          Desativar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onStatusChange?.(affiliate.id, "ativo")}>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Ativar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Paginação */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredAndSortedData.length)} de {filteredAndSortedData.length} resultados
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedAffiliate} onOpenChange={() => setSelectedAffiliate(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Afiliado</DialogTitle>
            <DialogDescription>
              Informações completas e métricas de performance
            </DialogDescription>
          </DialogHeader>

          {selectedAffiliate && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Informações Pessoais</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Nome:</span>
                      <p className="font-medium">{selectedAffiliate.nome}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <p className="font-medium">{selectedAffiliate.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Telefone:</span>
                      <p className="font-medium">{selectedAffiliate.telefone}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Cidade:</span>
                      <p className="font-medium">{selectedAffiliate.cidade}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Métricas de Performance</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Nível Atual:</span>
                      <p className="font-medium">{selectedAffiliate.nivel}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Taxa de Conversão:</span>
                      <p className="font-medium">{selectedAffiliate.taxaConversao.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total Indicados:</span>
                      <p className="font-medium">{selectedAffiliate.totalIndicados}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Vendas Geradas:</span>
                      <p className="font-medium">{selectedAffiliate.vendasGeradas}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Informações Financeiras */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Informações Financeiras</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Comissões Totais:</span>
                    <p className="text-xl font-bold text-green-600">
                      R$ {selectedAffiliate.comissoesTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Saldo Disponível:</span>
                    <p className="text-xl font-bold text-primary">
                      R$ {selectedAffiliate.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Wallet ID:</span>
                    <p className="font-mono text-sm">{selectedAffiliate.walletId}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};