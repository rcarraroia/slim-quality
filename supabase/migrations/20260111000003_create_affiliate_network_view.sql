-- Migration: Criar VIEW materializada para affiliate_network
-- Created: 2026-01-11
-- Author: Kiro AI
-- Sprint: Correção Crítica Sistema de Afiliados
-- Task: 2.4

-- ============================================
-- OBJETIVO
-- ============================================
-- Criar VIEW materializada que deriva a estrutura de rede
-- a partir da coluna affiliates.referred_by
-- Isso permite compatibilidade com código existente que usa affiliate_network
-- enquanto a fonte da verdade passa a ser affiliates.referred_by

-- ============================================
-- ANÁLISE PRÉVIA
-- ============================================
-- Verificado que:
--   ✅ affiliates.referred_by é a fonte da verdade
--   ✅ affiliate_network será deprecada gradualmente
--   ✅ VIEW permite compatibilidade durante transição
--   ✅ Query recursiva constrói árvore genealógica corretamente

-- ============================================
-- CRIAR VIEW MATERIALIZADA
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS affiliate_network_view AS
WITH RECURSIVE network_tree AS (
  -- Caso base: afiliados raiz (sem indicador)
  SELECT 
    a.id as affiliate_id,
    a.referred_by as parent_id,
    1 as level,
    ('/' || a.id::text) as path,
    a.created_at,
    NOW() as updated_at
  FROM affiliates a
  WHERE a.referred_by IS NULL
    AND a.deleted_at IS NULL
  
  UNION ALL
  
  -- Caso recursivo: afiliados com indicador
  SELECT 
    a.id as affiliate_id,
    a.referred_by as parent_id,
    nt.level + 1 as level,
    (nt.path || '/' || a.id::text) as path,
    a.created_at,
    NOW() as updated_at
  FROM affiliates a
  INNER JOIN network_tree nt ON a.referred_by = nt.affiliate_id
  WHERE a.deleted_at IS NULL
    AND nt.level < 10 -- Limite de profundidade para evitar loops infinitos
)
SELECT 
  gen_random_uuid() as id, -- ID único para cada registro da VIEW
  affiliate_id,
  parent_id,
  level,
  path,
  created_at,
  updated_at
FROM network_tree;

-- ============================================
-- CRIAR ÍNDICES OTIMIZADOS
-- ============================================

-- Índice para buscar por affiliate_id (query mais comum)
CREATE INDEX IF NOT EXISTS idx_affiliate_network_view_affiliate_id 
ON affiliate_network_view(affiliate_id);

-- Índice para buscar por parent_id (para queries de filhos)
CREATE INDEX IF NOT EXISTS idx_affiliate_network_view_parent_id 
ON affiliate_network_view(parent_id);

-- Índice para buscar por level (para queries por nível)
CREATE INDEX IF NOT EXISTS idx_affiliate_network_view_level 
ON affiliate_network_view(level);

-- Índice composto para queries comuns (parent + level)
CREATE INDEX IF NOT EXISTS idx_affiliate_network_view_parent_level 
ON affiliate_network_view(parent_id, level);

-- ============================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================

COMMENT ON MATERIALIZED VIEW affiliate_network_view IS 
'VIEW materializada que deriva a estrutura de rede de afiliados a partir de affiliates.referred_by.
Usa query recursiva (CTE) para construir a árvore genealógica completa.
Deve ser atualizada via trigger quando affiliates.referred_by mudar (ver Task 2.5).';

COMMENT ON COLUMN affiliate_network_view.affiliate_id IS 
'ID do afiliado neste nó da rede';

COMMENT ON COLUMN affiliate_network_view.parent_id IS 
'ID do afiliado pai (indicador). NULL para afiliados raiz.';

COMMENT ON COLUMN affiliate_network_view.level IS 
'Nível na árvore: 1=raiz, 2=filho direto, 3=neto, etc. Máximo 10 níveis.';

COMMENT ON COLUMN affiliate_network_view.path IS 
'Caminho completo na árvore no formato /id1/id2/id3 para queries hierárquicas rápidas.';

-- ============================================
-- REFRESH INICIAL
-- ============================================

-- Atualizar VIEW com dados atuais
REFRESH MATERIALIZED VIEW affiliate_network_view;

-- ============================================
-- VALIDAÇÃO
-- ============================================

-- Query de teste: Verificar se VIEW tem mesma quantidade de registros que affiliate_network
-- SELECT 
--   (SELECT COUNT(*) FROM affiliate_network) as network_count,
--   (SELECT COUNT(*) FROM affiliate_network_view) as view_count;

-- Query de teste: Comparar estrutura
-- SELECT 
--   an.affiliate_id,
--   an.parent_id as network_parent,
--   anv.parent_id as view_parent,
--   an.level as network_level,
--   anv.level as view_level
-- FROM affiliate_network an
-- FULL OUTER JOIN affiliate_network_view anv ON an.affiliate_id = anv.affiliate_id
-- WHERE an.parent_id IS DISTINCT FROM anv.parent_id
--    OR an.level IS DISTINCT FROM anv.level;

-- ============================================
-- ROLLBACK (para emergências)
-- ============================================

-- BEGIN;
-- DROP MATERIALIZED VIEW IF EXISTS affiliate_network_view CASCADE;
-- COMMIT;
