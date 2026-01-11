# 📊 SCRIPTS SQL PARA VALIDAÇÃO - SLIM QUALITY

**Data:** 2026-01-11
**Objetivo:** Scripts para executar no Supabase e validar integridade do sistema

---

## 📋 ÍNDICE

1. [Estrutura do Banco](#1-estrutura-do-banco)
2. [Sistema de Afiliados](#2-sistema-de-afiliados)
3. [Sistema de Comissões](#3-sistema-de-comissões)
4. [Wallets Asaas](#4-wallets-asaas)
5. [Checklist de Consistência](#5-checklist-de-consistência)
6. [Auditoria e Logs](#6-auditoria-e-logs)

---

## 1. ESTRUTURA DO BANCO

### 1.1 Listar Todas as Tabelas

```sql
-- Lista todas as tabelas do schema public com contagem de registros
SELECT
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM pg_class WHERE relname = tablename) as table_exists,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Resultado Esperado:**
- ~35-40 tabelas
- affiliates, commissions, commission_splits, orders, etc

---

### 1.2 Verificar Colunas de Tabelas Críticas

```sql
-- Mostra estrutura de tabelas críticas
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'affiliates',
    'affiliate_network',
    'commissions',
    'commission_splits',
    'orders',
    'asaas_wallets',
    'products',
    'referral_codes'
)
ORDER BY table_name, ordinal_position;
```

**Verificar:**
- ✅ affiliates tem `wallet_id`, `referred_by`, `level`
- ✅ commissions tem `affiliate_id`, `level`, `percentage`, `status`
- ✅ commission_splits tem todos os campos de N1, N2, N3, gestores

---

### 1.3 Verificar Constraints (PKs, FKs, Unique)

```sql
-- Lista todas as constraints do banco
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;
```

**Verificar:**
- ✅ FKs de commissions → affiliates, orders
- ✅ FKs de commission_splits → affiliates (n1, n2, n3)
- ✅ Unique constraint em commission_splits.order_id

---

### 1.4 Verificar Índices

```sql
-- Lista todos os índices
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Verificar:**
- ✅ Índices em affiliates(wallet_id, referral_code, referred_by)
- ✅ Índices em commissions(order_id, affiliate_id, status)
- ✅ Índices em commission_splits(order_id, n1_affiliate_id, etc)

---

### 1.5 Verificar RLS Ativo

```sql
-- Verifica se RLS está habilitado em todas as tabelas
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Resultado Esperado:**
- ✅ Todas tabelas com `rls_enabled = true`

---

### 1.6 Listar Políticas RLS

```sql
-- Lista todas as políticas RLS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Verificar:**
- ✅ Políticas para affiliates (afiliados veem próprios dados, admins veem tudo)
- ✅ Políticas para commissions (afiliados veem próprias comissões, admins veem tudo)

---

## 2. SISTEMA DE AFILIADOS

### 2.1 Listar Todos os Afiliados

```sql
-- Lista todos os afiliados cadastrados
SELECT
    id,
    name,
    email,
    wallet_id,
    referred_by,
    level,
    status,
    total_clicks,
    total_conversions,
    total_commissions_cents,
    created_at
FROM affiliates
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
```

**Verificar:**
- ⚠️ Todos têm `wallet_id` preenchido?
- ⚠️ Formato de wallet_id: `wal_XXXXXXXXXXXXXXXXXXXX`
- ⚠️ `referred_by` aponta para afiliado válido?

---

### 2.2 Verificar Hierarquia de Afiliados

```sql
-- Mostra hierarquia completa via referred_by
WITH RECURSIVE affiliate_tree AS (
  -- Afiliados raiz (sem referência)
  SELECT
    id,
    name,
    referred_by,
    level,
    ARRAY[id] as path,
    1 as depth
  FROM affiliates
  WHERE referred_by IS NULL
  AND deleted_at IS NULL

  UNION ALL

  -- Afiliados descendentes
  SELECT
    a.id,
    a.name,
    a.referred_by,
    a.level,
    at.path || a.id,
    at.depth + 1
  FROM affiliates a
  JOIN affiliate_tree at ON a.referred_by = at.id
  WHERE a.deleted_at IS NULL
)
SELECT
  depth,
  id,
  name,
  referred_by,
  level,
  array_to_string(path, ' > ') as hierarchy_path
FROM affiliate_tree
ORDER BY path;
```

**Verificar:**
- ✅ Hierarquia correta (N1 → N2 → N3)
- ✅ `level` bate com profundidade (`depth`)
- ⚠️ Sem loops (afiliado A referindo afiliado B que refere A)

---

### 2.3 Verificar Códigos de Referência

```sql
-- Lista códigos de referência por afiliado
SELECT
    a.name as affiliate_name,
    a.wallet_id,
    rc.code,
    rc.is_active,
    rc.current_uses,
    rc.max_uses,
    rc.created_at
FROM referral_codes rc
JOIN affiliates a ON rc.affiliate_id = a.id
WHERE a.deleted_at IS NULL
ORDER BY rc.created_at DESC;
```

**Verificar:**
- ✅ Todo afiliado tem pelo menos 1 código
- ✅ Códigos únicos (sem duplicatas)
- ✅ Formato: 6 caracteres alfanuméricos maiúsculos

---

### 2.4 Afiliados SEM Wallet

```sql
-- ⚠️ PROBLEMA CRÍTICO: Afiliados sem wallet válida
SELECT
    id,
    name,
    email,
    wallet_id,
    status,
    created_at
FROM affiliates
WHERE deleted_at IS NULL
AND (
    wallet_id IS NULL
    OR wallet_id = ''
    OR wallet_id !~ '^wal_[a-zA-Z0-9]{20}$'
)
ORDER BY created_at DESC;
```

**Resultado Esperado:**
- ✅ 0 registros (todos devem ter wallet válida)
- ⚠️ Se houver registros, corrigir URGENTE

---

### 2.5 Afiliados com Wallet mas Não Validada

```sql
-- Afiliados com wallet_id mas não existe em asaas_wallets
SELECT
    a.id,
    a.name,
    a.wallet_id,
    a.status,
    aw.is_valid,
    aw.last_validated_at
FROM affiliates a
LEFT JOIN asaas_wallets aw ON a.wallet_id = aw.wallet_id
WHERE a.deleted_at IS NULL
AND (
    aw.id IS NULL  -- Wallet não validada
    OR aw.is_valid = false  -- Wallet inválida
)
ORDER BY a.created_at DESC;
```

**Ação:**
- Validar wallets via API Asaas
- Inserir em asaas_wallets

---

## 3. SISTEMA DE COMISSÕES

### 3.1 Todos os Pedidos

```sql
-- Lista todos os pedidos com informações de afiliado
SELECT
    o.id,
    o.order_number,
    o.customer_email,
    o.total_cents,
    o.status,
    o.referral_code,
    o.affiliate_n1_id,
    a.name as affiliate_name,
    o.asaas_payment_id,
    o.paid_at,
    o.created_at
FROM orders o
LEFT JOIN auth.users u ON o.affiliate_n1_id = u.id
LEFT JOIN affiliates a ON u.id = a.user_id
WHERE o.deleted_at IS NULL
ORDER BY o.created_at DESC
LIMIT 50;
```

**Verificar:**
- ⚠️ Pedidos com `referral_code` têm `affiliate_n1_id`?
- ⚠️ Pedidos com status 'paid' têm `paid_at`?
- ⚠️ Pedidos têm `asaas_payment_id` para criar split?

---

### 3.2 Comissões por Pedido

```sql
-- Mostra comissões geradas para cada pedido
SELECT
    o.order_number,
    o.total_cents as order_value,
    c.level,
    a.name as affiliate_name,
    c.percentage,
    c.commission_value_cents,
    c.status,
    c.asaas_split_id,
    c.paid_at,
    c.created_at
FROM commissions c
JOIN orders o ON c.order_id = o.id
JOIN affiliates a ON c.affiliate_id = a.id
WHERE o.deleted_at IS NULL
ORDER BY o.created_at DESC, c.level ASC;
```

**Verificar:**
- ✅ Pedidos com afiliado têm comissões
- ✅ Níveis corretos (1, 2, 3)
- ✅ Percentuais corretos (15%, 3%, 2%)

---

### 3.3 Splits por Pedido

```sql
-- Mostra distribuição completa de cada pedido
SELECT
    o.order_number,
    cs.total_order_value_cents,
    cs.factory_percentage,
    cs.factory_value_cents,
    cs.commission_percentage,
    cs.commission_value_cents,

    -- N1
    a1.name as n1_name,
    cs.n1_percentage,
    cs.n1_value_cents,

    -- N2
    a2.name as n2_name,
    cs.n2_percentage,
    cs.n2_value_cents,

    -- N3
    a3.name as n3_name,
    cs.n3_percentage,
    cs.n3_value_cents,

    -- Gestores
    cs.renum_percentage,
    cs.renum_value_cents,
    cs.jb_percentage,
    cs.jb_value_cents,

    -- Status
    cs.redistribution_applied,
    cs.status,
    cs.asaas_split_id,
    cs.created_at
FROM commission_splits cs
JOIN orders o ON cs.order_id = o.id
LEFT JOIN affiliates a1 ON cs.n1_affiliate_id = a1.id
LEFT JOIN affiliates a2 ON cs.n2_affiliate_id = a2.id
LEFT JOIN affiliates a3 ON cs.n3_affiliate_id = a3.id
WHERE o.deleted_at IS NULL
ORDER BY cs.created_at DESC;
```

**Verificar:**
- ✅ factory = 70%, commission = 30%
- ✅ Soma de N1 + N2 + N3 + Renum + JB = commission_value_cents
- ✅ `asaas_split_id` preenchido se status = 'sent_to_asaas'

---

### 3.4 Validar Integridade dos Splits

```sql
-- ⚠️ VERIFICA INTEGRIDADE FINANCEIRA
SELECT
    cs.id,
    o.order_number,
    cs.total_order_value_cents,

    -- Soma calculada
    (cs.factory_value_cents +
     COALESCE(cs.n1_value_cents, 0) +
     COALESCE(cs.n2_value_cents, 0) +
     COALESCE(cs.n3_value_cents, 0) +
     cs.renum_value_cents +
     cs.jb_value_cents) as calculated_total,

    -- Diferença (deve ser 0 ou max 1 centavo)
    (cs.total_order_value_cents -
     (cs.factory_value_cents +
      COALESCE(cs.n1_value_cents, 0) +
      COALESCE(cs.n2_value_cents, 0) +
      COALESCE(cs.n3_value_cents, 0) +
      cs.renum_value_cents +
      cs.jb_value_cents)) as difference_cents

FROM commission_splits cs
JOIN orders o ON cs.order_id = o.id
WHERE o.deleted_at IS NULL
AND ABS(cs.total_order_value_cents -
        (cs.factory_value_cents +
         COALESCE(cs.n1_value_cents, 0) +
         COALESCE(cs.n2_value_cents, 0) +
         COALESCE(cs.n3_value_cents, 0) +
         cs.renum_value_cents +
         cs.jb_value_cents)) > 1
ORDER BY difference_cents DESC;
```

**Resultado Esperado:**
- ✅ 0 registros (todos splits devem somar 100%)
- ⚠️ Se houver registros, há erro de arredondamento

---

### 3.5 Pedidos Pagos SEM Comissões

```sql
-- ⚠️ PROBLEMA CRÍTICO: Pedidos pagos sem comissões geradas
SELECT
    o.id,
    o.order_number,
    o.total_cents,
    o.status,
    o.referral_code,
    o.paid_at,
    COUNT(c.id) as comissoes_geradas,
    COUNT(cs.id) as splits_gerados
FROM orders o
LEFT JOIN commissions c ON o.id = c.order_id
LEFT JOIN commission_splits cs ON o.id = cs.order_id
WHERE o.status IN ('paid', 'completed')
AND o.deleted_at IS NULL
GROUP BY o.id
HAVING COUNT(c.id) = 0 OR COUNT(cs.id) = 0
ORDER BY o.created_at DESC;
```

**Resultado Esperado:**
- ✅ 0 registros (todos pedidos pagos devem ter comissões)
- ⚠️ Se houver, processar manualmente

---

### 3.6 Comissões SEM Splits

```sql
-- Comissões calculadas mas split não criado
SELECT
    c.order_id,
    o.order_number,
    COUNT(c.id) as comissoes_criadas,
    SUM(c.commission_value_cents) as total_comissoes,
    cs.id as split_id,
    cs.status as split_status
FROM commissions c
JOIN orders o ON c.order_id = o.id
LEFT JOIN commission_splits cs ON c.order_id = cs.order_id
WHERE o.deleted_at IS NULL
GROUP BY c.order_id, o.order_number, cs.id, cs.status
HAVING cs.id IS NULL
ORDER BY o.created_at DESC;
```

**Resultado Esperado:**
- ✅ 0 registros (toda comissão deve ter split)
- ⚠️ Se houver, criar split manualmente

---

## 4. WALLETS ASAAS

### 4.1 Todas as Wallets Validadas

```sql
-- Lista todas as wallets no cache
SELECT
    id,
    wallet_id,
    name,
    email,
    status,
    account_type,
    is_valid,
    last_validated_at,
    cache_expires_at,
    validation_attempts,
    created_at
FROM asaas_wallets
ORDER BY created_at DESC;
```

**Verificar:**
- ✅ Wallets dos gestores (Renum, JB) estão presentes?
- ✅ `is_valid = true`?
- ✅ `status = 'ACTIVE'`?

---

### 4.2 Wallets dos Gestores (FIXAS)

```sql
-- Verifica se wallets fixas existem
SELECT
    wallet_id,
    name,
    email,
    status,
    is_valid,
    last_validated_at
FROM asaas_wallets
WHERE name ILIKE '%renum%'
   OR name ILIKE '%jb%'
   OR name ILIKE '%gestor%'
   OR name ILIKE '%fábrica%'
   OR name ILIKE '%fabrica%'
ORDER BY name;
```

**Resultado Esperado:**
- ✅ 2-3 registros (Renum, JB, Fábrica)
- ⚠️ Se não houver, executar migration de seed

---

### 4.3 Afiliados com Wallets Válidas

```sql
-- Cruza affiliates com asaas_wallets para validar
SELECT
    a.name as affiliate_name,
    a.wallet_id,
    aw.name as wallet_owner_name,
    aw.email as wallet_email,
    aw.status as wallet_status,
    aw.is_valid,
    aw.last_validated_at
FROM affiliates a
LEFT JOIN asaas_wallets aw ON a.wallet_id = aw.wallet_id
WHERE a.deleted_at IS NULL
ORDER BY a.name;
```

**Verificar:**
- ⚠️ Todos afiliados têm wallet validada?
- ⚠️ `is_valid = true`?
- ⚠️ `status = 'ACTIVE'`?

---

### 4.4 Cache Expirado

```sql
-- Wallets com cache expirado (precisam revalidar)
SELECT
    wallet_id,
    name,
    last_validated_at,
    cache_expires_at,
    NOW() - cache_expires_at as expired_since
FROM asaas_wallets
WHERE cache_expires_at < NOW()
ORDER BY cache_expires_at ASC;
```

**Ação:**
- Executar `SELECT cleanup_expired_wallet_cache();`
- Ou revalidar via API

---

## 5. CHECKLIST DE CONSISTÊNCIA

### 5.1 Check 1: Todas Tabelas Existem?

```sql
SELECT COUNT(*) as tabelas_existentes
FROM information_schema.tables
WHERE table_schema = 'public';
```

**Esperado:** ~35-40 tabelas

---

### 5.2 Check 2: Afiliados Têm Wallet?

```sql
SELECT COUNT(*) as afiliados_sem_wallet
FROM affiliates
WHERE deleted_at IS NULL
AND (
    wallet_id IS NULL
    OR wallet_id = ''
    OR wallet_id !~ '^wal_[a-zA-Z0-9]{20}$'
);
```

**Esperado:** 0

---

### 5.3 Check 3: Pedidos Pagos Têm Comissões?

```sql
SELECT COUNT(*) as pedidos_sem_comissao
FROM orders o
LEFT JOIN commissions c ON o.id = c.order_id
WHERE o.status IN ('paid', 'completed')
AND o.deleted_at IS NULL
AND c.id IS NULL;
```

**Esperado:** 0

---

### 5.4 Check 4: Comissões Têm Splits?

```sql
SELECT COUNT(DISTINCT c.order_id) as pedidos_com_comissao_sem_split
FROM commissions c
LEFT JOIN commission_splits cs ON c.order_id = cs.order_id
WHERE cs.id IS NULL;
```

**Esperado:** 0

---

### 5.5 Check 5: Soma de Percentuais = 100%?

```sql
-- Splits onde soma de percentuais != 100%
SELECT
    id,
    order_id,
    (factory_percentage + commission_percentage) as total_percentage
FROM commission_splits
WHERE (factory_percentage + commission_percentage) != 100.00;
```

**Esperado:** 0 linhas

---

### 5.6 Check 6: Comissão = 30%?

```sql
-- Splits onde comissão != 30%
SELECT
    id,
    order_id,
    commission_percentage
FROM commission_splits
WHERE commission_percentage != 30.00;
```

**Esperado:** 0 linhas

---

### 5.7 Check 7: RLS Ativo?

```sql
SELECT
    tablename
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
```

**Esperado:** 0 linhas (todas devem ter RLS = true)

---

### 5.8 Check 8: Tabelas Têm created_at?

```sql
SELECT
    table_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('affiliates', 'orders', 'commissions', 'customers')
GROUP BY table_name
HAVING COUNT(CASE WHEN column_name = 'created_at' THEN 1 END) = 0;
```

**Esperado:** 0 linhas

---

### 5.9 Check 9: Tabelas Têm updated_at?

```sql
SELECT
    table_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('affiliates', 'orders', 'commissions', 'customers')
GROUP BY table_name
HAVING COUNT(CASE WHEN column_name = 'updated_at' THEN 1 END) = 0;
```

**Esperado:** 0 linhas

---

## 6. AUDITORIA E LOGS

### 6.1 Últimos Logs de Comissões

```sql
-- 50 últimas operações de comissão
SELECT
    cl.id,
    o.order_number,
    cl.operation_type,
    cl.total_value_cents,
    cl.commission_value_cents,
    cl.success,
    cl.error_message,
    u.email as user_email,
    cl.created_at
FROM commission_logs cl
JOIN orders o ON cl.order_id = o.id
LEFT JOIN auth.users u ON cl.user_id = u.id
ORDER BY cl.created_at DESC
LIMIT 50;
```

---

### 6.2 Logs de Erro

```sql
-- Operações que falharam
SELECT
    cl.id,
    o.order_number,
    cl.operation_type,
    cl.error_message,
    cl.operation_details,
    cl.created_at
FROM commission_logs cl
JOIN orders o ON cl.order_id = o.id
WHERE cl.success = false
ORDER BY cl.created_at DESC
LIMIT 20;
```

**Ação:**
- Investigar erros
- Corrigir causa raiz
- Reprocessar se necessário

---

### 6.3 Últimos Webhooks Asaas

```sql
-- Se tabela webhook_logs existir
SELECT
    id,
    source,
    event_type,
    payload->>'event' as event,
    payload->>'payment'->>'id' as payment_id,
    received_at
FROM webhook_logs
WHERE source = 'asaas'
ORDER BY received_at DESC
LIMIT 20;
```

---

### 6.4 Estatísticas de Cache de Wallets

```sql
-- View criada na migration
SELECT * FROM wallet_cache_stats;
```

**Verificar:**
- `total_wallets` > 0
- `valid_wallets` = `total_wallets`
- `problematic_wallets` = 0

---

### 6.5 Resumo de Logs de Comissão

```sql
-- View criada na migration
SELECT * FROM commission_logs_summary
WHERE operation_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY operation_date DESC, operation_type;
```

---

## 🔍 RELATÓRIOS ÚTEIS

### Relatório: Top 10 Afiliados por Comissões

```sql
SELECT
    a.name,
    a.email,
    COUNT(DISTINCT c.order_id) as total_pedidos,
    SUM(c.commission_value_cents) as total_comissoes_centavos,
    ROUND(SUM(c.commission_value_cents) / 100.0, 2) as total_comissoes_reais
FROM affiliates a
JOIN commissions c ON a.id = c.affiliate_id
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.email
ORDER BY total_comissoes_centavos DESC
LIMIT 10;
```

---

### Relatório: Comissões por Status

```sql
SELECT
    c.status,
    COUNT(*) as quantidade,
    SUM(c.commission_value_cents) as total_centavos,
    ROUND(SUM(c.commission_value_cents) / 100.0, 2) as total_reais
FROM commissions c
JOIN orders o ON c.order_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY c.status
ORDER BY total_centavos DESC;
```

---

### Relatório: Taxa de Conversão por Afiliado

```sql
SELECT
    a.name,
    a.total_clicks,
    a.total_conversions,
    CASE
        WHEN a.total_clicks > 0
        THEN ROUND((a.total_conversions::DECIMAL / a.total_clicks::DECIMAL) * 100, 2)
        ELSE 0
    END as taxa_conversao_percentual
FROM affiliates a
WHERE a.deleted_at IS NULL
AND a.total_clicks > 0
ORDER BY taxa_conversao_percentual DESC
LIMIT 10;
```

---

## 📊 EXPORTAR RESULTADOS

### Executar no Supabase SQL Editor

1. Copiar scripts acima
2. Executar no Supabase Dashboard > SQL Editor
3. Exportar resultados para CSV (botão Download)
4. Documentar outputs na auditoria

### Salvar Outputs

Criar pasta `auditoria/outputs_sql/`:

```bash
mkdir -p auditoria/outputs_sql
```

Salvar cada resultado:
- `01_estrutura_banco.csv`
- `02_afiliados.csv`
- `03_comissoes.csv`
- `04_wallets.csv`
- `05_checklist.csv`
- `06_logs.csv`

---

## ✅ CHECKLIST DE EXECUÇÃO

- [ ] 1. Executar scripts de estrutura (1.1 a 1.6)
- [ ] 2. Executar scripts de afiliados (2.1 a 2.5)
- [ ] 3. Executar scripts de comissões (3.1 a 3.6)
- [ ] 4. Executar scripts de wallets (4.1 a 4.4)
- [ ] 5. Executar checklist de consistência (5.1 a 5.9)
- [ ] 6. Executar scripts de auditoria (6.1 a 6.5)
- [ ] 7. Documentar todos os resultados
- [ ] 8. Identificar problemas encontrados
- [ ] 9. Criar plano de correção
- [ ] 10. Executar correções

---

**FIM DOS SCRIPTS SQL**
