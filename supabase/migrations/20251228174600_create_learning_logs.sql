-- ===================================
-- TABELA: learning_logs
-- ===================================
-- Fila de aprendizados pendentes de aprovação para o SICC
-- Sistema de Inteligência Corporativa Contínua

CREATE TABLE IF NOT EXISTS learning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_data JSONB NOT NULL,
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approval_reason TEXT,
    approved_by VARCHAR(50) DEFAULT 'supervisor_auto',
    approved_at TIMESTAMPTZ NULL,
    sub_agent_id UUID REFERENCES sub_agents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_learning_logs_status ON learning_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_logs_confidence ON learning_logs(confidence_score DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_learning_logs_sub_agent ON learning_logs(sub_agent_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_learning_logs_approved_at ON learning_logs(approved_at DESC) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_logs_created_at ON learning_logs(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_learning_logs_updated_at
    BEFORE UPDATE ON learning_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para definir approved_at quando status muda para approved/rejected
CREATE OR REPLACE FUNCTION set_approved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
        NEW.approved_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_learning_logs_approved_at
    BEFORE UPDATE ON learning_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_approved_at();

-- RLS (Row Level Security)
ALTER TABLE learning_logs ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários podem ver todos os logs (sistema interno)
CREATE POLICY "Allow all access to learning_logs"
    ON learning_logs FOR ALL
    USING (true);

-- Comentários
COMMENT ON TABLE learning_logs IS 'Fila de aprendizados pendentes de aprovação - SICC';
COMMENT ON COLUMN learning_logs.pattern_data IS 'Dados do padrão identificado em JSON';
COMMENT ON COLUMN learning_logs.confidence_score IS 'Score de confiança do padrão (0.0-1.0)';
COMMENT ON COLUMN learning_logs.status IS 'Status: pending, approved, rejected';
COMMENT ON COLUMN learning_logs.approval_reason IS 'Motivo da aprovação/rejeição';
COMMENT ON COLUMN learning_logs.approved_by IS 'Quem aprovou: supervisor_auto, supervisor_manual, admin';
COMMENT ON COLUMN learning_logs.approved_at IS 'Timestamp da aprovação/rejeição';
COMMENT ON COLUMN learning_logs.sub_agent_id IS 'Sub-agente que identificou o padrão';