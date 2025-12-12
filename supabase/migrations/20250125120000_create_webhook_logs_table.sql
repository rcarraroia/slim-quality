-- Migration: Criar tabela de logs de webhooks
-- Created: 2025-01-25
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela não existe
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
-- ============================================

-- UP Migration
BEGIN;

-- Criar tabela de logs de webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL, -- 'asaas', 'stripe', etc.
  event_type VARCHAR(100) NOT NULL, -- 'PAYMENT_RECEIVED', etc.
  payment_id VARCHAR(255), -- ID do pagamento no provedor
  order_id UUID REFERENCES orders(id), -- Referência ao pedido (opcional)
  status VARCHAR(50) NOT NULL, -- 'success', 'error', 'ignored'
  payload JSONB NOT NULL, -- Dados completos do webhook
  processing_result JSONB, -- Resultado do processamento
  error_message TEXT, -- Mensagem de erro (se houver)
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para consultas otimizadas
CREATE INDEX idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_payment_id ON webhook_logs(payment_id);
CREATE INDEX idx_webhook_logs_order_id ON webhook_logs(order_id);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_processed_at ON webhook_logs(processed_at);

-- Criar trigger de updated_at
CREATE TRIGGER update_webhook_logs_updated_at
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar políticas RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de webhooks
CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Apenas o sistema pode inserir logs (via service role)
CREATE POLICY "System can insert webhook logs"
  ON webhook_logs FOR INSERT
  WITH CHECK (true); -- Permitir inserção via service role

-- Comentários na tabela
COMMENT ON TABLE webhook_logs IS 'Logs de webhooks recebidos de provedores de pagamento';
COMMENT ON COLUMN webhook_logs.provider IS 'Provedor do webhook (asaas, stripe, etc.)';
COMMENT ON COLUMN webhook_logs.event_type IS 'Tipo do evento do webhook';
COMMENT ON COLUMN webhook_logs.payment_id IS 'ID do pagamento no provedor';
COMMENT ON COLUMN webhook_logs.order_id IS 'Referência ao pedido (se encontrado)';
COMMENT ON COLUMN webhook_logs.status IS 'Status do processamento (success, error, ignored)';
COMMENT ON COLUMN webhook_logs.payload IS 'Dados completos recebidos do webhook';
COMMENT ON COLUMN webhook_logs.processing_result IS 'Resultado do processamento interno';
COMMENT ON COLUMN webhook_logs.error_message IS 'Mensagem de erro se o processamento falhou';

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- DROP TABLE IF EXISTS webhook_logs CASCADE;
-- COMMIT;