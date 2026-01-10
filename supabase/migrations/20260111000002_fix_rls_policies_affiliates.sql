-- Migration: Corrigir RLS Policies para Sistema de Afiliados
-- Created: 2026-01-11
-- Author: Kiro AI
-- Issue: Erros 401/403 ao rastrear cliques e criar afiliados

-- ============================================
-- PROBLEMA IDENTIFICADO
-- ============================================
-- 1. Tabela referral_clicks não permite INSERT público (erro 401)
-- 2. Afiliados não são ativados automaticamente após cadastro
-- 3. Policies de affiliates bloqueando leitura do próprio registro

-- ============================================
-- CORREÇÕES
-- ============================================

BEGIN;

-- 1. Permitir INSERT público em referral_clicks (para tracking de cliques)
CREATE POLICY "Public can track referral clicks"
  ON referral_clicks FOR INSERT
  TO public
  WITH CHECK (true);

-- 2. Permitir que usuários autenticados leiam seus próprios dados de afiliado
-- (corrigir erro 406 ao buscar afiliado após cadastro)
DROP POLICY IF EXISTS "Affiliates can view own data" ON affiliates;

CREATE POLICY "Affiliates can view own data"
  ON affiliates FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id AND deleted_at IS NULL)
    OR
    -- Permitir leitura de afiliados ativos para lookup de código
    (status = 'active' AND deleted_at IS NULL)
  );

-- 3. Criar função para ativar afiliado automaticamente após cadastro
-- (quando wallet_id for configurado)
CREATE OR REPLACE FUNCTION auto_activate_affiliate()
RETURNS TRIGGER AS $$
BEGIN
  -- Se wallet_id foi definido e status ainda é pending, ativar automaticamente
  IF NEW.wallet_id IS NOT NULL 
     AND NEW.wallet_id != '' 
     AND OLD.wallet_id IS NULL 
     AND NEW.status = 'pending' THEN
    
    NEW.status := 'active';
    NEW.approved_at := NOW();
    NEW.approved_by := NEW.user_id; -- Auto-aprovação
    
    RAISE NOTICE 'Afiliado % ativado automaticamente', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar trigger para ativação automática
DROP TRIGGER IF EXISTS trigger_auto_activate_affiliate ON affiliates;

CREATE TRIGGER trigger_auto_activate_affiliate
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION auto_activate_affiliate();

-- 5. Ativar afiliados existentes que já têm wallet_id mas estão pending
UPDATE affiliates
SET 
  status = 'active',
  approved_at = NOW(),
  approved_by = user_id,
  updated_at = NOW()
WHERE 
  wallet_id IS NOT NULL 
  AND wallet_id != ''
  AND status = 'pending'
  AND deleted_at IS NULL;

COMMIT;

-- ============================================
-- VALIDAÇÕES
-- ============================================

-- Verificar policies criadas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'referral_clicks'
    AND policyname = 'Public can track referral clicks';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Policy de INSERT em referral_clicks não foi criada';
  END IF;
  
  RAISE NOTICE '✅ Policy de tracking criada com sucesso';
END $$;

-- Verificar trigger criado
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'trigger_auto_activate_affiliate';
  
  IF trigger_count = 0 THEN
    RAISE EXCEPTION 'Trigger de auto-ativação não foi criado';
  END IF;
  
  RAISE NOTICE '✅ Trigger de auto-ativação criado com sucesso';
END $$;

-- Log de afiliados ativados
DO $$
DECLARE
  activated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO activated_count
  FROM affiliates
  WHERE status = 'active'
    AND wallet_id IS NOT NULL
    AND deleted_at IS NULL;
  
  RAISE NOTICE '✅ Total de afiliados ativos: %', activated_count;
END $$;
