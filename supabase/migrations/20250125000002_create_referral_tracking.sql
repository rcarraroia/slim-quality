-- Migration: Sistema de Afiliados - Rastreamento de Referências
-- Created: 2025-01-25
-- Author: Kiro AI
-- Sprint: 4 - Sistema de Afiliados Multinível

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabelas de rastreamento não existem
--   ✅ Tabelas affiliates e affiliate_network criadas
--   ✅ Tabela orders existe (Sprint 3)
--   ✅ Índices otimizados para analytics
--   ✅ Campos de geolocalização e UTM incluídos
-- ============================================

BEGIN;

-- ============================================
-- TABELA: referral_codes
-- ============================================

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6}$'),
  
  -- Configurações
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NULL,
  max_uses INTEGER NULL CHECK (max_uses IS NULL OR max_uses > 0),
  current_uses INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  
  -- Descrição opcional
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para referral_codes
CREATE INDEX idx_referral_codes_code 
  ON referral_codes(code) 
  WHERE is_active = true;

CREATE INDEX idx_referral_codes_affiliate 
  ON referral_codes(affiliate_id);

CREATE INDEX idx_referral_codes_active 
  ON referral_codes(is_active, expires_at) 
  WHERE is_active = true;

-- ============================================
-- TABELA: referral_clicks
-- ============================================

CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL CHECK (referral_code ~ '^[A-Z0-9]{6}$'),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  
  -- Dados do clique
  ip_address INET NOT NULL,
  user_agent TEXT,
  referer TEXT,
  
  -- Parâmetros UTM para tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- Geolocalização (opcional, pode ser preenchida por serviço externo)
  country TEXT,
  region TEXT,
  city TEXT,
  
  -- Dados da sessão
  session_id TEXT, -- Para agrupar cliques da mesma sessão
  
  -- Timestamps
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para analytics de cliques
CREATE INDEX idx_clicks_affiliate 
  ON referral_clicks(affiliate_id);

CREATE INDEX idx_clicks_code 
  ON referral_clicks(referral_code);

CREATE INDEX idx_clicks_date 
  ON referral_clicks(clicked_at DESC);

CREATE INDEX idx_clicks_ip_date 
  ON referral_clicks(ip_address, clicked_at);

CREATE INDEX idx_clicks_session 
  ON referral_clicks(session_id) 
  WHERE session_id IS NOT NULL;

-- Índice composto para deduplicação (sem date_trunc para evitar erro IMMUTABLE)
CREATE INDEX idx_clicks_dedup 
  ON referral_clicks(referral_code, ip_address, clicked_at);

-- ============================================
-- TABELA: referral_conversions
-- ============================================

CREATE TABLE IF NOT EXISTS referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL CHECK (referral_code ~ '^[A-Z0-9]{6}$'),
  
  -- Dados da conversão
  order_value_cents INTEGER NOT NULL CHECK (order_value_cents >= 0),
  commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  commission_value_cents INTEGER NOT NULL CHECK (commission_value_cents >= 0),
  
  -- Rastreamento de origem
  click_id UUID REFERENCES referral_clicks(id),
  conversion_time_hours INTEGER CHECK (conversion_time_hours >= 0), -- Tempo entre clique e conversão
  
  -- Status da conversão
  status conversion_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ NULL,
  
  -- Dados do cliente (cache para analytics)
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  customer_email TEXT,
  customer_city TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para conversões
CREATE INDEX idx_conversions_order 
  ON referral_conversions(order_id);

CREATE INDEX idx_conversions_affiliate 
  ON referral_conversions(affiliate_id);

CREATE INDEX idx_conversions_status 
  ON referral_conversions(status);

CREATE INDEX idx_conversions_code 
  ON referral_conversions(referral_code);

CREATE INDEX idx_conversions_date 
  ON referral_conversions(created_at DESC);

CREATE INDEX idx_conversions_processed 
  ON referral_conversions(processed_at) 
  WHERE processed_at IS NOT NULL;

-- Índice para analytics de performance
CREATE INDEX idx_conversions_analytics 
  ON referral_conversions(affiliate_id, status, created_at);

-- ============================================
-- FUNÇÃO: track_referral_click()
-- ============================================

CREATE OR REPLACE FUNCTION track_referral_click(
  p_referral_code TEXT,
  p_ip_address INET,
  p_user_agent TEXT DEFAULT NULL,
  p_referer TEXT DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_term TEXT DEFAULT NULL,
  p_utm_content TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_affiliate_id UUID;
  v_click_id UUID;
  v_existing_click_id UUID;
  v_dedup_window INTERVAL := '1 hour';
BEGIN
  -- Buscar affiliate_id pelo código
  SELECT id INTO v_affiliate_id
  FROM affiliates
  WHERE referral_code = p_referral_code
  AND status = 'active'
  AND deleted_at IS NULL;
  
  IF v_affiliate_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive referral code: %', p_referral_code;
  END IF;
  
  -- Verificar se já existe clique recente do mesmo IP (deduplicação)
  SELECT id INTO v_existing_click_id
  FROM referral_clicks
  WHERE referral_code = p_referral_code
  AND ip_address = p_ip_address
  AND clicked_at > NOW() - v_dedup_window
  ORDER BY clicked_at DESC
  LIMIT 1;
  
  -- Se já existe clique recente, retornar o existente
  IF v_existing_click_id IS NOT NULL THEN
    RETURN v_existing_click_id;
  END IF;
  
  -- Criar novo clique
  INSERT INTO referral_clicks (
    referral_code,
    affiliate_id,
    ip_address,
    user_agent,
    referer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    session_id
  ) VALUES (
    p_referral_code,
    v_affiliate_id,
    p_ip_address,
    p_user_agent,
    p_referer,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_utm_term,
    p_utm_content,
    p_session_id
  ) RETURNING id INTO v_click_id;
  
  -- Atualizar contador de cliques do afiliado
  UPDATE affiliates
  SET total_clicks = total_clicks + 1,
      updated_at = NOW()
  WHERE id = v_affiliate_id;
  
  RETURN v_click_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: track_referral_conversion()
-- ============================================

CREATE OR REPLACE FUNCTION track_referral_conversion(
  p_order_id UUID,
  p_referral_code TEXT
)
RETURNS UUID AS $$
DECLARE
  v_affiliate_id UUID;
  v_conversion_id UUID;
  v_order_value_cents INTEGER;
  v_customer_id UUID;
  v_customer_email TEXT;
  v_click_id UUID;
  v_conversion_time_hours INTEGER;
  v_commission_percentage DECIMAL(5,2) := 15.00; -- N1 sempre recebe 15%
  v_commission_value_cents INTEGER;
BEGIN
  -- Buscar dados do pedido
  SELECT total_cents, customer_id, customer_email
  INTO v_order_value_cents, v_customer_id, v_customer_email
  FROM orders
  WHERE id = p_order_id
  AND deleted_at IS NULL;
  
  IF v_order_value_cents IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- Buscar affiliate_id pelo código
  SELECT id INTO v_affiliate_id
  FROM affiliates
  WHERE referral_code = p_referral_code
  AND status = 'active'
  AND deleted_at IS NULL;
  
  IF v_affiliate_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive referral code: %', p_referral_code;
  END IF;
  
  -- Buscar clique mais recente do mesmo código (últimas 30 dias)
  SELECT id, EXTRACT(EPOCH FROM (NOW() - clicked_at))/3600
  INTO v_click_id, v_conversion_time_hours
  FROM referral_clicks
  WHERE referral_code = p_referral_code
  AND clicked_at > NOW() - INTERVAL '30 days'
  ORDER BY clicked_at DESC
  LIMIT 1;
  
  -- Calcular comissão (15% para N1)
  v_commission_value_cents := ROUND(v_order_value_cents * v_commission_percentage / 100);
  
  -- Criar conversão
  INSERT INTO referral_conversions (
    order_id,
    affiliate_id,
    referral_code,
    order_value_cents,
    commission_percentage,
    commission_value_cents,
    click_id,
    conversion_time_hours,
    customer_id,
    customer_email,
    status
  ) VALUES (
    p_order_id,
    v_affiliate_id,
    p_referral_code,
    v_order_value_cents,
    v_commission_percentage,
    v_commission_value_cents,
    v_click_id,
    v_conversion_time_hours,
    v_customer_id,
    v_customer_email,
    'pending'
  ) RETURNING id INTO v_conversion_id;
  
  -- Atualizar contadores do afiliado
  UPDATE affiliates
  SET total_conversions = total_conversions + 1,
      total_commissions_cents = total_commissions_cents + v_commission_value_cents,
      updated_at = NOW()
  WHERE id = v_affiliate_id;
  
  -- Atualizar pedido com dados do afiliado
  UPDATE orders
  SET referral_code = p_referral_code,
      affiliate_n1_id = (SELECT user_id FROM affiliates WHERE id = v_affiliate_id),
      updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN v_conversion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: get_referral_analytics()
-- ============================================

CREATE OR REPLACE FUNCTION get_referral_analytics(
  p_affiliate_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_clicks BIGINT,
  unique_clicks BIGINT,
  total_conversions BIGINT,
  conversion_rate DECIMAL,
  total_revenue_cents BIGINT,
  total_commissions_cents BIGINT,
  avg_conversion_time_hours DECIMAL,
  top_utm_source TEXT,
  top_country TEXT
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date TIMESTAMPTZ := COALESCE(p_end_date, NOW());
BEGIN
  RETURN QUERY
  WITH click_stats AS (
    SELECT 
      COUNT(*) as total_clicks,
      COUNT(DISTINCT ip_address) as unique_clicks,
      MODE() WITHIN GROUP (ORDER BY utm_source) as top_utm_source,
      MODE() WITHIN GROUP (ORDER BY country) as top_country
    FROM referral_clicks
    WHERE affiliate_id = p_affiliate_id
    AND clicked_at BETWEEN v_start_date AND v_end_date
  ),
  conversion_stats AS (
    SELECT 
      COUNT(*) as total_conversions,
      SUM(order_value_cents) as total_revenue_cents,
      SUM(commission_value_cents) as total_commissions_cents,
      AVG(conversion_time_hours) as avg_conversion_time_hours
    FROM referral_conversions
    WHERE affiliate_id = p_affiliate_id
    AND created_at BETWEEN v_start_date AND v_end_date
    AND status != 'cancelled'
  )
  SELECT 
    COALESCE(cs.total_clicks, 0)::BIGINT,
    COALESCE(cs.unique_clicks, 0)::BIGINT,
    COALESCE(convs.total_conversions, 0)::BIGINT,
    CASE 
      WHEN COALESCE(cs.total_clicks, 0) > 0 THEN
        ROUND((COALESCE(convs.total_conversions, 0)::DECIMAL / cs.total_clicks::DECIMAL) * 100, 2)
      ELSE 0::DECIMAL
    END,
    COALESCE(convs.total_revenue_cents, 0)::BIGINT,
    COALESCE(convs.total_commissions_cents, 0)::BIGINT,
    ROUND(COALESCE(convs.avg_conversion_time_hours, 0), 2),
    cs.top_utm_source,
    cs.top_country
  FROM click_stats cs
  FULL OUTER JOIN conversion_stats convs ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_referral_codes_updated_at
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_conversions_updated_at
  BEFORE UPDATE ON referral_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- referral_codes
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own referral codes"
  ON referral_codes FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all referral codes"
  ON referral_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- referral_clicks
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own clicks"
  ON referral_clicks FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all clicks"
  ON referral_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- referral_conversions
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own conversions"
  ON referral_conversions FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all conversions"
  ON referral_conversions FOR SELECT
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

COMMENT ON TABLE referral_clicks IS 'Rastreamento de cliques em links de afiliados';
COMMENT ON TABLE referral_conversions IS 'Rastreamento de conversões (vendas) de afiliados';
COMMENT ON FUNCTION track_referral_click IS 'Registra clique em link de afiliado com deduplicação';
COMMENT ON FUNCTION track_referral_conversion IS 'Registra conversão de afiliado e atualiza contadores';
COMMENT ON FUNCTION get_referral_analytics IS 'Retorna analytics completas de um afiliado';

COMMIT;

-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP TABLE IF EXISTS referral_conversions CASCADE;
-- DROP TABLE IF EXISTS referral_clicks CASCADE;
-- DROP TABLE IF EXISTS referral_codes CASCADE;
-- DROP FUNCTION IF EXISTS track_referral_click CASCADE;
-- DROP FUNCTION IF EXISTS track_referral_conversion CASCADE;
-- DROP FUNCTION IF EXISTS get_referral_analytics CASCADE;
-- COMMIT;