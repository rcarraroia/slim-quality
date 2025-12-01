import { useState } from "react";
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
  Loader2
} from "lucide-react";
import { useMyNetwork } from "@/hooks/useMyNetwork";

interface NetworkNode {
  id: string;
  nome: string;
  nivel: 1 | 2 | 3;
  vendas: number;
  comissaoGerada: number;
  indicados: NetworkNode[];
  expanded?: boolean;
}

export default function AffiliateDashboardMinhaRede() {
  const { network: apiNetwork, loading, error } = useMyNetwork();
  const [searchTerm, setSearchTerm] = useState("");

  // Convert API data to component format
  const network: NetworkNode[] = (apiNetwork as any[])?.map((node: any) => ({
    id: node.affiliate.id,
    nome: node.affiliate.name,
    nivel: node.level,
    vendas: node.affiliate.totalSales || 0,
    comissaoGerada: (node.affiliate.totalCommissionsCents || 0) / 100,
    indicados: [], // TODO: Build hierarchical structure
    expanded: true
  })) || [];

  // TODO: Implement toggle functionality when hierarchical data is available
  const handleToggle = (id: string) => {
    // Placeholder for future implementation
  };

  const renderNode = (node: NetworkNode, depth: number = 0) => {
    const hasChildren = node.indicados.length > 0;
    const isExpanded = node.expanded;

    const nivelColors = {
      1: "border-primary bg-primary/5",
      2: "border-secondary bg-secondary/5",
      3: "border-muted bg-muted/5"
    };

    const nivelBadges = {
      1: "bg-primary/10 text-primary",
      2: "bg-secondary/10 text-secondary",
      3: "bg-muted text-muted-foreground"
    };

    return (
      <div key={node.id} className="space-y-2">
        <Card 
          className={`${nivelColors[node.nivel]} border-2 hover:shadow-md transition-all`}
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${nivelBadges[node.nivel]}`}>
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
    let totalN1 = 0, totalN2 = 0, totalN3 = 0;
    let comissaoN1 = 0, comissaoN2 = 0, comissaoN3 = 0;

    const traverse = (node: NetworkNode) => {
      if (node.nivel === 1) {
        totalN1++;
        comissaoN1 += node.comissaoGerada;
      } else if (node.nivel === 2) {
        totalN2++;
        comissaoN2 += node.comissaoGerada;
      } else if (node.nivel === 3) {
        totalN3++;
        comissaoN3 += node.comissaoGerada;
      }
      node.indicados.forEach(traverse);
    };

    nodes.forEach(traverse);
    return { totalN1, totalN2, totalN3, comissaoN1, comissaoN2, comissaoN3 };
  };

  const totals = calculateTotals(network);

  return (
    <div className="space-y-6">
      {/* Resumo da Rede */}
      <div className="grid gap-6 md:grid-cols-3">
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

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nível 3</p>
                <p className="text-3xl font-bold">{totals.totalN3}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  R$ {totals.comissaoN3.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualização da Rede */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Visualização da Rede</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na rede..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline">
                Expandir Todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Você (raiz) */}
          <Card className="mb-6 border-2 border-primary shadow-lg bg-gradient-to-br from-primary/10 to-secondary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  CM
                </div>
                <div className="flex-1">
                  <p className="text-xl font-bold">Carlos Mendes (Você)</p>
                  <p className="text-muted-foreground">
                    {totals.totalN1 + totals.totalN2 + totals.totalN3} pessoas na sua rede • 
                    R$ {(totals.comissaoN1 + totals.comissaoN2 + totals.comissaoN3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Árvore da Rede */}
          <div className="space-y-4">
            {network.map(node => renderNode(node))}
          </div>

          {network.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sua rede ainda está vazia</h3>
              <p className="text-muted-foreground mb-4">
                Comece a indicar pessoas e veja sua rede crescer aqui
              </p>
              <Button>Compartilhar Meu Link</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
