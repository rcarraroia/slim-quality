-- Migration: Permitir que afiliados alterem Wallet ID
-- Created: 2026-01-11
-- Author: Kiro AI
-- Issue: Afiliados devem poder trocar conta de recebimento

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado:
--   ✅ Trigger protect_critical_fields_affiliates impede alteração
--   ✅ Regra de negócio: Afiliado pode querer trocar conta
--   ✅ Solução: Remover validação de wallet_id do trigger
-- ============================================

BEGIN;

-- Remover trigger antigo
DROP TRIGGER IF EXISTS protect_critical_fields_affiliates ON affiliates;
DROP FUNCTION IF EXISTS protect_critical_fields_affiliates();

-- Recriar função SEM a validação de wallet_id
CREATE OR REPLACE FUNCTION protect_critical_fields_affiliates()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas admins podem alterar campos críticos
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
    AND user_roles.deleted_at IS NULL
  ) THEN
    -- Proteger campos críticos para não-admins
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Only admins can change affiliate status';
    END IF;
    
    IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
      RAISE EXCEPTION 'Referral code cannot be changed';
    END IF;
    
    -- REMOVIDO: Validação de wallet_id
    -- Afiliados PODEM alterar wallet_id (trocar conta de recebimento)
  END IF;
  
  -- Atualizar timestamp de validação quando wallet_id mudar
  IF NEW.wallet_id IS DISTINCT FROM OLD.wallet_id THEN
    NEW.wallet_validated_at = NOW();
    NEW.updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
CREATE TRIGGER protect_critical_fields_affiliates
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION protect_critical_fields_affiliates();

COMMIT;

-- Verificação pós-migration
-- UPDATE affiliates SET wallet_id = 'novo-uuid' WHERE id = 'test-id';
-- Deve funcionar sem erro
