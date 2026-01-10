-- Migration: Sincronizar parent_id com parent_affiliate_id
-- Created: 2026-01-11
-- Author: Kiro AI
-- Sprint: Correção Crítica Sistema de Afiliados

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela affiliate_network existe
--   ✅ Coluna parent_id existe (original)
--   ✅ Coluna parent_affiliate_id existe (adicionada em 20260105215220)
--   ✅ Dados estão em parent_affiliate_id mas parent_id está NULL
--   ✅ Código usa parent_id mas dados estão em parent_affiliate_id
--   ✅ Necessário sincronizar: parent_affiliate_id → parent_id
-- ============================================

-- ============================================
-- SINCRONIZAÇÃO: parent_affiliate_id → parent_id
-- ============================================

-- Copiar dados de parent_affiliate_id para parent_id onde parent_id está NULL
UPDATE affiliate_network
SET parent_id = parent_affiliate_id
WHERE parent_affiliate_id IS NOT NULL 
AND parent_id IS NULL;

-- ============================================
-- QUERIES DE VALIDAÇÃO MANUAL (executar após migration)
-- ============================================

-- Query 1: Verificar registros inconsistentes (deve retornar 0 rows)
-- SELECT 
--   id,
--   affiliate_id,
--   parent_id,
--   parent_affiliate_id,
--   level,
--   path
-- FROM affiliate_network
-- WHERE parent_affiliate_id IS NOT NULL 
-- AND parent_id IS NULL;

-- Query 2: Verificar sincronização completa (deve retornar todos os registros com parent)
-- SELECT 
--   id,
--   affiliate_id,
--   parent_id,
--   parent_affiliate_id,
--   level,
--   CASE 
--     WHEN parent_id = parent_affiliate_id THEN '✅ Sincronizado'
--     WHEN parent_id IS NULL AND parent_affiliate_id IS NULL THEN '✅ Raiz (sem parent)'
--     ELSE '❌ INCONSISTENTE'
--   END as status
-- FROM affiliate_network
-- ORDER BY level, created_at;

-- Query 3: Estatísticas gerais
-- SELECT 
--   COUNT(*) as total_registros,
--   COUNT(parent_id) as com_parent_id,
--   COUNT(parent_affiliate_id) as com_parent_affiliate_id,
--   COUNT(CASE WHEN parent_id = parent_affiliate_id THEN 1 END) as sincronizados,
--   COUNT(CASE WHEN parent_id IS NULL AND parent_affiliate_id IS NULL THEN 1 END) as raizes
-- FROM affiliate_network;

-- ============================================
-- ROLLBACK (para emergências)
-- ============================================

-- BEGIN;
-- -- Reverter sincronização (copiar de volta parent_id → parent_affiliate_id)
-- UPDATE affiliate_network
-- SET parent_affiliate_id = parent_id
-- WHERE parent_id IS NOT NULL;
-- COMMIT;

-- ============================================
-- PRÓXIMOS PASSOS
-- ============================================

-- Após validar que esta migration funcionou:
-- 1. Executar Task 2.2: Validar sincronização
-- 2. Executar Task 2.2.5: Validar 100% antes de prosseguir
-- 3. Executar Task 2.3: Remover coluna parent_affiliate_id (migration separada)
-- 4. Atualizar código frontend para usar parent_id ao invés de parent_affiliate_id
