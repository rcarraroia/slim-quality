# 📊 ANÁLISE: LIBERAÇÃO DE VITRINE PARA AFILIADOS INDIVIDUAIS

**Data:** 03/03/2026  
**Solicitante:** Renato Carraro  
**Analista:** Kiro AI

---

## 🎯 OBJETIVO DA ANÁLISE

Avaliar a viabilidade de liberar o módulo de vitrine para afiliados individuais, permitindo cobrar mensalidade deles também, sem alterar o sistema existente para logistas.

---

## 📋 SITUAÇÃO ATUAL

### **Modelo de Negócio Atual**

| Tipo de Afiliado | Taxa de Adesão | Mensalidade | Acesso à Vitrine | Acesso ao Agente IA |
|------------------|----------------|-------------|------------------|---------------------|
| **Individual** | ✅ Sim (R$ 50) | ❌ Não | ❌ Não | ❌ Não |
| **Logista** | ✅ Sim (R$ 100) | ✅ Sim (R$ 97) | ✅ Sim | ✅ Sim (Bundle) |

### **Regras de Negócio Atuais**

1. **Afiliados Individuais:**
   - Pagam apenas taxa de adesão única
   - Não têm acesso à vitrine pública
   - Não têm acesso ao agente IA
   - Podem indicar e ganhar comissões

2. **Logistas:**
   - Pagam taxa de adesão + mensalidade recorrente
   - Têm acesso à vitrine pública (Bundle)
   - Têm acesso ao agente IA (Bundle)
   - Podem indicar e ganhar comissões
   - Vitrine é bloqueada automaticamente se inadimplente

---

## 🏗️ ARQUITETURA ATUAL DO MÓDULO DE VITRINE

### **1. Tabela `store_profiles`**

**Estrutura:**
```sql
CREATE TABLE store_profiles (
  id UUID PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  store_name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE,
  description TEXT,
  
  -- Endereço
  street VARCHAR,
  number VARCHAR,
  city VARCHAR NOT NULL,
  state CHAR(2) NOT NULL,
  location GEOGRAPHY(POINT, 4326), -- PostGIS
  
  -- Contatos
  phone VARCHAR,
  whatsapp VARCHAR,
  email VARCHAR,
  website VARCHAR,
  instagram VARCHAR,
  facebook VARCHAR,
  tiktok VARCHAR,
  
  -- Imagens
  logo_url TEXT,
  banner_url TEXT,
  
  -- Horário de funcionamento
  business_hours JSONB,
  
  -- CONTROLE DE VISIBILIDADE (CRÍTICO)
  is_visible_in_showcase BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);
```

**Índices:**
- `idx_store_profiles_affiliate_id` - Busca por afiliado
- `idx_store_profiles_slug` - Busca por slug (URL amigável)
- `idx_store_profiles_visible` - Busca por lojas visíveis
- `idx_store_profiles_city_state` - Busca por localização
- `idx_store_profiles_location` (GIST) - Busca por proximidade geográfica

### **2. Políticas RLS (Row Level Security)**

**Política 1: Logistas podem ver e editar apenas seu próprio perfil**
```sql
CREATE POLICY "Logistas can view own profile"
  ON store_profiles FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type = 'logista'  -- ⚠️ RESTRIÇÃO ATUAL
      AND deleted_at IS NULL
    )
  );
```

**Política 2: Público pode ver lojas visíveis**
```sql
CREATE POLICY "Public can view visible stores"
  ON store_profiles FOR SELECT
  USING (
    is_visible_in_showcase = true 
    AND deleted_at IS NULL
  );
```

**⚠️ PROBLEMA IDENTIFICADO:**
As políticas RLS atualmente verificam `affiliate_type = 'logista'`, impedindo que afiliados individuais acessem a tabela `store_profiles`.

### **3. Backend - API `store-profiles.js`**

**Endpoints:**
- `GET/POST ?action=profile` - Gerenciar perfil (autenticado)
- `GET ?action=showcase` - Listar lojas visíveis (público)
- `GET ?action=nearby` - Buscar lojas próximas (público)
- `GET ?action=by-slug` - Buscar loja por slug (público)

**Lógica de Visibilidade:**
```javascript
// Buscar lojas visíveis
.eq('is_visible_in_showcase', true)
```

**⚠️ PROBLEMA IDENTIFICADO:**
Não há validação de `affiliate_type` no backend. A restrição está apenas no RLS.

### **4. Frontend - Painel do Afiliado**

**Página:** `src/pages/afiliados/dashboard/Loja.tsx`

**Lógica de Ativação de Vitrine:**
```typescript
const handleVisibilityToggle = async (checked: boolean) => {
  if (checked) {
    // Ativar vitrine - verificar assinatura
    if (!hasActiveSubscription) {
      // Exibir modal de confirmação
      setShowSubscriptionModal(true);
    } else {
      // Já tem assinatura, ativar e persistir no banco
      setFormData({ ...formData, is_visible_in_showcase: true });
      await storeFrontendService.saveProfile({
        ...formData,
        is_visible_in_showcase: true
      });
    }
  }
};
```

**Fluxo de Assinatura:**
1. Logista tenta ativar vitrine
2. Sistema verifica se tem assinatura ativa (`payment_status === 'active'`)
3. Se não tem, exibe modal para criar assinatura
4. Se tem, ativa vitrine imediatamente

**⚠️ PROBLEMA IDENTIFICADO:**
A página `Loja.tsx` não verifica `affiliate_type`. Qualquer afiliado autenticado pode acessar, mas o RLS bloqueia.

### **5. Webhook Asaas - Bundle Activation**

**Função:** `activateTenantAndVitrine()`

```javascript
async function activateTenantAndVitrine(supabase, affiliateId) {
  // 1. Criar/atualizar tenant (agente IA)
  await supabase.from('multi_agent_tenants').upsert({
    affiliate_id: affiliateId,
    status: 'active',
    whatsapp_status: 'inactive'
  });
  
  // 2. Ativar vitrine
  await supabase.from('store_profiles').update({ 
    is_visible: true  // ⚠️ CAMPO ERRADO (deveria ser is_visible_in_showcase)
  }).eq('affiliate_id', affiliateId);
}
```

**Detecção de Bundle:**
```javascript
async function detectBundlePayment(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('affiliate_type')
    .eq('id', affiliateId)
    .single();
  
  return affiliate.affiliate_type === 'logista';  // ⚠️ APENAS LOGISTAS
}
```

**⚠️ PROBLEMA IDENTIFICADO:**
O webhook só ativa bundle para logistas. Individuais não entram nesse fluxo.

### **6. Edge Function - Bloqueio por Inadimplência**

**Função:** `handlePaymentOverdue()`

```typescript
if (affiliate?.affiliate_type === 'logista' && affiliate.show_row) {
  await supabase
    .from('store_profiles')
    .update({
      is_visible_in_showcase: false,  // ✅ CAMPO CORRETO
      updated_at: new Date().toISOString()
    })
    .eq('affiliate_id', affiliateId);
}
```

**⚠️ PROBLEMA IDENTIFICADO:**
Bloqueio de vitrine só funciona para logistas. Individuais não são verificados.

---

## 🔍 ANÁLISE DE IMPACTO

### **1. Banco de Dados**

#### ✅ **Pontos Positivos:**
- Tabela `store_profiles` já existe e está estruturada
- Campo `is_visible_in_showcase` já controla visibilidade
- Índices já estão otimizados
- Soft delete já implementado

#### ⚠️ **Pontos de Atenção:**
- **RLS Policies:** Precisam ser atualizadas para permitir individuais
- **Constraint:** Não há constraint impedindo individuais de ter perfil
- **Dados:** Nenhum afiliado individual tem perfil hoje (zero impacto)

#### 🔧 **Alterações Necessárias:**
```sql
-- 1. Atualizar política de SELECT
DROP POLICY "Logistas can view own profile" ON store_profiles;

CREATE POLICY "Affiliates can view own profile"
  ON store_profiles FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')  -- ✅ PERMITIR AMBOS
      AND deleted_at IS NULL
    )
  );

-- 2. Atualizar política de UPDATE
DROP POLICY "Logistas can update own profile" ON store_profiles;

CREATE POLICY "Affiliates can update own profile"
  ON store_profiles FOR UPDATE
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')  -- ✅ PERMITIR AMBOS
      AND deleted_at IS NULL
    )
  );

-- 3. Atualizar política de INSERT
DROP POLICY "Logistas can insert own profile" ON store_profiles;

CREATE POLICY "Affiliates can insert own profile"
  ON store_profiles FOR INSERT
  WITH CHECK (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')  -- ✅ PERMITIR AMBOS
      AND deleted_at IS NULL
    )
  );
```

**Risco:** 🟢 BAIXO - Apenas atualização de políticas RLS

---

### **2. Backend - API**

#### ✅ **Pontos Positivos:**
- API `store-profiles.js` não valida `affiliate_type`
- Lógica de visibilidade já usa `is_visible_in_showcase`
- Endpoints públicos já funcionam corretamente

#### ⚠️ **Pontos de Atenção:**
- Webhook `activateTenantAndVitrine()` usa campo errado (`is_visible` ao invés de `is_visible_in_showcase`)
- Função `detectBundlePayment()` só retorna true para logistas

#### 🔧 **Alterações Necessárias:**

**1. Corrigir campo no webhook:**
```javascript
// api/webhook-assinaturas.js - linha 404
async function activateTenantAndVitrine(supabase, affiliateId) {
  // ...
  
  // 2. Ativar vitrine
  await supabase.from('store_profiles').update({ 
    is_visible_in_showcase: true,  // ✅ CORRIGIDO
    updated_at: new Date().toISOString()
  }).eq('affiliate_id', affiliateId);
}
```

**2. Atualizar detecção de bundle:**
```javascript
// api/webhook-assinaturas.js - linha 320
async function detectBundlePayment(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('affiliate_type, payment_status')
    .eq('id', affiliateId)
    .single();
  
  // ✅ NOVO: Verificar se tem assinatura ativa (logista OU individual)
  return affiliate.payment_status === 'active';
}
```

**3. Criar função específica para vitrine:**
```javascript
// api/webhook-assinaturas.js - NOVA FUNÇÃO
async function activateVitrineOnly(supabase, affiliateId) {
  console.log('[Vitrine] 🚀 Ativando vitrine:', affiliateId);
  
  // Ativar vitrine
  const { error } = await supabase
    .from('store_profiles')
    .update({ 
      is_visible_in_showcase: true,
      updated_at: new Date().toISOString()
    })
    .eq('affiliate_id', affiliateId);
  
  if (error) {
    console.error('[Vitrine] ⚠️ Erro ao ativar vitrine:', error);
  } else {
    console.log('[Vitrine] ✅ Vitrine ativada:', affiliateId);
  }
}
```

**Risco:** 🟢 BAIXO - Alterações pontuais e isoladas

---

### **3. Frontend - Painel do Afiliado**

#### ✅ **Pontos Positivos:**
- Página `Loja.tsx` já existe e está funcional
- Lógica de assinatura já implementada
- Modal de confirmação já existe
- Integração com API de pagamentos já funciona

#### ⚠️ **Pontos de Atenção:**
- Menu lateral só exibe "Loja" para logistas
- Layout pode precisar de ajustes visuais
- Produtos Show Room são exclusivos de logistas

#### 🔧 **Alterações Necessárias:**

**1. Atualizar menu lateral:**
```typescript
// src/layouts/AffiliateDashboardLayout.tsx
const menuItems = [
  { icon: Home, label: 'Início', path: '/afiliados/dashboard' },
  { icon: Users, label: 'Rede', path: '/afiliados/dashboard/rede' },
  { icon: DollarSign, label: 'Comissões', path: '/afiliados/dashboard/comissoes' },
  { icon: CreditCard, label: 'Pagamentos', path: '/afiliados/dashboard/pagamentos' },
  
  // ✅ NOVO: Exibir para todos os afiliados
  { 
    icon: Store, 
    label: 'Loja', 
    path: '/afiliados/dashboard/loja',
    // Remover verificação de affiliate_type
  },
  
  // ⚠️ MANTER: Show Room apenas para logistas
  ...(affiliateType === 'logista' ? [{
    icon: Package,
    label: 'Show Room',
    path: '/afiliados/dashboard/show-room'
  }] : [])
];
```

**2. Atualizar página Loja.tsx:**
```typescript
// src/pages/afiliados/dashboard/Loja.tsx
useEffect(() => {
  async function loadSubscriptionProduct() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'adesao_afiliado')
      .eq('eligible_affiliate_type', affiliateType)  // ✅ Buscar produto correto
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      setSubscriptionProduct(data);
    }
  }

  loadSubscriptionProduct();
}, [affiliateType]);
```

**3. Adicionar badge visual:**
```typescript
// src/pages/afiliados/dashboard/Loja.tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Configurações da Loja</CardTitle>
      {affiliateType === 'individual' && (
        <Badge variant="secondary">Afiliado Individual</Badge>
      )}
      {affiliateType === 'logista' && (
        <Badge variant="default">Logista</Badge>
      )}
    </div>
  </CardHeader>
</Card>
```

**Risco:** 🟢 BAIXO - Alterações visuais e de lógica simples

---

### **4. Edge Function - Bloqueio por Inadimplência**

#### ✅ **Pontos Positivos:**
- Lógica de bloqueio já existe
- Campo correto (`is_visible_in_showcase`) já é usado
- Notificações já são enviadas

#### ⚠️ **Pontos de Atenção:**
- Bloqueio só funciona para logistas atualmente
- Mensagem de notificação menciona "vitrine" apenas para logistas

#### 🔧 **Alterações Necessárias:**

```typescript
// supabase/functions/process-affiliate-webhooks/index.ts
async function handlePaymentOverdue(supabase, payment) {
  // ...
  
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('affiliate_type, show_row')
    .eq('id', affiliateId)
    .single();
  
  // ✅ NOVO: Bloquear vitrine para TODOS os afiliados com assinatura
  if (affiliate) {
    await supabase
      .from('store_profiles')
      .update({
        is_visible_in_showcase: false,
        updated_at: new Date().toISOString()
      })
      .eq('affiliate_id', affiliateId);
  }
  
  // Notificação
  await supabase.from('notifications').insert({
    affiliate_id: affiliateId,
    type: 'overdue',
    title: 'Pagamento em atraso',
    message: `Seu pagamento de R$ ${(payment.value).toFixed(2)} está em atraso há ${daysOverdue} dias. Sua vitrine foi temporariamente desativada. Regularize para reativá-la.`,
    link: '/afiliados/dashboard/pagamentos'
  });
}
```

**Risco:** 🟢 BAIXO - Apenas remoção de verificação de tipo

---

### **5. Produtos de Adesão**

#### ✅ **Pontos Positivos:**
- Estrutura de produtos já suporta `eligible_affiliate_type`
- Produtos Individual e Logista já existem
- Sistema de mensalidade já implementado
- **Valores são configuráveis no painel admin** (não hardcoded)

#### ⚠️ **Pontos de Atenção:**
- Produto de adesão individual precisa ter `has_monthly_fee = true`
- Admin define valores via painel (sem necessidade de SQL)

#### 🔧 **Alterações Necessárias:**

**1. Atualizar produto de adesão individual (via painel admin):**
- Acessar painel admin → Produtos
- Editar produto "Adesão Individual"
- Marcar "Tem mensalidade recorrente"
- Definir valor da mensalidade
- Salvar

**OU via SQL (se preferir):**
```sql
UPDATE products
SET 
  has_monthly_fee = true,
  monthly_fee_cents = 6900  -- R$ 69,00 (sugestão com IA incluso)
WHERE 
  category = 'adesao_afiliado'
  AND eligible_affiliate_type = 'individual';
```

**2. Atualizar produto logista (aumentar valor com IA):**
```sql
UPDATE products
SET 
  monthly_fee_cents = 12900  -- R$ 129,00 (sugestão com IA + Show Room)
WHERE 
  category = 'adesao_afiliado'
  AND eligible_affiliate_type = 'logista';
```

**Risco:** 🟢 BAIXO - Apenas atualização de produto existente

---

## 📊 RESUMO DE RISCOS

| Componente | Alteração | Risco | Impacto em Logistas |
|------------|-----------|-------|---------------------|
| **RLS Policies** | Atualizar para permitir individuais | 🟢 BAIXO | ✅ ZERO |
| **API Backend** | Corrigir campo e adicionar função | 🟢 BAIXO | ✅ ZERO |
| **Frontend** | Atualizar menu e lógica | 🟢 BAIXO | ✅ ZERO |
| **Edge Function** | Remover verificação de tipo | 🟢 BAIXO | ✅ ZERO |
| **Produtos** | Criar mensalidade individual | 🟢 BAIXO | ✅ ZERO |

**RISCO GERAL:** 🟢 **BAIXO**

---

## ✅ VIABILIDADE

### **É POSSÍVEL IMPLEMENTAR SEM ALTERAR O SISTEMA EXISTENTE?**

**✅ SIM, É TOTALMENTE VIÁVEL.**

**Motivos:**
1. ✅ Arquitetura já suporta múltiplos tipos de afiliados
2. ✅ Tabela `store_profiles` não tem restrição de tipo
3. ✅ Sistema de mensalidade já existe e funciona
4. ✅ Alterações são pontuais e isoladas
5. ✅ Zero impacto em logistas existentes
6. ✅ Nenhum dado será perdido ou alterado

---

## 🎯 PLANO DE IMPLEMENTAÇÃO

### **Fase 1: Banco de Dados (1 dia)**

**Tasks:**
1. ✅ Atualizar RLS policies para permitir individuais
2. ✅ Atualizar produto de adesão individual (via painel admin ou SQL)
3. ✅ Validar políticas com testes

**Migration:**
```sql
-- 20260303000000_enable_vitrine_and_agent_for_individuals.sql
```

**Nota:** Valores de mensalidade são configurados no painel admin, não em migration.

---

### **Fase 2: Backend (1 dia)**

**Tasks:**
1. ✅ Corrigir campo `is_visible` → `is_visible_in_showcase` no webhook
2. ✅ Atualizar `detectBundlePayment()` para verificar `payment_status` (não apenas logista)
3. ✅ Renomear `activateTenantAndVitrine()` → `activateBundle()` (mais genérico)
4. ✅ Remover verificação de `affiliate_type === 'logista'` (permitir individuais)
5. ✅ Atualizar Edge Function para bloquear vitrine/agente de TODOS inadimplentes
6. ✅ Validar com testes

**Arquivos:**
- `api/webhook-assinaturas.js`
- `supabase/functions/process-affiliate-webhooks/index.ts`

**Lógica:**
- Pagamento confirmado → Ativa vitrine + agente (para TODOS)
- Inadimplência → Bloqueia vitrine + agente (para TODOS)
- Show Room → Continua exclusivo para logistas

---

### **Fase 3: Frontend (1 dia)**

**Tasks:**
1. ✅ Atualizar menu lateral para exibir "Loja" para todos
2. ✅ Adicionar badge visual (Individual vs Logista)
3. ✅ Atualizar lógica de carregamento de produto
4. ✅ Validar fluxo de assinatura
5. ✅ Testes E2E

**Arquivos:**
- `src/layouts/AffiliateDashboardLayout.tsx`
- `src/pages/afiliados/dashboard/Loja.tsx`

---

### **Fase 4: Testes e Validação (1 dia)**

**Tasks:**
1. ✅ Testar cadastro de afiliado individual
2. ✅ Testar ativação de vitrine com mensalidade
3. ✅ Testar bloqueio por inadimplência
4. ✅ Testar reativação após pagamento
5. ✅ Validar que logistas não foram afetados
6. ✅ Testes de regressão

---

## 💰 MODELO DE NEGÓCIO PROPOSTO

### **⚠️ IMPORTANTE: Valores Dinâmicos**

Os valores de adesão e mensalidade são **configurados no painel admin** através dos produtos da categoria `adesao_afiliado`. Não há valores hardcoded no código.

**Campos do produto:**
- `entry_fee_cents` - Taxa de adesão
- `monthly_fee_cents` - Mensalidade
- `eligible_affiliate_type` - Tipo de afiliado (individual ou logista)

---

### **🎯 ESTRATÉGIA: Agente IA como Upgrade ou Incluso?**

#### **Opção A: Agente IA como Upgrade Opcional** 💡

**Estrutura:**
```
Individual Básico (Vitrine)
├─ Taxa de adesão: R$ X
├─ Mensalidade: R$ Y
├─ ✅ Vitrine pública
├─ ❌ Agente IA
└─ ❌ Show Room

Individual + Agente IA (Upgrade)
├─ Taxa de adesão: R$ X
├─ Mensalidade: R$ Y + R$ Z (upgrade)
├─ ✅ Vitrine pública
├─ ✅ Agente IA
└─ ❌ Show Room

Logista Completo
├─ Taxa de adesão: R$ W
├─ Mensalidade: R$ K
├─ ✅ Vitrine pública
├─ ✅ Agente IA (incluso)
└─ ✅ Show Room (exclusivo)
```

**Vantagens:**
- ✅ Flexibilidade para o cliente (escolhe o que precisa)
- ✅ Entrada mais acessível (vitrine sem agente)
- ✅ Upsell claro (upgrade para agente)
- ✅ Diferenciação de 3 níveis (Individual, Individual+IA, Logista)

**Desvantagens:**
- ⚠️ Mais complexidade no sistema (gerenciar 2 assinaturas)
- ⚠️ Precisa criar nova categoria de produto (`upgrade_agente`)
- ⚠️ Lógica de ativação mais complexa

**Implementação:**
- Criar tabela `affiliate_upgrades` para controlar upgrades ativos
- Criar categoria `upgrade_agente` em products
- Webhook precisa detectar upgrade e ativar tenant
- Frontend precisa exibir opção de upgrade

---

#### **Opção B: Agente IA Incluso nos Planos (RECOMENDADO)** ⭐

**Estrutura:**
```
Individual com Vitrine + Agente
├─ Taxa de adesão: R$ X (aumentado)
├─ Mensalidade: R$ Y (aumentado)
├─ ✅ Vitrine pública
├─ ✅ Agente IA (incluso)
└─ ❌ Show Room

Logista Completo
├─ Taxa de adesão: R$ W (aumentado)
├─ Mensalidade: R$ K (aumentado)
├─ ✅ Vitrine pública
├─ ✅ Agente IA (incluso)
└─ ✅ Show Room (exclusivo)
```

**Vantagens:**
- ✅ **Percepção de valor muito maior** (IA é diferencial competitivo)
- ✅ Simplicidade (1 assinatura = tudo incluso)
- ✅ Menos complexidade técnica
- ✅ Mais fácil de vender ("Vitrine + Atendimento IA")
- ✅ Diferenciação clara: Individual (sem Show Room) vs Logista (com Show Room)

**Desvantagens:**
- ⚠️ Entrada menos acessível (valor maior)
- ⚠️ Cliente paga por IA mesmo se não usar muito

**Implementação:**
- Webhook já ativa tenant para logistas (função `activateTenantAndVitrine`)
- Apenas estender para individuais também
- Zero complexidade adicional

---

### **🎯 RECOMENDAÇÃO: Opção B (Agente IA Incluso)**

**Motivos:**

1. **Percepção de Valor** 💎
   - Agente IA é um diferencial competitivo ENORME
   - Clientes pagam mais por automação e atendimento 24/7
   - "Vitrine + Atendimento IA" é muito mais atrativo que "só vitrine"

2. **Simplicidade Técnica** 🔧
   - Webhook já tem lógica de ativação de tenant
   - Apenas remover verificação de `affiliate_type === 'logista'`
   - Zero complexidade adicional

3. **Diferenciação Clara** 🎯
   - **Individual:** Vitrine + Agente IA
   - **Logista:** Vitrine + Agente IA + Show Room (exclusivo)
   - Show Room continua sendo o diferencial premium

4. **Facilidade de Venda** 💰
   - Mais fácil explicar: "Você tem vitrine E atendimento automático"
   - Menos fricção na decisão de compra
   - Upsell natural: "Quer Show Room? Vire logista"

---

### **Novo Modelo Proposto (Opção B):**

| Tipo de Afiliado | Taxa de Adesão | Mensalidade | Vitrine | Agente IA | Show Room |
|------------------|----------------|-------------|---------|-----------|-----------|
| **Individual** | Configurável* | Configurável* | ✅ Sim | ✅ Sim | ❌ Não |
| **Logista** | Configurável* | Configurável* | ✅ Sim | ✅ Sim | ✅ Sim |

*Valores definidos no painel admin (produtos `adesao_afiliado`)

### **Diferenciação:**

**Afiliado Individual:**
- ✅ Vitrine pública
- ✅ Perfil de loja
- ✅ Produtos na vitrine
- ✅ **Agente IA (atendimento 24/7)** ⭐
- ❌ Sem Show Room

**Logista:**
- ✅ Vitrine pública
- ✅ Perfil de loja
- ✅ Produtos na vitrine
- ✅ **Agente IA (atendimento 24/7)** ⭐
- ✅ **Show Room (exclusivo)** 🏆

**Diferencial Premium:** Show Room continua exclusivo para logistas

---

## 🎯 RECOMENDAÇÃO FINAL

**✅ RECOMENDO IMPLEMENTAR COM AGENTE IA INCLUSO (OPÇÃO B).**

**Motivos:**
1. ✅ **Baixo risco** - Alterações pontuais e isoladas
2. ✅ **Zero impacto** - Logistas não são afetados
3. ✅ **Rápido** - 4 dias de implementação
4. ✅ **Receita adicional** - Novos assinantes individuais
5. ✅ **Arquitetura pronta** - Sistema já suporta
6. ✅ **Diferenciação clara** - Show Room continua exclusivo
7. ✅ **Percepção de valor alta** - Vitrine + IA é muito atrativo
8. ✅ **Simplicidade** - 1 assinatura = tudo incluso (exceto Show Room)

**Diferencial Premium:**
- Show Room continua sendo o diferencial exclusivo dos logistas
- Upsell natural: "Quer Show Room? Vire logista"

**Próximos Passos:**
1. ✅ Aprovar modelo: Vitrine + Agente IA para todos (Show Room exclusivo logista)
2. ✅ Definir valores no painel admin (sugestão: Individual R$ 69, Logista R$ 129)
3. ✅ Criar spec detalhada
4. ✅ Implementar em 4 fases
5. ✅ Validar com testes
6. ✅ Deploy em produção

---

## 💡 SUGESTÃO DE VALORES (Configurar no Painel Admin)

**Com Agente IA Incluso:**

| Tipo | Adesão | Mensalidade | Inclui |
|------|--------|-------------|--------|
| **Individual** | R$ 50 | **R$ 69** | Vitrine + Agente IA |
| **Logista** | R$ 100 | **R$ 129** | Vitrine + Agente IA + Show Room |

**Justificativa:**
- Agente IA aumenta percepção de valor (atendimento 24/7)
- Show Room continua sendo diferencial premium (+R$ 60/mês)
- Valores competitivos para o mercado

---

**Aguardo sua aprovação para prosseguir com a implementação.**
