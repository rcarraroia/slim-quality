import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from '@/components/dashboard/StatCard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge, StatusType } from '@/components/dashboard/StatusBadge';
import { Users, Check, DollarSign, RefreshCw, Search, Plus, Download, Eye, Edit, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/config/supabase';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  created_at: string;
  last_purchase_date?: string;
  lifetime_value: number;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [origemFilter, setOrigemFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter(c => c.status === 'active').length;
  const totalLTV = clientes.reduce((sum, c) => sum + (c.lifetime_value || 0), 0);
  const ticketMedio = totalClientes > 0 ? totalLTV / totalClientes : 0;

  const filteredClientes = clientes.filter(c => {
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    const matchesOrigem = origemFilter === 'todos' || c.source === origemFilter;
    const matchesSearch = 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery);
    return matchesStatus && matchesOrigem && matchesSearch;
  });

  const handleViewDetails = (cliente: Customer) => {
    toast({ 
      title: "Visualizar Cliente", 
      description: `Abrindo detalhes de ${cliente.name}` 
    });
  };

  const handleEdit = (cliente: Customer) => {
    toast({ 
      title: "Editar Cliente", 
      description: `Editando ${cliente.name}` 
    });
  };

  const handleAddNew = () => {
    toast({ 
      title: "Adicionar Cliente", 
      description: "Funcionalidade em desenvolvimento" 
    });
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Clientes Cadastrados"
          value={loading ? "..." : totalClientes}
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Check}
          label="Clientes Ativos"
          value={loading ? "..." : clientesAtivos}
          iconColor="text-success"
        />
        <StatCard
          icon={DollarSign}
          label="Ticket Médio"
          value={loading ? "..." : `R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-secondary"
        />
        <StatCard
          icon={RefreshCw}
          label="Taxa de Recompra"
          value={loading ? "..." : "0%"}
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
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>

            <Select value={origemFilter} onValueChange={setOrigemFilter} disabled={loading}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Origens</SelectItem>
                <SelectItem value="website">Site</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="affiliate">Afiliado</SelectItem>
                <SelectItem value="referral">Indicação</SelectItem>
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

            <Button onClick={handleAddNew} className="gap-2" disabled={loading}>
              <Plus className="h-4 w-4" />
              Adicionar Cliente
            </Button>
            <Button variant="outline" className="gap-2" disabled={loading}>
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
                  <TableHead>Cadastro</TableHead>
                  <TableHead>LTV</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
                      <p className="text-muted-foreground">Carregando clientes...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <UserCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || statusFilter !== 'todos' || origemFilter !== 'todos'
                          ? 'Tente ajustar os filtros de busca'
                          : 'Adicione seu primeiro cliente para começar'}
                      </p>
                      {!searchQuery && statusFilter === 'todos' && origemFilter === 'todos' && (
                        <Button onClick={handleAddNew} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Adicionar Cliente
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {cliente.name?.split(' ').map(n => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{cliente.name || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{cliente.email || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{cliente.phone || 'N/A'}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={cliente.status as StatusType} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {cliente.source || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        R$ {(cliente.lifetime_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewDetails(cliente)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(cliente)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
