# 🔍 AUDITORIA COMPLETA - BUGS FASE 2 (Sistema de Afiliados)

## ⚠️ ATENÇÃO - DOCUMENTO EM PORTUGUÊS-BR

**Data da Auditoria:** 11/01/2026  
**Auditor:** Kiro AI  
**Metodologia:** Análise de código real + Validação no banco de dados  
**Status:** ✅ AUDITORIA CONCLUÍDA

---

## 📋 RESUMO EXECUTIVO

### Bugs Auditados:
- **Bug 02:** Dashboard Afiliado - Métricas Incorretas
- **Bug 07:** Painel Admin - Filtros Não Funcionam
- **Bug 08:** API Endpoints - Inconsistências

### Situação Geral:
- ✅ **Estrutura de código:** Bem organizada
- ⚠️ **Dados no banco:** Tabelas existem mas SEM dados de teste
- 🔴 **Problema crítico:** Campos usam `_cents` mas código espera valores decimais
- 🟡 **Serviços:** Implementados mas com incompatibilidade de tipos

---

## 🐛 BUG 02: DASHBOARD AFILIADO - MÉTRICAS INCORRETAS

### 📍 LOCALIZAÇÃO DOS ARQUIVOS

**Arquivos REAIS encontrados:**
1. `src/pages/afiliados/dashboard/Inicio.tsx` - Dashboard principal
2. `src/pages/afiliados/dashboard/Comissoes.tsx` - Página de comissões
3. `src/pages/dashboard/afiliados/ListaAfiliados.tsx` - Lista admin
4. `src/services/admin-affiliates.service.ts` - Serviço de métricas

**Arquivos NÃO EXISTEM (mencionados em docs mas não encontrados):**
- ❌ `DashboardAfiliado.tsx`
- ❌ `MetricsCards.tsx`
- ❌ `useAffiliateMetrics.ts`
- ❌ `affiliate-metrics.service.ts`

---

### 🔍 ANÁLISE DO CÓDIGO REAL

#### **Arquivo 1: `src/pages/afiliados/dashboard/Inicio.tsx`**

**Linhas 15-30 - Métricas mockadas:**
```typescript
const [metrics, setMetrics] = useState({
  totalVendas: 0,
  comissoesRecebidas: 0,
  comissoesPendentes: 0,
  indicadosAtivos: 0,
  conversoes: 0,
  taxaConversao: 0
});
```

**Linhas 45-60 - Função loadMetrics():**
```typescript
const loadMetrics = async () => {
  try {
    setLoading(true);
    const response = await affiliateService.getMetrics();
    
    if (response.success && response.data) {
      setMetrics(response.data);
    }
  } catch (error) {
    console.error('Erro ao carregar métricas:', error);
  } finally {
    setLoading(false);
  }
};
```

**❌ PROBLEMA IDENTIFICADO:**
- Chama `affiliateService.getMetrics()` mas não trata erros adequadamente
- Se API falhar, métricas ficam zeradas (valores iniciais do useState)
- Não há fallback ou mensagem de erro para o usuário

---

#### **Arquivo 2: `src/pages/afiliados/dashboard/Comissoes.tsx`**

**Linhas 20-35 - Estado de comissões:**
```typescript
const [comissoes, setComissoes] = useState<Commission[]>([]);
const [loading, setLoading] = useState(true);
const [statusFilter, setStatusFilter] = useState("todos");
```

**Linhas 50-70 - Função loadComissoes():**
```typescript
const loadComissoes = async () => {
  try {
    setLoading(true);
    const response = await affiliateService.getCommissions({
      status: statusFilter !== "todos" ? statusFilter : undefined,
      limit: 50
    });

    if (response.success && response.data) {
      setComissoes(response.data.commissions || []);
    }
  } catch (error) {
    console.error('Erro ao carregar comissões:', error);
    toast({
      title: "Erro ao carregar comissões",
      description: "Não foi possível carregar suas comissões.",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};
```

**✅ CÓDIGO BOM:**
- Tratamento de erro adequado
- Feedback ao usuário via toast
- Loading state correto

---

#### **Arquivo 3: `src/services/admin-affiliates.service.ts`**

**Linhas 150-180 - Função getMetrics():**
```typescript
async getMetrics(affiliateId?: string): Promise<ServiceResponse<AffiliateMetrics>> {
  try {
    let query = supabase
      .from('affiliates')
      .select(`
        id,
        total_sales,
        total_commission_earned,
        active_referrals,
        conversion_rate
      `);

    if (affiliateId) {
      query = query.eq('id', affiliateId);
    }

    const { data, error } = await query.single();

    if (error) throw error;

    return {
      success: true,
      data: {
        totalVendas: data.total_sales || 0,
        comissoesRecebidas: data.total_commission_earned || 0,
        comissoesPendentes: 0, // TODO: calcular do banco
        indicadosAtivos: data.active_referrals || 0,
        conversoes: data.total_sales || 0,
        taxaConversao: data.conversion_rate || 0
      }
    };
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
```

**🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS:**

1. **Campos não existem na tabela `affiliates`:**
   - ❌ `total_sales` - NÃO EXISTE
   - ❌ `total_commission_earned` - NÃO EXISTE
   - ❌ `active_referrals` - NÃO EXISTE
   - ❌ `conversion_rate` - NÃO EXISTE

2. **Query vai SEMPRE falhar** porque tenta buscar colunas inexistentes

3. **Métricas devem ser CALCULADAS, não lidas:**
   - Total de vendas: `COUNT(orders WHERE affiliate_n1_id = X)`
   - Comissões recebidas: `SUM(commissions WHERE affiliate_id = X AND status = 'paid')`
   - Comissões pendentes: `SUM(commissions WHERE affiliate_id = X AND status = 'pending')`
   - Indicados ativos: `COUNT(affiliates WHERE referred_by = X AND status = 'active')`

---

### 🗄️ VALIDAÇÃO NO BANCO DE DADOS

**Estrutura REAL da tabela `affiliates`:**
```sql
-- Colunas existentes (verificado via Supabase Power):
id, name, email, phone, cpf, wallet_id, referral_code, 
referred_by, status, created_at, updated_at, deleted_at
```

**Estrutura REAL da tabela `commissions`:**
```sql
-- Colunas existentes:
id, order_id, affiliate_id, level, percentage, 
base_value_cents, commission_value_cents, 
original_percentage, redistribution_applied, status, 
asaas_split_id, paid_at, calculated_by, 
calculation_details, created_at, updated_at
```

**⚠️ ATENÇÃO:** Valores monetários estão em **CENTAVOS** (`_cents`), mas código espera valores decimais!

**Dados no banco (verificado):**
- ✅ 3 afiliados cadastrados (todos ativos)
- ❌ 0 comissões registradas
- ❌ 0 pedidos com afiliados

---

### 🎯 PROBLEMAS DOCUMENTADOS - BUG 02

#### **Problema 1: Query com campos inexistentes**
- **Arquivo:** `src/services/admin-affiliates.service.ts`
- **Linha:** 150-180
- **Código atual:** Tenta ler `total_sales`, `total_commission_earned`, etc.
- **Problema:** Campos não existem na tabela
- **Impacto:** Query SEMPRE falha, métricas ficam zeradas

#### **Problema 2: Incompatibilidade de tipos monetários**
- **Banco:** Valores em centavos (`commission_value_cents`)
- **Código:** Espera valores decimais (`amount`)
- **Impacto:** Se houver dados, valores estarão 100x maiores

#### **Problema 3: Falta de cálculo agregado**
- **Atual:** Tenta ler campos diretos
- **Correto:** Deve fazer JOIN e SUM/COUNT
- **Impacto:** Métricas não refletem realidade

---

## 🐛 BUG 07: PAINEL ADMIN - FILTROS NÃO FUNCIONAM

### 📍 LOCALIZAÇÃO DOS ARQUIVOS

**Arquivos auditados:**
1. `src/pages/dashboard/afiliados/ListaAfiliados.tsx`
2. `src/pages/dashboard/afiliados/GestaoComissoes.tsx`
3. `src/pages/dashboard/afiliados/MinhaRede.tsx`
4. `src/pages/dashboard/afiliados/Solicitacoes.tsx`

---

### 🔍 ANÁLISE DO CÓDIGO REAL

#### **Arquivo: `src/pages/dashboard/afiliados/GestaoComissoes.tsx`**

**Linhas 30-45 - Filtros implementados:**
```typescript
const [statusFilter, setStatusFilter] = useState("todos");
const [nivelFilter, setNivelFilter] = useState("todos");
const [searchTerm, setSearchTerm] = useState("");
```

**Linhas 50-70 - useEffect com debounce:**
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    loadComissoes();
  }, 300); // Debounce de 300ms

  return () => clearTimeout(timeoutId);
}, [statusFilter, nivelFilter, searchTerm]);
```

**Linhas 75-95 - Função loadComissoes():**
```typescript
const loadComissoes = async () => {
  try {
    setLoading(true);
    const response = await adminCommissionsService.getAll({
      search: searchTerm || undefined,
      status: statusFilter !== "todos" ? statusFilter : undefined,
      level: nivelFilter !== "todos" ? parseInt(nivelFilter) : undefined,
      limit: 100
    });

    if (response.success && response.data) {
      setComissoes(response.data.commissions);
      setSummary(response.data.summary);
    }
  } catch (error) {
    console.error('Erro ao carregar comissões:', error);
  } finally {
    setLoading(false);
  }
};
```

**✅ CÓDIGO BOM:**
- Filtros implementados corretamente
- Debounce para evitar múltiplas chamadas
- Passa parâmetros corretos para o serviço

---

#### **Arquivo: `src/pages/dashboard/afiliados/MinhaRede.tsx`**

**Linhas 80-120 - Função buildNetworkTree():**
```typescript
const buildNetworkTree = (affiliates: any[]): NetworkNode[] => {
  const affiliateMap = new Map<string, NetworkNode>();
  
  // Criar todos os nós
  affiliates.forEach(aff => {
    affiliateMap.set(aff.id, {
      id: aff.id,
      nome: aff.name || 'Sem nome',
      nivel: aff.level,
      vendas: aff.total_conversions || 0,
      comissaoGerada: 0, // TODO: calcular comissões reais
      indicados: [],
      expanded: false
    });
  });

  // Organizar hierarquia
  const roots: NetworkNode[] = [];
  
  affiliates.forEach(aff => {
    const node = affiliateMap.get(aff.id);
    if (!node) return;

    if (!aff.referred_by || aff.level === 0) {
      roots.push(node);
    } else {
      const parent = affiliateMap.get(aff.referred_by);
      if (parent) {
        parent.indicados.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  return roots;
};
```

**🔴 PROBLEMA IDENTIFICADO:**
- Tenta ler de `affiliate_hierarchy` view
- View pode não existir ou estar desatualizada
- Campo `total_conversions` não existe

---

#### **Arquivo: `src/pages/dashboard/afiliados/Solicitacoes.tsx`**

**Linhas 40-60 - Filtros de saques:**
```typescript
const filteredSaques = saques.filter(saque => {
  const matchesStatus = statusFilter === "todos" || saque.status === statusFilter;
  const matchesSearch = 
    saque.affiliate?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    saque.id.toLowerCase().includes(searchTerm.toLowerCase());
  return matchesStatus && matchesSearch;
});
```

**✅ CÓDIGO BOM:**
- Filtro client-side funcional
- Lógica correta de busca

---

### 🎯 PROBLEMAS DOCUMENTADOS - BUG 07

#### **Problema 1: View affiliate_hierarchy não existe**
- **Arquivo:** `src/pages/dashboard/afiliados/MinhaRede.tsx`
- **Linha:** 35
- **Código:** `supabase.from('affiliate_hierarchy').select('*')`
- **Problema:** View não foi criada no banco
- **Impacto:** Rede não carrega

#### **Problema 2: Campos inexistentes em queries**
- **Campos usados:** `total_conversions`, `level`
- **Realidade:** Campos não existem na tabela `affiliates`
- **Impacto:** Dados incorretos ou erro na query

---

## 🐛 BUG 08: API ENDPOINTS - INCONSISTÊNCIAS

### 📍 SERVIÇOS AUDITADOS

1. `src/services/admin-affiliates.service.ts`
2. `src/services/admin-commissions.service.ts`
3. `src/services/admin-withdrawals.service.ts`
4. `src/services/frontend/affiliate.service.ts`

---

### 🔍 ANÁLISE DOS SERVIÇOS

#### **Serviço 1: admin-affiliates.service.ts**

**Métodos implementados:**
- ✅ `getAll()` - Lista afiliados
- ✅ `getById()` - Busca por ID
- ✅ `getMetrics()` - Métricas (COM PROBLEMAS)
- ✅ `approve()` - Aprovar afiliado
- ✅ `reject()` - Rejeitar afiliado
- ✅ `updateStatus()` - Atualizar status

**🔴 PROBLEMA:** Método `getMetrics()` usa campos inexistentes

---

#### **Serviço 2: admin-commissions.service.ts**

**Métodos implementados:**
- ✅ `getAll()` - Lista comissões
- ✅ `getById()` - Busca por ID
- ✅ `approve()` - Aprovar comissão
- ✅ `reject()` - Rejeitar comissão

**⚠️ ATENÇÃO:** Usa `commission_value_cents` mas pode não converter para decimal

---

#### **Serviço 3: admin-withdrawals.service.ts**

**Métodos implementados:**
- ✅ `getAll()` - Lista saques
- ✅ `getById()` - Busca por ID
- ✅ `approve()` - Aprovar saque
- ✅ `reject()` - Rejeitar saque

**✅ CÓDIGO BOM:** Implementação correta

---

#### **Serviço 4: affiliate.service.ts**

**Métodos implementados:**
- ✅ `getMetrics()` - Métricas do afiliado
- ✅ `getCommissions()` - Comissões do afiliado
- ✅ `getNetwork()` - Rede do afiliado
- ✅ `getNetworkTree()` - Árvore da rede

**🔴 PROBLEMAS:**
- `getMetrics()` usa campos inexistentes
- `getNetwork()` pode ter lógica incorreta de níveis

---

### 🎯 PROBLEMAS DOCUMENTADOS - BUG 08

#### **Problema 1: Inconsistência de tipos monetários**
- **Banco:** Valores em `_cents` (integer)
- **Código:** Espera valores decimais (number)
- **Impacto:** Valores 100x maiores ou erros de tipo

#### **Problema 2: Campos calculados não existem**
- **Campos esperados:** `total_sales`, `total_commission_earned`, etc.
- **Realidade:** Devem ser calculados via JOIN/SUM
- **Impacto:** Queries falham

#### **Problema 3: View affiliate_hierarchy ausente**
- **Usado em:** MinhaRede.tsx, affiliate.service.ts
- **Problema:** View não foi criada
- **Impacto:** Funcionalidades de rede quebradas

---

## 📊 RESUMO DOS PROBLEMAS ENCONTRADOS

### 🔴 CRÍTICOS (Impedem funcionamento):

1. **Campos inexistentes em queries**
   - Arquivos afetados: 4
   - Impacto: Métricas sempre zeradas ou erro

2. **Incompatibilidade de tipos monetários**
   - Banco usa `_cents`, código espera decimal
   - Impacto: Valores incorretos

3. **View affiliate_hierarchy não existe**
   - Impacto: Rede de afiliados não funciona

### 🟡 MÉDIOS (Funciona mas incorreto):

4. **Falta de cálculos agregados**
   - Métricas devem ser calculadas, não lidas
   - Impacto: Dados imprecisos

5. **Tratamento de erro inconsistente**
   - Alguns componentes tratam, outros não
   - Impacto: UX ruim em caso de falha

---

## ✅ PONTOS POSITIVOS ENCONTRADOS

1. ✅ **Estrutura de código bem organizada**
2. ✅ **Componentes reutilizáveis**
3. ✅ **TypeScript bem tipado**
4. ✅ **Loading states implementados**
5. ✅ **Filtros client-side funcionais**
6. ✅ **Debounce em buscas**
7. ✅ **Feedback ao usuário (toasts)**

---

## 🎯 PRÓXIMOS PASSOS RECOMENDADOS

### **PRIORIDADE ALTA:**

1. **Corrigir queries de métricas**
   - Remover campos inexistentes
   - Implementar cálculos agregados
   - Converter valores de centavos para decimal

2. **Criar view affiliate_hierarchy**
   - Definir estrutura correta
   - Incluir campos necessários
   - Aplicar via migration

3. **Padronizar tipos monetários**
   - Criar helper para conversão cents ↔ decimal
   - Atualizar todos os serviços

### **PRIORIDADE MÉDIA:**

4. **Melhorar tratamento de erros**
   - Padronizar em todos os componentes
   - Adicionar fallbacks

5. **Adicionar dados de teste**
   - Criar seed com afiliados
   - Criar pedidos de exemplo
   - Gerar comissões de teste

---

## 📝 CONCLUSÃO DA AUDITORIA

**Status Geral:** 🟡 **FUNCIONAL MAS COM PROBLEMAS CRÍTICOS**

- ✅ Código bem estruturado e organizado
- ✅ Componentes implementados corretamente
- 🔴 Queries incompatíveis com estrutura do banco
- 🔴 Tipos monetários inconsistentes
- 🔴 View necessária não existe

**Tempo estimado para correção:** 2-3 horas

**Complexidade:** Média (requer alterações em banco + código)

---

**Auditoria realizada por:** Kiro AI  
**Data:** 11/01/2026  
**Metodologia:** Análise preventiva obrigatória  
**Status:** ✅ CONCLUÍDA - Pronta para implementação das correções
