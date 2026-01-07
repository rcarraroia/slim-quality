-- ===================================
-- TABELA: memory_chunks
-- ===================================
-- Armazena memórias vetorizadas (embeddings) para o SICC
-- Sistema de Inteligência Corporativa Contínua

CREATE TABLE IF NOT EXISTS memory_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(384) NOT NULL,
    metadata JSONB DEFAULT '{}',
    relevance_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_memory_chunks_embedding ON memory_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_conversation ON memory_chunks(conversation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memory_chunks_metadata ON memory_chunks USING GIN(metadata) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memory_chunks_relevance ON memory_chunks(relevance_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memory_chunks_created_at ON memory_chunks(created_at DESC) WHERE deleted_at IS NULL;
-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_memory_chunks_updated_at
    BEFORE UPDATE ON memory_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- RLS (Row Level Security)
ALTER TABLE memory_chunks ENABLE ROW LEVEL SECURITY;
-- Política RLS: Usuários podem ver todas as memórias (sistema interno)
CREATE POLICY "Allow all access to memory_chunks"
    ON memory_chunks FOR ALL
    USING (deleted_at IS NULL);
-- Comentários
COMMENT ON TABLE memory_chunks IS 'Memórias vetorizadas para SICC - embeddings de conversas';
COMMENT ON COLUMN memory_chunks.conversation_id IS 'ID da conversa de origem';
COMMENT ON COLUMN memory_chunks.content IS 'Conteúdo textual original';
COMMENT ON COLUMN memory_chunks.embedding IS 'Vetor embedding 384 dimensões (GTE-small)';
COMMENT ON COLUMN memory_chunks.metadata IS 'Metadados contextuais em JSON';
COMMENT ON COLUMN memory_chunks.relevance_score IS 'Score de relevância (0.0-1.0)';
COMMENT ON COLUMN memory_chunks.deleted_at IS 'Soft delete timestamp';
