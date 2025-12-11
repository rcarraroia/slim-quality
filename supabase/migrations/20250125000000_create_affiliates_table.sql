-- Migration: Sistema de Afiliados - Tabela Principal
-- Created: 2025-01-25
-- Author: Kiro AI
-- Sprint: 4 - Sistema de Afiliados Multinível

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela affiliates não existe
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente (Sprint 3)
--   ✅ Preparado para árvore genealógica
--   ✅ Integração com Asaas validada
-- ============================================

BEGIN;

-- ============================================
-- ENUMS PARA SISTEMA DE AFILIADOS
-- ============================================

-- Status do afiliado
CREATE TYPE affiliate_status AS ENUM (
  'pending',    -- Aguardando aprovação
  'active',     -- Ativo e pode receber comissões
  'inactive',   -- Inativo temporariamente
  'suspended',  -- Suspenso por violação
  'rejected'    -- Cadastro rejeitado
);

-- Status de conversão
CREATE TYPE conversion_status AS ENUM (
  'pending',     -- Aguardando processamento
  'processed',   -- Comissão calculada
  'paid',        -- Comissão paga
  'cancelled'    -- Pedido cancelado
);

-- Status de comissão
CREATE TYPE commission_status AS ENUM (
  'calculated',  -- Calculada mas não paga
  'pending',     -- Enviada para Asaas
  'paid',        -- Paga com sucesso
  'failed',      -- Falha no pagamento
  'cancelled'    -- Cancelada
);

-- Status de split de comissão
CREATE TYPE commission_split_status AS ENUM (
  'calculated',  -- Calculado mas não enviado
  'sent',        -- Enviado para Asaas
  'confirmed',   -- Confirmado pelo Asaas
  'failed',      -- Falha no Asaas
  'cancelled'    -- Cancelado
);

-- Tipo de operação de log
CREATE TYPE log_operation_type AS ENUM (
  'commission_calculated',
  'redistribution_applied',
  'split_sent',
  'split_confirmed',
  'commission_paid',
  'commission_failed',
  'manual_adjustment'
);

-- ============================================
-- TABELA: affiliates
-- ============================================

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados pessoais
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
  email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$'),
  document TEXT CHECK (document IS NULL OR document ~ '^\d{11}$|^\d{14}$'), -- CPF ou CNPJ
  
  -- Dados de afiliado
  referral_code TEXT NOT NULL UNIQUE CHECK (referral_code ~ '^[A-Z0-9]{6}$'),
  wallet_id TEXT NOT NULL CHECK (wallet_id ~ '^wal_[a-zA-Z0-9]{20}$'),
  wallet_validated_at TIMESTAMPTZ,
  
  -- Status e controle
  status affiliate_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Métricas (desnormalizadas para performance)
  total_clicks INTEGER NOT NULL DEFAULT 0 CHECK (total_clicks >= 0),
  total_conversions INTEGER NOT NULL DEFAULT 0 CHECK (total_conversions >= 0),
  total_commissions_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_commissions_cents >= 0),
  
  -- Configurações
  notification_email BOOLEAN NOT NULL DEFAULT true,
  notification_whatsapp BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- ============================================
-- ÍNDICES CRÍTICOS PARA PERFORMANCE
-- ============================================

-- Índice único para referral_code (mais usado)
CREATE UNIQUE INDEX idx_affiliates_referral_code 
  ON affiliates(referral_code) 
  WHERE deleted_at IS NULL;

-- Índice único para wallet_id (validação Asaas)
CREATE UNIQUE INDEX idx_affiliates_wallet_id 
  ON affiliates(wallet_id) 
  WHERE deleted_at IS NULL;

-- Índice para email (único e consultas)
CREATE UNIQUE INDEX idx_affiliates_email 
  ON affiliates(email) 
  WHERE deleted_at IS NULL;

-- Índice para user_id (relacionamento)
CREATE INDEX idx_affiliates_user_id 
  ON affiliates(user_id) 
  WHERE deleted_at IS NULL;

-- Índice para status (consultas administrativas)
CREATE INDEX idx_affiliates_status 
  ON affiliates(status) 
  WHERE deleted_at IS NULL;

-- Índice para aprovação (relatórios)
CREATE INDEX idx_affiliates_approved_at 
  ON affiliates(approved_at) 
  WHERE approved_at IS NOT NULL AND deleted_at IS NULL;

-- Índice para criação (ordenação)
CREATE INDEX idx_affiliates_created_at 
  ON affiliates(created_at DESC) 
  WHERE deleted_at IS NULL;

-- ============================================
-- FUNÇÃO: generate_referral_code()
-- ============================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  LOOP
    result := '';
    
    -- Gerar código de 6 caracteres
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Verificar se já existe
    IF NOT EXISTS (
      SELECT 1 FROM affiliates 
      WHERE referral_code = result 
      AND deleted_at IS NULL
    ) THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Unable to generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: auto_generate_referral_code
-- ============================================

CREATE OR REPLACE FUNCTION trigger_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Gerar código se não fornecido
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  
  -- Validar formato do código
  IF NEW.referral_code !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'Referral code must be 6 alphanumeric characters: %', NEW.referral_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_referral_code
  BEFORE INSERT ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_referral_code();

-- ============================================
-- TRIGGER: update_updated_at
-- ============================================

CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO: validate_affiliate_status_change()
-- ============================================

CREATE OR REPLACE FUNCTION validate_affiliate_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar transições de status permitidas
  IF OLD.status IS NOT NULL AND OLD.status != NEW.status THEN
    -- pending -> active, rejected
    IF OLD.status = 'pending' AND NEW.status NOT IN ('active', 'rejected') THEN
      RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
    END IF;
    
    -- active -> inactive, suspended
    IF OLD.status = 'active' AND NEW.status NOT IN ('inactive', 'suspended') THEN
      RAISE EXCEPTION 'Invalid status transition from active to %', NEW.status;
    END IF;
    
    -- inactive -> active, suspended
    IF OLD.status = 'inactive' AND NEW.status NOT IN ('active', 'suspended') THEN
      RAISE EXCEPTION 'Invalid status transition from inactive to %', NEW.status;
    END IF;
    
    -- suspended -> active, inactive (reativação)
    IF OLD.status = 'suspended' AND NEW.status NOT IN ('active', 'inactive') THEN
      RAISE EXCEPTION 'Invalid status transition from suspended to %', NEW.status;
    END IF;
    
    -- rejected é final (não pode mudar)
    IF OLD.status = 'rejected' THEN
      RAISE EXCEPTION 'Cannot change status from rejected';
    END IF;
  END IF;
  
  -- Definir approved_at quando status muda para active
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.approved_at := NOW();
    IF NEW.approved_by IS NULL THEN
      NEW.approved_by := auth.uid();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_affiliate_status_change
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION validate_affiliate_status_change();

-- ============================================
-- FUNÇÃO: protect_critical_fields()
-- ============================================

CREATE OR REPLACE FUNCTION protect_critical_fields_affiliates()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas admins podem alterar campos críticos
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.deleted_at IS NULL
  ) THEN
    -- Proteger campos críticos para não-admins
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Only admins can change affiliate status';
    END IF;
    
    IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
      RAISE EXCEPTION 'Referral code cannot be changed';
    END IF;
    
    IF NEW.wallet_id IS DISTINCT FROM OLD.wallet_id THEN
      RAISE EXCEPTION 'Wallet ID cannot be changed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_critical_fields_affiliates
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION protect_critical_fields_affiliates();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Afiliados podem ver apenas próprios dados
CREATE POLICY "Affiliates can view own data"
  ON affiliates FOR SELECT
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  );

-- Afiliados podem atualizar apenas próprios dados (limitado)
-- NOTA: Campos críticos (status, referral_code, wallet_id) são protegidos por trigger
CREATE POLICY "Affiliates can update own data"
  ON affiliates FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  );

-- Admins podem ver todos os afiliados
CREATE POLICY "Admins can view all affiliates"
  ON affiliates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- Admins podem criar afiliados
CREATE POLICY "Admins can create affiliates"
  ON affiliates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- Admins podem atualizar afiliados
CREATE POLICY "Admins can update affiliates"
  ON affiliates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- Usuários podem se cadastrar como afiliados
CREATE POLICY "Users can register as affiliates"
  ON affiliates FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- ============================================
-- FUNÇÃO: get_affiliate_stats()
-- ============================================

CREATE OR REPLACE FUNCTION get_affiliate_stats(affiliate_uuid UUID)
RETURNS TABLE (
  total_clicks BIGINT,
  total_conversions BIGINT,
  total_commissions_cents BIGINT,
  conversion_rate DECIMAL,
  avg_commission_cents DECIMAL,
  last_conversion_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(a.total_clicks::BIGINT, 0) as total_clicks,
    COALESCE(a.total_conversions::BIGINT, 0) as total_conversions,
    COALESCE(a.total_commissions_cents::BIGINT, 0) as total_commissions_cents,
    CASE 
      WHEN a.total_clicks > 0 THEN 
        ROUND((a.total_conversions::DECIMAL / a.total_clicks::DECIMAL) * 100, 2)
      ELSE 0
    END as conversion_rate,
    CASE 
      WHEN a.total_conversions > 0 THEN 
        ROUND(a.total_commissions_cents::DECIMAL / a.total_conversions::DECIMAL, 2)
      ELSE 0
    END as avg_commission_cents,
    (
      SELECT MAX(created_at) 
      FROM orders 
      WHERE affiliate_n1_id = affiliate_uuid 
      AND status = 'paid'
      AND deleted_at IS NULL
    ) as last_conversion_at
  FROM affiliates a
  WHERE a.id = affiliate_uuid
  AND a.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE affiliates IS 'Tabela principal de afiliados do sistema multinível';
COMMENT ON COLUMN affiliates.referral_code IS 'Código único de 6 caracteres para rastreamento';
COMMENT ON COLUMN affiliates.wallet_id IS 'ID da carteira Asaas para recebimento de comissões';
COMMENT ON COLUMN affiliates.total_clicks IS 'Cache do total de cliques nos links do afiliado';
COMMENT ON COLUMN affiliates.total_conversions IS 'Cache do total de conversões (vendas)';
COMMENT ON COLUMN affiliates.total_commissions_cents IS 'Cache do total de comissões em centavos';

COMMIT;

-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP TABLE IF EXISTS affiliates CASCADE;
-- DROP FUNCTION IF EXISTS generate_referral_code() CASCADE;
-- DROP FUNCTION IF EXISTS trigger_generate_referral_code() CASCADE;
-- DROP FUNCTION IF EXISTS validate_affiliate_status_change() CASCADE;
-- DROP FUNCTION IF EXISTS get_affiliate_stats(UUID) CASCADE;
-- DROP TYPE IF EXISTS affiliate_status CASCADE;
-- DROP TYPE IF EXISTS conversion_status CASCADE;
-- DROP TYPE IF EXISTS commission_status CASCADE;
-- DROP TYPE IF EXISTS commission_split_status CASCADE;
-- DROP TYPE IF EXISTS log_operation_type CASCADE;
-- COMMIT;