import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  ChevronDown, 
  ChevronRight,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
  Building2
} from "lucide-react";
import { supabase } from "@/config/supabase";
import { useToast } from "@/hooks/use-toast";

interface NetworkNode {
  id: string;
  nome: string;
  nivel: number;
  vendas: number;
  comissaoGerada: number;
  indicados: NetworkNode[];
  expanded?: boolean;
}

export default function AdminMinhaRede() {
  const [network, setNetwork] = useState<NetworkNode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNetworkData();
  }, []);

  const loadNetworkData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar todos os afiliados da view affiliate_hierarchy
      const { data, error: queryError } = await supabase
        .from('affiliate_hierarchy')
        .select('*')
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (queryError) throw queryError;

      // Organizar em árvore hierárquica
      const networkData = buildNetworkTree(data || []);
      setNetwork(networkData);
    } catch (error) {
      console.error('Erro ao carregar rede:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      toast({
        title: "Erro ao carregar rede",
        description: "Não foi possível carregar os dados da rede.",
        variant: "destructive"
      });
      
      setNetwork([]);
    } finally {
      setLoading(false);
    }
  };

  const buildNetworkTree = (affiliates: any[]): NetworkNode[] => {
    // Criar mapa de afiliados por ID
    const affiliateMap = new Map<string, NetworkNode>();
    
    // Primeiro, criar todos os nós
    affiliates.forEach(aff => {
      affiliateMap.set(aff.id, {
        id: aff.id,
        nome: aff.name || 'Sem nome',
        nivel: aff.level || 0,  // ✅ Agora vem da view
        vendas: aff.total_conversions || 0,  // ✅ Agora vem da view
        comissaoGerada: aff.total_commission_earned || 0,  // ✅ Agora vem da view
        indicados: [],
        expanded: false
      });
    });

    // Depois, organizar hierarquia
    const roots: NetworkNode[] = [];
    
    affiliates.forEach(aff => {
      const node = affiliateMap.get(aff.id);
      if (!node) return;

      if (!aff.referred_by || aff.level === 0) {
        // Afiliado raiz (sem indicador)
        roots.push(node);
      } else {
        // Afiliado com indicador
        const parent = affiliateMap.get(aff.referred_by);
        if (parent) {
          parent.indicados.push(node);
        } else {
          // Se não encontrar o pai, adicionar como raiz
          console.warn(`Pai não encontrado para afiliado ${aff.id}, adicionando como raiz`);
          roots.push(node);
        }
      }
    });

    return roots;
  };

  const toggleNode = (id: string, nodes: NetworkNode[]): NetworkNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.indicados.length > 0) {
        return { ...node, indicados: toggleNode(id, node.indicados) };
      }
      return node;
    });
  };

  const handleToggle = (id: string) => {
    setNetwork(toggleNode(id, network));
  };

  const renderNode = (node: NetworkNode, depth: number = 0) => {
    const hasChildren = node.indicados.length > 0;
    const isExpanded = node.expanded;

    // Cores por nível (gradiente)
    const getLevelColor = (nivel: number) => {
      if (nivel === 0) return "border-primary bg-primary/5";
      if (nivel === 1) return "border-secondary bg-secondary/5";
      if (nivel === 2) return "border-accent bg-accent/5";
      return "border-muted bg-muted/5";
    };

    const getLevelBadge = (nivel: number) => {
      if (nivel === 0) return "bg-primary/10 text-primary";
      if (nivel === 1) return "bg-secondary/10 text-secondary";
      if (nivel === 2) return "bg-accent/10 text-accent";
      return "bg-muted text-muted-foreground";
    };

    return (
      <div key={node.id} className="space-y-2">
        <Card 
          className={`${getLevelColor(node.nivel)} border-2 hover:shadow-md transition-all`}
          style={{ marginLeft: `${depth * 40}px` }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggle(node.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {node.nome.split(' ').map(n => n[0]).join('')}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{node.nome}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelBadge(node.nivel)}`}>
                      Nível {node.nivel}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {node.vendas} {node.vendas === 1 ? 'venda' : 'vendas'} • 
                    {node.indicados.length} {node.indicados.length === 1 ? 'indicado' : 'indicados'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  R$ {node.comissaoGerada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">gerado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasChildren && isExpanded && (
          <div className="space-y-2 border-l-2 border-dashed border-muted-foreground/20 pl-2">
            {node.indicados.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const calculateTotals = (nodes: NetworkNode[]) => {
    let totalAffiliates = 0;
    let totalActive = 0;
    let totalCommissions = 0;
    let totalSales = 0;

    const traverse = (node: NetworkNode) => {
      totalAffiliates++;
      totalSales += node.vendas;
      totalCommissions += node.comissaoGerada;
      // TODO: verificar status ativo
      totalActive++;
      node.indicados.forEach(traverse);
    };

    nodes.forEach(traverse);
    return { totalAffiliates, totalActive, totalCommissions, totalSales };
  };

  const totals = useMemo(() => calculateTotals(network), [network]);
  
  const filteredNetwork = useMemo(() => {
    if (!searchTerm) return network;
    
    const filterNodes = (nodes: NetworkNode[]): NetworkNode[] => {
      return nodes.filter(node => {
        const matchesSearch = node.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const hasMatchingChildren = node.indicados.length > 0 && filterNodes(node.indicados).length > 0;
        
        if (matchesSearch || hasMatchingChildren) {
          return {
            ...node,
            indicados: hasMatchingChildren ? filterNodes(node.indicados) : node.indicados
          };
        }
        return false;
      }).map(node => ({
        ...node,
        indicados: filterNodes(node.indicados)
      }));
    };
    
    return filterNodes(network);
  }, [network, searchTerm]);

  const expandAll = () => {
    const expandNodes = (nodes: NetworkNode[]): NetworkNode[] => {
      return nodes.map(node => ({
        ...node,
        expanded: true,
        indicados: expandNodes(node.indicados)
      }));
    };
    setNetwork(expandNodes(network));
  };

  const collapseAll = () => {
    const collapseNodes = (nodes: NetworkNode[]): NetworkNode[] => {
      return nodes.map(node => ({
        ...node,
        expanded: false,
        indicados: collapseNodes(node.indicados)
      }));
    };
    setNetwork(collapseNodes(network));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
          <span className="ml-2 text-muted-foreground">Carregando rede...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Erro ao carregar dados: {error}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Afiliados</p>
                <p className="text-3xl font-bold text-primary">{totals.totalAffiliates}</p>
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
                <p className="text-sm text-muted-foreground">Afiliados Ativos</p>
                <p className="text-3xl font-bold text-secondary">{totals.totalActive}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-accent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comissões Pagas</p>
                <p className="text-2xl font-bold text-accent">
                  R$ {totals.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vendas Geradas</p>
                <p className="text-3xl font-bold">{totals.totalSales}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualização da Rede */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Organograma da Rede</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar afiliado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={expandAll} disabled={network.length === 0}>
                Expandir Todos
              </Button>
              <Button variant="outline" onClick={collapseAll} disabled={network.length === 0}>
                Recolher Todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Empresa (raiz) */}
          <Card className="mb-6 border-2 border-primary shadow-lg bg-gradient-to-br from-primary/10 to-secondary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Building2 className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <p className="text-xl font-bold">Slim Quality</p>
                  <p className="text-muted-foreground">
                    {totals.totalAffiliates} afiliados na rede • 
                    R$ {totals.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em comissões
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Árvore da Rede */}
          <div className="space-y-4">
            {filteredNetwork.map(node => renderNode(node))}
          </div>

          {network.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum afiliado cadastrado</h3>
              <p className="text-muted-foreground">
                Aguardando primeiros cadastros de afiliados
              </p>
            </div>
          )}

          {searchTerm && filteredNetwork.length === 0 && network.length > 0 && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground">
                Tente buscar por outro nome ou limpe o filtro
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
