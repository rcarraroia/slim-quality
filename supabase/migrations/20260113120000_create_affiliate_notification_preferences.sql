-- Migration: Criar tabela de preferências de notificações de afiliados
-- Created: 2026-01-13
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela não existe
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
-- ============================================

BEGIN;

-- Criar tabela de preferências de notificações
CREATE TABLE IF NOT EXISTS affiliate_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  
  -- Preferências de email
  email_commissions BOOLEAN DEFAULT true,
  email_monthly_report BOOLEAN DEFAULT true,
  email_new_affiliates BOOLEAN DEFAULT true,
  email_promotions BOOLEAN DEFAULT false,
  
  -- Preferências de WhatsApp (futuro)
  whatsapp_commissions BOOLEAN DEFAULT false,
  whatsapp_monthly_report BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: um registro por afiliado
  UNIQUE(affiliate_id)
);

-- Criar índice
CREATE INDEX idx_affiliate_notification_preferences_affiliate_id 
  ON affiliate_notification_preferences(affiliate_id);

-- Criar trigger de updated_at
CREATE TRIGGER update_affiliate_notification_preferences_updated_at
  BEFORE UPDATE ON affiliate_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar políticas RLS
ALTER TABLE affiliate_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Afiliados podem ver e editar apenas suas próprias preferências
CREATE POLICY "Affiliates can view own preferences"
  ON affiliate_notification_preferences FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Affiliates can update own preferences"
  ON affiliate_notification_preferences FOR UPDATE
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Affiliates can insert own preferences"
  ON affiliate_notification_preferences FOR INSERT
  WITH CHECK (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Admins podem ver todas as preferências
CREATE POLICY "Admins can view all preferences"
  ON affiliate_notification_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND deleted_at IS NULL
    )
  );

COMMIT;
