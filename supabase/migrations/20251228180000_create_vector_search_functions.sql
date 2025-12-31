-- ===================================
-- FUNÇÕES DE BUSCA VETORIAL - SICC
-- ===================================
-- Funções RPC para busca vetorial eficiente usando pgvector
-- Sistema de Inteligência Corporativa Contínua

-- Função para busca de memórias similares por embedding
CREATE OR REPLACE FUNCTION search_similar_memories(
    query_embedding vector(384),
    similarity_threshold float DEFAULT 0.1,
    max_results int DEFAULT 10,
    conversation_filter uuid DEFAULT NULL,
    metadata_filter jsonb DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    conversation_id uuid,
    content text,
    metadata jsonb,
    relevance_score float,
    similarity_score float,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.conversation_id,
        mc.content,
        mc.metadata,
        mc.relevance_score,
        1 - (mc.embedding <=> query_embedding) as similarity_score,
        mc.created_at
    FROM memory_chunks mc
    WHERE 
        mc.deleted_at IS NULL
        AND (1 - (mc.embedding <=> query_embedding)) >= similarity_threshold
        AND (conversation_filter IS NULL OR mc.conversation_id = conversation_filter)
        AND (metadata_filter IS NULL OR mc.metadata @> metadata_filter)
    ORDER BY mc.embedding <=> query_embedding
    LIMIT max_results;
END;
$$;

-- Função para busca híbrida (vetorial + texto)
CREATE OR REPLACE FUNCTION search_memories_hybrid(
    query_text text,
    query_embedding vector(384),
    similarity_threshold float DEFAULT 0.1,
    text_weight float DEFAULT 0.3,
    vector_weight float DEFAULT 0.7,
    max_results int DEFAULT 10,
    conversation_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    conversation_id uuid,
    content text,
    metadata jsonb,
    relevance_score float,
    similarity_score float,
    text_score float,
    combined_score float,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.conversation_id,
        mc.content,
        mc.metadata,
        mc.relevance_score,
        1 - (mc.embedding <=> query_embedding) as similarity_score,
        ts_rank_cd(to_tsvector('portuguese', mc.content), plainto_tsquery('portuguese', query_text)) as text_score,
        (
            (1 - (mc.embedding <=> query_embedding)) * vector_weight +
            ts_rank_cd(to_tsvector('portuguese', mc.content), plainto_tsquery('portuguese', query_text)) * text_weight
        ) as combined_score,
        mc.created_at
    FROM memory_chunks mc
    WHERE 
        mc.deleted_at IS NULL
        AND (1 - (mc.embedding <=> query_embedding)) >= similarity_threshold
        AND (conversation_filter IS NULL OR mc.conversation_id = conversation_filter)
        AND (
            query_text IS NULL OR 
            to_tsvector('portuguese', mc.content) @@ plainto_tsquery('portuguese', query_text)
        )
    ORDER BY combined_score DESC
    LIMIT max_results;
END;
$$;

-- Função para obter estatísticas de memórias
CREATE OR REPLACE FUNCTION get_memory_stats(
    conversation_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    total_memories bigint,
    avg_relevance_score float,
    oldest_memory timestamptz,
    newest_memory timestamptz,
    conversations_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_memories,
        AVG(mc.relevance_score) as avg_relevance_score,
        MIN(mc.created_at) as oldest_memory,
        MAX(mc.created_at) as newest_memory,
        COUNT(DISTINCT mc.conversation_id) as conversations_count
    FROM memory_chunks mc
    WHERE 
        mc.deleted_at IS NULL
        AND (conversation_filter IS NULL OR mc.conversation_id = conversation_filter);
END;
$$;

-- Função para limpeza inteligente de memórias
CREATE OR REPLACE FUNCTION cleanup_memories_intelligent(
    retention_days int DEFAULT 90,
    min_relevance_score float DEFAULT 0.3,
    max_memories_per_conversation int DEFAULT 100
)
RETURNS TABLE (
    deleted_count bigint,
    cleanup_type text,
    details jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
    old_memories_count bigint;
    low_relevance_count bigint;
    excess_memories_count bigint;
    cutoff_date timestamptz;
BEGIN
    cutoff_date := NOW() - (retention_days || ' days')::interval;
    
    -- 1. Remover memórias antigas com baixa relevância
    UPDATE memory_chunks 
    SET deleted_at = NOW()
    WHERE deleted_at IS NULL
        AND created_at < cutoff_date
        AND relevance_score < min_relevance_score;
    
    GET DIAGNOSTICS old_memories_count = ROW_COUNT;
    
    -- 2. Remover memórias com relevância muito baixa (independente da idade)
    UPDATE memory_chunks 
    SET deleted_at = NOW()
    WHERE deleted_at IS NULL
        AND relevance_score < (min_relevance_score / 2);
    
    GET DIAGNOSTICS low_relevance_count = ROW_COUNT;
    
    -- 3. Limitar memórias por conversa (manter apenas as mais relevantes)
    WITH excess_memories AS (
        SELECT id
        FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (
                       PARTITION BY conversation_id 
                       ORDER BY relevance_score DESC, created_at DESC
                   ) as rn
            FROM memory_chunks
            WHERE deleted_at IS NULL
        ) ranked
        WHERE rn > max_memories_per_conversation
    )
    UPDATE memory_chunks 
    SET deleted_at = NOW()
    WHERE id IN (SELECT id FROM excess_memories);
    
    GET DIAGNOSTICS excess_memories_count = ROW_COUNT;
    
    -- Retornar estatísticas da limpeza
    RETURN QUERY VALUES 
        (old_memories_count, 'old_low_relevance', jsonb_build_object('cutoff_date', cutoff_date, 'min_relevance', min_relevance_score)),
        (low_relevance_count, 'very_low_relevance', jsonb_build_object('threshold', min_relevance_score / 2)),
        (excess_memories_count, 'excess_per_conversation', jsonb_build_object('max_per_conversation', max_memories_per_conversation));
END;
$$;

-- Função para atualizar relevance_score baseado em uso
CREATE OR REPLACE FUNCTION update_memory_relevance(
    memory_id uuid,
    usage_boost float DEFAULT 0.1
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    current_score float;
    new_score float;
BEGIN
    -- Obter score atual
    SELECT relevance_score INTO current_score
    FROM memory_chunks
    WHERE id = memory_id AND deleted_at IS NULL;
    
    IF current_score IS NULL THEN
        RETURN false;
    END IF;
    
    -- Calcular novo score (máximo 1.0)
    new_score := LEAST(1.0, current_score + usage_boost);
    
    -- Atualizar score
    UPDATE memory_chunks
    SET relevance_score = new_score,
        updated_at = NOW()
    WHERE id = memory_id;
    
    RETURN true;
END;
$$;

-- Comentários das funções
COMMENT ON FUNCTION search_similar_memories IS 'Busca memórias similares usando pgvector com filtros opcionais';
COMMENT ON FUNCTION search_memories_hybrid IS 'Busca híbrida combinando similaridade vetorial e busca textual';
COMMENT ON FUNCTION get_memory_stats IS 'Retorna estatísticas das memórias armazenadas';
COMMENT ON FUNCTION cleanup_memories_intelligent IS 'Limpeza inteligente de memórias baseada em relevância e idade';
COMMENT ON FUNCTION update_memory_relevance IS 'Atualiza relevance_score de uma memória baseado no uso';

-- Permissões para as funções
GRANT EXECUTE ON FUNCTION search_similar_memories TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_memories_hybrid TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_memory_stats TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_memories_intelligent TO service_role;
GRANT EXECUTE ON FUNCTION update_memory_relevance TO authenticated, service_role;