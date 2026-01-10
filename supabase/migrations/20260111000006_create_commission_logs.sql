-- Migration: Criar tabela de logs de auditoria de comissões
-- Created: 11/01/2026
-- Author: Kiro AI
-- Task: 4.6

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela não existe
--   ✅ Necessária para auditoria completa
--   ✅ Compatível com estrutura existente
-- ============================================

-- UP Migration
BEGIN;

-- Criar tabela de logs de cálculo de comissões
CREATE TABLE IF NOT EXISTS commission_calculation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Input do cálculo
  input_data JSONB NOT NULL, -- { orderValue, affiliateN1Id, affiliateN2Id, affiliateN3Id }
  
  -- Output do cálculo
  output_data JSONB NOT NULL, -- { n1Value, n2Value, n3Value, renumValue, jbValue, totalCommission }
  
  -- Rede identificada
  network_data JSONB NOT NULL, -- { n1: {...}, n2: {...}, n3: {...} }
  
  -- Split calculado
  split_data JSONB NOT NULL, -- Array de { walletId, percentualValue }
  
  -- Redistribuição aplicada
  redistribution_applied BOOLEAN DEFAULT FALSE,
  redistribution_details JSONB, -- { unusedPercentage, redistributedToRenum, redistributedToJB }
  
  -- Status do processamento
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  
  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices para busca
  CONSTRAINT valid_input_data CHECK (jsonb_typeof(input_data) = 'object'),
  CONSTRAINT valid_output_data CHECK (jsonb_typeof(output_data) = 'object'),
  CONSTRAINT valid_network_data CHECK (jsonb_typeof(network_data) = 'object'),
  CONSTRAINT valid_split_data CHECK (jsonb_typeof(split_data) = 'array')
);

-- Criar índices
CREATE INDEX idx_commission_logs_order_id ON commission_calculation_logs(order_id);
CREATE INDEX idx_commission_logs_calculated_at ON commission_calculation_logs(calculated_at DESC);
CREATE INDEX idx_commission_logs_success ON commission_calculation_logs(success);

-- Comentários
COMMENT ON TABLE commission_calculation_logs IS 'Logs de auditoria de cálculos de comissões';
COMMENT ON COLUMN commission_calculation_logs.input_data IS 'Dados de entrada do cálculo (orderValue, affiliateIds)';
COMMENT ON COLUMN commission_calculation_logs.output_data IS 'Resultado do cálculo (valores de comissões)';
COMMENT ON COLUMN commission_calculation_logs.network_data IS 'Rede de afiliados identificada (N1, N2, N3)';
COMMENT ON COLUMN commission_calculation_logs.split_data IS 'Split calculado para envio ao Asaas';
COMMENT ON COLUMN commission_calculation_logs.redistribution_applied IS 'Se houve redistribuição para gestores';
COMMENT ON COLUMN commission_calculation_logs.redistribution_details IS 'Detalhes da redistribuição aplicada';

-- RLS: Apenas admins podem ver logs
ALTER TABLE commission_calculation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
  ON commission_calculation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- DROP TABLE IF EXISTS commission_calculation_logs CASCADE;
-- COMMIT;
