-- Migration: Ajustar Tabelas de Suporte para Admin Panel
-- Created: 07/01/2026
-- Author: Kiro AI

BEGIN;

-- Habilitar RLS em affiliates se não estiver habilitado
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Criar política para admins verem todos os afiliados
DROP POLICY IF EXISTS "Admins can view all affiliates" ON affiliates;
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

-- Criar política para admins editarem todos os afiliados
DROP POLICY IF EXISTS "Admins can update all affiliates" ON affiliates;
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

-- Criar política para admins inserirem afiliados
DROP POLICY IF EXISTS "Admins can insert affiliates" ON affiliates;
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

COMMIT;;
