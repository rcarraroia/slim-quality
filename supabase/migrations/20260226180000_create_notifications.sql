-- Migration: Criar tabela de notificações para afiliados
-- Created: 26/02/2026
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela não existe
--   ✅ Estrutura planejada para notificações persistentes
--   ✅ Compatível com sistema de afiliados existente
-- ============================================

-- UP Migration
BEGIN;

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'payment_reminder', 'payment_confirmed', 'overdue', 'regularized'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500), -- Link para ação (ex: /afiliados/dashboard/pagamentos)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_notifications_affiliate_id ON notifications(affiliate_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_affiliate_unread ON notifications(affiliate_id, is_read) WHERE is_read = FALSE;

-- Criar trigger de updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar políticas RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Afiliados podem ver apenas suas próprias notificações
CREATE POLICY "Affiliates can view own notifications"
  ON notifications FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM affiliates WHERE id = affiliate_id
    )
  );

-- Afiliados podem atualizar apenas suas próprias notificações (marcar como lida)
CREATE POLICY "Affiliates can update own notifications"
  ON notifications FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM affiliates WHERE id = affiliate_id
    )
  );

-- Service role pode inserir notificações
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Service role pode deletar notificações antigas
CREATE POLICY "Service role can delete notifications"
  ON notifications FOR DELETE
  USING (true);

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- COMMIT;
