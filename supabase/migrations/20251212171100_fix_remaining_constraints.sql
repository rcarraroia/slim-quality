-- Migration: Fix remaining constraints for sales system
-- Created: 2025-12-12
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Foreign key orders→customers corrigida
--   ❌ Campo product_sku em order_items é obrigatório
--   ❌ Constraint source muito restritiva
-- ============================================

-- UP Migration
BEGIN;
-- 1. Tornar product_sku opcional em order_items (pode ser gerado automaticamente)
ALTER TABLE order_items 
ALTER COLUMN product_sku DROP NOT NULL;
-- 2. Expandir constraint de source para incluir valores necessários
-- Primeiro, remover constraint existente
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_source_valid;
-- Criar nova constraint com mais valores
ALTER TABLE customers 
ADD CONSTRAINT customers_source_valid 
CHECK (source IN (
    'affiliate',    -- Afiliado
    'organic',      -- Orgânico
    'website',      -- Site direto
    'whatsapp',     -- WhatsApp/BIA
    'direct',       -- Venda direta
    'social',       -- Redes sociais
    'email',        -- Email marketing
    'google',       -- Google Ads
    'facebook',     -- Facebook Ads
    'instagram',    -- Instagram
    'referral'      -- Indicação
));
COMMIT;
-- DOWN Migration (para rollback)
-- BEGIN;
-- ALTER TABLE order_items ALTER COLUMN product_sku SET NOT NULL;
-- ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_source_valid;
-- ALTER TABLE customers ADD CONSTRAINT customers_source_valid CHECK (source IN ('affiliate', 'organic'));
-- COMMIT;
