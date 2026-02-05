# FAQ Management System - Implementation Plan

## 📋 VISÃO GERAL

**Projeto:** Sistema de Gerenciamento de FAQ  
**Data:** 06/01/2026  
**Versão:** 1.0  
**Autor:** Kiro AI  

### Objetivo da Implementação
Executar a implementação técnica do sistema de gerenciamento de FAQ seguindo exatamente o design especificado, com foco na qualidade, performance e integração perfeita com o sistema existente.

---

## 🎯 PLANO DE EXECUÇÃO

### FASE 1: BANCO DE DADOS E BACKEND (30 minutos)

#### 1.1 Criação da Tabela e Políticas RLS
```sql
-- Arquivo: supabase/migrations/20260106000001_create_faqs_table.sql

-- Criar tabela faqs
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL CHECK (length(question) >= 10 AND length(question) <= 200),
  answer TEXT NOT NULL CHECK (length(answer) >= 20 AND length(answer) <= 1000),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_faqs_active_order ON faqs(is_active, display_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_faqs_search ON faqs USING gin(to_tsvector('portuguese', question || ' ' || answer)) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_faqs_updated_at 
    BEFORE UPDATE ON faqs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Política para leitura (todos podem ver FAQs ativas)
CREATE POLICY "Anyone can view active FAQs" ON faqs
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

-- Política para administradores (CRUD completo)
CREATE POLICY "Admins can manage all FAQs" ON faqs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );
```

#### 1.2 Script de Migração de Dados
```sql
-- Arquivo: supabase/migrations/20260106000002_migrate_existing_faqs.sql

-- Migrar FAQs atuais para o banco
INSERT INTO faqs (question, answer, display_order, is_active) VALUES
('Colchão magnético realmente funciona para dores?', 'Sim. A magnetoterapia é reconhecida pela OMS e diversos estudos científicos comprovam sua eficácia no alívio de dores crônicas, melhora da circulação sanguínea e redução de inflamações. Nosso colchão possui 240 ímãs de 800 Gauss que geram um campo magnético terapêutico durante o sono.', 1, true),
('Quanto tempo leva para sentir os benefícios?', 'Os primeiros benefícios podem ser sentidos já nas primeiras noites, como melhora na qualidade do sono. Para dores crônicas e problemas circulatórios, recomendamos uso contínuo por 30 a 60 dias para resultados mais significativos.', 2, true),
('O colchão magnético tem contraindicações?', 'Sim. Não recomendamos para pessoas com marcapasso, bombas de insulina, próteses metálicas recentes, gestantes ou crianças menores de 12 anos. Sempre consulte seu médico antes de usar terapias magnéticas.', 3, true),
('Qual a diferença entre colchão magnético e ortopédico comum?', 'O colchão ortopédico comum oferece apenas suporte postural. Nosso colchão magnético combina 8 tecnologias: magnetoterapia, infravermelho longo, vibromassagem, energia bioquântica, densidade progressiva, cromoterapia, perfilado high-tech e tratamento sanitário.', 4, true),
('Como funciona a garantia e entrega?', 'Oferecemos garantia de 10 anos contra defeitos de fabricação e 30 dias para teste em casa. A entrega é feita em todo Brasil via transportadora especializada, com prazo de 7 a 15 dias úteis dependendo da região.', 5, true),
('Posso usar o colchão magnético se tenho fibromialgia?', 'Muitos clientes com fibromialgia relatam melhora significativa nas dores e qualidade do sono. A magnetoterapia ajuda a reduzir a inflamação e melhorar a circulação, beneficiando os sintomas da fibromialgia. Recomendamos consultar seu reumatologista.', 6, true),
('O colchão magnético ajuda com insônia?', 'Sim. O infravermelho longo e a magnetoterapia promovem relaxamento profundo, reduzem o estresse e equilibram o sistema nervoso, facilitando o adormecer e proporcionando sono mais reparador.', 7, true),
('Qual tamanho escolher para meu quarto?', 'Oferecemos 4 tamanhos: Solteiro (88x188cm), Padrão/Casal (138x188cm), Queen (158x198cm) e King (193x203cm). O mais vendido é o Padrão. Considere o espaço do quarto e se dormem 1 ou 2 pessoas.', 8, true);
```

### FASE 2: TIPOS E SERVIÇOS (30 minutos)

#### 2.1 Tipos TypeScript
```typescript
// Arquivo: src/types/faq.types.ts

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateFAQRequest {
  question: string;
  answer: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateFAQRequest extends Partial<CreateFAQRequest> {
  id: string;
}

export interface FAQFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface FAQResponse {
  data: FAQ[];
  total: number;
  page: number;
  limit: number;
}

export interface FAQValidationError {
  field: string;
  message: string;
}
```

#### 2.2 Serviço FAQ
```typescript
// Arquivo: src/services/faq.service.ts

import { supabase } from '@/config/supabase';
import { FAQ, CreateFAQRequest, UpdateFAQRequest, FAQFilters, FAQResponse, FAQValidationError } from '@/types/faq.types';

class FAQService {
  private readonly TABLE = 'faqs';
  private cache: FAQ[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Validar dados de FAQ
  validateFAQ(faq: CreateFAQRequest): FAQValidationError[] {
    const errors: FAQValidationError[] = [];

    if (!faq.question || faq.question.trim().length < 10) {
      errors.push({ field: 'question', message: 'Pergunta deve ter pelo menos 10 caracteres' });
    }

    if (faq.question && faq.question.length > 200) {
      errors.push({ field: 'question', message: 'Pergunta deve ter no máximo 200 caracteres' });
    }

    if (!faq.answer || faq.answer.trim().length < 20) {
      errors.push({ field: 'answer', message: 'Resposta deve ter pelo menos 20 caracteres' });
    }

    if (faq.answer && faq.answer.length > 1000) {
      errors.push({ field: 'answer', message: 'Resposta deve ter no máximo 1000 caracteres' });
    }

    return errors;
  }

  // Sanitizar dados
  private sanitizeFAQ(faq: CreateFAQRequest): CreateFAQRequest {
    return {
      ...faq,
      question: faq.question.trim(),
      answer: faq.answer.trim()
    };
  }

  // Buscar FAQs ativas para a home (com cache)
  async getActiveFAQs(): Promise<FAQ[]> {
    const now = Date.now();
    
    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    const { data, error } = await supabase
      .from(this.TABLE)
      .select('id, question, answer, display_order')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Erro ao buscar FAQs ativas:', error);
      throw error;
    }

    this.cache = data || [];
    this.cacheExpiry = now + this.CACHE_DURATION;
    
    return this.cache;
  }

  // Buscar todas as FAQs para administração
  async getAllFAQs(filters: FAQFilters = {}): Promise<FAQResponse> {
    let query = supabase
      .from(this.TABLE)
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Aplicar filtros
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`question.ilike.${searchTerm},answer.ilike.${searchTerm}`);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    // Paginação
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('display_order', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar FAQs:', error);
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit
    };
  }

  // Criar nova FAQ
  async createFAQ(faqData: CreateFAQRequest): Promise<FAQ> {
    // Validar dados
    const errors = this.validateFAQ(faqData);
    if (errors.length > 0) {
      throw new Error(`Dados inválidos: ${errors.map(e => e.message).join(', ')}`);
    }

    // Sanitizar dados
    const sanitizedFaq = this.sanitizeFAQ(faqData);

    // Buscar próxima ordem se não especificada
    if (!sanitizedFaq.display_order) {
      const { data: maxOrder } = await supabase
        .from(this.TABLE)
        .select('display_order')
        .is('deleted_at', null)
        .order('display_order', { ascending: false })
        .limit(1);

      sanitizedFaq.display_order = (maxOrder?.[0]?.display_order || 0) + 1;
    }

    const { data, error } = await supabase
      .from(this.TABLE)
      .insert([sanitizedFaq])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar FAQ:', error);
      throw error;
    }

    this.invalidateCache();
    return data;
  }

  // Atualizar FAQ
  async updateFAQ(faqData: UpdateFAQRequest): Promise<FAQ> {
    const { id, ...updateData } = faqData;

    // Validar dados se fornecidos
    if (updateData.question || updateData.answer) {
      const errors = this.validateFAQ(updateData as CreateFAQRequest);
      if (errors.length > 0) {
        throw new Error(`Dados inválidos: ${errors.map(e => e.message).join(', ')}`);
      }
    }

    // Sanitizar dados
    const sanitizedData = updateData.question || updateData.answer 
      ? this.sanitizeFAQ(updateData as CreateFAQRequest)
      : updateData;

    const { data, error } = await supabase
      .from(this.TABLE)
      .update(sanitizedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar FAQ:', error);
      throw error;
    }

    this.invalidateCache();
    return data;
  }

  // Excluir FAQ (soft delete)
  async deleteFAQ(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir FAQ:', error);
      throw error;
    }

    this.invalidateCache();
  }

  // Reordenar FAQs
  async reorderFAQs(faqs: { id: string; display_order: number }[]): Promise<void> {
    try {
      const updates = faqs.map(faq => 
        supabase
          .from(this.TABLE)
          .update({ display_order: faq.display_order })
          .eq('id', faq.id)
      );

      await Promise.all(updates);
      this.invalidateCache();
    } catch (error) {
      console.error('Erro ao reordenar FAQs:', error);
      throw error;
    }
  }

  // Alternar status ativo/inativo
  async toggleFAQStatus(id: string, is_active: boolean): Promise<FAQ> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao alterar status da FAQ:', error);
      throw error;
    }

    this.invalidateCache();
    return data;
  }

  // Invalidar cache
  private invalidateCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }

  // Obter estatísticas
  async getStats(): Promise<{ total: number; active: number; inactive: number }> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('is_active')
      .is('deleted_at', null);

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }

    const total = data.length;
    const active = data.filter(faq => faq.is_active).length;
    const inactive = total - active;

    return { total, active, inactive };
  }
}

export const faqService = new FAQService();
```

### FASE 3: INTERFACE ADMINISTRATIVA (60 minutos)

#### 3.1 Componente Principal FaqManagement
```typescript
// Arquivo: src/components/admin/FaqManagement.tsx

import { useState, useEffect } from 'react';
import { FAQ, FAQFilters } from '@/types/faq.types';
import { faqService } from '@/services/faq.service';
import { FaqCard } from './FaqCard';
import { FaqModal } from './FaqModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, HelpCircle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

export function FaqManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FAQFilters>({ page: 1, limit: 10 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const response = await faqService.getAllFAQs(filters);
      setFaqs(response.data);
      setTotalPages(Math.ceil(response.total / (filters.limit || 10)));
    } catch (error) {
      console.error('Erro ao carregar FAQs:', error);
      toast({
        title: "Erro ao carregar FAQs",
        description: "Não foi possível carregar a lista de FAQs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await faqService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, [filters]);

  useEffect(() => {
    loadStats();
  }, [faqs]);

  const handleCreateFaq = () => {
    setEditingFaq(null);
    setIsModalOpen(true);
  };

  const handleEditFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setIsModalOpen(true);
  };

  const handleDeleteFaq = async (id: string, question: string) => {
    if (confirm(`Tem certeza que deseja excluir a FAQ: "${question}"?`)) {
      try {
        await faqService.deleteFAQ(id);
        toast({
          title: "FAQ excluída",
          description: "A FAQ foi excluída com sucesso",
        });
        loadFaqs();
      } catch (error) {
        console.error('Erro ao excluir FAQ:', error);
        toast({
          title: "Erro ao excluir FAQ",
          description: "Não foi possível excluir a FAQ",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await faqService.toggleFAQStatus(id, !currentStatus);
      toast({
        title: "Status alterado",
        description: `FAQ ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`,
      });
      loadFaqs();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro ao alterar status",
        description: "Não foi possível alterar o status da FAQ",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (dragIndex: number, hoverIndex: number) => {
    const draggedFaq = faqs[dragIndex];
    const newFaqs = [...faqs];
    newFaqs.splice(dragIndex, 1);
    newFaqs.splice(hoverIndex, 0, draggedFaq);

    // Atualizar ordem local imediatamente
    setFaqs(newFaqs);

    // Preparar dados para reordenação
    const reorderData = newFaqs.map((faq, index) => ({
      id: faq.id,
      display_order: index + 1
    }));

    try {
      await faqService.reorderFAQs(reorderData);
      toast({
        title: "Ordem atualizada",
        description: "A ordem das FAQs foi atualizada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao reordenar FAQs:', error);
      toast({
        title: "Erro ao reordenar",
        description: "Não foi possível atualizar a ordem das FAQs",
        variant: "destructive",
      });
      // Reverter mudança local em caso de erro
      loadFaqs();
    }
  };

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleStatusFilter = (value: string) => {
    const is_active = value === 'all' ? undefined : value === 'active';
    setFilters({ ...filters, is_active, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Gerenciamento de FAQ
        </h3>
        <Button onClick={handleCreateFaq} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova FAQ
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de FAQs</p>
                <p className="text-2xl font-bold text-blue-500">{stats.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">FAQs Ativas</p>
                <p className="text-2xl font-bold text-success">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">FAQs Inativas</p>
                <p className="text-2xl font-bold text-warning">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pergunta ou resposta..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de FAQs */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando FAQs...</p>
            </CardContent>
          </Card>
        ) : faqs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma FAQ encontrada</p>
              <Button onClick={handleCreateFaq} className="mt-4">
                Criar primeira FAQ
              </Button>
            </CardContent>
          </Card>
        ) : (
          faqs.map((faq, index) => (
            <FaqCard
              key={faq.id}
              faq={faq}
              index={index}
              onEdit={handleEditFaq}
              onDelete={handleDeleteFaq}
              onToggleStatus={handleToggleStatus}
              onReorder={handleReorder}
            />
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => handlePageChange((filters.page || 1) - 1)}
                disabled={filters.page === 1}
              >
                ← Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {filters.page} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange((filters.page || 1) + 1)}
                disabled={filters.page === totalPages}
              >
                Próxima →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <FaqModal
        faq={editingFaq}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          loadFaqs();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
```

#### 3.2 Componente FaqCard
```typescript
// Arquivo: src/components/admin/FaqCard.tsx

import { FAQ } from '@/types/faq.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqCardProps {
  faq: FAQ;
  index: number;
  onEdit: (faq: FAQ) => void;
  onDelete: (id: string, question: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
}

export function FaqCard({ faq, index, onEdit, onDelete, onToggleStatus, onReorder }: FaqCardProps) {
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      !faq.is_active && "opacity-60 border-dashed"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Número da ordem */}
          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
            {faq.display_order}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={faq.is_active ? "default" : "secondary"}>
                  {faq.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              
              {/* Ações */}
              <div className="flex items-center gap-1">
                {/* Reordenação */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReorder(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                  className="h-8 w-8"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReorder(index, index + 1)}
                  className="h-8 w-8"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {/* Toggle Status */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleStatus(faq.id, faq.is_active)}
                  className="h-8 w-8"
                >
                  {faq.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>

                {/* Editar */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(faq)}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                {/* Excluir */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(faq.id, faq.question)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Pergunta */}
            <h4 className="font-semibold text-sm mb-2 text-foreground">
              P: {truncateText(faq.question, 100)}
            </h4>

            {/* Resposta */}
            <p className="text-sm text-muted-foreground">
              R: {truncateText(faq.answer, 150)}
            </p>

            {/* Metadados */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>Criada em: {new Date(faq.created_at).toLocaleDateString('pt-BR')}</span>
              {faq.updated_at !== faq.created_at && (
                <span>Atualizada em: {new Date(faq.updated_at).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 3.3 Modal de Criação/Edição
```typescript
// Arquivo: src/components/admin/FaqModal.tsx

import { useState, useEffect } from 'react';
import { FAQ, CreateFAQRequest } from '@/types/faq.types';
import { faqService } from '@/services/faq.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye } from 'lucide-react';

interface FaqModalProps {
  faq: FAQ | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function FaqModal({ faq, isOpen, onClose, onSave }: FaqModalProps) {
  const [formData, setFormData] = useState<CreateFAQRequest>({
    question: '',
    answer: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (faq) {
      setFormData({
        question: faq.question,
        answer: faq.answer,
        is_active: faq.is_active,
        display_order: faq.display_order
      });
    } else {
      setFormData({
        question: '',
        answer: '',
        is_active: true
      });
    }
    setErrors({});
    setShowPreview(false);
  }, [faq, isOpen]);

  const validateForm = (): boolean => {
    const validationErrors = faqService.validateFAQ(formData);
    const errorMap: Record<string, string> = {};
    
    validationErrors.forEach(error => {
      errorMap[error.field] = error.message;
    });

    setErrors(errorMap);
    return validationErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (faq) {
        await faqService.updateFAQ({ id: faq.id, ...formData });
        toast({
          title: "FAQ atualizada",
          description: "A FAQ foi atualizada com sucesso",
        });
      } else {
        await faqService.createFAQ(formData);
        toast({
          title: "FAQ criada",
          description: "A FAQ foi criada com sucesso",
        });
      }
      onSave();
    } catch (error) {
      console.error('Erro ao salvar FAQ:', error);
      toast({
        title: "Erro ao salvar FAQ",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {faq ? 'Editar FAQ' : 'Nova FAQ'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showPreview ? (
            <>
              {/* Pergunta */}
              <div className="space-y-2">
                <Label htmlFor="question">Pergunta *</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Digite a pergunta..."
                  className={errors.question ? "border-destructive" : ""}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{errors.question || "10-200 caracteres"}</span>
                  <span>{formData.question.length}/200</span>
                </div>
              </div>

              {/* Resposta */}
              <div className="space-y-2">
                <Label htmlFor="answer">Resposta *</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Digite a resposta..."
                  rows={6}
                  className={errors.answer ? "border-destructive" : ""}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{errors.answer || "20-1000 caracteres"}</span>
                  <span>{formData.answer.length}/1000</span>
                </div>
              </div>

              {/* Configurações */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                />
                <Label htmlFor="is_active">FAQ ativa (visível no site)</Label>
              </div>

              {faq && (
                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordem de exibição</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order || ''}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
              )}
            </>
          ) : (
            /* Preview */
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Preview da FAQ:</h4>
                <div className="bg-white p-4 rounded border">
                  <button className="w-full text-left flex justify-between items-center">
                    <h3 className="text-lg font-medium">{formData.question}</h3>
                    <span>▼</span>
                  </button>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-gray-700 leading-relaxed">{formData.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            disabled={loading}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Editar' : 'Preview'}
          </Button>
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {faq ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### FASE 4: INTEGRAÇÃO COM HOME (30 minutos)

#### 4.1 Modificação do Componente FAQ
```typescript
// Arquivo: src/components/seo/FAQ.tsx (modificações)

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SchemaOrg } from './SchemaOrg';
import { faqService } from '@/services/faq.service';
import { FAQ as FAQType } from '@/types/faq.types';

// Dados de fallback (FAQs atuais como backup)
const fallbackFaqData: FAQType[] = [
  {
    id: 'fallback-1',
    question: "Colchão magnético realmente funciona para dores?",
    answer: "Sim. A magnetoterapia é reconhecida pela OMS e diversos estudos científicos comprovam sua eficácia no alívio de dores crônicas, melhora da circulação sanguínea e redução de inflamações. Nosso colchão possui 240 ímãs de 800 Gauss que geram um campo magnético terapêutico durante o sono.",
    display_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  // ... incluir todas as 8 FAQs atuais como fallback
];

export function FAQ() {
  const [faqData, setFaqData] = useState<FAQType[]>(fallbackFaqData);
  const [loading, setLoading] = useState(true);
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadFaqs = async () => {
      try {
        setLoading(true);
        setError(false);
        const faqs = await faqService.getActiveFAQs();
        
        if (faqs.length > 0) {
          setFaqData(faqs);
        } else {
          // Se não há FAQs no banco, usar fallback
          console.warn('Nenhuma FAQ encontrada no banco, usando dados de fallback');
        }
      } catch (error) {
        console.error('Erro ao carregar FAQs:', error);
        setError(true);
        // Manter dados de fallback em caso de erro
        toast({
          title: "Aviso",
          description: "Usando FAQs em cache. Algumas informações podem estar desatualizadas.",
          variant: "default",
        });
      } finally {
        setLoading(false);
      }
    };

    loadFaqs();
  }, []);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Schema para FAQ
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <section id="faq" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            Perguntas Frequentes
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando perguntas...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {faqData.map((item, index) => (
                <div 
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200"
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                >
                  <button
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                    onClick={() => toggleItem(index)}
                  >
                    <h3 
                      className="text-lg md:text-xl font-medium text-gray-900 pr-4"
                      itemProp="name"
                    >
                      {item.question}
                    </h3>
                    {openItems.includes(index) ? (
                      <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  
                  {openItems.includes(index) && (
                    <div 
                      className="px-6 pb-4"
                      itemScope
                      itemProp="acceptedAnswer"
                      itemType="https://schema.org/Answer"
                    >
                      <p 
                        className="text-base text-gray-700 leading-relaxed"
                        itemProp="text"
                      >
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                ⚠️ Exibindo FAQs em cache. Recarregue a página para tentar novamente.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Schema.org JSON-LD */}
      <SchemaOrg type="faq" data={faqSchema} />
    </section>
  );
}
```

#### 4.2 Adição da Aba FAQ em Configurações
```typescript
// Arquivo: src/pages/dashboard/Configuracoes.tsx (modificações)

// Importar componentes necessários
import { FaqManagement } from '@/components/admin/FaqManagement';
import { HelpCircle } from 'lucide-react';

// Adicionar ao settingsTabs
const settingsTabs = [
  { id: 'perfil', label: 'Meu Perfil', icon: User },
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
  { id: 'integracoes', label: 'Integrações', icon: Link },
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'faq', label: 'FAQ', icon: HelpCircle }, // Nova aba
];

// Adicionar case no renderContent()
const renderContent = () => {
  switch (activeTab) {
    // ... cases existentes
    case 'faq':
      return <FaqManagement />;
    default:
      return null;
  }
};
```

### FASE 5: TESTES E VALIDAÇÃO (15 minutos)

#### 5.1 Checklist de Testes
```markdown
## Testes de Banco de Dados
- [ ] Tabela `faqs` criada corretamente
- [ ] Políticas RLS funcionando
- [ ] Migração de dados executada
- [ ] Índices criados e funcionando
- [ ] Triggers de updated_at ativos

## Testes de API/Serviços
- [ ] getActiveFAQs() retorna dados corretos
- [ ] getAllFAQs() com filtros funciona
- [ ] createFAQ() valida e cria corretamente
- [ ] updateFAQ() atualiza dados
- [ ] deleteFAQ() faz soft delete
- [ ] Cache funciona corretamente
- [ ] Validações impedem dados inválidos

## Testes de Interface
- [ ] Aba FAQ aparece em configurações
- [ ] Lista de FAQs carrega corretamente
- [ ] Modal de criação/edição funciona
- [ ] Filtros e busca funcionam
- [ ] Reordenação funciona
- [ ] Toggle de status funciona
- [ ] Exclusão com confirmação funciona
- [ ] Paginação funciona

## Testes de Integração
- [ ] FAQ na home carrega do banco
- [ ] Fallback funciona em caso de erro
- [ ] Cache é invalidado após mudanças
- [ ] Schema.org é gerado corretamente
- [ ] Performance está adequada

## Testes de Responsividade
- [ ] Interface funciona em desktop
- [ ] Interface funciona em tablet
- [ ] Interface funciona em mobile
- [ ] Modal é responsivo
- [ ] Tabelas têm scroll em mobile
```

#### 5.2 Script de Validação
```typescript
// Arquivo: scripts/validate-faq-implementation.ts

import { faqService } from '@/services/faq.service';

async function validateImplementation() {
  console.log('🔍 Validando implementação do sistema de FAQ...');

  try {
    // Teste 1: Buscar FAQs ativas
    console.log('1. Testando busca de FAQs ativas...');
    const activeFaqs = await faqService.getActiveFAQs();
    console.log(`✅ ${activeFaqs.length} FAQs ativas encontradas`);

    // Teste 2: Buscar todas as FAQs
    console.log('2. Testando busca de todas as FAQs...');
    const allFaqs = await faqService.getAllFAQs();
    console.log(`✅ ${allFaqs.total} FAQs totais encontradas`);

    // Teste 3: Estatísticas
    console.log('3. Testando estatísticas...');
    const stats = await faqService.getStats();
    console.log(`✅ Stats: ${stats.total} total, ${stats.active} ativas, ${stats.inactive} inativas`);

    // Teste 4: Validação
    console.log('4. Testando validações...');
    const invalidFaq = { question: 'abc', answer: 'def' };
    const errors = faqService.validateFAQ(invalidFaq);
    console.log(`✅ ${errors.length} erros de validação detectados (esperado)`);

    console.log('🎉 Todos os testes passaram!');
  } catch (error) {
    console.error('❌ Erro na validação:', error);
  }
}

// Executar validação
validateImplementation();
```

---

## 📋 CHECKLIST FINAL DE IMPLEMENTAÇÃO

### Banco de Dados
- [ ] Executar migration de criação da tabela
- [ ] Executar migration de dados
- [ ] Verificar políticas RLS
- [ ] Testar queries básicas

### Backend/Serviços
- [ ] Criar tipos TypeScript
- [ ] Implementar FAQService
- [ ] Testar validações
- [ ] Testar cache

### Interface Administrativa
- [ ] Criar FaqManagement
- [ ] Criar FaqCard
- [ ] Criar FaqModal
- [ ] Adicionar aba em configurações
- [ ] Testar responsividade

### Integração Home
- [ ] Modificar componente FAQ
- [ ] Implementar fallback
- [ ] Testar cache
- [ ] Validar SEO

### Testes Finais
- [ ] Executar script de validação
- [ ] Testar fluxo completo
- [ ] Verificar performance
- [ ] Validar em diferentes dispositivos

---

## 🚀 COMANDOS DE EXECUÇÃO

### 1. Aplicar Migrations
```bash
# Via Supabase Power (recomendado)
kiroPowers use supabase apply_migration "create_faqs_table" "CREATE TABLE faqs..."
kiroPowers use supabase apply_migration "migrate_existing_faqs" "INSERT INTO faqs..."
```

### 2. Executar Testes
```bash
npm run test:faq-implementation
```

### 3. Build e Deploy
```bash
npm run build
npm run deploy
```

---

**Status:** Pronto para Execução  
**Tempo Estimado:** 2.75 horas  
**Responsável:** Kiro AI  
**Aprovação:** Aguardando confirmação do usuário