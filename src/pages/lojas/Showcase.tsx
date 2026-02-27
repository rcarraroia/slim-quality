import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { StoreCard, StoreCardSkeleton } from '@/components/store/StoreCard';
import { StoreFilters } from '@/components/store/StoreFilters';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { storeFrontendService, StoreProfile } from '@/services/frontend/store.service';

export default function Showcase() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [state, setState] = useState(searchParams.get('state') || 'all');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Paginação
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Carregar lojas
  useEffect(() => {
    loadStores();
  }, [page, search, city, state]);

  // Atualizar URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (city) params.city = city;
    if (state && state !== 'all') params.state = state;
    if (page > 1) params.page = String(page);

    setSearchParams(params);
  }, [search, city, state, page]);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await storeFrontendService.getShowcase({
        page,
        limit: 20,
        search: search || undefined,
        city: city || undefined,
        state: state !== 'all' ? state : undefined
      });

      // Verificar se lojas estão abertas
      const storesWithStatus = response.stores.map(store => ({
        ...store,
        isOpen: storeFrontendService.isStoreOpen(store.business_hours)
      }));

      setStores(storesWithStatus);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Erro ao carregar lojas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar lojas');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setCity('');
    setState('all');
    setPage(1);
  };

  const handleStoreClick = (slug: string) => {
    navigate(`/lojas/${slug}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-2">Encontre uma Loja Slim Quality</h1>
            <p className="text-lg text-muted-foreground">
              Visite uma de nossas lojas parceiras e experimente nossos produtos pessoalmente
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="grid lg:grid-cols-[350px_1fr] gap-6">
          {/* Sidebar - Filtros */}
          <aside className="space-y-4">
            <StoreFilters
              search={search}
              onSearchChange={setSearch}
              city={city}
              onCityChange={setCity}
              state={state}
              onStateChange={setState}
              onClear={handleClearFilters}
            />

            {/* Info */}
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Use os filtros para encontrar lojas próximas a você ou busque pelo nome da loja
                </span>
              </p>
            </div>
          </aside>

          {/* Main - Lista de Lojas */}
          <main className="space-y-6">
            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading */}
            {loading && (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <StoreCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && stores.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma loja encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Tente ajustar os filtros ou buscar por outra localização
                </p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpar filtros
                </Button>
              </div>
            )}

            {/* Lista de Lojas */}
            {!loading && stores.length > 0 && (
              <>
                {/* Contador */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {stores.length} de {pagination.total} lojas
                  </p>
                </div>

                {/* Cards */}
                <div className="space-y-4">
                  {stores.map((store) => (
                    <StoreCard
                      key={store.id}
                      {...store}
                      onClick={() => handleStoreClick(store.slug)}
                    />
                  ))}
                </div>

                {/* Paginação */}
                {pagination.totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(page - 1)}
                          className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>

                      {[...Array(pagination.totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Mostrar apenas páginas próximas
                        if (
                          pageNum === 1 ||
                          pageNum === pagination.totalPages ||
                          (pageNum >= page - 1 && pageNum <= page + 1)
                        ) {
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => handlePageChange(pageNum)}
                                isActive={pageNum === page}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        // Mostrar "..." entre páginas
                        if (pageNum === page - 2 || pageNum === page + 2) {
                          return (
                            <PaginationItem key={pageNum}>
                              <span className="px-4">...</span>
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(page + 1)}
                          className={
                            page === pagination.totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
