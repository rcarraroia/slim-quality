import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from '@/components/dashboard/StatCard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ClienteDetailModal } from '@/components/admin/ClienteDetailModal';
import { mockClientes } from '@/data/mockData';
import { Users, Check, DollarSign, RefreshCw, Search, Plus, Download, Eye, Edit, UserCircle, Frown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';

// Tipagem para o mock de clientes
type Cliente = typeof mockClientes[0];

// Simulação de carregamento
const useClientData = (delay = 1000) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Cliente[]>([]);

  useState(() => {
    setTimeout(() => {
      setData(mockClientes); // Use mockClientes para simular dados
      setLoading(false);
    }, delay);
  });

  return { data, loading };
};

export default function Clientes() {
  const { data: clientes, loading } = useClientData(1500);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Placeholder for Edit Modal
  const [statusFilter, setStatusFilter] = useState('todos');
  const [origemFilter, setOrigemFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;
  const totalLTV = clientes.reduce((sum, c) => sum + c.ltv, 0);
  const ticketMedio = totalClientes > 0 ? totalLTV / totalClientes : 0;

  const filteredClientes = clientes.filter(c => {
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    const matchesOrigem = origemFilter === 'todos' || c.origem === origemFilter;
    const matchesSearch = c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesOrigem && matchesSearch;
  });

  const handleViewDetails = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsEditModalOpen(true);
    toast({ title: "Ação: Abrir Modal de Edição", description: `Editando cliente ${cliente.nome}` });
  };

  const handleSchedule = (cliente: Cliente) => {
    toast({ title: "Ação: Agendar Follow-up", description: `Redirecionando para Agendamentos para ${cliente.nome}` });
    // Implementar navegação real para /dashboard/agendamentos com pré-seleção do cliente
  };

  const handleAddNew = () => {
    setSelectedCliente(null);
    setIsEditModalOpen(true);
    toast({ title: "Ação: Abrir Modal de Criação", description: "Criando novo cliente" });
  };

  const renderTableContent = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
        </TableRow>
      ));
    }

    if (clientes.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <EmptyState 
              icon={UserCircle}
              title="Nenhum Cliente Cadastrado"
              description="Adicione clientes manualmente ou aguarde o primeiro cadastro pelo site."
              buttonText="Adicionar Cliente"
              onAction={handleAddNew}
            />
          </TableCell>
        </TableRow>
      );
    }
    
    if (filteredClientes.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <EmptyState 
              icon={Frown}
              title="Nenhum resultado encontrado"
              description="Tente buscar por outro termo ou ajuste os filtros."
              buttonText="Limpar Busca"
              onAction={() => setSearchQuery('')}
            />
          </TableCell>
        </TableRow>
      );
    }

    return filteredClientes.map((cliente) => (
      <TableRow key={cliente.id} className="transition-all duration-200 hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {cliente.nome.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium">{cliente.nome}</p>
          </div>
        </TableCell>
        <TableCell>
          <p className="text-sm">{cliente.email}</p>
          <p className="text-xs text-muted-foreground">{cliente.telefone}</p>
        </TableCell>
        <TableCell>
          <StatusBadge status={cliente.status} />
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{cliente.origem}</TableCell>
        <TableCell className="text-sm">{cliente.ultimaCompra}</TableCell>
        <TableCell className="font-semibold text-primary">
          R$ {cliente.ltv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleViewDetails(cliente)} aria-label="Ver detalhes do cliente">
              <Eye className="h-4 w-4 transition-colors hover:text-primary" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente)} aria-label="Editar cliente">
              <Edit className="h-4 w-4 transition-colors hover:text-primary" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Clientes Cadastrados"
          value={loading ? <Skeleton className="h-8 w-16" /> : totalClientes}
          trend={loading ? undefined : { value: "+23 este mês", positive: true }}
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Check}
          label="Clientes Ativos"
          value={loading ? <Skeleton className="h-8 w-16" /> : clientesAtivos}
          trend={loading ? undefined : { value: `${(clientesAtivos / totalClientes * 100).toFixed(0)}% de ativação`, positive: true }}
          iconColor="text-success"
        />
        <StatCard
          icon={DollarSign}
          label="Ticket Médio"
          value={loading ? <Skeleton className="h-8 w-24" /> : `R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={loading ? undefined : { value: "+5% vs. mês passado", positive: true }}
          iconColor="text-secondary"
        />
        <StatCard
          icon={RefreshCw}
          label="Taxa de Recompra"
          value={loading ? <Skeleton className="h-8 w-12" /> : "67%"}
          trend={loading ? undefined : { value: "Compraram 2+ vezes", positive: true }}
          iconColor="text-warning"
        />
      </div>

      {/* Barra de Filtros e Ações */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>

            <Select value={origemFilter} onValueChange={setOrigemFilter} disabled={loading}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Origens</SelectItem>
                <SelectItem value="Site">Site</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Afiliado">Afiliado</SelectItem>
                <SelectItem value="Indicação">Indicação</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button onClick={handleAddNew} className="gap-2 transition-all duration-200 hover:scale-[1.02]" disabled={loading}>
              <Plus className="h-4 w-4" />
              Adicionar Cliente
            </Button>
            <Button variant="outline" className="gap-2 transition-all duration-200 hover:scale-[1.02]" disabled={loading}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead>LTV</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableContent()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Cliente */}
      <ClienteDetailModal 
        cliente={selectedCliente}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEdit}
        onSchedule={handleSchedule}
      />
      
      {/* Placeholder para Modal de Edição/Criação */}
      {/* Implementação do Modal de Adicionar/Editar Cliente seria aqui, usando Dialog */}
    </div>
  );
}