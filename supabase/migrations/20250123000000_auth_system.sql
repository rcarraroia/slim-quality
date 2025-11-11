-- ============================================
-- Migration: Sistema de Autenticação e Gestão de Usuários
-- Sprint: 1
-- Created: 2025-01-23
-- Author: Kiro AI
-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabelas não existem
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
--   ✅ Preparação para Sprint 4 (Afiliados) incluída
-- ============================================

BEGIN;

-- ============================================
-- 1. TABELA: profiles
-- ============================================
-- Objetivo: Armazenar informações estendidas dos usuários
-- Relacionamento: 1:1 com auth.users
-- ⭐ PREPARAÇÃO CRÍTICA PARA SPRINT 4 (Afiliados)

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações básicas
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  
  -- ⭐ PREPARAÇÃO PARA SPRINT 4 (Sistema de Afiliados)
  wallet_id TEXT, -- Wallet ID do Asaas (null até virar afiliado)
  is_affiliate BOOLEAN DEFAULT FALSE NOT NULL, -- Flag de afiliado
  affiliate_status TEXT CHECK (
    affiliate_status IS NULL OR 
    affiliate_status IN ('pending', 'active', 'inactive', 'suspended')
  ), -- Status do afiliado
  
  -- Metadados
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- Comentários
COMMENT ON TABLE profiles IS 'Perfis de usuários com informações estendidas';
COMMENT ON COLUMN profiles.wallet_id IS '⭐ Sprint 4: Wallet ID do Asaas para afiliados';
COMMENT ON COLUMN profiles.is_affiliate IS '⭐ Sprint 4: Flag indicando se usuário é afiliado';
COMMENT ON COLUMN profiles.affiliate_status IS '⭐ Sprint 4: Status do afiliado (pending, active, inactive, suspended)';

-- Índices para performance
CREATE INDEX idx_profiles_email ON profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE deleted_at IS NULL AND phone IS NOT NULL;
CREATE INDEX idx_profiles_last_login ON profiles(last_login_at DESC) WHERE deleted_at IS NULL;

-- ⭐ Índices preparatórios para Sprint 4 (Afiliados)
CREATE INDEX idx_profiles_is_affiliate ON profiles(is_affiliate) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_affiliate_status ON profiles(affiliate_status) WHERE deleted_at IS NULL AND affiliate_status IS NOT NULL;
CREATE INDEX idx_profiles_wallet_id ON profiles(wallet_id) WHERE wallet_id IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. TABELA: user_roles
-- ============================================
-- Objetivo: Gerenciar roles/permissões dos usuários (RBAC)
-- Roles: admin, vendedor, afiliado, cliente

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor', 'afiliado', 'cliente')),
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(user_id, role, deleted_at)
);

-- Comentários
COMMENT ON TABLE user_roles IS 'Roles/permissões dos usuários (RBAC)';
COMMENT ON COLUMN user_roles.role IS 'Roles disponíveis: admin, vendedor, afiliado, cliente';

-- Índices
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_role ON user_roles(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_user_role ON user_roles(user_id, role) WHERE deleted_at IS NULL;

-- ============================================
-- 3. TABELA: auth_logs
-- ============================================
-- Objetivo: Auditoria de eventos de autenticação

CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Informações do evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'register', 'login_success', 'login_failed', 'logout',
    'password_reset_request', 'password_reset_success',
    'profile_updated', 'role_changed'
  )),
  
  -- Informações da requisição
  ip_address INET,
  user_agent TEXT,
  
  -- Dados adicionais
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comentários
COMMENT ON TABLE auth_logs IS 'Logs de auditoria de eventos de autenticação';
COMMENT ON COLUMN auth_logs.event_type IS 'Tipo de evento: register, login_success, login_failed, logout, etc';

-- Índices
CREATE INDEX idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX idx_auth_logs_created_at ON auth_logs(created_at DESC);
CREATE INDEX idx_auth_logs_user_event ON auth_logs(user_id, event_type, created_at DESC);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- 4.1 RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem visualizar próprio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

-- Política: Usuários podem atualizar próprio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL);

-- Política: Admins podem visualizar todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Política: Admins podem atualizar todos os perfis
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Política: Sistema pode inserir perfis (para trigger)
CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4.2 RLS para user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem visualizar próprias roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Política: Admins podem visualizar todas as roles
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.deleted_at IS NULL
    )
  );

-- Política: Admins podem inserir roles
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.deleted_at IS NULL
    )
  );

-- Política: Admins podem atualizar roles (soft delete)
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.deleted_at IS NULL
    )
  );

-- Política: Sistema pode inserir role padrão (para trigger)
CREATE POLICY "System can insert default role"
  ON user_roles FOR INSERT
  WITH CHECK (role = 'cliente');

-- 4.3 RLS para auth_logs
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem visualizar todos os logs
CREATE POLICY "Admins can view all logs"
  ON auth_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Política: Sistema pode inserir logs
CREATE POLICY "System can insert logs"
  ON auth_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 5. TRIGGERS E FUNÇÕES
-- ============================================

-- 5.1 Função para criar profile automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Criar profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Atribuir role padrão 'cliente'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente');
  
  -- Registrar evento de registro
  INSERT INTO public.auth_logs (user_id, event_type, metadata)
  VALUES (NEW.id, 'register', jsonb_build_object('email', NEW.email));
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro
    RAISE WARNING 'Erro ao criar profile para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Comentário
COMMENT ON FUNCTION handle_new_user() IS 'Cria profile e atribui role padrão quando usuário é criado no auth.users';

-- Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 5.2 Função para sincronizar email
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sincronizar email se foi alterado
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Comentário
COMMENT ON FUNCTION sync_user_email() IS 'Sincroniza email entre auth.users e profiles';

-- Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (NEW.email IS DISTINCT FROM OLD.email)
  EXECUTE FUNCTION sync_user_email();

-- 5.3 Função para soft delete de profile
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Soft delete do profile
  UPDATE public.profiles
  SET deleted_at = NOW()
  WHERE id = OLD.id AND deleted_at IS NULL;
  
  -- Soft delete das roles
  UPDATE public.user_roles
  SET deleted_at = NOW()
  WHERE user_id = OLD.id AND deleted_at IS NULL;
  
  RETURN OLD;
END;
$$;

-- Comentário
COMMENT ON FUNCTION handle_user_delete() IS 'Soft delete de profile e roles quando usuário é removido do auth.users';

-- Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_delete();

COMMIT;

-- ============================================
-- VALIDAÇÕES PÓS-MIGRATION
-- ============================================
-- Verificar que tabelas foram criadas:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'user_roles', 'auth_logs');

-- Verificar índices:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('profiles', 'user_roles', 'auth_logs');

-- Verificar políticas RLS:
-- SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('profiles', 'user_roles', 'auth_logs');

-- Verificar triggers:
-- SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_table = 'users' AND trigger_schema = 'auth';
