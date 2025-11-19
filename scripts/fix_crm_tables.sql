-- ============================================
-- CORREÇÃO DAS TABELAS CRM
-- Data: 2025-11-18
-- ============================================
-- IMPORTANTE: Este script mantém RLS desabilitado em profiles e user_roles
-- para permitir login, e configura RLS apenas nas tabelas CRM
-- ============================================

-- ============================================
-- 1. CRIAR TABELA TAGS FALTANTE
-- ============================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- Hex color
  description TEXT,
  category VARCHAR(50), -- 'customer', 'conversation', 'general'
  
  -- Auto-aplicação (regras em JSONB)
  auto_apply_rules JSONB DEFAULT '[]'::jsonb,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT tags_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. INSERIR TAGS PADRÃO
-- ============================================

INSERT INTO tags (name, color, description, category) VALUES
  ('Cliente Ativo', '#10B981', 'Cliente com compras recentes', 'customer'),
  ('Lead Qualificado', '#3B82F6', 'Lead com potencial de compra', 'customer'),
  ('VIP', '#F59E0B', 'Cliente de alto valor', 'customer'),
  ('Indicação', '#8B5CF6', 'Cliente indicado por afiliado', 'customer'),
  ('Primeira Compra', '#EC4899', 'Cliente que fez primeira compra', 'customer'),
  ('Urgente', '#EF4444', 'Conversa que requer atenção imediata', 'conversation'),
  ('Resolvido', '#10B981', 'Conversa resolvida com sucesso', 'conversation')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. CONFIGURAR RLS APENAS PARA TABELAS CRM
-- ============================================
-- IMPORTANTE: NÃO mexer em profiles e user_roles (mantém desabilitado)

-- Remover políticas existentes primeiro
DROP POLICY IF EXISTS "Todos podem ver tags ativas" ON tags;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar tags" ON tags;
DROP POLICY IF EXISTS "Vendedores veem clientes atribuídos" ON customers;
DROP POLICY IF EXISTS "Vendedores podem criar clientes" ON customers;
DROP POLICY IF EXISTS "Vendedores podem atualizar seus clientes" ON customers;
DROP POLICY IF EXISTS "Todos podem ver tags ativas" ON customer_tags;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar customer_tags" ON customer_tags;
DROP POLICY IF EXISTS "Ver assignments de clientes visíveis" ON customer_tag_assignments;
DROP POLICY IF EXISTS "Ver timeline de clientes visíveis" ON customer_timeline;
DROP POLICY IF EXISTS "Atendentes veem conversas atribuídas" ON conversations;
DROP POLICY IF EXISTS "Ver mensagens de conversas visíveis" ON messages;
DROP POLICY IF EXISTS "Vendedores veem seus agendamentos" ON appointments;

-- Tags (tabela não existe, será criada acima se necessário)
-- Pular configuração de RLS para tags pois a tabela customer_tags já serve como tags

-- Customers (vendedores veem seus clientes, admins veem todos)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem clientes atribuídos"
  ON customers FOR SELECT
  USING (
    assigned_to = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'vendedor')
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Vendedores podem criar clientes"
  ON customers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'vendedor')
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Vendedores podem atualizar seus clientes"
  ON customers FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Customer Tags (todos podem ver tags ativas)
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver tags ativas"
  ON customer_tags FOR SELECT
  USING (is_active = true);

CREATE POLICY "Apenas admins podem gerenciar customer_tags"
  ON customer_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Customer Tag Assignments (relacionamento customer ↔ tag)
ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver assignments de clientes visíveis"
  ON customer_tag_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_tag_assignments.customer_id
      AND (
        c.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'vendedor')
          AND deleted_at IS NULL
        )
      )
    )
  );

-- Customer Timeline (seguem permissões do cliente)
ALTER TABLE customer_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver timeline de clientes visíveis"
  ON customer_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_timeline.customer_id
      AND (
        c.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'vendedor')
          AND deleted_at IS NULL
        )
      )
    )
  );

-- Conversations (atendentes veem conversas atribuídas)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atendentes veem conversas atribuídas"
  ON conversations FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'vendedor')
      AND deleted_at IS NULL
    )
  );

-- Messages (seguem permissões da conversa)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver mensagens de conversas visíveis"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'vendedor')
          AND deleted_at IS NULL
        )
      )
    )
  );

-- Appointments (vendedores veem seus agendamentos)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem seus agendamentos"
  ON appointments FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'vendedor')
      AND deleted_at IS NULL
    )
  );

-- ============================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================

-- Listar tabelas com RLS ativo
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ATIVO ✅' ELSE 'DESATIVADO ❌' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
  'profiles',
  'user_roles',
  'tags',
  'customers',
  'customer_tags',
  'customer_timeline',
  'conversations',
  'messages',
  'appointments'
)
ORDER BY tablename;

-- Contar políticas por tabela
SELECT 
  tablename,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
