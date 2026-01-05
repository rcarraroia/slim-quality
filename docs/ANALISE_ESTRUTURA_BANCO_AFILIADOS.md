# Análise Completa: Estrutura do Banco de Dados - Módulo Afiliados

**Data:** 05/01/2026  
**Objetivo:** Entender a estrutura real antes de fazer alterações

---

## 🔍 PROBLEMA IDENTIFICADO

### Erro 1: `affiliate_network.parent_affiliate_id does not exist`
**Código esperava:** `parent_affiliate_id`  
**Banco tem:** `parent_id`

### Erro 2: Relacionamento entre `withdrawals` e `commissions` não encontrado
**Código tenta:** JOIN direto entre withdrawals e commissions  
**Realidade:** Não há FK direto entre essas tabelas

---

## 📊 ESTRUTURA REAL DAS TABELAS

### 1. **affiliate_network** (Rede Genealógica)

**Colunas:**
- `id` (uuid) - PK
- `affiliate_id` (uuid) - FK → affiliates(id)
- `parent_id` (uuid) - FK → affiliates(id) ⚠️ **NÃO É parent_affiliate_id**
- `level` (integer) - Nível na rede (1, 2, 3)
- `path` (text) - Caminho na árvore
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Foreign Keys:**
- `affiliate_network_affiliate_id_fkey` → affiliates(id) ON DELETE CASCADE
- `affiliate_network_parent_id_fkey` → affiliates(id) ON DELETE CASCADE

**Propósito:**
- Armazena a hierarquia de afiliados (quem indicou quem)
- `affiliate_id` = afiliado atual
- `parent_id` = quem indicou este afiliado
- `level` = profundidade na rede (1=direto, 2=segundo nível, 3=terceiro nível)

---

### 2. **commissions** (Comissões Individuais)

**Colunas:**
- `id` (uuid) - PK
- `order_id` (uuid) - FK → orders(id)
- `affiliate_id` (uuid) - FK → affiliates(id)
- `level` (integer) - Nível do afiliado (1, 2, 3)
- `percentage` (numeric) - Percentual da comissão
- `base_value_cents` (integer) - Valor base para cálculo
- `commission_value_cents` (integer) - Valor da comissão
- `original_percentage` (numeric) - Percentual original (antes de redistribuição)
- `redistribution_applied` (boolean) - Se houve redistribuição
- `status` (enum) - Status da comissão
- `asaas_split_id` (text) - ID do split no Asaas
- `paid_at` (timestamptz) - Quando foi paga
- `calculated_by` (uuid) - FK → auth.users(id)
- `calculation_details` (jsonb) - Detalhes do cálculo
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Foreign Keys:**
- `commissions_order_id_fkey` → orders(id) ON DELETE CASCADE
- `commissions_affiliate_id_fkey` → affiliates(id) ON DELETE CASCADE
- `commissions_calculated_by_fkey` → auth.users(id)

**Propósito:**
- Armazena cada comissão individual por afiliado
- Uma venda gera múltiplas comissões (N1, N2, N3, gestores)
- Cada linha = uma comissão para um afiliado específico

---

### 3. **commission_splits** (Split Completo da Venda)

**Colunas:**
- `id` (uuid) - PK
- `order_id` (uuid) - FK → orders(id)
- `total_order_value_cents` (integer)
- `factory_percentage` (numeric) - 70%
- `factory_value_cents` (integer)
- `commission_percentage` (numeric) - 30%
- `commission_value_cents` (integer)
- `n1_affiliate_id` (uuid)
- `n1_percentage` (numeric)
- `n1_value_cents` (integer)
- `n2_affiliate_id` (uuid)
- `n2_percentage` (numeric)
- `n2_value_cents` (integer)
- `n3_affiliate_id` (uuid)
- `n3_percentage` (numeric)
- `n3_value_cents` (integer)
- `renum_percentage` (numeric)
- `renum_value_cents` (integer)
- `jb_percentage` (numeric)
- `jb_value_cents` (integer)
- `redistribution_applied` (boolean)
- `redistribution_details` (jsonb)
- `status` (enum)
- `asaas_split_id` (text)
- `asaas_response` (jsonb)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Propósito:**
- Armazena o split COMPLETO de uma venda
- Uma linha por venda
- Contém todos os participantes do split (N1, N2, N3, gestores)
- Usado para auditoria e rastreamento

---

### 4. **withdrawals** (Solicitações de Saque)

**Colunas:**
- `id` (uuid) - PK
- `affiliate_id` (uuid) - FK → affiliates(id)
- `requested_amount_cents` (integer) - Valor solicitado
- `fee_amount_cents` (integer) - Taxa
- `net_amount_cents` (integer) - Valor líquido
- `status` (enum) - pending, approved, rejected, completed, failed
- `status_reason` (text) - Motivo (se rejeitado)
- `bank_code` (text)
- `bank_name` (text)
- `agency` (text)
- `account` (text)
- `account_type` (text)
- `account_holder_name` (text)
- `account_holder_document` (text)
- `asaas_transfer_id` (text)
- `asaas_transfer_response` (jsonb)
- `available_balance_before_cents` (integer)
- `available_balance_after_cents` (integer)
- `requested_at` (timestamptz)
- `processed_at` (timestamptz)
- `completed_at` (timestamptz)
- `requested_by` (uuid) - FK → auth.users(id)
- `approved_by` (uuid) - FK → auth.users(id)
- `rejected_by` (uuid) - FK → auth.users(id)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `deleted_at` (timestamptz)

**Foreign Keys:**
- `withdrawals_affiliate_id_fkey` → affiliates(id) ON DELETE CASCADE
- `withdrawals_requested_by_fkey` → auth.users(id)
- `withdrawals_approved_by_fkey` → auth.users(id)
- `withdrawals_rejected_by_fkey` → auth.users(id)

**Propósito:**
- Armazena solicitações de saque de afiliados
- **NÃO TEM FK DIRETO PARA COMMISSIONS**
- Relacionamento é indireto via `affiliate_id`

---

## 🔗 RELACIONAMENTOS

### Diagrama de Relacionamentos

```
affiliates (1) ←──── (N) affiliate_network
    ↑                      ↑
    │                      │
    │ (parent_id)          │ (affiliate_id)
    │                      │
    └──────────────────────┘

affiliates (1) ←──── (N) commissions ────→ (1) orders

affiliates (1) ←──── (N) withdrawals

orders (1) ←──── (1) commission_splits
```

### Relacionamento withdrawals ↔ commissions

**NÃO EXISTE FK DIRETO!**

O relacionamento é **INDIRETO** via `affiliate_id`:

```sql
-- Para buscar comissões de um withdrawal:
SELECT c.*
FROM commissions c
WHERE c.affiliate_id = (
  SELECT affiliate_id 
  FROM withdrawals 
  WHERE id = 'withdrawal_id'
)
AND c.status = 'paid';
```

**OU** via saldo disponível:
- Withdrawals usa o saldo acumulado do afiliado
- Saldo vem da soma de comissões pagas
- Mas não há ligação direta withdrawal → commission específica

---

## ❌ ERROS NO CÓDIGO ATUAL

### 1. Nome de Coluna Errado

**Código atual:**
```typescript
.select(`
  affiliate_id,
  parent_affiliate_id,  // ❌ ERRADO
  level,
  ...
`)
.or(`parent_affiliate_id.eq.${affiliateId}...`)  // ❌ ERRADO
```

**Deveria ser:**
```typescript
.select(`
  affiliate_id,
  parent_id,  // ✅ CORRETO
  level,
  ...
`)
.or(`parent_id.eq.${affiliateId}...`)  // ✅ CORRETO
```

### 2. JOIN Inexistente

**Código atual:**
```typescript
.select(`
  *,
  commission:commissions(...)  // ❌ ERRADO - Não há FK direto
`)
```

**Deveria ser:**
```typescript
// Opção 1: Buscar separadamente
const withdrawals = await supabase
  .from('withdrawals')
  .select('*')
  .eq('affiliate_id', affiliateId);

// Opção 2: Não tentar fazer JOIN
// Withdrawals não precisa de dados de commissions
```

---

## ✅ SOLUÇÃO CORRETA

### Opção 1: Adicionar Coluna `parent_affiliate_id` (RECOMENDADO)

**Vantagem:**
- Mantém compatibilidade com código existente
- Não quebra outras partes do sistema
- Mais claro semanticamente

**Migration:**
```sql
ALTER TABLE affiliate_network 
ADD COLUMN parent_affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE;

-- Copiar dados de parent_id
UPDATE affiliate_network 
SET parent_affiliate_id = parent_id;

-- Criar índice
CREATE INDEX idx_affiliate_network_parent_affiliate_id 
ON affiliate_network(parent_affiliate_id);
```

### Opção 2: Atualizar TODO o Código (NÃO RECOMENDADO)

**Desvantagem:**
- Precisa atualizar múltiplos arquivos
- Risco de quebrar outras funcionalidades
- Mais trabalhoso e propenso a erros

---

## 🎯 RECOMENDAÇÃO FINAL

### Para `affiliate_network`:
✅ **ADICIONAR coluna `parent_affiliate_id`** como alias de `parent_id`

**Motivo:**
- Solução mais simples e segura
- Não quebra código existente
- Semanticamente mais claro
- Fácil de reverter se necessário

### Para `withdrawals` ↔ `commissions`:
✅ **REMOVER tentativa de JOIN**

**Motivo:**
- Relacionamento não existe no banco
- Withdrawals não precisa de dados de commissions
- Buscar separadamente se necessário

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Criar migration para adicionar `parent_affiliate_id`
2. ✅ Atualizar código para não fazer JOIN withdrawals→commissions
3. ✅ Testar funcionalidades afetadas
4. ✅ Validar que nada quebrou

---

**Análise realizada por:** Kiro AI  
**Data:** 05/01/2026  
**Status:** Aguardando aprovação para implementar solução
