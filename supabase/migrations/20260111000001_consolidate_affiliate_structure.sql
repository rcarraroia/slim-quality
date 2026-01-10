-- Migration: Consolidação da Estrutura de Afiliados
-- Created: 11/01/2026
-- Author: Kiro AI
-- Description: Consolida hierarquia de afiliados em fonte única (referred_by),
--              cria view materializada para performance, e adiciona validações

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela affiliates existe com coluna referred_by (UUID, nullable)
--   ✅ Tabela affiliate_network existe (redundante, será removida em migration futura)
--   ✅ Ambas têm 2 registros cada
--   ✅ Estrutura atual permite migração segura
-- ============================================

BEGIN;

-- ============================================
-- ETAPA 1: SINCRONIZAÇÃO DE DADOS
-- ============================================
-- Garantir que referred_by está populado com dados de affiliate_network

UPDATE affiliates a
SET referred_by = (
  SELECT parent_id 
  FROM affiliate_network an 
  WHERE an.affiliate_id = a.id
)
WHERE referred_by IS NULL
  AND EXISTS (
    SELECT 1 FROM affiliate_network an2 
    WHERE an2.affiliate_id = a.id
  );

-- Log de sincronização
DO $$
DECLARE
  synced_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO synced_count
  FROM affiliates
  WHERE referred_by IS NOT NULL;
  
  RAISE NOTICE 'Sincronização concluída: % afiliados com referred_by preenchido', synced_count;
END $$;

-- ============================================
-- ETAPA 2: CONSTRAINTS E ÍNDICES
-- ============================================

-- 2.1. Adicionar constraint de foreign key
ALTER TABLE affiliates
ADD CONSTRAINT fk_affiliates_referred_by
FOREIGN KEY (referred_by) 
REFERENCES affiliates(id)
ON DELETE SET NULL;

-- 2.2. Criar índice para performance de queries recursivas
CREATE INDEX IF NOT EXISTS idx_affiliates_referred_by 
ON affiliates(referred_by) 
WHERE referred_by IS NOT NULL;

-- 2.3. Criar índice composto para filtros comuns
CREATE INDEX IF NOT EXISTS idx_affiliates_status_referred_by
ON affiliates(status, referred_by)
WHERE deleted_at IS NULL;

-- ============================================
-- ETAPA 3: VIEW MATERIALIZADA
-- ============================================

-- 3.1. Criar view materializada para hierarquia (cache de performance)
CREATE MATERIALIZED VIEW affiliate_hierarchy AS
WITH RECURSIVE hierarchy AS (
  -- Base: raiz (afiliados sem pai)
  SELECT 
    id,
    id as root_id,
    ARRAY[id] as path,
    0 as level,
    name,
    email,
    referral_code,
    status,
    created_at
  FROM affiliates
  WHERE referred_by IS NULL
    AND deleted_at IS NULL
  
  UNION ALL
  
  -- Recursivo: filhos (máximo 3 níveis)
  SELECT 
    a.id,
    h.root_id,
    h.path || a.id,
    h.level + 1,
    a.name,
    a.email,
    a.referral_code,
    a.status,
    a.created_at
  FROM affiliates a
  JOIN hierarchy h ON a.referred_by = h.id
  WHERE h.level < 3
    AND a.deleted_at IS NULL
)
SELECT * FROM hierarchy;

-- 3.2. Criar índices na view materializada
CREATE UNIQUE INDEX idx_affiliate_hierarchy_id ON affiliate_hierarchy(id);
CREATE INDEX idx_affiliate_hierarchy_root ON affiliate_hierarchy(root_id);
CREATE INDEX idx_affiliate_hierarchy_level ON affiliate_hierarchy(level);
CREATE INDEX idx_affiliate_hierarchy_path ON affiliate_hierarchy USING GIN(path);

-- ============================================
-- ETAPA 4: FUNÇÃO DE REFRESH
-- ============================================

-- 4.1. Criar função para refresh automático da view
CREATE OR REPLACE FUNCTION refresh_affiliate_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh concorrente para não bloquear leituras
  REFRESH MATERIALIZED VIEW CONCURRENTLY affiliate_hierarchy;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ETAPA 5: TRIGGERS DE ATUALIZAÇÃO
-- ============================================

-- 5.1. Trigger para INSERT
CREATE TRIGGER trigger_refresh_hierarchy_insert
AFTER INSERT ON affiliates
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_affiliate_hierarchy();

-- 5.2. Trigger para UPDATE
CREATE TRIGGER trigger_refresh_hierarchy_update
AFTER UPDATE ON affiliates
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_affiliate_hierarchy();

-- 5.3. Trigger para DELETE
CREATE TRIGGER trigger_refresh_hierarchy_delete
AFTER DELETE ON affiliates
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_affiliate_hierarchy();

-- ============================================
-- ETAPA 6: VALIDAÇÕES
-- ============================================

-- 6.1. Função para detectar loops na hierarquia
CREATE OR REPLACE FUNCTION check_affiliate_loop(affiliate_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  visited UUID[];
  current_id UUID;
  max_iterations INTEGER := 10;
  iteration INTEGER := 0;
BEGIN
  current_id := affiliate_id;
  visited := ARRAY[current_id];
  
  LOOP
    iteration := iteration + 1;
    
    -- Proteção contra loop infinito
    IF iteration > max_iterations THEN
      RETURN TRUE; -- Loop detectado
    END IF;
    
    -- Buscar pai
    SELECT referred_by INTO current_id
    FROM affiliates
    WHERE id = current_id;
    
    -- Se não tem pai, não há loop
    IF current_id IS NULL THEN
      RETURN FALSE;
    END IF;
    
    -- Se já visitamos este ID, há loop
    IF current_id = ANY(visited) THEN
      RETURN TRUE;
    END IF;
    
    visited := visited || current_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6.2. Validar que não há loops na hierarquia atual
DO $$
DECLARE
  loop_count INTEGER;
  affiliate_record RECORD;
BEGIN
  loop_count := 0;
  
  FOR affiliate_record IN 
    SELECT id, name, email FROM affiliates WHERE referred_by IS NOT NULL
  LOOP
    IF check_affiliate_loop(affiliate_record.id) THEN
      loop_count := loop_count + 1;
      RAISE WARNING 'Loop detectado no afiliado: % (%, %)', 
        affiliate_record.id, affiliate_record.name, affiliate_record.email;
    END IF;
  END LOOP;
  
  IF loop_count > 0 THEN
    RAISE EXCEPTION 'Migration abortada: % loops detectados na hierarquia', loop_count;
  ELSE
    RAISE NOTICE 'Validação de loops: OK (0 loops encontrados)';
  END IF;
END $$;

-- 6.3. Validar integridade referencial
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM affiliates a
  WHERE a.referred_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM affiliates p WHERE p.id = a.referred_by
    );
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Encontrados % afiliados órfãos (referred_by aponta para ID inexistente)', orphan_count;
  ELSE
    RAISE NOTICE 'Validação de integridade: OK (0 órfãos encontrados)';
  END IF;
END $$;

-- ============================================
-- ETAPA 7: ESTATÍSTICAS E LOGS
-- ============================================

-- 7.1. Registrar estatísticas da migration
DO $$
DECLARE
  total_affiliates INTEGER;
  root_affiliates INTEGER;
  level1_affiliates INTEGER;
  level2_affiliates INTEGER;
  level3_affiliates INTEGER;
BEGIN
  -- Contar totais
  SELECT COUNT(*) INTO total_affiliates FROM affiliates WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO root_affiliates FROM affiliates WHERE referred_by IS NULL AND deleted_at IS NULL;
  
  -- Contar por nível na view
  SELECT COUNT(*) INTO level1_affiliates FROM affiliate_hierarchy WHERE level = 1;
  SELECT COUNT(*) INTO level2_affiliates FROM affiliate_hierarchy WHERE level = 2;
  SELECT COUNT(*) INTO level3_affiliates FROM affiliate_hierarchy WHERE level = 3;
  
  -- Log de estatísticas
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ESTATÍSTICAS DA MIGRATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de afiliados: %', total_affiliates;
  RAISE NOTICE 'Afiliados raiz (sem pai): %', root_affiliates;
  RAISE NOTICE 'Afiliados nível 1: %', level1_affiliates;
  RAISE NOTICE 'Afiliados nível 2: %', level2_affiliates;
  RAISE NOTICE 'Afiliados nível 3: %', level3_affiliates;
  RAISE NOTICE '========================================';
END $$;

-- 7.2. Adicionar comentários para documentação
COMMENT ON COLUMN affiliates.referred_by IS 
'Referência ao afiliado pai. Fonte única de verdade para hierarquia e comissões. NULL = afiliado raiz.';

COMMENT ON MATERIALIZED VIEW affiliate_hierarchy IS 
'View materializada com hierarquia completa de afiliados (até 3 níveis). Atualizada automaticamente via triggers.';

COMMENT ON FUNCTION refresh_affiliate_hierarchy() IS 
'Função para refresh da view materializada affiliate_hierarchy. Executada automaticamente via triggers.';

COMMENT ON FUNCTION check_affiliate_loop(UUID) IS 
'Valida se um afiliado está em um loop na hierarquia. Retorna TRUE se loop detectado.';

COMMIT;

-- ============================================
-- ROLLBACK PLAN (para referência)
-- ============================================
-- Em caso de necessidade de rollback, executar:
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_refresh_hierarchy_insert ON affiliates;
-- DROP TRIGGER IF EXISTS trigger_refresh_hierarchy_update ON affiliates;
-- DROP TRIGGER IF EXISTS trigger_refresh_hierarchy_delete ON affiliates;
-- DROP FUNCTION IF EXISTS refresh_affiliate_hierarchy();
-- DROP FUNCTION IF EXISTS check_affiliate_loop(UUID);
-- DROP MATERIALIZED VIEW IF EXISTS affiliate_hierarchy;
-- DROP INDEX IF EXISTS idx_affiliates_referred_by;
-- DROP INDEX IF EXISTS idx_affiliates_status_referred_by;
-- ALTER TABLE affiliates DROP CONSTRAINT IF EXISTS fk_affiliates_referred_by;
-- COMMIT;
