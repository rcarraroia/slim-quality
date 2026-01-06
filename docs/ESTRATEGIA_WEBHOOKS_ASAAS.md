# Estratégia de Webhooks Asaas - Slim Quality

**Data:** 06/01/2026  
**Autor:** Kiro AI  
**Status:** Análise Completa e Recomendação  

---

## 📋 RESUMO EXECUTIVO

Após análise completa do código existente, identificamos que:
- ✅ **Webhook único já implementado** em `src/api/routes/webhooks/asaas-webhook.ts`
- ✅ **Estrutura funcional** com processamento de pagamentos e comissões
- ⚠️ **Eventos limitados** - apenas PAYMENT_RECEIVED e PAYMENT_CONFIRMED
- ⚠️ **Validação HMAC mockada** - precisa implementação real
- ❌ **Eventos de split não tratados** - oportunidade de melhoria

**Recomendação:** Manter webhook único e expandir eventos tratados.

---

## 🔍 MÓDULOS ANALISADOS

### 1. Webhook Handler Existente
**Arquivo:** `src/api/routes/webhooks/asaas-webhook.ts`

**Status:** ✅ Implementado e funcional

**Funcionalidades atuais:**
- Recebe eventos do Asaas via POST `/api/webhooks/asaas`
- Valida assinatura HMAC (em produção)
- Processa eventos de pagamento
- Atualiza status do pedido
- Dispara cálculo de comissões via `OrderAffiliateProcessor`
- Registra logs em `webhook_logs`

**Eventos tratados:**
- ✅ `PAYMENT_RECEIVED` - Pagamento recebido
- ✅ `PAYMENT_CONFIRMED` - Pagamento confirmado

**Eventos ignorados:**
- ❌ Todos os outros eventos (incluindo splits)

### 2. Serviço de Processamento de Pedidos
**Arquivo:** `src/services/sales/order-affiliate-processor.ts`

**Responsabilidades:**
- Associar pedido ao afiliado
- Registrar conversão
- Calcular comissões
- Processar pedidos via webhook

**Integração:** ✅ Já integrado com webhook handler

### 3. Calculadora de Comissões
**Arquivo:** `src/services/affiliates/commission-calculator.service.ts`

**Responsabilidades:**
- Calcular comissões multinível (N1, N2, N3)
- Aplicar redistribuição para gestores
- Validar integridade (soma = 100%)
- Salvar logs de auditoria

**Integração:** ✅ Chamado automaticamente pelo processador

### 4. Serviço Asaas
**Arquivo:** `src/services/asaas.service.ts`

**Funcionalidades:**
- Criar/atualizar customers
- Criar cobranças
- Criar splits
- Buscar pagamentos
- ⚠️ Validar webhooks (mockado)

**Problema identificado:**
```typescript
validateWebhook(payload: any, signature: string): boolean {
  // TODO: Implementar validação real da assinatura
  // Por enquanto, aceitar todos os webhooks em desenvolvimento
  return true;
}
```

### 5. Tabelas do Banco
**Arquivos:** `supabase/migrations/*.sql`

**Tabelas relacionadas a webhooks:**
- ✅ `webhook_logs` - Logs gerais de webhooks
- ✅ `asaas_webhook_logs` - Logs específicos do Asaas
- ✅ `asaas_transactions` - Transações do Asaas
- ✅ `asaas_splits` - Splits de pagamento
- ✅ `commissions` - Comissões calculadas
- ✅ `commission_splits` - Detalhes dos splits de comissão

---

## 📊 EVENTOS NECESSÁRIOS

### Categoria 1: Pagamentos (✅ Implementados)

#### `PAYMENT_RECEIVED`
- **Quando:** Pagamento recebido (PIX, boleto pago)
- **Ação atual:** Atualiza status do pedido + calcula comissões
- **Status:** ✅ Implementado

#### `PAYMENT_CONFIRMED`
- **Quando:** Pagamento confirmado (cartão aprovado)
- **Ação atual:** Atualiza status do pedido + calcula comissões
- **Status:** ✅ Implementado

#### `PAYMENT_OVERDUE` (❌ Não implementado)
- **Quando:** Pagamento vencido
- **Ação necessária:** 
  - Atualizar status do pedido para "overdue"
  - Notificar cliente
  - Pausar processamento de comissões
- **Prioridade:** 🟡 Média

#### `PAYMENT_DELETED` (❌ Não implementado)
- **Quando:** Pagamento cancelado/deletado
- **Ação necessária:**
  - Atualizar status do pedido para "cancelled"
  - Reverter comissões (se já calculadas)
  - Notificar afiliados
- **Prioridade:** 🔴 Alta

#### `PAYMENT_REFUNDED` (❌ Não implementado)
- **Quando:** Pagamento estornado
- **Ação necessária:**
  - Atualizar status do pedido para "refunded"
  - Reverter comissões
  - Ajustar saldos dos afiliados
- **Prioridade:** 🔴 Alta

### Categoria 2: Splits (❌ Não implementados)

#### `PAYMENT_SPLIT_CREATED` (❌ Não implementado)
- **Quando:** Split criado com sucesso
- **Ação necessária:**
  - Registrar split em `asaas_splits`
  - Atualizar status das comissões para "split_created"
  - Log de auditoria
- **Prioridade:** 🟡 Média

#### `PAYMENT_SPLIT_CONFIRMED` (❌ Não implementado)
- **Quando:** Split confirmado e valores depositados
- **Ação necessária:**
  - Atualizar status das comissões para "paid"
  - Notificar afiliados sobre recebimento
  - Atualizar métricas
- **Prioridade:** 🔴 Alta

#### `PAYMENT_SPLIT_FAILED` (❌ Não implementado)
- **Quando:** Falha ao processar split
- **Ação necessária:**
  - Marcar comissões como "split_failed"
  - Alertar administrador
  - Tentar reprocessar automaticamente
- **Prioridade:** 🔴 Alta

### Categoria 3: Afiliados (⚠️ Processamento indireto)

**Eventos de afiliados não vêm diretamente do Asaas**, mas são disparados internamente quando:

#### Cálculo de Comissões
- **Trigger:** Pagamento confirmado
- **Ação atual:** `OrderAffiliateProcessor.processOrderFromWebhook()`
- **Status:** ✅ Implementado

#### Atualização de Saldos
- **Trigger:** Split confirmado
- **Ação necessária:** Atualizar saldo disponível do afiliado
- **Status:** ❌ Não implementado

---

## 🎯 ESTRATÉGIA RECOMENDADA

### Opção Escolhida: **WEBHOOK ÚNICO EXPANDIDO**

**Justificativa técnica:**

1. **Simplicidade de manutenção**
   - Um único endpoint para gerenciar
   - Lógica centralizada de validação HMAC
   - Logs unificados

2. **Roteamento interno eficiente**
   - Switch/case por `event.type`
   - Handlers específicos por categoria
   - Fácil adicionar novos eventos

3. **Segurança**
   - Validação HMAC única
   - Rate limiting centralizado
   - Auditoria unificada

4. **Escalabilidade**
   - Fácil adicionar processamento assíncrono
   - Queue system pode ser adicionado depois
   - Retry logic centralizado

5. **Já existe e funciona**
   - Não reinventar a roda
   - Apenas expandir funcionalidades
   - Menos risco de quebrar o existente

### Alternativa Descartada: Webhooks Separados

**Por que não:**
- ❌ Mais complexo de manter
- ❌ Validação HMAC duplicada
- ❌ Logs fragmentados
- ❌ Mais endpoints para gerenciar
- ❌ Maior superfície de ataque

---

## 🏗️ ESTRUTURA PROPOSTA

### Arquitetura Atual (Simplificada)
```
POST /api/webhooks/asaas
  ↓
[Validar HMAC]
  ↓
[Verificar evento]
  ↓
if PAYMENT_RECEIVED || PAYMENT_CONFIRMED:
  ↓
  [Buscar pedido]
  ↓
  [Atualizar status]
  ↓
  [Processar afiliados]
  ↓
  [Calcular comissões]
  ↓
  [Log webhook]
else:
  [Ignorar evento]
```

### Arquitetura Proposta (Expandida)
```
POST /api/webhooks/asaas
  ↓
[Validar HMAC] ← CORRIGIR VALIDAÇÃO REAL
  ↓
[Log webhook recebido]
  ↓
[Roteador de eventos]
  ├─ PAYMENT_* → PaymentEventHandler
  │   ├─ RECEIVED → processPaymentReceived()
  │   ├─ CONFIRMED → processPaymentConfirmed()
  │   ├─ OVERDUE → processPaymentOverdue()
  │   ├─ DELETED → processPaymentDeleted()
  │   └─ REFUNDED → processPaymentRefunded()
  │
  ├─ PAYMENT_SPLIT_* → SplitEventHandler
  │   ├─ CREATED → processSplitCreated()
  │   ├─ CONFIRMED → processSplitConfirmed()
  │   └─ FAILED → processSplitFailed()
  │
  └─ OUTROS → logAndIgnore()
  ↓
[Log resultado]
  ↓
[Responder 200 OK]
```

### Código Proposto (Estrutura)

```typescript
// src/api/routes/webhooks/asaas-webhook.ts (REFATORADO)

import { Router } from 'express';
import { AsaasWebhookValidator } from '@/services/asaas/webhook-validator';
import { PaymentEventHandler } from '@/services/asaas/handlers/payment-event-handler';
import { SplitEventHandler } from '@/services/asaas/handlers/split-event-handler';
import { WebhookLogger } from '@/services/asaas/webhook-logger';

const router = Router();

/**
 * POST /api/webhooks/asaas
 * Webhook único para todos os eventos do Asaas
 */
router.post('/asaas', async (req, res) => {
  const logger = new WebhookLogger();
  
  try {
    // 1. Log webhook recebido
    const webhookId = await logger.logReceived(req.body);
    
    // 2. Validar assinatura HMAC
    const validator = new AsaasWebhookValidator();
    const isValid = await validator.validate(req.body, req.headers);
    
    if (!isValid) {
      await logger.logError(webhookId, 'invalid_signature');
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
    
    // 3. Rotear evento para handler apropriado
    const { event } = req.body;
    let result;
    
    if (event.startsWith('PAYMENT_SPLIT_')) {
      // Eventos de split
      const handler = new SplitEventHandler();
      result = await handler.handle(req.body);
      
    } else if (event.startsWith('PAYMENT_')) {
      // Eventos de pagamento
      const handler = new PaymentEventHandler();
      result = await handler.handle(req.body);
      
    } else {
      // Evento desconhecido - apenas logar
      await logger.logIgnored(webhookId, event);
      return res.json({ message: 'Evento ignorado', event });
    }
    
    // 4. Log resultado
    await logger.logSuccess(webhookId, result);
    
    // 5. Responder sucesso
    res.json({
      success: true,
      webhookId,
      event,
      result
    });
    
  } catch (error) {
    console.error('[AsaasWebhook] Erro:', error);
    await logger.logError(webhookId, error);
    
    // Sempre responder 200 para evitar retry do Asaas
    res.json({
      success: false,
      error: 'Erro interno - evento será reprocessado'
    });
  }
});

export default router;
```

### Handlers Propostos

#### 1. PaymentEventHandler
```typescript
// src/services/asaas/handlers/payment-event-handler.ts

export class PaymentEventHandler {
  async handle(webhookData: AsaasWebhookPayload) {
    const { event, payment } = webhookData;
    
    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        return await this.processPaymentConfirmed(payment);
        
      case 'PAYMENT_OVERDUE':
        return await this.processPaymentOverdue(payment);
        
      case 'PAYMENT_DELETED':
        return await this.processPaymentDeleted(payment);
        
      case 'PAYMENT_REFUNDED':
        return await this.processPaymentRefunded(payment);
        
      default:
        return { ignored: true, reason: 'Evento de pagamento não tratado' };
    }
  }
  
  private async processPaymentConfirmed(payment: any) {
    // Lógica atual do webhook
    // 1. Buscar pedido
    // 2. Atualizar status
    // 3. Processar afiliados
    // 4. Calcular comissões
  }
  
  private async processPaymentOverdue(payment: any) {
    // 1. Buscar pedido
    // 2. Atualizar status para "overdue"
    // 3. Notificar cliente
    // 4. Pausar comissões
  }
  
  private async processPaymentDeleted(payment: any) {
    // 1. Buscar pedido
    // 2. Atualizar status para "cancelled"
    // 3. Reverter comissões (se existirem)
    // 4. Notificar afiliados
  }
  
  private async processPaymentRefunded(payment: any) {
    // 1. Buscar pedido
    // 2. Atualizar status para "refunded"
    // 3. Reverter comissões
    // 4. Ajustar saldos
  }
}
```

#### 2. SplitEventHandler
```typescript
// src/services/asaas/handlers/split-event-handler.ts

export class SplitEventHandler {
  async handle(webhookData: AsaasWebhookPayload) {
    const { event, split } = webhookData;
    
    switch (event) {
      case 'PAYMENT_SPLIT_CREATED':
        return await this.processSplitCreated(split);
        
      case 'PAYMENT_SPLIT_CONFIRMED':
        return await this.processSplitConfirmed(split);
        
      case 'PAYMENT_SPLIT_FAILED':
        return await this.processSplitFailed(split);
        
      default:
        return { ignored: true, reason: 'Evento de split não tratado' };
    }
  }
  
  private async processSplitCreated(split: any) {
    // 1. Registrar split em asaas_splits
    // 2. Atualizar status das comissões para "split_created"
    // 3. Log de auditoria
  }
  
  private async processSplitConfirmed(split: any) {
    // 1. Atualizar status das comissões para "paid"
    // 2. Atualizar saldos dos afiliados
    // 3. Notificar afiliados
    // 4. Atualizar métricas
  }
  
  private async processSplitFailed(split: any) {
    // 1. Marcar comissões como "split_failed"
    // 2. Alertar administrador
    // 3. Agendar retry automático
  }
}
```

#### 3. WebhookValidator
```typescript
// src/services/asaas/webhook-validator.ts

export class AsaasWebhookValidator {
  async validate(payload: any, headers: any): Promise<boolean> {
    const signature = headers['x-asaas-signature'];
    const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('[AsaasWebhook] ASAAS_WEBHOOK_SECRET não configurado');
      return process.env.NODE_ENV !== 'production'; // Aceitar em dev
    }
    
    if (!signature) {
      return false;
    }
    
    // Validação HMAC real
    const crypto = require('crypto');
    const payloadString = JSON.stringify(payload);
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
```

---

## 📝 PRÓXIMOS PASSOS

### Fase 1: Correções Críticas (Imediato)
1. ✅ **Corrigir validação HMAC**
   - Implementar `AsaasWebhookValidator` real
   - Testar com webhooks reais do Asaas
   - Adicionar logs de validação

2. ✅ **Adicionar eventos de cancelamento/estorno**
   - Implementar `PAYMENT_DELETED`
   - Implementar `PAYMENT_REFUNDED`
   - Implementar lógica de reversão de comissões

### Fase 2: Eventos de Split (Alta Prioridade)
3. ✅ **Implementar handlers de split**
   - `PAYMENT_SPLIT_CREATED`
   - `PAYMENT_SPLIT_CONFIRMED`
   - `PAYMENT_SPLIT_FAILED`

4. ✅ **Atualizar tabelas do banco**
   - Adicionar campos de status em `commissions`
   - Adicionar campos de tracking em `asaas_splits`

### Fase 3: Melhorias (Média Prioridade)
5. ✅ **Adicionar processamento assíncrono**
   - Implementar queue system (Bull/BullMQ)
   - Retry automático para falhas
   - Dead letter queue para erros persistentes

6. ✅ **Melhorar logs e monitoramento**
   - Dashboard de webhooks
   - Alertas para falhas
   - Métricas de performance

### Fase 4: Otimizações (Baixa Prioridade)
7. ✅ **Adicionar cache**
   - Cache de validações de wallet
   - Cache de dados de afiliados
   - Reduzir queries ao banco

8. ✅ **Testes automatizados**
   - Testes unitários dos handlers
   - Testes de integração do webhook
   - Testes de carga

---

## 🔒 SEGURANÇA

### Validação HMAC (CRÍTICO)
- ✅ Implementar validação real (não mock)
- ✅ Usar `crypto.timingSafeEqual()` para evitar timing attacks
- ✅ Logar tentativas de validação falhadas
- ✅ Rate limiting por IP

### Idempotência
- ✅ Verificar se webhook já foi processado (por `asaas_event_id`)
- ✅ Evitar processamento duplicado
- ✅ Responder 200 OK mesmo se já processado

### Timeout
- ✅ Processar webhook em < 5 segundos
- ✅ Se demorar mais, mover para queue
- ✅ Responder 200 OK imediatamente

---

## 📊 MÉTRICAS E MONITORAMENTO

### Métricas a Coletar
- Total de webhooks recebidos (por evento)
- Taxa de sucesso/falha
- Tempo médio de processamento
- Webhooks duplicados detectados
- Validações HMAC falhadas

### Alertas
- 🚨 Taxa de falha > 5%
- 🚨 Tempo de processamento > 10s
- 🚨 Validação HMAC falhando
- 🚨 Split falhando repetidamente

---

## 🎯 CONCLUSÃO

**Recomendação Final:** Manter webhook único em `/api/webhooks/asaas` e expandir com:

1. ✅ Validação HMAC real
2. ✅ Handlers modulares por categoria de evento
3. ✅ Eventos de split (CREATED, CONFIRMED, FAILED)
4. ✅ Eventos de cancelamento/estorno (DELETED, REFUNDED)
5. ✅ Processamento assíncrono para eventos pesados
6. ✅ Logs e monitoramento robustos

**Benefícios:**
- Aproveita código existente e funcional
- Adiciona funcionalidades críticas faltantes
- Mantém simplicidade de manutenção
- Escalável para futuras necessidades

**Riscos Mitigados:**
- Validação HMAC mockada → Implementar real
- Eventos de split ignorados → Adicionar handlers
- Falta de reversão de comissões → Implementar lógica

---

**Próxima ação:** Implementar Fase 1 (Correções Críticas) antes de adicionar novos eventos.
