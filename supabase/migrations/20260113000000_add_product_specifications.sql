-- Migration: Adicionar campos de especificações técnicas aos produtos
-- Created: 2026-01-13
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela products existe
--   ✅ Campos não existem ainda
--   ✅ Compatível com estrutura existente
-- ============================================

BEGIN;

-- Adicionar campos de especificações opcionais
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS magnetic_count INTEGER CHECK (magnetic_count IS NULL OR magnetic_count > 0),
ADD COLUMN IF NOT EXISTS warranty_years INTEGER CHECK (warranty_years IS NULL OR warranty_years > 0),
ADD COLUMN IF NOT EXISTS therapeutic_technologies INTEGER CHECK (therapeutic_technologies IS NULL OR therapeutic_technologies > 0);

-- Adicionar comentários para documentação
COMMENT ON COLUMN products.magnetic_count IS 'Quantidade de ímãs terapêuticos (ex: 240). NULL se não aplicável';
COMMENT ON COLUMN products.warranty_years IS 'Anos de garantia do produto (ex: 15). NULL se não aplicável';
COMMENT ON COLUMN products.therapeutic_technologies IS 'Quantidade de tecnologias terapêuticas (ex: 8). NULL se não aplicável';

-- Atualizar produtos existentes do tipo colchão com valores padrão
UPDATE products 
SET 
  magnetic_count = 240,
  warranty_years = 15,
  therapeutic_technologies = 8
WHERE product_type = 'mattress' AND magnetic_count IS NULL;

COMMIT;
