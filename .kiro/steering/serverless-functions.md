# SERVERLESS FUNCTIONS - VERCEL
## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 🚨 LIMITE CRÍTICO ATINGIDO

**Plano:** Vercel Hobby (Gratuito)  
**Limite:** 12 Serverless Functions  
**Status Atual:** 12/12 funções (100% utilizado)  

⚠️ **ATENÇÃO:** Não é possível adicionar novas Serverless Functions sem consolidar ou deletar existentes!

---

## 📊 INVENTÁRIO ATUAL (12 FUNÇÕES)

### **1. `api/admin.js`** (CONSOLIDADA)
**Rota:** `/api/admin?action={action}`  
**Métodos:** GET, POST  
**Consolidou:** `api/notifications.js` (deletado em 26/02/2026)

**Actions disponíveis:**

#### Admin (requer autenticação de admin):
- `notifications-create` (POST) - Criar broadcast para todos os afiliados
- `notifications-sent` (GET) - Listar histórico de broadcasts enviados

#### Afiliados (requer autenticação de afiliado):
- `list` (GET) - Listar notificações do afiliado logado
- `mark-read` (POST) - Marcar notificação como lida
- `mark-all-read` (POST) - Marcar todas como lidas
- `send-email` (POST) - Enviar email de notificação

**Usado por:**
- `src/services/admin/notification.service.ts`
- `src/services/frontend/notification.service.ts`
- `src/components/NotificationBell.tsx`
- `src/pages/dashboard/NotificacoesAdmin.tsx`

---

### **2. `api/affiliates.js`**
**Rota:** `/api/affiliates?action={action}`  
**Métodos:** GET, POST, PUT, DELETE  

**Actions disponíveis:**
- `register` (POST) - Cadastro de novo afiliado
- `get` (GET) - Buscar dados do afiliado logado
- `update` (PUT) - Atualizar dados do afiliado
- `list` (GET) - Listar afiliados (admin)
- `network` (GET) - Buscar rede genealógica
- `metrics` (GET) - Métricas do afiliado
- `validate-wallet` (POST) - Validar Wallet ID Asaas
- `update-wallet` (PUT) - Atualizar Wallet ID

**Usado por:**
- `src/services/frontend/affiliate.service.ts`
- `src/pages/afiliados/AfiliadosCadastro.tsx`
- `src/pages/afiliados/dashboard/Inicio.tsx`
- `src/pages/affiliates/ConfiguracoesFinanceiras.tsx`

---

### **3. `api/chat-proxy.js`**
**Rota:** `/api/chat-proxy`  
**Métodos:** POST  

**Função:** Proxy para comunicação com Agente IA (BIA)  
**Endpoint destino:** `https://api.slimquality.com.br` (Python/FastAPI)

**Usado por:**
- Chat do site (integração com BIA)
- Qualificação de leads

---

### **4. `api/checkout.js`**
**Rota:** `/api/checkout?action={action}`  
**Métodos:** POST  

**Actions disponíveis:**
- `create-order` (POST) - Criar pedido de colchão
- `process-payment` (POST) - Processar pagamento via Asaas

**Usado por:**
- `src/components/checkout/AffiliateAwareCheckout.tsx`
- Fluxo de compra de colchões

---

### **5. `api/contact.js`**
**Rota:** `/api/contact`  
**Métodos:** POST  

**Função:** Formulário de contato do site  
**Ação:** Salva mensagem no banco + envia email (futuro)

**Usado por:**
- Página de contato do site

---

### **6. `api/health.js`**
**Rota:** `/api/health`  
**Métodos:** GET  

**Função:** Health check mínimo  
**Retorno:** `{ status: 'ok', timestamp: Date.now() }`

**Usado por:**
- Monitoramento de uptime
- Testes de conectividade

---

### **7. `api/referral.js`** (CONSOLIDADA)
**Rota:** `/api/referral?action={action}`  
**Métodos:** POST  
**Consolidou:** `api/referral/track-click.js` + `api/referral/track-conversion.js` (deletados em 26/02/2026)

**Actions disponíveis:**
- `track-click` (POST) - Registrar clique em link de afiliado
- `track-conversion` (POST) - Registrar conversão (venda)

**Dados rastreados:**
- IP, User-Agent, Referer
- UTM parameters (source, medium, campaign, content, term)
- Referral code do afiliado

**Usado por:**
- Sistema de rastreamento de afiliados
- Cálculo de comissões

---

### **8. `api/store-profiles.js`**
**Rota:** `/api/store-profiles?action={action}`  
**Métodos:** GET, POST, PUT  

**Actions disponíveis:**
- `create` (POST) - Criar perfil de loja (Logista)
- `update` (PUT) - Atualizar perfil de loja
- `get` (GET) - Buscar perfil específico
- `list` (GET) - Listar lojas públicas (com filtros)
- `toggle-visibility` (PUT) - Ativar/desativar vitrine

**Usado por:**
- `src/services/frontend/store.service.ts`
- `src/pages/afiliados/dashboard/Loja.tsx`
- `src/pages/lojas/Showcase.tsx`
- `src/pages/lojas/StoreDetail.tsx`

---

### **9. `api/webhook-asaas.js`**
**Rota:** `/api/webhook-asaas`  
**Métodos:** POST  

**Função:** Webhook para vendas de colchões  
**Eventos processados:**
- `PAYMENT_CONFIRMED` - Pagamento confirmado
- `PAYMENT_RECEIVED` - Pagamento recebido
- `PAYMENT_OVERDUE` - Pagamento vencido

**Ações:**
- Atualiza status do pedido
- Calcula comissões (30% split: N1 15%, N2 3%, N3 2%, Renum 5%, JB 5%)
- Executa split automático via Asaas
- Notifica agente IA

**Usado por:**
- Asaas (webhook externo)
- Fluxo de vendas de colchões

---

### **10. `api/webhook-assinaturas.js`**
**Rota:** `/api/webhook-assinaturas`  
**Métodos:** POST  

**Função:** Webhook para assinaturas de afiliados (ETAPA 5)  
**Eventos processados:**
- `PAYMENT_CONFIRMED` - Pagamento confirmado
- `PAYMENT_RECEIVED` - Pagamento recebido
- `PAYMENT_OVERDUE` - Pagamento vencido
- `PAYMENT_DELETED` - Pagamento cancelado

**Roteamento:**
- `externalReference` começa com `affiliate_` → Enfileira em `subscription_webhook_events`
- `externalReference` começa com `subscription_` → Payment First
- Assinatura recorrente → Ativa/Suspende tenant

**Ações:**
- Valida token do webhook (`ASAAS_WEBHOOK_TOKEN`)
- Enfileira eventos de afiliados para processamento assíncrono
- Edge Function `process-affiliate-webhooks` processa fila

**Usado por:**
- Asaas (webhook externo)
- Sistema de monetização de afiliados

---

### **11. `api/subscriptions/create-payment.js`**
**Rota:** `/api/subscriptions/create-payment?action={action}`  
**Métodos:** POST  

**Actions disponíveis:**
- `create-membership-payment` (POST) - Criar cobrança de taxa de adesão
- `create-subscription` (POST) - Criar assinatura recorrente (mensalidade)
- `cancel-subscription` (POST) - Cancelar assinatura
- `get-history` (GET) - Histórico de pagamentos
- `get-receipt` (GET) - Comprovante de pagamento

**Funcionalidades:**
- Integração com Asaas API
- Cálculo de split automático (10% Slim + N1/N2/N3 + Renum/JB)
- Validação de afiliados ativos (`payment_status === 'active'`)
- Redistribuição de comissões quando rede incompleta

**Usado por:**
- `src/pages/afiliados/dashboard/Pagamentos.tsx`
- `src/components/PaywallCadastro.tsx`
- Sistema de monetização de afiliados

---

### **12. `api/subscriptions/status/[paymentId].js`**
**Rota:** `/api/subscriptions/status/{paymentId}`  
**Métodos:** GET  

**Função:** Consultar status de pagamento específico  
**Retorno:** Status atual do pagamento no Asaas

**Usado por:**
- Polling de status de pagamento
- Confirmação de pagamento em tempo real

---

## 📜 HISTÓRICO DE CONSOLIDAÇÕES

### **26/02/2026 - Consolidação para respeitar limite de 12 funções**

**Commit:** `882751f`

#### **Consolidação 1: Notificações**
- **Deletado:** `api/notifications.js`
- **Consolidado em:** `api/admin.js`
- **Motivo:** Ambas lidam com notificações (admin + afiliados)
- **Impacto:** Frontend atualizado para usar `/api/admin?action=list`

#### **Consolidação 2: Referral**
- **Deletado:** `api/referral/track-click.js`
- **Deletado:** `api/referral/track-conversion.js`
- **Consolidado em:** `api/referral.js`
- **Motivo:** Ambas lidam com rastreamento de afiliados
- **Impacto:** Nenhum (rotas antigas não estavam em uso)

#### **Consolidação 3: Health Check**
- **Deletado:** `api/health-check.js`
- **Motivo:** Redundante com `api/health.js`
- **Impacto:** Nenhum

**Resultado:** 15 funções → 12 funções ✅

---

## 🚫 REGRAS PARA NOVAS FUNÇÕES

### **ANTES DE CRIAR NOVA FUNÇÃO:**

1. **Verificar se pode consolidar em função existente**
   - Usar roteamento por `?action={action}`
   - Exemplo: `api/admin.js` tem múltiplas actions

2. **Avaliar se alguma função pode ser deletada**
   - Funções não utilizadas
   - Funções redundantes

3. **Considerar alternativas:**
   - Edge Functions do Supabase (não contam no limite)
   - Processar no frontend (quando possível)
   - Consolidar múltiplas rotas em uma função

### **PADRÃO DE CONSOLIDAÇÃO:**

```javascript
// api/minha-funcao.js
export default async function handler(req, res) {
  const { action } = req.query;
  
  switch (action) {
    case 'action1':
      return handleAction1(req, res);
    case 'action2':
      return handleAction2(req, res);
    default:
      return res.status(404).json({ error: 'Action não encontrada' });
  }
}
```

---

## 📊 ANÁLISE DE USO

### **Funções Críticas (não podem ser removidas):**
- ✅ `admin.js` - Notificações e gestão admin
- ✅ `affiliates.js` - Core do sistema de afiliados
- ✅ `webhook-asaas.js` - Vendas de colchões
- ✅ `webhook-assinaturas.js` - Monetização de afiliados
- ✅ `subscriptions/create-payment.js` - Pagamentos de afiliados

### **Funções Importantes:**
- ✅ `store-profiles.js` - Vitrine pública (ETAPA 4)
- ✅ `checkout.js` - Vendas de colchões
- ✅ `referral.js` - Rastreamento de afiliados

### **Funções Secundárias:**
- ⚠️ `chat-proxy.js` - Proxy para BIA (pode ser movido para Edge Function)
- ⚠️ `contact.js` - Formulário de contato (pode ser movido para Edge Function)
- ⚠️ `health.js` - Health check (pode ser removido se não usado)
- ⚠️ `subscriptions/status/[paymentId].js` - Pode ser consolidado em `create-payment.js`

---

## 🔄 ALTERNATIVAS PARA EXPANSÃO

### **1. Edge Functions do Supabase**
- **Vantagem:** Não contam no limite do Vercel
- **Uso atual:** `process-affiliate-webhooks`
- **Candidatos:** `chat-proxy.js`, `contact.js`

### **2. Upgrade para Vercel Pro**
- **Custo:** $20/mês
- **Limite:** 100 Serverless Functions
- **Benefícios:** Mais recursos, analytics, etc.

### **3. Consolidação Adicional**
- Consolidar `subscriptions/status/[paymentId].js` em `create-payment.js`
- Consolidar `checkout.js` em `affiliates.js` (se fizer sentido)

---

## 📝 CHECKLIST ANTES DE DEPLOY

Antes de fazer push para produção, SEMPRE verificar:

- [ ] Contagem de funções: `Get-ChildItem -Path api -Recurse -File -Filter "*.js" | Measure-Object`
- [ ] Resultado deve ser **≤ 12**
- [ ] Se > 12: consolidar ou deletar funções
- [ ] Atualizar este documento se houver mudanças

---

## 🔗 REFERÊNCIAS

- **Documentação Vercel:** https://vercel.com/docs/functions/serverless-functions
- **Limites do Plano Hobby:** https://vercel.com/docs/accounts/plans#hobby
- **Commit de consolidação:** `882751f` (26/02/2026)

---

**Documento criado em:** 26/02/2026  
**Última atualização:** 26/02/2026  
**Status:** ATIVO - Limite atingido (12/12)  
**Próxima revisão:** Quando precisar adicionar nova função
