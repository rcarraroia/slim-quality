# 📋 TASKS FASE 2 - IMPLEMENTAÇÃO DAS CORREÇÕES

## ⚠️ ATENÇÃO - DOCUMENTO EM PORTUGUÊS-BR

**Data:** 11/01/2026  
**Status:** ✅ APROVADO PARA IMPLEMENTAÇÃO

---

## 🎯 ORDEM DE EXECUÇÃO

**IMPORTANTE:** Seguir esta ordem para evitar dependências quebradas:

1. ✅ **BLOCO 1:** Criar helper de conversão monetária
2. ✅ **BLOCO 2:** Criar migration da view affiliate_hierarchy
3. ✅ **BLOCO 3:** Corrigir Bug 02 - Métricas
4. ✅ **BLOCO 4:** Corrigir Bug 07 - View Hierarchy
5. ✅ **BLOCO 5:** Corrigir Bug 08 - Tipos Monetários
6. ✅ **BLOCO 6:** Atualizar componentes React

---

## 📦 BLOCO 1: CRIAR HELPER DE CONVERSÃO MONETÁRIA

**Prioridade:** 🔴 CRÍTICA (outros blocos dependem deste)

### **Arquivo a criar:** `src/utils/currency.ts`

```typescript
/**
 * Utilitários para conversão e formatação de valores monetários
 * 
 * IMPORTANTE: O banco de dados armazena valores em CENTAVOS (integer)
 * para evitar problemas de precisão com decimais.
 * 
 * Exemplos:
 * - R$ 493,50 no banco = 49350 (integer)
 * - R$ 3.290,00 no banco = 329000 (integer)
 */

/**
 * Converte valor em centavos para decimal
 * @param cents Valor em centavos (integer)
 * @returns Valor em reais (decimal)
 * @example centsToDecimal(49350) // 493.50
 */
export function centsToDecimal(cents: number): number {
  if (cents === null || cents === undefined) return 0;
  return cents / 100;
}

/**
 * Converte valor decimal para centavos
 * @param decimal Valor em reais (decimal)
 * @returns Valor em centavos (integer)
 * @example decimalToCents(493.50) // 49350
 */
export function decimalToCents(decimal: number): number {
  if (decimal === null || decimal === undefined) return 0;
  return Math.round(decimal * 100);
}

/**
 * Formata valor em centavos para exibição
 * @param cents Valor em centavos
 * @returns String formatada (ex: "R$ 493,50")
 * @example formatCurrency(49350) // "R$ 493,50"
 */
export function formatCurrency(cents: number): string {
  const decimal = centsToDecimal(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(decimal);
}

/**
 * Formata valor decimal para exibição
 * @param decimal Valor em reais (decimal)
 * @returns String formatada (ex: "R$ 493,50")
 * @example formatDecimal(493.50) // "R$ 493,50"
 */
export function formatDecimal(decimal: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(decimal);
}

/**
 * Formata valor para exibição sem símbolo de moeda
 * @param cents Valor em centavos
 * @returns String formatada (ex: "493,50")
 * @example formatNumber(49350) // "493,50"
 */
export function formatNumber(cents: number): string {
  const decimal = centsToDecimal(cents);
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(decimal);
}
```

### **Validação:**
```bash
# Criar arquivo
# Verificar se não há erros de sintaxe
npm run lint src/utils/currency.ts
```

---

## 📦 BLOCO 2: CRIAR MIGRATION DA VIEW AFFILIATE_HIERARCHY

**Prioridade:** 🔴 CRÍTICA (Bug 07 depende desta view)

### **Passo 1: Criar arquivo de migration**

**Arquivo:** `supabase/migrations/20260111000000_create_affiliate_hierarchy_view.sql`

```sql
-- Migration: Criar view affiliate_hierarchy para visualização da rede
-- Created: 2026-01-11
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ View não existe
--   ✅ Tabela affiliates existe
--   ✅ Tabela orders existe
--   ✅ Tabela commissions existe
--   ✅ Estrutura recursiva necessária para hierarquia
-- ============================================

BEGIN;

-- Criar view com hierarquia de afiliados
CREATE OR REPLACE VIEW affiliate_hierarchy AS
WITH RECURSIVE network AS (
  -- Nível 0: Afiliados sem indicador (raiz)
  SELECT 
    a.id,
    a.name,
    a.email,
    a.status,
    a.referred_by,
    a.referral_code,
    a.created_at,
    0 AS level,
    ARRAY[a.id] AS path,
    a.id::text AS root_id
  FROM affiliates a
  WHERE a.referred_by IS NULL
    AND a.deleted_at IS NULL
  
  UNION ALL
  
  -- Níveis 1, 2, 3...: Afiliados indicados
  SELECT 
    a.id,
    a.name,
    a.email,
    a.status,
    a.referred_by,
    a.referral_code,
    a.created_at,
    n.level + 1 AS level,
    n.path || a.id AS path,
    n.root_id
  FROM affiliates a
  INNER JOIN network n ON a.referred_by = n.id
  WHERE a.deleted_at IS NULL
    AND n.level < 10  -- Limite de profundidade para evitar loops infinitos
    AND NOT a.id = ANY(n.path)  -- Evitar loops circulares
),
affiliate_stats AS (
  -- Calcular estatísticas de cada afiliado
  SELECT 
    a.id,
    COUNT(DISTINCT o.id) AS total_conversions,
    COALESCE(SUM(c.commission_value_cents) / 100.0, 0) AS total_commission_earned,
    COUNT(DISTINCT ref.id) AS active_referrals
  FROM affiliates a
  LEFT JOIN orders o ON o.affiliate_n1_id = a.id AND o.deleted_at IS NULL
  LEFT JOIN commissions c ON c.affiliate_id = a.id AND c.status = 'paid'
  LEFT JOIN affiliates ref ON ref.referred_by = a.id AND ref.status = 'active' AND ref.deleted_at IS NULL
  WHERE a.deleted_at IS NULL
  GROUP BY a.id
)
SELECT 
  n.id,
  n.name,
  n.email,
  n.status,
  n.referred_by,
  n.referral_code,
  n.level,
  n.path,
  n.root_id,
  n.created_at,
  COALESCE(s.total_conversions, 0) AS total_conversions,
  COALESCE(s.total_commission_earned, 0) AS total_commission_earned,
  COALESCE(s.active_referrals, 0) AS active_referrals
FROM network n
LEFT JOIN affiliate_stats s ON s.id = n.id
ORDER BY n.level, n.name;

-- Comentário da view
COMMENT ON VIEW affiliate_hierarchy IS 
  'View recursiva que mostra a hierarquia completa da rede de afiliados com estatísticas calculadas automaticamente';

COMMIT;

-- ============================================
-- ROLLBACK (se necessário)
-- ============================================
-- BEGIN;
-- DROP VIEW IF EXISTS affiliate_hierarchy;
-- COMMIT;
```

### **Passo 2: Aplicar migration via Supabase Power**

```bash
# Usar Supabase Power para aplicar migration
# kiroPowers -> supabase-hosted -> apply_migration
# project_id: vtynmmtuvxreiwcxxlma
# name: create_affiliate_hierarchy_view
# query: [conteúdo do SQL acima]
```

### **Validação:**
```sql
-- Testar se view foi criada
SELECT * FROM affiliate_hierarchy LIMIT 5;

-- Verificar estrutura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'affiliate_hierarchy';
```

---

## 📦 BLOCO 3: CORRIGIR BUG 02 - MÉTRICAS INCORRETAS

**Prioridade:** 🔴 CRÍTICA

### **Arquivo 1: `src/services/admin-affiliates.service.ts`**

**Localização:** Linhas 150-180 (método `getMetrics`)

**SUBSTITUIR código atual por:**

```typescript
/**
 * Busca métricas calculadas de um afiliado
 * 
 * IMPORTANTE: Métricas são CALCULADAS em tempo real, não lidas de campos.
 * Isso garante que os valores estejam sempre atualizados.
 * 
 * @param affiliateId ID do afiliado (obrigatório)
 * @returns Métricas calculadas do afiliado
 */
async getMetrics(affiliateId?: string): Promise<ServiceResponse<AffiliateMetrics>> {
  try {
    if (!affiliateId) {
      throw new Error('ID do afiliado é obrigatório');
    }

    // 1. Buscar total de vendas (pedidos onde afiliado é N1)
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_cents')
      .eq('affiliate_n1_id', affiliateId)
      .is('deleted_at', null);

    if (ordersError) {
      console.error('Erro ao buscar vendas:', ordersError);
      throw ordersError;
    }

    const totalVendas = ordersData?.length || 0;

    // 2. Buscar comissões recebidas (pagas)
    const { data: paidCommissions, error: paidError } = await supabase
      .from('commissions')
      .select('commission_value_cents')
      .eq('affiliate_id', affiliateId)
      .eq('status', 'paid');

    if (paidError) {
      console.error('Erro ao buscar comissões pagas:', paidError);
      throw paidError;
    }

    const comissoesRecebidas = paidCommissions?.reduce(
      (sum, c) => sum + (c.commission_value_cents / 100), 
      0
    ) || 0;

    // 3. Buscar comissões pendentes
    const { data: pendingCommissions, error: pendingError } = await supabase
      .from('commissions')
      .select('commission_value_cents')
      .eq('affiliate_id', affiliateId)
      .in('status', ['pending', 'approved']);

    if (pendingError) {
      console.error('Erro ao buscar comissões pendentes:', pendingError);
      throw pendingError;
    }

    const comissoesPendentes = pendingCommissions?.reduce(
      (sum, c) => sum + (c.commission_value_cents / 100), 
      0
    ) || 0;

    // 4. Buscar indicados ativos
    const { data: referrals, error: referralsError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referred_by', affiliateId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (referralsError) {
      console.error('Erro ao buscar indicados:', referralsError);
      throw referralsError;
    }

    const indicadosAtivos = referrals?.length || 0;

    // 5. Calcular taxa de conversão
    // TODO: Implementar lógica de clicks vs conversões quando houver tracking
    const taxaConversao = totalVendas > 0 ? 100 : 0;

    return {
      success: true,
      data: {
        totalVendas,
        comissoesRecebidas,
        comissoesPendentes,
        indicadosAtivos,
        conversoes: totalVendas,
        taxaConversao
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

### **Arquivo 2: `src/services/admin-commissions.service.ts`**

**Adicionar import no topo do arquivo:**

```typescript
import { centsToDecimal, formatCurrency } from '@/utils/currency';
```

**Localização:** Método `getAll` (aproximadamente linhas 50-100)

**SUBSTITUIR código atual por:**

```typescript
/**
 * Lista todas as comissões com filtros
 * 
 * IMPORTANTE: Valores monetários são convertidos de centavos para decimal
 * antes de retornar para o frontend.
 */
async getAll(params?: CommissionFilters): Promise<ServiceResponse<CommissionsResponse>> {
  try {
    let query = supabase
      .from('commissions')
      .select(`
        *,
        affiliate:affiliates!affiliate_id(id, name, email),
        order:orders!order_id(
          id, 
          order_number, 
          customer_name, 
          total_cents
        )
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.level) {
      query = query.eq('level', params.level);
    }

    if (params?.search) {
      // Busca por nome do afiliado ou ID
      query = query.or(`affiliate.name.ilike.%${params.search}%,id.ilike.%${params.search}%`);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // ✅ Converter valores de centavos para decimal
    const commissions = data?.map(c => ({
      ...c,
      amount: centsToDecimal(c.commission_value_cents),
      base_amount: centsToDecimal(c.base_value_cents),
      order: c.order ? {
        ...c.order,
        total_amount: centsToDecimal(c.order.total_cents)
      } : null
    })) || [];

    // Calcular resumo
    const summary = {
      totalAmount: commissions.reduce((sum, c) => sum + c.amount, 0),
      pendingAmount: commissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0),
      paidAmount: commissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0),
      rejectedAmount: commissions
        .filter(c => c.status === 'rejected')
        .reduce((sum, c) => sum + c.amount, 0)
    };

    return {
      success: true,
      data: {
        commissions,
        summary,
        total: commissions.length
      }
    };
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
```

### **Validação:**
```bash
# Verificar sintaxe
npm run lint src/services/admin-affiliates.service.ts
npm run lint src/services/admin-commissions.service.ts

# Testar build
npm run build
```

---

## 📦 BLOCO 4: CORRIGIR BUG 07 - VIEW HIERARCHY

**Prioridade:** 🟡 ALTA

### **Arquivo: `src/pages/dashboard/afiliados/MinhaRede.tsx`**

**Localização 1:** Linhas 30-50 (função `loadNetworkData`)

**SUBSTITUIR código atual por:**

```typescript
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

    if (queryError) {
      console.error('Erro na query:', queryError);
      throw new Error(`Erro ao buscar rede: ${queryError.message}`);
    }

    if (!data || data.length === 0) {
      console.warn('Nenhum afiliado encontrado na rede');
      setNetwork([]);
      return;
    }

    // Organizar em árvore hierárquica
    const networkData = buildNetworkTree(data);
    setNetwork(networkData);
    
  } catch (error) {
    console.error('Erro ao carregar rede:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    setError(errorMessage);
    
    toast({
      title: "Erro ao carregar rede",
      description: errorMessage,
      variant: "destructive"
    });
    
    setNetwork([]);
  } finally {
    setLoading(false);
  }
};
```

**Localização 2:** Linhas 80-120 (função `buildNetworkTree`)

**SUBSTITUIR código atual por:**

```typescript
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
```

### **Validação:**
```bash
# Verificar sintaxe
npm run lint src/pages/dashboard/afiliados/MinhaRede.tsx

# Testar build
npm run build
```

---

## 📦 BLOCO 5: CORRIGIR BUG 08 - TIPOS MONETÁRIOS

**Prioridade:** 🟡 ALTA

### **Arquivo 1: `src/services/frontend/affiliate.service.ts`**

**Adicionar import no topo:**

```typescript
import { centsToDecimal } from '@/utils/currency';
```

**Localização:** Método `getCommissions` (aproximadamente linhas 100-150)

**SUBSTITUIR código atual por:**

```typescript
/**
 * Busca comissões do afiliado logado
 * 
 * IMPORTANTE: Valores são convertidos de centavos para decimal
 */
async getCommissions(params?: CommissionFilters): Promise<ServiceResponse<Commission[]>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Buscar afiliado do usuário
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!affiliate) throw new Error('Afiliado não encontrado');

    let query = supabase
      .from('commissions')
      .select(`
        *,
        order:orders!order_id(
          id,
          order_number,
          customer_name,
          total_cents
        )
      `)
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // ✅ Converter valores de centavos para decimal
    const commissions = data?.map(c => ({
      ...c,
      amount: centsToDecimal(c.commission_value_cents),
      base_amount: centsToDecimal(c.base_value_cents),
      order: c.order ? {
        ...c.order,
        total_amount: centsToDecimal(c.order.total_cents)
      } : null
    })) || [];

    return {
      success: true,
      data: commissions
    };
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
```

### **Arquivo 2: `src/services/admin-withdrawals.service.ts`**

**Adicionar import no topo:**

```typescript
import { centsToDecimal, decimalToCents } from '@/utils/currency';
```

**Localização:** Método `getAll` (aproximadamente linhas 50-100)

**SUBSTITUIR código atual por:**

```typescript
/**
 * Lista todas as solicitações de saque
 * 
 * IMPORTANTE: Valores são convertidos de centavos para decimal
 */
async getAll(params?: WithdrawalFilters): Promise<ServiceResponse<WithdrawalsResponse>> {
  try {
    let query = supabase
      .from('withdrawals')
      .select(`
        *,
        affiliate:affiliates!affiliate_id(id, name, email)
      `)
      .order(params?.orderBy || 'created_at', { 
        ascending: params?.orderDirection === 'asc' 
      });

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // ✅ Converter valores de centavos para decimal
    const withdrawals = data?.map(w => ({
      ...w,
      amount: centsToDecimal(w.amount_cents)
    })) || [];

    return {
      success: true,
      data: {
        withdrawals,
        total: withdrawals.length
      }
    };
  } catch (error) {
    console.error('Erro ao buscar saques:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
```

### **Validação:**
```bash
# Verificar sintaxe
npm run lint src/services/frontend/affiliate.service.ts
npm run lint src/services/admin-withdrawals.service.ts

# Testar build
npm run build
```

---

## 📦 BLOCO 6: ATUALIZAR COMPONENTES REACT

**Prioridade:** 🟡 ALTA

### **Arquivo 1: `src/pages/afiliados/dashboard/Comissoes.tsx`**

**Localização:** Linhas 150-160 (exibição de valores na tabela)

**SUBSTITUIR código atual por:**

```typescript
<TableCell className="font-bold text-green-600">
  R$ {comissao.amount.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}
</TableCell>
```

**Localização:** Linhas 200-220 (modal de detalhes - valor da comissão)

**SUBSTITUIR código atual por:**

```typescript
<div className="flex justify-between pt-2 border-t">
  <span className="font-semibold">Valor da Comissão:</span>
  <span className="font-bold text-lg text-green-600">
    R$ {selectedComissao.amount.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

**Localização:** Linhas 180-190 (modal de detalhes - valor da venda)

**SUBSTITUIR código atual por:**

```typescript
<div className="flex justify-between">
  <span className="text-muted-foreground">Valor da Venda:</span>
  <span className="font-medium">
    R$ {(selectedComissao.order?.total_amount || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

---

### **Arquivo 2: `src/pages/dashboard/afiliados/GestaoComissoes.tsx`**

**Localização:** Linhas 80-100 (cards de métricas - valor pendente)

**SUBSTITUIR código atual por:**

```typescript
<Card className="p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground">Valor Pendente</p>
      <p className="text-2xl font-bold text-yellow-600">
        {loading ? "..." : `R$ ${summary.pendingAmount.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        })}`}
      </p>
    </div>
    <DollarSign className="h-8 w-8 text-yellow-600" />
  </div>
</Card>
```

**Localização:** Linhas 105-125 (cards de métricas - total pago)

**SUBSTITUIR código atual por:**

```typescript
<Card className="p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground">Total Pago</p>
      <p className="text-2xl font-bold text-green-600">
        {loading ? "..." : `R$ ${summary.paidAmount.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        })}`}
      </p>
    </div>
    <DollarSign className="h-8 w-8 text-green-600" />
  </div>
</Card>
```

**Localização:** Linhas 200-220 (tabela - valor da venda)

**SUBSTITUIR código atual por:**

```typescript
<TableCell>
  R$ {(comissao.order?.total_amount || 0).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}
</TableCell>
```

**Localização:** Linhas 225-235 (tabela - valor da comissão)

**SUBSTITUIR código atual por:**

```typescript
<TableCell className="font-bold text-green-600">
  R$ {comissao.amount.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}
</TableCell>
```

**Localização:** Linhas 300-320 (modal de detalhes - valor da venda)

**SUBSTITUIR código atual por:**

```typescript
<div className="flex justify-between">
  <span className="text-muted-foreground">Valor da Venda:</span>
  <span className="font-medium">
    R$ {(selectedComissao.order?.total_amount || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

**Localização:** Linhas 340-360 (modal de detalhes - valor da comissão)

**SUBSTITUIR código atual por:**

```typescript
<div className="flex justify-between pt-2 border-t">
  <span className="font-semibold">Valor da Comissão:</span>
  <span className="font-bold text-lg text-green-600">
    R$ {selectedComissao.amount.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

### **Validação:**
```bash
# Verificar sintaxe
npm run lint src/pages/afiliados/dashboard/Comissoes.tsx
npm run lint src/pages/dashboard/afiliados/GestaoComissoes.tsx

# Testar build
npm run build
```

---

## ✅ CHECKLIST FINAL DE VALIDAÇÃO

### **Antes de commitar:**

- [ ] **Build compila sem erros**
  ```bash
  npm run build
  ```

- [ ] **Lint passa sem erros**
  ```bash
  npm run lint
  ```

- [ ] **Não há console.logs esquecidos**
  ```bash
  # Buscar console.logs nos arquivos modificados
  grep -r "console.log" src/services/admin-affiliates.service.ts
  grep -r "console.log" src/services/admin-commissions.service.ts
  grep -r "console.log" src/services/frontend/affiliate.service.ts
  grep -r "console.log" src/services/admin-withdrawals.service.ts
  grep -r "console.log" src/pages/dashboard/afiliados/MinhaRede.tsx
  ```

- [ ] **Migration aplicada no banco**
  ```sql
  -- Verificar se view existe
  SELECT * FROM affiliate_hierarchy LIMIT 1;
  ```

- [ ] **Helper currency.ts criado**
  ```bash
  ls -la src/utils/currency.ts
  ```

- [ ] **Imports corretos em todos arquivos**
  ```bash
  # Verificar se imports do currency.ts estão corretos
  grep -r "from '@/utils/currency'" src/services/
  ```

---

## 🎯 RESUMO DA IMPLEMENTAÇÃO

### **Arquivos criados:**
1. ✅ `src/utils/currency.ts` - Helper de conversão monetária
2. ✅ `supabase/migrations/20260111000000_create_affiliate_hierarchy_view.sql` - Migration da view

### **Arquivos modificados:**
1. ✅ `src/services/admin-affiliates.service.ts` - Método getMetrics()
2. ✅ `src/services/admin-commissions.service.ts` - Método getAll()
3. ✅ `src/services/frontend/affiliate.service.ts` - Método getCommissions()
4. ✅ `src/services/admin-withdrawals.service.ts` - Método getAll()
5. ✅ `src/pages/dashboard/afiliados/MinhaRede.tsx` - Funções loadNetworkData() e buildNetworkTree()

### **Total de mudanças:**
- 2 arquivos criados
- 5 arquivos modificados
- ~400 linhas de código alteradas

---

## 🔒 CONCLUSÃO

**Todas as tasks estão documentadas e prontas para implementação.**

Seguindo esta ordem de execução, as correções serão aplicadas sem quebrar dependências e com validação em cada etapa.

**Tempo estimado total:** 2,5 horas

---

**Documento criado por:** Kiro AI  
**Data:** 11/01/2026  
**Status:** ✅ APROVADO - Pronto para implementação  
**Próxima etapa:** Executar BLOCO 1


---

## 📦 BLOCO 6: ATUALIZAR COMPONENTES REACT - FORMATAÇÃO MONETÁRIA

**Tempo:** 30 minutos  
**Prioridade:** 🟡 ALTA

### **Arquivo 1: `src/pages/afiliados/dashboard/Comissoes.tsx`**

**Localização 1:** Linhas ~150-160 (exibição de valores na tabela)

**SUBSTITUIR código atual por:**

```typescript
<TableCell className="font-bold text-green-600">
  R$ {comissao.amount.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}
</TableCell>
```

**Localização 2:** Linhas ~200-220 (modal de detalhes - valor da comissão)

**SUBSTITUIR código atual por:**

```typescript
<div className="flex justify-between pt-2 border-t">
  <span className="font-semibold">Valor da Comissão:</span>
  <span className="font-bold text-lg text-green-600">
    R$ {selectedComissao.amount.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

**Localização 3:** Linhas ~180-190 (modal de detalhes - valor da venda)

**SUBSTITUIR código atual por:**

```typescript
<div className="flex justify-between">
  <span className="text-muted-foreground">Valor da Venda:</span>
  <span className="font-medium">
    R$ {(selectedComissao.order?.total_amount || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

---

### **Arquivo 2: `src/pages/dashboard/afiliados/GestaoComissoes.tsx`**

**Localização 1:** Linhas ~80-100 (cards de métricas - valor pendente)

**SUBSTITUIR código atual por:**

```typescript
<Card className="p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground">Valor Pendente</p>
      <p className="text-2xl font-bold text-yellow-600">
        {loading ? "..." : `R$ ${summary.pendingAmount.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        })}`}
      </p>
    </div>
    <DollarSign className="h-8 w-8 text-yellow-600" />
  </div>
</Card>
```

**Localização 2:** Linhas ~105-125 (cards de métricas - total pago)

**SUBSTITUIR código atual por:**

```typescript
<Card className="p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground">Total Pago</p>
      <p className="text-2xl font-bold text-green-600">
        {loading ? "..." : `R$ ${summary.paidAmount.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        })}`}
      </p>
    </div>
    <DollarSign className="h-8 w-8 text-green-600" />
  </div>
</Card>
```

**Localização 3:** Linhas ~200-220 (tabela - valor da venda)

**SUBSTITUIR código atual por:**

```typescript
<TableCell>
  R$ {(comissao.order?.total_amount || 0).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}
</TableCell>
```

**Localização 4:** Linhas ~225-235 (tabela - valor da comissão)

**SUBSTITUIR código atual por:**

```typescript
<TableCell className="font-bold text-green-600">
  R$ {comissao.amount.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}
</TableCell>
```

**Localização 5:** Linhas ~300-320 (modal de detalhes - valor da venda)

**SUBSTITUIR código atual por:**

```typescript
<div className="flex justify-between">
  <span className="text-muted-foreground">Valor da Venda:</span>
  <span className="font-medium">
    R$ {(selectedComissao.order?.total_amount || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

**Localização 6:** Linhas ~340-360 (modal de detalhes - valor da comissão)

**SUBSTITUIR código atual por:**

```typescript
<div className="flex justify-between pt-2 border-t">
  <span className="font-semibold">Valor da Comissão:</span>
  <span className="font-bold text-lg text-green-600">
    R$ {selectedComissao.amount.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

---

### **Arquivo 3: `src/pages/dashboard/afiliados/Solicitacoes.tsx`**

**Localização 1:** Linhas ~80-100 (cards de métricas - valor pendente)

**SUBSTITUIR código atual por:**

```typescript
<Card className="p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground">Valor Pendente</p>
      <p className="text-2xl font-bold text-warning">
        {loading ? "..." : `R$ ${totalPendente.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        })}`}
      </p>
    </div>
    <TrendingDown className="h-8 w-8 text-warning" />
  </div>
</Card>
```

**Localização 2:** Linhas ~105-125 (cards de métricas - total processado)

**SUBSTITUIR código atual por:**

```typescript
<Card className="p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground">Total Processado</p>
      <p className="text-2xl font-bold text-success">
        {loading ? "..." : `R$ ${totalProcessado.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        })}`}
      </p>
    </div>
    <Check className="h-8 w-8 text-success" />
  </div>
</Card>
```

**Localização 3:** Linhas ~180-200 (tabela - valor do saque)

**SUBSTITUIR código atual por:**

```typescript
<TableCell className="font-bold text-success">
  R$ {saque.amount.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}
</TableCell>
```

**Localização 4:** Linhas ~280-300 (modal de detalhes - valor solicitado)

**SUBSTITUIR código atual por:**

```typescript
<div className="flex justify-between items-center pb-3 border-b">
  <span className="text-muted-foreground">Valor Solicitado:</span>
  <span className="text-2xl font-bold text-green-600">
    R$ {selectedSaque.amount.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

### **Validação:**
```bash
# Verificar sintaxe
npm run lint src/pages/afiliados/dashboard/Comissoes.tsx
npm run lint src/pages/dashboard/afiliados/GestaoComissoes.tsx
npm run lint src/pages/dashboard/afiliados/Solicitacoes.tsx

# Testar build
npm run build
```

---

## ✅ CHECKLIST FINAL DE VALIDAÇÃO (ATUALIZADO)

### **Antes de commitar:**

- [ ] **Build compila sem erros**
  ```bash
  npm run build
  ```

- [ ] **Lint passa sem erros**
  ```bash
  npm run lint
  ```

- [ ] **Não há console.logs esquecidos**
  ```bash
  # Buscar console.logs nos arquivos modificados
  grep -r "console.log" src/services/
  grep -r "console.log" src/pages/afiliados/dashboard/
  grep -r "console.log" src/pages/dashboard/afiliados/
  ```

- [ ] **Migration aplicada no banco**
  ```sql
  -- Verificar se view existe
  SELECT * FROM affiliate_hierarchy LIMIT 1;
  ```

- [ ] **Helper currency.ts criado**
  ```bash
  ls -la src/utils/currency.ts
  ```

- [ ] **Imports corretos em todos arquivos**
  ```bash
  # Verificar se imports do currency.ts estão corretos
  grep -r "from '@/utils/currency'" src/services/
  ```

- [ ] **Formatação monetária padronizada**
  ```bash
  # Verificar se toLocaleString está sendo usado corretamente
  grep -r "toLocaleString('pt-BR'" src/pages/
  ```

---

## 🎯 RESUMO DA IMPLEMENTAÇÃO (ATUALIZADO)

### **Arquivos criados:**
1. ✅ `src/utils/currency.ts` - Helper de conversão monetária
2. ✅ `supabase/migrations/20260111000000_create_affiliate_hierarchy_view.sql` - Migration da view

### **Arquivos modificados:**

**Serviços (Backend):**
1. ✅ `src/services/admin-affiliates.service.ts` - Método getMetrics()
2. ✅ `src/services/admin-commissions.service.ts` - Método getAll()
3. ✅ `src/services/frontend/affiliate.service.ts` - Método getCommissions()
4. ✅ `src/services/admin-withdrawals.service.ts` - Método getAll()

**Componentes (Frontend):**
5. ✅ `src/pages/dashboard/afiliados/MinhaRede.tsx` - Funções loadNetworkData() e buildNetworkTree()
6. ✅ `src/pages/afiliados/dashboard/Comissoes.tsx` - Formatação de valores monetários
7. ✅ `src/pages/dashboard/afiliados/GestaoComissoes.tsx` - Formatação de valores monetários
8. ✅ `src/pages/dashboard/afiliados/Solicitacoes.tsx` - Formatação de valores monetários

### **Total de mudanças:**
- 2 arquivos criados
- 8 arquivos modificados
- ~500 linhas de código alteradas

### **Tempo estimado total:** 3 horas

**Distribuição:**
- BLOCO 1: 15 min (Helper)
- BLOCO 2: 15 min (Migration)
- BLOCO 3: 45 min (Bug 02)
- BLOCO 4: 30 min (Bug 07)
- BLOCO 5: 45 min (Bug 08)
- BLOCO 6: 30 min (Componentes React)

---

## 🔒 CONCLUSÃO FINAL

**Todas as tasks estão documentadas e prontas para implementação.**

✅ **6 blocos de implementação** organizados por prioridade  
✅ **Código completo** para cada correção  
✅ **Validações** em cada etapa  
✅ **Checklist final** antes de commit  

Seguindo esta ordem de execução, as correções serão aplicadas sem quebrar dependências e com validação em cada etapa.

**Sistema ficará 100% funcional após implementação dos 6 blocos.**

---

**Documento criado por:** Kiro AI  
**Data:** 11/01/2026  
**Status:** ✅ APROVADO - Pronto para implementação  
**Próxima etapa:** Executar BLOCO 1 (Helper currency.ts)
