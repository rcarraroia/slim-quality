# Auditoria Técnica: Sistema de Pagamento Asaas e Fluxo de Afiliados

## 1. Introdução
Este documento detalha a auditoria realizada no sistema de integração com o Asaas e no fluxo de afiliados da plataforma COMADEMIG. O objetivo é mapear endpoints, eventos de webhook, fluxo de checkout e lógica de autorização.

---

## 2. Endpoints de Processamento de Cobrança (1ª Mensalidade)
A plataforma utiliza Supabase Edge Functions como ponte entre o frontend e a API do Asaas. Os endpoints variam conforme o fluxo utilizado:

### A. Fluxo Tradicional (Cadastro → Pagamento)
1.  **`asaas-create-customer`**: Cria o registro do cliente no Asaas.
2.  **`asaas-process-card`**: Processa a transação de cartão de crédito de forma transparente. Este endpoint é crítico pois realiza a **tokenização do cartão** (`saveCard: true`) necessária para recorrências.
3.  **`asaas-create-subscription`**: Após a confirmação do primeiro pagamento, este endpoint cria a assinatura recorrente no Asaas vinculando o cartão tokenizado e configurando os splits de comissão.

### B. Payment First Flow (Pagamento → Cadastro)
Este fluxo prioriza a conversão, processando o pagamento antes da criação da conta.
1.  **`asaas-create-customer`**: Criação do cliente.
2.  **`asaas-create-payment`**: Cria uma cobrança avulsa (Payment) para a primeira mensalidade.
3.  **Polling Service**: O frontend monitora o status do pagamento. Após a confirmação, o sistema procede com a criação da conta Supabase e ativação da assinatura.

---

## 3. Autorização de Acesso ao Painel do Afiliado
A autorização é baseada no status do perfil do usuário e na existência de um registro na entidade de afiliados.

*   **Critério de Elegibilidade**: O usuário deve ter `profile.status === 'ativo'`. Isso garante que apenas membros adimplentes participem.
*   **Verificação de Cadastro**: O hook `useMyAffiliate` consulta a tabela `affiliates`.
    *   **Caso Ativo SEM Cadastro**: O sistema apresenta o componente `AffiliateRegistration` para adesão ao programa.
    *   **Caso Ativo COM Cadastro**: O sistema libera o `AffiliatesDashboard`.
*   **Níveis de Status do Afiliado**:
    *   `active`: Acesso total às ferramentas e links de indicação.
    *   `pending`: Aguardando aprovação administrativa (se configurado).
    *   `suspended`: Acesso bloqueado (alerta exibido no painel).

---

## 4. Fluxo Completo de Checkout (Pós-Formulário)
Após o afiliado preencher o formulário de checkout (`filiacao`), o orquestrador `PaymentFirstFlowService` executa:

1.  **Validação**: Verificação rigorosa de CPF, Telefone e CEP.
2.  **Integração Asaas**:
    *   Chamada para `asaas-create-customer`.
    *   Chamada para `asaas-create-payment` (ou `asaas-process-card`).
3.  **Confirmação**:
    *   **Cartão**: Resposta imediata de sucesso/erro.
    *   **Boleto/Pix**: Geração de código e espera por confirmação.
4.  **Ativação de Conta**:
    *   Criação de conta no `auth.users` via `admin.createUser`.
    *   Criação do registro em `profiles`.
    *   Criação da assinatura em `user_subscriptions` com status `active`.
5.  **Registro de Indicação**: Se houver um código de indicação (`ref`), o sistema associa o novo usuário ao afiliado na tabela `affiliate_referrals`.

---

## 5. Webhook e Eventos Asaas
O webhook é o motor de sincronização entre o Asaas e o banco de dados local.

### Endpoint
*   **URL**: `https://[PROJECT_ID].supabase.co/functions/v1/asaas-webhook`
*   **Segurança**: Validação via cabeçalho `asaas-access-token`.

### Eventos Necessários (Configuração Painel Asaas)
Para garantir o funcionamento pleno, os seguintes eventos **DEVEM** ser marcados no painel do Asaas:

1.  **`PAYMENT_CONFIRMED`**: Confirmação imediata de cartões (Gatilho para liberação de acesso).
2.  **`PAYMENT_RECEIVED`**: Confirmação de pagamento de Boleto/Pix (Gatilho para liberação de acesso).
3.  **`PAYMENT_OVERDUE`**: Identifica atraso (Muda status da assinatura para `overdue` ou bloqueia acesso).
4.  **`PAYMENT_DELETED` / `PAYMENT_REFUNDED`**: Estornos ou cancelamentos manuais.
5.  **`SUBSCRIPTION_UPDATED`**: Essencial para capturar renovações mensais e manter o status `active` sincronizado.

### Comportamento do Webhook
Ao receber um evento de pagamento confirmado:
1.  Busca a assinatura vinculada pelo `asaas_subscription_id`.
2.  Atualiza `user_subscriptions.status = 'active'`.
3.  Executa `executePostPaymentActions`:
    *   Cria protocolos de serviço (se aplicável).
    *   Envia notificações push para o usuário ("Pagamento Confirmado").
    *   Notifica administradores sobre novas filiações.
    *   Confirma a indicação do afiliado (`affiliate_referrals.status = 'confirmed'`).

---

## 6. Conclusão da Auditoria
O sistema está bem estruturado com tratamento de falhas (Fallback System) e suporte a fluxos modernos de conversão. 

> [!IMPORTANT]
> Certifique-se de que o **`ASAAS_WEBHOOK_TOKEN`** esteja corretamente configurado nas Secrets do Supabase para evitar falhas de autenticação no recebimento dos eventos.

**Status da Auditoria:** ✅ Concluída e Validada.
