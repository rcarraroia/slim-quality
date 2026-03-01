---
inclusion: always
---

# 🚦 STATUS DO PROJETO — SLIM QUALITY

> Leia este arquivo no início de toda sessão antes de qualquer ação.
> Atualize ao final de cada sessão e antes da sumarização automática.

---

## TAREFA ATUAL

**FASE 2 - PERSONALITY AND CONTEXT LOADING (AGENTE BIA MULTI-TENANT)** ✅ CONCLUÍDA (01/03/2026)

### Objetivo:
Implementar carregamento de personality customizada por tenant com fallback para personality padrão e adaptar MemoryService para multi-tenant.

### Problemas Identificados e Corrigidos:

#### ✅ Problema 1: Campo `agent_personality` vs `personality`
- **Causa:** `personality.py` usava coluna `agent_personality` mas a coluna real é `personality`
- **Solução:** Corrigido linhas 138 e 145-165 de `agent/src/config/personality.py`
- **Status:** CORRIGIDO

#### ✅ Problema 2: RPCs Faltando no Banco
- **Causa:** `memory_service.py` chamava 3 RPCs que não existiam no banco
- **Análise:** Validado schema real via Supabase Power
  - `tenant_id` é UUID (não INT)
  - `embedding` é vector(384) do pgvector
  - `deleted_at` é timestamptz (soft delete)
- **Solução:** Criadas 3 funções RPC no Supabase:
  1. `search_similar_memories_mt()` - Busca vetorial com filtro tenant_id
  2. `search_memories_hybrid_mt()` - Busca híbrida (vetorial + textual) com filtro tenant_id
  3. `cleanup_memories_intelligent_mt()` - Limpeza inteligente com filtro tenant_id
- **Status:** CORRIGIDO

#### ✅ Problema 3: `webhooks.py` no Estado Single-Tenant
- **Análise:** Arquivo está no estado single-tenant original
- **Conclusão:** CORRETO - Fase 3 é responsável por adaptar o webhook
- **Status:** CONFIRMADO CORRETO

### Evidências:
- ✅ Personality loading com fallback implementado
- ✅ Cache de personality (TTL 5 min) implementado
- ✅ MemoryService adaptado para multi-tenant
- ✅ 4 RPCs validadas no banco (3 criadas + 1 existente)
- ✅ Schema real validado via Supabase Power
- ✅ getDiagnostics: 0 erros
- ✅ Documentação completa em `.kiro/specs/agente-bia-multi-tenant/FASE_2_CORRECOES.md`

### Arquivos Modificados:
- `agent/src/config/personality.py` (corrigido campo personality)
- Supabase: 3 funções RPC criadas (migration aplicada)

### Próximos Passos:
- ⏳ Fase 3: Webhook Evolution Adaptation
- ⏳ Adaptar `agent/src/api/webhooks.py` para multi-tenant
- ⏳ Extrair tenant_id do instanceName
- ⏳ Validar connection_status ativa
- ⏳ Processar mensagens com contexto do tenant

---

## TAREFAS ANTERIORES CONCLUÍDAS (01/03/2026)

**CORREÇÕES VISUAIS FINAIS NA PÁGINA DA LOJA** ✅ CONCLUÍDA (01/03/2026)

### Objetivo:
Ajustar elementos visuais da página da loja após implementação dos botões "Comprar Agora".

### Correções Realizadas:

#### 1. Badge Aberto/Fechado - Cores Corretas ✅
- **Antes:** Badge roxo (variant default) para ambos os estados
- **Depois:** 
  - Aberto = Verde (`bg-green-600 hover:bg-green-700`)
  - Fechado = Cinza neutro (`bg-muted text-muted-foreground`)
- **Motivo:** Cores semânticas corretas (verde = disponível, cinza = indisponível)

#### 2. Card "Ver Produtos" Removido ✅
- **Antes:** Card CTA no rodapé com texto "Compre com este logista e ganhe benefícios exclusivos" + botão "Ver Produtos"
- **Depois:** Card completamente removido
- **Motivo:** Redundante após implementação dos botões "Comprar Agora" na galeria de produtos

### Evidências:
- ✅ Badge com cores corretas implementado
- ✅ Card CTA removido (13 linhas deletadas)
- ✅ getDiagnostics: 0 erros
- ✅ Commit: `79d6a79` realizado com sucesso
- ✅ Push concluído para `origin/main`
- ✅ Deploy automático no Vercel iniciado
- ✅ Documentação atualizada

### Impacto UX:
- ✅ Badge mais intuitivo (verde = pode visitar agora)
- ✅ Layout mais limpo sem redundância
- ✅ Foco nos botões "Comprar Agora" da galeria
- ✅ Sidebar mais enxuta e objetiva

### Arquivos Modificados:
- `src/pages/lojas/StoreDetail.tsx` (correções visuais)
- `.spec/tasks/store-detail-improvements.md` (documentação)

---

## TAREFAS ANTERIORES CONCLUÍDAS (01/03/2026)

**CORREÇÃO CRÍTICA: API by-slug não retornava referral_code** ✅ CONCLUÍDA (01/03/2026)

### Problema Identificado:
Checkout abria sem mostrar código de indicação do logista, mesmo com botão "Comprar Agora" implementado.

### Análise Realizada via Supabase Power:
1. ✅ Confirmado que campo `referral_code` NÃO existe na tabela `store_profiles`
2. ✅ Confirmado que campo `referral_code` existe na tabela `affiliates` (valor: "MARP2I")
3. ✅ Identificado que API `handleBySlug()` não fazia JOIN entre as tabelas
4. ✅ Loja de teste "duda-slim-quality" tem `affiliate_id` válido

### Causa Raiz:
API `handleBySlug()` em `api/store-profiles.js` fazia apenas `SELECT * FROM store_profiles`, sem JOIN com `affiliates`, portanto não retornava o `referral_code`.

### Solução Implementada:
- ✅ Query modificada para incluir JOIN: `affiliates!inner(referral_code, name, email)`
- ✅ Dados do afiliado flattenados para nível raiz do objeto retornado
- ✅ Compatibilidade mantida com interface TypeScript `StoreProfile`
- ✅ Objeto `affiliates` removido do retorno (evitar confusão)

### Evidências:
- ✅ Commit: `828ecc0` realizado com sucesso
- ✅ Push concluído para `origin/main`
- ✅ Deploy automático no Vercel iniciado
- ✅ Documentação atualizada em `.spec/tasks/store-detail-improvements.md`

### Fluxo Corrigido:
```
1. StoreDetail.tsx chama storeFrontendService.getBySlug('duda-slim-quality')
2. API faz JOIN com affiliates
3. Retorna store.referral_code = "MARP2I" ✅
4. AffiliateAwareCheckout recebe defaultReferralCode="MARP2I"
5. Se não houver cookie, usa código do logista ✅
6. Checkout exibe código de indicação corretamente ✅
```

### Próximos Passos:
- ⏳ Validação manual em produção (após deploy)
- ⏳ Testar cenário sem cookie (logista recebe)
- ⏳ Testar cenário com cookie (cookie prevalece)
- ⏳ Validar comissionamento no banco (após venda real)

---

## TAREFAS ANTERIORES CONCLUÍDAS (28/02/2026)

**MELHORIAS NA PÁGINA DE DETALHE DA LOJA** ✅ CONCLUÍDA (28/02/2026)

### Objetivo:
Implementar melhorias na página de detalhe da loja (`/lojas/:slug`) para corrigir bugs críticos e adicionar funcionalidades.

### Tasks Concluídas (7/7):

#### ✅ Task 1: Correção de Duplicação de URLs (CRÍTICO)
- Helper `sanitizeUrl()` criado em `src/utils/url-helpers.ts`
- Detecta se valor já é URL completa
- Aplicado em WhatsApp, Website, Instagram, Facebook
- getDiagnostics: 0 erros

#### ✅ Task 2: Campo TikTok Adicionado
- Migration `20260228_add_tiktok_to_store_profiles.sql` aplicada
- Interface TypeScript atualizada
- Ícone SVG customizado implementado
- Link funcionando com `sanitizeUrl()`
- getDiagnostics: 0 erros

#### ✅ Task 3: Card de Horário Removido
- Card "Horário de Funcionamento" removido
- Lógica `isStoreOpen()` mantida para Badge
- Badge com cores corretas (verde/cinza)
- getDiagnostics: 0 erros

#### ✅ Task 4: Sidebar Reorganizada
- Card Endereço movido para sidebar (primeira posição)
- Ordem: Endereço → Contato → CTA → Voltar
- Responsividade mantida
- getDiagnostics: 0 erros

#### ✅ Task 5: Galeria de Produtos 2x2
- Card "Produtos Disponíveis" criado
- Grid responsivo (1 col mobile, 2 cols desktop)
- Hook `useProducts()` integrado
- Loading e empty states implementados
- Limitado a 4 produtos
- getDiagnostics: 0 erros

#### ✅ Task 6: Card de Contatos Reorganizado
- WhatsApp em destaque (botão verde grande)
- Contatos secundários em lista
- Ordem: Telefone → Email → Website → Instagram → Facebook → TikTok
- getDiagnostics: 0 erros

#### ✅ Task 7: Botão "Comprar Agora" com Sistema de Afiliados ⭐
- Prop `defaultReferralCode` adicionada ao `AffiliateAwareCheckout`
- Lógica de prioridade: cookie prevalece, senão usa código do logista
- Botão "Comprar Agora" em cada card de produto
- Modal de checkout integrado
- Código do logista passado automaticamente
- getDiagnostics: 0 erros em ambos os arquivos

### Regra de Negócio Implementada:
> **"Cookie existente prevalece, se não houver cookie usa o referral_code do lojista"**

**Cenário 1 (sem cookie):** Cliente compra na loja → Logista recebe comissão  
**Cenário 2 (com cookie):** Cookie prevalece → Primeiro afiliado recebe comissão

### Evidências:
- ✅ getDiagnostics: 0 erros em todos os arquivos
- ✅ Build: passou sem erros
- ✅ Commit: `afca1ee` realizado com sucesso
- ✅ Push concluído, deploy automático no Vercel

### Arquivos Modificados:
- `src/utils/url-helpers.ts` (criado)
- `src/pages/lojas/StoreDetail.tsx` (modificado)
- `src/services/frontend/store.service.ts` (modificado)
- `src/components/checkout/AffiliateAwareCheckout.tsx` (modificado)
- `supabase/migrations/20260228_add_tiktok_to_store_profiles.sql` (criado)

### Documentação:
- `.spec/tasks/store-detail-improvements.md` (completo)

### Próximos Passos:
- ⏳ Validação manual em produção
- ⏳ Testar cenário sem cookie
- ⏳ Testar cenário com cookie
- ⏳ Validar comissionamento no banco (após venda real)

---

## TAREFAS ANTERIORES CONCLUÍDAS (28/02/2026)

**CORREÇÃO: Acesso ao Painel de Afiliados no iOS Safari** ✅ CONCLUÍDA (28/02/2026)

### Problema Reportado:
Afiliados não conseguiam acessar o painel via iOS Safari, ficando presos em loop de redirecionamento.

### Diagnóstico:
4 problemas críticos identificados:
1. localStorage bloqueado no Safari iOS modo privado
2. Loop de redirecionamento no ProtectedRoute
3. Falta de fallback para cookies
4. Propriedades CSS problemáticas no Safari iOS

### Solução Implementada:

#### Fase 1 - Storage Híbrido (localStorage + Cookies) ✅
- ✅ Task 1.1: StorageHelper criado (`src/utils/storage-helper.ts`)
- ✅ Task 1.2: admin-auth.service.ts atualizado (12 ocorrências)
- ✅ Task 1.3: customer-auth.service.ts atualizado (16 ocorrências)
- ✅ Task 1.4: api.service.ts atualizado (3 ocorrências)
- ✅ Task 1.5: AffiliateDashboardLayout.tsx atualizado (4 ocorrências)

#### Fase 2 - Detecção de Loop ✅
- ✅ Task 2.1: ProtectedRoute.tsx com detecção de loop
- ✅ Task 2.2: CustomerProtectedRoute.tsx com detecção de loop

#### Fase 3 - Fixes CSS para Safari iOS ✅
- ✅ Task 3.1: safari-fixes.css criado
- ✅ Task 3.2: Importado no main.tsx

### Evidências:
- ✅ getDiagnostics: 0 erros em todos os arquivos
- ✅ Build: passou sem erros
- ✅ Cookies com flags de segurança (Secure, SameSite=Strict)
- ✅ Fallback transparente (usuário não percebe diferença)
- ✅ Mensagem de erro clara se houver problema

### Commit:
- Hash: (pendente push)
- Mensagem: "fix: Corrige acesso ao painel de afiliados no iOS Safari"

### Próximos Passos:
- ⏳ Push para produção
- ⏳ Validação manual no iPhone real
- ⏳ Teste em Safari iOS modo privado
- ⏳ Verificar URLs permitidas no Supabase Dashboard

---

## TAREFAS ANTERIORES CONCLUÍDAS (28/02/2026)

**IMPLEMENTAÇÃO DE REGRAS ESPECIAIS SHOW ROOM: FASE 3 CONCLUÍDA** ✅

### Fase 0: Preparação do Banco ✅ CONCLUÍDA (27/02/2026)

- **Migration criada:** `supabase/migrations/20260227120000_create_show_room_purchases.sql`
- **Tabela:** `show_room_purchases` criada com sucesso
- **Constraint:** `unique_affiliate_product` (garante 1 compra por logista por produto)
- **Índices:** 5 índices criados para performance
- **RLS:** 4 políticas criadas (logistas, admins, system, delete)
- **Validações:** Todas passaram ✅
- **Commit:** `5759c83`

### Fase 1: Controle de Compras por Logista ✅ CONCLUÍDA (27/02/2026)

**Task 1.1 - Frontend (ShowRow.tsx):**
- ✅ Função `checkIfAlreadyPurchased()` implementada
- ✅ Badge "Já adquirido" para produtos comprados
- ✅ Botão desabilitado se já comprou
- ✅ Tooltip explicativo

**Task 1.2 - Backend (checkout.js):**
- ✅ Validação de produtos Show Room
- ✅ Verificação de compras anteriores
- ✅ Limite de 1 unidade por produto
- ✅ Retorna erro 400 se já comprou

**Task 1.3 - Webhook (webhook-asaas.js):**
- ✅ Função `registerShowRoomPurchase()`
- ✅ Registro automático ao confirmar pagamento
- ✅ Tratamento de duplicações
- ✅ Logs detalhados

**Commit:** `2ee54fe`

### Fase 2: Comissionamento Diferenciado ✅ CONCLUÍDA (27/02/2026)

**Task 2.1 - Comissionamento Show Room:**
- ✅ Função `checkIfShowRoomOrder()` para detectar produtos Show Room
- ✅ Lógica diferenciada: 90% Fábrica + 5% Renum + 5% JB
- ✅ Sem comissões para N1/N2/N3
- ✅ Apenas 2 registros de comissão (gestores)
- ✅ Metadata `is_show_room: true`
- ✅ Logs detalhados para auditoria
- ✅ Early return para não processar fluxo normal

**Commit:** `298ecc9`

### Fase 3: Frete Grátis e UI/UX ✅ CONCLUÍDA (28/02/2026)

**Task 3.1 - Frete Grátis (checkout.js):**
- ✅ Variável `isFreeShipping` criada
- ✅ Frete zerado quando `hasShowRoomProduct === true`
- ✅ Flag `freeShipping` adicionada em ambos os registros de pagamento
- ✅ Logs detalhados: "🚚 Frete grátis aplicado para produto Show Room"

**Task 3.2 - Ocultar Card de Indicação (AffiliateAwareCheckout.tsx):**
- ✅ Flag `isShowRoomProduct` criada (detecta SKU com "SHOW-")
- ✅ Card de indicação oculto com `{referralInfo && !isShowRoomProduct && ...}`
- ✅ Alert laranja adicionado explicando regras Show Room
- ✅ Renderização condicional funcionando

**Task 3.3 - Badges Visuais:**
- ✅ Badge "Show Room" verde no resumo de frete
- ✅ Alert laranja explicativo para produtos Show Room
- ✅ Badge "Já adquirido" já implementado no ShowRow.tsx (Fase 1)
- ✅ getDiagnostics: 0 erros

**Commit:** (pendente)

### Próxima Fase: Fase 4 - Testes e Validação

**Objetivo:** Validar fluxo completo e testes de regressão

**Tasks:**
1. Testar primeira compra Show Room
2. Testar tentativa de compra duplicada
3. Testar compra de múltiplos modelos
4. Validar comissões no banco
5. Testes de regressão (produtos normais)

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
