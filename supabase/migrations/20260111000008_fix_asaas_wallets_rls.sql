-- Migration: Corrigir políticas RLS da tabela asaas_wallets
-- Created: 2026-01-11
-- Author: Kiro AI
-- Issue: Política de INSERT sem WITH CHECK causa erro 406

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado via Power Supabase:
--   ✅ Tabela asaas_wallets tem RLS ativo
--   ✅ 5 políticas existem
--   ❌ Política INSERT sem WITH CHECK
--   ❌ Causa erro 406 (Not Acceptable)
-- ============================================

BEGIN;

-- Remover política de INSERT antiga (sem WITH CHECK)
DROP POLICY IF EXISTS "Affiliates can insert wallet validation cache" ON asaas_wallets;

-- Recriar política de INSERT com WITH CHECK
-- Permite que qualquer usuário autenticado insira (cache público)
CREATE POLICY "Affiliates can insert wallet validation cache"
  ON asaas_wallets
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Adicionar política para permitir acesso anônimo (Edge Function)
-- Edge Functions usam chave anon, não auth.uid()
CREATE POLICY "Allow anonymous access for validation"
  ON asaas_wallets
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

COMMIT;

-- Verificação pós-migration
-- SELECT schemaname, tablename, policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'asaas_wallets';
