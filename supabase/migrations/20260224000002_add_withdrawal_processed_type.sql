-- Migration: Adicionar tipo withdrawal_processed em notification_logs
-- Created: 2026-02-24
-- Author: Kiro AI
-- Sprint: Sistema de Notificações - Fase 1

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela notification_logs existe no banco real
--   ✅ Constraint notification_logs_type_check existe
--   ✅ Tipo withdrawal_processed não existe na lista
--   ✅ Modificação de constraint não afeta dados existentes
-- ============================================

BEGIN;

-- Remover constraint antiga
ALTER TABLE notification_logs 
DROP CONSTRAINT IF EXISTS notification_logs_type_check;

-- Adicionar constraint com novo tipo
ALTER TABLE notification_logs 
ADD CONSTRAINT notification_logs_type_check 
CHECK (type IN (
  'welcome',
  'commission_received',
  'withdrawal_processed',
  'status_change',
  'network_update',
  'payment_reminder',
  'monthly_report'
));

-- Adicionar comentário para documentação
COMMENT ON CONSTRAINT notification_logs_type_check ON notification_logs IS 
'Tipos de notificação permitidos. withdrawal_processed adicionado em 2026-02-24 para notificações de saques processados.';

COMMIT;

-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_type_check;
-- ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_type_check 
-- CHECK (type IN (
--   'welcome',
--   'commission_received',
--   'status_change',
--   'network_update',
--   'payment_reminder',
--   'monthly_report'
-- ));
-- COMMIT;
