-- Migration: Add session_id field to conversations table for Sprint 5
-- Sprint 5: Painel Admin - Agente IA
-- Created: 2025-01-01
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela conversations já existe (migration 20250125000013)
--   ✅ Enum conversation_channel já existe com 'whatsapp', 'email', 'chat', 'phone'
--   ✅ Precisa adicionar 'site' ao enum e campo session_id
--   ✅ Compatível com estrutura existente
-- ============================================

BEGIN;
-- Verificar se o valor 'site' já existe no enum
DO $$ 
BEGIN
    -- Adicionar 'site' ao enum conversation_channel se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'site' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'conversation_channel'
        )
    ) THEN
        ALTER TYPE conversation_channel ADD VALUE 'site';
    END IF;
END $$;
-- Adicionar campo session_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'session_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE conversations 
        ADD COLUMN session_id UUID;
    END IF;
END $$;
-- Criar índice para session_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_conversations_session_id'
    ) THEN
        CREATE INDEX idx_conversations_session_id ON conversations(session_id);
    END IF;
END $$;
-- Atualizar comentário da tabela
COMMENT ON COLUMN conversations.session_id IS 'UUID da sessão para chat público (site) ou identificador externo';
COMMIT;
