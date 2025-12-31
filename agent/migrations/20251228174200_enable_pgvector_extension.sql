-- ===================================
-- EXTENSÃO: pgvector
-- ===================================
-- Habilita extensão pgvector para busca vetorial
-- Necessária para o Sistema de Inteligência Corporativa Contínua (SICC)

-- Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Comentários
COMMENT ON EXTENSION vector IS 'Extensão pgvector para busca vetorial - SICC';