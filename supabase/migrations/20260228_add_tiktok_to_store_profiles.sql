-- Migration: Adicionar campo TikTok em store_profiles
-- Created: 28/02/2026
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela store_profiles existe
--   ✅ Campo tiktok não existe
--   ✅ Operação não-destrutiva (ADD COLUMN)
-- ============================================

-- UP Migration
BEGIN;

-- Adicionar coluna tiktok
ALTER TABLE store_profiles 
ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255);

-- Adicionar comentário
COMMENT ON COLUMN store_profiles.tiktok IS 'TikTok username (ex: @usuario) ou URL completa (ex: https://tiktok.com/@usuario)';

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- ALTER TABLE store_profiles DROP COLUMN IF EXISTS tiktok;
-- COMMIT;
