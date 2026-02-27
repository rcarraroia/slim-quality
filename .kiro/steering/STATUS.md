---
inclusion: always
---

# 🚦 STATUS DO PROJETO — SLIM QUALITY

> Leia este arquivo no início de toda sessão antes de qualquer ação.
> Atualize ao final de cada sessão e antes da sumarização automática.

---

## TAREFA ATUAL

**IMPLEMENTAÇÃO DE REGRAS ESPECIAIS SHOW ROOM: EM ANDAMENTO** 🚧

### Fase 0: Preparação do Banco ✅ CONCLUÍDA (27/02/2026)

- **Migration criada:** `supabase/migrations/20260227120000_create_show_room_purchases.sql`
- **Tabela:** `show_room_purchases` criada com sucesso
- **Constraint:** `unique_affiliate_product` (garante 1 compra por logista por produto)
- **Índices:** 5 índices criados para performance
- **RLS:** 4 políticas criadas (logistas, admins, system, delete)
- **Validações:** Todas passaram ✅
- **Commit:** Pendente (migration aplicada via MCP)

### Próxima Fase: Fase 1 - Controle de Compras por Logista

**Objetivo:** Implementar validações frontend e backend para impedir compras duplicadas

**Tasks:**
1. Validação no Frontend - ShowRow.tsx
2. Validação no Backend - checkout.js
3. Registro de Compra no Webhook - webhook-asaas.js

**Documento de Tasks:** `.spec/tasks/show-room-regras-especiais.md`

---

## TAREFAS ANTERIORES CONCLUÍDAS (27/02/2026)

**MELHORIAS NA VITRINE DE LOJAS** ✅

### Tarefas Concluídas:

#### 1. ✅ Correção da imagem do produto no Show Room
- **Problema:** Imagem do produto não aparecia no painel do logista
- **Solução:** Adicionado fallback adequado com ícone Package
- **Resultado:** Imagem renderiza normalmente, com fallback se falhar
- **Commit:** `e5bafd1`
- **Arquivo:** `src/pages/afiliados/dashboard/ShowRow.tsx`

#### 2. ✅ Slug da loja atualiza automaticamente
- **Problema:** Slug não era atualizado quando nome da loja mudava
- **Causa:** Função `set_store_slug()` só gerava slug se fosse NULL
- **Solução:** 
  - Habilitada extensão `unaccent` no Supabase
  - Corrigida função `generate_store_slug()` para não depender de `unaccent()`
  - Corrigida função `set_store_slug()` para regenerar slug quando nome mudar
  - Recriado trigger para garantir funcionamento
- **Resultado:** Slug agora atualiza automaticamente ao alterar nome da loja
- **Commit:** `f63ec3b`
- **Migration:** `supabase/migrations/20260227000000_fix_store_slug_auto_update.sql`

### Próximas Tarefas:

#### 3. ✅ Implementar upload de imagens da loja
- **Objetivo:** Permitir upload direto de logo e banner (não apenas URLs)
- **Solução:** 
  - Criado componente `ImageUpload.tsx` com upload para Supabase Storage
  - Integrado na aba "Imagens" da página Loja
  - Upload de logo (200x200px, máx 2MB) e banner (1200x400px, máx 3MB)
  - Preview em tempo real e validação de arquivos
- **Resultado:** Upload de imagens funcionando perfeitamente
- **Commit:** `f4d879a`
- **Arquivos:** `src/components/shared/ImageUpload.tsx`, `src/pages/afiliados/dashboard/Loja.tsx`

#### 4. ✅ Padronização de imagens de produtos
- **Problema:** Sistema tinha DUAS formas de armazenar imagens (inconsistente)
- **Análise:** Documentada em `.kiro/analise-problema-imagens-produtos.md`
- **Solução:** Padronizado para usar APENAS `product_images` (tabela relacionada)
- **Alterações:**
  - Atualizado `Loja.tsx` para buscar `product_images` via JOIN
  - Atualizado `PaywallCadastro.tsx` para buscar `product_images` via JOIN
  - Corrigido `handleDuplicate()` em `Produtos.tsx` para não copiar `image_url`
  - `ShowRow.tsx` já estava correto
- **Resultado:** Todos componentes agora usam APENAS `product_images`
- **Commit:** `a452635`
- **getDiagnostics:** 0 erros

#### 5. ✅ Investigação de imagens não aparecendo na home e /produtos
- **Problema:** Após padronização, imagens não apareciam nas páginas públicas
- **Causa Raiz:** Quando produto King Size foi clonado, o sistema copiou a URL da imagem mas não duplicou o arquivo físico no Supabase Storage
- **Investigação:** Adicionados logs de debug para validar query e formato dos dados
- **Validação:** 
  - Query do Supabase funcionando perfeitamente
  - `product_images` vindo como array corretamente
  - URLs sendo extraídas corretamente
- **Solução:** Usuário fez upload da imagem novamente no módulo de produtos
- **Resultado:** Imagens agora aparecem em todas as páginas (home, /produtos, Show Room)
- **Commits:** `510839e` (debug), logs removidos após resolução
- **Arquivo:** `src/hooks/useProducts.ts`

---

## TAREFAS ANTERIORES CONCLUÍDAS (27/02/2026)

**CORREÇÕES NA VITRINE DE LOJAS** ✅

### Objetivo:
Corrigir erros na vitrine pública de lojas e permitir que logistas configurem seus perfis.

### Status:
✅ **CONCLUÍDO**

### Problemas Identificados e Corrigidos:
1. ✅ **Erro 404 na vitrine** - `VITE_API_URL` configurada incorretamente no Vercel
   - **Causa:** Variável apontava para `https://api.slimquality.com.br` (agente Python)
   - **Correção:** Alterada para `/api` no Vercel Dashboard
   - **Resultado:** Vitrine agora acessa corretamente as Serverless Functions

2. ✅ **Erro 500 ao salvar perfil de loja** - Campos inexistentes na tabela
   - **Causa:** API tentava inserir `affiliate_name`, `affiliate_email`, `referral_code` que não existem em `store_profiles`
   - **Correção:** Removidos esses campos do INSERT/UPDATE em `api/store-profiles.js`
   - **Commit:** `e32dabf`
   - **Resultado:** Salvamento de perfil funcionando

### Evidências:
- ✅ Vitrine pública acessível em `/lojas`
- ✅ Loja de teste "Loja Slim Quality Centro" visível
- ✅ Painel de configuração de loja funcionando
- ✅ Link "Vitrine" presente no menu (desktop e mobile)
- ✅ Análise completa documentada em `.kiro/analise-vite-api-url.md`

### Commits:
- `209dfca` - Adiciona VITE_API_URL no .env.production
- `e32dabf` - Remove campos inexistentes do INSERT/UPDATE

---

## TAREFAS ANTERIORES CONCLUÍDAS (27/02/2026)

### 1. Correção do Formulário de Produtos - Adesão de Afiliado ✅
- Campo "Preço (R$)" oculto para categoria Adesão de Afiliado
- Campos de dimensões ocultos para categoria Adesão de Afiliado
- Validação do botão "Salvar" ajustada
- Lógica de salvamento de `price_cents` ajustada
- Commit: `7e7424d`

### 2. FRENTE B - PAYMENT FIRST (Phases B1-B8) ✅
- Phase B1: Database (payment_sessions)
- Phase B2: Backend - Validação Prévia
- Phase B3: Backend - Criação de Pagamento
- Phase B4: Backend - Webhook Handler
- Phase B5: Frontend - Atualização do Cadastro
- Phase B6: Frontend - Componente Paywall
- Phase B7: Services - Frontend
- Phase B8: Testing & Validation (32/32 testes passando)
- Commit: `3c7a805`
- **Pendências (Validação em Produção):**
  - ⏳ B8.5: Validar cobertura > 70%
  - ⏳ B8.6: Testar fluxo E2E
  - ⏳ B8.7: Validar comissionamento
  - ⏳ B8.8: Testar cenários de erro
- Campo "Preço (R$)" oculto para categoria Adesão de Afiliado
- Campos de dimensões ocultos para categoria Adesão de Afiliado
- Validação do botão "Salvar" ajustada
- Lógica de salvamento de `price_cents` ajustada
- Commit: `7e7424d`

### 2. FRENTE B - PAYMENT FIRST (Phases B1-B8) ✅
- Phase B1: Database (payment_sessions)
- Phase B2: Backend - Validação Prévia
- Phase B3: Backend - Criação de Pagamento
- Phase B4: Backend - Webhook Handler
- Phase B5: Frontend - Atualização do Cadastro
- Phase B6: Frontend - Componente Paywall
- Phase B7: Services - Frontend
- Phase B8: Testing & Validation (32/32 testes passando)
- Commit: `3c7a805`

---

## TAREFAS ANTERIORES CONCLUÍDAS (26/02/2026)

### 1. Consolidação de Serverless Functions ✅
- Reduzido de 15 para 12 funções (dentro do limite Vercel Hobby)
- `api/notifications.js` → consolidado em `api/admin.js`
- `api/referral/track-click.js` + `api/referral/track-conversion.js` → consolidado em `api/referral.js`
- `api/health-check.js` → deletado (redundante)
- Commit: `882751f`

### 2. Documentação de Serverless Functions ✅
- Criado `.kiro/steering/serverless-functions.md`
- Inventário completo das 12 funções
- Histórico de consolidações
- Regras para novas funções
- Commit: `0c27b77`

### 3. Correção do Banner de Wallet Bloqueado ✅
- Banner agora verifica corretamente `wallet_id`
- Corrigido `src/pages/afiliados/dashboard/Inicio.tsx`
- Corrigido `src/components/affiliates/AffiliateStatusBanner.tsx`
- Commit: `466cf40`

### 4. Correção do Painel Admin ✅
- Adicionado import do ícone `Bell` em `src/layouts/DashboardLayout.tsx`
- Painel admin voltou a funcionar
- Commit: `682d82e`

---

## ETAPA 5 — Monetização de Afiliados (Asaas) ✅

### Objetivo:
Implementar sistema de cobrança para afiliados:
- Taxa de adesão única (Individual)
- Taxa de adesão + mensalidade recorrente (Logista)
- Webhook Asaas para inadimplência
- Customer Asaas vinculado ao afiliado
- Transições automáticas de status (ativo → inadimplente → suspenso)
- Comissionamento: 10% Slim + N1(15%) + N2(3%) + N3(2%) + restante para Renum/JB 50/50

### Escopo:
- Backend: API de assinaturas, webhook Asaas
- Frontend: Paywall no cadastro, página de pagamentos, banner de inadimplência
- Banco: Tabela affiliate_payments, campos de assinatura em products
- Integração: Asaas API (customers, subscriptions, webhooks)
- Comissionamento: Integração com commission-calculator.service.ts

### Status:
✅ Phase 7 (Notificações) CONCLUÍDA

### Phase 1 - Database (CONCLUÍDA ✅):
- ✅ Task 1.1: ENUM product_category atualizado (7 categorias)
- ✅ Task 1.2: Campos de assinatura adicionados em products
- ✅ Task 1.3: Tabela affiliate_payments criada
- ✅ Task 1.4: Campos payment_status e asaas_customer_id adicionados em affiliates
- ✅ Task 1.5: Constraint UNIQUE adicionado no campo document
- ✅ Task 1.6: Políticas RLS criadas para affiliate_payments (4 políticas)

### Phase 2 - Módulo de Produtos (CONCLUÍDA ✅):
- ✅ Task 2.1: Select de categorias atualizado (7 categorias)
- ✅ Task 2.2: Lógica condicional para adesao_afiliado implementada
- ✅ Task 2.3: Pronto para criar produtos de adesão via interface

### Phase 3 - Backend - API de Pagamentos (CONCLUÍDA ✅):
- ✅ Task 3.1: Serverless Function api/subscriptions/create-payment.js criada
- ✅ Task 3.2: Action create-membership-payment implementada
- ✅ Task 3.3: Action create-subscription implementada
- ✅ Task 3.4: Action cancel-subscription implementada
- ✅ Task 3.5: Actions get-history e get-receipt implementadas
- ✅ Correção: externalReference com prefixo `affiliate_` aplicada

### Phase 4 - Backend - Webhook Asaas (CONCLUÍDA ✅):
- ✅ Task 4.1: webhook-assinaturas.js atualizado com roteamento condicional
- ✅ Task 4.2: Edge Function process-affiliate-webhooks criada e deployada
- ✅ Task 4.3: Lógica de bloqueio/desbloqueio de vitrine implementada
- ✅ Task 4.4: Processamento assíncrono via subscription_webhook_events

### Phase 5 - Frontend - Paywall no Cadastro (CONCLUÍDA ✅):
- ✅ Task 5.1: Componente PaywallCadastro.tsx criado e validado (0 erros)
- ✅ Task 5.2: Integração no fluxo de cadastro implementada
- ✅ Task 5.3: Validação de CNPJ para Logistas (já existente no cadastro)

### Phase 6 - Frontend - Painel Afiliado (CONCLUÍDA ✅):
- ✅ Task 6.1: Página Pagamentos.tsx criada (0 erros)
- ✅ Task 6.2: Componente PaymentBanner.tsx criado (0 erros)
- ✅ Task 6.3: Banner integrado no AffiliateDashboardLayout (0 erros)
- ✅ Task 6.4: Rota e menu adicionados (0 erros)
- ✅ Task 6.5: Mensalidade ao ativar vitrine implementada (0 erros)
- ✅ Correção crítica: payment_status adicionado ao affiliate.service.ts
- ✅ Correção final: Loja.tsx linha ~128 (removido 'pending' do status de assinatura ativa)
- ✅ Correção final: Loja.tsx linha ~163 (persistência no banco ao ativar vitrine com assinatura ativa)

### Phase 7 - Notificações (CONCLUÍDA ✅):
- ✅ Task 7.1: Serviço de Email implementado
  - ✅ Migration `20260226180000_create_notifications.sql` aplicada
  - ✅ API `api/notifications.js` criada (4 actions: list, mark-read, mark-all-read, send-email)
  - ✅ Templates HTML para 4 tipos de email (reminder, confirmed, overdue, regularized)
  - ✅ Service `notification.service.ts` criado
  - ✅ Integração com webhook para criar notificações automáticas
- ✅ Task 7.2: Notificações no Painel implementada
  - ✅ Componente `NotificationBell.tsx` criado (0 erros)
  - ✅ Integrado no `AffiliateDashboardLayout.tsx` (0 erros)
  - ✅ Polling a cada 30 segundos
  - ✅ Badge com contador de não lidas
  - ✅ Dropdown com lista de notificações
  - ✅ Marcar como lida ao clicar
  - ✅ Edge Function `process-affiliate-webhooks` deployada (versão 4)
  - ✅ Notificações automáticas em PAYMENT_CONFIRMED e PAYMENT_OVERDUE

### Phase 8 - Comissionamento (CONCLUÍDA ✅):
- ✅ Task 8.1: Integração com Sistema de Comissões implementada
  - ✅ Função `calculateAndSaveCommissions()` criada na Edge Function
  - ✅ Lógica de cálculo adaptada para taxas: 10% Slim + N1(15%) + N2(3%) + N3(2%) + Renum/JB (restante 50/50)
  - ✅ Verifica `payment_status === 'active'` para cada afiliado
  - ✅ Aplica redistribuição quando afiliados inativos ou rede incompleta
  - ✅ Salva comissões na tabela `commissions` (apenas afiliados ativos)
  - ✅ Integrado em `handlePaymentSuccess` para `membership_fee` e `monthly_subscription`
  - ✅ Edge Function deployada versão 5 com sucesso
- ✅ Task 8.2: Split Automático via Asaas (CONCLUÍDA)
  - ✅ Função `calculateSplit()` criada em `api/subscriptions/create-payment.js`
  - ✅ Busca wallet IDs de todos os participantes (N1, N2, N3, Renum, JB)
  - ✅ Valida que afiliados têm `wallet_id` e `payment_status === 'active'`
  - ✅ Afiliados sem wallet ou inativos não entram no split - parte deles vai para Renum/JB
  - ✅ Monta payload de split conforme API Asaas
  - ✅ Valida que soma de percentuais = 90% (Slim recebe 10% automaticamente)
  - ✅ Campo `split` adicionado nas actions `create-membership-payment` e `create-subscription`
  - ✅ **CORREÇÃO CRÍTICA:** Slim removida do array de splits (recebe automaticamente conforme doc Asaas)
  - ✅ **VALIDADO:** Cenários matemáticos confirmados (rede completa, só N1, sem rede)
  - ✅ Edge Function `process-affiliate-webhooks` deployada versão 6 com sucesso
  - ✅ **DEPLOY REALIZADO:** Commit 9b21687 pushed para produção

### Phase 9 - Testing & Validation (PARCIALMENTE CONCLUÍDA ⚠️):
- ✅ Task 9.1: Testes de Integração criados
  - ✅ Arquivo `tests/integration/monetization-flow.test.ts` criado (520 linhas)
  - ✅ 6 suítes de testes implementadas (11 cenários)
  - ⚠️ Execução requer Vercel Dev ou ambiente de produção
- ✅ Task 9.2: Checklist de Validação Manual criado
  - ✅ Arquivo `tests/integration/VALIDATION_CHECKLIST.md` criado (450 linhas)
  - ✅ 154 itens de validação definidos
  - ⏳ AGUARDANDO: Preenchimento manual pelo usuário
- ✅ Pré-requisitos Configurados:
  - ✅ Produtos de adesão criados no banco (Individual e Logista)
  - ✅ Rede de afiliados de teste criada (N3 → N2 → N1)
  - ✅ Afiliado Logista de teste criado
  - ✅ Estrutura de banco validada
  - ⚠️ Variável `ASAAS_WALLET_SLIM` faltando (necessária para split)
- ⏳ Pendente:
  - Adicionar `ASAAS_WALLET_SLIM` no `.env` e Vercel
  - Executar testes automatizados (requer Vercel Dev ou produção)
  - Preencher checklist de validação manual

### Próximos Passos:
- Adicionar variável `ASAAS_WALLET_SLIM`
- Executar validação manual usando checklist
- Phase 10: Documentation & Deployment (2 tasks)
- Task 2.3: Criar produtos de adesão (Individual e Logista) via painel admin

---

## ÚLTIMA TAREFA CONCLUÍDA

**ETAPA 4 — Vitrine Pública de Logistas** ✅

### Feito com evidências:
- ✅ Migration `20260225150000_create_store_profiles.sql` — aplicada no Supabase via MCP
- ✅ API `store-profiles.js` — implementada (13KB, 470 linhas)
- ✅ Frontend — StoreCard, StoreFilters, Showcase, StoreDetail, Loja
- ✅ Rotas e menu integrados em App.tsx e AffiliateDashboardLayout.tsx
- ✅ ESLint: 0 errors (482 warnings de `no-explicit-any` — aceitáveis)
- ✅ Build: passou
- ✅ **Testes: 33/33 passed** (executado em 25/02/2026 19:24)
- ✅ **Aprovada por Renato** em 25/02/2026 19:35

---

## HISTÓRICO DE APROVAÇÕES

| Data | Tarefa | Aprovado por |
|------|--------|--------------|
| 25/02/2026 | ETAPA 1 — Correção Crítica Afiliados | Renato |
| 25/02/2026 | ETAPA 2 — Configuração de Wallet | Renato |
| 25/02/2026 | ETAPA 3 — Show Row / Diferenciação de Perfil | Renato |
| 25/02/2026 | ETAPA 4 — Vitrine Pública de Logistas | Renato |
