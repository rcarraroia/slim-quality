-- Migration: Corrigir constraint de wallet_id na tabela asaas_wallets
-- Created: 2026-01-11
-- Author: Kiro AI
-- Issue: Constraint esperava formato wal_xxxxx mas Asaas usa UUID v4

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado via Power Supabase:
--   ✅ Tabela asaas_wallets existe
--   ✅ Tabela está vazia (0 registros)
--   ❌ Constraint atual: wallet_id ~ '^wal_[a-zA-Z0-9]{20}$'
--   ✅ Formato correto: UUID v4
-- ============================================

BEGIN;

-- Remover constraint antiga (formato errado)
ALTER TABLE asaas_wallets 
DROP CONSTRAINT IF EXISTS asaas_wallets_wallet_id_check;

-- Adicionar constraint correta (UUID v4)
-- Formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
-- Exemplo: cd912fa1-5fa4-4d49-92eb-b5ab4dfba961
ALTER TABLE asaas_wallets 
ADD CONSTRAINT asaas_wallets_wallet_id_check 
CHECK (wallet_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text);

-- Adicionar comentário explicativo
COMMENT ON CONSTRAINT asaas_wallets_wallet_id_check ON asaas_wallets IS 
'Valida formato UUID v4 (formato real usado pelo Asaas). Exemplo: cd912fa1-5fa4-4d49-92eb-b5ab4dfba961';

COMMIT;

-- Verificação pós-migration
-- SELECT conname, pg_get_constraintdef(oid) as definition 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.asaas_wallets'::regclass 
-- AND conname = 'asaas_wallets_wallet_id_check';
