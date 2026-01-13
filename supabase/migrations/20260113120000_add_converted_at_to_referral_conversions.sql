-- Migration: Adicionar coluna converted_at à tabela referral_conversions
-- Created: 2026-01-13
-- Author: Kiro AI
-- Descrição: Adiciona coluna converted_at para registrar timestamp de conversão

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela referral_conversions existe
--   ✅ Coluna converted_at NÃO existe
--   ✅ Será criada como NULLABLE para não quebrar dados existentes
--   ✅ Valor padrão será NOW() para novos registros
-- ============================================

BEGIN;

-- Adicionar coluna converted_at
ALTER TABLE referral_conversions 
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ NULL DEFAULT NOW();

-- Criar índice para queries por data de conversão
CREATE INDEX IF NOT EXISTS idx_conversions_converted_at 
  ON referral_conversions(converted_at DESC)
  WHERE converted_at IS NOT NULL;

-- Atualizar registros existentes (usar created_at como fallback)
UPDATE referral_conversions 
SET converted_at = created_at 
WHERE converted_at IS NULL;

-- Adicionar comentário
COMMENT ON COLUMN referral_conversions.converted_at IS 'Timestamp de quando a conversão foi registrada';

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- DROP INDEX IF EXISTS idx_conversions_converted_at;
-- ALTER TABLE referral_conversions DROP COLUMN IF EXISTS converted_at;
-- COMMIT;
