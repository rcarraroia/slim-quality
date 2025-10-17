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
import { Users, Check, DollarSign, RefreshCw, Search, Plus, Download, Eye, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Tipagem para o mock de clientes
type Cliente = typeof mockClientes[0];

export default function Clientes() {
  const [clientes, setClientes] = useState(mockClientes);
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
  const ticketMedio = totalLTV / totalClientes;

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

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Clientes Cadastrados"
          value={totalClientes}
          trend={{ value: "+23 este mês", positive: true }}
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Check}
          label="Clientes Ativos"
          value={clientesAtivos}
          trend={{ value: `${(clientesAtivos / totalClientes * 100).toFixed(0)}% de ativação`, positive: true }}
          iconColor="text-success"
        />
        <StatCard
          icon={DollarSign}
          label="Ticket Médio"
          value={`R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={{ value: "+5% vs. mês passado", positive: true }}
          iconColor="text-secondary"
        />
        <StatCard
          icon={RefreshCw}
          label="Taxa de Recompra"
          value="67%"
          trend={{ value: "Compraram 2+ vezes", positive: true }}
          iconColor="text-warning"
        />
      </div>

      {/* Barra de Filtros e Ações */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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

            <Select value={origemFilter} onValueChange={setOrigemFilter}>
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
              />
            </div>

            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Cliente
            </Button>
            <Button variant="outline" className="gap-2">
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
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
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
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(cliente)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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