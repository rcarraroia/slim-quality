-- ===================================
-- MIGRATION: Sistema de Automações Backend
-- ===================================
-- Sprint: 2.5 - Sistema de Automações Backend
-- Created: 2025-01-29
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Padrões de nomenclatura existentes analisados
--   ✅ Estrutura compatível com Supabase atual
--   ✅ Campos em português para frontend
--   ✅ JSONB para flexibilidade de configuração
--   ✅ RLS policies para segurança
--   ✅ Índices otimizados para performance
-- ============================================

BEGIN;
-- ============================================
-- TABELA: automation_rules
-- ============================================
-- Armazena regras de automação configuradas pelos usuários

CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Informações básicas
    nome VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(nome)) >= 3),
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'inativa' CHECK (status IN ('ativa', 'inativa')),
    
    -- Configuração do gatilho
    gatilho VARCHAR(100) NOT NULL CHECK (gatilho IN (
        'conversation_started',
        'message_received', 
        'lead_created',
        'order_completed',
        'scheduled'
    )),
    gatilho_config JSONB NOT NULL DEFAULT '{}',
    
    -- Condições e ações (arrays JSON)
    condicoes JSONB NOT NULL DEFAULT '[]',
    acoes JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_array_length(acoes) > 0),
    
    -- Metadados para frontend
    disparos_mes INTEGER NOT NULL DEFAULT 0 CHECK (disparos_mes >= 0),
    taxa_abertura_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (taxa_abertura_percent >= 0 AND taxa_abertura_percent <= 100),
    
    -- Controle de usuário
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
-- ============================================
-- TABELA: rule_execution_logs
-- ============================================
-- Logs de execução de regras para auditoria e monitoramento

CREATE TABLE IF NOT EXISTS rule_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência à regra
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    
    -- Dados do gatilho
    trigger_type VARCHAR(100) NOT NULL,
    trigger_data JSONB NOT NULL DEFAULT '{}',
    
    -- Resultado da avaliação
    conditions_met BOOLEAN NOT NULL,
    conditions_result JSONB DEFAULT '{}',
    
    -- Ações executadas
    actions_executed JSONB NOT NULL DEFAULT '[]',
    actions_count INTEGER NOT NULL DEFAULT 0 CHECK (actions_count >= 0),
    
    -- Status da execução
    execution_status VARCHAR(50) NOT NULL DEFAULT 'success' CHECK (execution_status IN ('success', 'failed', 'partial')),
    error_message TEXT,
    
    -- Performance
    duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
    
    -- Contexto adicional
    conversation_id UUID,
    customer_id UUID,
    agent_context JSONB DEFAULT '{}',
    
    -- Timestamp
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- automation_rules
CREATE INDEX IF NOT EXISTS idx_automation_rules_status 
    ON automation_rules(status) 
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_automation_rules_gatilho 
    ON automation_rules(gatilho) 
    WHERE status = 'ativa' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_automation_rules_user 
    ON automation_rules(created_by) 
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_automation_rules_updated 
    ON automation_rules(updated_at DESC) 
    WHERE deleted_at IS NULL;
-- Índice composto para consultas de regras ativas por gatilho
CREATE INDEX IF NOT EXISTS idx_automation_rules_active_trigger 
    ON automation_rules(gatilho, status, updated_at DESC) 
    WHERE deleted_at IS NULL;
-- rule_execution_logs
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_rule 
    ON rule_execution_logs(rule_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_status 
    ON rule_execution_logs(execution_status, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_trigger 
    ON rule_execution_logs(trigger_type, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_date 
    ON rule_execution_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_conversation 
    ON rule_execution_logs(conversation_id) 
    WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_customer 
    ON rule_execution_logs(customer_id) 
    WHERE customer_id IS NOT NULL;
-- Índice para estatísticas (performance crítica)
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_stats 
    ON rule_execution_logs(rule_id, execution_status, executed_at DESC);
-- ============================================
-- FUNÇÃO: update_updated_at_column()
-- ============================================
-- Reutilizar função existente ou criar se não existir

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;
-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para updated_at automático
CREATE TRIGGER update_automation_rules_updated_at
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_execution_logs ENABLE ROW LEVEL SECURITY;
-- Políticas para automation_rules
CREATE POLICY "Users can view own automation rules"
    ON automation_rules FOR SELECT
    USING (auth.uid() = created_by AND deleted_at IS NULL);
CREATE POLICY "Users can insert own automation rules"
    ON automation_rules FOR INSERT
    WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own automation rules"
    ON automation_rules FOR UPDATE
    USING (auth.uid() = created_by AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = created_by);
-- Política para soft delete (UPDATE com deleted_at)
CREATE POLICY "Users can delete own automation rules"
    ON automation_rules FOR UPDATE
    USING (auth.uid() = created_by AND deleted_at IS NULL);
-- Políticas para rule_execution_logs
CREATE POLICY "Users can view logs of own rules"
    ON rule_execution_logs FOR SELECT
    USING (
        rule_id IN (
            SELECT id FROM automation_rules 
            WHERE created_by = auth.uid() AND deleted_at IS NULL
        )
    );
-- Sistema pode inserir logs (service role)
CREATE POLICY "System can insert execution logs"
    ON rule_execution_logs FOR INSERT
    WITH CHECK (true);
-- Admins podem ver tudo
CREATE POLICY "Admins can view all automation rules"
    ON automation_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
            AND user_roles.deleted_at IS NULL
        )
    );
CREATE POLICY "Admins can view all execution logs"
    ON rule_execution_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
            AND user_roles.deleted_at IS NULL
        )
    );
-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para calcular estatísticas de automação
CREATE OR REPLACE FUNCTION get_automation_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    fluxos_ativos INTEGER,
    mensagens_enviadas_hoje INTEGER,
    taxa_media_abertura TEXT
) AS $$
DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
    v_fluxos_ativos INTEGER;
    v_mensagens_hoje INTEGER;
    v_taxa_media DECIMAL(5,2);
BEGIN
    -- Contar fluxos ativos
    SELECT COUNT(*)::INTEGER INTO v_fluxos_ativos
    FROM automation_rules
    WHERE created_by = v_user_id
    AND status = 'ativa'
    AND deleted_at IS NULL;
    
    -- Contar execuções hoje (proxy para mensagens enviadas)
    SELECT COUNT(*)::INTEGER INTO v_mensagens_hoje
    FROM rule_execution_logs rel
    JOIN automation_rules ar ON ar.id = rel.rule_id
    WHERE ar.created_by = v_user_id
    AND rel.executed_at >= CURRENT_DATE
    AND rel.execution_status = 'success'
    AND ar.deleted_at IS NULL;
    
    -- Calcular taxa média de abertura
    SELECT COALESCE(AVG(taxa_abertura_percent), 0.00) INTO v_taxa_media
    FROM automation_rules
    WHERE created_by = v_user_id
    AND status = 'ativa'
    AND deleted_at IS NULL;
    
    RETURN QUERY SELECT 
        v_fluxos_ativos,
        v_mensagens_hoje,
        v_taxa_media::TEXT || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Função para atualizar métricas de regra
CREATE OR REPLACE FUNCTION update_rule_metrics(p_rule_id UUID)
RETURNS VOID AS $$
DECLARE
    v_disparos_mes INTEGER;
    v_taxa_abertura DECIMAL(5,2);
    v_total_execucoes INTEGER;
    v_execucoes_sucesso INTEGER;
BEGIN
    -- Contar disparos no último mês
    SELECT COUNT(*)::INTEGER INTO v_disparos_mes
    FROM rule_execution_logs
    WHERE rule_id = p_rule_id
    AND executed_at >= (CURRENT_DATE - INTERVAL '30 days');
    
    -- Calcular taxa de sucesso (proxy para taxa de abertura)
    SELECT 
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE execution_status = 'success')::INTEGER
    INTO v_total_execucoes, v_execucoes_sucesso
    FROM rule_execution_logs
    WHERE rule_id = p_rule_id
    AND executed_at >= (CURRENT_DATE - INTERVAL '30 days');
    
    -- Calcular taxa de abertura
    IF v_total_execucoes > 0 THEN
        v_taxa_abertura := (v_execucoes_sucesso::DECIMAL / v_total_execucoes::DECIMAL) * 100;
    ELSE
        v_taxa_abertura := 0.00;
    END IF;
    
    -- Atualizar regra
    UPDATE automation_rules
    SET 
        disparos_mes = v_disparos_mes,
        taxa_abertura_percent = v_taxa_abertura,
        updated_at = NOW()
    WHERE id = p_rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- VIEWS PARA RELATÓRIOS
-- ============================================

-- View para estatísticas de execução
CREATE VIEW automation_execution_stats AS
SELECT 
    ar.id as rule_id,
    ar.nome as rule_name,
    ar.gatilho as trigger_type,
    ar.status,
    COUNT(rel.id) as total_executions,
    COUNT(rel.id) FILTER (WHERE rel.execution_status = 'success') as successful_executions,
    COUNT(rel.id) FILTER (WHERE rel.execution_status = 'failed') as failed_executions,
    COUNT(rel.id) FILTER (WHERE rel.execution_status = 'partial') as partial_executions,
    AVG(rel.duration_ms) as avg_duration_ms,
    MAX(rel.executed_at) as last_execution,
    ar.created_by as user_id
FROM automation_rules ar
LEFT JOIN rule_execution_logs rel ON rel.rule_id = ar.id
WHERE ar.deleted_at IS NULL
GROUP BY ar.id, ar.nome, ar.gatilho, ar.status, ar.created_by;
-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE automation_rules IS 'Regras de automação configuradas pelos usuários';
COMMENT ON COLUMN automation_rules.nome IS 'Nome da regra de automação';
COMMENT ON COLUMN automation_rules.gatilho IS 'Tipo de evento que dispara a regra';
COMMENT ON COLUMN automation_rules.gatilho_config IS 'Configuração específica do gatilho em JSON';
COMMENT ON COLUMN automation_rules.condicoes IS 'Array de condições para execução da regra';
COMMENT ON COLUMN automation_rules.acoes IS 'Array de ações a serem executadas';
COMMENT ON COLUMN automation_rules.disparos_mes IS 'Número de disparos no último mês';
COMMENT ON COLUMN automation_rules.taxa_abertura_percent IS 'Taxa de sucesso/abertura em percentual';
COMMENT ON TABLE rule_execution_logs IS 'Logs de execução de regras de automação';
COMMENT ON COLUMN rule_execution_logs.trigger_data IS 'Dados do evento que disparou a regra';
COMMENT ON COLUMN rule_execution_logs.conditions_met IS 'Se as condições da regra foram atendidas';
COMMENT ON COLUMN rule_execution_logs.actions_executed IS 'Array de ações executadas com resultados';
COMMENT ON COLUMN rule_execution_logs.duration_ms IS 'Duração da execução em milissegundos';
COMMENT ON FUNCTION get_automation_stats IS 'Retorna estatísticas de automação para o frontend';
COMMENT ON FUNCTION update_rule_metrics IS 'Atualiza métricas de disparos e taxa de abertura de uma regra';
COMMENT ON VIEW automation_execution_stats IS 'Estatísticas de execução por regra de automação';
COMMIT;
-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP VIEW IF EXISTS automation_execution_stats CASCADE;
-- DROP FUNCTION IF EXISTS get_automation_stats CASCADE;
-- DROP FUNCTION IF EXISTS update_rule_metrics CASCADE;
-- DROP TABLE IF EXISTS rule_execution_logs CASCADE;
-- DROP TABLE IF EXISTS automation_rules CASCADE;
-- COMMIT;
