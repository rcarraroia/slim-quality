-- Migration: Ajustar Tabelas de Suporte para Admin Panel
-- Created: 07/01/2026
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela admins já existe (criada em auth_system.sql)
--   ✅ Tabela audit_logs já existe (criada em initial_setup.sql)
--   ✅ Tabela affiliates já existe
--   ✅ Compatível com estrutura existente
-- ============================================

-- UP Migration
BEGIN;

-- Verificar se coluna admin_id já existe em audit_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'admin_id'
    ) THEN
        -- Adicionar coluna admin_id à tabela audit_logs
        ALTER TABLE audit_logs
        ADD COLUMN admin_id UUID REFERENCES admins(id);
        
        -- Criar índice para performance
        CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
        
        -- Comentário explicativo
        COMMENT ON COLUMN audit_logs.admin_id IS 'Admin que executou a ação';
    END IF;
END $$;

-- Verificar se RLS já está habilitado em affiliates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'affiliates' 
        AND rowsecurity = true
    ) THEN
        -- Habilitar RLS em affiliates
        ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Criar políticas RLS para affiliates (se não existirem)
DO $$
BEGIN
    -- Política para admins verem todos os afiliados
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliates' 
        AND policyname = 'Admins can view all affiliates'
    ) THEN
        CREATE POLICY "Admins can view all affiliates"
        ON affiliates FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM admins
                WHERE admins.id = auth.uid()
                AND admins.is_active = true
            )
        );
    END IF;

    -- Política para admins editarem todos os afiliados
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliates' 
        AND policyname = 'Admins can update all affiliates'
    ) THEN
        CREATE POLICY "Admins can update all affiliates"
        ON affiliates FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM admins
                WHERE admins.id = auth.uid()
                AND admins.is_active = true
            )
        );
    END IF;

    -- Política para admins inserirem afiliados
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliates' 
        AND policyname = 'Admins can insert affiliates'
    ) THEN
        CREATE POLICY "Admins can insert affiliates"
        ON affiliates FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM admins
                WHERE admins.id = auth.uid()
                AND admins.is_active = true
            )
        );
    END IF;
END $$;

-- Verificar se variáveis de ambiente Asaas estão documentadas
DO $$
BEGIN
    -- Apenas log informativo - variáveis devem ser configuradas no .env
    RAISE NOTICE 'Lembrete: Configure as variáveis de ambiente Asaas:';
    RAISE NOTICE '- ASAAS_API_KEY=sua-chave-asaas-aqui';
    RAISE NOTICE '- ASAAS_BASE_URL=https://api.asaas.com/v3 (ou sandbox)';
    RAISE NOTICE '- ASAAS_WALLET_RENUM=wal_xxxxx';
    RAISE NOTICE '- ASAAS_WALLET_JB=wal_xxxxx';
END $$;

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- 
-- -- Remover políticas RLS
-- DROP POLICY IF EXISTS "Admins can view all affiliates" ON affiliates;
-- DROP POLICY IF EXISTS "Admins can update all affiliates" ON affiliates;
-- DROP POLICY IF EXISTS "Admins can insert affiliates" ON affiliates;
-- 
-- -- Desabilitar RLS
-- ALTER TABLE affiliates DISABLE ROW LEVEL SECURITY;
-- 
-- -- Remover coluna admin_id (cuidado: pode perder dados)
-- -- ALTER TABLE audit_logs DROP COLUMN IF EXISTS admin_id;
-- 
-- COMMIT;