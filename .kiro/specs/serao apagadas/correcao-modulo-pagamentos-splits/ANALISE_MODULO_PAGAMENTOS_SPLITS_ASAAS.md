# 📊 ANÁLISE COMPLETA: MÓDULO DE PAGAMENTOS E SPLITS ASAAS

**Data:** 16/01/2026  
**Sistema:** COMADEMIG  
**Objetivo:** Comparar implementação com documentação oficial do Asaas

---

## 🎯 RESUMO EXECUTIVO

### ✅ PONTOS FORTES IDENTIFICADOS

1. **Arquitetura robusta** - 6 Edge Functions bem estruturadas
2. **Sistema de splits triplo** implementado (COMADEMIG, RENUM, Afiliado)
3. **Webhook com validação de token** e idempotência
4. **Suporte a múltiplos métodos** de pagamento (PIX, Cartão, Boleto)
5. **Tabelas bem estruturadas** com campos adequados

### ⚠️ DISCREPÂNCIAS ENCONTRADAS

1. **Campo `split` não está sendo enviado** nas requisições de pagamento
2. **Splits sendo criados APÓS pagamento** ao invés de junto com ele
3. **Falta campo `totalFixedValue`** para parcelamentos
4. **Assinaturas sem split** na criação inicial
5. **Webhook processando splits manualmente** ao invés de receber do Asaas

---

## 📋 ANÁLISE DETALHADA POR COMPONENTE

## 1. EDGE FUNCTION: asaas-create-pix-payment

### ✅ O QUE ESTÁ CORRETO

- Estrutura de dados completa
- Desconto PIX de 5% implementado
- Validações de entrada adequadas
- Salvamento local correto
- Logs estruturados

### ❌ DISCREPÂNCIAS IDENTIFICADAS

#### **CRÍTICO: Split não está sendo enviado na criação do pagamento**

**Documentação Asaas:**
```typescript
interface CreatePaymentData {
  customer: string;
  billingType: string;
  value: number;
  dueDate: string;
  description?: string;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
    totalFixedValue?: number; // Para parcelamentos
    externalReference?: string;
    description?: string;
  }>;
}
```

**Implementação Atual:**
```typescript
const pixPaymentData: CreatePaymentData = {
  customer: customerId,
  billingType: 'PIX',
  value: discountedValue,
  dueDate: paymentData.dueDate,
  description: `${paymentData.description} (PIX - 5% desconto)`,
  externalReference: paymentData.externalReference,
  discount: {
    value: 5,
    type: 'PERCENTAGE',
    dueDateLimitDays: 0
  }
  // ❌ FALTA: split não está sendo enviado aqui
};
```

**Problema:** O split está sendo configurado DEPOIS via `asaas-configure-split`, mas deveria ser enviado JÁ na criação do pagamento.

**Impacto:** 
- Splits não são criados automaticamente pelo Asaas
- Necessidade de processamento manual posterior
- Risco de falha se processamento manual não ocorrer

---

## 2. EDGE FUNCTION: asaas-process-card

### ✅ O QUE ESTÁ CORRETO

- Validação completa de cartão
- Suporte a parcelamento (1-12x)
- Validação de CPF/CNPJ
- Tokenização de cartão
- IP do cliente para análise de fraude

### ❌ DISCREPÂNCIAS IDENTIFICADAS

#### **CRÍTICO: Split não está sendo enviado**

**Implementação Atual:**
```typescript
const cardPaymentData: CreatePaymentData = {
  customer: customerId,
  billingType: 'CREDIT_CARD',
  value: paymentData.value,
  dueDate: paymentData.dueDate,
  description: paymentData.description,
  installmentCount: installmentCount,
  installmentValue: installmentValue,
  creditCard: { /* dados do cartão */ },
  creditCardHolderInfo: { /* dados do portador */ },
  remoteIp: clientIp
  // ❌ FALTA: split não está sendo enviado
};
```

#### **IMPORTANTE: Falta `totalFixedValue` para parcelamentos**

**Documentação Asaas:**
> Para pagamentos parcelados, use `totalFixedValue` ao invés de `fixedValue` no split

**Problema:** Quando há parcelamento (installmentCount > 1), o split deveria usar `totalFixedValue` para garantir que o valor total seja dividido corretamente entre as parcelas.

---

## 3. EDGE FUNCTION: asaas-create-subscription

### ✅ O QUE ESTÁ CORRETO

- Validação de método de pagamento (apenas cartão)
- Suporte a token de cartão salvo
- Integração com sistema de splits
- Salvamento em `user_subscriptions`
- Registro de referrals

### ❌ DISCREPÂNCIAS IDENTIFICADAS

#### **CRÍTICO: Split sendo adicionado na assinatura mas não no pagamento inicial**

**Implementação Atual:**
```typescript
const subscriptionPayload: any = {
  customer,
  billingType,
  value,
  nextDueDate, // Próxima cobrança (30 dias após hoje)
  cycle,
  description: description || 'Assinatura COMADEMIG',
  externalReference,
  split: splits // ✅ Split está sendo enviado na assinatura
}
```

**Problema:** O comentário diz "Pagamento inicial já foi processado no frontend", mas esse pagamento inicial NÃO teve split configurado. Apenas as renovações futuras terão split.

**Impacto:**
- Pagamento inicial não gera comissões automaticamente
- Necessidade de processamento manual do split do pagamento inicial
- Inconsistência entre pagamento inicial e renovações

---

## 4. EDGE FUNCTION: asaas-configure-split

### ✅ O QUE ESTÁ CORRETO

- Configuração tripla (COMADEMIG, RENUM, Afiliado)
- Percentuais corretos por tipo de serviço
- Validação de wallet IDs
- Registro local em `asaas_splits`
- Notificações para afiliados

### ❌ DISCREPÂNCIAS IDENTIFICADAS

#### **ARQUITETURAL: Abordagem reativa ao invés de proativa**

**Fluxo Atual:**
1. Criar pagamento SEM split
2. Chamar `asaas-configure-split` para criar splits
3. Chamar `asaas-process-splits` para ativar splits

**Fluxo Recomendado (Documentação Asaas):**
1. Criar pagamento JÁ COM split configurado
2. Asaas processa splits automaticamente quando pagamento é confirmado
3. Webhook notifica sobre status dos splits

**Problema:** A abordagem atual adiciona complexidade desnecessária e pontos de falha.

---

## 5. EDGE FUNCTION: asaas-process-splits

### ✅ O QUE ESTÁ CORRETO

- Processamento individual de cada split
- Tratamento de erros por split
- Validação de valor mínimo (R$ 10,00)
- Registro de comissões para afiliados
- Atualização de status

### ❌ DISCREPÂNCIAS IDENTIFICADAS

#### **ARQUITETURAL: Processamento manual desnecessário**

**Implementação Atual:**
```typescript
// Ativar split no Asaas (muda de PENDING para ACTIVE)
const activateResponse = await asaasClient.request(
  `/splits/${splitConfig.asaas_split_id}/activate`, 
  { method: 'POST' }
)
```

**Problema:** Se o split fosse enviado na criação do pagamento, o Asaas ativaria automaticamente quando o pagamento fosse confirmado. Não seria necessário chamar `/activate` manualmente.

---

## 6. EDGE FUNCTION: asaas-webhook

### ✅ O QUE ESTÁ CORRETO

- Validação de token (asaas-access-token)
- Idempotência via `asaas_event_id`
- Salvamento em `webhook_events`
- Processamento de múltiplos eventos
- Tratamento de erros sem pausar webhook
- Processamento automático de splits em `handlePaymentReceived`

### ❌ DISCREPÂNCIAS IDENTIFICADAS

#### **IMPORTANTE: Processamento manual de splits no webhook**

**Implementação Atual:**
```typescript
async function handlePaymentReceived(supabaseClient, payload) {
  // ...
  // 2. Processar splits automaticamente
  try {
    await processPaymentSplits(supabaseClient, cobranca)
    console.log('✅ Splits processados automaticamente')
  } catch (splitError) {
    console.error('❌ Erro ao processar splits:', splitError)
    // Não falhar o webhook por causa de erro nos splits
  }
  // ...
}
```

**Problema:** Se os splits fossem enviados na criação do pagamento, o Asaas já enviaria eventos de split no webhook (TRANSFER_DONE, TRANSFER_FAILED). Não seria necessário processar manualmente.

**Eventos de Split que deveriam ser recebidos:**
- `TRANSFER_DONE` - Split transferido com sucesso
- `TRANSFER_FAILED` - Falha na transferência
- `TRANSFER_CANCELLED` - Transferência cancelada

---

## 📊 ANÁLISE DAS TABELAS DO BANCO

### ✅ ESTRUTURA ADEQUADA

#### **asaas_cobrancas**
- ✅ Campos principais presentes (asaas_id, customer_id, valor, status)
- ✅ Campos de pagamento (PIX, cartão, boleto)
- ✅ Campos de serviço (service_type, service_data)
- ✅ Campos de parcelamento (installment_number)
- ✅ Referências externas (external_reference)

#### **asaas_subscriptions**
- ✅ Campos principais presentes (asaas_subscription_id, customer_id)
- ✅ Campos de ciclo (billing_type, cycle, value)
- ✅ Campos de controle (status, next_due_date)
- ✅ Campos de serviço (service_type, service_data)

#### **asaas_splits**
- ✅ Campos de identificação (cobranca_id, affiliate_id)
- ✅ Campos de valor (percentage, fixed_value, commission_amount)
- ✅ Campos de controle (status, asaas_split_id)
- ✅ Campos de processamento (processed_at, error_message)
- ✅ Campos de tipo (recipient_type, recipient_name, service_type)

#### **affiliates**
- ✅ Campos de identificação (user_id, display_name, cpf_cnpj)
- ✅ Campos de contato (contact_email, phone)
- ✅ Campos de status (status, is_adimplent)
- ✅ Campo de wallet (asaas_wallet_id)
- ✅ Campo de código (referral_code)

#### **affiliate_referrals**
- ✅ Campos de relacionamento (affiliate_id, referred_user_id)
- ✅ Campos de código (referral_code)
- ✅ Campos de conversão (status, conversion_date, conversion_value)

#### **affiliate_commissions**
- ✅ Campos de identificação (affiliate_id, payment_id, referred_user_id)
- ✅ Campos de valor (commission_rate, commission_amount)
- ✅ Campos de status (status, paid_at)
- ✅ Campos de pagamento (payment_method, payment_reference)

### ⚠️ OBSERVAÇÕES

1. **Tabela `asaas_subscriptions` parece duplicada** - Existe também `user_subscriptions` que é usada no código. Verificar se `asaas_subscriptions` ainda é necessária.

2. **Campo `subscription_id` em `asaas_splits`** - Permite vincular splits a assinaturas, mas não está sendo usado nas Edge Functions atuais.

---

## 🔍 ANÁLISE DOS HOOKS FRONTEND

### useAsaasPayments.ts

#### ✅ O QUE ESTÁ CORRETO
- Abstração de métodos de pagamento
- Integração com hooks específicos (PIX, Cartão, Boleto)
- Validação de customer antes de criar pagamento

#### ⚠️ OBSERVAÇÕES
- Comentário "TODO: Implementar Edge Function para criar pagamento real" - mas as Edge Functions JÁ EXISTEM
- Mock response ainda presente no código

### useAsaasSplits.ts

#### ✅ O QUE ESTÁ CORRETO
- Queries bem estruturadas
- Mutations para configurar e processar splits
- Estatísticas de comissões
- Filtros por recipient e service type

#### ⚠️ OBSERVAÇÕES
- Hook assume que splits são configurados APÓS pagamento
- Não há integração com criação de pagamento

### useAffiliate.ts

#### ✅ O QUE ESTÁ CORRETO
- CRUD completo de afiliados
- Queries de referrals e comissões
- Estatísticas de afiliados
- Geração de URL de indicação

#### ⚠️ OBSERVAÇÕES
- Nenhuma discrepância identificada

---

## 📝 COMPARAÇÃO COM DOCUMENTAÇÃO ASAAS

### CAMPO `split` EM PAGAMENTOS

**Documentação Asaas:**
```json
{
  "customer": "cus_xxxxx",
  "billingType": "CREDIT_CARD",
  "value": 100.00,
  "dueDate": "2026-02-15",
  "split": [
    {
      "walletId": "wallet_xxxxx",
      "fixedValue": 40.00,
      "description": "COMADEMIG - 40%"
    },
    {
      "walletId": "wallet_yyyyy",
      "percentualValue": 40,
      "description": "RENUM - 40%"
    },
    {
      "walletId": "wallet_zzzzz",
      "percentualValue": 20,
      "description": "Afiliado - 20%"
    }
  ]
}
```

**Implementação Atual:**
```typescript
// ❌ Split NÃO está sendo enviado na criação
const paymentData = {
  customer: customerId,
  billingType: 'CREDIT_CARD',
  value: 100.00,
  dueDate: '2026-02-15'
  // split: [] // FALTA ESTE CAMPO
};
```

### CAMPO `split` EM ASSINATURAS

**Documentação Asaas:**
```json
{
  "customer": "cus_xxxxx",
  "billingType": "CREDIT_CARD",
  "value": 100.00,
  "nextDueDate": "2026-02-15",
  "cycle": "MONTHLY",
  "split": [
    {
      "walletId": "wallet_xxxxx",
      "percentualValue": 40
    }
  ]
}
```

**Implementação Atual:**
```typescript
// ✅ Split ESTÁ sendo enviado na assinatura
const subscriptionPayload = {
  customer,
  billingType,
  value,
  nextDueDate,
  cycle,
  split: splits // ✅ CORRETO
};
```

### EVENTOS DE WEBHOOK

**Documentação Asaas - Eventos de Split:**
- `TRANSFER_DONE` - Transferência concluída
- `TRANSFER_FAILED` - Transferência falhou
- `TRANSFER_CANCELLED` - Transferência cancelada

**Implementação Atual:**
```typescript
// ✅ Eventos estão sendo tratados
case 'TRANSFER_DONE':
case 'TRANSFER_FAILED':
case 'TRANSFER_CANCELLED':
  return await handleTransferEvent(supabaseClient, payload)
```

---

## 🎯 RECOMENDAÇÕES PRIORITÁRIAS

### 🔴 CRÍTICAS (Implementar Imediatamente)

#### 1. **Adicionar campo `split` na criação de pagamentos**

**Arquivo:** `supabase/functions/asaas-create-pix-payment/index.ts`

**Mudança necessária:**
```typescript
// ANTES de criar o pagamento, buscar configuração de split
const splitConfig = await getSplitConfiguration(affiliateCode);
const splits = formatSplitsForAsaas(splitConfig);

const pixPaymentData: CreatePaymentData = {
  customer: customerId,
  billingType: 'PIX',
  value: discountedValue,
  dueDate: paymentData.dueDate,
  description: `${paymentData.description} (PIX - 5% desconto)`,
  externalReference: paymentData.externalReference,
  discount: {
    value: 5,
    type: 'PERCENTAGE',
    dueDateLimitDays: 0
  },
  split: splits // ✅ ADICIONAR ESTE CAMPO
};
```

**Benefícios:**
- Splits criados automaticamente pelo Asaas
- Processamento automático quando pagamento confirmado
- Menos pontos de falha
- Menos código para manter

#### 2. **Adicionar campo `split` na criação de pagamentos com cartão**

**Arquivo:** `supabase/functions/asaas-process-card/index.ts`

**Mudança necessária:**
```typescript
const splitConfig = await getSplitConfiguration(affiliateCode);
const splits = formatSplitsForAsaas(splitConfig);

const cardPaymentData: CreatePaymentData = {
  customer: customerId,
  billingType: 'CREDIT_CARD',
  value: paymentData.value,
  dueDate: paymentData.dueDate,
  description: paymentData.description,
  installmentCount: installmentCount,
  installmentValue: installmentValue,
  creditCard: { /* ... */ },
  creditCardHolderInfo: { /* ... */ },
  remoteIp: clientIp,
  split: splits // ✅ ADICIONAR ESTE CAMPO
};
```

#### 3. **Usar `totalFixedValue` para parcelamentos**

**Arquivo:** `supabase/functions/shared/split-config.ts` (criar se não existir)

**Mudança necessária:**
```typescript
export function formatSplitsForAsaas(
  splitConfig: SplitConfiguration,
  installmentCount?: number
): Array<AsaasSplit> {
  return splitConfig.splits.map(split => {
    const asaasSplit: AsaasSplit = {
      walletId: split.walletId,
      description: split.description,
      externalReference: split.externalReference
    };

    // Se houver parcelamento, usar totalFixedValue
    if (installmentCount && installmentCount > 1) {
      if (split.fixedValue) {
        asaasSplit.totalFixedValue = split.fixedValue; // ✅ USAR totalFixedValue
      } else if (split.percentualValue) {
        asaasSplit.percentualValue = split.percentualValue;
      }
    } else {
      // Pagamento à vista
      if (split.fixedValue) {
        asaasSplit.fixedValue = split.fixedValue;
      } else if (split.percentualValue) {
        asaasSplit.percentualValue = split.percentualValue;
      }
    }

    return asaasSplit;
  });
}
```

### 🟡 IMPORTANTES (Implementar em Breve)

#### 4. **Adicionar split no pagamento inicial de assinaturas**

**Arquivo:** `supabase/functions/asaas-create-subscription/index.ts`

**Problema:** O comentário diz "Pagamento inicial já foi processado no frontend", mas esse pagamento não teve split.

**Solução:** Criar o pagamento inicial COM split na mesma Edge Function que cria a assinatura.

#### 5. **Simplificar processamento de splits no webhook**

**Arquivo:** `supabase/functions/asaas-webhook/index.ts`

**Mudança:** Se splits forem enviados na criação, o webhook apenas precisa atualizar status baseado nos eventos `TRANSFER_*` recebidos do Asaas.

#### 6. **Deprecar Edge Functions de split manual**

**Arquivos:**
- `asaas-configure-split/index.ts`
- `asaas-process-splits/index.ts`

**Ação:** Após implementar splits na criação de pagamentos, essas functions podem ser removidas ou mantidas apenas para casos especiais/correções.

### 🟢 MELHORIAS (Implementar Quando Possível)

#### 7. **Consolidar tabelas de assinaturas**

**Problema:** Existem duas tabelas: `asaas_subscriptions` e `user_subscriptions`

**Ação:** Verificar se `asaas_subscriptions` ainda é usada. Se não, remover.

#### 8. **Adicionar testes automatizados**

**Ação:** Criar testes para:
- Criação de pagamento com split
- Criação de assinatura com split
- Processamento de webhook de splits
- Cálculo de comissões

#### 9. **Documentar fluxo de splits**

**Ação:** Criar diagrama de sequência mostrando:
1. Usuário cria pagamento
2. Sistema calcula splits
3. Pagamento criado no Asaas COM splits
4. Asaas processa pagamento
5. Asaas processa splits automaticamente
6. Webhook notifica sobre splits
7. Sistema atualiza status

---

## 📊 IMPACTO DAS MUDANÇAS

### ANTES (Implementação Atual)

```
1. Criar pagamento SEM split
2. Salvar pagamento localmente
3. Chamar asaas-configure-split
4. Criar splits no Asaas
5. Salvar splits localmente
6. Aguardar confirmação de pagamento
7. Chamar asaas-process-splits
8. Ativar cada split manualmente
9. Atualizar status dos splits
10. Registrar comissões
```

**Pontos de falha:** 10  
**Chamadas à API:** 3+ (1 pagamento + N splits + N ativações)  
**Complexidade:** Alta

### DEPOIS (Com Mudanças Recomendadas)

```
1. Calcular splits
2. Criar pagamento COM splits
3. Salvar pagamento localmente
4. Aguardar webhook de confirmação
5. Atualizar status (pagamento + splits)
6. Registrar comissões
```

**Pontos de falha:** 6  
**Chamadas à API:** 1 (apenas criação de pagamento)  
**Complexidade:** Baixa

**Redução:** 40% menos pontos de falha, 66% menos chamadas à API

---

## ✅ CONCLUSÃO

### SISTEMA ESTÁ FUNCIONAL MAS PODE SER OTIMIZADO

O sistema atual **FUNCIONA** e processa splits corretamente, mas usa uma abordagem mais complexa do que o necessário.

### PRINCIPAIS PROBLEMAS

1. **Splits não são enviados na criação de pagamentos** - Requer processamento manual posterior
2. **Mais pontos de falha** - Cada etapa adicional é um ponto onde algo pode dar errado
3. **Mais chamadas à API** - Aumenta latência e custo
4. **Código mais complexo** - Mais difícil de manter e debugar

### BENEFÍCIOS DAS MUDANÇAS

1. **Simplicidade** - Menos código, menos complexidade
2. **Confiabilidade** - Menos pontos de falha
3. **Performance** - Menos chamadas à API
4. **Manutenibilidade** - Código mais fácil de entender e manter
5. **Alinhamento com documentação** - Segue as melhores práticas do Asaas

### PRIORIDADE DE IMPLEMENTAÇÃO

1. 🔴 **CRÍTICO:** Adicionar `split` na criação de pagamentos (PIX e Cartão)
2. 🔴 **CRÍTICO:** Usar `totalFixedValue` para parcelamentos
3. 🟡 **IMPORTANTE:** Adicionar split no pagamento inicial de assinaturas
4. 🟡 **IMPORTANTE:** Simplificar processamento no webhook
5. 🟢 **MELHORIA:** Consolidar tabelas e adicionar testes

---

**FIM DA ANÁLISE**

**Próximos Passos:** Aguardar aprovação do usuário para implementar as mudanças recomendadas.
