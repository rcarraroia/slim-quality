-- Migration: Adicionar políticas RLS para tabela profiles
-- Created: 03/01/2026
-- Author: Kiro AI

-- ============================================
-- PROBLEMA: Frontend não consegue acessar profiles com anon key
-- SOLUÇÃO: Criar políticas RLS adequadas
-- ============================================

BEGIN;

-- Habilitar RLS na tabela profiles (se não estiver)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários autenticados podem ver próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Política 2: Usuários autenticados podem atualizar próprio perfil  
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Política 3: Super admins podem ver todos os perfis
CREATE POLICY "Super admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Política 4: Super admins podem inserir novos perfis
CREATE POLICY "Super admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Política 5: Super admins podem atualizar qualquer perfil
CREATE POLICY "Super admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Política 6: Super admins podem deletar perfis (soft delete)
CREATE POLICY "Super admins can delete profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

COMMIT;