-- Migration: Remover coluna parent_affiliate_id duplicada
-- Created: 2026-01-11
-- Author: Kiro AI
-- Sprint: Correção Crítica Sistema de Afiliados

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ parent_id e parent_affiliate_id estão 100% sincronizados
--   ✅ Validação Task 2.2.5 passou (0 inconsistências)
--   ✅ Trigger de sincronização automática criado
--   ✅ Código será atualizado para usar apenas parent_id
-- ============================================

-- ============================================
-- REMOVER COLUNA DUPLICADA
-- ============================================

-- Remover coluna parent_affiliate_id da tabela affiliate_network
ALTER TABLE affiliate_network 
DROP COLUMN IF EXISTS parent_affiliate_id;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON COLUMN affiliate_network.parent_id IS 
'ID do afiliado pai na rede multinível. Sincronizado automaticamente com affiliates.referred_by via trigger.';

-- ============================================
-- VALIDAÇÃO PÓS-MIGRATION
-- ============================================

-- Verificar que coluna foi removida:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'affiliate_network' AND column_name = 'parent_affiliate_id';
-- Resultado esperado: 0 rows

-- Verificar que parent_id ainda existe:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'affiliate_network' AND column_name = 'parent_id';
-- Resultado esperado: 1 row

-- ============================================
-- ROLLBACK (para emergências)
-- ============================================

-- BEGIN;
-- ALTER TABLE affiliate_network 
-- ADD COLUMN parent_affiliate_id UUID REFERENCES affiliates(id);
-- 
-- UPDATE affiliate_network 
-- SET parent_affiliate_id = parent_id;
-- COMMIT;
