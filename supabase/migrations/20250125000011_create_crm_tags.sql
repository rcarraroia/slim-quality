-- Migration: Create CRM Tags System
-- Sprint 5: Sistema de CRM e Gestão de Clientes
-- Created: 2025-01-25
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabelas de tags não existem
--   ✅ Sistema de tags será usado para segmentação
--   ✅ Suporte a regras de auto-aplicação
--   ✅ Relacionamento many-to-many com customers
-- ============================================

BEGIN;
-- Criar tabela de tags
CREATE TABLE customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3B82F6', -- hex color
  description TEXT,
  
  -- Regras de auto-aplicação (JSONB para flexibilidade)
  auto_apply_rules JSONB DEFAULT '{}',
  
  -- Configurações da tag
  is_system BOOLEAN DEFAULT FALSE, -- tags do sistema (não podem ser deletadas)
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT customer_tags_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT customer_tags_name_length CHECK (length(trim(name)) >= 2)
);
-- Criar tabela de relacionamento many-to-many
CREATE TABLE customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  
  -- Metadata da atribuição
  assigned_by UUID REFERENCES auth.users(id), -- quem aplicou a tag
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  auto_applied BOOLEAN DEFAULT FALSE, -- se foi aplicada automaticamente
  
  -- Constraint de unicidade
  UNIQUE(customer_id, tag_id)
);
-- Criar índices otimizados
CREATE INDEX idx_customer_tags_name ON customer_tags(name) WHERE is_active = TRUE;
CREATE INDEX idx_customer_tags_system ON customer_tags(is_system) WHERE is_active = TRUE;
CREATE INDEX idx_customer_tags_created_at ON customer_tags(created_at);
CREATE INDEX idx_customer_tag_assignments_customer ON customer_tag_assignments(customer_id);
CREATE INDEX idx_customer_tag_assignments_tag ON customer_tag_assignments(tag_id);
CREATE INDEX idx_customer_tag_assignments_assigned_by ON customer_tag_assignments(assigned_by);
CREATE INDEX idx_customer_tag_assignments_auto ON customer_tag_assignments(auto_applied);
CREATE INDEX idx_customer_tag_assignments_date ON customer_tag_assignments(assigned_at);
-- Criar trigger para updated_at em customer_tags
CREATE OR REPLACE FUNCTION update_customer_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_customer_tags_updated_at
  BEFORE UPDATE ON customer_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_tags_updated_at();
-- Configurar Row Level Security (RLS)
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;
-- Políticas para customer_tags
-- Todos os usuários autenticados podem ver tags ativas
CREATE POLICY "Usuários autenticados veem tags ativas"
  ON customer_tags FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);
-- Apenas admins podem gerenciar tags
CREATE POLICY "Admins gerenciam tags"
  ON customer_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );
-- Políticas para customer_tag_assignments
-- Usuários veem assignments de clientes que podem ver
CREATE POLICY "Ver assignments de clientes visíveis"
  ON customer_tag_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_id 
      AND (
        -- Admin vê todos
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'supervisor')
        )
        OR
        -- Vendedor vê clientes atribuídos ou não atribuídos
        assigned_to = auth.uid()
        OR
        assigned_to IS NULL
      )
    )
  );
-- Usuários podem aplicar tags em clientes que podem editar
CREATE POLICY "Aplicar tags em clientes editáveis"
  ON customer_tag_assignments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_id 
      AND (
        -- Admin pode aplicar em qualquer cliente
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'supervisor')
        )
        OR
        -- Vendedor pode aplicar em clientes atribuídos
        assigned_to = auth.uid()
      )
    )
  );
-- Usuários podem remover tags que aplicaram ou de clientes que gerenciam
CREATE POLICY "Remover tags próprias ou de clientes gerenciados"
  ON customer_tag_assignments FOR DELETE
  USING (
    assigned_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
    OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_id 
      AND assigned_to = auth.uid()
    )
  );
-- Inserir tags padrão do sistema
INSERT INTO customer_tags (name, color, description, is_system, auto_apply_rules) VALUES
  ('Cliente Ativo', '#10B981', 'Cliente que já realizou pelo menos uma compra', TRUE, '{"on_first_purchase": true}'),
  ('Indicação', '#F59E0B', 'Cliente indicado por afiliado', TRUE, '{"on_referral": true}'),
  ('Novo Cliente', '#3B82F6', 'Cliente cadastrado recentemente (últimos 30 dias)', TRUE, '{"on_registration": true, "days": 30}'),
  ('VIP', '#8B5CF6', 'Cliente com alto valor de compras', FALSE, '{"min_ltv": 10000}'),
  ('Inativo', '#6B7280', 'Cliente sem atividade há mais de 90 dias', FALSE, '{"inactive_days": 90}'),
  ('Potencial', '#EF4444', 'Cliente com potencial de compra identificado', FALSE, '{}'),
  ('Recorrente', '#059669', 'Cliente com múltiplas compras', FALSE, '{"min_orders": 3}');
-- Função para aplicar tags automaticamente
CREATE OR REPLACE FUNCTION apply_automatic_tags(customer_id_param UUID, event_type TEXT, event_data JSONB DEFAULT '{}')
RETURNS VOID AS $$
DECLARE
  tag_record RECORD;
  should_apply BOOLEAN;
BEGIN
  -- Buscar tags com regras de auto-aplicação
  FOR tag_record IN 
    SELECT id, name, auto_apply_rules 
    FROM customer_tags 
    WHERE is_active = TRUE 
    AND auto_apply_rules != '{}'
  LOOP
    should_apply := FALSE;
    
    -- Verificar regras baseadas no tipo de evento
    CASE event_type
      WHEN 'registration' THEN
        IF (tag_record.auto_apply_rules->>'on_registration')::BOOLEAN = TRUE THEN
          should_apply := TRUE;
        END IF;
        
      WHEN 'first_purchase' THEN
        IF (tag_record.auto_apply_rules->>'on_first_purchase')::BOOLEAN = TRUE THEN
          should_apply := TRUE;
        END IF;
        
      WHEN 'referral' THEN
        IF (tag_record.auto_apply_rules->>'on_referral')::BOOLEAN = TRUE THEN
          should_apply := TRUE;
        END IF;
        
      ELSE
        -- Outros tipos de evento podem ser adicionados aqui
        NULL;
    END CASE;
    
    -- Aplicar tag se necessário
    IF should_apply THEN
      INSERT INTO customer_tag_assignments (customer_id, tag_id, auto_applied)
      VALUES (customer_id_param, tag_record.id, TRUE)
      ON CONFLICT (customer_id, tag_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
-- Trigger para aplicar tags automaticamente quando cliente é criado
CREATE OR REPLACE FUNCTION trigger_apply_registration_tags()
RETURNS TRIGGER AS $$
BEGIN
  -- Aplicar tags de registro
  PERFORM apply_automatic_tags(NEW.id, 'registration');
  
  -- Se cliente veio de afiliado, aplicar tag de indicação
  IF NEW.referral_code IS NOT NULL THEN
    PERFORM apply_automatic_tags(NEW.id, 'referral');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_customers_auto_tags
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_apply_registration_tags();
-- Comentários para documentação
COMMENT ON TABLE customer_tags IS 'Tags para categorização e segmentação de clientes';
COMMENT ON TABLE customer_tag_assignments IS 'Relacionamento many-to-many entre clientes e tags';
COMMENT ON COLUMN customer_tags.auto_apply_rules IS 'Regras JSON para aplicação automática de tags';
COMMENT ON COLUMN customer_tags.is_system IS 'Tags do sistema não podem ser deletadas pelos usuários';
COMMENT ON COLUMN customer_tag_assignments.auto_applied IS 'Indica se a tag foi aplicada automaticamente';
COMMENT ON FUNCTION apply_automatic_tags IS 'Aplica tags automaticamente baseado em eventos e regras';
COMMIT;
