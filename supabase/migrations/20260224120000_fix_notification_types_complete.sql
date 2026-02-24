-- Migration: Corrigir tipos de notificação (commission_paid e broadcast)
-- Created: 2026-02-24
-- Author: Kiro AI
-- Sprint: Sistema de Notificações - Correção Pós-Validação

-- ============================================
-- CONTEXTO
-- ============================================
-- Durante validação pré-produção, identificou-se que a migration
-- 20260224000002_add_withdrawal_processed_type.sql não incluiu
-- os tipos 'commission_paid' e 'broadcast' que já estavam sendo
-- usados no código backend desde a Fase 2.
--
-- Esta migration documenta a correção aplicada manualmente durante
-- a validação e garante que o constraint esteja completo.
-- ============================================

-- ============================================
-- JUSTIFICATIVAS
-- ============================================
-- commission_paid:
--   - Usado em: src/api/routes/admin/commissions.ts (linha 230)
--   - Função: Notificar afiliado quando comissão é paga
--   - Diferente de 'commission_received' (calculada vs paga)
--
-- broadcast:
--   - Usado em: src/api/routes/admin/notifications.ts (linha 30-50)
--   - Função: Comunicados do admin para todos os afiliados
--   - Funcionalidade core do sistema
-- ============================================

BEGIN;

-- Remover constraint existente
ALTER TABLE notification_logs 
DROP CONSTRAINT IF EXISTS notification_logs_type_check;

-- Adicionar constraint completo com TODOS os tipos necessários
ALTER TABLE notification_logs 
ADD CONSTRAINT notification_logs_type_check 
CHECK (type IN (
  'welcome',
  'commission_received',
  'withdrawal_processed',
  'status_change',
  'network_update',
  'payment_reminder',
  'monthly_report',
  'commission_paid',      -- Adicionado: notificação de comissão paga
  'broadcast'             -- Adicionado: comunicados do admin
));

-- Atualizar comentário para documentação
COMMENT ON CONSTRAINT notification_logs_type_check ON notification_logs IS 
'Tipos de notificação permitidos. Atualizado em 2026-02-24 para incluir commission_paid (comissões pagas) e broadcast (comunicados admin).';

COMMIT;

-- ============================================
-- VALIDAÇÃO
-- ============================================
-- Verificar constraint aplicado:
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'notification_logs_type_check';
-- ============================================
