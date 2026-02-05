# TASK: Remoção da Lógica de Assinatura do Sistema Antigo

**Data:** 05/02/2026  
**Responsável:** Kiro AI  
**Status:** Aguardando autorização  

## PROBLEMA IDENTIFICADO

O sistema antigo (`api/checkout.js`) contém lógica de assinatura que viola o **Requirement 2.1** da especificação:
- Usa endpoint `/subscriptions/` para primeira mensalidade (INCORRETO)
- Deveria usar `/payments/` conforme spec
- Cria conflito com sistema novo de assinaturas

## OBJETIVO

Remover TODA lógica de assinatura do sistema antigo, deixando apenas produtos físicos.

## AÇÕES ESPECÍFICAS

### 1. Modificar `api/checkout.js`

**REMOVER:**
- Linha ~262: `const isIAProduct = orderItems.some(item => item.product_sku === 'COL-707D80' || item.sku === 'COL-707D80');`
- Linha ~263: `const isSubscription = isIAProduct;`
- Linha ~275: `asaasEndpoint = '/subscriptions/';`
- Linhas ~276-350: Todo bloco de lógica de assinatura com cartão
- Linhas ~390-450: Lógica de busca de primeira cobrança de assinatura
- Linhas ~500-600: Processamento específico de assinatura

**MANTER:**
- Apenas lógica de produtos físicos
- Endpoint `/payments` para produtos físicos
- Split de comissões para produtos físicos

### 2. Garantir Roteamento Limpo

**VERIFICAR:**
- `src/services/checkout.service.ts` direciona produtos IA para sistema novo
- Sistema antigo nunca processa produtos IA
- Não há chamadas cruzadas entre sistemas

### 3. Verificar Webhook Asaas

**CONFIRMAR no Dashboard Asaas:**
- URL: `https://slimquality.com.br/api/webhook-assinaturas`
- Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `SUBSCRIPTION_DELETED`
- Token: `ASAAS_WEBHOOK_TOKEN` configurado

## RESULTADO ESPERADO

- Sistema antigo: APENAS produtos físicos
- Sistema novo: APENAS assinaturas  
- Sem conflitos entre sistemas
- Requirement 2.1 respeitado

## VALIDAÇÃO

1. Testar compra de produto físico → sistema antigo
2. Testar compra de produto IA → sistema novo
3. Confirmar webhook funcionando
4. Verificar que não há lógica duplicada

## RISCOS

- **BAIXO:** Modificações são apenas remoções
- **MITIGAÇÃO:** Sistema novo já funciona independentemente
- **ROLLBACK:** Git permite reverter se necessário

## TEMPO ESTIMADO

- Modificação: 15 minutos
- Teste: 10 minutos  
- Verificação webhook: 5 minutos
- **Total: 30 minutos**