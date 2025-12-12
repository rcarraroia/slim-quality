-- Migration: Fix shipping_addresses phone field
-- Created: 2025-12-12
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ❌ Campo phone em shipping_addresses é obrigatório
--   ✅ Precisa ser opcional ou ter valor padrão
-- ============================================

-- UP Migration
BEGIN;

-- Tornar campo phone opcional em shipping_addresses
ALTER TABLE shipping_addresses 
ALTER COLUMN phone DROP NOT NULL;

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- ALTER TABLE shipping_addresses ALTER COLUMN phone SET NOT NULL;
-- COMMIT;