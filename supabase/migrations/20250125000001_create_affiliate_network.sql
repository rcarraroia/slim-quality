-- Migration: Sistema de Afiliados - Árvore Genealógica
-- Created: 2025-01-25
-- Author: Kiro AI
-- Sprint: 4 - Sistema de Afiliados Multinível

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela affiliate_network não existe
--   ✅ Tabela affiliates criada na migration anterior
--   ✅ Função de prevenção de loops implementada
--   ✅ Índices otimizados para queries hierárquicas
--   ✅ Limitação de 3 níveis garantida
-- ============================================

BEGIN;
-- ============================================
-- TABELA: affiliate_network (Árvore Genealógica)
-- ============================================

CREATE TABLE IF NOT EXISTS affiliate_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES affiliates(id) ON DELETE CASCADE, -- NULL = raiz
  
  -- Níveis pré-calculados para performance
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  path TEXT NOT NULL, -- "root.abc123.def456" para queries rápidas
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints críticos
  CONSTRAINT chk_no_self_reference CHECK (affiliate_id != parent_id),
  CONSTRAINT chk_valid_level CHECK (level BETWEEN 1 AND 3),
  CONSTRAINT uq_affiliate_network_unique UNIQUE (affiliate_id) -- Um afiliado só pode ter um pai
);
-- ============================================
-- ÍNDICES PARA QUERIES DE ÁRVORE
-- ============================================

-- Índice principal para affiliate_id (mais usado)
CREATE INDEX idx_network_affiliate 
  ON affiliate_network(affiliate_id);
-- Índice para parent_id (buscar filhos)
CREATE INDEX idx_network_parent 
  ON affiliate_network(parent_id) 
  WHERE parent_id IS NOT NULL;
-- Índice para path (queries hierárquicas com LIKE)
CREATE INDEX idx_network_path 
  ON affiliate_network(path);
-- Índice para level (filtrar por nível)
CREATE INDEX idx_network_level 
  ON affiliate_network(level);
-- Índice composto para queries de rede completa
CREATE INDEX idx_network_parent_level 
  ON affiliate_network(parent_id, level) 
  WHERE parent_id IS NOT NULL;
-- ============================================
-- FUNÇÃO: check_network_loop()
-- ============================================

CREATE OR REPLACE FUNCTION check_network_loop()
RETURNS TRIGGER AS $$
DECLARE
  current_parent UUID;
  depth INTEGER := 0;
  max_depth INTEGER := 10; -- Limite para evitar loop infinito
BEGIN
  -- Se não há parent_id, é raiz (sem loop possível)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se criaria um loop percorrendo a árvore para cima
  current_parent := NEW.parent_id;
  
  WHILE current_parent IS NOT NULL AND depth < max_depth LOOP
    -- Se encontrar o próprio affiliate_id na árvore, é loop
    IF current_parent = NEW.affiliate_id THEN
      RAISE EXCEPTION 'Loop detected in affiliate network: affiliate % cannot be child of %', 
        NEW.affiliate_id, NEW.parent_id;
    END IF;
    
    -- Buscar o próximo nível acima
    SELECT parent_id INTO current_parent
    FROM affiliate_network
    WHERE affiliate_id = current_parent;
    
    depth := depth + 1;
  END LOOP;
  
  -- Se atingiu max_depth, pode haver loop infinito
  IF depth >= max_depth THEN
    RAISE EXCEPTION 'Maximum depth exceeded, possible infinite loop in network';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER prevent_network_loops
  BEFORE INSERT OR UPDATE ON affiliate_network
  FOR EACH ROW 
  EXECUTE FUNCTION check_network_loop();
-- ============================================
-- FUNÇÃO: calculate_network_level()
-- ============================================

CREATE OR REPLACE FUNCTION calculate_network_level()
RETURNS TRIGGER AS $$
DECLARE
  parent_level INTEGER;
  parent_path TEXT;
  affiliate_code TEXT;
BEGIN
  -- Buscar código do afiliado
  SELECT referral_code INTO affiliate_code
  FROM affiliates
  WHERE id = NEW.affiliate_id;
  
  IF affiliate_code IS NULL THEN
    RAISE EXCEPTION 'Affiliate not found: %', NEW.affiliate_id;
  END IF;
  
  -- Se não há parent, é nível 1 (raiz)
  IF NEW.parent_id IS NULL THEN
    NEW.level := 1;
    NEW.path := 'root.' || affiliate_code;
    RETURN NEW;
  END IF;
  
  -- Buscar nível e path do pai
  SELECT level, path INTO parent_level, parent_path
  FROM affiliate_network
  WHERE affiliate_id = NEW.parent_id;
  
  IF parent_level IS NULL THEN
    RAISE EXCEPTION 'Parent affiliate not found in network: %', NEW.parent_id;
  END IF;
  
  -- Calcular novo nível
  NEW.level := parent_level + 1;
  
  -- Validar limite de 3 níveis
  IF NEW.level > 3 THEN
    RAISE EXCEPTION 'Maximum network depth of 3 levels exceeded. Parent is at level %, new level would be %', 
      parent_level, NEW.level;
  END IF;
  
  -- Construir novo path
  NEW.path := parent_path || '.' || affiliate_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER calculate_network_level
  BEFORE INSERT OR UPDATE ON affiliate_network
  FOR EACH ROW 
  EXECUTE FUNCTION calculate_network_level();
-- ============================================
-- TRIGGER: update_updated_at
-- ============================================

CREATE TRIGGER update_affiliate_network_updated_at
  BEFORE UPDATE ON affiliate_network
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- FUNÇÃO: get_network_tree()
-- ============================================

CREATE OR REPLACE FUNCTION get_network_tree(root_affiliate_id UUID, max_levels INTEGER DEFAULT 3)
RETURNS TABLE (
  affiliate_id UUID,
  parent_id UUID,
  level INTEGER,
  path TEXT,
  referral_code TEXT,
  name TEXT,
  status affiliate_status,
  total_conversions INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE network_tree AS (
    -- Nível raiz
    SELECT 
      an.affiliate_id,
      an.parent_id,
      an.level,
      an.path,
      a.referral_code,
      a.name,
      a.status,
      a.total_conversions,
      an.created_at,
      1 as depth
    FROM affiliate_network an
    JOIN affiliates a ON a.id = an.affiliate_id
    WHERE an.affiliate_id = root_affiliate_id
    AND a.deleted_at IS NULL
    
    UNION ALL
    
    -- Níveis filhos (recursivo)
    SELECT 
      an.affiliate_id,
      an.parent_id,
      an.level,
      an.path,
      a.referral_code,
      a.name,
      a.status,
      a.total_conversions,
      an.created_at,
      nt.depth + 1
    FROM affiliate_network an
    JOIN affiliates a ON a.id = an.affiliate_id
    JOIN network_tree nt ON nt.affiliate_id = an.parent_id
    WHERE nt.depth < max_levels
    AND a.deleted_at IS NULL
  )
  SELECT 
    nt.affiliate_id,
    nt.parent_id,
    nt.level,
    nt.path,
    nt.referral_code,
    nt.name,
    nt.status,
    nt.total_conversions,
    nt.created_at
  FROM network_tree nt
  ORDER BY nt.level, nt.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNÇÃO: get_network_ancestors()
-- ============================================

CREATE OR REPLACE FUNCTION get_network_ancestors(affiliate_uuid UUID)
RETURNS TABLE (
  affiliate_id UUID,
  level INTEGER,
  referral_code TEXT,
  name TEXT,
  wallet_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    -- Afiliado atual
    SELECT 
      an.affiliate_id,
      an.parent_id,
      an.level,
      a.referral_code,
      a.name,
      a.wallet_id
    FROM affiliate_network an
    JOIN affiliates a ON a.id = an.affiliate_id
    WHERE an.affiliate_id = affiliate_uuid
    AND a.deleted_at IS NULL
    
    UNION ALL
    
    -- Pais recursivamente
    SELECT 
      an.affiliate_id,
      an.parent_id,
      an.level,
      a.referral_code,
      a.name,
      a.wallet_id
    FROM affiliate_network an
    JOIN affiliates a ON a.id = an.affiliate_id
    JOIN ancestors anc ON anc.parent_id = an.affiliate_id
    WHERE a.deleted_at IS NULL
  )
  SELECT 
    anc.affiliate_id,
    anc.level,
    anc.referral_code,
    anc.name,
    anc.wallet_id
  FROM ancestors anc
  WHERE anc.affiliate_id != affiliate_uuid -- Excluir o próprio afiliado
  ORDER BY anc.level DESC; -- N3, N2, N1
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNÇÃO: get_direct_children()
-- ============================================

CREATE OR REPLACE FUNCTION get_direct_children(parent_affiliate_id UUID)
RETURNS TABLE (
  affiliate_id UUID,
  referral_code TEXT,
  name TEXT,
  status affiliate_status,
  total_conversions INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.referral_code,
    a.name,
    a.status,
    a.total_conversions,
    an.created_at
  FROM affiliate_network an
  JOIN affiliates a ON a.id = an.affiliate_id
  WHERE an.parent_id = parent_affiliate_id
  AND a.deleted_at IS NULL
  ORDER BY an.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNÇÃO: validate_network_integrity()
-- ============================================

CREATE OR REPLACE FUNCTION validate_network_integrity()
RETURNS TABLE (
  issue_type TEXT,
  affiliate_id UUID,
  description TEXT
) AS $$
BEGIN
  -- Verificar loops
  RETURN QUERY
  WITH RECURSIVE loop_check AS (
    SELECT 
      affiliate_id,
      parent_id,
      ARRAY[affiliate_id] as path,
      1 as depth
    FROM affiliate_network
    WHERE parent_id IS NOT NULL
    
    UNION ALL
    
    SELECT 
      lc.affiliate_id,
      an.parent_id,
      lc.path || an.affiliate_id,
      lc.depth + 1
    FROM loop_check lc
    JOIN affiliate_network an ON an.affiliate_id = lc.parent_id
    WHERE lc.depth < 10
    AND NOT (an.affiliate_id = ANY(lc.path))
  )
  SELECT 
    'LOOP'::TEXT,
    lc.affiliate_id,
    'Circular reference detected in path: ' || array_to_string(lc.path, ' -> ')
  FROM loop_check lc
  WHERE lc.affiliate_id = ANY(lc.path[1:array_length(lc.path, 1)-1]);
  
  -- Verificar níveis incorretos
  RETURN QUERY
  SELECT 
    'INVALID_LEVEL'::TEXT,
    an.affiliate_id,
    'Level ' || an.level || ' does not match calculated level based on parent'
  FROM affiliate_network an
  LEFT JOIN affiliate_network parent_an ON parent_an.affiliate_id = an.parent_id
  WHERE (
    (an.parent_id IS NULL AND an.level != 1) OR
    (an.parent_id IS NOT NULL AND an.level != parent_an.level + 1)
  );
  
  -- Verificar paths incorretos
  RETURN QUERY
  SELECT 
    'INVALID_PATH'::TEXT,
    an.affiliate_id,
    'Path does not match expected format'
  FROM affiliate_network an
  JOIN affiliates a ON a.id = an.affiliate_id
  WHERE an.path NOT LIKE '%' || a.referral_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE affiliate_network ENABLE ROW LEVEL SECURITY;
-- Afiliados podem ver apenas própria rede (ascendentes e descendentes)
CREATE POLICY "Affiliates can view own network"
  ON affiliate_network FOR SELECT
  USING (
    -- Próprio registro
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
    OR
    -- Descendentes (filhos, netos)
    affiliate_id IN (
      SELECT affiliate_id FROM get_network_tree(
        (SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
      )
    )
    OR
    -- Ascendentes (pais, avós)
    affiliate_id IN (
      SELECT affiliate_id FROM get_network_ancestors(
        (SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
      )
    )
  );
-- Admins podem ver toda a rede
CREATE POLICY "Admins can view all network"
  ON affiliate_network FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );
-- Apenas admins podem modificar a rede diretamente
CREATE POLICY "Admins can modify network"
  ON affiliate_network FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );
-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE affiliate_network IS 'Árvore genealógica de afiliados com prevenção de loops';
COMMENT ON COLUMN affiliate_network.level IS 'Nível na árvore: 1=raiz, 2=filho, 3=neto (máximo)';
COMMENT ON COLUMN affiliate_network.path IS 'Caminho completo na árvore para queries rápidas';
COMMENT ON FUNCTION check_network_loop() IS 'Previne loops circulares na árvore genealógica';
COMMENT ON FUNCTION get_network_tree(UUID, INTEGER) IS 'Retorna árvore completa de um afiliado';
COMMENT ON FUNCTION get_network_ancestors(UUID) IS 'Retorna ascendentes (N1, N2, N3) de um afiliado';
COMMIT;
-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP TABLE IF EXISTS affiliate_network CASCADE;
-- DROP FUNCTION IF EXISTS check_network_loop() CASCADE;
-- DROP FUNCTION IF EXISTS calculate_network_level() CASCADE;
-- DROP FUNCTION IF EXISTS get_network_tree(UUID, INTEGER) CASCADE;
-- DROP FUNCTION IF EXISTS get_network_ancestors(UUID) CASCADE;
-- DROP FUNCTION IF EXISTS get_direct_children(UUID) CASCADE;
-- DROP FUNCTION IF EXISTS validate_network_integrity() CASCADE;
-- COMMIT;
