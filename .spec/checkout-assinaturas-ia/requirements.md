# Requisitos: Checkout Direto e Webhook de Assinaturas IA

## 🎯 Objetivo
Transformar o fluxo de assinatura do Agente IA em uma experiência "Premium" e rápida, eliminando o redirecionamento para o site externo e garantindo que o ciclo de vida da assinatura (renovação/cancelamento) e o comissionamento recorrente sejam processados de forma isolada e segura.

## � Produto e Precificação
- **Nome**: Agente IA
- **SKU**: `COL-707D80`
- **Valor**: R$ 397,00 / mês
- **Categoria**: `Agente IA (Digital)`
- **Tipo de Cobrança**: Recorrência Mensal (Assinatura)

## 💸 Regras de Comissionamento (Split Asaas)
O sistema deve garantir o split automático de 70/30 em **cada renovação mensal**:
- **70% Renum**: Valor destinado à fábrica/produto.
- **30% Programa de Afiliados**: Distribuído conforme a rede:
    - **15% (N1)**: Afiliado direto.
    - **3% (N2)**: Segundo nível.
    - **2% (N3)**: Terceiro nível.
    - **10% (Gestores)**: Divisão entre Renum e JB (incluindo redistribuição de furos na rede).

## 🏗️ Arquitetura de Webhooks Isolados
Para garantir estabilidade e separação de responsabilidades, utilizaremos dois webhooks independentes (ambos na Vercel):

### Webhook A: `/api/webhook-asaas` (Existente)
- **Função**: Processar o fluxo financeiro e de comissões.
- **Escopo**: Produtos Físicos (Colchões) + Produto Digital (Agente IA).
- **Ação**: Calcula e registra as comissões no Supabase a cada `PAYMENT_CONFIRMED`.

### Webhook B: `/api/webhook-assinaturas` (Novo)
- **Função**: Gestão de Acesso e Ciclo de Vida Técnico.
- **Escopo**: Exclusivo para o Produto Agente IA.
- **Ações**: 
    - Ativar/Renovar o Tenant (Agente).
    - Suspender acesso em caso de inadimplência (`PAYMENT_OVERDUE`).
    - Cancelar acesso (`SUBSCRIPTION_DELETED`).

## 📋 Requisitos Funcionais

### 1. Checkout via Modal (Dashboard de Afiliados)
- **Ação**: O botão "Assinar Agora" deve abrir o modal `AffiliateAwareCheckout` diretamente.
- **Validação**: Bloquear checkout se o SKU não for `COL-707D80` para este fluxo.
- **Recorrência**: Criar a assinatura no Asaas com `billingType: "SUBSCRIPTION"` e `cycle: "MONTHLY"`.

### 2. Automação de Comissões Recorrentes
- O sistema de comissões deve ser disparado em **toda cobrança confirmada** gerada pela assinatura, não apenas na primeira.

## ✅ Critérios de Aceite
- [ ] O modal de checkout processa o SKU `COL-707D80` como assinatura mensal.
- [ ] O Webhook A registra comissões de N1, N2 e N3 em cada renovação.
- [ ] O Webhook B renova a data `expires_at` do tenant no Supabase após o pagamento.
- [ ] O acesso ao Agente IA é bloqueado automaticamente se a assinatura for cancelada.
