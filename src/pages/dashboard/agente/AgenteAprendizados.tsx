import { useState, useEffect } from 'react';
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
  Clock,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api.ts';

interface Learning {
  id: string;
  pattern_type: string;
  description: string;
  confidence: number;
  sample_conversation: string;
  suggested_response: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
  usage_count?: number;
}

export default function AgenteAprendizados() {
  const { toast } = useToast();
  
  // Estados
  const [activeTab, setActiveTab] = useState('fila');
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Carregar contador de pendentes
  const loadPendingCount = async () => {
    try {
      const response = await apiClient.get<Learning[]>('/api/sicc/learnings?status=pending');
      const pendingData = Array.isArray(response.data) ? response.data : [];
      setPendingCount(pendingData.length);
    } catch (error) {
      console.error('❌ Erro ao carregar contador de pendentes:', error);
      setPendingCount(0);
    }
  };

  const itemsPerPage = 5;

  // Carregar aprendizados baseado na aba ativa
  const loadLearnings = async (status?: string) => {
    try {
      // Determinar status baseado na aba ativa ou parâmetro
      const statusParam = status || (activeTab === 'aprovados' ? 'approved' : 'pending');
      const response = await apiClient.get<Learning[]>(`/api/sicc/learnings?status=${statusParam}`);
      // Validar se response.data é um array
      const learningsData = Array.isArray(response.data) ? response.data : [];
      setLearnings(learningsData);
      console.log(`✅ Aprendizados carregados (${statusParam}):`, learningsData);
    } catch (error) {
      console.error('❌ Erro ao carregar aprendizados:', error);
      // Em caso de erro, definir array vazio para evitar crashes
      setLearnings([]);
      toast({
        title: "Erro ao carregar aprendizados",
        description: "Não foi possível carregar os aprendizados do sistema.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLearnings();
    loadPendingCount();
  }, []);

  // Recarregar dados quando a aba mudar
  useEffect(() => {
    if (!isLoading) {
      loadLearnings();
      // Sempre atualizar contador de pendentes
      loadPendingCount();
    }
  }, [activeTab]);
  
  // Filtrar aprendizados (apenas por busca e confiança, status vem da API)
  const filteredLearnings = learnings.filter(learning => {
    // Proteção contra valores undefined
    const pattern = learning.description || learning.pattern_type || '';
    const response = learning.suggested_response || '';
    
    const matchesSearch = pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesConfidence = confidenceFilter === 'all' || 
                             (confidenceFilter === 'high' && learning.confidence >= 0.8) ||
                             (confidenceFilter === 'medium' && learning.confidence >= 0.6 && learning.confidence < 0.8) ||
                             (confidenceFilter === 'low' && learning.confidence < 0.6);
    
    return matchesSearch && matchesConfidence;
  });

  const totalPages = Math.ceil(filteredLearnings.length / itemsPerPage);
  const paginatedLearnings = filteredLearnings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAprovar = async (id: string) => {
    try {
      await apiClient.post(`/api/sicc/learnings/${id}/approve`);
      
      // Atualizar estado local
      setLearnings(prev => 
        prev.map(learning => 
          learning.id === id 
            ? { 
                ...learning, 
                status: 'approved' as const, 
                approved_at: new Date().toISOString(),
                usage_count: 0
              }
            : learning
        )
      );
      
      toast({
        title: "Aprendizado aprovado",
        description: "O padrão foi aprovado e será usado pelo agente.",
      });
    } catch (error) {
      console.error('❌ Erro ao aprovar aprendizado:', error);
      toast({
        title: "Erro ao aprovar",
        description: "Não foi possível aprovar o aprendizado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRejeitar = async (id: string) => {
    try {
      await apiClient.post(`/api/sicc/learnings/${id}/reject`);
      
      // Atualizar estado local
      setLearnings(prev => 
        prev.map(learning => 
          learning.id === id 
            ? { ...learning, status: 'rejected' as const }
            : learning
        )
      );
      
      toast({
        title: "Aprendizado rejeitado",
        description: "O padrão foi rejeitado e não será usado pelo agente.",
      });
    } catch (error) {
      console.error('❌ Erro ao rejeitar aprendizado:', error);
      toast({
        title: "Erro ao rejeitar",
        description: "Não foi possível rejeitar o aprendizado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEditar = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSalvarEdicao = async () => {
    if (!editingId) return;
    
    try {
      await apiClient.put(`/api/sicc/learnings/${editingId}`, {
        suggested_response: editText
      });
      
      // Atualizar estado local
      setLearnings(prev => 
        prev.map(learning => 
          learning.id === editingId 
            ? { ...learning, suggested_response: editText }
            : learning
        )
      );
      
      setEditingId(null);
      setEditText('');
      
      toast({
        title: "Resposta editada",
        description: "A resposta sugerida foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('❌ Erro ao editar resposta:', error);
      toast({
        title: "Erro ao editar",
        description: "Não foi possível salvar a edição. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDesativar = async (id: string) => {
    try {
      await apiClient.post(`/api/sicc/learnings/${id}/reject`);
      
      // Atualizar estado local
      setLearnings(prev => 
        prev.map(learning => 
          learning.id === id 
            ? { ...learning, status: 'rejected' as const }
            : learning
        )
      );
      
      toast({
        title: "Aprendizado desativado",
        description: "O padrão foi desativado e não será mais usado.",
      });
    } catch (error) {
      console.error('❌ Erro ao desativar:', error);
      toast({
        title: "Erro ao desativar",
        description: "Não foi possível desativar o aprendizado.",
        variant: "destructive",
      });
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    // Converter de decimal para percentual se necessário
    const confidencePercent = confidence <= 1 ? Math.round(confidence * 100) : confidence;
    
    if (confidencePercent >= 80) return <Badge variant="default">Alta ({confidencePercent}%)</Badge>;
    if (confidencePercent >= 60) return <Badge variant="secondary">Média ({confidencePercent}%)</Badge>;
    return <Badge variant="outline">Baixa ({confidencePercent}%)</Badge>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não disponível';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Aprendizados</h1>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando aprendizados do sistema...</p>
        </div>
      </div>
    );
  }

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
        <Button onClick={loadLearnings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
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
          {paginatedLearnings.length === 0 ? (
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
            paginatedLearnings.map((learning) => (
              <Card key={learning.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Aprendizado #{learning.id}
                      </CardTitle>
                      <CardDescription>
                        Identificado em {formatDate(learning.created_at)} • Padrão: {learning.pattern_type}
                      </CardDescription>
                    </div>
                    {getConfidenceBadge(learning.confidence)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Padrão Identificado:</h4>
                    <p className="text-sm bg-muted p-3 rounded-lg">"{learning.description || learning.pattern_type}"</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Resposta Sugerida:</h4>
                    {editingId === learning.id ? (
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
                      <p className="text-sm bg-muted p-3 rounded-lg">{learning.suggested_response}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleAprovar(learning.id)}
                      disabled={editingId === learning.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleRejeitar(learning.id)}
                      disabled={editingId === learning.id}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditar(learning.id, learning.suggested_response)}
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
          {paginatedLearnings.length === 0 ? (
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
                  {paginatedLearnings.map((learning) => (
                    <div key={learning.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold">{learning.description || learning.pattern_type}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {learning.suggested_response || 'Nenhuma resposta sugerida'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {getConfidenceBadge(learning.confidence)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Aprovado em {learning.approved_at ? formatDate(learning.approved_at) : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Usado {learning.usage_count || 0} vezes
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditar(learning.id, learning.suggested_response)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDesativar(learning.id)}
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
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredLearnings.length)} de {filteredLearnings.length} resultados
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