-- Migration: Adicionar campo read_at em notification_logs
-- Created: 2026-02-24
-- Author: Kiro AI
-- Sprint: Sistema de Notificações - Fase 1

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela notification_logs existe no banco real
--   ✅ Campo read_at não existe (validado via Supabase Power)
--   ✅ Adição de coluna nullable não afeta dados existentes
--   ✅ Índice otimizado para consultas de não lidas
-- ============================================

BEGIN;

-- Adicionar coluna read_at
ALTER TABLE notification_logs 
ADD COLUMN read_at TIMESTAMPTZ NULL;

-- Criar índice para consultas de notificações não lidas
CREATE INDEX idx_notification_logs_read_at 
  ON notification_logs(read_at) 
  WHERE read_at IS NOT NULL;

-- Criar índice composto para consultas de afiliado + não lidas
CREATE INDEX idx_notification_logs_affiliate_unread
  ON notification_logs(affiliate_id, sent_at DESC)
  WHERE read_at IS NULL;

-- Adicionar comentário para documentação
COMMENT ON COLUMN notification_logs.read_at IS 'Timestamp de quando a notificação foi marcada como lida pelo afiliado. NULL = não lida.';

COMMIT;

-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP INDEX IF EXISTS idx_notification_logs_affiliate_unread;
-- DROP INDEX IF EXISTS idx_notification_logs_read_at;
-- ALTER TABLE notification_logs DROP COLUMN IF EXISTS read_at;
-- COMMIT;
