-- ===================================
-- TABELA: sub_agents
-- ===================================
-- Configuração de sub-agentes especializados para o SICC
-- Sistema de Inteligência Corporativa Contínua

CREATE TABLE IF NOT EXISTS sub_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(50) NOT NULL CHECK (domain IN ('discovery', 'sales', 'support')),
    learning_threshold FLOAT DEFAULT 0.7 CHECK (learning_threshold >= 0 AND learning_threshold <= 1),
    max_patterns INTEGER DEFAULT 100 CHECK (max_patterns > 0),
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sub_agents_domain ON sub_agents(domain) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_sub_agents_active ON sub_agents(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sub_agents_name ON sub_agents(agent_name) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE TRIGGER update_sub_agents_updated_at
    BEFORE UPDATE ON sub_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE sub_agents ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários podem ver todos os sub-agentes (sistema interno)
CREATE POLICY "Allow all access to sub_agents"
    ON sub_agents FOR ALL
    USING (deleted_at IS NULL);

-- Inserir sub-agentes padrão
INSERT INTO sub_agents (agent_name, domain, learning_threshold, max_patterns, configuration) VALUES
    ('Discovery Agent', 'discovery', 0.7, 100, '{"focus": "lead_qualification", "priority": "high"}'),
    ('Sales Agent', 'sales', 0.75, 150, '{"focus": "conversion", "priority": "critical"}'),
    ('Support Agent', 'support', 0.65, 80, '{"focus": "problem_resolution", "priority": "medium"}')
ON CONFLICT (agent_name) DO NOTHING;

-- Comentários
COMMENT ON TABLE sub_agents IS 'Sub-agentes especializados para SICC';
COMMENT ON COLUMN sub_agents.agent_name IS 'Nome único do sub-agente';
COMMENT ON COLUMN sub_agents.domain IS 'Domínio de especialização: discovery, sales, support';
COMMENT ON COLUMN sub_agents.learning_threshold IS 'Threshold de confiança para aprovação (0.0-1.0)';
COMMENT ON COLUMN sub_agents.max_patterns IS 'Máximo de padrões que o sub-agente pode ter';
COMMENT ON COLUMN sub_agents.configuration IS 'Configurações específicas em JSON';
COMMENT ON COLUMN sub_agents.is_active IS 'Se o sub-agente está ativo';
COMMENT ON COLUMN sub_agents.deleted_at IS 'Soft delete timestamp';