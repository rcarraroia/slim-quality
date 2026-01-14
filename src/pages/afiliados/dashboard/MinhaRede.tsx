import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  ChevronRight,
  TrendingUp,
  Loader2,
  AlertCircle,
  Download,
  ArrowLeft
} from "lucide-react";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";
import { useToast } from "@/hooks/use-toast";

interface NetworkNode {
  id: string;
  nome: string;
  nivel: 1 | 2;
  vendas: number;
  comissaoGerada: number;
  indicados: NetworkNode[];
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export default function AffiliateDashboardMinhaRede() {
  const [network, setNetwork] = useState<NetworkNode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [affiliate, setAffiliate] = useState<any>(null);
  
  // Estados de navegação
  const [currentView, setCurrentView] = useState<'root' | string>('root');
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Você' }
  ]);
  const [currentLevelData, setCurrentLevelData] = useState<NetworkNode[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    loadNetworkData();
  }, []);

  useEffect(() => {
    // Atualizar dados do nível atual quando network mudar
    if (currentView === 'root') {
      setCurrentLevelData(network);
    } else {
      const node = findNodeById(network, currentView);
      setCurrentLevelData(node?.indicados || []);
    }
  }, [network, currentView]);

  const loadNetworkData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar dados do afiliado
      const { isAffiliate, affiliate: affiliateData } = await affiliateFrontendService.checkAffiliateStatus();
      if (isAffiliate && affiliateData) {
        setAffiliate(affiliateData);
      }
      
      // Carregar rede
      const result = await affiliateFrontendService.getNetwork();
      if (result.success) {
        const networkData = convertApiDataToNetworkNodes(result.data);
        setNetwork(networkData);
        setCurrentLevelData(networkData); // Inicializar com N1
      } else {
        setError('Não foi possível carregar a rede');
        toast({
          title: "Erro ao carregar rede",
          description: "Não foi possível carregar os dados da sua rede.",
          variant: "destructive"
        });
        setNetwork([]);
      }
    } catch (error) {
      console.error('Erro ao carregar rede:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      toast({
        title: "Erro ao carregar rede",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
      
      setNetwork([]);
    } finally {
      setLoading(false);
    }
  };

  const convertApiDataToNetworkNodes = (apiData: any): NetworkNode[] => {
    if (!apiData || !Array.isArray(apiData)) return [];
    
    return apiData.map((item: any) => ({
      id: item.id,
      nome: item.name || 'Afiliado',
      nivel: item.level,
      vendas: item.salesCount || 0,
      comissaoGerada: item.totalCommissions || 0,
      indicados: item.children ? convertApiDataToNetworkNodes(item.children) : []
    }));
  };

  const findNodeById = (nodes: NetworkNode[], id: string): NetworkNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.indicados.length > 0) {
        const found = findNodeById(node.indicados, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleViewNetwork = (affiliateId: string, affiliateName: string) => {
    const node = findNodeById(network, affiliateId);
    if (node && node.indicados.length > 0) {
      setCurrentView(affiliateId);
      setBreadcrumb([...breadcrumb, { id: affiliateId, name: affiliateName }]);
      setCurrentLevelData(node.indicados);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    const targetId = newBreadcrumb[newBreadcrumb.length - 1].id;
    setCurrentView(targetId);
    
    if (targetId === 'root') {
      setCurrentLevelData(network);
    } else {
      const node = findNodeById(network, targetId);
      setCurrentLevelData(node?.indicados || []);
    }
  };

  const calculateTotals = (nodes: NetworkNode[]) => {
    let totalN1 = 0, totalN2 = 0;
    let comissaoN1 = 0, comissaoN2 = 0;

    const traverse = (node: NetworkNode) => {
      if (node.nivel === 1) {
        totalN1++;
        comissaoN1 += node.comissaoGerada;
      } else if (node.nivel === 2) {
        totalN2++;
        comissaoN2 += node.comissaoGerada;
      }
      node.indicados.forEach(traverse);
    };

    nodes.forEach(traverse);
    return { totalN1, totalN2, comissaoN1, comissaoN2 };
  };

  const totals = useMemo(() => calculateTotals(network), [network]);
  
  // Filtrar rede por busca
  const filteredData = useMemo(() => {
    if (!searchTerm) return currentLevelData;
    
    return currentLevelData.filter(node => 
      node.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentLevelData, searchTerm]);

  // Componente de Card Compacto
  const AffiliateCardCompact = ({ node }: { node: NetworkNode }) => {
    const hasChildren = node.indicados.length > 0;
    
    const nivelColors = {
      1: "border-primary hover:border-primary/80",
      2: "border-secondary hover:border-secondary/80"
    };

    const nivelBadges = {
      1: "bg-primary/10 text-primary",
      2: "bg-secondary/10 text-secondary"
    };

    return (
      <Card className={`${nivelColors[node.nivel]} border-2 hover:shadow-lg transition-all cursor-pointer h-full`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Avatar e Nome */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                {node.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{node.nome}</p>
                <Badge className={`text-xs ${nivelBadges[node.nivel]}`} variant="secondary">
                  Nível {node.nivel}
                </Badge>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendas:</span>
                <span className="font-medium">{node.vendas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comissões:</span>
                <span className="font-medium text-primary">
                  R$ {node.comissaoGerada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {hasChildren && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Indicados:</span>
                  <span className="font-medium">{node.indicados.length}</span>
                </div>
              )}
            </div>

            {/* Botão Ver Rede */}
            {hasChildren && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => handleViewNetwork(node.id, node.nome)}
              >
                Ver Rede <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-12 w-12 bg-muted animate-pulse rounded-full" />
              </div>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando sua rede...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aviso se usando dados de fallback */}
      {error && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Exibindo dados de exemplo. Verifique sua conexão com o backend.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo da Rede */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nível 1 (Diretos)</p>
                <p className="text-3xl font-bold text-primary">{totals.totalN1}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  R$ {totals.comissaoN1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-secondary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nível 2</p>
                <p className="text-3xl font-bold text-secondary">{totals.totalN2}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  R$ {totals.comissaoN2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualização da Rede */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle>Visualização da Rede</CardTitle>
              <Button 
                variant="outline"
                onClick={async () => {
                  try {
                    await affiliateFrontendService.exportReport('network');
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
                disabled={network.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>

            {/* Breadcrumb de Navegação */}
            {breadcrumb.length > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBreadcrumbClick(breadcrumb.length - 2)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {breadcrumb.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {index > 0 && <ChevronRight className="h-4 w-4" />}
                      <button
                        onClick={() => handleBreadcrumbClick(index)}
                        className={`hover:text-foreground transition-colors ${
                          index === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''
                        }`}
                      >
                        {item.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Busca */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar na rede..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Card "Você" (apenas na raiz) */}
          {currentView === 'root' && (
            <Card className="mb-6 border-2 border-primary shadow-lg bg-gradient-to-br from-primary/10 to-secondary/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                    {affiliate?.name ? affiliate.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'AF'}
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-bold">{affiliate?.name || 'Afiliado'} (Você)</p>
                    <p className="text-muted-foreground">
                      {totals.totalN1 + totals.totalN2} pessoas na sua rede • 
                      R$ {(totals.comissaoN1 + totals.comissaoN2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerados
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grid de Afiliados */}
          {filteredData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredData.map(node => (
                <AffiliateCardCompact key={node.id} node={node} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              {searchTerm ? (
                <>
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground">
                    Tente buscar por outro nome ou limpe o filtro
                  </p>
                </>
              ) : currentView === 'root' ? (
                <>
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sua rede ainda está vazia</h3>
                  <p className="text-muted-foreground mb-4">
                    Comece a indicar pessoas e veja sua rede crescer aqui
                  </p>
                  <Button>Compartilhar Meu Link</Button>
                </>
              ) : (
                <>
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Este afiliado ainda não tem indicados</h3>
                  <p className="text-muted-foreground">
                    Quando houver indicações, elas aparecerão aqui
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
