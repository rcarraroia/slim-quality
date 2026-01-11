# 🔧 SOLUÇÕES PRONTAS - BUGS FASE 2

## ⚠️ ATENÇÃO - DOCUMENTO EM PORTUGUÊS-BR

**Data:** 11/01/2026  
**Auditor:** Kiro AI  
**Status:** ✅ SOLUÇÕES DOCUMENTADAS - Aguardando aprovação para implementação

---

## 📋 ÍNDICE DE SOLUÇÕES

- [Bug 02: Dashboard Afiliado - Métricas Incorretas](#bug-02)
- [Bug 07: Painel Admin - Filtros Não Funcionam](#bug-07)
- [Bug 08: API Endpoints - Inconsistências](#bug-08)

---

## 🐛 BUG 02: DASHBOARD AFILIADO - MÉTRICAS INCORRETAS

### 📊 PROBLEMA IDENTIFICADO

**Arquivo:** `src/services/admin-affiliates.service.ts` (linhas 150-180)

**Código atual (ERRADO):**
```typescript
async getMetrics(affiliateId?: string): Promise<ServiceResponse<AffiliateMetrics>> {
  try {
    let query = supabase
      .from('affiliates')
      .select(`
        id,
        total_sales,              // ❌ Campo não existe
        total_commission_earned,  // ❌ Campo não existe
        active_referrals,         // ❌ Campo não existe
        conversion_rate           // ❌ Campo não existe
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
        comissoesPendentes: 0,
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

---

### ✅ SOLUÇÃO PROPOSTA

**Arquivo:** `src/services/admin-affiliates.service.ts`

**Código corrigido:**
```typescript
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

    if (ordersError) throw ordersError;

    const totalVendas = ordersData?.length || 0;

    // 2. Buscar comissões recebidas (pagas)
    const { data: paidCommissions, error: paidError } = await supabase
      .from('commissions')
      .select('commission_value_cents')
      .eq('affiliate_id', affiliateId)
      .eq('status', 'paid');

    if (paidError) throw paidError;

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

    if (pendingError) throw pendingError;

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

    if (referralsError) throw referralsError;

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

---

### 🔧 HELPER DE CONVERSÃO MONETÁRIA

**Arquivo:** `src/utils/currency.ts` (CRIAR NOVO)

```typescript
/**
 * Converte valor em centavos para decimal
 * @param cents Valor em centavos (integer)
 * @returns Valor em reais (decimal)
 * @example centsToDecimal(49350) // 493.50
 */
export function centsToDecimal(cents: number): number {
  return cents / 100;
}

/**
 * Converte valor decimal para centavos
 * @param decimal Valor em reais (decimal)
 * @returns Valor em centavos (integer)
 * @example decimalToCents(493.50) // 49350
 */
export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}

/**
 * Formata valor em centavos para exibição
 * @param cents Valor em centavos
 * @returns String formatada (ex: "R$ 493,50")
 */
export function formatCurrency(cents: number): string {
  const decimal = centsToDecimal(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(decimal);
}
```

---

### 📝 ATUALIZAÇÃO NO SERVIÇO DE COMISSÕES

**Arquivo:** `src/services/admin-commissions.service.ts`

**Adicionar import:**
```typescript
import { centsToDecimal, formatCurrency } from '@/utils/currency';
```

**Atualizar método getAll():**
```typescript
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

    // Aplicar filtros...
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

    const { data, error } = await query;

    if (error) throw error;

    // Converter valores de centavos para decimal
    const commissions = data?.map(c => ({
      ...c,
      amount: centsToDecimal(c.commission_value_cents), // ✅ Conversão
      base_amount: centsToDecimal(c.base_value_cents),  // ✅ Conversão
      order: c.order ? {
        ...c.order,
        total_amount: centsToDecimal(c.order.total_cents) // ✅ Conversão
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

---

## 🐛 BUG 07: PAINEL ADMIN - FILTROS NÃO FUNCIONAM

### 📊 PROBLEMA IDENTIFICADO

**Arquivo:** `src/pages/dashboard/afiliados/MinhaRede.tsx` (linha 35)

**Código atual (ERRADO):**
```typescript
const { data, error: queryError } = await supabase
  .from('affiliate_hierarchy')  // ❌ View não existe
  .select('*')
  .order('level', { ascending: true })
  .order('name', { ascending: true });
```

---

### ✅ SOLUÇÃO 1: CRIAR VIEW NO BANCO

**Migration SQL:** `supabase/migrations/YYYYMMDDHHMMSS_create_affiliate_hierarchy_view.sql`

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
    AND n.level < 10  -- Limite de profundidade
    AND NOT a.id = ANY(n.path)  -- Evitar loops
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
  'View recursiva que mostra a hierarquia completa da rede de afiliados com estatísticas';

COMMIT;

-- Rollback (se necessário)
-- BEGIN;
-- DROP VIEW IF EXISTS affiliate_hierarchy;
-- COMMIT;
```

---

### ✅ SOLUÇÃO 2: ATUALIZAR CÓDIGO DO COMPONENTE

**Arquivo:** `src/pages/dashboard/afiliados/MinhaRede.tsx`

**Código corrigido (linhas 30-50):**
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

**Atualizar função buildNetworkTree (linhas 80-120):**
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

---

## 🐛 BUG 08: API ENDPOINTS - INCONSISTÊNCIAS

### 📊 PROBLEMA IDENTIFICADO

**Múltiplos serviços usam valores monetários sem conversão adequada**

---

### ✅ SOLUÇÃO: PADRONIZAR TODOS OS SERVIÇOS

#### **1. Atualizar affiliate.service.ts**

**Arquivo:** `src/services/frontend/affiliate.service.ts`

```typescript
import { centsToDecimal } from '@/utils/currency';

// Atualizar método getCommissions
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

---

#### **2. Atualizar admin-withdrawals.service.ts**

**Arquivo:** `src/services/admin-withdrawals.service.ts`

```typescript
import { centsToDecimal, decimalToCents } from '@/utils/currency';

// Atualizar método getAll
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

---

#### **3. Atualizar Componentes de Dashboard**

**Arquivo:** `src/pages/afiliados/dashboard/Comissoes.tsx`

**Atualizar exibição de valores (linhas 150-160):**
```typescript
<TableCell className="font-bold text-green-600">
  R$ {comissao.amount.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}
</TableCell>
```

**Arquivo:** `src/pages/dashboard/afiliados/GestaoComissoes.tsx`

**Atualizar cards de métricas (linhas 80-100):**
```typescript
<p className="text-2xl font-bold text-yellow-600">
  R$ {summary.pendingAmount.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}
</p>
```

---

## 📊 RESUMO DAS SOLUÇÕES

### **Bug 02: Dashboard Afiliado - Métricas Incorretas**

**Arquivos a modificar:**
1. ✅ `src/services/admin-affiliates.service.ts` - Reescrever getMetrics()
2. ✅ `src/utils/currency.ts` - CRIAR helper de conversão
3. ✅ `src/services/admin-commissions.service.ts` - Adicionar conversões

**Tempo estimado:** 1 hora

---

### **Bug 07: Painel Admin - Filtros Não Funcionam**

**Arquivos a modificar:**
1. ✅ `supabase/migrations/YYYYMMDDHHMMSS_create_affiliate_hierarchy_view.sql` - CRIAR migration
2. ✅ `src/pages/dashboard/afiliados/MinhaRede.tsx` - Atualizar buildNetworkTree()

**Tempo estimado:** 30 minutos

---

### **Bug 08: API Endpoints - Inconsistências**

**Arquivos a modificar:**
1. ✅ `src/services/frontend/affiliate.service.ts` - Adicionar conversões
2. ✅ `src/services/admin-withdrawals.service.ts` - Adicionar conversões
3. ✅ `src/pages/afiliados/dashboard/Comissoes.tsx` - Atualizar formatação
4. ✅ `src/pages/dashboard/afiliados/GestaoComissoes.tsx` - Atualizar formatação

**Tempo estimado:** 1 hora

---

## ⏱️ ESTIMATIVA TOTAL

**Tempo para implementação:** 2,5 horas

**Distribuição:**
- Bug 02: 1 hora
- Bug 07: 30 minutos
- Bug 08: 1 hora

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### **Antes de começar:**
- [ ] Ler todas as soluções propostas
- [ ] Entender as mudanças necessárias
- [ ] Fazer backup do código atual
- [ ] Criar branch para correções

### **Durante implementação:**
- [ ] Criar helper currency.ts
- [ ] Criar migration da view
- [ ] Aplicar migration no banco
- [ ] Atualizar serviços um por um
- [ ] Atualizar componentes
- [ ] Testar cada correção

### **Após implementação:**
- [ ] Validar métricas no dashboard
- [ ] Testar filtros da rede
- [ ] Verificar valores monetários
- [ ] Testar com dados reais
- [ ] Commit e push

---

## 🔒 CONCLUSÃO

**Todas as soluções estão documentadas e prontas para implementação.**

- ✅ Código corrigido fornecido
- ✅ Migrations SQL prontas
- ✅ Helpers criados
- ✅ Componentes atualizados

**Aguardando aprovação para iniciar FASE 3 (Implementação).**

---

**Documento criado por:** Kiro AI  
**Data:** 11/01/2026  
**Status:** ✅ PRONTO PARA AVALIAÇÃO  
**Próxima etapa:** Aguardar aprovação para implementar
