-- Criar tabela agent_config
CREATE TABLE IF NOT EXISTS agent_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER NOT NULL DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 4000),
    system_prompt TEXT,
    sicc_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela sicc_config
CREATE TABLE IF NOT EXISTS sicc_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sicc_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_approval_threshold INTEGER NOT NULL DEFAULT 75 CHECK (auto_approval_threshold >= 0 AND auto_approval_threshold <= 100),
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    memory_quota INTEGER NOT NULL DEFAULT 500 CHECK (memory_quota >= 100 AND memory_quota <= 2000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração padrão do agente
INSERT INTO agent_config (model, temperature, max_tokens, system_prompt, sicc_enabled)
VALUES (
    'gpt-4o',
    0.7,
    2000,
    'Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality. Seja consultiva, empática e focada em resolver problemas de saúde e sono dos clientes. Apresente os produtos de forma educativa, não apenas vendedora.',
    false
) ON CONFLICT DO NOTHING;

-- Inserir configuração padrão do SICC
INSERT INTO sicc_config (sicc_enabled, auto_approval_threshold, embedding_model, memory_quota)
VALUES (
    false,
    75,
    'sentence-transformers/all-MiniLM-L6-v2',
    500
) ON CONFLICT DO NOTHING;;
