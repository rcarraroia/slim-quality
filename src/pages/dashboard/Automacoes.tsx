import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { StatCard } from '@/components/dashboard/StatCard';
import { Bot, Send, Eye, Plus, Edit, Pause, List, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { automationService, AutomationRule, AutomationStats } from '@/services/automation.service';
import { toast } from 'sonner';
import { LogsModal } from '@/components/automation/LogsModal';

const statusColors = {
  ativa: 'bg-success/10 text-success border-success/20',
  pausada: 'bg-warning/10 text-warning border-warning/20',
  rascunho: 'bg-muted text-muted-foreground border-muted/50',
};

export default function Automacoes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationRule | null>(null);
  
  // Estados para dados reais da API
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [stats, setStats] = useState<AutomationStats>({
    fluxosAtivos: 0,
    mensagensEnviadasHoje: 0,
    taxaMediaAbertura: '0%'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para formulário
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    gatilho: '',
    acao: '',
    agendamento: {
      aguardar: false,
      tempo: 1,
      unidade: 'horas' as 'horas' | 'dias'
    }
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Estados para modal de logs
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedAutomationForLogs, setSelectedAutomationForLogs] = useState<AutomationRule | null>(null);

  // Carregar dados ao montar componente
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar automações e estatísticas em paralelo
      const [rulesResponse, statsResponse] = await Promise.all([
        automationService.getRules(),
        automationService.getStats()
      ]);

      if (rulesResponse.success && rulesResponse.data) {
        setAutomations(rulesResponse.data);
      } else {
        throw new Error(rulesResponse.error || 'Erro ao carregar automações');
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        console.warn('Erro ao carregar estatísticas:', statsResponse.error);
        // Manter valores padrão se estatísticas falharem
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error('Erro ao carregar dados: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (automation: AutomationRule) => {
    setEditingAutomation(automation);
    // Preencher formulário com dados existentes
    setFormData({
      nome: automation.nome,
      descricao: '',
      gatilho: automation.gatilho,
      acao: automation.acao,
      agendamento: {
        aguardar: false,
        tempo: 1,
        unidade: 'horas'
      }
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingAutomation(null);
    // Limpar formulário
    setFormData({
      nome: '',
      descricao: '',
      gatilho: '',
      acao: '',
      agendamento: {
        aguardar: false,
        tempo: 1,
        unidade: 'horas'
      }
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    }
    if (!formData.gatilho.trim()) {
      errors.gatilho = 'Gatilho é obrigatório';
    }
    if (!formData.acao.trim()) {
      errors.acao = 'Ação é obrigatória';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setFormLoading(true);

      if (editingAutomation) {
        // Editar automação existente
        const response = await automationService.updateRule(editingAutomation.id, formData);
        
        if (response.success && response.data) {
          // Atualizar lista local
          setAutomations(prev => 
            prev.map(auto => 
              auto.id === editingAutomation.id 
                ? response.data!
                : auto
            )
          );
          toast.success('Automação atualizada com sucesso!');
        } else {
          throw new Error(response.error || 'Erro ao atualizar automação');
        }
      } else {
        // Criar nova automação
        const response = await automationService.createRule(formData);
        
        if (response.success && response.data) {
          // Adicionar à lista local
          setAutomations(prev => [response.data!, ...prev]);
          toast.success('Automação criada com sucesso!');
        } else {
          throw new Error(response.error || 'Erro ao criar automação');
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao salvar: ' + errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (automation: AutomationRule) => {
    if (!confirm(`Tem certeza que deseja excluir a automação "${automation.nome}"?`)) {
      return;
    }

    try {
      const response = await automationService.deleteRule(automation.id);
      
      if (response.success) {
        // Remover da lista local
        setAutomations(prev => prev.filter(auto => auto.id !== automation.id));
        toast.success('Automação excluída com sucesso!');
      } else {
        throw new Error(response.error || 'Erro ao excluir automação');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir: ' + errorMessage);
    }
  };

  const handleViewLogs = (automation: AutomationRule) => {
    setSelectedAutomationForLogs(automation);
    setLogsModalOpen(true);
  };

  const handleToggleStatus = async (automation: AutomationRule) => {
    try {
      const newStatus = automation.status === 'ativa' ? 'pausada' : 'ativa';
      
      const response = await automationService.toggleRuleStatus(automation.id, newStatus);
      
      if (response.success) {
        // Atualizar estado local
        setAutomations(prev => 
          prev.map(auto => 
            auto.id === automation.id 
              ? { ...auto, status: newStatus }
              : auto
          )
        );
        
        toast.success(`Automação ${newStatus === 'ativa' ? 'ativada' : 'pausada'} com sucesso!`);
      } else {
        throw new Error(response.error || 'Erro ao alterar status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao alterar status: ' + errorMessage);
    }
  };

  // Exibir loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div>
            <p className="font-medium">Carregando automações...</p>
            <p className="text-sm text-muted-foreground">Conectando às APIs do sistema</p>
          </div>
        </div>
      </div>
    );
  }

  // Exibir erro
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <p className="font-medium text-destructive mb-2">Erro ao carregar automações</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData} variant="outline" className="gap-2">
              <Loader2 className="h-4 w-4" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Bot}
          label="Fluxos Ativos"
          value={stats.fluxosAtivos}
          iconColor="text-success"
        />
        <StatCard
          icon={Send}
          label="Mensagens Enviadas Hoje"
          value={stats.mensagensEnviadasHoje}
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Eye}
          label="Taxa Média de Abertura"
          value={stats.taxaMediaAbertura}
          iconColor="text-secondary"
        />
      </div>

      {/* Header e Botão */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fluxos de Automação</h2>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      {/* Grid de Automações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {automations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma automação criada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira automação para começar a automatizar processos
            </p>
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Automação
            </Button>
          </div>
        ) : (
          automations.map((auto) => (
            <Card key={auto.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <Badge className={cn("border", statusColors[auto.status])}>
                    {auto.status === 'ativa' ? '🟢 ATIVA' : auto.status === 'pausada' ? '🟡 PAUSADA' : '🔴 RASCUNHO'}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(auto)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(auto)} className="text-destructive hover:text-destructive">
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold">{auto.nome}</h3>
                
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <List className="h-4 w-4" />
                    Gatilho: <span className="font-medium text-foreground">{auto.gatilho}</span>
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Ação: <span className="font-medium text-foreground">{auto.acao}</span>
                  </p>
                </div>

                <div className="pt-4 border-t space-y-1 text-sm">
                  <p className="text-muted-foreground">📊 {auto.disparosMes || 0} disparos este mês</p>
                  <p className="text-muted-foreground">✅ {auto.taxaAbertura || '0%'} taxa de abertura</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewLogs(auto)}
                  >
                    <List className="h-4 w-4 mr-2" /> Ver Logs
                  </Button>
                  <Button 
                    variant={auto.status === 'ativa' ? 'destructive' : 'default'} 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={() => handleToggleStatus(auto)}
                  >
                    {auto.status === 'ativa' ? <Pause className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    {auto.status === 'ativa' ? 'Pausar' : 'Ativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAutomation ? `Editar Automação: ${editingAutomation.nome}` : 'Nova Automação'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <h3 className="font-semibold text-lg border-b pb-2">Configuração Básica</h3>
            
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Automação *</Label>
              <Input 
                id="nome"
                placeholder="Ex: Boas-vindas Novo Cliente" 
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className={formErrors.nome ? 'border-destructive' : ''}
              />
              {formErrors.nome && <p className="text-sm text-destructive">{formErrors.nome}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea 
                id="descricao"
                placeholder="Opcional" 
                rows={2}
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              />
            </div>

            <h3 className="font-semibold text-lg border-b pb-2">Gatilho (Quando ativar?) *</h3>
            <div className="space-y-2">
              <Label htmlFor="gatilho">Tipo de Gatilho</Label>
              <Select 
                value={formData.gatilho} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, gatilho: value }))}
              >
                <SelectTrigger className={formErrors.gatilho ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione um gatilho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cliente cadastrado">Cliente cadastrado</SelectItem>
                  <SelectItem value="Compra realizada">Compra realizada</SelectItem>
                  <SelectItem value="Carrinho abandonado">Carrinho abandonado</SelectItem>
                  <SelectItem value="Cliente inativo">Cliente inativo</SelectItem>
                  <SelectItem value="Data específica">Data específica</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.gatilho && <p className="text-sm text-destructive">{formErrors.gatilho}</p>}
            </div>

            <h3 className="font-semibold text-lg border-b pb-2">Ação (O que fazer?) *</h3>
            <div className="space-y-2">
              <Label htmlFor="acao">Tipo de Ação</Label>
              <Select 
                value={formData.acao} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, acao: value }))}
              >
                <SelectTrigger className={formErrors.acao ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione uma ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Enviar email">Enviar email</SelectItem>
                  <SelectItem value="Enviar WhatsApp">Enviar WhatsApp</SelectItem>
                  <SelectItem value="Criar tarefa">Criar tarefa</SelectItem>
                  <SelectItem value="Notificar equipe">Notificar equipe</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.acao && <p className="text-sm text-destructive">{formErrors.acao}</p>}
            </div>
            
            <h3 className="font-semibold text-lg border-b pb-2">Agendamento</h3>
            <div className="flex items-center space-x-2">
              <Toggle 
                pressed={formData.agendamento.aguardar}
                onPressedChange={(pressed) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    agendamento: { ...prev.agendamento, aguardar: pressed }
                  }))
                }
                aria-label="Toggle agendamento"
              >
                Aguardar
              </Toggle>
              <Input 
                type="number" 
                placeholder="1" 
                className="w-20"
                min="1"
                value={formData.agendamento.tempo}
                onChange={(e) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    agendamento: { ...prev.agendamento, tempo: parseInt(e.target.value) || 1 }
                  }))
                }
                disabled={!formData.agendamento.aguardar}
              />
              <Select 
                value={formData.agendamento.unidade}
                onValueChange={(value: 'horas' | 'dias') => 
                  setFormData(prev => ({ 
                    ...prev, 
                    agendamento: { ...prev.agendamento, unidade: value }
                  }))
                }
                disabled={!formData.agendamento.aguardar}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horas">horas</SelectItem>
                  <SelectItem value="dias">dias</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">após o gatilho.</span>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="gap-2"
                disabled={formLoading}
              >
                {formLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {formLoading 
                  ? 'Salvando...' 
                  : editingAutomation 
                    ? 'Salvar Alterações' 
                    : 'Criar Automação'
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Logs */}
      <LogsModal
        isOpen={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        automation={selectedAutomationForLogs}
      />
    </div>
  );
}