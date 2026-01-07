-- Migration: Sistema de Afiliados - Tabelas Auxiliares
-- Created: 2025-01-25
-- Author: Kiro AI
-- Sprint: 4 - Sistema de Afiliados Multinível

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabelas auxiliares não existem
--   ✅ Cache de wallets para performance
--   ✅ Logs completos para auditoria
--   ✅ Políticas RLS para segurança
--   ✅ Índices otimizados para consultas
-- ============================================

BEGIN;
-- ============================================
-- TABELA: asaas_wallets (Cache de validação)
-- ============================================

CREATE TABLE IF NOT EXISTS asaas_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id TEXT NOT NULL UNIQUE CHECK (wallet_id ~ '^wal_[a-zA-Z0-9]{20}$'),
  
  -- Dados do Asaas (cache)
  name TEXT,
  email TEXT,
  status TEXT, -- ACTIVE, INACTIVE, BLOCKED, etc.
  account_type TEXT, -- PERSON, COMPANY
  document TEXT, -- CPF/CNPJ
  
  -- Dados bancários (se disponível)
  bank_code TEXT,
  bank_name TEXT,
  agency TEXT,
  account TEXT,
  
  -- Cache e validação
  last_validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validation_response JSONB, -- Response completa da API Asaas
  is_valid BOOLEAN NOT NULL DEFAULT true,
  validation_error TEXT, -- Erro da última validação
  
  -- Controle de cache
  cache_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  validation_attempts INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- ÍNDICES PARA ASAAS_WALLETS
-- ============================================

-- Índice único para wallet_id (mais usado)
CREATE UNIQUE INDEX idx_wallets_id 
  ON asaas_wallets(wallet_id);
-- Índice para validação (cache)
CREATE INDEX idx_wallets_validated 
  ON asaas_wallets(last_validated_at DESC);
-- Índice para status válido
CREATE INDEX idx_wallets_valid 
  ON asaas_wallets(is_valid, cache_expires_at) 
  WHERE is_valid = true;
-- Índice para expiração do cache (sem NOW() para evitar erro IMMUTABLE)
CREATE INDEX idx_wallets_cache_expires 
  ON asaas_wallets(cache_expires_at);
-- ============================================
-- TABELA: commission_logs (Auditoria completa)
-- ============================================

CREATE TABLE IF NOT EXISTS commission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Contexto da operação
  operation_type log_operation_type NOT NULL,
  operation_details JSONB NOT NULL,
  
  -- Dados antes/depois (para auditoria)
  before_state JSONB NULL,
  after_state JSONB NOT NULL,
  
  -- Valores financeiros (para facilitar consultas)
  total_value_cents INTEGER CHECK (total_value_cents >= 0),
  commission_value_cents INTEGER CHECK (commission_value_cents >= 0),
  
  -- Afiliados envolvidos
  n1_affiliate_id UUID REFERENCES affiliates(id),
  n2_affiliate_id UUID REFERENCES affiliates(id),
  n3_affiliate_id UUID REFERENCES affiliates(id),
  
  -- Usuário e sistema
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  
  -- Resultado da operação
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- ÍNDICES PARA COMMISSION_LOGS
-- ============================================

-- Índice para order_id (auditoria por pedido)
CREATE INDEX idx_logs_order 
  ON commission_logs(order_id);
-- Índice para operation_type (filtrar por tipo)
CREATE INDEX idx_logs_operation 
  ON commission_logs(operation_type);
-- Índice para created_at (ordenação temporal)
CREATE INDEX idx_logs_created 
  ON commission_logs(created_at DESC);
-- Índice para user_id (auditoria por usuário)
CREATE INDEX idx_logs_user 
  ON commission_logs(user_id) 
  WHERE user_id IS NOT NULL;
-- Índice para success (filtrar erros)
CREATE INDEX idx_logs_success 
  ON commission_logs(success, created_at DESC);
-- Índices para afiliados (auditoria por afiliado)
CREATE INDEX idx_logs_n1_affiliate 
  ON commission_logs(n1_affiliate_id) 
  WHERE n1_affiliate_id IS NOT NULL;
CREATE INDEX idx_logs_n2_affiliate 
  ON commission_logs(n2_affiliate_id) 
  WHERE n2_affiliate_id IS NOT NULL;
CREATE INDEX idx_logs_n3_affiliate 
  ON commission_logs(n3_affiliate_id) 
  WHERE n3_affiliate_id IS NOT NULL;
-- ============================================
-- FUNÇÃO: validate_asaas_wallet()
-- ============================================

CREATE OR REPLACE FUNCTION validate_asaas_wallet(p_wallet_id TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  is_active BOOLEAN,
  name TEXT,
  email TEXT,
  error_message TEXT,
  cached BOOLEAN
) AS $$
DECLARE
  v_wallet_record asaas_wallets%ROWTYPE;
  v_is_cached BOOLEAN := false;
BEGIN
  -- Verificar cache válido
  SELECT * INTO v_wallet_record
  FROM asaas_wallets
  WHERE wallet_id = p_wallet_id
  AND cache_expires_at > NOW()
  AND is_valid = true;
  
  IF FOUND THEN
    v_is_cached := true;
    RETURN QUERY SELECT 
      v_wallet_record.is_valid,
      (v_wallet_record.status = 'ACTIVE'),
      v_wallet_record.name,
      v_wallet_record.email,
      v_wallet_record.validation_error,
      v_is_cached;
    RETURN;
  END IF;
  
  -- Se não há cache válido, retornar indicação para validar via API
  -- (A validação real via API será feita no service layer)
  RETURN QUERY SELECT 
    false, -- is_valid (precisa validar)
    false, -- is_active (desconhecido)
    NULL::TEXT, -- name
    NULL::TEXT, -- email
    'Cache expired, validation required'::TEXT, -- error_message
    false; -- cached
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNÇÃO: cache_wallet_validation()
-- ============================================

CREATE OR REPLACE FUNCTION cache_wallet_validation(
  p_wallet_id TEXT,
  p_validation_response JSONB,
  p_is_valid BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_status TEXT;
  v_account_type TEXT;
  v_document TEXT;
BEGIN
  -- Extrair dados do response JSON
  IF p_validation_response IS NOT NULL THEN
    v_name := p_validation_response->>'name';
    v_email := p_validation_response->>'email';
    v_status := p_validation_response->>'status';
    v_account_type := p_validation_response->>'accountType';
    v_document := p_validation_response->>'cpfCnpj';
  END IF;
  
  -- Inserir ou atualizar cache
  INSERT INTO asaas_wallets (
    wallet_id,
    name,
    email,
    status,
    account_type,
    document,
    last_validated_at,
    validation_response,
    is_valid,
    validation_error,
    cache_expires_at,
    validation_attempts
  ) VALUES (
    p_wallet_id,
    v_name,
    v_email,
    v_status,
    v_account_type,
    v_document,
    NOW(),
    p_validation_response,
    p_is_valid,
    p_error_message,
    NOW() + INTERVAL '1 hour', -- Cache por 1 hora
    1
  )
  ON CONFLICT (wallet_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    status = EXCLUDED.status,
    account_type = EXCLUDED.account_type,
    document = EXCLUDED.document,
    last_validated_at = NOW(),
    validation_response = EXCLUDED.validation_response,
    is_valid = EXCLUDED.is_valid,
    validation_error = EXCLUDED.validation_error,
    cache_expires_at = NOW() + INTERVAL '1 hour',
    validation_attempts = asaas_wallets.validation_attempts + 1,
    updated_at = NOW()
  RETURNING id INTO v_wallet_id;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNÇÃO: log_commission_operation()
-- ============================================

CREATE OR REPLACE FUNCTION log_commission_operation(
  p_order_id UUID,
  p_operation_type log_operation_type,
  p_operation_details JSONB,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_total_value_cents INTEGER DEFAULT NULL,
  p_commission_value_cents INTEGER DEFAULT NULL,
  p_n1_affiliate_id UUID DEFAULT NULL,
  p_n2_affiliate_id UUID DEFAULT NULL,
  p_n3_affiliate_id UUID DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID := auth.uid();
  v_ip_address INET;
  v_user_agent TEXT;
BEGIN
  -- Tentar obter IP e User-Agent do contexto (se disponível)
  BEGIN
    v_ip_address := current_setting('request.headers')::json->>'x-forwarded-for';
    v_user_agent := current_setting('request.headers')::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar se não conseguir obter headers
    NULL;
  END;
  
  -- Criar log
  INSERT INTO commission_logs (
    order_id,
    operation_type,
    operation_details,
    before_state,
    after_state,
    total_value_cents,
    commission_value_cents,
    n1_affiliate_id,
    n2_affiliate_id,
    n3_affiliate_id,
    user_id,
    ip_address,
    user_agent,
    success,
    error_message
  ) VALUES (
    p_order_id,
    p_operation_type,
    p_operation_details,
    p_before_state,
    p_after_state,
    p_total_value_cents,
    p_commission_value_cents,
    p_n1_affiliate_id,
    p_n2_affiliate_id,
    p_n3_affiliate_id,
    v_user_id,
    v_ip_address,
    v_user_agent,
    p_success,
    p_error_message
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNÇÃO: get_commission_audit_trail()
-- ============================================

CREATE OR REPLACE FUNCTION get_commission_audit_trail(
  p_order_id UUID DEFAULT NULL,
  p_affiliate_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  log_id UUID,
  order_id UUID,
  order_number TEXT,
  operation_type log_operation_type,
  operation_details JSONB,
  total_value_cents INTEGER,
  commission_value_cents INTEGER,
  success BOOLEAN,
  error_message TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date TIMESTAMPTZ := COALESCE(p_end_date, NOW());
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.order_id,
    o.order_number,
    cl.operation_type,
    cl.operation_details,
    cl.total_value_cents,
    cl.commission_value_cents,
    cl.success,
    cl.error_message,
    u.email,
    cl.created_at
  FROM commission_logs cl
  JOIN orders o ON o.id = cl.order_id
  LEFT JOIN auth.users u ON u.id = cl.user_id
  WHERE (p_order_id IS NULL OR cl.order_id = p_order_id)
  AND (p_affiliate_id IS NULL OR 
       cl.n1_affiliate_id = p_affiliate_id OR 
       cl.n2_affiliate_id = p_affiliate_id OR 
       cl.n3_affiliate_id = p_affiliate_id)
  AND cl.created_at BETWEEN v_start_date AND v_end_date
  AND o.deleted_at IS NULL
  ORDER BY cl.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNÇÃO: cleanup_expired_wallet_cache()
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_wallet_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Deletar cache expirado há mais de 24 horas
  DELETE FROM asaas_wallets
  WHERE cache_expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_asaas_wallets_updated_at
  BEFORE UPDATE ON asaas_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- asaas_wallets (apenas admin)
ALTER TABLE asaas_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view wallet cache"
  ON asaas_wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );
CREATE POLICY "System can manage wallet cache"
  ON asaas_wallets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'system')
      AND user_roles.deleted_at IS NULL
    )
  );
-- commission_logs (apenas admin)
ALTER TABLE commission_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view commission logs"
  ON commission_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );
-- Afiliados podem ver logs de suas próprias comissões
CREATE POLICY "Affiliates can view own commission logs"
  ON commission_logs FOR SELECT
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
-- ============================================
-- VIEWS PARA RELATÓRIOS
-- ============================================

-- View para estatísticas de cache de wallets
CREATE VIEW wallet_cache_stats AS
SELECT 
  COUNT(*) as total_wallets,
  COUNT(*) FILTER (WHERE is_valid = true) as valid_wallets,
  COUNT(*) FILTER (WHERE cache_expires_at > NOW()) as cached_wallets,
  COUNT(*) FILTER (WHERE validation_attempts > 3) as problematic_wallets,
  AVG(validation_attempts) as avg_validation_attempts,
  MAX(last_validated_at) as last_validation,
  MIN(last_validated_at) as oldest_validation
FROM asaas_wallets;
-- View para resumo de logs de comissão
CREATE VIEW commission_logs_summary AS
SELECT 
  operation_type,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE success = true) as successful_operations,
  COUNT(*) FILTER (WHERE success = false) as failed_operations,
  AVG(total_value_cents) as avg_total_value_cents,
  AVG(commission_value_cents) as avg_commission_value_cents,
  DATE_TRUNC('day', created_at) as operation_date
FROM commission_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY operation_type, DATE_TRUNC('day', created_at)
ORDER BY operation_date DESC, operation_type;
-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE asaas_wallets IS 'Cache de validações de Wallet IDs do Asaas';
COMMENT ON TABLE commission_logs IS 'Logs completos de auditoria para operações de comissão';
COMMENT ON FUNCTION validate_asaas_wallet IS 'Valida Wallet ID usando cache local';
COMMENT ON FUNCTION cache_wallet_validation IS 'Armazena resultado de validação no cache';
COMMENT ON FUNCTION log_commission_operation IS 'Registra operação de comissão para auditoria';
COMMENT ON VIEW wallet_cache_stats IS 'Estatísticas do cache de wallets';
COMMENT ON VIEW commission_logs_summary IS 'Resumo dos logs de comissão por tipo e data';
COMMIT;
-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP VIEW IF EXISTS commission_logs_summary CASCADE;
-- DROP VIEW IF EXISTS wallet_cache_stats CASCADE;
-- DROP TABLE IF EXISTS commission_logs CASCADE;
-- DROP TABLE IF EXISTS asaas_wallets CASCADE;
-- DROP FUNCTION IF EXISTS validate_asaas_wallet(TEXT) CASCADE;
-- DROP FUNCTION IF EXISTS cache_wallet_validation CASCADE;
-- DROP FUNCTION IF EXISTS log_commission_operation CASCADE;
-- DROP FUNCTION IF EXISTS get_commission_audit_trail CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_expired_wallet_cache() CASCADE;
-- COMMIT;
