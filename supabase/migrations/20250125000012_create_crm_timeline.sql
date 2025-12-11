-- Migration: Create CRM Customer Timeline
-- Sprint 5: Sistema de CRM e Gestão de Clientes
-- Created: 2025-01-25
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Sistema de timeline não existe
--   ✅ Será usado para registrar eventos cronológicos
--   ✅ Integração com outros sistemas (vendas, afiliados)
--   ✅ Suporte a metadata flexível via JSONB
-- ============================================

BEGIN;

-- Criar ENUM para tipos de eventos
CREATE TYPE timeline_event_type AS ENUM (
  'customer_created',      -- Cliente cadastrado
  'customer_updated',      -- Dados do cliente atualizados
  'order_placed',          -- Pedido realizado
  'payment_confirmed',     -- Pagamento confirmado
  'conversation_started',  -- Conversa iniciada
  'conversation_resolved', -- Conversa resolvida
  'message_received',      -- Mensagem recebida
  'message_sent',          -- Mensagem enviada
  'note_added',           -- Nota manual adicionada
  'appointment_scheduled', -- Agendamento criado
  'appointment_completed', -- Agendamento realizado
  'appointment_cancelled', -- Agendamento cancelado
  'tag_added',            -- Tag adicionada
  'tag_removed',          -- Tag removida
  'status_changed',       -- Status do cliente alterado
  'assigned_changed',     -- Vendedor responsável alterado
  'referral_registered',  -- Cliente indicado registrado
  'system_event'          -- Evento do sistema
);

-- Criar tabela de timeline
CREATE TABLE customer_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Informações do evento
  event_type timeline_event_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Metadata flexível para dados específicos do evento
  metadata JSONB DEFAULT '{}',
  
  -- Referências opcionais para outros objetos
  related_order_id UUID, -- referência para pedidos
  related_conversation_id UUID, -- referência para conversas
  related_appointment_id UUID, -- referência para agendamentos
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id), -- quem criou o evento (NULL para eventos automáticos)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Configurações do evento
  is_system_event BOOLEAN DEFAULT FALSE, -- eventos do sistema vs manuais
  is_visible_to_customer BOOLEAN DEFAULT FALSE, -- se cliente pode ver (futuro)
  priority INTEGER DEFAULT 1 -- 1=baixa, 2=média, 3=alta
);

-- Criar índices otimizados para consultas frequentes
CREATE INDEX idx_customer_timeline_customer_id ON customer_timeline(customer_id);
CREATE INDEX idx_customer_timeline_event_type ON customer_timeline(event_type);
CREATE INDEX idx_customer_timeline_created_at ON customer_timeline(created_at DESC);
CREATE INDEX idx_customer_timeline_created_by ON customer_timeline(created_by);
CREATE INDEX idx_customer_timeline_system ON customer_timeline(is_system_event);
CREATE INDEX idx_customer_timeline_priority ON customer_timeline(priority DESC);

-- Índice composto para consultas por cliente e tipo
CREATE INDEX idx_customer_timeline_customer_type ON customer_timeline(customer_id, event_type, created_at DESC);

-- Índice composto para consultas por cliente e data
CREATE INDEX idx_customer_timeline_customer_date ON customer_timeline(customer_id, created_at DESC);

-- Índice para busca em metadata (GIN para JSONB)
CREATE INDEX idx_customer_timeline_metadata ON customer_timeline USING gin(metadata);

-- Configurar Row Level Security (RLS)
ALTER TABLE customer_timeline ENABLE ROW LEVEL SECURITY;

-- Política: Usuários veem timeline de clientes que podem ver
CREATE POLICY "Ver timeline de clientes visíveis"
  ON customer_timeline FOR SELECT
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

-- Política: Usuários podem adicionar eventos em clientes que gerenciam
CREATE POLICY "Adicionar eventos em clientes gerenciados"
  ON customer_timeline FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_id 
      AND (
        -- Admin pode adicionar em qualquer cliente
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'supervisor')
        )
        OR
        -- Vendedor pode adicionar em clientes atribuídos
        assigned_to = auth.uid()
      )
    )
  );

-- Política: Usuários podem editar eventos que criaram (apenas notas manuais)
CREATE POLICY "Editar eventos próprios"
  ON customer_timeline FOR UPDATE
  USING (
    created_by = auth.uid()
    AND event_type = 'note_added'
    AND is_system_event = FALSE
  );

-- Função para adicionar evento na timeline
CREATE OR REPLACE FUNCTION add_timeline_event(
  p_customer_id UUID,
  p_event_type timeline_event_type,
  p_title VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_created_by UUID DEFAULT NULL,
  p_is_system_event BOOLEAN DEFAULT TRUE,
  p_priority INTEGER DEFAULT 1,
  p_related_order_id UUID DEFAULT NULL,
  p_related_conversation_id UUID DEFAULT NULL,
  p_related_appointment_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO customer_timeline (
    customer_id,
    event_type,
    title,
    description,
    metadata,
    created_by,
    is_system_event,
    priority,
    related_order_id,
    related_conversation_id,
    related_appointment_id
  ) VALUES (
    p_customer_id,
    p_event_type,
    p_title,
    p_description,
    p_metadata,
    p_created_by,
    p_is_system_event,
    p_priority,
    p_related_order_id,
    p_related_conversation_id,
    p_related_appointment_id
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar timeline de um cliente com filtros
CREATE OR REPLACE FUNCTION get_customer_timeline(
  p_customer_id UUID,
  p_event_types timeline_event_type[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_include_system BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  event_type timeline_event_type,
  title VARCHAR(255),
  description TEXT,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ,
  is_system_event BOOLEAN,
  priority INTEGER,
  creator_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.event_type,
    t.title,
    t.description,
    t.metadata,
    t.created_by,
    t.created_at,
    t.is_system_event,
    t.priority,
    COALESCE(u.name, 'Sistema') as creator_name
  FROM customer_timeline t
  LEFT JOIN auth.users u ON t.created_by = u.id
  WHERE t.customer_id = p_customer_id
    AND (p_event_types IS NULL OR t.event_type = ANY(p_event_types))
    AND (p_include_system = TRUE OR t.is_system_event = FALSE)
  ORDER BY t.created_at DESC, t.priority DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar evento automático quando cliente é criado
CREATE OR REPLACE FUNCTION trigger_customer_created_timeline()
RETURNS TRIGGER AS $$
BEGIN
  -- Adicionar evento de criação do cliente
  PERFORM add_timeline_event(
    NEW.id,
    'customer_created',
    'Cliente Cadastrado',
    CASE 
      WHEN NEW.source = 'n8n' THEN 'Cliente cadastrado automaticamente via WhatsApp'
      WHEN NEW.source = 'affiliate' THEN 'Cliente cadastrado via link de afiliado'
      WHEN NEW.source = 'manual' THEN 'Cliente cadastrado manualmente'
      ELSE 'Cliente cadastrado via site'
    END,
    jsonb_build_object(
      'source', NEW.source,
      'referral_code', NEW.referral_code,
      'assigned_to', NEW.assigned_to
    ),
    NULL, -- created_by (sistema)
    TRUE, -- is_system_event
    2     -- priority média
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customer_timeline_created
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_customer_created_timeline();

-- Trigger para criar evento quando cliente é atualizado
CREATE OR REPLACE FUNCTION trigger_customer_updated_timeline()
RETURNS TRIGGER AS $$
DECLARE
  changes TEXT[] := '{}';
  change_description TEXT;
BEGIN
  -- Detectar mudanças significativas
  IF OLD.name != NEW.name THEN
    changes := array_append(changes, 'nome');
  END IF;
  
  IF OLD.email != NEW.email THEN
    changes := array_append(changes, 'email');
  END IF;
  
  IF OLD.phone != NEW.phone THEN
    changes := array_append(changes, 'telefone');
  END IF;
  
  IF OLD.assigned_to != NEW.assigned_to THEN
    changes := array_append(changes, 'vendedor responsável');
  END IF;
  
  IF OLD.status != NEW.status THEN
    changes := array_append(changes, 'status');
  END IF;
  
  -- Se houve mudanças significativas, registrar evento
  IF array_length(changes, 1) > 0 THEN
    change_description := 'Dados atualizados: ' || array_to_string(changes, ', ');
    
    PERFORM add_timeline_event(
      NEW.id,
      'customer_updated',
      'Dados Atualizados',
      change_description,
      jsonb_build_object(
        'changes', changes,
        'old_values', jsonb_build_object(
          'name', OLD.name,
          'email', OLD.email,
          'phone', OLD.phone,
          'assigned_to', OLD.assigned_to,
          'status', OLD.status
        ),
        'new_values', jsonb_build_object(
          'name', NEW.name,
          'email', NEW.email,
          'phone', NEW.phone,
          'assigned_to', NEW.assigned_to,
          'status', NEW.status
        )
      ),
      auth.uid(), -- created_by (usuário atual)
      TRUE,       -- is_system_event
      1           -- priority baixa
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customer_timeline_updated
  AFTER UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_customer_updated_timeline();

-- Trigger para criar evento quando tag é adicionada
CREATE OR REPLACE FUNCTION trigger_tag_added_timeline()
RETURNS TRIGGER AS $$
DECLARE
  tag_name TEXT;
BEGIN
  -- Buscar nome da tag
  SELECT name INTO tag_name FROM customer_tags WHERE id = NEW.tag_id;
  
  PERFORM add_timeline_event(
    NEW.customer_id,
    'tag_added',
    'Tag Adicionada',
    'Tag "' || tag_name || '" foi aplicada ao cliente',
    jsonb_build_object(
      'tag_id', NEW.tag_id,
      'tag_name', tag_name,
      'auto_applied', NEW.auto_applied
    ),
    NEW.assigned_by,
    NEW.auto_applied, -- system event se foi auto aplicada
    1 -- priority baixa
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tag_timeline_added
  AFTER INSERT ON customer_tag_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_tag_added_timeline();

-- Comentários para documentação
COMMENT ON TABLE customer_timeline IS 'Timeline cronológica de eventos dos clientes';
COMMENT ON TYPE timeline_event_type IS 'Tipos de eventos que podem ocorrer na timeline do cliente';
COMMENT ON COLUMN customer_timeline.metadata IS 'Dados específicos do evento em formato JSON';
COMMENT ON COLUMN customer_timeline.is_system_event IS 'Diferencia eventos automáticos de eventos manuais';
COMMENT ON FUNCTION add_timeline_event IS 'Função para adicionar eventos na timeline de forma padronizada';
COMMENT ON FUNCTION get_customer_timeline IS 'Função para buscar timeline com filtros e paginação';

COMMIT;