-- ===================================
-- TABELA: behavior_patterns
-- ===================================
-- Padrões comportamentais aprendidos para o SICC
-- Sistema de Inteligência Corporativa Contínua

CREATE TABLE IF NOT EXISTS behavior_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('discovery', 'sales', 'support', 'general')),
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    response_template TEXT NOT NULL,
    application_conditions JSONB DEFAULT '{}',
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    success_rate FLOAT DEFAULT 0.0 CHECK (success_rate >= 0 AND success_rate <= 1),
    sub_agent_id UUID REFERENCES sub_agents(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_type ON behavior_patterns(pattern_type) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_confidence ON behavior_patterns(confidence_score DESC) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_sub_agent ON behavior_patterns(sub_agent_id) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_usage ON behavior_patterns(usage_count DESC) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_success ON behavior_patterns(success_rate DESC) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_active ON behavior_patterns(is_active) WHERE deleted_at IS NULL;
-- Trigger para updated_at
CREATE TRIGGER update_behavior_patterns_updated_at
    BEFORE UPDATE ON behavior_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- RLS (Row Level Security)
ALTER TABLE behavior_patterns ENABLE ROW LEVEL SECURITY;
-- Política RLS: Usuários podem ver todos os padrões ativos (sistema interno)
CREATE POLICY "Allow all access to behavior_patterns"
    ON behavior_patterns FOR ALL
    USING (deleted_at IS NULL);
-- Comentários
COMMENT ON TABLE behavior_patterns IS 'Padrões comportamentais aprendidos pelo SICC';
COMMENT ON COLUMN behavior_patterns.pattern_name IS 'Nome descritivo do padrão';
COMMENT ON COLUMN behavior_patterns.pattern_type IS 'Tipo: discovery, sales, support, general';
COMMENT ON COLUMN behavior_patterns.confidence_score IS 'Score de confiança (0.0-1.0)';
COMMENT ON COLUMN behavior_patterns.response_template IS 'Template de resposta do padrão';
COMMENT ON COLUMN behavior_patterns.application_conditions IS 'Condições para aplicar o padrão em JSON';
COMMENT ON COLUMN behavior_patterns.usage_count IS 'Número de vezes que foi aplicado';
COMMENT ON COLUMN behavior_patterns.success_rate IS 'Taxa de sucesso (0.0-1.0)';
COMMENT ON COLUMN behavior_patterns.sub_agent_id IS 'Sub-agente responsável pelo padrão';
COMMENT ON COLUMN behavior_patterns.is_active IS 'Se o padrão está ativo';
COMMENT ON COLUMN behavior_patterns.deleted_at IS 'Soft delete timestamp';
