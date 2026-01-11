# 🐛 BUGS CRÍTICOS ENCONTRADOS - SLIM QUALITY

**Data:** 2026-01-11
**Auditoria:** Completa do Sistema

---

## 🚨 BUGS CRÍTICOS (P0 - Urgente)

### BUG #1: Function SQL Desatualizada - Usa Tabela Depreciada

**Severidade:** 🔴 CRÍTICA
**Arquivo:** `supabase/migrations/20250125000003_create_commissions_tables.sql`
**Linha:** 263
**Status:** ❌ NÃO CORRIGIDO

#### Descrição

A function `calculate_commission_split()` usa a tabela `affiliate_network` para buscar hierarquia de afiliados (N2, N3), mas essa tabela foi depreciada no commit `f12eca3` (refactor: Fase 4 - Limpeza completa de affiliate_network).

#### Código Problemático

```sql
-- Linha 261-267
SELECT
  n2.affiliate_id,
  n3.affiliate_id
INTO v_n2_affiliate_id, v_n3_affiliate_id
FROM affiliate_network n1
LEFT JOIN affiliate_network n2 ON n2.affiliate_id = n1.parent_id
LEFT JOIN affiliate_network n3 ON n3.affiliate_id = n2.parent_id
WHERE n1.affiliate_id = (...);
```

#### Impacto

- ❌ Cálculo de comissões FALHA se tabela não existir
- ❌ N2 e N3 nunca são encontrados → sempre NULL
- ❌ Redistribuição SEMPRE ativa (incorretamente)
- ❌ Gestores recebem mais que deveriam
- ❌ Afiliados N2/N3 NÃO recebem comissões

**Resultado:** Sistema de comissões multinível NÃO FUNCIONA

#### Reprodução

```sql
-- 1. Criar afiliado N1 com hierarquia
-- 2. Executar SELECT calculate_commission_split('[order_id]');
-- 3. Resultado: Erro ou N2/N3 = NULL
```

#### Solução

**Migration:** `20260111000001_fix_calculate_commission_split.sql`

```sql
CREATE OR REPLACE FUNCTION calculate_commission_split(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_n1_affiliate_id UUID;
  v_n2_affiliate_id UUID;
  v_n3_affiliate_id UUID;
  -- ... outras variáveis ...
BEGIN
  -- Buscar N1 do pedido
  SELECT affiliate_n1_id INTO v_n1_affiliate_id
  FROM orders
  WHERE id = p_order_id;

  -- ✅ NOVO: Buscar hierarquia via affiliates.referred_by
  IF v_n1_affiliate_id IS NOT NULL THEN
    -- Buscar afiliado N1
    SELECT id, referred_by INTO v_n1_id, v_n2_affiliate_id
    FROM affiliates
    WHERE user_id = v_n1_affiliate_id
    AND deleted_at IS NULL;

    -- Buscar N2 (pai de N1)
    IF v_n2_affiliate_id IS NOT NULL THEN
      SELECT id, referred_by INTO v_n2_id, v_n3_affiliate_id
      FROM affiliates
      WHERE id = v_n2_affiliate_id
      AND deleted_at IS NULL;
    END IF;

    -- Buscar N3 (avô de N1)
    IF v_n3_affiliate_id IS NOT NULL THEN
      SELECT id INTO v_n3_id
      FROM affiliates
      WHERE id = v_n3_affiliate_id
      AND deleted_at IS NULL;
    END IF;
  END IF;

  -- ... resto do código ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Prazo

**🔴 URGENTE:** 24 horas

---

### BUG #2: Integração Asaas Ausente - Splits Não São Criados na API

**Severidade:** 🔴 CRÍTICA
**Arquivo:** `src/services/affiliates/commission-calculator.service.ts`
**Linha:** 316-356
**Status:** ❌ NÃO IMPLEMENTADO

#### Descrição

O método `saveCommissionSplit()` calcula e salva splits corretamente no banco de dados local, MAS NÃO envia os splits para a API do Asaas. Isso significa que os pagamentos não são divididos de fato.

#### Fluxo Atual (Incompleto)

```
Pedido criado
  ↓
calculateCommissions() ✅ Funciona
  ↓
saveCommissions() ✅ Salva em commissions
  ↓
saveCommissionSplit() ✅ Salva em commission_splits
  ↓
❌ NÃO CHAMA API ASAAS ❌
  ↓
Split fica com status 'pending' para sempre
```

#### Código Atual (Incompleto)

```typescript
// Linha 316-356
private async saveCommissionSplit(result: CommissionResult): Promise<void> {
  const split = {
    order_id: result.orderId,
    total_order_value_cents: result.orderValue,
    factory_percentage: 0.70,
    // ... todos os campos ...
    status: 'pending'
  };

  const { error } = await supabase
    .from('commission_splits')
    .insert(split);

  // ❌ PROBLEMA: Para aqui!
  // ❌ Não há chamada para API Asaas
  // ❌ Split nunca é enviado
  // ❌ Afiliados nunca recebem
}
```

#### Impacto

- ❌ **Afiliados NÃO recebem comissões**
- ❌ Pagamentos não são divididos no Asaas
- ❌ Sistema funciona "no papel" mas não na prática
- ❌ Toda a lógica de comissões é inútil sem isso

**Resultado:** Sistema COMPLETO mas NÃO FUNCIONAL

#### Solução Completa

**1. Criar Cliente Asaas:**

```typescript
// src/services/asaas/asaas-client.ts
export class AsaasClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    const env = import.meta.env.ASAAS_ENVIRONMENT || 'sandbox';
    this.baseUrl = env === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';
    this.apiKey = import.meta.env.ASAAS_API_KEY!;

    if (!this.apiKey) {
      throw new Error('ASAAS_API_KEY not configured');
    }
  }

  async createSplit(paymentId: string, splits: AsaasSplitInput[]): Promise<AsaasSplitResponse> {
    const response = await fetch(`${this.baseUrl}/payments/${paymentId}/splits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
      body: JSON.stringify({ splits }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Asaas API error: ${error.errors?.[0]?.description || response.statusText}`);
    }

    return await response.json();
  }

  async validateWallet(walletId: string): Promise<AsaasWalletValidation> {
    const response = await fetch(`${this.baseUrl}/wallets/${walletId}`, {
      method: 'GET',
      headers: {
        'access_token': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Wallet validation failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const asaasClient = new AsaasClient();
```

**2. Criar Serviço de Split:**

```typescript
// src/services/asaas/split.service.ts
import { asaasClient } from './asaas-client';
import { supabase } from '@/config/supabase';

export class AsaasSplitService {
  async createAsaasSplit(orderId: string, splitData: CommissionSplit): Promise<string> {
    // 1. Buscar payment_id do pedido
    const { data: order } = await supabase
      .from('orders')
      .select('asaas_payment_id')
      .eq('id', orderId)
      .single();

    if (!order?.asaas_payment_id) {
      throw new Error('Order does not have Asaas payment ID');
    }

    // 2. Montar array de splits para Asaas
    const splits: AsaasSplitInput[] = [];

    // N1
    if (splitData.n1_affiliate_id && splitData.n1_value_cents > 0) {
      const { data: n1 } = await supabase
        .from('affiliates')
        .select('wallet_id')
        .eq('id', splitData.n1_affiliate_id)
        .single();

      splits.push({
        walletId: n1.wallet_id,
        fixedValue: splitData.n1_value_cents / 100, // Converter para reais
        percentualValue: null,
      });
    }

    // N2
    if (splitData.n2_affiliate_id && splitData.n2_value_cents > 0) {
      const { data: n2 } = await supabase
        .from('affiliates')
        .select('wallet_id')
        .eq('id', splitData.n2_affiliate_id)
        .single();

      splits.push({
        walletId: n2.wallet_id,
        fixedValue: splitData.n2_value_cents / 100,
        percentualValue: null,
      });
    }

    // N3
    if (splitData.n3_affiliate_id && splitData.n3_value_cents > 0) {
      const { data: n3 } = await supabase
        .from('affiliates')
        .select('wallet_id')
        .eq('id', splitData.n3_affiliate_id)
        .single();

      splits.push({
        walletId: n3.wallet_id,
        fixedValue: splitData.n3_value_cents / 100,
        percentualValue: null,
      });
    }

    // Renum
    const WALLET_RENUM = import.meta.env.VITE_ASAAS_WALLET_RENUM;
    splits.push({
      walletId: WALLET_RENUM,
      fixedValue: splitData.renum_value_cents / 100,
      percentualValue: null,
    });

    // JB
    const WALLET_JB = import.meta.env.VITE_ASAAS_WALLET_JB;
    splits.push({
      walletId: WALLET_JB,
      fixedValue: splitData.jb_value_cents / 100,
      percentualValue: null,
    });

    // 3. Enviar para Asaas
    const response = await asaasClient.createSplit(order.asaas_payment_id, splits);

    // 4. Log de sucesso
    await supabase.from('commission_logs').insert({
      order_id: orderId,
      operation_type: 'create_split',
      operation_details: { splits, asaasResponse: response },
      success: true,
    });

    return response.id;
  }
}

export const asaasSplitService = new AsaasSplitService();
```

**3. Atualizar CommissionCalculatorService:**

```typescript
// src/services/affiliates/commission-calculator.service.ts

import { asaasSplitService } from '../asaas/split.service';

private async saveCommissionSplit(result: CommissionResult): Promise<void> {
  const split = {
    order_id: result.orderId,
    // ... todos os campos ...
    status: 'pending'
  };

  // 1. Salvar no banco
  const { data, error } = await supabase
    .from('commission_splits')
    .insert(split)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao salvar split: ${error.message}`);
  }

  // ✅ 2. NOVO: Enviar para Asaas
  try {
    const asaasSplitId = await asaasSplitService.createAsaasSplit(result.orderId, split);

    // 3. Atualizar com ID do Asaas
    await supabase
      .from('commission_splits')
      .update({
        asaas_split_id: asaasSplitId,
        status: 'sent_to_asaas',
        asaas_response: { sent_at: new Date().toISOString() },
      })
      .eq('id', data.id);

    console.log('✅ Split criado no Asaas:', asaasSplitId);

  } catch (asaasError) {
    console.error('❌ Erro ao criar split no Asaas:', asaasError);

    // Log de erro
    await supabase.from('commission_logs').insert({
      order_id: result.orderId,
      operation_type: 'create_split',
      operation_details: { error: asaasError.message },
      success: false,
      error_message: asaasError.message,
    });

    // Manter status 'pending' para retry manual
    throw asaasError;
  }
}
```

#### Prazo

**🔴 URGENTE:** 48 horas

---

### BUG #3: Wallets dos Gestores Não Configuradas/Validadas

**Severidade:** 🔴 CRÍTICA
**Arquivo:** `src/services/checkout.service.ts`
**Linha:** 348-357
**Status:** ⚠️ VALIDAÇÃO SEM BLOQUEIO

#### Descrição

O código valida se as wallets dos gestores (Renum e JB) estão configuradas, mas apenas loga um erro no console. A operação continua mesmo com wallets inválidas.

#### Código Atual

```typescript
// Linha 348-357
const WALLET_RENUM = import.meta.env.VITE_ASAAS_WALLET_RENUM;
const WALLET_JB = import.meta.env.VITE_ASAAS_WALLET_JB;

if (!isValidWalletId(WALLET_RENUM)) {
  console.error('❌ VITE_ASAAS_WALLET_RENUM inválida ou não configurada');
  // ❌ NÃO FAZ NADA ALÉM DE LOGAR
}

if (!isValidWalletId(WALLET_JB)) {
  console.error('❌ VITE_ASAAS_WALLET_JB inválida ou não configurada');
  // ❌ NÃO FAZ NADA ALÉM DE LOGAR
}

// Código continua e pode criar splits inválidos
```

#### Impacto

- ⚠️ Sistema pode tentar criar splits com wallets `undefined`
- ⚠️ Criação de split no Asaas falhará silenciosamente
- ⚠️ Usuário não é notificado do problema
- ⚠️ Erro descoberto apenas em produção

#### Solução

```typescript
const WALLET_RENUM = import.meta.env.VITE_ASAAS_WALLET_RENUM;
const WALLET_JB = import.meta.env.VITE_ASAAS_WALLET_JB;

if (!isValidWalletId(WALLET_RENUM)) {
  throw new Error(
    'VITE_ASAAS_WALLET_RENUM inválida ou não configurada. ' +
    'Configure a wallet do gestor Renum no arquivo .env'
  );
}

if (!isValidWalletId(WALLET_JB)) {
  throw new Error(
    'VITE_ASAAS_WALLET_JB inválida ou não configurada. ' +
    'Configure a wallet do gestor JB no arquivo .env'
  );
}

// ✅ Agora só continua se wallets válidas
```

#### Configuração Necessária

**.env:**

```bash
# Obter wallet IDs reais do Asaas:
# 1. Acessar https://sandbox.asaas.com (ou production)
# 2. Ir em Configurações > Integrações > Wallet ID
# 3. Copiar IDs das contas de Renum e JB

VITE_ASAAS_WALLET_RENUM=wal_1234567890ABCDEFGHIJ
VITE_ASAAS_WALLET_JB=wal_0987654321ZYXWVUTSRQP
```

#### Prazo

**🔴 URGENTE:** 12 horas (configurar + validar)

---

## ⚠️ BUGS ALTA PRIORIDADE (P1)

### BUG #4: Afiliados Podem Ser Criados Sem Wallet Validada

**Severidade:** 🟠 ALTA
**Arquivo:** `supabase/migrations/20250125000000_create_affiliates_table.sql`
**Status:** ❌ SEM VALIDAÇÃO OBRIGATÓRIA

#### Descrição

A coluna `wallet_id` na tabela `affiliates` é nullable e não tem validação de formato ou existência no Asaas.

#### Schema Atual

```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY,
  wallet_id TEXT,  -- ❌ Nullable
  -- ... outras colunas ...
);

-- ❌ Sem constraint de formato
-- ❌ Sem FK para asaas_wallets
-- ❌ Sem validação obrigatória
```

#### Impacto

- ⚠️ Afiliado pode ser criado com wallet_id = NULL
- ⚠️ Afiliado pode ser criado com wallet_id = 'string-qualquer'
- ⚠️ Comissões serão calculadas mas não podem ser pagas
- ⚠️ Erro descoberto apenas ao tentar criar split

#### Solução

**Migration:** `20260111000002_fix_affiliates_wallet_required.sql`

```sql
-- 1. Atualizar afiliados existentes sem wallet (se houver)
-- Marcar como 'pending' para revisão manual
UPDATE affiliates
SET
  wallet_id = 'wal_PENDENTE_VALIDACAO',
  status = 'pending'
WHERE wallet_id IS NULL OR wallet_id = '' OR wallet_id !~ '^wal_[a-zA-Z0-9]{20}$';

-- 2. Tornar NOT NULL
ALTER TABLE affiliates
  ALTER COLUMN wallet_id SET NOT NULL;

-- 3. Adicionar constraint de formato
ALTER TABLE affiliates
  ADD CONSTRAINT wallet_id_format
  CHECK (wallet_id ~ '^wal_[a-zA-Z0-9]{20}$');

-- 4. Comentário
COMMENT ON COLUMN affiliates.wallet_id IS
  'Wallet ID do Asaas (formato: wal_XXXXXXXXXXXXXXXXXXXX). ' ||
  'OBRIGATÓRIO e deve ser validado via API antes de criar afiliado.';
```

**Service de Cadastro:**

```typescript
// src/services/affiliates/registration.service.ts

async function registerAffiliate(data: AffiliateRegistrationInput) {
  // 1. Validar formato
  if (!data.wallet_id.match(/^wal_[a-zA-Z0-9]{20}$/)) {
    throw new Error('Wallet ID inválida. Formato esperado: wal_XXXXXXXXXXXXXXXXXXXX');
  }

  // 2. Validar via API Asaas
  const walletValidation = await asaasClient.validateWallet(data.wallet_id);

  if (!walletValidation.isActive) {
    throw new Error(
      `Wallet ID inativa no Asaas. Status: ${walletValidation.status}`
    );
  }

  // 3. Cachear validação
  await supabase.from('asaas_wallets').insert({
    wallet_id: data.wallet_id,
    name: walletValidation.name,
    email: walletValidation.email,
    status: walletValidation.status,
    is_valid: true,
    last_validated_at: new Date(),
    cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  }).onConflict('wallet_id').merge();

  // 4. Criar afiliado
  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .insert({
      ...data,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  return affiliate;
}
```

#### Prazo

**🟠 IMPORTANTE:** 2 dias

---

### BUG #5: Tabela `asaas_wallets` Vazia - Sem Seed de Gestores

**Severidade:** 🟠 ALTA
**Arquivo:** `supabase/migrations/20250125000004_create_auxiliary_tables.sql`
**Status:** ⚠️ TABELA SEM DADOS INICIAIS

#### Descrição

A tabela `asaas_wallets` foi criada para cachear validações de Wallet IDs, mas não há migration de seed para inserir as wallets fixas dos gestores (Renum, JB) e da fábrica.

#### Impacto

- ⚠️ Validações de wallet sempre vão para API (sem cache)
- ⚠️ Performance degradada
- ⚠️ Custo desnecessário de chamadas API
- ⚠️ Wallets dos gestores não estão "registradas" no sistema

#### Solução

**Migration:** `20260111000003_seed_asaas_wallets_gestores.sql`

```sql
-- Seed de wallets fixas (gestores e fábrica)

-- ⚠️ SUBSTITUIR pelos wallet IDs REAIS antes de aplicar

INSERT INTO asaas_wallets (
  wallet_id,
  name,
  email,
  status,
  account_type,
  is_valid,
  last_validated_at,
  cache_expires_at
) VALUES
  (
    'wal_RENUM_SUBSTITUA_AQUI',
    'Renato (Renum) - Gestor',
    'renum@slimquality.com.br',
    'ACTIVE',
    'PERSON',
    true,
    NOW(),
    NOW() + INTERVAL '365 days'  -- Cache de 1 ano (wallets fixas)
  ),
  (
    'wal_JB_SUBSTITUA_AQUI',
    'JB - Gestor',
    'jb@slimquality.com.br',
    'ACTIVE',
    'PERSON',
    true,
    NOW(),
    NOW() + INTERVAL '365 days'
  ),
  (
    'wal_FABRICA_SUBSTITUA_AQUI',
    'Fábrica Slim Quality',
    'fabrica@slimquality.com.br',
    'ACTIVE',
    'COMPANY',
    true,
    NOW(),
    NOW() + INTERVAL '365 days'
  )
ON CONFLICT (wallet_id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  is_valid = EXCLUDED.is_valid,
  last_validated_at = NOW(),
  updated_at = NOW();

-- Comentário
COMMENT ON TABLE asaas_wallets IS
  'Cache de validações de Wallet IDs do Asaas. ' ||
  'Wallets dos gestores (Renum, JB) e fábrica devem estar sempre presentes.';
```

#### Checklist Antes de Aplicar

- [ ] Obter Wallet ID real do Renum no Asaas
- [ ] Obter Wallet ID real do JB no Asaas
- [ ] Obter Wallet ID real da Fábrica no Asaas
- [ ] Substituir placeholders na migration
- [ ] Validar emails corretos
- [ ] Aplicar migration

#### Prazo

**🟠 IMPORTANTE:** 1 dia

---

## 📋 RESUMO DE PRIORIDADES

| Bug | Severidade | Prazo | Status |
|-----|------------|-------|--------|
| #1: Function SQL desatualizada | 🔴 P0 | 24h | ❌ Não corrigido |
| #2: Integração Asaas ausente | 🔴 P0 | 48h | ❌ Não implementado |
| #3: Wallets gestores não validadas | 🔴 P0 | 12h | ⚠️ Validação sem bloqueio |
| #4: Afiliados sem wallet obrigatória | 🟠 P1 | 2 dias | ❌ Sem validação |
| #5: asaas_wallets vazia | 🟠 P1 | 1 dia | ⚠️ Tabela sem seed |

**TOTAL ESTIMADO:** 5-6 dias de trabalho (1 desenvolvedor)

---

## ✅ AÇÕES IMEDIATAS (Próximas 24h)

1. **Configurar wallets dos gestores no .env**
   - Obter Wallet IDs reais do Asaas
   - Configurar VITE_ASAAS_WALLET_RENUM
   - Configurar VITE_ASAAS_WALLET_JB

2. **Corrigir Bug #3 (validação sem bloqueio)**
   - Alterar console.error para throw new Error
   - Testar que sistema bloqueia sem wallets

3. **Corrigir Bug #1 (function SQL)**
   - Criar migration de correção
   - Testar com dados de exemplo

4. **Iniciar implementação Bug #2 (Asaas client)**
   - Criar AsaasClient básico
   - Testar validação de wallet

---

**FIM DO RELATÓRIO DE BUGS**
