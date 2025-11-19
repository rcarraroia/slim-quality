-- Fix RLS Policies - Remover recursão infinita
-- Data: 2025-11-18

-- ============================================
-- CORRIGIR POLÍTICAS DE user_roles
-- ============================================

-- Remover políticas antigas que causam recursão
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Criar políticas corretas SEM recursão
-- Política 1: Usuários podem ver suas próprias roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Política 2: Service role pode fazer tudo (para backend)
CREATE POLICY "Service role full access"
  ON user_roles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- CORRIGIR POLÍTICAS DE profiles
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Criar políticas corretas
-- Política 1: Usuários podem ver próprio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

-- Política 2: Usuários podem atualizar próprio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL);

-- Política 3: Service role pode fazer tudo
CREATE POLICY "Service role full access on profiles"
  ON profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- GARANTIR QUE RLS ESTÁ ATIVO
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
