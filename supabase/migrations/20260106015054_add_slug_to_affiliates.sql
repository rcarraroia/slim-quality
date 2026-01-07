-- Migration: Adicionar slug personalizado para links de indicação
-- Data: 2026-01-05

BEGIN;

-- Adicionar coluna slug
ALTER TABLE affiliates
  ADD COLUMN slug TEXT;

-- Criar índice único para slug
CREATE UNIQUE INDEX idx_affiliates_slug 
  ON affiliates(slug) 
  WHERE deleted_at IS NULL AND slug IS NOT NULL;

-- Comentário
COMMENT ON COLUMN affiliates.slug IS 'Slug personalizado para link de indicação (opcional). Se vazio, usa referral_code';

COMMIT;;
