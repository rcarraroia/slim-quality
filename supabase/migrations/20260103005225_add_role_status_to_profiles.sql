-- Migration: Adicionar campos role e status à tabela profiles
-- Created: 03/01/2026
-- Author: Kiro AI

-- ============================================
-- CORREÇÃO: Adicionar campos funcionais que faltavam
-- ============================================
-- Campos necessários para o modal de usuários:
--   - role: Cargo do usuário (super_admin, admin, vendedor, etc.)
--   - status: Status do usuário (ativo, inativo, bloqueado)
-- ============================================

BEGIN;

-- Adicionar campo role
ALTER TABLE profiles 
ADD COLUMN role TEXT DEFAULT 'vendedor' CHECK (role IN ('super_admin', 'admin', 'vendedor', 'suporte', 'financeiro', 'personalizado'));

-- Adicionar campo status  
ALTER TABLE profiles
ADD COLUMN status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado'));

-- Atualizar usuário existente para super_admin
UPDATE profiles 
SET role = 'super_admin', status = 'ativo' 
WHERE email = 'rcarrarocoach@gmail.com';

-- Criar índices para performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

COMMIT;