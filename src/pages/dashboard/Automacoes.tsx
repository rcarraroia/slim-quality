import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { StatCard } from '@/components/dashboard/StatCard';
import { Bot, Send, Eye, Plus, Edit, Pause, List, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Automation {
  id: number;
  nome: string;
  status: 'ativa' | 'pausada' | 'rascunho';
  gatilho: string;
  acao: string;
  disparosMes: number;
  taxaAbertura: string;
}

const mockAutomations: Automation[] = [
  { id: 1, nome: "Boas-vindas Novo Cliente", status: 'ativa', gatilho: "Cliente cadastrado", acao: "Enviar email de boas-vindas", disparosMes: 23, taxaAbertura: "87%" },
  { id: 2, nome: "Carrinho Abandonado", status: 'ativa', gatilho: "Cliente iniciou compra", acao: "Enviar lembrete após 1h", disparosMes: 47, taxaAbertura: "62%" },
  { id: 3, nome: "Follow-up Pós-Venda", status: 'ativa', gatilho: "7 dias após entrega", acao: "Perguntar satisfação + avaliação", disparosMes: 18, taxaAbertura: "75%" },
  { id: 4, nome: "Cliente Inativo 90 dias", status: 'ativa', gatilho: "Sem compra há 90 dias", acao: "Enviar oferta de reativação", disparosMes: 5, taxaAbertura: "55%" },
  { id: 5, nome: "Aniversário do Cliente", status: 'pausada', gatilho: "Data de aniversário", acao: "Enviar cupom de desconto", disparosMes: 0, taxaAbertura: "0%" },
  { id: 6, nome: "Indicação Pós-Compra", status: 'ativa', gatilho: "30 dias após entrega", acao: "Pedir indicação + oferecer desconto", disparosMes: 12, taxaAbertura: "68%" },
  { id: 7, nome: "Lead Frio", status: 'ativa', gatilho: "Lead sem interação há 14 dias", acao: "Enviar conteúdo educativo", disparosMes: 35, taxaAbertura: "45%" },
  { id: 8, nome: "Upsell Queen/King", status: 'rascunho', gatilho: "Cliente comprou Solteiro/Casal", acao: "Oferecer upgrade após 6 meses", disparosMes: 0, taxaAbertura: "0%" },
];

const statusColors = {
  ativa: 'bg-success/10 text-success border-success/20',
  pausada: 'bg-warning/10 text-warning border-warning/20',
  rascunho: 'bg-muted text-muted-foreground border-muted/50',
};

export default function Automacoes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingAutomation(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Bot}
          label="Fluxos Ativos"
          value={mockAutomations.filter(a => a.status === 'ativa').length}
          iconColor="text-success"
        />
        <StatCard
          icon={Send}
          label="Mensagens Enviadas Hoje"
          value={47}
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Eye}
          label="Taxa Média de Abertura"
          value="68%"
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
        {mockAutomations.map((auto) => (
          <Card key={auto.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Badge className={cn("border", statusColors[auto.status])}>
                  {auto.status === 'ativa' ? '🟢 ATIVA' : auto.status === 'pausada' ? '🟡 PAUSADA' : '🔴 RASCUNHO'}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(auto)}>
                  <Edit className="h-4 w-4" />
                </Button>
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
                <p className="text-muted-foreground">📊 {auto.disparosMes} disparos este mês</p>
                <p className="text-muted-foreground">✅ {auto.taxaAbertura} taxa de abertura</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <List className="h-4 w-4 mr-2" /> Ver Logs
                </Button>
                <Button 
                  variant={auto.status === 'ativa' ? 'destructive' : 'default'} 
                  size="sm" 
                  className="flex-1 gap-2"
                >
                  {auto.status === 'ativa' ? <Pause className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  {auto.status === 'ativa' ? 'Pausar' : 'Ativar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAutomation ? `Editar Automação: ${editingAutomation.nome}` : 'Nova Automação'}</DialogTitle>
          </DialogHeader>
          
          <form className="space-y-6 py-4">
            <h3 className="font-semibold text-lg border-b pb-2">Configuração Básica</h3>
            <div className="space-y-2">
              <Label>Nome da Automação</Label>
              <Input placeholder="Ex: Boas-vindas Novo Cliente" defaultValue={editingAutomation?.nome} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Opcional" rows={2} />
            </div>

            <h3 className="font-semibold text-lg border-b pb-2">Gatilho (Quando ativar?)</h3>
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <Select defaultValue="cliente-cadastrado">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente-cadastrado">Cliente cadastrado</SelectItem>
                  <SelectItem value="compra-realizada">Compra realizada</SelectItem>
                  <SelectItem value="carrinho-abandonado">Carrinho abandonado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <h3 className="font-semibold text-lg border-b pb-2">Ação (O que fazer?)</h3>
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select defaultValue="enviar-email">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enviar-email">Enviar email</SelectItem>
                  <SelectItem value="enviar-whatsapp">Enviar WhatsApp</SelectItem>
                  <SelectItem value="criar-tarefa">Criar tarefa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <h3 className="font-semibold text-lg border-b pb-2">Agendamento</h3>
            <div className="flex items-center space-x-2">
              <Toggle aria-label="Toggle agendamento" defaultPressed>
                Aguardar
              </Toggle>
              <Input type="number" placeholder="1" className="w-20" />
              <Select defaultValue="horas">
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="horas">horas</SelectItem>
                  <SelectItem value="dias">dias</SelectItem>
                </SelectContent>
              </Select>
              após o gatilho.
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline">Salvar Rascunho</Button>
              <Button type="submit" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {editingAutomation ? 'Salvar e Ativar' : 'Criar e Ativar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}