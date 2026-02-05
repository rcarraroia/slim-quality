# Design Document - Correção Completa do Sistema de Afiliados

## Overview

Este documento detalha a arquitetura e estratégia de implementação para corrigir os 14 problemas identificados na auditoria técnica do sistema de afiliados Slim Quality.

**Objetivo:** Criar um sistema de afiliados confiável, consistente e auditável, com fonte única de verdade para dados genealógicos e cálculo correto de comissões.

**Abordagem:** Migração incremental com validação em cada etapa, priorizando correções críticas que desbloqueiam funcionalidades essenciais.

## Architecture

### Decisão Arquitetural Principal: Fonte Única de Verdade

**DECISÃO:** Usar `affiliates.referred_by` como fonte única de verdade para rede genealógica.

**Justificativa:**
- ✅ Estrutura mais simples (coluna única vs tabela separada)
- ✅ Menos pontos de falha (uma estrutura vs duas)
- ✅ Backend já usa esta estrutura
- ✅ Queries recursivas são nativas do PostgreSQL
- ✅ Mais fácil manter integridade referencial

**Alternativa Rejeitada:** Usar `affiliate_network` como fonte única
- ❌ Estrutura mais complexa
- ❌ Requer sincronização manual
- ❌ Difícil manter integridade
- ❌ Mais código para manter

### Arquitetura de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    FONTE ÚNICA DE VERDADE                    │
│                                                               │
│  affiliates                                                   │
│  ├─ id (UUID)                                                │
│  ├─ referred_by (UUID) ← FONTE AUTORITATIVA                 │
│  ├─ referral_code (TEXT)                                     │
│  ├─ wallet_id (TEXT formato wal_XXXXX)                      │
│  └─ ...                                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Alimenta
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    VIEW MATERIALIZADA                         │
│                                                               │
│  affiliate_network_view (READ-ONLY)                          │
│  ├─ affiliate_id                                             │
│  ├─ parent_id (derivado de referred_by)                     │
│  ├─ level (calculado)                                        │
│  ├─ path (calculado)                                         │
│  └─ Atualizada via TRIGGER                                   │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

```
1. CADASTRO DE AFILIADO
   ┌─────────────────┐
   │ Frontend        │
   │ - Valida dados  │
   │ - Salva em      │
   │   localStorage  │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Backend         │
   │ - Valida Wallet │
   │   com Asaas API │
   │ - Insere em     │
   │   affiliates    │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Trigger         │
   │ - Atualiza VIEW │
   │ - Loga auditoria│
   └─────────────────┘

2. VENDA COM REFERRAL CODE
   ┌─────────────────┐
   │ Checkout        │
   │ - Recebe código │
   │ - Busca afiliado│
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Pagamento OK    │
   │ - Webhook Asaas │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Calc Comissões  │
   │ - Busca ascend. │
   │ - Calcula split │
   │ - Envia Asaas   │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Registra        │
   │ - Comissões     │
   │ - Logs          │
   └─────────────────┘
```

## Components and Interfaces

### 1. Constantes de Configuração

**Arquivo:** `src/constants/storage-keys.ts`

```typescript
export const STORAGE_KEYS = {
  REFERRAL_CODE: 'slim_referral_code',
  USER_SESSION: 'slim_user_session',
  CART: 'slim_cart'
} as const;

export const WALLET_ID_PATTERN = /^wal_[a-zA-Z0-9]{20}$/;

export const COMMISSION_RATES = {
  SELLER: 0.15,      // 15% vendedor
  N1: 0.03,          // 3% ascendente nível 1
  N2: 0.02,          // 2% ascendente nível 2
  RENUM: 0.05,       // 5% gestor Renum
  JB: 0.05,          // 5% gestor JB
  TOTAL: 0.30        // 30% total
} as const;
```

### 2. Service de Validação de Wallet

**Arquivo:** `supabase/functions/validate-asaas-wallet/index.ts`

```typescript
interface WalletValidationRequest {
  walletId: string;
}

interface WalletValidationResponse {
  isValid: boolean;
  isActive: boolean;
  name?: string;
  error?: string;
}

async function validateWallet(
  walletId: string
): Promise<WalletValidationResponse> {
  // Validar formato
  if (!WALLET_ID_PATTERN.test(walletId)) {
    return {
      isValid: false,
      isActive: false,
      error: 'Formato inválido. Use: wal_XXXXX'
    };
  }

  // Chamar API Asaas
  const response = await fetch(
    `https://api.asaas.com/v3/wallets/${walletId}`,
    {
      headers: {
        access_token: Deno.env.get('ASAAS_API_KEY')!
      }
    }
  );

  if (!response.ok) {
    return {
      isValid: false,
      isActive: false,
      error: 'Wallet não encontrada na Asaas'
    };
  }

  const data = await response.json();

  return {
    isValid: true,
    isActive: data.status === 'ACTIVE',
    name: data.name
  };
}
```

### 3. Service de Cálculo de Comissões

**Arquivo:** `src/services/affiliates/commission-calculator.service.ts`

```typescript
interface CommissionCalculationInput {
  orderId: string;
  sellerId: string;  // Afiliado que vendeu
  totalAmount: number;
}

interface CommissionCalculationOutput {
  seller: { id: string; walletId: string; amount: number };
  n1?: { id: string; walletId: string; amount: number };
  n2?: { id: string; walletId: string; amount: number };
  renum: { walletId: string; amount: number };
  jb: { walletId: string; amount: number };
  total: number;
  redistributed: boolean;
}

async function calculateCommissions(
  input: CommissionCalculationInput
): Promise<CommissionCalculationOutput> {
  const { sellerId, totalAmount } = input;

  // Buscar ascendentes usando referred_by
  const seller = await getAffiliate(sellerId);
  const n1 = seller.referred_by 
    ? await getAffiliate(seller.referred_by) 
    : null;
  const n2 = n1?.referred_by 
    ? await getAffiliate(n1.referred_by) 
    : null;

  // Calcular valores base
  const sellerAmount = totalAmount * COMMISSION_RATES.SELLER;
  const n1Amount = n1 ? totalAmount * COMMISSION_RATES.N1 : 0;
  const n2Amount = n2 ? totalAmount * COMMISSION_RATES.N2 : 0;

  // Calcular redistribuição
  const unusedAmount = 
    (n1 ? 0 : COMMISSION_RATES.N1) + 
    (n2 ? 0 : COMMISSION_RATES.N2);
  
  const renumAmount = totalAmount * COMMISSION_RATES.RENUM + 
    (totalAmount * unusedAmount / 2);
  const jbAmount = totalAmount * COMMISSION_RATES.JB + 
    (totalAmount * unusedAmount / 2);

  return {
    seller: { 
      id: seller.id, 
      walletId: seller.wallet_id, 
      amount: sellerAmount 
    },
    n1: n1 ? { 
      id: n1.id, 
      walletId: n1.wallet_id, 
      amount: n1Amount 
    } : undefined,
    n2: n2 ? { 
      id: n2.id, 
      walletId: n2.wallet_id, 
      amount: n2Amount 
    } : undefined,
    renum: { 
      walletId: process.env.ASAAS_WALLET_RENUM!, 
      amount: renumAmount 
    },
    jb: { 
      walletId: process.env.ASAAS_WALLET_JB!, 
      amount: jbAmount 
    },
    total: sellerAmount + n1Amount + n2Amount + renumAmount + jbAmount,
    redistributed: unusedAmount > 0
  };
}
```

### 4. Frontend Service Atualizado

**Arquivo:** `src/services/affiliate.service.ts`

```typescript
// Usar constante para localStorage
import { STORAGE_KEYS } from '@/constants/storage-keys';

class AffiliateService {
  // Salvar código de referência
  saveReferralCode(code: string): void {
    localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, code);
  }

  // Recuperar código de referência
  getReferralCode(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
  }

  // Buscar rede usando referred_by (query recursiva)
  async getNetwork(affiliateId: string) {
    const { data, error } = await supabase.rpc('get_affiliate_network', {
      p_affiliate_id: affiliateId
    });

    if (error) throw error;
    return data;
  }

  // Validar wallet com API real
  async validateWallet(walletId: string) {
    const response = await fetch('/functions/v1/validate-asaas-wallet', {
      method: 'POST',
      body: JSON.stringify({ walletId })
    });

    return await response.json();
  }
}
```

## Data Models

### Tabela: affiliates (Fonte Única)

```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES affiliates(id), -- FONTE AUTORITATIVA
  wallet_id TEXT NOT NULL CHECK (wallet_id ~ '^wal_[a-zA-Z0-9]{20}$'),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Índices otimizados
CREATE INDEX idx_affiliates_referred_by ON affiliates(referred_by) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_affiliates_referral_code ON affiliates(referral_code) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_affiliates_user_id ON affiliates(user_id) 
  WHERE deleted_at IS NULL;
```

### VIEW: affiliate_network_view (Derivada)

```sql
CREATE MATERIALIZED VIEW affiliate_network_view AS
WITH RECURSIVE network AS (
  -- Nível 0: Todos os afiliados
  SELECT 
    id as affiliate_id,
    referred_by as parent_id,
    0 as level,
    ARRAY[id] as path
  FROM affiliates
  WHERE deleted_at IS NULL
  
  UNION ALL
  
  -- Níveis recursivos
  SELECT 
    a.id,
    a.referred_by,
    n.level + 1,
    n.path || a.id
  FROM affiliates a
  JOIN network n ON a.referred_by = n.affiliate_id
  WHERE a.deleted_at IS NULL
    AND n.level < 10  -- Limite de segurança
)
SELECT 
  affiliate_id,
  parent_id,
  level,
  path
FROM network;

-- Índice para performance
CREATE INDEX idx_affiliate_network_view_parent 
  ON affiliate_network_view(parent_id);

-- Trigger para atualizar VIEW
CREATE OR REPLACE FUNCTION refresh_affiliate_network_view()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY affiliate_network_view;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_affiliate_network
AFTER INSERT OR UPDATE OF referred_by OR DELETE ON affiliates
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_affiliate_network_view();
```

### Tabela: audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table_record 
  ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at 
  ON audit_logs(created_at DESC);
```

### Tabela: commission_calculation_logs

```sql
CREATE TABLE commission_calculation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  seller_id UUID REFERENCES affiliates(id),
  network_found JSONB NOT NULL, -- {seller, n1, n2}
  split_calculated JSONB NOT NULL, -- {seller_amount, n1_amount, ...}
  redistribution_applied BOOLEAN DEFAULT FALSE,
  asaas_response JSONB,
  success BOOLEAN NOT NULL,
  error TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commission_logs_order 
  ON commission_calculation_logs(order_id);
CREATE INDEX idx_commission_logs_seller 
  ON commission_calculation_logs(seller_id);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Fonte Única de Verdade

*For any* consulta de rede genealógica, o sistema deve usar APENAS `affiliates.referred_by` como fonte de dados, nunca `affiliate_network` diretamente.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Consistência de LocalStorage

*For any* operação de salvar ou ler código de referência, o sistema deve usar SEMPRE a chave `slim_referral_code`, nunca outras variações.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 3: Validação de Wallet ID

*For any* cadastro de afiliado, o sistema deve validar o Wallet ID com a API Asaas antes de permitir o cadastro, rejeitando wallets inválidas.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 4: Cálculo Correto de Comissões

*For any* venda com referral code, a soma das comissões calculadas deve ser EXATAMENTE 30% do valor da venda, com redistribuição correta quando não há rede completa.

**Validates: Requirements 7.4**

### Property 5: Rastreamento de Indicações

*For any* usuário que clica em link de afiliado e se cadastra, o sistema deve associar corretamente o afiliado ao novo usuário através de `referred_by`.

**Validates: Requirements 3.3, 3.4, 7.1, 7.2**

### Property 6: Integridade Referencial

*For any* afiliado com `referred_by` preenchido, o ID referenciado deve existir na tabela `affiliates` e não estar deletado (soft delete).

**Validates: Requirements 5.3**

### Property 7: Logs de Auditoria Completos

*For any* operação financeira (cálculo de comissão, split), o sistema deve registrar log completo com timestamp, dados de entrada, saída e resultado.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 8: RLS Permite Visualização de Rede

*For any* afiliado autenticado, o sistema deve permitir SELECT de seus descendentes diretos (quem ele indicou) sem erro de permissão.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 9: Sincronização Automática

*For any* atualização em `affiliates.referred_by`, a VIEW `affiliate_network_view` deve ser atualizada automaticamente via trigger.

**Validates: Requirements 5.1, 5.2**

### Property 10: Formato Consistente de Wallet ID

*For any* Wallet ID armazenado no sistema, o formato deve ser `wal_XXXXX` (20 caracteres após o prefixo), nunca UUID.

**Validates: Requirements 14.1, 14.2, 14.5**

## Error Handling

### Estratégia de Tratamento de Erros

**1. Validação de Wallet ID:**
```typescript
try {
  const validation = await validateWallet(walletId);
  if (!validation.isValid) {
    throw new ValidationError('Wallet ID inválida');
  }
} catch (error) {
  if (error instanceof NetworkError) {
    // Permitir cadastro temporário, validar depois
    await createAffiliateWithPendingValidation(data);
  } else {
    throw error;
  }
}
```

**2. Cálculo de Comissões:**
```typescript
try {
  const commissions = await calculateCommissions(input);
  
  // Validar soma = 30%
  if (Math.abs(commissions.total - input.totalAmount * 0.30) > 0.01) {
    throw new CalculationError('Soma de comissões incorreta');
  }
  
  await sendToAsaas(commissions);
} catch (error) {
  await logCommissionError(input.orderId, error);
  await notifyAdmin(error);
  throw error;
}
```

**3. Sincronização de Dados:**
```typescript
try {
  await updateReferredBy(affiliateId, newReferredBy);
  await refreshMaterializedView();
} catch (error) {
  await rollbackTransaction();
  await logSyncError(affiliateId, error);
  throw error;
}
```

## Testing Strategy

### Dual Testing Approach

**Unit Tests:** Validar lógica específica de cada componente
- Validação de formato de Wallet ID
- Cálculo de comissões com diferentes cenários
- Redistribuição quando não há rede completa
- Parsing de referral code

**Property-Based Tests:** Validar propriedades universais
- Soma de comissões sempre = 30%
- LocalStorage sempre usa mesma chave
- Wallet ID sempre no formato correto
- Logs sempre registrados

### Property Test Configuration

**Framework:** fast-check (TypeScript)
**Iterations:** Mínimo 100 por teste
**Tag Format:** `Feature: correcao-critica-sistema-afiliados, Property {N}: {description}`

### Exemplo de Property Test

```typescript
import fc from 'fast-check';

describe('Commission Calculator', () => {
  it('Property 4: Soma de comissões = 30%', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 10000 }), // Valor da venda
        fc.boolean(), // Tem N1?
        fc.boolean(), // Tem N2?
        async (saleAmount, hasN1, hasN2) => {
          const result = await calculateCommissions({
            orderId: 'test',
            sellerId: 'seller-id',
            totalAmount: saleAmount,
            hasN1,
            hasN2
          });

          const total = result.seller.amount +
            (result.n1?.amount || 0) +
            (result.n2?.amount || 0) +
            result.renum.amount +
            result.jb.amount;

          const expected = saleAmount * 0.30;
          const diff = Math.abs(total - expected);

          expect(diff).toBeLessThan(0.01); // Tolerância de 1 centavo
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

---

**Design Document Completo**  
**Total de Properties:** 10  
**Total de Components:** 4  
**Próximo:** Criar tasks.md com plano de implementação
