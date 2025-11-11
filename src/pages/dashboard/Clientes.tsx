import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerCard } from '@/components/crm/CustomerCard';
import { customerFrontendService, type Customer } from '@/services/frontend/customer-frontend.service';

export default function Clientes() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCustomers();
  }, [page, search]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const result = await customerFrontendService.getCustomers({
        search,
        page,
        limit: 20
      });
      setCustomers(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await customerFrontendService.exportCustomers({ search });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            {total} {total === 1 ? 'cliente' : 'clientes'} cadastrados
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/clientes/novo')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando clientes...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customers.map(customer => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onClick={() => navigate(`/dashboard/clientes/${customer.id}`)}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {page} de {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
