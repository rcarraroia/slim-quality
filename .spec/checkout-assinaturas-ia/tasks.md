# Tarefas: Implementação de Checkout e Webhook IA

## 🟢 Fase 1: Arquitetura de Webhooks (Vercel)

- [x] **[MODIFY]** Webhook A (`api/webhook-asaas.js`):
    - [x] Garantir que o log de auditoria capture se o pagamento veio de uma assinatura.
    - [x] Implementar Split Invertido (70% Renum / 30% Rede) para Agente IA.
- [x] **[NEW]** Webhook B (`api/webhook-assinaturas.js`):
    - [x] Criar handler focado em `multi_agent_subscriptions` e `multi_agent_tenants`.
    - [x] Implementar validação de `asaas-access-token`.
    - [x] Adicionar lógica de renovação automática (`expires_at = now() + 30 days`) no evento `PAYMENT_CONFIRMED`.
    - [x] Implementar suspensão no `PAYMENT_OVERDUE` e `SUBSCRIPTION_DELETED`.

## 🔵 Fase 2: Checkout e Validação de SKU

- [x] **[MODIFY]** Ajustar `api/checkout.js`:
    - [x] Implementar switch: se `sku === 'COL-707D80'`, forçar criação de assinatura mensal e split de 70% para Renum.
    - [x] Validar preço fixo de R$ 397,00 no backend para evitar manipulações no front.
- [x] **[MODIFY]** Ajustar `FerramentasIA.tsx`:
    - [x] Implementar o Modal de Checkout direto.
    - [x] Injetar o produto Agente IA (SKU `COL-707D80`) nas props do modal.

## 🟡 Fase 3: Validação e Testes de Recorrência

- [x] **[TEST]** Teste de Primeira Cobrança:
    - [x] Validar ativação do tenant.
    - [x] Validar geração de comissão inicial (N1, N2, N3).
- [x] **[TEST]** Simulação de Renovação (Mês 2):
    - [x] Simular um novo `PAYMENT_CONFIRMED` vinculado à mesma assinatura.
    - [x] **Critério**: O Webhook A deve gerar um novo registro de comissão.
    - [x] **Critério**: O Webhook B deve estender o acesso em mais 30 dias.
- [x] **[MANUAL]** Configuração no Painel Asaas:
    - [x] Cadastrar os 2 endpoints independentes com seus respectivos tokens.

## ✅ Conclusão & Evidências
- [x] Relatório de logs provando a execução paralela dos 2 webhooks.
- [x] Registro de comissão recorrente no banco de dados.
