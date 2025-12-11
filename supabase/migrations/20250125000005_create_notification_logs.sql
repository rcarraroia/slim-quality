-- Migration: Sistema de Afiliados - Logs de Notificação
-- Created: 2025-01-25
-- Author: Kiro AI
-- Sprint: 4 - Sistema de Afiliados Multinível

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela notification_logs não existe
--   ✅ Tabela affiliates existe (dependência)
--   ✅ Índices otimizados para consultas
--   ✅ RLS configurado para segurança
-- ============================================

BEGIN;

-- ============================================
-- TABELA: notification_logs
-- ============================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  
  -- Tipo de notificação
  type TEXT NOT NULL CHECK (type IN (
    'welcome',
    'commission_received',
    'status_change',
    'network_update',
    'payment_reminder',
    'monthly_report'
  )),
  
  -- Dados da notificação
  data JSONB NOT NULL DEFAULT '{}',
  
  -- Canal de envio
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'sms', 'push')),
  
  -- Status do envio
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending', 'delivered')),
  error_message TEXT,
  
  -- Dados do destinatário
  recipient_email TEXT,
  recipient_phone TEXT,
  
  -- Timestamps
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  
  -- Metadados
  template_version TEXT,
  provider TEXT, -- sendgrid, ses, twilio, etc.
  provider_message_id TEXT
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice principal por afiliado
CREATE INDEX idx_notification_logs_affiliate 
  ON notification_logs(affiliate_id);

-- Índice por tipo de notificação
CREATE INDEX idx_notification_logs_type 
  ON notification_logs(type);

-- Índice por status
CREATE INDEX idx_notification_logs_status 
  ON notification_logs(status);

-- Índice por data de envio (para relatórios)
CREATE INDEX idx_notification_logs_sent_at 
  ON notification_logs(sent_at DESC);

-- Índice composto para consultas de afiliado
CREATE INDEX idx_notification_logs_affiliate_type_date 
  ON notification_logs(affiliate_id, type, sent_at DESC);

-- Índice para provider_message_id (rastreamento)
CREATE INDEX idx_notification_logs_provider_id 
  ON notification_logs(provider_message_id) 
  WHERE provider_message_id IS NOT NULL;

-- ============================================
-- FUNÇÃO: get_notification_stats()
-- ============================================

CREATE OR REPLACE FUNCTION get_notification_stats(
  p_affiliate_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  delivery_rate DECIMAL,
  by_type JSONB,
  by_channel JSONB
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date TIMESTAMPTZ := COALESCE(p_end_date, NOW());
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total_notifications,
      COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      
      -- Estatísticas por tipo
      jsonb_object_agg(
        type, 
        COUNT(*)
      ) FILTER (WHERE type IS NOT NULL) as type_stats,
      
      -- Estatísticas por canal
      jsonb_object_agg(
        channel, 
        COUNT(*)
      ) FILTER (WHERE channel IS NOT NULL) as channel_stats
      
    FROM notification_logs
    WHERE (p_affiliate_id IS NULL OR affiliate_id = p_affiliate_id)
    AND sent_at BETWEEN v_start_date AND v_end_date
  )
  SELECT 
    s.sent_count,
    s.delivered_count,
    s.failed_count,
    CASE 
      WHEN s.sent_count > 0 THEN 
        ROUND((s.delivered_count::DECIMAL / s.sent_count::DECIMAL) * 100, 2)
      ELSE 0::DECIMAL
    END,
    COALESCE(s.type_stats, '{}'::jsonb),
    COALESCE(s.channel_stats, '{}'::jsonb)
  FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: cleanup_old_notification_logs()
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_notification_logs(
  p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  v_cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;
  
  -- Deletar logs antigos (manter apenas logs de erro por mais tempo)
  DELETE FROM notification_logs
  WHERE sent_at < v_cutoff_date
  AND status != 'failed'; -- Manter logs de erro por mais tempo
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: update_delivery_status
-- ============================================

CREATE OR REPLACE FUNCTION update_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando status muda para 'delivered', registrar timestamp
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.delivered_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_delivery_status
  BEFORE UPDATE ON notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_status();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Afiliados podem ver apenas próprios logs
CREATE POLICY "Affiliates can view own notification logs"
  ON notification_logs FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view all notification logs"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- Sistema pode inserir logs
CREATE POLICY "System can insert notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true); -- Permitir inserção do sistema

-- Sistema pode atualizar logs (para status de entrega)
CREATE POLICY "System can update notification logs"
  ON notification_logs FOR UPDATE
  USING (true); -- Permitir atualização do sistema

-- ============================================
-- VIEW: notification_summary
-- ============================================

CREATE VIEW notification_summary AS
SELECT 
  nl.affiliate_id,
  a.name as affiliate_name,
  a.email as affiliate_email,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE nl.status = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE nl.status = 'delivered') as delivered_count,
  COUNT(*) FILTER (WHERE nl.status = 'failed') as failed_count,
  MAX(nl.sent_at) as last_notification_at,
  
  -- Taxa de entrega
  CASE 
    WHEN COUNT(*) FILTER (WHERE nl.status = 'sent') > 0 THEN
      ROUND(
        (COUNT(*) FILTER (WHERE nl.status = 'delivered')::DECIMAL / 
         COUNT(*) FILTER (WHERE nl.status = 'sent')::DECIMAL) * 100, 
        2
      )
    ELSE 0
  END as delivery_rate_percent
  
FROM notification_logs nl
JOIN affiliates a ON a.id = nl.affiliate_id
WHERE a.deleted_at IS NULL
GROUP BY nl.affiliate_id, a.name, a.email;

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE notification_logs IS 'Logs de notificações enviadas para afiliados';
COMMENT ON COLUMN notification_logs.type IS 'Tipo de notificação: welcome, commission_received, status_change, etc.';
COMMENT ON COLUMN notification_logs.data IS 'Dados específicos da notificação em formato JSON';
COMMENT ON COLUMN notification_logs.channel IS 'Canal de envio: email, whatsapp, sms, push';
COMMENT ON COLUMN notification_logs.status IS 'Status do envio: sent, failed, pending, delivered';
COMMENT ON FUNCTION get_notification_stats IS 'Retorna estatísticas de notificações por afiliado e período';
COMMENT ON FUNCTION cleanup_old_notification_logs IS 'Remove logs antigos mantendo apenas logs de erro';
COMMENT ON VIEW notification_summary IS 'Resumo de notificações por afiliado com taxa de entrega';

COMMIT;

-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP VIEW IF EXISTS notification_summary CASCADE;
-- DROP TABLE IF EXISTS notification_logs CASCADE;
-- DROP FUNCTION IF EXISTS get_notification_stats CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_old_notification_logs CASCADE;
-- DROP FUNCTION IF EXISTS update_delivery_status CASCADE;
-- COMMIT;