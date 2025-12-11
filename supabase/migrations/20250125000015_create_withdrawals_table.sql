-- Migration: Sistema de Saques - Tabela Withdrawals
-- Created: 2025-01-25
-- Author: Kiro AI
-- Sprint: 7 - Correções Críticas

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela withdrawals não existe
--   ✅ Validação de saldo disponível
--   ✅ Logs completos de auditoria
--   ✅ Políticas RLS para segurança
--   ✅ Índices otimizados para consultas
-- ============================================

BEGIN;

-- ============================================
-- TIPOS ENUM PARA WITHDRAWALS
-- ============================================

-- Status dos saques
CREATE TYPE withdrawal_status AS ENUM (
  'pending',      -- Aguardando aprovação
  'approved',     -- Aprovado, aguardando processamento
  'processing',   -- Em processamento pelo Asaas
  'completed',    -- Concluído com sucesso
  'failed',       -- Falhou no processamento
  'rejected',     -- Rejeitado pelo admin
  'cancelled'     -- Cancelado pelo usuário
);

-- Tipos de operação para logs de saque
CREATE TYPE withdrawal_log_operation_type AS ENUM (
  'withdrawal_requested',    -- Solicitação criada
  'withdrawal_approved',     -- Aprovado pelo admin
  'withdrawal_rejected',     -- Rejeitado pelo admin
  'withdrawal_processing',   -- Iniciado processamento Asaas
  'withdrawal_completed',    -- Concluído com sucesso
  'withdrawal_failed',       -- Falhou no processamento
  'withdrawal_cancelled'     -- Cancelado pelo usuário
);

-- ============================================
-- TABELA: withdrawals (Saques de afiliados)
-- ============================================

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Valores financeiros
  requested_amount_cents INTEGER NOT NULL CHECK (requested_amount_cents > 0),
  fee_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_amount_cents >= 0),
  net_amount_cents INTEGER NOT NULL CHECK (net_amount_cents > 0),

  -- Status do saque
  status withdrawal_status NOT NULL DEFAULT 'pending',
  status_reason TEXT, -- Motivo de rejeição ou observações

  -- Dados bancários (criptografados)
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  agency TEXT NOT NULL,
  account TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings')),
  account_holder_name TEXT NOT NULL,
  account_holder_document TEXT NOT NULL, -- CPF/CNPJ

  -- Asaas Integration
  asaas_transfer_id TEXT UNIQUE, -- ID da transferência no Asaas
  asaas_transfer_response JSONB, -- Response completa da API Asaas

  -- Controle de saldo
  available_balance_before_cents INTEGER NOT NULL CHECK (available_balance_before_cents >= 0),
  available_balance_after_cents INTEGER NOT NULL CHECK (available_balance_after_cents >= 0),

  -- Processamento
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Usuários envolvidos
  requested_by UUID NOT NULL REFERENCES auth.users(id), -- Quem solicitou
  approved_by UUID REFERENCES auth.users(id), -- Admin que aprovou
  rejected_by UUID REFERENCES auth.users(id), -- Admin que rejeitou

  -- Controle de versão
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- ÍNDICES PARA WITHDRAWALS
-- ============================================

-- Índice para affiliate_id (consultas por afiliado)
CREATE INDEX idx_withdrawals_affiliate
  ON withdrawals(affiliate_id, created_at DESC);

-- Índice para status (filtrar por status)
CREATE INDEX idx_withdrawals_status
  ON withdrawals(status, created_at DESC);

-- Índice para requested_at (ordenação temporal)
CREATE INDEX idx_withdrawals_requested_at
  ON withdrawals(requested_at DESC);

-- Índice para asaas_transfer_id (integração Asaas)
CREATE INDEX idx_withdrawals_asaas_transfer
  ON withdrawals(asaas_transfer_id)
  WHERE asaas_transfer_id IS NOT NULL;

-- Índice composto para consultas administrativas
CREATE INDEX idx_withdrawals_admin_filters
  ON withdrawals(status, affiliate_id, requested_at DESC);

-- Índice para usuários envolvidos
CREATE INDEX idx_withdrawals_requested_by
  ON withdrawals(requested_by, created_at DESC);

CREATE INDEX idx_withdrawals_approved_by
  ON withdrawals(approved_by, created_at DESC)
  WHERE approved_by IS NOT NULL;

CREATE INDEX idx_withdrawals_rejected_by
  ON withdrawals(rejected_by, created_at DESC)
  WHERE rejected_by IS NOT NULL;

-- ============================================
-- CONSTRAINTS ADICIONAIS
-- ============================================

-- Garantir que net_amount = requested_amount - fee
ALTER TABLE withdrawals
ADD CONSTRAINT check_net_amount_calculation
CHECK (net_amount_cents = requested_amount_cents - fee_amount_cents);

-- Garantir que saldo após saque é válido
ALTER TABLE withdrawals
ADD CONSTRAINT check_balance_after_withdrawal
CHECK (available_balance_after_cents = available_balance_before_cents - requested_amount_cents);

-- Garantir que apenas um admin processa o saque
ALTER TABLE withdrawals
ADD CONSTRAINT check_single_processor
CHECK (
  (approved_by IS NULL AND rejected_by IS NULL) OR
  (approved_by IS NOT NULL AND rejected_by IS NULL) OR
  (approved_by IS NULL AND rejected_by IS NOT NULL)
);

-- ============================================
-- FUNÇÃO: validate_withdrawal_balance()
-- ============================================

CREATE OR REPLACE FUNCTION validate_withdrawal_balance(
  p_affiliate_id UUID,
  p_requested_amount_cents INTEGER
)
RETURNS TABLE (
  can_withdraw BOOLEAN,
  available_balance_cents INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_available_balance_cents INTEGER;
  v_pending_withdrawals_cents INTEGER := 0;
BEGIN
  -- Obter saldo disponível do afiliado
  SELECT available_balance_cents INTO v_available_balance_cents
  FROM affiliates
  WHERE id = p_affiliate_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Afiliado não encontrado'::TEXT;
    RETURN;
  END IF;

  -- Somar saques pendentes
  SELECT COALESCE(SUM(requested_amount_cents), 0) INTO v_pending_withdrawals_cents
  FROM withdrawals
  WHERE affiliate_id = p_affiliate_id
  AND status = 'pending'
  AND deleted_at IS NULL;

  -- Calcular saldo efetivo disponível
  v_available_balance_cents := v_available_balance_cents - v_pending_withdrawals_cents;

  -- Validar se pode sacar
  IF v_available_balance_cents < p_requested_amount_cents THEN
    RETURN QUERY SELECT
      false,
      v_available_balance_cents,
      format('Saldo insuficiente. Disponível: R$ %s, Solicitado: R$ %s',
             (v_available_balance_cents::DECIMAL / 100)::TEXT,
             (p_requested_amount_cents::DECIMAL / 100)::TEXT);
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_available_balance_cents, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: process_withdrawal()
-- ============================================

CREATE OR REPLACE FUNCTION process_withdrawal(
  p_withdrawal_id UUID,
  p_admin_user_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_status withdrawal_status,
  error_message TEXT
) AS $$
DECLARE
  v_withdrawal withdrawals%ROWTYPE;
  v_new_status withdrawal_status;
BEGIN
  -- Buscar saque
  SELECT * INTO v_withdrawal
  FROM withdrawals
  WHERE id = p_withdrawal_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::withdrawal_status, 'Saque não encontrado'::TEXT;
    RETURN;
  END IF;

  -- Validar status atual
  IF v_withdrawal.status != 'pending' THEN
    RETURN QUERY SELECT false, v_withdrawal.status, 'Saque já foi processado'::TEXT;
    RETURN;
  END IF;

  -- Determinar novo status
  IF p_action = 'approve' THEN
    v_new_status := 'approved';
  ELSIF p_action = 'reject' THEN
    v_new_status := 'rejected';
  ELSE
    RETURN QUERY SELECT false, NULL::withdrawal_status, 'Ação inválida'::TEXT;
    RETURN;
  END IF;

  -- Atualizar saque
  UPDATE withdrawals SET
    status = v_new_status,
    status_reason = p_reason,
    approved_by = CASE WHEN p_action = 'approve' THEN p_admin_user_id ELSE NULL END,
    rejected_by = CASE WHEN p_action = 'reject' THEN p_admin_user_id ELSE NULL END,
    processed_at = NOW(),
    completed_at = CASE WHEN p_action = 'approve' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_withdrawal_id;

  -- Se aprovado, atualizar saldo do afiliado
  IF p_action = 'approve' THEN
    UPDATE affiliates SET
      available_balance_cents = available_balance_cents - v_withdrawal.requested_amount_cents,
      updated_at = NOW()
    WHERE id = v_withdrawal.affiliate_id;
  END IF;

  -- Log de auditoria
  INSERT INTO withdrawal_logs (
    withdrawal_id,
    operation_type,
    operation_details,
    before_state,
    after_state,
    user_id,
    success,
    error_message
  ) VALUES (
    p_withdrawal_id,
    CASE WHEN p_action = 'approve' THEN 'withdrawal_approved' ELSE 'withdrawal_rejected' END,
    jsonb_build_object(
      'action', p_action,
      'reason', p_reason,
      'admin_user_id', p_admin_user_id
    ),
    jsonb_build_object(
      'status', v_withdrawal.status,
      'processed_at', v_withdrawal.processed_at
    ),
    jsonb_build_object(
      'status', v_new_status,
      'processed_at', NOW(),
      'reason', p_reason
    ),
    p_admin_user_id,
    true,
    NULL
  );

  RETURN QUERY SELECT true, v_new_status, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TABELA: withdrawal_logs (Auditoria de saques)
-- ============================================

CREATE TABLE IF NOT EXISTS withdrawal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID NOT NULL REFERENCES withdrawals(id) ON DELETE CASCADE,

  -- Contexto da operação
  operation_type withdrawal_log_operation_type NOT NULL,
  operation_details JSONB NOT NULL,

  -- Dados antes/depois
  before_state JSONB NULL,
  after_state JSONB NOT NULL,

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
-- ÍNDICES PARA WITHDRAWAL_LOGS
-- ============================================

CREATE INDEX idx_withdrawal_logs_withdrawal
  ON withdrawal_logs(withdrawal_id, created_at DESC);

CREATE INDEX idx_withdrawal_logs_operation
  ON withdrawal_logs(operation_type, created_at DESC);

CREATE INDEX idx_withdrawal_logs_user
  ON withdrawal_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- withdrawals (afiliados veem apenas os próprios, admins veem todos)
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own withdrawals"
  ON withdrawals FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all withdrawals"
  ON withdrawals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can update withdrawal status"
  ON withdrawals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- withdrawal_logs (apenas admin)
ALTER TABLE withdrawal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view withdrawal logs"
  ON withdrawal_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- ============================================
-- VIEWS PARA RELATÓRIOS
-- ============================================

-- View para estatísticas de saques
CREATE VIEW withdrawal_stats AS
SELECT
  COUNT(*) as total_withdrawals,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_withdrawals,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_withdrawals,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_withdrawals,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_withdrawals,
  SUM(requested_amount_cents) FILTER (WHERE status = 'completed') as total_paid_cents,
  SUM(fee_amount_cents) FILTER (WHERE status = 'completed') as total_fees_cents,
  AVG(requested_amount_cents) FILTER (WHERE status = 'completed') as avg_withdrawal_cents,
  MAX(requested_amount_cents) FILTER (WHERE status = 'completed') as max_withdrawal_cents,
  MIN(requested_amount_cents) FILTER (WHERE status = 'completed') as min_withdrawal_cents
FROM withdrawals
WHERE deleted_at IS NULL;

-- View para saques por afiliado
CREATE VIEW affiliate_withdrawal_summary AS
SELECT
  w.affiliate_id,
  a.name as affiliate_name,
  a.email as affiliate_email,
  COUNT(w.id) as total_withdrawals,
  COUNT(w.id) FILTER (WHERE w.status = 'completed') as completed_withdrawals,
  SUM(w.requested_amount_cents) FILTER (WHERE w.status = 'completed') as total_withdrawn_cents,
  MAX(w.requested_at) as last_withdrawal_date,
  AVG(w.requested_amount_cents) FILTER (WHERE w.status = 'completed') as avg_withdrawal_cents
FROM withdrawals w
JOIN affiliates a ON a.id = w.affiliate_id
WHERE w.deleted_at IS NULL AND a.deleted_at IS NULL
GROUP BY w.affiliate_id, a.name, a.email;

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE withdrawals IS 'Tabela de saques solicitados por afiliados';
COMMENT ON TABLE withdrawal_logs IS 'Logs de auditoria para operações de saque';
COMMENT ON FUNCTION validate_withdrawal_balance IS 'Valida se afiliado pode realizar saque';
COMMENT ON FUNCTION process_withdrawal IS 'Processa aprovação/rejeição de saque';
COMMENT ON VIEW withdrawal_stats IS 'Estatísticas gerais de saques';
COMMENT ON VIEW affiliate_withdrawal_summary IS 'Resumo de saques por afiliado';

COMMIT;

-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP VIEW IF EXISTS affiliate_withdrawal_summary CASCADE;
-- DROP VIEW IF EXISTS withdrawal_stats CASCADE;
-- DROP TABLE IF EXISTS withdrawal_logs CASCADE;
-- DROP TABLE IF EXISTS withdrawals CASCADE;
-- DROP FUNCTION IF EXISTS validate_withdrawal_balance CASCADE;
-- DROP FUNCTION IF EXISTS process_withdrawal CASCADE;
-- COMMIT;