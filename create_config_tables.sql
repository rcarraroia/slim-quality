
-- ============================================
-- CRIAÇÃO DAS TABELAS DE CONFIGURAÇÃO
-- Data: 03/01/2026
-- Objetivo: Persistir configurações do agente e SICC
-- ============================================

-- 1. TABELA DE CONFIGURAÇÃO DO AGENTE
CREATE TABLE agent_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER NOT NULL DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 4000),
    system_prompt TEXT,
    sicc_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at na tabela agent_config
CREATE TRIGGER update_agent_config_updated_at
    BEFORE UPDATE ON agent_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração padrão do agente
INSERT INTO agent_config (model, temperature, max_tokens, system_prompt, sicc_enabled) 
VALUES (
    'gpt-4o', 
    0.7, 
    2000, 
    'Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality. Seja consultiva, empática e focada em resolver problemas de saúde e sono dos clientes. Apresente os produtos de forma educativa, não apenas vendedora.',
    false
);

-- 2. TABELA DE CONFIGURAÇÃO DO SICC
CREATE TABLE sicc_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sicc_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_approval_threshold INTEGER NOT NULL DEFAULT 75 CHECK (auto_approval_threshold >= 0 AND auto_approval_threshold <= 100),
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    memory_quota INTEGER NOT NULL DEFAULT 500 CHECK (memory_quota >= 100 AND memory_quota <= 2000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at na tabela sicc_config
CREATE TRIGGER update_sicc_config_updated_at
    BEFORE UPDATE ON sicc_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração padrão do SICC
INSERT INTO sicc_config (sicc_enabled, auto_approval_threshold, embedding_model, memory_quota) 
VALUES (false, 75, 'sentence-transformers/all-MiniLM-L6-v2', 500);

-- ============================================
-- VERIFICAÇÃO DAS TABELAS CRIADAS
-- ============================================

-- Verificar se as tabelas foram criadas
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name IN ('agent_config', 'sicc_config')
ORDER BY table_name, ordinal_position;

-- Verificar dados inseridos
SELECT 'agent_config' as tabela, COUNT(*) as registros FROM agent_config
UNION ALL
SELECT 'sicc_config' as tabela, COUNT(*) as registros FROM sicc_config;