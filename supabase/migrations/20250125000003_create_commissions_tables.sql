-- Migration: Sistema de Afiliados - Tabelas de Comissões
-- Created: 2025-01-25
-- Author: Kiro AI
-- Sprint: 4 - Sistema de Afiliados Multinível

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabelas de comissões não existem
--   ✅ Todas as dependências criadas (affiliates, orders)
--   ✅ Constraint único para evitar duplicatas
--   ✅ Índices otimizados para consultas administrativas
--   ✅ Suporte completo para redistribuição
-- ============================================

BEGIN;

-- ============================================
-- TABELA: commissions
-- ============================================

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  
  -- Dados da comissão
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3), -- 1=N1, 2=N2, 3=N3
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  base_value_cents INTEGER NOT NULL CHECK (base_value_cents >= 0),
  commission_value_cents INTEGER NOT NULL CHECK (commission_value_cents >= 0),
  
  -- Redistribuição (se aplicável)
  original_percentage DECIMAL(5,2) NULL CHECK (original_percentage >= 0 AND original_percentage <= 100),
  redistribution_applied BOOLEAN NOT NULL DEFAULT false,
  
  -- Status e controle
  status commission_status NOT NULL DEFAULT 'calculated',
  asaas_split_id TEXT NULL, -- ID do split no Asaas
  paid_at TIMESTAMPTZ NULL,
  
  -- Auditoria
  calculated_by UUID REFERENCES auth.users(id),
  calculation_details JSONB NULL, -- Detalhes do cálculo para auditoria
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ÍNDICES CRÍTICOS PARA PERFORMANCE
-- ============================================

-- Índice para order_id (consultas por pedido)
CREATE INDEX idx_commissions_order 
  ON commissions(order_id);

-- Índice para affiliate_id (dashboard do afiliado)
CREATE INDEX idx_commissions_affiliate 
  ON commissions(affiliate_id);

-- Índice para status (consultas administrativas)
CREATE INDEX idx_commissions_status 
  ON commissions(status);

-- Índice para level (consultas por nível)
CREATE INDEX idx_commissions_level 
  ON commissions(level);

-- Índice para paid_at (relatórios de pagamentos)
CREATE INDEX idx_commissions_paid_at 
  ON commissions(paid_at) 
  WHERE paid_at IS NOT NULL;

-- Índice para created_at (ordenação temporal)
CREATE INDEX idx_commissions_created_at 
  ON commissions(created_at DESC);

-- Constraint único para evitar duplicatas (crítico!)
CREATE UNIQUE INDEX idx_commissions_unique 
  ON commissions(order_id, affiliate_id, level) 
  WHERE status != 'cancelled';

-- Índice composto para analytics
CREATE INDEX idx_commissions_analytics 
  ON commissions(affiliate_id, status, created_at);

-- ============================================
-- TABELA: commission_splits
-- ============================================

CREATE TABLE IF NOT EXISTS commission_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Distribuição calculada
  total_order_value_cents INTEGER NOT NULL CHECK (total_order_value_cents >= 0),
  factory_percentage DECIMAL(5,2) NOT NULL DEFAULT 70.00 CHECK (factory_percentage >= 0 AND factory_percentage <= 100),
  factory_value_cents INTEGER NOT NULL CHECK (factory_value_cents >= 0),
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 30.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  commission_value_cents INTEGER NOT NULL CHECK (commission_value_cents >= 0),
  
  -- Detalhamento das comissões N1, N2, N3
  n1_affiliate_id UUID REFERENCES affiliates(id),
  n1_percentage DECIMAL(5,2) CHECK (n1_percentage >= 0 AND n1_percentage <= 100),
  n1_value_cents INTEGER CHECK (n1_value_cents >= 0),
  
  n2_affiliate_id UUID REFERENCES affiliates(id),
  n2_percentage DECIMAL(5,2) CHECK (n2_percentage >= 0 AND n2_percentage <= 100),
  n2_value_cents INTEGER CHECK (n2_value_cents >= 0),
  
  n3_affiliate_id UUID REFERENCES affiliates(id),
  n3_percentage DECIMAL(5,2) CHECK (n3_percentage >= 0 AND n3_percentage <= 100),
  n3_value_cents INTEGER CHECK (n3_value_cents >= 0),
  
  -- Gestores (sempre presentes)
  renum_percentage DECIMAL(5,2) NOT NULL CHECK (renum_percentage >= 0 AND renum_percentage <= 100),
  renum_value_cents INTEGER NOT NULL CHECK (renum_value_cents >= 0),
  jb_percentage DECIMAL(5,2) NOT NULL CHECK (jb_percentage >= 0 AND jb_percentage <= 100),
  jb_value_cents INTEGER NOT NULL CHECK (jb_value_cents >= 0),
  
  -- Redistribuição
  redistribution_applied BOOLEAN NOT NULL DEFAULT false,
  redistribution_details JSONB NULL,
  
  -- Status do split
  status commission_split_status NOT NULL DEFAULT 'calculated',
  asaas_split_id TEXT UNIQUE NULL,
  asaas_response JSONB NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA COMMISSION_SPLITS
-- ============================================

-- Índice único para order_id (um split por pedido)
CREATE UNIQUE INDEX idx_splits_order 
  ON commission_splits(order_id);

-- Índice para status (monitoramento)
CREATE INDEX idx_splits_status 
  ON commission_splits(status);

-- Índice para asaas_split_id (integração)
CREATE INDEX idx_splits_asaas_id 
  ON commission_splits(asaas_split_id) 
  WHERE asaas_split_id IS NOT NULL;

-- Índice para created_at (relatórios)
CREATE INDEX idx_splits_created_at 
  ON commission_splits(created_at DESC);

-- Índices para afiliados (relatórios por afiliado)
CREATE INDEX idx_splits_n1_affiliate 
  ON commission_splits(n1_affiliate_id) 
  WHERE n1_affiliate_id IS NOT NULL;

CREATE INDEX idx_splits_n2_affiliate 
  ON commission_splits(n2_affiliate_id) 
  WHERE n2_affiliate_id IS NOT NULL;

CREATE INDEX idx_splits_n3_affiliate 
  ON commission_splits(n3_affiliate_id) 
  WHERE n3_affiliate_id IS NOT NULL;

-- ============================================
-- FUNÇÃO: validate_split_integrity()
-- ============================================

CREATE OR REPLACE FUNCTION validate_split_integrity()
RETURNS TRIGGER AS $$
DECLARE
  calculated_total_cents INTEGER;
  expected_total_cents INTEGER;
  tolerance_cents INTEGER := 1; -- Tolerância de 1 centavo para arredondamentos
BEGIN
  -- Calcular total distribuído
  calculated_total_cents := 
    NEW.factory_value_cents +
    COALESCE(NEW.n1_value_cents, 0) +
    COALESCE(NEW.n2_value_cents, 0) +
    COALESCE(NEW.n3_value_cents, 0) +
    NEW.renum_value_cents +
    NEW.jb_value_cents;
  
  expected_total_cents := NEW.total_order_value_cents;
  
  -- Validar integridade (com tolerância para arredondamentos)
  IF ABS(calculated_total_cents - expected_total_cents) > tolerance_cents THEN
    RAISE EXCEPTION 'Split integrity check failed: calculated % cents, expected % cents (difference: % cents)', 
      calculated_total_cents, expected_total_cents, ABS(calculated_total_cents - expected_total_cents);
  END IF;
  
  -- Validar percentuais
  IF (NEW.factory_percentage + NEW.commission_percentage) != 100.00 THEN
    RAISE EXCEPTION 'Factory and commission percentages must sum to 100 percent, got % + % = %',
      NEW.factory_percentage, NEW.commission_percentage, 
      (NEW.factory_percentage + NEW.commission_percentage);
  END IF;
  
  -- Validar que comissão = 30%
  IF NEW.commission_percentage != 30.00 THEN
    RAISE EXCEPTION 'Commission percentage must be exactly 30 percent, got %', NEW.commission_percentage;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_split_integrity
  BEFORE INSERT OR UPDATE ON commission_splits
  FOR EACH ROW 
  EXECUTE FUNCTION validate_split_integrity();

-- ============================================
-- FUNÇÃO: calculate_commission_split()
-- ============================================

CREATE OR REPLACE FUNCTION calculate_commission_split(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_split_id UUID;
  v_order_total_cents INTEGER;
  v_factory_value_cents INTEGER;
  v_commission_value_cents INTEGER;
  
  -- Afiliados da rede
  v_n1_affiliate_id UUID;
  v_n2_affiliate_id UUID;
  v_n3_affiliate_id UUID;
  
  -- Valores base das comissões
  v_n1_value_cents INTEGER := 0;
  v_n2_value_cents INTEGER := 0;
  v_n3_value_cents INTEGER := 0;
  
  -- Gestores (base 5% cada)
  v_renum_percentage DECIMAL(5,2) := 5.00;
  v_jb_percentage DECIMAL(5,2) := 5.00;
  v_renum_value_cents INTEGER;
  v_jb_value_cents INTEGER;
  
  -- Redistribuição
  v_available_percentage DECIMAL(5,2) := 0;
  v_redistribution_bonus DECIMAL(5,2) := 0;
  v_redistribution_applied BOOLEAN := false;
  v_redistribution_details JSONB;
BEGIN
  -- Buscar dados do pedido
  SELECT total_cents, affiliate_n1_id
  INTO v_order_total_cents, v_n1_affiliate_id
  FROM orders
  WHERE id = p_order_id
  AND deleted_at IS NULL;
  
  IF v_order_total_cents IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- Verificar se já existe split para este pedido
  IF EXISTS (SELECT 1 FROM commission_splits WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Commission split already exists for order: %', p_order_id;
  END IF;
  
  -- Calcular valores base (70% fábrica, 30% comissões)
  v_factory_value_cents := ROUND(v_order_total_cents * 0.70);
  v_commission_value_cents := v_order_total_cents - v_factory_value_cents;
  
  -- Se há afiliado N1, buscar rede genealógica
  IF v_n1_affiliate_id IS NOT NULL THEN
    -- Buscar N2 e N3 na árvore
    SELECT 
      n2.affiliate_id,
      n3.affiliate_id
    INTO v_n2_affiliate_id, v_n3_affiliate_id
    FROM affiliate_network n1
    LEFT JOIN affiliate_network n2 ON n2.affiliate_id = n1.parent_id
    LEFT JOIN affiliate_network n3 ON n3.affiliate_id = n2.parent_id
    WHERE n1.affiliate_id = (
      SELECT id FROM affiliates WHERE user_id = v_n1_affiliate_id AND deleted_at IS NULL
    );
    
    -- Calcular comissões por nível
    v_n1_value_cents := ROUND(v_order_total_cents * 0.15); -- 15%
    
    IF v_n2_affiliate_id IS NOT NULL THEN
      v_n2_value_cents := ROUND(v_order_total_cents * 0.03); -- 3%
    ELSE
      v_available_percentage := v_available_percentage + 3.00;
    END IF;
    
    IF v_n3_affiliate_id IS NOT NULL THEN
      v_n3_value_cents := ROUND(v_order_total_cents * 0.02); -- 2%
    ELSE
      v_available_percentage := v_available_percentage + 2.00;
    END IF;
  ELSE
    -- Sem afiliado, toda comissão vai para redistribuição
    v_available_percentage := 20.00; -- 15% + 3% + 2%
  END IF;
  
  -- Aplicar redistribuição se necessário
  IF v_available_percentage > 0 THEN
    v_redistribution_applied := true;
    v_redistribution_bonus := v_available_percentage / 2; -- Dividir igualmente
    
    v_renum_percentage := v_renum_percentage + v_redistribution_bonus;
    v_jb_percentage := v_jb_percentage + v_redistribution_bonus;
    
    v_redistribution_details := jsonb_build_object(
      'available_percentage', v_available_percentage,
      'bonus_per_manager', v_redistribution_bonus,
      'reason', CASE 
        WHEN v_n1_affiliate_id IS NULL THEN 'no_affiliate'
        WHEN v_n2_affiliate_id IS NULL AND v_n3_affiliate_id IS NULL THEN 'only_n1'
        WHEN v_n3_affiliate_id IS NULL THEN 'n1_and_n2_only'
        ELSE 'unknown'
      END
    );
  END IF;
  
  -- Calcular valores finais dos gestores
  v_renum_value_cents := ROUND(v_order_total_cents * v_renum_percentage / 100);
  v_jb_value_cents := ROUND(v_order_total_cents * v_jb_percentage / 100);
  
  -- Criar registro de split
  INSERT INTO commission_splits (
    order_id,
    total_order_value_cents,
    factory_percentage,
    factory_value_cents,
    commission_percentage,
    commission_value_cents,
    n1_affiliate_id,
    n1_percentage,
    n1_value_cents,
    n2_affiliate_id,
    n2_percentage,
    n2_value_cents,
    n3_affiliate_id,
    n3_percentage,
    n3_value_cents,
    renum_percentage,
    renum_value_cents,
    jb_percentage,
    jb_value_cents,
    redistribution_applied,
    redistribution_details,
    status
  ) VALUES (
    p_order_id,
    v_order_total_cents,
    70.00,
    v_factory_value_cents,
    30.00,
    v_commission_value_cents,
    CASE WHEN v_n1_value_cents > 0 THEN (SELECT id FROM affiliates WHERE user_id = v_n1_affiliate_id) END,
    CASE WHEN v_n1_value_cents > 0 THEN 15.00 END,
    CASE WHEN v_n1_value_cents > 0 THEN v_n1_value_cents END,
    CASE WHEN v_n2_value_cents > 0 THEN v_n2_affiliate_id END,
    CASE WHEN v_n2_value_cents > 0 THEN 3.00 END,
    CASE WHEN v_n2_value_cents > 0 THEN v_n2_value_cents END,
    CASE WHEN v_n3_value_cents > 0 THEN v_n3_affiliate_id END,
    CASE WHEN v_n3_value_cents > 0 THEN 2.00 END,
    CASE WHEN v_n3_value_cents > 0 THEN v_n3_value_cents END,
    v_renum_percentage,
    v_renum_value_cents,
    v_jb_percentage,
    v_jb_value_cents,
    v_redistribution_applied,
    v_redistribution_details,
    'calculated'
  ) RETURNING id INTO v_split_id;
  
  RETURN v_split_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: get_affiliate_commissions()
-- ============================================

CREATE OR REPLACE FUNCTION get_affiliate_commissions(
  p_affiliate_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status commission_status DEFAULT NULL
)
RETURNS TABLE (
  commission_id UUID,
  order_id UUID,
  order_number TEXT,
  level INTEGER,
  percentage DECIMAL,
  commission_value_cents INTEGER,
  status commission_status,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.order_id,
    o.order_number,
    c.level,
    c.percentage,
    c.commission_value_cents,
    c.status,
    c.paid_at,
    c.created_at
  FROM commissions c
  JOIN orders o ON o.id = c.order_id
  WHERE c.affiliate_id = p_affiliate_id
  AND (p_status IS NULL OR c.status = p_status)
  AND o.deleted_at IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_splits_updated_at
  BEFORE UPDATE ON commission_splits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own commissions"
  ON commissions FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all commissions"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- commission_splits
ALTER TABLE commission_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view splits with their commissions"
  ON commission_splits FOR SELECT
  USING (
    n1_affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
    OR n2_affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
    OR n3_affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all splits"
  ON commission_splits FOR SELECT
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

COMMENT ON TABLE commissions IS 'Comissões individuais por afiliado e nível';
COMMENT ON TABLE commission_splits IS 'Distribuição completa de comissões por pedido';
COMMENT ON FUNCTION calculate_commission_split IS 'Calcula distribuição de comissões com redistribuição';
COMMENT ON FUNCTION validate_split_integrity IS 'Valida integridade financeira dos splits (soma = 100%)';

COMMIT;

-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP TABLE IF EXISTS commission_splits CASCADE;
-- DROP TABLE IF EXISTS commissions CASCADE;
-- DROP FUNCTION IF EXISTS validate_split_integrity() CASCADE;
-- DROP FUNCTION IF EXISTS calculate_commission_split(UUID) CASCADE;
-- DROP FUNCTION IF EXISTS get_affiliate_commissions CASCADE;
-- COMMIT;