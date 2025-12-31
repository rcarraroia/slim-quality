-- ===================================
-- TABELA: conversations
-- ===================================
-- Armazena estado das conversações do agente
-- Migration temporária para Sprint 2 (oficial será na Sprint 3)

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id TEXT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Comentários
COMMENT ON TABLE conversations IS 'Estado das conversações do agente LangGraph';
COMMENT ON COLUMN conversations.lead_id IS 'ID do lead (phone number)';
COMMENT ON COLUMN conversations.state IS 'AgentState serializado em JSON';
