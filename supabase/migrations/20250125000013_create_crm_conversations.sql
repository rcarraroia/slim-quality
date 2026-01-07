-- Migration: Create CRM Conversations System
-- Sprint 5: Sistema de CRM e Gestão de Clientes
-- Created: 2025-01-25
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Sistema de conversas não existe
--   ✅ Suporte a múltiplos canais (WhatsApp, Email, Chat)
--   ✅ Sistema de atribuição de atendentes
--   ✅ Integração com timeline de clientes
-- ============================================

BEGIN;
-- Criar ENUMs para conversas
CREATE TYPE conversation_status AS ENUM (
  'new',        -- Nova conversa (não atribuída)
  'open',       -- Conversa aberta (atribuída e ativa)
  'pending',    -- Aguardando resposta do cliente
  'resolved',   -- Conversa resolvida
  'closed'      -- Conversa fechada
);
CREATE TYPE conversation_channel AS ENUM (
  'whatsapp',   -- WhatsApp via N8N/BIA
  'email',      -- Email
  'chat',       -- Chat do site
  'phone'       -- Telefone (registro manual)
);
CREATE TYPE message_sender_type AS ENUM (
  'customer',   -- Mensagem do cliente
  'agent',      -- Mensagem do atendente
  'system'      -- Mensagem automática do sistema
);
-- Criar tabela de conversas
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Configurações da conversa
  channel conversation_channel NOT NULL,
  status conversation_status DEFAULT 'new',
  subject VARCHAR(255),
  
  -- Atribuição e prioridade
  assigned_to UUID REFERENCES auth.users(id), -- atendente responsável
  priority INTEGER DEFAULT 1, -- 1=baixa, 2=média, 3=alta
  
  -- Metadata da conversa
  external_id VARCHAR(255), -- ID no sistema externo (WhatsApp, etc)
  metadata JSONB DEFAULT '{}', -- dados específicos do canal
  
  -- Timestamps importantes
  last_message_at TIMESTAMPTZ,
  last_customer_message_at TIMESTAMPTZ,
  last_agent_message_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps padrão
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT conversations_priority_valid CHECK (priority BETWEEN 1 AND 3)
);
-- Criar tabela de mensagens
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Informações do remetente
  sender_type message_sender_type NOT NULL,
  sender_id UUID, -- user_id se agent, customer_id se customer, NULL se system
  
  -- Conteúdo da mensagem
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file', 'audio'
  
  -- Metadata da mensagem
  external_id VARCHAR(255), -- ID da mensagem no sistema externo
  metadata JSONB DEFAULT '{}', -- dados específicos (anexos, etc)
  
  -- Status da mensagem
  read_at TIMESTAMPTZ, -- quando foi lida pelo destinatário
  delivered_at TIMESTAMPTZ, -- quando foi entregue (futuro)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT messages_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT messages_sender_id_required CHECK (
    (sender_type = 'system' AND sender_id IS NULL) OR
    (sender_type != 'system' AND sender_id IS NOT NULL)
  )
);
-- Criar índices otimizados
-- Índices para conversations
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_channel ON conversations(channel);
CREATE INDEX idx_conversations_priority ON conversations(priority DESC);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_external_id ON conversations(external_id) WHERE external_id IS NOT NULL;
-- Índices compostos para consultas frequentes
CREATE INDEX idx_conversations_status_assigned ON conversations(status, assigned_to);
CREATE INDEX idx_conversations_channel_status ON conversations(channel, status);
CREATE INDEX idx_conversations_customer_channel ON conversations(customer_id, channel);
-- Índices para messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_type ON messages(sender_type);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_read_at ON messages(read_at);
CREATE INDEX idx_messages_external_id ON messages(external_id) WHERE external_id IS NOT NULL;
-- Índices compostos para messages
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_conversation_sender ON messages(conversation_id, sender_type, created_at DESC);
-- Criar trigger para updated_at em conversations
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();
-- Função para atualizar timestamps da conversa quando mensagem é adicionada
CREATE OR REPLACE FUNCTION update_conversation_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar last_message_at sempre
  UPDATE conversations 
  SET 
    last_message_at = NEW.created_at,
    last_customer_message_at = CASE 
      WHEN NEW.sender_type = 'customer' THEN NEW.created_at 
      ELSE last_customer_message_at 
    END,
    last_agent_message_at = CASE 
      WHEN NEW.sender_type = 'agent' THEN NEW.created_at 
      ELSE last_agent_message_at 
    END,
    -- Se conversa estava resolvida e cliente enviou mensagem, reabrir
    status = CASE 
      WHEN NEW.sender_type = 'customer' AND status = 'resolved' THEN 'open'
      ELSE status 
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamps();
-- Configurar Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- Políticas para conversations
-- Usuários veem conversas de clientes que podem ver
CREATE POLICY "Ver conversas de clientes visíveis"
  ON conversations FOR SELECT
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
    OR
    -- Atendente vê conversas atribuídas a ele
    assigned_to = auth.uid()
  );
-- Usuários podem criar conversas para clientes que gerenciam
CREATE POLICY "Criar conversas para clientes gerenciados"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_id 
      AND (
        -- Admin pode criar para qualquer cliente
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'supervisor')
        )
        OR
        -- Vendedor pode criar para clientes atribuídos
        assigned_to = auth.uid()
        OR
        -- Pode criar para clientes não atribuídos
        assigned_to IS NULL
      )
    )
  );
-- Usuários podem atualizar conversas que gerenciam
CREATE POLICY "Atualizar conversas gerenciadas"
  ON conversations FOR UPDATE
  USING (
    -- Admin pode atualizar qualquer conversa
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
    OR
    -- Atendente pode atualizar conversas atribuídas
    assigned_to = auth.uid()
    OR
    -- Vendedor pode atualizar conversas de clientes atribuídos
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_id 
      AND assigned_to = auth.uid()
    )
  );
-- Políticas para messages
-- Usuários veem mensagens de conversas que podem ver
CREATE POLICY "Ver mensagens de conversas visíveis"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN customers cu ON c.customer_id = cu.id
      WHERE c.id = conversation_id 
      AND (
        -- Admin vê todas
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'supervisor')
        )
        OR
        -- Atendente vê mensagens de conversas atribuídas
        c.assigned_to = auth.uid()
        OR
        -- Vendedor vê mensagens de clientes atribuídos
        cu.assigned_to = auth.uid()
        OR
        -- Pode ver mensagens de clientes não atribuídos
        cu.assigned_to IS NULL
      )
    )
  );
-- Usuários podem enviar mensagens em conversas que gerenciam
CREATE POLICY "Enviar mensagens em conversas gerenciadas"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN customers cu ON c.customer_id = cu.id
      WHERE c.id = conversation_id 
      AND (
        -- Admin pode enviar em qualquer conversa
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'supervisor')
        )
        OR
        -- Atendente pode enviar em conversas atribuídas
        c.assigned_to = auth.uid()
        OR
        -- Vendedor pode enviar em conversas de clientes atribuídos
        cu.assigned_to = auth.uid()
      )
    )
  );
-- Função para buscar conversas com filtros
CREATE OR REPLACE FUNCTION get_conversations(
  p_status conversation_status[] DEFAULT NULL,
  p_channel conversation_channel[] DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  channel conversation_channel,
  status conversation_status,
  subject VARCHAR(255),
  assigned_to UUID,
  assigned_name TEXT,
  priority INTEGER,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.customer_id,
    cu.name as customer_name,
    cu.email as customer_email,
    c.channel,
    c.status,
    c.subject,
    c.assigned_to,
    u.name as assigned_name,
    c.priority,
    c.last_message_at,
    COALESCE(unread.count, 0) as unread_count,
    c.created_at
  FROM conversations c
  JOIN customers cu ON c.customer_id = cu.id
  LEFT JOIN auth.users u ON c.assigned_to = u.id
  LEFT JOIN (
    SELECT 
      conversation_id, 
      COUNT(*) as count
    FROM messages 
    WHERE sender_type = 'customer' 
    AND read_at IS NULL
    GROUP BY conversation_id
  ) unread ON c.id = unread.conversation_id
  WHERE (p_status IS NULL OR c.status = ANY(p_status))
    AND (p_channel IS NULL OR c.channel = ANY(p_channel))
    AND (p_assigned_to IS NULL OR c.assigned_to = p_assigned_to)
    AND (p_customer_id IS NULL OR c.customer_id = p_customer_id)
  ORDER BY c.priority DESC, c.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
-- Função para marcar mensagens como lidas
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Marcar mensagens do cliente como lidas
  UPDATE messages 
  SET read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_type = 'customer'
    AND read_at IS NULL;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
-- Função para criar conversa automaticamente
CREATE OR REPLACE FUNCTION create_conversation_if_not_exists(
  p_customer_id UUID,
  p_channel conversation_channel,
  p_external_id VARCHAR(255) DEFAULT NULL,
  p_subject VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Tentar encontrar conversa ativa existente
  SELECT id INTO conversation_id
  FROM conversations
  WHERE customer_id = p_customer_id
    AND channel = p_channel
    AND status IN ('new', 'open', 'pending')
    AND (p_external_id IS NULL OR external_id = p_external_id)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Se não encontrou, criar nova conversa
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (
      customer_id,
      channel,
      external_id,
      subject,
      status
    ) VALUES (
      p_customer_id,
      p_channel,
      p_external_id,
      COALESCE(p_subject, 'Conversa ' || p_channel),
      'new'
    ) RETURNING id INTO conversation_id;
    
    -- Adicionar evento na timeline
    PERFORM add_timeline_event(
      p_customer_id,
      'conversation_started',
      'Conversa Iniciada',
      'Nova conversa iniciada no canal ' || p_channel,
      jsonb_build_object(
        'conversation_id', conversation_id,
        'channel', p_channel,
        'external_id', p_external_id
      ),
      NULL, -- created_by (sistema)
      TRUE, -- is_system_event
      2     -- priority média
    );
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;
-- Comentários para documentação
COMMENT ON TABLE conversations IS 'Conversas multicanal com clientes';
COMMENT ON TABLE messages IS 'Mensagens individuais das conversas';
COMMENT ON TYPE conversation_status IS 'Status possíveis de uma conversa';
COMMENT ON TYPE conversation_channel IS 'Canais de comunicação suportados';
COMMENT ON TYPE message_sender_type IS 'Tipos de remetente de mensagem';
COMMENT ON FUNCTION get_conversations IS 'Busca conversas com filtros e contagem de não lidas';
COMMENT ON FUNCTION mark_messages_as_read IS 'Marca mensagens como lidas';
COMMENT ON FUNCTION create_conversation_if_not_exists IS 'Cria conversa se não existir uma ativa';
COMMIT;
