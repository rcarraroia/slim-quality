# Relatório de Auditoria: Sistema de Afiliados e Comissões - Slim Quality

**Data:** 10/01/2026
**Status:** Crítico 🚨
**Assunto:** Auditoria de Persistência de Referral e Geração de Comissões

## 1. Resumo Executivo
A auditoria identificou uma falha sistêmica que impede a atribuição de vendas aos afiliados. Embora o rastreamento de cliques esteja funcionando (captura de URL), a informação do afiliado é perdida no momento do checkout devido a um conflito de implementação entre a Landing Page e a página de Pagamento. Além disso, o backend de checkout não está persistindo os dados de rede de afiliados no banco de dados, o que bloqueia a geração automática de comissões via webhook.

## 2. Diagnóstico Técnico (Bugs Identificados)

### 🚨 BUG 01: Fragmentação e Conflito de Tracking (Frontend)
Existem duas classes `ReferralTracker` no projeto com chaves de `localStorage` conflitantes:
- **Landing Page / App Init:** Usa `src/utils/referral-tracker.ts` com a chave `referral_code`.
- **Checkout / useReferralTracking:** Usa `src/middleware/referral-tracker.ts` com a chave `slim_referral_code`.
- **Impacto:** O código capturado na entrada é invisível para o checkout. O sistema "esquece" o afiliado no momento da compra.

### 🚨 BUG 02: Falha de Persistência no Backend (`api/checkout.js`)
O script Vercel responsável pelo processamento do pagamento no Asaas:
- Recebe o `referral_code`, calcula o split corretamente para o Asaas, mas **NÃO** atualiza os campos `referral_code`, `affiliate_n1_id`, `affiliate_n2_id` e `affiliate_n3_id` na tabela `orders`.
- **Impacto:** Os pedidos ficam sem rastro de afiliado no banco de dados Supabase, tornando impossível para o sistema de comissões saber quem deve receber.

### 🚨 BUG 03: Quebra na Cadeia de Comissionamento (Webhooks)
Os handlers de webhook (`asaas-webhook.ts` e `webhook-asaas.js`) tentam processar comissões quando o pagamento é confirmado:
- Eles buscam o `referral_code` na tabela `orders`. Como o campo está `NULL` (devido ao BUG 02), o processamento é abortado imediatamente.
- **Evidência:** Tabelas `commissions` e `commission_splits` estão com 0 registros.

### ✅ RETIFICAÇÃO: Wallets Asaas
- **Status:** Validado e operando corretamente.
- **Análise:** Uma verificação anterior indicou erroneamente uma inconsistência. Após nova auditoria cruzada (screenshot do usuário + log SQL corrigido), confirmamos que a associação entre `affiliates.wallet_id` e `asaas_wallets.wallet_id` está íntegra e ativa para os afiliados testados (ex: Giuseppe).
- **Ação:** Nenhuma correção necessária neste ponto.

## 3. Evidências Coletadas

- **Pedidos Recentes:** IDs `f54941c4...` e `a236cea2...` possuem todos os campos de afiliado como `NULL` na tabela `orders`.
- **Clicks:** Existe registro de clique hoje para o código `DA7AE7`, mas nenhuma conversão associada em `referral_conversions`.
- **Código:**
    - `src/hooks/useReferralTracking.ts:L6` importa a versão antiga do tracker.
    - `src/App.tsx:L8` e `L61` importa a nova versão do tracker.
    - `api/checkout.js:L457` (updateOrderStatus) ignora dados de afiliado.

## 4. Plano de Correção Proposto

1. **Unificação do Tracker:** Apontar todo o frontend (hooks e componentes) para `src/utils/referral-tracker.ts` e padronizar a chave de storage em `slim_referral_code` (conforme `STORAGE_KEYS`).
2. **Correção de Persistência no Backend:** Atualizar `api/checkout.js` para salvar os IDs da rede de afiliados na tabela `orders` durante o processamento do pagamento.
3. **Sincronização de Wallets:** Auditar e sincronizar os `wallet_id` entre as tabelas `affiliates` e `asaas_wallets`.
4. **Trigger de Re-processamento:** Criar um script para re-processar as comissões dos pedidos que foram pagos mas não comissionados (usando os logs de cliques como referência).

## 5. Conclusão da Auditoria
O sistema de comissões não está quebrado em sua lógica de cálculo, mas sim na sua **pipeline de dados**. A correção exige a unificação do rastreamento frontend e a garantia de persistência no backend de checkout.

---
*Relatório gerado automaticamente por Antigravity AI.*
