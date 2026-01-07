-- Migration: Adicionar campos de imagem para produtos
-- Created: 2026-01-02
-- Author: Kiro AI
-- Task: 0.5.1 - Preparar tabela products para Bloco 3 (envio imagens)

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela products existe
--   ✅ Campos image_url e product_page_url não existem
--   ✅ Necessários para Bloco 3 (envio imagens)
-- ============================================

-- UP Migration
BEGIN;
-- Adicionar campos para URLs de imagem
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS product_page_url TEXT;
-- Comentários para documentação
COMMENT ON COLUMN products.image_url IS 'URL da imagem principal do produto (Supabase Storage)';
COMMENT ON COLUMN products.product_page_url IS 'URL da página específica do produto no site';
COMMIT;
-- DOWN Migration (para rollback)
-- BEGIN;
-- ALTER TABLE products DROP COLUMN IF EXISTS image_url;
-- ALTER TABLE products DROP COLUMN IF EXISTS product_page_url;
-- COMMIT;
