# CHANGELOG - Spec Vitrine + Agente IA

## [2.0.0] - 03/03/2026 - MODELO DE 3 PLANOS

### 🎯 Mudança Estratégica

**De:** 2 planos (Individual COM mensalidade vs Logista)  
**Para:** 3 planos (Individual SEM vs Individual COM vs Logista)

### 📋 Alterações na Spec

#### **Requirements.md** ✅ ATUALIZADO
- **Antes:** 10 requirements, 67 acceptance criteria
- **Depois:** 14 requirements, 95 acceptance criteria

**Novos Requirements:**
1. ✅ Requirement 1: Campo `has_subscription` no banco
2. ✅ Requirement 2: Checkbox de mensalidade no cadastro
3. ✅ Requirement 5: Página de upgrade para individuais básicos
4. ✅ Requirement 13: Comissionamento de mensalidades

**Requirements Atualizados:**
- Requirement 3: Acesso ao módulo de vitrine (agora verifica `has_subscription`)
- Requirement 4: Ativação de vitrine (agora verifica `has_subscription`)
- Requirement 6: Bloqueio por inadimplência (agora verifica `has_subscription`)
- Requirement 7: Correção de campo no webhook (agora verifica `has_subscription`)
- Requirement 8: Diferenciação visual (3 badges: Básico, Premium, Logista)
- Requirement 9: Configuração de produtos (3 produtos ao invés de 2)

#### **Design.md** ⏳ AGUARDANDO ATUALIZAÇÃO
- Precisa refletir campo `has_subscription`
- Precisa incluir checkbox no cadastro
- Precisa incluir página de upgrade
- Precisa atualizar diagramas de fluxo

#### **Tasks.md** ⏳ AGUARDANDO ATUALIZAÇÃO
- Precisa adicionar tasks de migration (campo `has_subscription`)
- Precisa adicionar tasks de checkbox no cadastro
- Precisa adicionar tasks de página de upgrade
- Estimativa: +5 tasks (32 total ao invés de 27)

### 🔧 Decisão Técnica

**Campo Escolhido:** `has_subscription` (booleano)

**Motivos:**
- ✅ Semântica clara e autoexplicativa
- ✅ Zero impacto em 25 individuais existentes
- ✅ Implementação simples (1 campo booleano)
- ✅ Upgrade fácil (`UPDATE has_subscription = true`)
- ✅ Compatível com lógica existente
- ✅ Baixo risco de bugs

**Alternativas Rejeitadas:**
- ❌ Usar `payment_status` existente (confuso, quebra lógica)
- ❌ Criar novo valor no ENUM `affiliate_type` (complexo, invasivo)

### 📊 Impacto

**Banco de Dados:**
- ✅ 1 campo novo: `has_subscription BOOLEAN DEFAULT false`
- ✅ 1 índice novo: `idx_affiliates_has_subscription`
- ✅ 1 produto novo: Individual COM mensalidade
- ✅ 25 individuais existentes: `has_subscription = false` (correto)
- ✅ 1 logista existente: `has_subscription = true` (atualizado)

**Backend:**
- ✅ Webhook verifica: `has_subscription = true AND payment_status = 'active'`
- ✅ Edge function verifica: `has_subscription = true`
- ✅ API de upgrade criada

**Frontend:**
- ✅ Checkbox no cadastro
- ✅ Menu "Loja" condicional (`has_subscription = true`)
- ✅ Página de upgrade para básicos
- ✅ 3 badges: Básico, Premium, Logista

**Comissionamento:**
- ✅ Mensalidades geram comissão
- ✅ Modelo: 10% Slim + 90% Renum/JB (quando sem rede)

### 🎯 Próximos Passos

1. ⏳ Atualizar `design.md` com novo modelo
2. ⏳ Atualizar `tasks.md` com novas tasks
3. ⏳ Revisar e aprovar spec completa
4. ⏳ Iniciar implementação

---

## [1.0.0] - 03/03/2026 - SPEC INICIAL

### 📋 Spec Criada

- ✅ Requirements.md (10 requirements, 67 acceptance criteria)
- ✅ Design.md (10 seções, arquitetura completa)
- ✅ Tasks.md (27 tasks, 4 fases, 4 dias)
- ✅ .config.kiro (workflow configuration)

### 🎯 Modelo Original

**2 Planos:**
1. Individual COM mensalidade: Vitrine + Agente IA
2. Logista: Vitrine + Agente IA + Show Room

**Decisão:** Agente IA incluso em todos os planos

### 📊 Análise

- ✅ Análise de viabilidade completa
- ✅ Risco: BAIXO
- ✅ Zero impacto em logistas
- ✅ Arquitetura já suporta

---

**Última Atualização:** 03/03/2026  
**Status:** Requirements.md atualizado, aguardando design.md e tasks.md
