-- ===================================
-- TABELA: agent_performance_metrics
-- ===================================
-- Métricas de performance do agente para o SICC
-- Sistema de Inteligência Corporativa Contínua

CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL,
    metric_value FLOAT NOT NULL,
    sub_agent_id UUID REFERENCES sub_agents(id) ON DELETE SET NULL,
    pattern_id UUID REFERENCES behavior_patterns(id) ON DELETE SET NULL,
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_date ON agent_performance_metrics(metric_type, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_agent ON agent_performance_metrics(sub_agent_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_pattern ON agent_performance_metrics(pattern_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON agent_performance_metrics(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON agent_performance_metrics(metric_type);

-- RLS (Row Level Security)
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários podem ver todas as métricas (sistema interno)
CREATE POLICY "Allow all access to performance_metrics"
    ON agent_performance_metrics FOR ALL
    USING (true);

-- Inserir tipos de métricas padrão
INSERT INTO agent_performance_metrics (metric_type, metric_value, measurement_date, metadata) VALUES
    ('patterns_identified_daily', 0, CURRENT_DATE, '{"description": "Padrões identificados por dia"}'),
    ('patterns_approved_daily', 0, CURRENT_DATE, '{"description": "Padrões aprovados por dia"}'),
    ('patterns_rejected_daily', 0, CURRENT_DATE, '{"description": "Padrões rejeitados por dia"}'),
    ('patterns_applied_daily', 0, CURRENT_DATE, '{"description": "Padrões aplicados por dia"}'),
    ('average_response_time_ms', 0, CURRENT_DATE, '{"description": "Tempo médio de resposta em ms"}'),
    ('pattern_detection_accuracy', 0.85, CURRENT_DATE, '{"description": "Acurácia de detecção de padrões"}'),
    ('system_learning_rate', 0, CURRENT_DATE, '{"description": "Taxa de aprendizado do sistema"}')
ON CONFLICT DO NOTHING;

-- Comentários
COMMENT ON TABLE agent_performance_metrics IS 'Métricas de performance do agente SICC';
COMMENT ON COLUMN agent_performance_metrics.metric_type IS 'Tipo da métrica (ex: patterns_identified, response_time)';
COMMENT ON COLUMN agent_performance_metrics.metric_value IS 'Valor numérico da métrica';
COMMENT ON COLUMN agent_performance_metrics.sub_agent_id IS 'Sub-agente relacionado (opcional)';
COMMENT ON COLUMN agent_performance_metrics.pattern_id IS 'Padrão relacionado (opcional)';
COMMENT ON COLUMN agent_performance_metrics.measurement_date IS 'Data da medição';
COMMENT ON COLUMN agent_performance_metrics.metadata IS 'Metadados adicionais em JSON';