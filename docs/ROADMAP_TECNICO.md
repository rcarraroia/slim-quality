# 🗄️ ROADMAP TÉCNICO - SLIM QUALITY BACKEND

## 📋 Visão Geral

Este documento detalha a evolução técnica do banco de dados e arquitetura do sistema ao longo dos 10 sprints, com foco em **evitar retrabalho** e garantir **preparações críticas**.

---

## 🎯 Princípios Fundamentais

### 1. Estrutura Evolutiva
- Criar campos preparatórios desde o início
- Evitar migrations corretivas
- Pensar no futuro ao criar tabelas

### 2. Preparações Críticas
- Sprint 1 prepara para Sprint 4 (afiliados)
- Sprint 3 prepara para Sprint 4 (comissões)
- Cada sprint deixa hooks para os próximos

### 3. Validação Contínua
- Testar estrutura ao final de cada sprint
- Validar que preparações estão corretas
- Ajustar antes de avançar

---

## 📊 Evolução do Banco de Dados por Sprint

### Sprint 0: Fundação

**Objetivo:** Criar estrutura base e funções auxiliares

**Migrations:**
```sql
-- 20250101000000_initial_setup.sql
```

**Criar:**
1. Função `update_updated_at_column()`
2. Extensões necessárias
3. Schema `public` configurado


**Código Completo:**
```sql
-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

**Tabelas:** 0  
**Total Acumulado:** 0 tabelas

---

### Sprint 1: Autenticação e Usuários

**Objetivo:** Sistema de auth + **PREPARAÇÃO PARA SPRINT 4**

**Migrations:**
```sql
-- 20250102000000_create_profiles.sql
-- 20250102000001_create_user_roles.sql
```

**⚠️ ATENÇÃO CRÍTICA: Preparação para Afiliados**

**Tabela `profiles` (com campos preparatórios):**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  
  -- ⭐ PREPARAÇÃO PARA SPRINT 4 (Afiliados)
  wallet_id TEXT, -- Wallet ID do Asaas (null até virar afiliado)
  is_affiliate BOOLEAN DEFAULT FALSE, -- Flag de afiliado
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_profiles_email ON profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_is_affiliate ON profiles(is_affiliate) WHERE deleted_at IS NULL;

-- Trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Tabela `user_roles`:**
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor', 'afiliado', 'cliente')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);
```

**Tabelas Criadas:** 2  
**Total Acumulado:** 2 tabelas

**Validação de Saída:**
- [ ] Campo `wallet_id` existe em `profiles`
- [ ] Campo `is_affiliate` existe em `profiles`
- [ ] Índice em `is_affiliate` criado
- [ ] RLS funcionando

---

### Sprint 2: Produtos

**Objetivo:** Catálogo de produtos

**Migrations:**
```sql
-- 20250103000000_create_products.sql
-- 20250103000001_create_technologies.sql
-- 20250103000002_create_product_images.sql
-- 20250103000003_create_product_technologies.sql
-- 20250103000004_seed_products.sql
```

**Tabelas:**

1. **products**
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  dimensions TEXT, -- Ex: "138x188x28cm"
  weight DECIMAL(10,2), -- Em kg
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

2. **technologies**
3. **product_images**
4. **product_technologies** (N:N)

**Tabelas Criadas:** 4  
**Total Acumulado:** 6 tabelas

---

### Sprint 3: Vendas + Asaas

**Objetivo:** Sistema de vendas + **PREPARAÇÃO PARA SPRINT 4**

**Migrations:**
```sql
-- 20250104000000_create_orders.sql
-- 20250104000001_create_order_items.sql
-- 20250104000002_create_payments.sql
-- 20250104000003_create_shipping_addresses.sql
-- 20250104000004_create_asaas_transactions.sql
-- 20250104000005_create_asaas_webhook_logs.sql
```

**⚠️ ATENÇÃO CRÍTICA: Preparação para Comissões**

**Tabela `orders` (com campos preparatórios):**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  
  -- ⭐ PREPARAÇÃO PARA SPRINT 4 (Rastreamento de Afiliados)
  referral_code TEXT, -- Código de indicação usado
  affiliate_id UUID REFERENCES profiles(id), -- Afiliado N1 (se houver)
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
  ),
  
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_affiliate_id ON orders(affiliate_id) WHERE affiliate_id IS NOT NULL;
CREATE INDEX idx_orders_referral_code ON orders(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
```

**Tabela `asaas_webhook_logs` (preparada para extensão):**
```sql
CREATE TABLE asaas_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  payload JSONB NOT NULL,
  
  -- ⭐ PREPARAÇÃO PARA SPRINT 4
  commission_triggered BOOLEAN DEFAULT FALSE, -- Flag se acionou comissões
  commission_triggered_at TIMESTAMPTZ, -- Quando acionou
  
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_payment_id ON asaas_webhook_logs(payment_id);
CREATE INDEX idx_webhook_logs_order_id ON asaas_webhook_logs(order_id);
CREATE INDEX idx_webhook_logs_commission_triggered ON asaas_webhook_logs(commission_triggered);
```

**Tabelas Criadas:** 6  
**Total Acumulado:** 12 tabelas

**Validação de Saída:**
- [ ] Campo `referral_code` existe em `orders`
- [ ] Campo `affiliate_id` existe em `orders`
- [ ] Campo `commission_triggered` existe em `asaas_webhook_logs`
- [ ] Índices criados

---

### Sprint 4: Afiliados ⭐ CRÍTICO

**Objetivo:** Sistema completo de afiliados multinível

**Migrations:**
```sql
-- 20250105000000_create_affiliates.sql
-- 20250105000001_create_affiliate_network.sql
-- 20250105000002_create_referral_codes.sql
-- 20250105000003_create_referral_clicks.sql
-- 20250105000004_create_referral_conversions.sql
-- 20250105000005_create_commissions.sql
-- 20250105000006_create_commission_splits.sql
-- 20250105000007_create_commission_logs.sql
-- 20250105000008_create_asaas_wallets.sql
-- 20250105000009_update_profiles_affiliate_fields.sql
```

**Tabelas Principais:**

1. **affiliates**
```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id TEXT NOT NULL UNIQUE, -- Validado via Asaas API
  wallet_validated BOOLEAN DEFAULT FALSE,
  wallet_validated_at TIMESTAMPTZ,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'suspended', 'inactive')
  ),
  
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_commissions DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

2. **affiliate_network** (árvore genealógica)
```sql
CREATE TABLE affiliate_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3), -- N1, N2, N3
  path TEXT, -- Caminho na árvore (ex: "root.aff1.aff2")
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar ascendentes rapidamente
CREATE INDEX idx_affiliate_network_affiliate_id ON affiliate_network(affiliate_id);
CREATE INDEX idx_affiliate_network_parent_id ON affiliate_network(parent_id);
CREATE INDEX idx_affiliate_network_path ON affiliate_network USING gin(path gin_trgm_ops);
```

3. **commissions**
```sql
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  
  percentage DECIMAL(5,2) NOT NULL, -- Ex: 15.00 para 15%
  amount DECIMAL(10,2) NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'calculated', 'split_sent', 'paid', 'failed')
  ),
  
  split_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

4. **commission_logs** (auditoria)
```sql
CREATE TABLE commission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  calculation_data JSONB NOT NULL, -- Dados completos do cálculo
  total_percentage DECIMAL(5,2) NOT NULL, -- Deve ser sempre 30.00
  total_amount DECIMAL(10,2) NOT NULL,
  redistribution_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tabelas Criadas:** 9  
**Total Acumulado:** 21 tabelas

**Funções Auxiliares:**
```sql
-- Função para calcular comissões
CREATE OR REPLACE FUNCTION calculate_commissions(p_order_id UUID)
RETURNS JSONB AS $$
-- Implementação completa no Sprint 4
$$ LANGUAGE plpgsql;

-- Função para validar soma = 30%
CREATE OR REPLACE FUNCTION validate_commission_total(p_order_id UUID)
RETURNS BOOLEAN AS $$
-- Implementação completa no Sprint 4
$$ LANGUAGE plpgsql;
```

---

### Sprint 5: CRM

**Migrations:**
```sql
-- 20250106000000_create_customers.sql
-- 20250106000001_create_customer_tags.sql
-- 20250106000002_create_customer_notes.sql
-- 20250106000003_create_customer_timeline.sql
```

**Tabelas Criadas:** 4  
**Total Acumulado:** 25 tabelas

---

### Sprint 6: Conversas

**Migrations:**
```sql
-- 20250107000000_create_conversations.sql
-- 20250107000001_create_messages.sql
-- 20250107000002_create_appointments.sql
```

**Tabelas Criadas:** 3  
**Total Acumulado:** 28 tabelas

---

### Sprint 7: Automações

**Migrations:**
```sql
-- 20250108000000_create_automations.sql
-- 20250108000001_create_automation_triggers.sql
-- 20250108000002_create_automation_actions.sql
-- 20250108000003_create_automation_conditions.sql
-- 20250108000004_create_automation_logs.sql
```

**Tabelas Criadas:** 5  
**Total Acumulado:** 33 tabelas

---

### Sprint 8: Analytics

**Objetivo:** Otimizar queries e criar views

**Migrations:**
```sql
-- 20250109000000_create_analytics_views.sql
-- 20250109000001_create_indexes_performance.sql
```

**Views Materializadas:**
```sql
CREATE MATERIALIZED VIEW mv_affiliate_performance AS
SELECT 
  a.id,
  a.user_id,
  COUNT(DISTINCT o.id) as total_sales,
  SUM(o.total) as total_revenue,
  SUM(c.amount) as total_commissions,
  COUNT(DISTINCT an.affiliate_id) as network_size
FROM affiliates a
LEFT JOIN orders o ON o.affiliate_id = a.id
LEFT JOIN commissions c ON c.affiliate_id = a.id
LEFT JOIN affiliate_network an ON an.parent_id = a.id
GROUP BY a.id, a.user_id;

CREATE UNIQUE INDEX ON mv_affiliate_performance(id);
```

**Tabelas Criadas:** 0 (apenas views)  
**Total Acumulado:** 33 tabelas + 3 views

---

### Sprint 9: Configurações

**Migrations:**
```sql
-- 20250110000000_create_system_config.sql
```

**Tabela:**
```sql
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Seed com configurações iniciais
INSERT INTO system_config (key, value, description) VALUES
('asaas_wallet_fabrica', '"wal_xxxxx"', 'Wallet ID da fábrica'),
('asaas_wallet_renum', '"wal_xxxxx"', 'Wallet ID do gestor Renum'),
('asaas_wallet_jb', '"wal_xxxxx"', 'Wallet ID do gestor JB'),
('commission_n1_percentage', '15.00', 'Percentual N1'),
('commission_n2_percentage', '3.00', 'Percentual N2'),
('commission_n3_percentage', '2.00', 'Percentual N3'),
('commission_renum_percentage', '5.00', 'Percentual Renum'),
('commission_jb_percentage', '5.00', 'Percentual JB');
```

**Tabelas Criadas:** 1  
**Total Acumulado:** 34 tabelas

---

## 📊 Resumo Final da Estrutura

### Total de Tabelas: 34

**Por Módulo:**
- Autenticação: 2 tabelas
- Produtos: 4 tabelas
- Vendas: 6 tabelas
- Afiliados: 9 tabelas ⭐
- Asaas: 3 tabelas
- CRM: 4 tabelas
- Conversas: 3 tabelas
- Automações: 5 tabelas
- Configurações: 1 tabela

**Views Materializadas:** 3
**Funções:** 5+
**Triggers:** 34 (update_updated_at em todas)

---

## 🔗 Relacionamentos Críticos

### Árvore de Afiliados
```
profiles (user_id)
    ↓
affiliates (id)
    ↓
affiliate_network (parent_id → affiliate_id)
    ↓
commissions (affiliate_id)
```

### Fluxo de Venda → Comissão
```
orders (referral_code, affiliate_id)
    ↓
asaas_webhook_logs (commission_triggered)
    ↓
commissions (order_id, affiliate_id)
    ↓
commission_splits (asaas split)
```

---

## ⚠️ Checklist de Preparações Críticas

### Sprint 1 → Sprint 4
- [ ] Campo `wallet_id` em `profiles`
- [ ] Campo `is_affiliate` em `profiles`
- [ ] Índice em `is_affiliate`

### Sprint 3 → Sprint 4
- [ ] Campo `referral_code` em `orders`
- [ ] Campo `affiliate_id` em `orders`
- [ ] Campo `commission_triggered` em `asaas_webhook_logs`
- [ ] Índices criados

### Validação Final (Sprint 10)
- [ ] Todas as tabelas têm RLS
- [ ] Todos os triggers de updated_at funcionando
- [ ] Índices de performance criados
- [ ] Views materializadas atualizando

---

**Última atualização:** 23/10/2025  
**Status:** ✅ Pronto para execução
