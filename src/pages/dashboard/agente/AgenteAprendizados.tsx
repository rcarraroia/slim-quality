import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  Edit,
  Search,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  TrendingUp,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface Aprendizado {
  id: string;
  padrao: string;
  confianca: number;
  origem: number;
  respostaSugerida: string;
  dataIdentificacao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  dataAprovacao?: string;
  usoCount?: number;
}

export default function AgenteAprendizados() {
  // Estados
  const [activeTab, setActiveTab] = useState('fila');
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Dados simulados - TODO: integrar com API real
  const [aprendizados, setAprendizados] = useState<Aprendizado[]>([
    {
      id: '1',
      padrao: 'Quanto custa o colchão queen?',
      confianca: 85,
      origem: 12,
      respostaSugerida: 'O colchão Queen custa R$ 3.490. Posso explicar as tecnologias incluídas e condições de pagamento?',
      dataIdentificacao: '2025-01-01 10:30',
      status: 'pendente'
    },
    {
      id: '2',
      padrao: 'Colchão ajuda com dor nas costas?',
      confianca: 72,
      origem: 8,
      respostaSugerida: 'Sim! O sistema magnético melhora a circulação sanguínea, reduzindo inflamações que causam dor nas costas. Muitos clientes relatam alívio já na primeira semana.',
      dataIdentificacao: '2025-01-01 09:15',
      status: 'pendente'
    },
    {
      id: '3',
      padrao: 'Qual a diferença entre os tamanhos?',
      confianca: 68,
      origem: 15,
      respostaSugerida: 'Temos 4 tamanhos: Solteiro (88x188cm), Padrão (138x188cm), Queen (158x198cm) e King (193x203cm). Todos têm as mesmas tecnologias, diferindo apenas no tamanho.',
      dataIdentificacao: '2025-01-01 08:45',
      status: 'pendente'
    },
    {
      id: '4',
      padrao: 'Como funciona o pagamento?',
      confianca: 91,
      origem: 25,
      respostaSugerida: 'Aceitamos PIX (5% desconto), cartão em até 12x sem juros, ou parcelamento próprio em até 24x. Qual forma prefere?',
      dataIdentificacao: '2024-12-30 16:20',
      status: 'aprovado',
      dataAprovacao: '2024-12-31 09:00',
      usoCount: 47
    },
    {
      id: '5',
      padrao: 'Tem garantia?',
      confianca: 88,
      origem: 18,
      respostaSugerida: 'Sim! Oferecemos 10 anos de garantia contra defeitos de fabricação e 30 dias para teste em casa. Se não gostar, trocamos ou devolvemos o dinheiro.',
      dataIdentificacao: '2024-12-29 14:10',
      status: 'aprovado',
      dataAprovacao: '2024-12-30 10:30',
      usoCount: 32
    }
  ]);

  const itemsPerPage = 5;
  
  // Filtrar aprendizados
  const filteredAprendizados = aprendizados.filter(aprendizado => {
    const matchesTab = activeTab === 'fila' ? aprendizado.status === 'pendente' : aprendizado.status === 'aprovado';
    const matchesSearch = aprendizado.padrao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         aprendizado.respostaSugerida.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesConfidence = confidenceFilter === 'all' || 
                             (confidenceFilter === 'high' && aprendizado.confianca >= 80) ||
                             (confidenceFilter === 'medium' && aprendizado.confianca >= 60 && aprendizado.confianca < 80) ||
                             (confidenceFilter === 'low' && aprendizado.confianca < 60);
    
    return matchesTab && matchesSearch && matchesConfidence;
  });

  const totalPages = Math.ceil(filteredAprendizados.length / itemsPerPage);
  const paginatedAprendizados = filteredAprendizados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pendingCount = aprendizados.filter(a => a.status === 'pendente').length;

  const handleAprovar = async (id: string) => {
    try {
      setAprendizados(prev => 
        prev.map(aprendizado => 
          aprendizado.id === id 
            ? { 
                ...aprendizado, 
                status: 'aprovado' as const, 
                dataAprovacao: new Date().toISOString(),
                usoCount: 0
              }
            : aprendizado
        )
      );
      
      toast.success("Aprendizado aprovado com sucesso! O padrão foi aprovado e será usado pelo agente.");
    } catch (error) {
      toast.error("Erro ao aprovar aprendizado. Não foi possível aprovar o aprendizado. Tente novamente.");
    }
  };

  const handleRejeitar = async (id: string) => {
    try {
      setAprendizados(prev => 
        prev.map(aprendizado => 
          aprendizado.id === id 
            ? { ...aprendizado, status: 'rejeitado' as const }
            : aprendizado
        )
      );
      
      toast.success("Aprendizado rejeitado. O padrão foi rejeitado e não será usado pelo agente.");
    } catch (error) {
      toast.error("Erro ao rejeitar aprendizado. Não foi possível rejeitar o aprendizado. Tente novamente.");
    }
  };

  const handleEditar = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSalvarEdicao = async () => {
    if (!editingId) return;
    
    try {
      setAprendizados(prev => 
        prev.map(aprendizado => 
          aprendizado.id === editingId 
            ? { ...aprendizado, respostaSugerida: editText }
            : aprendizado
        )
      );
      
      setEditingId(null);
      setEditText('');
      
      toast.success("Resposta editada com sucesso! A resposta sugerida foi atualizada.");
    } catch (error) {
      toast.error("Erro ao editar resposta. Não foi possível salvar a edição. Tente novamente.");
    }
  };

  const handleDesativar = async (id: string) => {
    try {
      // TODO: Implementar desativação
      toast.success("Aprendizado desativado. O padrão foi desativado e não será mais usado.");
    } catch (error) {
      toast.error("Erro ao desativar. Não foi possível desativar o aprendizado.");
    }
  };

  const getConfidenceBadge = (confianca: number) => {
    if (confianca >= 80) return <Badge variant="default">Alta ({confianca}%)</Badge>;
    if (confianca >= 60) return <Badge variant="secondary">Média ({confianca}%)</Badge>;
    return <Badge variant="outline">Baixa ({confianca}%)</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Aprendizados</h1>
          <p className="text-muted-foreground">
            Revise e aprove padrões identificados pelo sistema de aprendizado
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por padrão ou resposta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por confiança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as confianças</SelectItem>
                <SelectItem value="high">Alta (≥80%)</SelectItem>
                <SelectItem value="medium">Média (60-79%)</SelectItem>
                <SelectItem value="low">Baixa (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fila" className="relative">
            Fila de Aprovação
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
        </TabsList>

        <TabsContent value="fila" className="space-y-4">
          {paginatedAprendizados.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum aprendizado pendente</h3>
                  <p className="text-muted-foreground">
                    Não há padrões aguardando aprovação no momento.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            paginatedAprendizados.map((aprendizado) => (
              <Card key={aprendizado.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Aprendizado #{aprendizado.id}
                      </CardTitle>
                      <CardDescription>
                        Identificado em {aprendizado.dataIdentificacao} • {aprendizado.origem} conversas similares
                      </CardDescription>
                    </div>
                    {getConfidenceBadge(aprendizado.confianca)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Padrão Identificado:</h4>
                    <p className="text-sm bg-muted p-3 rounded-lg">"{aprendizado.padrao}"</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Resposta Sugerida:</h4>
                    {editingId === aprendizado.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSalvarEdicao}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm bg-muted p-3 rounded-lg">{aprendizado.respostaSugerida}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleAprovar(aprendizado.id)}
                      disabled={editingId === aprendizado.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleRejeitar(aprendizado.id)}
                      disabled={editingId === aprendizado.id}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditar(aprendizado.id, aprendizado.respostaSugerida)}
                      disabled={editingId !== null}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="aprovados" className="space-y-4">
          {paginatedAprendizados.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum aprendizado aprovado</h3>
                  <p className="text-muted-foreground">
                    Não há padrões aprovados que correspondam aos filtros.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Aprendizados Aprovados</CardTitle>
                <CardDescription>
                  Padrões aprovados e em uso pelo agente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paginatedAprendizados.map((aprendizado) => (
                    <div key={aprendizado.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold">{aprendizado.padrao}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {aprendizado.respostaSugerida}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {getConfidenceBadge(aprendizado.confianca)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Aprovado em {aprendizado.dataAprovacao}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Usado {aprendizado.usoCount} vezes
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditar(aprendizado.id, aprendizado.respostaSugerida)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDesativar(aprendizado.id)}
                          >
                            Desativar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAprendizados.length)} de {filteredAprendizados.length} resultados
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}