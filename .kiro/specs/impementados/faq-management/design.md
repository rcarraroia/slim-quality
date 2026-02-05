# FAQ Management System - Design Document

## 📋 VISÃO GERAL

**Projeto:** Sistema de Gerenciamento de FAQ  
**Data:** 06/01/2026  
**Versão:** 1.0  
**Autor:** Kiro AI  

### Objetivo do Design
Definir a arquitetura técnica, estrutura de dados, interfaces e fluxos para implementação do sistema de gerenciamento de FAQ, garantindo integração perfeita com o sistema existente.

---

## 🗄️ ARQUITETURA DE DADOS

### Estrutura da Tabela `faqs`

```sql
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
```

### Políticas RLS (Row Level Security)

```sql
-- Habilitar RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Política para leitura (todos podem ver FAQs ativas)
CREATE POLICY "Anyone can view active FAQs" ON faqs
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

-- Política para administradores (CRUD completo)
CREATE POLICY "Admins can manage all FAQs" ON faqs
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin')
    );

-- Política para inserção (apenas admins)
CREATE POLICY "Admins can insert FAQs" ON faqs
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin')
    );
```

### Dados de Migração

```sql
-- Script para migrar FAQs atuais
INSERT INTO faqs (question, answer, display_order, is_active) VALUES
('Colchão magnético realmente funciona para dores?', 'Sim. A magnetoterapia é reconhecida pela OMS e diversos estudos científicos comprovam sua eficácia no alívio de dores crônicas, melhora da circulação sanguínea e redução de inflamações. Nosso colchão possui 240 ímãs de 800 Gauss que geram um campo magnético terapêutico durante o sono.', 1, true),
('Quanto tempo leva para sentir os benefícios?', 'Os primeiros benefícios podem ser sentidos já nas primeiras noites, como melhora na qualidade do sono. Para dores crônicas e problemas circulatórios, recomendamos uso contínuo por 30 a 60 dias para resultados mais significativos.', 2, true),
-- ... (continuar com todas as 8 FAQs atuais)
;
```

---

## 🎨 DESIGN DE INTERFACE

### Estrutura da Nova Aba FAQ

```typescript
// Adição ao settingsTabs em Configuracoes.tsx
const settingsTabs = [
  // ... tabs existentes
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
];
```

### Layout da Interface Administrativa

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Gerenciamento de FAQ                                     │
├─────────────────────────────────────────────────────────────┤
│ [+ Nova FAQ]                    [🔍 Buscar...] [Filtros ▼] │
├─────────────────────────────────────────────────────────────┤
│ ┌─ FAQ Card ─────────────────────────────────────────────┐ │
│ │ 🔢 1  ✅ Ativa                           [↑] [↓] [✏️] [🗑️] │ │
│ │ P: Colchão magnético realmente funciona para dores?    │ │
│ │ R: Sim. A magnetoterapia é reconhecida pela OMS...     │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─ FAQ Card ─────────────────────────────────────────────┐ │
│ │ 🔢 2  ❌ Inativa                         [↑] [↓] [✏️] [🗑️] │ │
│ │ P: Quanto tempo leva para sentir os benefícios?        │ │
│ │ R: Os primeiros benefícios podem ser sentidos...       │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [← Anterior] Página 1 de 3 [Próxima →]                     │
└─────────────────────────────────────────────────────────────┘
```

### Modal de Criação/Edição

```
┌─────────────────────────────────────────────────────────────┐
│ ✏️ Editar FAQ                                          [✕]  │
├─────────────────────────────────────────────────────────────┤
│ Pergunta *                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Colchão magnético realmente funciona para dores?       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ 10-200 caracteres (45/200)                                 │
│                                                             │
│ Resposta *                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Sim. A magnetoterapia é reconhecida pela OMS e         │ │
│ │ diversos estudos científicos comprovam sua eficácia... │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ 20-1000 caracteres (156/1000)                              │
│                                                             │
│ ☑️ FAQ Ativa    Ordem: [3] ▼                               │
│                                                             │
│ [Cancelar] [Preview] [Salvar]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 ARQUITETURA TÉCNICA

### Estrutura de Arquivos

```
src/
├── components/
│   ├── seo/
│   │   └── FAQ.tsx (modificado)
│   └── admin/
│       ├── FaqManagement.tsx (novo)
│       ├── FaqCard.tsx (novo)
│       ├── FaqModal.tsx (novo)
│       └── FaqPreview.tsx (novo)
├── services/
│   └── faq.service.ts (novo)
├── types/
│   └── faq.types.ts (novo)
└── pages/dashboard/
    └── Configuracoes.tsx (modificado)
```

### Tipos TypeScript

```typescript
// src/types/faq.types.ts
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
```

### Serviço FAQ

```typescript
// src/services/faq.service.ts
import { supabase } from '@/config/supabase';
import { FAQ, CreateFAQRequest, UpdateFAQRequest, FAQFilters, FAQResponse } from '@/types/faq.types';

class FAQService {
  private readonly TABLE = 'faqs';
  private cache: FAQ[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Buscar FAQs ativas para a home (com cache)
  async getActiveFAQs(): Promise<FAQ[]> {
    const now = Date.now();
    
    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw error;

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
      query = query.or(`question.ilike.%${filters.search}%,answer.ilike.%${filters.search}%`);
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

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit
    };
  }

  // Criar nova FAQ
  async createFAQ(faq: CreateFAQRequest): Promise<FAQ> {
    // Buscar próxima ordem se não especificada
    if (!faq.display_order) {
      const { data: maxOrder } = await supabase
        .from(this.TABLE)
        .select('display_order')
        .is('deleted_at', null)
        .order('display_order', { ascending: false })
        .limit(1);

      faq.display_order = (maxOrder?.[0]?.display_order || 0) + 1;
    }

    const { data, error } = await supabase
      .from(this.TABLE)
      .insert([faq])
      .select()
      .single();

    if (error) throw error;

    this.invalidateCache();
    return data;
  }

  // Atualizar FAQ
  async updateFAQ(faq: UpdateFAQRequest): Promise<FAQ> {
    const { id, ...updateData } = faq;

    const { data, error } = await supabase
      .from(this.TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    this.invalidateCache();
    return data;
  }

  // Excluir FAQ (soft delete)
  async deleteFAQ(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    this.invalidateCache();
  }

  // Reordenar FAQs
  async reorderFAQs(faqs: { id: string; display_order: number }[]): Promise<void> {
    const updates = faqs.map(faq => 
      supabase
        .from(this.TABLE)
        .update({ display_order: faq.display_order })
        .eq('id', faq.id)
    );

    await Promise.all(updates);
    this.invalidateCache();
  }

  // Invalidar cache
  private invalidateCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}

export const faqService = new FAQService();
```

---

## 🎯 COMPONENTES PRINCIPAIS

### 1. FaqManagement.tsx (Componente Principal)

```typescript
// src/components/admin/FaqManagement.tsx
import { useState, useEffect } from 'react';
import { FAQ, FAQFilters } from '@/types/faq.types';
import { faqService } from '@/services/faq.service';
import { FaqCard } from './FaqCard';
import { FaqModal } from './FaqModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';

export function FaqManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FAQFilters>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const response = await faqService.getAllFAQs(filters);
      setFaqs(response.data);
    } catch (error) {
      console.error('Erro ao carregar FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, [filters]);

  const handleCreateFaq = () => {
    setEditingFaq(null);
    setIsModalOpen(true);
  };

  const handleEditFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setIsModalOpen(true);
  };

  const handleDeleteFaq = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta FAQ?')) {
      try {
        await faqService.deleteFAQ(id);
        loadFaqs();
      } catch (error) {
        console.error('Erro ao excluir FAQ:', error);
      }
    }
  };

  const handleReorder = async (dragIndex: number, hoverIndex: number) => {
    // Implementar lógica de reordenação
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">❓ Gerenciamento de FAQ</h3>
        <Button onClick={handleCreateFaq} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova FAQ
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por pergunta ou resposta..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de FAQs */}
      <div className="space-y-4">
        {loading ? (
          <div>Carregando...</div>
        ) : (
          faqs.map((faq, index) => (
            <FaqCard
              key={faq.id}
              faq={faq}
              index={index}
              onEdit={handleEditFaq}
              onDelete={handleDeleteFaq}
              onReorder={handleReorder}
            />
          ))
        )}
      </div>

      {/* Modal */}
      <FaqModal
        faq={editingFaq}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={loadFaqs}
      />
    </div>
  );
}
```

### 2. FAQ.tsx Modificado (Home)

```typescript
// src/components/seo/FAQ.tsx (modificações)
import { useState, useEffect } from 'react';
import { faqService } from '@/services/faq.service';
import { FAQ as FAQType } from '@/types/faq.types';

// Dados de fallback (FAQs atuais)
const fallbackFaqData: FAQType[] = [
  // ... FAQs atuais como fallback
];

export function FAQ() {
  const [faqData, setFaqData] = useState<FAQType[]>(fallbackFaqData);
  const [loading, setLoading] = useState(true);
  const [openItems, setOpenItems] = useState<number[]>([]);

  useEffect(() => {
    const loadFaqs = async () => {
      try {
        const faqs = await faqService.getActiveFAQs();
        if (faqs.length > 0) {
          setFaqData(faqs);
        }
      } catch (error) {
        console.error('Erro ao carregar FAQs:', error);
        // Manter dados de fallback em caso de erro
      } finally {
        setLoading(false);
      }
    };

    loadFaqs();
  }, []);

  // Resto do componente permanece igual...
  // Apenas usar faqData ao invés do array estático
}
```

---

## 🔄 FLUXOS DE DADOS

### Fluxo de Carregamento na Home

```
1. Usuário acessa home
2. Componente FAQ monta
3. useEffect dispara loadFaqs()
4. faqService.getActiveFAQs() verifica cache
5. Se cache válido: retorna dados
6. Se cache inválido: query Supabase
7. Dados retornados e cache atualizado
8. FAQs renderizadas na tela
```

### Fluxo de Administração

```
1. Admin acessa /dashboard/configuracoes
2. Clica na aba "FAQ"
3. FaqManagement carrega todas as FAQs
4. Admin pode:
   - Criar nova FAQ → Modal → Salvar → Reload
   - Editar FAQ → Modal → Salvar → Reload
   - Excluir FAQ → Confirmação → Delete → Reload
   - Reordenar → Drag & Drop → Update → Reload
```

### Fluxo de Cache

```
Cache Hit:
Request → Service → Cache Check → Return Cached Data

Cache Miss:
Request → Service → Supabase Query → Update Cache → Return Data

Cache Invalidation:
Admin Action → Service → Database Update → Clear Cache
```

---

## 🛡️ SEGURANÇA E VALIDAÇÃO

### Validações Frontend

```typescript
const validateFAQ = (faq: CreateFAQRequest): string[] => {
  const errors: string[] = [];

  if (!faq.question || faq.question.length < 10) {
    errors.push('Pergunta deve ter pelo menos 10 caracteres');
  }

  if (faq.question && faq.question.length > 200) {
    errors.push('Pergunta deve ter no máximo 200 caracteres');
  }

  if (!faq.answer || faq.answer.length < 20) {
    errors.push('Resposta deve ter pelo menos 20 caracteres');
  }

  if (faq.answer && faq.answer.length > 1000) {
    errors.push('Resposta deve ter no máximo 1000 caracteres');
  }

  return errors;
};
```

### Sanitização de Dados

```typescript
import DOMPurify from 'dompurify';

const sanitizeFAQ = (faq: CreateFAQRequest): CreateFAQRequest => {
  return {
    ...faq,
    question: DOMPurify.sanitize(faq.question.trim()),
    answer: DOMPurify.sanitize(faq.answer.trim())
  };
};
```

---

## 📊 PERFORMANCE E OTIMIZAÇÃO

### Estratégias de Cache

1. **Frontend Cache**: 5 minutos para FAQs ativas
2. **Query Optimization**: Índices específicos
3. **Lazy Loading**: Paginação na administração
4. **Debounce**: Busca com delay de 300ms

### Métricas de Performance

```typescript
// Monitoramento de performance
const performanceMetrics = {
  faqLoadTime: 0,
  cacheHitRate: 0,
  adminResponseTime: 0
};

// Implementar tracking de métricas
```

---

## 🧪 ESTRATÉGIA DE TESTES

### Testes Unitários
- Validações de FAQ
- Serviço de cache
- Sanitização de dados

### Testes de Integração
- CRUD completo via API
- Cache invalidation
- Políticas RLS

### Testes E2E
- Fluxo completo de administração
- Carregamento na home
- Responsividade

---

## 📱 RESPONSIVIDADE

### Breakpoints

```css
/* Mobile First */
.faq-management {
  /* Mobile: 320px-767px */
  padding: 1rem;
}

@media (min-width: 768px) {
  /* Tablet: 768px-1023px */
  .faq-management {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  /* Desktop: 1024px+ */
  .faq-management {
    padding: 2rem;
  }
}
```

### Adaptações Mobile
- Cards empilhados verticalmente
- Botões com tamanho mínimo de 44px
- Modal fullscreen em mobile
- Scroll horizontal para tabelas

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Banco de Dados (30 min)
1. Criar tabela `faqs`
2. Configurar políticas RLS
3. Executar migração de dados
4. Testar queries básicas

### Fase 2: Serviços e Tipos (30 min)
1. Criar tipos TypeScript
2. Implementar FAQService
3. Testar cache e queries
4. Validar sanitização

### Fase 3: Interface Admin (60 min)
1. Criar componentes base
2. Implementar CRUD
3. Adicionar validações
4. Testar responsividade

### Fase 4: Integração Home (30 min)
1. Modificar componente FAQ
2. Implementar fallback
3. Testar cache
4. Validar SEO

### Fase 5: Testes e Ajustes (15 min)
1. Testes end-to-end
2. Validação de performance
3. Ajustes finais
4. Deploy

---

## ✅ CRITÉRIOS DE ACEITAÇÃO TÉCNICA

### Funcionalidade
- [ ] CRUD completo funcionando
- [ ] Cache implementado e testado
- [ ] Migração de dados concluída
- [ ] SEO mantido

### Performance
- [ ] Carregamento < 500ms na home
- [ ] Interface admin responsiva
- [ ] Cache hit rate > 80%
- [ ] Queries otimizadas

### Segurança
- [ ] RLS funcionando
- [ ] Validações ativas
- [ ] Sanitização implementada
- [ ] Logs de auditoria

### Qualidade
- [ ] Código seguindo padrões
- [ ] Componentes reutilizáveis
- [ ] Tratamento de erros
- [ ] Documentação completa

---

**Status:** Pronto para Implementação  
**Próximo Passo:** Implementação Técnica  
**Responsável:** Kiro AI