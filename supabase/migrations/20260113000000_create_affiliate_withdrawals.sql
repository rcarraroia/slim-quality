-- Migration: Criar tabela de saques de afiliados
-- Created: 2026-01-13
-- Task 5.1: Implementar Recebimentos Reais

-- Criar tabela affiliate_withdrawals
CREATE TABLE IF NOT EXISTS affiliate_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 5000), -- Mínimo R$ 50
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  method VARCHAR(20) NOT NULL DEFAULT 'pix' CHECK (method IN ('pix', 'bank_transfer')),
  wallet_id VARCHAR(255) NOT NULL, -- Wallet ID do Asaas para onde vai o dinheiro
  pix_key VARCHAR(255), -- Chave PIX (se método for PIX)
  description TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_affiliate_withdrawals_affiliate_id ON affiliate_withdrawals(affiliate_id);
CREATE INDEX idx_affiliate_withdrawals_status ON affiliate_withdrawals(status);
CREATE INDEX idx_affiliate_withdrawals_created_at ON affiliate_withdrawals(created_at);

-- Trigger de updated_at
CREATE TRIGGER update_affiliate_withdrawals_updated_at
  BEFORE UPDATE ON affiliate_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

-- Afiliados veem apenas próprios saques
CREATE POLICY "Affiliates view own withdrawals"
  ON affiliate_withdrawals FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Afiliados podem criar saques
CREATE POLICY "Affiliates create own withdrawals"
  ON affiliate_withdrawals FOR INSERT
  WITH CHECK (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Admins veem todos
CREATE POLICY "Admins view all withdrawals"
  ON affiliate_withdrawals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
