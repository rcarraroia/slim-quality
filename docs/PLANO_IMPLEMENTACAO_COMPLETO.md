# 📋 PLANO DE IMPLEMENTAÇÃO COMPLETO - SLIM QUALITY

**Data:** 12 de dezembro de 2025  
**Status:** Em andamento  
**Responsável:** Kiro AI  

---

## 🎯 OBJETIVO GERAL

Implementar sistema completo de vendas com "Comprar Agora" + Sistema de afiliados 100% funcional com fluxo end-to-end testado.

---

## 📊 STATUS ATUAL REAL

### ✅ **CONCLUÍDO E FUNCIONANDO:**
- Sistema de produtos (4 produtos reais no banco)
- Páginas de produto com dados reais
- Sistema de afiliados básico (cadastro, rede, consultas)
- Tabelas do banco (customers, orders, order_items, etc.) - todas existem
- Componente AffiliateAwareCheckout (criado mas não integrado)

### 🚧 **PARCIALMENTE IMPLEMENTADO:**
- Fluxo de vendas (apenas WhatsApp funciona)
- Sistema de afiliados (75% - falta integração com pedidos)
- Estrutura de banco (existe mas com foreign keys incorretas)

### ❌ **NÃO IMPLEMENTADO:**
- Botão "Comprar Agora" nas páginas
- Integração checkout com banco de dados
- Fluxo completo de comissões
- Webhooks Asaas funcionais
- Teste end-to-end completo

---

## 🔧 FASE 1: CORREÇÕES DE INFRAESTRUTURA

### 1.1 **Corrigir Foreign Keys do Banco**
- [x] **Problema:** orders.customer_id aponta para 'users' (não existe)
- [x] **Solução:** Ajustar FK para apontar para 'customers' ou 'profiles'
- [x] **Arquivo:** `supabase/migrations/20251212170439_fix_orders_foreign_key.sql`
- [x] **Teste:** Criar order com customer_id válido
- [x] **Status:** ✅ CONCLUÍDO E TESTADO

### 1.2 **Expandir Constraint de Source**
- [x] **Problema:** Campo 'source' só aceita 'affiliate' e 'organic'
- [x] **Solução:** Adicionar 'website', 'whatsapp', 'direct', etc.
- [x] **Arquivo:** `supabase/migrations/20251212171100_fix_remaining_constraints.sql`
- [x] **Teste:** Criar customer com source='website'
- [x] **Status:** ✅ CONCLUÍDO - 11 valores válidos

### 1.3 **Corrigir Campos Obrigatórios**
- [x] **Problema:** product_sku e phone obrigatórios desnecessariamente
- [x] **Solução:** Tornar campos opcionais
- [x] **Arquivo:** `supabase/migrations/20251212171403_fix_shipping_phone.sql`
- [x] **Teste:** Fluxo completo sem erros
- [x] **Status:** ✅ CONCLUÍDO E TESTADO

---

## 🛒 FASE 2: SISTEMA "COMPRAR AGORA"

### 2.1 **Atualizar Interfaces TypeScript**
- [ ] **Problema:** Interfaces não refletem estrutura real do banco
- [ ] **Solução:** Atualizar baseado na descoberta real
- [ ] **Arquivos:**
  - [ ] `src/types/database.types.ts`
  - [ ] `src/types/customer.types.ts`
  - [ ] `src/types/order.types.ts`
- [ ] **Status:** ❌ Não iniciado

### 2.2 **Implementar Botão "Comprar Agora"**
- [ ] **Páginas a modificar:**
  - [ ] `src/pages/produtos/ProdutoDetalhe.tsx`
  - [ ] `src/pages/produtos/ProductPage.tsx`
  - [ ] `src/pages/Index.tsx` (cards de produto)
- [ ] **Funcionalidade:** Abrir modal de checkout
- [ ] **Status:** ❌ Não iniciado

### 2.3 **Integrar AffiliateAwareCheckout**
- [ ] **Problema:** Componente existe mas não está integrado
- [ ] **Solução:** Conectar com páginas de produto
- [ ] **Arquivo:** `src/components/checkout/AffiliateAwareCheckout.tsx`
- [ ] **Funcionalidades:**
  - [ ] Capturar dados do cliente
  - [ ] Processar pagamento
  - [ ] Criar customer no banco
  - [ ] Criar order no banco
  - [ ] Rastrear afiliado (se houver)
- [ ] **Status:** ❌ Não iniciado

### 2.4 **Implementar Checkout Service**
- [ ] **Arquivo:** `src/services/checkout.service.ts`
- [ ] **Métodos:**
  - [ ] `createCustomer(data)`
  - [ ] `createOrder(customerData, productData)`
  - [ ] `processPayment(orderData)`
  - [ ] `trackAffiliate(referralCode)`
- [ ] **Status:** ❌ Não iniciado

---

## 🤝 FASE 3: COMPLETAR SISTEMA DE AFILIADOS

### 3.1 **Corrigir Integração com Orders**
- [ ] **Problema:** Sistema de afiliados não se conecta com pedidos reais
- [ ] **Solução:** Integrar cálculo de comissões com orders
- [ ] **Arquivos:**
  - [ ] `src/services/sales/order-affiliate-processor.ts`
  - [ ] `src/services/frontend/affiliate.service.ts`
- [ ] **Status:** ❌ Não iniciado

### 3.2 **Implementar Webhooks Asaas Funcionais**
- [ ] **Problema:** Webhook existe mas não processa pedidos reais
- [ ] **Solução:** Conectar com sistema de orders
- [ ] **Arquivo:** `src/api/routes/webhooks/asaas-webhook.ts`
- [ ] **Funcionalidades:**
  - [ ] Receber notificação de pagamento
  - [ ] Atualizar status do pedido
  - [ ] Calcular comissões
  - [ ] Executar split Asaas
- [ ] **Status:** ❌ Não iniciado

### 3.3 **Implementar Cálculo de Comissões Real**
- [ ] **Problema:** Usa dados mockados
- [ ] **Solução:** Integrar com pedidos reais
- [ ] **Arquivo:** `src/services/affiliates/commission-calculator.ts`
- [ ] **Regras:**
  - [ ] N1: 15% do valor
  - [ ] N2: 3% do valor
  - [ ] N3: 2% do valor
  - [ ] Redistribuição para gestores
- [ ] **Status:** ❌ Não iniciado

### 3.4 **Implementar Rastreamento de Referral**
- [ ] **Problema:** Sistema não rastreia origem das vendas
- [ ] **Solução:** Implementar tracking completo
- [ ] **Arquivos:**
  - [ ] `src/hooks/useReferralTracking.ts`
  - [ ] `src/middleware/referral-tracker.ts`
- [ ] **Funcionalidades:**
  - [ ] Capturar código de referral na URL
  - [ ] Salvar em localStorage/cookie
  - [ ] Associar ao pedido
- [ ] **Status:** ❌ Não iniciado

---

## 🧪 FASE 4: TESTES E VALIDAÇÃO

### 4.1 **Teste End-to-End Completo**
- [ ] **Cenário:** Visitante → Produto → Comprar → Pagamento → Comissão
- [ ] **Passos:**
  1. [ ] Acessar produto via link de afiliado
  2. [ ] Clicar "Comprar Agora"
  3. [ ] Preencher dados no checkout
  4. [ ] Processar pagamento (simulado)
  5. [ ] Verificar order criada
  6. [ ] Verificar comissão calculada
  7. [ ] Verificar split Asaas
- [ ] **Status:** ❌ Não iniciado

### 4.2 **Teste de Integração Asaas**
- [ ] **Validação real de Wallet IDs**
- [ ] **Teste de split real (valores pequenos)**
- [ ] **Webhook real do Asaas**
- [ ] **Status:** ❌ Não iniciado

### 4.3 **Teste de Performance**
- [ ] **Tempo de carregamento das páginas**
- [ ] **Responsividade do checkout**
- [ ] **Cálculo de comissões em massa**
- [ ] **Status:** ❌ Não iniciado

---

## 📱 FASE 5: MELHORIAS DE UX/UI

### 5.1 **Estados de Loading**
- [ ] **Checkout:** Spinner durante processamento
- [ ] **Páginas de afiliado:** Skeleton loading
- [ ] **Cálculo de comissões:** Progress indicator
- [ ] **Status:** ❌ Não iniciado

### 5.2 **Tratamento de Erros**
- [ ] **Pagamento falhou:** Mensagem clara + retry
- [ ] **Produto indisponível:** Alternativas
- [ ] **Erro de rede:** Offline indicator
- [ ] **Status:** ❌ Não iniciado

### 5.3 **Notificações**
- [ ] **Pedido confirmado:** Toast success
- [ ] **Comissão recebida:** Notificação push
- [ ] **Status do pedido:** Email automático
- [ ] **Status:** ❌ Não iniciado

---

## 🔍 FASE 6: MONITORAMENTO E ANALYTICS

### 6.1 **Métricas de Conversão**
- [ ] **Taxa de conversão por página**
- [ ] **Abandono de carrinho**
- [ ] **Origem das vendas**
- [ ] **Status:** ❌ Não iniciado

### 6.2 **Dashboard de Afiliados**
- [ ] **Métricas em tempo real**
- [ ] **Gráficos de performance**
- [ ] **Ranking de afiliados**
- [ ] **Status:** ❌ Não iniciado

---

## 📋 CRONOGRAMA ESTIMADO

| Fase | Descrição | Tempo Estimado | Prioridade |
|------|-----------|----------------|------------|
| 1 | Correções de Infraestrutura | 2-3 horas | 🔴 Crítica |
| 2 | Sistema "Comprar Agora" | 4-6 horas | 🔴 Crítica |
| 3 | Completar Afiliados | 3-4 horas | 🟡 Alta |
| 4 | Testes e Validação | 2-3 horas | 🟡 Alta |
| 5 | Melhorias UX/UI | 2-3 horas | 🟢 Média |
| 6 | Monitoramento | 1-2 horas | 🟢 Baixa |

**Total estimado:** 14-21 horas

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ **Mínimo Viável (MVP):**
- [ ] Botão "Comprar Agora" funciona
- [ ] Checkout cria pedido no banco
- [ ] Sistema de afiliados calcula comissões
- [ ] Fluxo end-to-end testado

### 🚀 **Completo:**
- [ ] Integração Asaas real
- [ ] Webhooks funcionais
- [ ] Dashboard de métricas
- [ ] Testes automatizados

---

## 📞 PRÓXIMOS PASSOS IMEDIATOS

1. **Corrigir foreign keys** (Fase 1.1)
2. **Expandir constraint source** (Fase 1.2)
3. **Implementar botão "Comprar Agora"** (Fase 2.2)
4. **Integrar checkout** (Fase 2.3)

---

**Este documento será atualizado conforme o progresso das implementações.**