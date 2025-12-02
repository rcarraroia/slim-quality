import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerCard } from '@/components/crm/CustomerCard';
import { customerFrontendService, type Customer } from '@/services/frontend/customer-frontend.service';
import { tagFrontendService, type Tag } from '@/services/frontend/tag-frontend.service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useCache } from '@/hooks/useCache';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Clientes() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const cache = useCache<Customer[]>({ key: 'customers-list', ttl: 2 * 60 * 1000 });
  
  // Filtros avançados
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [origin, setOrigin] = useState('all');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  useEffect(() => {
    loadCustomers();
  }, [page, debouncedSearch, selectedTags, dateFrom, dateTo, origin]);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const result = await tagFrontendService.getTags({ limit: 100 });
      setAvailableTags(result.data);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      
      // Check cache first (only for initial load without filters)
      if (page === 1 && !debouncedSearch && selectedTags.length === 0 && !dateFrom && !dateTo && !origin) {
        if (cache.isValid() && cache.data) {
          setCustomers(cache.data);
          setLoading(false);
          return;
        }
      }
      
      const result = await customerFrontendService.getCustomers({
        search: debouncedSearch,
        page,
        limit: 20,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        origin: origin || undefined
      });
      
      setCustomers(result.data);
      setTotal(result.pagination.total);
      
      // Cache only initial load
      if (page === 1 && !debouncedSearch && selectedTags.length === 0) {
        cache.set(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
    setOrigin('all');
  };

  const hasActiveFilters = selectedTags.length > 0 || dateFrom || dateTo || origin;

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    setSelectedCustomers(customers.map(c => c.id));
  };

  const clearSelection = () => {
    setSelectedCustomers([]);
  };

  const handleBulkTagApply = async (tagId: string) => {
    try {
      await Promise.all(
        selectedCustomers.map(customerId =>
          customerFrontendService.addTag(customerId, tagId)
        )
      );
      clearSelection();
      loadCustomers();
    } catch (error) {
      console.error('Erro ao aplicar tags:', error);
    }
  };

  const handleBulkExport = async () => {
    try {
      const blob = await customerFrontendService.exportCustomers({
        customer_ids: selectedCustomers
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes-selecionados-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Erro ao exportar:', error);
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

      {/* Barra de Busca e Ações */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone ou CPF/CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {selectedTags.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (origin !== 'all' ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filtros Avançados</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpar
                  </Button>
                )}
              </div>

              {/* Filtro por Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                        borderColor: tag.color
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Filtro por Data de Cadastro */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Cadastro</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="De"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="Até"
                  />
                </div>
              </div>

              {/* Filtro por Origem */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Origem</label>
                <Select value={origin} onValueChange={setOrigin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as origens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="organic">Orgânico</SelectItem>
                    <SelectItem value="affiliate">Afiliado</SelectItem>
                    <SelectItem value="n8n">N8N/WhatsApp</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filtros Ativos */}
      {hasActiveFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {selectedTags.map(tagId => {
                const tag = availableTags.find(t => t.id === tagId);
                return tag ? (
                  <Badge key={tagId} style={{ backgroundColor: tag.color }}>
                    {tag.name}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => toggleTag(tagId)}
                    />
                  </Badge>
                ) : null;
              })}
              {dateFrom && (
                <Badge variant="secondary">
                  De: {new Date(dateFrom).toLocaleDateString('pt-BR')}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setDateFrom('')}
                  />
                </Badge>
              )}
              {dateTo && (
                <Badge variant="secondary">
                  Até: {new Date(dateTo).toLocaleDateString('pt-BR')}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setDateTo('')}
                  />
                </Badge>
              )}
              {origin !== 'all' && (
                <Badge variant="secondary">
                  Origem: {origin === 'organic' ? 'Orgânico' : origin === 'affiliate' ? 'Afiliado' : origin === 'n8n' ? 'N8N/WhatsApp' : 'Manual'}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setOrigin('')}
                  />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações em Massa */}
      {selectedCustomers.length > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  {selectedCustomers.length} {selectedCustomers.length === 1 ? 'cliente selecionado' : 'clientes selecionados'}
                </span>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Limpar seleção
                </Button>
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm">Aplicar Tag</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="space-y-2">
                      {availableTags.map(tag => (
                        <Button
                          key={tag.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          style={{ borderColor: tag.color }}
                          onClick={() => handleBulkTagApply(tag.id)}
                        >
                          {tag.name}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="outline" onClick={handleBulkExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Selecionados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        <>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={selectedCustomers.length === customers.length}
              onChange={(e) => e.target.checked ? selectAllCustomers() : clearSelection()}
              className="h-4 w-4"
            />
            <span className="text-sm text-muted-foreground">Selecionar todos</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customers.map(customer => (
              <div key={customer.id} className="relative">
                <input
                  type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={() => toggleCustomerSelection(customer.id)}
                  className="absolute top-2 left-2 z-10 h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                />
                <CustomerCard
                  customer={customer}
                  onClick={() => navigate(`/dashboard/clientes/${customer.id}`)}
                />
              </div>
            ))}
          </div>
        </>
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
