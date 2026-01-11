# 🔍 RELATÓRIO DE VARREDURA - TABELAS OBSOLETAS

**Data:** 10/01/2026  
**Tipo:** Análise Técnica (Sem Correções)  
**Objetivo:** Identificar TODAS as referências às tabelas `affiliate_network` e `affiliate_hierarchy`

---

## 📋 SUMÁRIO EXECUTIVO

### TABELAS ANALISADAS:

1. **`affiliate_network`** (TABELA FÍSICA - OBSOLETA)
   - Status no banco: ✅ **EXISTE**
   - Deveria existir: ❌ **NÃO** (deprecada)
   - Substituída por: `affiliates.referred_by` + VIEW `affiliate_network_view`

2. **`affiliate_hierarchy`** (VIEW MATERIALIZADA - OBSOLETA)
   - Status no banco: ✅ **EXISTE**
   - Deveria existir: ❌ **NÃO** (deprecada)
   - Substituída por: VIEW `affiliate_network_view`

### VIEWS CORRETAS (DEVEM SER USADAS):

1. **`affiliate_network_view`** (VIEW MATERIALIZADA - ATIVA)
   - Status: ✅ **CORRETA**
   - Atualização: Automática via triggers
   - Fonte: `affiliates.referred_by`

---

## 🔴 PROBLEMA CRÍTICO CONFIRMADO

### BUG #1: Função `calculate_commission_split` Usa Tabela Obsoleta

**Localização:** Função SQL no banco de dados  
**Status:** 🔴 **CONFIRMADO**

**Código Problemático:**
```sql
-- Linha 262-264 da função calculate_commission_split
SELECT 
  n2.affiliate_id,
  n3.affiliate_id
INTO v_n2_affiliate_id, v_n3_affiliate_id
FROM affiliate_network n1                          -- ❌ TABELA OBSOLETA
LEFT JOIN affiliate_network n2 ON n2.affiliate_id = n1.parent_id
LEFT JOIN affiliate_network n3 ON n3.affiliate_id = n2.parent_id
WHERE n1.affiliate_id = (
  SELECT id FROM affiliates WHERE user_id = v_n1_affiliate_id AND deleted_at IS NULL
);
```

**IMPACTO:**
- Função SQL de cálculo de comissões usa tabela deprecada
- Pode causar inconsistências se `affiliate_network` não estiver sincronizada
- Deveria usar `affiliates.referred_by` ou `affiliate_network_view`

---

## 📊 ANÁLISE COMPLETA POR CATEGORIA

### 1. BANCO DE DADOS

#### 1.1. Tabelas Físicas

| Tabela | Status | Deveria Existir? | Observação |
|--------|--------|------------------|------------|
| `affiliate_network` | ✅ Existe | ❌ NÃO | **OBSOLETA** - Substituída por `affiliates.referred_by` |

#### 1.2. Views Materializadas

| View | Status | Deveria Existir? | Observação |
|------|--------|------------------|------------|
| `affiliate_hierarchy` | ✅ Existe | ❌ NÃO | **OBSOLETA** - Substituída por `affiliate_network_view` |
| `affiliate_network_view` | ✅ Existe | ✅ SIM | **CORRETA** - Esta deve ser usada |

#### 1.3. Funções SQL

| Função | Usa Tabela Obsoleta? | Detalhes |
|--------|---------------------|----------|
| `calculate_commission_split` | 🔴 **SIM** | Usa `affiliate_network` (linhas 262-264) |
| `refresh_affiliate_hierarchy` | ⚠️ Suspeita | Função para refresh da view obsoleta |
| `refresh_affiliate_network_view` | ✅ OK | Função para refresh da view correta |
| `check_affiliate_loop` | ✅ OK | Não usa tabelas obsoletas |
| `get_affiliate_commissions` | ✅ OK | Não usa tabelas obsoletas |
| `get_affiliate_stats` | ✅ OK | Não usa tabelas obsoletas |
| `auto_activate_affiliate` | ✅ OK | Não usa tabelas obsoletas |
| `protect_critical_fields_affiliates` | ✅ OK | Não usa tabelas obsoletas |
| `validate_affiliate_status_change` | ✅ OK | Não usa tabelas obsoletas |

#### 1.4. Políticas RLS (Row Level Security)

**Tabela: `affiliate_network`**

| Política | Status | Observação |
|----------|--------|------------|
| `Admins can modify network` | 🔴 Ativa | Política para tabela obsoleta |
| `Admins can view all network` | 🔴 Ativa | Política para tabela obsoleta |
| `Affiliates can view own ancestors` | 🔴 Ativa | **USA `affiliate_network_view` na query** |
| `Affiliates can view own network tree` | 🔴 Ativa | **USA `affiliate_network_view` na query** |
| `Affiliates can view their referrals` | 🔴 Ativa | Política para tabela obsoleta |

**OBSERVAÇÃO IMPORTANTE:** Algumas políticas RLS da tabela `affiliate_network` **fazem referência à view correta** (`affiliate_network_view`) dentro das queries, mas ainda estão aplicadas à tabela obsoleta.

---

### 2. MIGRATIONS (SQL)

#### 2.1. Migrations que CRIAM Tabelas Obsoletas

| Arquivo | Cria O Que? | Status |
|---------|-------------|--------|
| `20250125000001_create_affiliate_network.sql` | Tabela `affiliate_network` | 🔴 **OBSOLETA** |
| `20260111000001_consolidate_affiliate_structure.sql` | View `affiliate_hierarchy` | 🔴 **OBSOLETA** |

#### 2.2. Migrations que USAM Tabelas Obsoletas

| Arquivo | Usa O Que? | Detalhes |
|---------|-----------|----------|
| `20250125000003_create_commissions_tables.sql` | `affiliate_network` | Função `calculate_commission_split` |
| `20260105215220_add_parent_affiliate_id_to_affiliate_network.sql` | `affiliate_network` | Adiciona coluna `parent_affiliate_id` |
| `20260111000005_fix_affiliate_network_rls.sql` | `affiliate_network` | Corrige políticas RLS |

#### 2.3. Migrations que REFERENCIAM (Comentários)

| Arquivo | Referência | Tipo |
|---------|-----------|------|
| `20250125000002_create_referral_tracking.sql` | `affiliate_network` | Comentário de verificação |

---

### 3. CÓDIGO FRONTEND (TypeScript/React)

#### 3.1. Serviços

**Arquivo: `src/services/frontend/affiliate.service.ts`**

| Linha | Código | Status |
|-------|--------|--------|
| 246 | `.from('affiliate_hierarchy')` | 🔴 **USA VIEW OBSOLETA** |
| 534 | `.from('affiliate_hierarchy')` | 🔴 **USA VIEW OBSOLETA** |
| 1028-1035 | Comentário sobre `affiliate_hierarchy` | ⚠️ Documentação obsoleta |

**Arquivo: `src/services/affiliates/affiliate.service.ts`**

| Linha | Código | Status |
|-------|--------|--------|
| 246 | `.from('affiliate_hierarchy')` | 🔴 **USA VIEW OBSOLETA** |
| 369 | `.from('affiliate_hierarchy')` | 🔴 **USA VIEW OBSOLETA** |

#### 3.2. Páginas/Componentes

**Arquivo: `src/pages/dashboard/afiliados/MinhaRede.tsx`**

| Linha | Código | Status |
|-------|--------|--------|
| 47 | `.from('affiliate_hierarchy')` | 🔴 **USA VIEW OBSOLETA** |

---

### 4. EDGE FUNCTIONS (Supabase)

**Arquivo: `supabase/functions/calculate-commissions/index.ts`**

| Linha | Código | Status |
|-------|--------|--------|
| 138 | `.rpc('calculate_commission_split', ...)` | 🔴 **CHAMA FUNÇÃO QUE USA TABELA OBSOLETA** |

**IMPACTO:** Edge Function chama função SQL que usa `affiliate_network` obsoleta.

---

### 5. TESTES

#### 5.1. Testes de Integração

**Arquivo: `tests/integration/affiliate-network-view-sync.test.ts`**

| Linha | Código | Status |
|-------|--------|--------|
| 58 | `.from('affiliate_network_view')` | ✅ **USA VIEW CORRETA** |
| 118 | `.from('affiliate_network_view')` | ✅ **USA VIEW CORRETA** |
| 151 | `.from('affiliate_network_view')` | ✅ **USA VIEW CORRETA** |
| 170 | `.from('affiliate_network_view')` | ✅ **USA VIEW CORRETA** |
| 234 | `.from('affiliate_network_view')` | ✅ **USA VIEW CORRETA** |

**Arquivo: `tests/integration/affiliate-commission-flow.test.ts`**

| Linha | Código | Status |
|-------|--------|--------|
| 454 | Comentário sobre `affiliate_network` deprecada | ⚠️ Documentação |

---

### 6. DOCUMENTAÇÃO

#### 6.1. Documentos que Mencionam Tabelas Obsoletas

| Arquivo | Menção | Contexto |
|---------|--------|----------|
| `RELATORIO_AUDITORIA_2026-01-10.md` | `affiliate_network` | Auditoria de dados |
| `SOLICITACAO_AUDITORIA_TECNICA.md` | `affiliate_network` | Solicitação de auditoria |
| `backups/deprecated-scripts/README.md` | `affiliate_network`, `affiliate_hierarchy` | Documentação de transição |
| `.kiro/specs/network-visualization-fix/` | `affiliate_hierarchy` | Specs de correção |
| `.kiro/specs/correcao-critica-sistema-afiliados/` | `calculate_commission_split` | Specs de correção |
| `docs/ARCHITECTURE_DECISIONS.md` | `calculate_commission_split` | Decisões de arquitetura |
| `docs/auditorias/AUDITORIA_PAGAMENTOS_AFILIADOS.md` | `calculate_commission_split` | Auditoria de pagamentos |

---

## 🎯 RESUMO DE REFERÊNCIAS POR TIPO

### CRÍTICAS (Código em Produção)

| Tipo | Quantidade | Status |
|------|-----------|--------|
| Função SQL | 1 | 🔴 `calculate_commission_split` usa `affiliate_network` |
| Políticas RLS | 5 | 🔴 Aplicadas à tabela `affiliate_network` |
| Serviços Frontend | 4 | 🔴 Usam view `affiliate_hierarchy` |
| Páginas React | 1 | 🔴 Usa view `affiliate_hierarchy` |
| Edge Functions | 1 | 🔴 Chama função SQL problemática |

### NÃO CRÍTICAS (Documentação/Comentários)

| Tipo | Quantidade | Status |
|------|-----------|--------|
| Migrations (criação) | 2 | ⚠️ Criam estruturas obsoletas |
| Migrations (uso) | 3 | ⚠️ Modificam estruturas obsoletas |
| Comentários em código | 3 | ⚠️ Documentação desatualizada |
| Documentação | 7 | ⚠️ Mencionam estruturas obsoletas |
| Testes | 2 | ✅ Usam view correta (`affiliate_network_view`) |

---

## 🔍 ANÁLISE DETALHADA DOS PROBLEMAS

### PROBLEMA 1: Função SQL `calculate_commission_split`

**Localização:** Banco de dados (função SQL)  
**Severidade:** 🔴 **CRÍTICA**

**Código Problemático:**
```sql
-- Buscar N2 e N3 na árvore
SELECT 
  n2.affiliate_id,
  n3.affiliate_id
INTO v_n2_affiliate_id, v_n3_affiliate_id
FROM affiliate_network n1                          -- ❌ TABELA OBSOLETA
LEFT JOIN affiliate_network n2 ON n2.affiliate_id = n1.parent_id
LEFT JOIN affiliate_network n3 ON n3.affiliate_id = n2.parent_id
WHERE n1.affiliate_id = (
  SELECT id FROM affiliates WHERE user_id = v_n1_affiliate_id AND deleted_at IS NULL
);
```

**Deveria Ser:**
```sql
-- Opção 1: Usar affiliates.referred_by
SELECT 
  a2.id,
  a3.id
INTO v_n2_affiliate_id, v_n3_affiliate_id
FROM affiliates a1
LEFT JOIN affiliates a2 ON a2.id = a1.referred_by
LEFT JOIN affiliates a3 ON a3.id = a2.referred_by
WHERE a1.id = v_n1_affiliate_id
AND a1.deleted_at IS NULL;

-- Opção 2: Usar affiliate_network_view
SELECT 
  n2.id,
  n3.id
INTO v_n2_affiliate_id, v_n3_affiliate_id
FROM affiliate_network_view anv
WHERE anv.affiliate_id = v_n1_affiliate_id
AND anv.level = 1;
-- Depois buscar N2 e N3 via path
```

**IMPACTO:**
- Edge Function `calculate-commissions` chama esta função
- Webhook pode chamar esta função (se implementado)
- Cálculo de comissões pode estar incorreto se `affiliate_network` não estiver sincronizada

---

### PROBLEMA 2: Políticas RLS na Tabela `affiliate_network`

**Localização:** Banco de dados (RLS)  
**Severidade:** 🟡 **MÉDIA**

**Políticas Ativas:**
1. `Admins can modify network`
2. `Admins can view all network`
3. `Affiliates can view own ancestors` (usa `affiliate_network_view` na query)
4. `Affiliates can view own network tree` (usa `affiliate_network_view` na query)
5. `Affiliates can view their referrals`

**OBSERVAÇÃO:** Políticas 3 e 4 fazem referência à view correta dentro das queries, mas ainda estão aplicadas à tabela obsoleta.

**IMPACTO:**
- Se código tentar acessar `affiliate_network` diretamente, as políticas funcionarão
- Mas a tabela não deveria ser acessada diretamente
- Políticas deveriam estar na view `affiliate_network_view` (se possível)

---

### PROBLEMA 3: Frontend Usa View `affiliate_hierarchy`

**Localização:** Código TypeScript  
**Severidade:** 🔴 **CRÍTICA**

**Arquivos Afetados:**
1. `src/services/frontend/affiliate.service.ts` (2 ocorrências)
2. `src/services/affiliates/affiliate.service.ts` (2 ocorrências)
3. `src/pages/dashboard/afiliados/MinhaRede.tsx` (1 ocorrência)

**Código Problemático:**
```typescript
const { data: networkData } = await supabase
  .from('affiliate_hierarchy')  // ❌ VIEW OBSOLETA
  .select('*')
  .eq('root_id', affiliateId);
```

**Deveria Ser:**
```typescript
const { data: networkData } = await supabase
  .from('affiliate_network_view')  // ✅ VIEW CORRETA
  .select('*')
  .eq('root_id', affiliateId);
```

**IMPACTO:**
- Dashboard de afiliados pode mostrar dados incorretos
- Visualização de rede pode estar quebrada
- Performance pode ser afetada se view obsoleta não estiver atualizada

---

### PROBLEMA 4: Migrations Criam Estruturas Obsoletas

**Localização:** Arquivos de migration  
**Severidade:** 🟡 **MÉDIA**

**Migrations Problemáticas:**
1. `20250125000001_create_affiliate_network.sql` - Cria tabela `affiliate_network`
2. `20260111000001_consolidate_affiliate_structure.sql` - Cria view `affiliate_hierarchy`

**IMPACTO:**
- Migrations antigas criam estruturas que não deveriam existir
- Se banco for recriado do zero, estruturas obsoletas serão criadas
- Confusão sobre qual estrutura usar

---

## 📋 CHECKLIST DE CORREÇÕES NECESSÁRIAS

### BANCO DE DADOS

- [ ] **CRÍTICO:** Corrigir função `calculate_commission_split` para usar `affiliates.referred_by` ou `affiliate_network_view`
- [ ] **MÉDIO:** Remover ou desabilitar políticas RLS da tabela `affiliate_network`
- [ ] **MÉDIO:** Criar migration para deprecar tabela `affiliate_network`
- [ ] **MÉDIO:** Criar migration para deprecar view `affiliate_hierarchy`
- [ ] **BAIXO:** Atualizar função `refresh_affiliate_hierarchy` (se ainda existir)

### CÓDIGO FRONTEND

- [ ] **CRÍTICO:** Substituir `affiliate_hierarchy` por `affiliate_network_view` em:
  - `src/services/frontend/affiliate.service.ts` (2 locais)
  - `src/services/affiliates/affiliate.service.ts` (2 locais)
  - `src/pages/dashboard/afiliados/MinhaRede.tsx` (1 local)

### EDGE FUNCTIONS

- [ ] **CRÍTICO:** Verificar se Edge Function `calculate-commissions` funciona após correção da função SQL

### MIGRATIONS

- [ ] **MÉDIO:** Criar migration de deprecação:
  - Comentar que `affiliate_network` é obsoleta
  - Comentar que `affiliate_hierarchy` é obsoleta
  - Documentar que `affiliate_network_view` é a correta

### DOCUMENTAÇÃO

- [ ] **BAIXO:** Atualizar documentação para remover referências a estruturas obsoletas
- [ ] **BAIXO:** Atualizar specs para usar estruturas corretas
- [ ] **BAIXO:** Atualizar comentários em código

---

## 🎯 PRIORIZAÇÃO DE CORREÇÕES

### PRIORIDADE 1 (CRÍTICA - Fazer Imediatamente)

1. **Corrigir função SQL `calculate_commission_split`**
   - Impacto: Cálculo de comissões incorreto
   - Risco: Alto (afeta pagamentos)
   - Esforço: Médio (reescrever query SQL)

2. **Substituir `affiliate_hierarchy` por `affiliate_network_view` no frontend**
   - Impacto: Dashboard e visualização de rede
   - Risco: Alto (usuários veem dados incorretos)
   - Esforço: Baixo (buscar e substituir)

### PRIORIDADE 2 (MÉDIA - Fazer em Seguida)

3. **Remover políticas RLS da tabela `affiliate_network`**
   - Impacto: Segurança e consistência
   - Risco: Médio (acesso indevido)
   - Esforço: Baixo (DROP POLICY)

4. **Criar migration de deprecação**
   - Impacto: Documentação e clareza
   - Risco: Baixo (apenas documentação)
   - Esforço: Baixo (comentários SQL)

### PRIORIDADE 3 (BAIXA - Fazer Quando Possível)

5. **Atualizar documentação**
   - Impacto: Clareza para desenvolvedores
   - Risco: Baixo (apenas confusão)
   - Esforço: Médio (vários arquivos)

---

## 📊 ESTATÍSTICAS FINAIS

### REFERÊNCIAS ENCONTRADAS

| Categoria | Total | Críticas | Médias | Baixas |
|-----------|-------|----------|--------|--------|
| Banco de Dados | 6 | 1 | 5 | 0 |
| Código Frontend | 5 | 5 | 0 | 0 |
| Edge Functions | 1 | 1 | 0 | 0 |
| Migrations | 5 | 0 | 5 | 0 |
| Documentação | 7 | 0 | 0 | 7 |
| **TOTAL** | **24** | **7** | **10** | **7** |

### ARQUIVOS AFETADOS

- **Banco de Dados:** 1 função SQL, 5 políticas RLS
- **Código TypeScript:** 3 arquivos (5 ocorrências)
- **Edge Functions:** 1 arquivo
- **Migrations:** 5 arquivos
- **Documentação:** 7 arquivos

---

## 🔒 CONCLUSÃO

### SITUAÇÃO ATUAL:

1. ✅ **Tabela `affiliate_network` EXISTE no banco** (não deveria)
2. ✅ **View `affiliate_hierarchy` EXISTE no banco** (não deveria)
3. ✅ **View `affiliate_network_view` EXISTE no banco** (correta)
4. 🔴 **Função SQL usa tabela obsoleta** (crítico)
5. 🔴 **Frontend usa view obsoleta** (crítico)
6. 🔴 **Políticas RLS na tabela obsoleta** (médio)

### AÇÕES NECESSÁRIAS:

1. **IMEDIATO:** Corrigir função `calculate_commission_split`
2. **IMEDIATO:** Substituir `affiliate_hierarchy` por `affiliate_network_view` no frontend
3. **BREVE:** Remover políticas RLS da tabela `affiliate_network`
4. **BREVE:** Criar migration de deprecação
5. **FUTURO:** Atualizar documentação

### RISCO ATUAL:

🔴 **ALTO** - Sistema de comissões pode estar calculando valores incorretos devido ao uso de estruturas obsoletas.

---

**Relatório gerado em:** 10/01/2026  
**Próximo passo:** Aguardando autorização para implementar correções
