# 💡 RECOMENDAÇÕES E PLANO DE AÇÃO - SLIM QUALITY

**Data:** 2026-01-11
**Auditoria:** Sistema Completo
**Objetivo:** Roadmap de correções e melhorias

---

## 🎯 VISÃO GERAL

### Status Atual
- ✅ Banco de dados: 95% completo
- ✅ Código de comissões: 90% implementado
- ❌ Integração Asaas: 30% incompleto
- ⚠️ Sistema funcional: NÃO (lacunas críticas)

### Objetivo
- ✅ Sistema 100% funcional em 2-3 semanas
- ✅ Integração Asaas completa
- ✅ Todos os bugs críticos corrigidos
- ✅ Testes validando funcionamento

---

## 🔴 FASE 1: CORREÇÕES CRÍTICAS (Semana 1)

### Prioridade: URGENTE | Prazo: 5-7 dias | Esforço: 20-25 horas

---

### 📌 AÇÃO 1.1: Configurar Wallets dos Gestores

**Responsável:** Gestor + Desenvolvedor
**Prazo:** 12 horas
**Esforço:** 1 hora
**Dependências:** Nenhuma

#### Checklist

- [ ] **Obter Wallet IDs reais do Asaas**
  ```bash
  # 1. Acessar Asaas (sandbox ou production)
  # 2. Ir em: Configurações > Integrações > Wallet ID
  # 3. Copiar Wallet ID da conta Renum
  # 4. Copiar Wallet ID da conta JB
  # 5. Copiar Wallet ID da conta Fábrica (se houver)
  ```

- [ ] **Configurar .env**
  ```bash
  # Backend
  ASAAS_WALLET_RENUM=wal_[20_caracteres_aqui]
  ASAAS_WALLET_JB=wal_[20_caracteres_aqui]

  # Frontend (Vite)
  VITE_ASAAS_WALLET_RENUM=wal_[20_caracteres_aqui]
  VITE_ASAAS_WALLET_JB=wal_[20_caracteres_aqui]
  ```

- [ ] **Validar formato**
  ```bash
  # Formato correto: wal_ + 20 caracteres alfanuméricos
  # Exemplo válido: wal_1a2b3c4d5e6f7g8h9i0j
  ```

- [ ] **Testar no código**
  ```typescript
  // src/services/checkout.service.ts deve passar sem erros
  const WALLET_RENUM = import.meta.env.VITE_ASAAS_WALLET_RENUM;
  if (!isValidWalletId(WALLET_RENUM)) {
    throw new Error(...); // ✅ Não deve mais logar erro
  }
  ```

#### Resultado Esperado
✅ Wallets configuradas e validadas
✅ Código não lança exceção ao inicializar

---

### 📌 AÇÃO 1.2: Corrigir Validação de Wallets (Bug #3)

**Responsável:** Desenvolvedor
**Prazo:** 24 horas
**Esforço:** 30 minutos
**Dependências:** Ação 1.1 (wallets configuradas)

#### Alteração

**Arquivo:** `src/services/checkout.service.ts` (linhas 348-357)

**DE:**
```typescript
if (!isValidWalletId(WALLET_RENUM)) {
  console.error('❌ VITE_ASAAS_WALLET_RENUM inválida ou não configurada');
}
```

**PARA:**
```typescript
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
```

#### Teste

```bash
# 1. Comentar wallets no .env
# 2. Iniciar aplicação
# 3. Verificar se LANÇA EXCEÇÃO (não apenas loga)
# 4. Descomentar wallets
# 5. Verificar se aplicação inicia normalmente
```

#### Resultado Esperado
✅ Sistema não inicia sem wallets configuradas
✅ Erro claro para o desenvolvedor

---

### 📌 AÇÃO 1.3: Corrigir Function `calculate_commission_split()` (Bug #1)

**Responsável:** Desenvolvedor Backend
**Prazo:** 48 horas
**Esforço:** 2 horas
**Dependências:** Nenhuma

#### Migration

**Criar arquivo:** `supabase/migrations/20260111000001_fix_calculate_commission_split.sql`

```sql
-- ============================================
-- FIX: Atualizar calculate_commission_split()
-- Substituir affiliate_network por affiliates.referred_by
-- ============================================

BEGIN;

CREATE OR REPLACE FUNCTION calculate_commission_split(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_split_id UUID;
  v_order_total_cents INTEGER;
  v_factory_value_cents INTEGER;
  v_commission_value_cents INTEGER;

  -- Afiliado N1 (user_id do pedido)
  v_n1_user_id UUID;
  v_n1_affiliate_id UUID;
  v_n1_affiliate RECORD;

  -- Afiliados N2 e N3
  v_n2_affiliate_id UUID;
  v_n3_affiliate_id UUID;

  -- Valores base das comissões
  v_n1_value_cents INTEGER := 0;
  v_n2_value_cents INTEGER := 0;
  v_n3_value_cents INTEGER := 0;

  -- Gestores (base 5% cada)
  v_renum_percentage DECIMAL(5,2) := 5.00;
  v_jb_percentage DECIMAL(5,2) := 5.00;
  v_renum_value_cents INTEGER;
  v_jb_value_cents INTEGER;

  -- Redistribuição
  v_available_percentage DECIMAL(5,2) := 0;
  v_redistribution_bonus DECIMAL(5,2) := 0;
  v_redistribution_applied BOOLEAN := false;
  v_redistribution_details JSONB;
BEGIN
  -- Buscar dados do pedido
  SELECT total_cents, affiliate_n1_id
  INTO v_order_total_cents, v_n1_user_id
  FROM orders
  WHERE id = p_order_id
  AND deleted_at IS NULL;

  IF v_order_total_cents IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Verificar se já existe split para este pedido
  IF EXISTS (SELECT 1 FROM commission_splits WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Commission split already exists for order: %', p_order_id;
  END IF;

  -- Calcular valores base (70% fábrica, 30% comissões)
  v_factory_value_cents := ROUND(v_order_total_cents * 0.70);
  v_commission_value_cents := v_order_total_cents - v_factory_value_cents;

  -- Se há afiliado N1, buscar hierarquia
  IF v_n1_user_id IS NOT NULL THEN
    -- ✅ NOVO: Buscar afiliado N1 via user_id
    SELECT id, referred_by
    INTO v_n1_affiliate_id, v_n2_affiliate_id
    FROM affiliates
    WHERE user_id = v_n1_user_id
    AND deleted_at IS NULL;

    IF v_n1_affiliate_id IS NOT NULL THEN
      -- Calcular comissão N1 (15%)
      v_n1_value_cents := ROUND(v_order_total_cents * 0.15);

      -- ✅ NOVO: Buscar N2 via referred_by
      IF v_n2_affiliate_id IS NOT NULL THEN
        SELECT id, referred_by
        INTO v_n2_affiliate_id, v_n3_affiliate_id
        FROM affiliates
        WHERE id = v_n2_affiliate_id
        AND deleted_at IS NULL;

        IF v_n2_affiliate_id IS NOT NULL THEN
          -- Calcular comissão N2 (3%)
          v_n2_value_cents := ROUND(v_order_total_cents * 0.03);
        ELSE
          v_available_percentage := v_available_percentage + 3.00;
        END IF;

        -- ✅ NOVO: Buscar N3 via referred_by de N2
        IF v_n3_affiliate_id IS NOT NULL THEN
          SELECT id
          INTO v_n3_affiliate_id
          FROM affiliates
          WHERE id = v_n3_affiliate_id
          AND deleted_at IS NULL;

          IF v_n3_affiliate_id IS NOT NULL THEN
            -- Calcular comissão N3 (2%)
            v_n3_value_cents := ROUND(v_order_total_cents * 0.02);
          ELSE
            v_available_percentage := v_available_percentage + 2.00;
          END IF;
        ELSE
          v_available_percentage := v_available_percentage + 2.00;
        END IF;
      ELSE
        -- N2 não existe, redistribuir 3% + 2%
        v_available_percentage := v_available_percentage + 5.00;
      END IF;
    END IF;
  ELSE
    -- Sem afiliado, toda comissão vai para redistribuição
    v_available_percentage := 20.00; -- 15% + 3% + 2%
  END IF;

  -- Aplicar redistribuição se necessário
  IF v_available_percentage > 0 THEN
    v_redistribution_applied := true;
    v_redistribution_bonus := v_available_percentage / 2; -- Dividir igualmente

    v_renum_percentage := v_renum_percentage + v_redistribution_bonus;
    v_jb_percentage := v_jb_percentage + v_redistribution_bonus;

    v_redistribution_details := jsonb_build_object(
      'available_percentage', v_available_percentage,
      'bonus_per_manager', v_redistribution_bonus,
      'reason', CASE
        WHEN v_n1_user_id IS NULL THEN 'no_affiliate'
        WHEN v_n2_affiliate_id IS NULL THEN 'only_n1'
        WHEN v_n3_affiliate_id IS NULL THEN 'n1_and_n2_only'
        ELSE 'unknown'
      END
    );
  END IF;

  -- Calcular valores finais dos gestores
  v_renum_value_cents := ROUND(v_order_total_cents * v_renum_percentage / 100);
  v_jb_value_cents := ROUND(v_order_total_cents * v_jb_percentage / 100);

  -- Criar registro de split
  INSERT INTO commission_splits (
    order_id,
    total_order_value_cents,
    factory_percentage,
    factory_value_cents,
    commission_percentage,
    commission_value_cents,
    n1_affiliate_id,
    n1_percentage,
    n1_value_cents,
    n2_affiliate_id,
    n2_percentage,
    n2_value_cents,
    n3_affiliate_id,
    n3_percentage,
    n3_value_cents,
    renum_percentage,
    renum_value_cents,
    jb_percentage,
    jb_value_cents,
    redistribution_applied,
    redistribution_details,
    status
  ) VALUES (
    p_order_id,
    v_order_total_cents,
    70.00,
    v_factory_value_cents,
    30.00,
    v_commission_value_cents,
    CASE WHEN v_n1_value_cents > 0 THEN v_n1_affiliate_id END,
    CASE WHEN v_n1_value_cents > 0 THEN 15.00 END,
    CASE WHEN v_n1_value_cents > 0 THEN v_n1_value_cents END,
    CASE WHEN v_n2_value_cents > 0 THEN v_n2_affiliate_id END,
    CASE WHEN v_n2_value_cents > 0 THEN 3.00 END,
    CASE WHEN v_n2_value_cents > 0 THEN v_n2_value_cents END,
    CASE WHEN v_n3_value_cents > 0 THEN v_n3_affiliate_id END,
    CASE WHEN v_n3_value_cents > 0 THEN 2.00 END,
    CASE WHEN v_n3_value_cents > 0 THEN v_n3_value_cents END,
    v_renum_percentage,
    v_renum_value_cents,
    v_jb_percentage,
    v_jb_value_cents,
    v_redistribution_applied,
    v_redistribution_details,
    'calculated'
  ) RETURNING id INTO v_split_id;

  RETURN v_split_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_commission_split IS
  'Calcula distribuição de comissões para um pedido. ' ||
  'Atualizado para usar affiliates.referred_by ao invés de affiliate_network.';

COMMIT;
```

#### Teste

```sql
-- 1. Criar afiliados de teste com hierarquia
INSERT INTO affiliates (id, user_id, name, referred_by, level)
VALUES
  ('uuid-n3', 'user-n3', 'Afiliado N3', NULL, 3),
  ('uuid-n2', 'user-n2', 'Afiliado N2', 'uuid-n3', 2),
  ('uuid-n1', 'user-n1', 'Afiliado N1', 'uuid-n2', 1);

-- 2. Criar pedido de teste
INSERT INTO orders (id, total_cents, affiliate_n1_id)
VALUES ('uuid-order', 10000, 'user-n1'); -- R$ 100,00

-- 3. Executar function
SELECT calculate_commission_split('uuid-order');

-- 4. Validar resultado
SELECT
  n1_affiliate_id, n1_value_cents, -- Deve ser 1500 (15%)
  n2_affiliate_id, n2_value_cents, -- Deve ser 300 (3%)
  n3_affiliate_id, n3_value_cents, -- Deve ser 200 (2%)
  renum_value_cents, -- Deve ser 500 (5%)
  jb_value_cents -- Deve ser 500 (5%)
FROM commission_splits
WHERE order_id = 'uuid-order';

-- 5. Validar soma = 100%
-- 1500 + 300 + 200 + 500 + 500 + 7000 (fábrica) = 10000 ✅
```

#### Resultado Esperado
✅ Function atualizada
✅ Hierarquia busca corretamente via referred_by
✅ Testes passam

---

### 📌 AÇÃO 1.4: Implementar Cliente Asaas (Bug #2 - Parte 1)

**Responsável:** Desenvolvedor Backend
**Prazo:** 3 dias
**Esforço:** 8 horas
**Dependências:** Ação 1.1 (ASAAS_API_KEY configurada)

#### Criar Arquivo: `src/services/asaas/asaas-client.ts`

```typescript
/**
 * Cliente HTTP para API Asaas
 * Documentação: https://docs.asaas.com
 */

export interface AsaasSplitInput {
  walletId: string;
  fixedValue?: number; // em reais (não centavos)
  percentualValue?: number;
}

export interface AsaasSplitResponse {
  id: string;
  status: string;
  splits: Array<{
    id: string;
    walletId: string;
    fixedValue: number;
    status: string;
  }>;
}

export interface AsaasWalletValidation {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  status: string; // ACTIVE, INACTIVE, etc
  accountType: string; // PERSON, COMPANY
}

export class AsaasClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    const env = import.meta.env.ASAAS_ENVIRONMENT || 'sandbox';
    this.baseUrl = env === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    this.apiKey = import.meta.env.ASAAS_API_KEY;

    if (!this.apiKey) {
      throw new Error('ASAAS_API_KEY not configured in environment variables');
    }

    console.log(`✅ Asaas Client initialized (${env})`);
  }

  /**
   * Valida uma Wallet ID
   */
  async validateWallet(walletId: string): Promise<AsaasWalletValidation> {
    try {
      const response = await fetch(`${this.baseUrl}/wallets/${walletId}`, {
        method: 'GET',
        headers: {
          'access_token': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Asaas wallet validation failed: ${error.errors?.[0]?.description || response.statusText}`
        );
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Error validating wallet:', error);
      throw error;
    }
  }

  /**
   * Cria split de pagamento
   */
  async createSplit(
    paymentId: string,
    splits: AsaasSplitInput[]
  ): Promise<AsaasSplitResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}/splits`, {
        method: 'POST',
        headers: {
          'access_token': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ splits }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Asaas split creation failed: ${error.errors?.[0]?.description || response.statusText}`
        );
      }

      const data = await response.json();
      console.log('✅ Split created in Asaas:', data.id);
      return data;

    } catch (error) {
      console.error('❌ Error creating split:', error);
      throw error;
    }
  }

  /**
   * Busca dados de um pagamento
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'access_token': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Asaas get payment failed: ${error.errors?.[0]?.description || response.statusText}`
        );
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Error getting payment:', error);
      throw error;
    }
  }
}

// Singleton
export const asaasClient = new AsaasClient();
```

#### Teste Unitário

```typescript
// src/services/asaas/asaas-client.test.ts
import { asaasClient } from './asaas-client';

describe('AsaasClient', () => {
  it('should validate a wallet ID', async () => {
    const walletId = 'wal_1234567890ABCDEFGHIJ'; // Sandbox test wallet

    const result = await asaasClient.validateWallet(walletId);

    expect(result.status).toBe('ACTIVE');
    expect(result.name).toBeDefined();
  });

  it('should throw error for invalid wallet', async () => {
    await expect(
      asaasClient.validateWallet('wal_INVALID')
    ).rejects.toThrow();
  });
});
```

#### Resultado Esperado
✅ Cliente Asaas funcional
✅ Validação de wallet funcionando
✅ Testes passando

---

### 📌 AÇÃO 1.5: Implementar Serviço de Split (Bug #2 - Parte 2)

**Responsável:** Desenvolvedor Backend
**Prazo:** 3 dias
**Esforço:** 6 horas
**Dependências:** Ação 1.4 (AsaasClient implementado)

#### Criar Arquivo: `src/services/asaas/split.service.ts`

```typescript
import { asaasClient } from './asaas-client';
import { supabase } from '@/config/supabase';

export interface CommissionSplit {
  order_id: string;
  total_order_value_cents: number;
  n1_affiliate_id?: string;
  n1_value_cents?: number;
  n2_affiliate_id?: string;
  n2_value_cents?: number;
  n3_affiliate_id?: string;
  n3_value_cents?: number;
  renum_value_cents: number;
  jb_value_cents: number;
}

export class AsaasSplitService {
  /**
   * Cria split de comissões no Asaas
   */
  async createAsaasSplit(orderId: string): Promise<string> {
    try {
      // 1. Buscar dados do split
      const { data: split, error: splitError } = await supabase
        .from('commission_splits')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (splitError || !split) {
        throw new Error(`Split not found for order: ${orderId}`);
      }

      // 2. Buscar payment_id do Asaas
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('asaas_payment_id')
        .eq('id', orderId)
        .single();

      if (orderError || !order?.asaas_payment_id) {
        throw new Error(`Order ${orderId} does not have Asaas payment ID`);
      }

      // 3. Montar array de splits
      const splits = [];

      // N1
      if (split.n1_affiliate_id && split.n1_value_cents > 0) {
        const wallet = await this.getAffiliateWallet(split.n1_affiliate_id);
        splits.push({
          walletId: wallet,
          fixedValue: split.n1_value_cents / 100, // Converter para reais
        });
      }

      // N2
      if (split.n2_affiliate_id && split.n2_value_cents > 0) {
        const wallet = await this.getAffiliateWallet(split.n2_affiliate_id);
        splits.push({
          walletId: wallet,
          fixedValue: split.n2_value_cents / 100,
        });
      }

      // N3
      if (split.n3_affiliate_id && split.n3_value_cents > 0) {
        const wallet = await this.getAffiliateWallet(split.n3_affiliate_id);
        splits.push({
          walletId: wallet,
          fixedValue: split.n3_value_cents / 100,
        });
      }

      // Renum
      const WALLET_RENUM = import.meta.env.VITE_ASAAS_WALLET_RENUM;
      splits.push({
        walletId: WALLET_RENUM,
        fixedValue: split.renum_value_cents / 100,
      });

      // JB
      const WALLET_JB = import.meta.env.VITE_ASAAS_WALLET_JB;
      splits.push({
        walletId: WALLET_JB,
        fixedValue: split.jb_value_cents / 100,
      });

      // 4. Enviar para Asaas
      const response = await asaasClient.createSplit(order.asaas_payment_id, splits);

      // 5. Atualizar split no banco
      await supabase
        .from('commission_splits')
        .update({
          asaas_split_id: response.id,
          status: 'sent_to_asaas',
          asaas_response: response,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);

      // 6. Log de sucesso
      await supabase.from('commission_logs').insert({
        order_id: orderId,
        operation_type: 'create_split',
        operation_details: { splits, asaasResponse: response },
        success: true,
      });

      console.log(`✅ Split criado no Asaas para order ${orderId}:`, response.id);
      return response.id;

    } catch (error) {
      // Log de erro
      await supabase.from('commission_logs').insert({
        order_id: orderId,
        operation_type: 'create_split',
        operation_details: { error: error.message },
        success: false,
        error_message: error.message,
      });

      console.error(`❌ Erro ao criar split no Asaas (order ${orderId}):`, error);
      throw error;
    }
  }

  /**
   * Busca wallet_id de um afiliado
   */
  private async getAffiliateWallet(affiliateId: string): Promise<string> {
    const { data, error } = await supabase
      .from('affiliates')
      .select('wallet_id')
      .eq('id', affiliateId)
      .single();

    if (error || !data?.wallet_id) {
      throw new Error(`Affiliate ${affiliateId} does not have wallet_id`);
    }

    return data.wallet_id;
  }
}

export const asaasSplitService = new AsaasSplitService();
```

#### Resultado Esperado
✅ Serviço de split implementado
✅ Splits são enviados para Asaas
✅ Status atualizado no banco

---

### 📌 AÇÃO 1.6: Integrar Split Service no CommissionCalculator (Bug #2 - Parte 3)

**Responsável:** Desenvolvedor Backend
**Prazo:** 4 dias
**Esforço:** 1 hora
**Dependências:** Ação 1.5 (AsaasSplitService implementado)

#### Alterar Arquivo: `src/services/affiliates/commission-calculator.service.ts`

**Linha 316 - Adicionar import:**

```typescript
import { asaasSplitService } from '../asaas/split.service';
```

**Linha 348 - Atualizar método `saveCommissionSplit`:**

```typescript
private async saveCommissionSplit(result: CommissionResult): Promise<void> {
  const split = {
    order_id: result.orderId,
    total_order_value_cents: result.orderValue,
    factory_percentage: 0.70,
    factory_value_cents: Math.round(result.orderValue * 0.70),
    commission_percentage: COMMISSION_RATES.TOTAL,
    commission_value_cents: result.totalCommission,

    n1_affiliate_id: result.n1.affiliateId,
    n1_percentage: result.n1.percentage,
    n1_value_cents: result.n1.value,

    n2_affiliate_id: result.n2.affiliateId,
    n2_percentage: result.n2.percentage,
    n2_value_cents: result.n2.value,

    n3_affiliate_id: result.n3.affiliateId,
    n3_percentage: result.n3.percentage,
    n3_value_cents: result.n3.value,

    renum_percentage: result.renum.percentage,
    renum_value_cents: result.renum.value,

    jb_percentage: result.jb.percentage,
    jb_value_cents: result.jb.value,

    redistribution_applied: result.redistributionApplied,
    redistribution_details: result.redistributionDetails || null,

    status: 'pending'
  };

  // 1. Salvar split no banco
  const { error } = await supabase
    .from('commission_splits')
    .insert(split);

  if (error) {
    throw new Error(`Erro ao salvar split: ${error.message}`);
  }

  // ✅ 2. NOVO: Enviar para Asaas
  try {
    const asaasSplitId = await asaasSplitService.createAsaasSplit(result.orderId);
    console.log('✅ Split criado no Asaas:', asaasSplitId);

  } catch (asaasError) {
    // Erro ao enviar para Asaas, mas split já está salvo localmente
    // Sistema pode tentar reenviar depois via retry job
    console.error('⚠️ Erro ao criar split no Asaas (split salvo localmente):', asaasError);

    // Não fazer throw para não quebrar o fluxo
    // Administrador pode reenviar manualmente ou via job de retry
  }
}
```

#### Resultado Esperado
✅ Splits são criados automaticamente no Asaas
✅ Status atualizado após sucesso
✅ Erros são logados mas não quebram fluxo

---

### 📌 AÇÃO 1.7: Implementar Webhook Asaas

**Responsável:** Desenvolvedor Backend
**Prazo:** 5 dias
**Esforço:** 4 horas
**Dependências:** Ação 1.6 (integração completa)

#### Criar Arquivo: `src/api/webhooks/asaas.ts`

```typescript
import { supabase } from '@/config/supabase';

export async function POST(request: Request) {
  try {
    // 1. Validar token do webhook
    const token = request.headers.get('asaas-access-token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!expectedToken) {
      throw new Error('ASAAS_WEBHOOK_TOKEN not configured');
    }

    if (token !== expectedToken) {
      console.warn('⚠️ Unauthorized webhook attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parsear payload
    const payload = await request.json();

    console.log('📥 Webhook recebido:', payload.event);

    // 3. Log do webhook
    await supabase.from('webhook_logs').insert({
      source: 'asaas',
      event_type: payload.event,
      payload,
      received_at: new Date(),
    });

    // 4. Processar evento
    switch (payload.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await handlePaymentConfirmed(payload.payment);
        break;

      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(payload.payment);
        break;

      default:
        console.log('ℹ️ Evento não tratado:', payload.event);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handlePaymentConfirmed(payment: any) {
  try {
    // 1. Buscar pedido pelo asaas_payment_id
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('asaas_payment_id', payment.id)
      .single();

    if (!order) {
      console.warn('⚠️ Pedido não encontrado para payment:', payment.id);
      return;
    }

    // 2. Atualizar status do pedido
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: payment.paymentDate || payment.confirmedDate,
        updated_at: new Date(),
      })
      .eq('id', order.id);

    // 3. Atualizar status do split
    await supabase
      .from('commission_splits')
      .update({
        status: 'paid',
        updated_at: new Date(),
      })
      .eq('order_id', order.id);

    // 4. Atualizar comissões individuais
    await supabase
      .from('commissions')
      .update({
        status: 'approved',
        paid_at: payment.paymentDate || payment.confirmedDate,
        updated_at: new Date(),
      })
      .eq('order_id', order.id);

    console.log('✅ Pedido marcado como pago:', order.id);

  } catch (error) {
    console.error('❌ Erro ao processar pagamento confirmado:', error);
    throw error;
  }
}

async function handlePaymentOverdue(payment: any) {
  // Marcar pedido como atrasado, enviar notificação, etc
  console.log('⚠️ Pagamento vencido:', payment.id);
}
```

#### Configurar no Asaas

1. Acessar Asaas Dashboard
2. Ir em: Integrações > Webhooks
3. Adicionar URL: `https://api.slimquality.com.br/api/webhooks/asaas`
4. Gerar token UUID v4
5. Configurar no .env: `ASAAS_WEBHOOK_TOKEN=uuid-gerado`
6. Selecionar eventos:
   - PAYMENT_CONFIRMED
   - PAYMENT_RECEIVED
   - PAYMENT_OVERDUE

#### Resultado Esperado
✅ Webhooks recebidos e processados
✅ Status de pedidos atualizado automaticamente
✅ Comissões marcadas como pagas

---

## 🟠 FASE 2: VALIDAÇÕES E SEGURANÇA (Semana 2)

### Prioridade: ALTA | Prazo: 5-7 dias | Esforço: 15-20 horas

---

### 📌 AÇÃO 2.1: Tornar wallet_id Obrigatório (Bug #4)

**Responsável:** Desenvolvedor Backend
**Prazo:** 2 semanas
**Esforço:** 2 horas

#### Migration

**Criar:** `supabase/migrations/20260111000002_fix_affiliates_wallet_required.sql`

```sql
BEGIN;

-- 1. Atualizar afiliados sem wallet (marcar como pendente)
UPDATE affiliates
SET
  wallet_id = 'wal_PENDENTE_VALIDACAO',
  status = 'pending'
WHERE wallet_id IS NULL
   OR wallet_id = ''
   OR wallet_id !~ '^wal_[a-zA-Z0-9]{20}$';

-- 2. Tornar NOT NULL
ALTER TABLE affiliates
  ALTER COLUMN wallet_id SET NOT NULL;

-- 3. Constraint de formato
ALTER TABLE affiliates
  ADD CONSTRAINT wallet_id_format
  CHECK (wallet_id ~ '^wal_[a-zA-Z0-9]{20}$');

-- Comentário
COMMENT ON COLUMN affiliates.wallet_id IS
  'Wallet ID do Asaas (formato: wal_XXXXXXXXXXXXXXXXXXXX). ' ||
  'OBRIGATÓRIO. Deve ser validado via API Asaas antes de ativar afiliado.';

COMMIT;
```

#### Resultado Esperado
✅ Afiliados devem ter wallet válida
✅ Constraint bloqueia valores inválidos

---

### 📌 AÇÃO 2.2: Seed de Wallets dos Gestores (Bug #5)

**Responsável:** Desenvolvedor Backend
**Prazo:** 2 semanas
**Esforço:** 1 hora

#### Migration

**Criar:** `supabase/migrations/20260111000003_seed_asaas_wallets_gestores.sql`

```sql
-- ⚠️ SUBSTITUIR wallet IDs ANTES de aplicar

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
    'wal_RENUM_SUBSTITUA',
    'Renato (Renum) - Gestor',
    'renum@slimquality.com.br',
    'ACTIVE',
    'PERSON',
    true,
    NOW(),
    NOW() + INTERVAL '365 days'
  ),
  (
    'wal_JB_SUBSTITUA',
    'JB - Gestor',
    'jb@slimquality.com.br',
    'ACTIVE',
    'PERSON',
    true,
    NOW(),
    NOW() + INTERVAL '365 days'
  )
ON CONFLICT (wallet_id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();
```

#### Resultado Esperado
✅ Wallets dos gestores em cache
✅ Validações mais rápidas

---

### 📌 AÇÃO 2.3: Validação de Wallet no Cadastro

**Responsável:** Desenvolvedor Backend
**Prazo:** 2 semanas
**Esforço:** 4 horas

#### Implementar Serviço de Registro

```typescript
// src/services/affiliates/registration.service.ts

import { asaasClient } from '../asaas/asaas-client';
import { supabase } from '@/config/supabase';

export async function registerAffiliate(data: {
  name: string;
  email: string;
  wallet_id: string;
  referred_by?: string;
}) {
  // 1. Validar formato
  if (!data.wallet_id.match(/^wal_[a-zA-Z0-9]{20}$/)) {
    throw new Error('Wallet ID inválida. Formato: wal_XXXXXXXXXXXXXXXXXXXX');
  }

  // 2. Validar via API Asaas
  const walletValidation = await asaasClient.validateWallet(data.wallet_id);

  if (walletValidation.status !== 'ACTIVE') {
    throw new Error(`Wallet inativa no Asaas. Status: ${walletValidation.status}`);
  }

  // 3. Cachear validação
  await supabase.from('asaas_wallets').upsert({
    wallet_id: data.wallet_id,
    name: walletValidation.name,
    email: walletValidation.email,
    status: walletValidation.status,
    is_valid: true,
    last_validated_at: new Date(),
    cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // 4. Criar afiliado
  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .insert({
      name: data.name,
      email: data.email,
      wallet_id: data.wallet_id,
      referred_by: data.referred_by,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  return affiliate;
}
```

#### Resultado Esperado
✅ Apenas wallets válidas aceitas
✅ Validação via API Asaas
✅ Cache atualizado

---

## 🟡 FASE 3: TESTES E PRODUÇÃO (Semana 3)

### 📌 AÇÃO 3.1: Testes End-to-End

**Responsável:** Desenvolvedor
**Prazo:** 3 semanas
**Esforço:** 6 horas

#### Cenários de Teste

1. **Venda com Afiliado N1**
   - [ ] Cliente acessa com ?ref=CODIGO
   - [ ] Adiciona produto ao carrinho
   - [ ] Finaliza compra
   - [ ] Comissão N1 calculada (15%)
   - [ ] Comissões gestores calculadas (5% cada + redistribuição)
   - [ ] Split criado no Asaas
   - [ ] Webhook confirma pagamento
   - [ ] Status atualizado para 'paid'

2. **Venda com Hierarquia Completa (N1 > N2 > N3)**
   - [ ] Comissões para 3 níveis
   - [ ] Gestores recebem 5% cada (sem redistribuição)
   - [ ] Total = 30%
   - [ ] Split criado com 5 beneficiários

3. **Venda sem Afiliado**
   - [ ] Apenas gestores recebem
   - [ ] Redistribuição total (20% / 2 = 10% cada)
   - [ ] Total gestores = 15% cada

---

### 📌 AÇÃO 3.2: Deploy em Produção

**Responsável:** Desenvolvedor + DevOps
**Prazo:** 3-4 semanas
**Esforço:** 3 horas

#### Checklist

- [ ] Migrar para Asaas Production
- [ ] Configurar wallets reais de produção
- [ ] Atualizar ASAAS_API_KEY (production)
- [ ] Configurar webhook URL production
- [ ] Testar com venda real (valor baixo)
- [ ] Monitorar logs por 48h
- [ ] Validar splits recebidos

---

## 📊 RESUMO DE TEMPO E ESFORÇO

| Fase | Prazo | Esforço | Prioridade |
|------|-------|---------|------------|
| Fase 1: Correções Críticas | 5-7 dias | 20-25h | 🔴 P0 |
| Fase 2: Validações | 5-7 dias | 15-20h | 🟠 P1 |
| Fase 3: Testes e Deploy | 3-5 dias | 10-15h | 🟡 P2 |
| **TOTAL** | **2-3 semanas** | **45-60h** | - |

**Com 1 desenvolvedor full-time:** 2 semanas
**Com 1 desenvolvedor part-time (50%):** 1 mês

---

## ✅ CHECKLIST DE CONCLUSÃO

### Fase 1: Crítico
- [ ] Wallets configuradas no .env
- [ ] Validação de wallets com throw
- [ ] Function SQL corrigida
- [ ] AsaasClient implementado
- [ ] AsaasSplitService implementado
- [ ] Integração no CommissionCalculator
- [ ] Webhook Asaas funcionando

### Fase 2: Importante
- [ ] wallet_id obrigatório
- [ ] Seed de wallets gestores
- [ ] Validação no cadastro de afiliado

### Fase 3: Produção
- [ ] Testes E2E passando
- [ ] Deploy em produção
- [ ] Primeira venda real confirmada
- [ ] Splits recebidos pelos afiliados

---

**FIM DO ROADMAP**
