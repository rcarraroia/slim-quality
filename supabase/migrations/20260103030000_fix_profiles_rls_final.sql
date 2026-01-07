-- Migration: Corrigir RLS policies da tabela profiles - SOLUÇÃO FINAL
-- Created: 2026-01-03 03:00:00
-- Author: Kiro AI

-- PROBLEMA IDENTIFICADO:
-- - Tabela profiles retorna 0 registros com anon key
-- - RLS policies muito restritivas impedem acesso do frontend
-- - Sistema não carrega dados em nenhuma página

-- SOLUÇÃO:
-- - Permitir acesso público de leitura aos perfis (necessário para dashboard)
-- - Manter segurança para operações de escrita

BEGIN;
-- Remover TODAS as policies existentes da tabela profiles
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;
-- Criar policy simples e funcional para leitura pública
-- (Necessário para dashboard funcionar)
CREATE POLICY "Allow public read access to profiles"
  ON profiles FOR SELECT
  USING (true);
-- Manter segurança para operações de escrita
-- Apenas usuários autenticados podem atualizar próprio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
-- Apenas service_role pode inserir novos perfis
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
-- Apenas service_role pode deletar perfis
CREATE POLICY "Service role can delete profiles"
  ON profiles FOR DELETE
  USING (auth.role() = 'service_role');
COMMIT;
