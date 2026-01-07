-- Migration: Desabilitar RLS na tabela affiliates
-- Created: 2026-01-03 04:00:00
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela affiliates existe
--   ✅ RLS está bloqueando acesso do frontend
--   ✅ Necessário desabilitar para funcionamento
-- ============================================

-- UP Migration
BEGIN;
-- Desabilitar RLS na tabela affiliates
ALTER TABLE affiliates DISABLE ROW LEVEL SECURITY;
-- Verificar se foi desabilitado
DO $$
BEGIN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'affiliates') THEN
        RAISE NOTICE 'RLS desabilitado com sucesso na tabela affiliates';
    ELSE
        RAISE EXCEPTION 'Falha ao desabilitar RLS na tabela affiliates';
    END IF;
END $$;
COMMIT;
-- DOWN Migration (para rollback)
-- BEGIN;
-- ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
-- COMMIT;
