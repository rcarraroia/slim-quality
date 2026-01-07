-- BLOCO 3.1: Políticas RLS para Sistema Admin (Corrigido)
-- Task 3.1: Configurar Políticas RLS no Supabase

-- Habilitar RLS nas tabelas de admin que não têm
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sicc_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA TABELA ADMINS
-- ============================================

-- Admins podem ver apenas o próprio perfil
CREATE POLICY "Admins can view own profile"
  ON admins FOR SELECT
  USING (id = auth.uid());

-- Admins podem atualizar apenas o próprio perfil
CREATE POLICY "Admins can update own profile"
  ON admins FOR UPDATE
  USING (id = auth.uid());

-- Super admins podem ver todos os admins
CREATE POLICY "Super admins can view all admins"
  ON admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role = 'super_admin'
      AND admin_check.is_active = true
    )
  );

-- Super admins podem criar novos admins
CREATE POLICY "Super admins can create admins"
  ON admins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role = 'super_admin'
      AND admin_check.is_active = true
    )
  );

-- ============================================
-- POLÍTICAS PARA TABELA ADMIN_SESSIONS
-- ============================================

-- Admins podem ver apenas as próprias sessões
CREATE POLICY "Admins can view own sessions"
  ON admin_sessions FOR SELECT
  USING (admin_id = auth.uid());

-- Admins podem criar apenas as próprias sessões
CREATE POLICY "Admins can create own sessions"
  ON admin_sessions FOR INSERT
  WITH CHECK (admin_id = auth.uid());

-- Admins podem deletar apenas as próprias sessões
CREATE POLICY "Admins can delete own sessions"
  ON admin_sessions FOR DELETE
  USING (admin_id = auth.uid());

-- ============================================
-- POLÍTICAS PARA TABELA AUDIT_LOGS
-- ============================================

-- Admins podem ver logs (somente leitura)
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.is_active = true
    )
  );

-- Sistema pode inserir logs (para auditoria)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- POLÍTICAS PARA CONFIGURAÇÕES DO AGENTE
-- ============================================

-- Admins podem ver configurações
CREATE POLICY "Admins can view agent config"
  ON agent_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.is_active = true
    )
  );

-- Super admins podem alterar configurações
CREATE POLICY "Super admins can update agent config"
  ON agent_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role = 'super_admin'
      AND admin_check.is_active = true
    )
  );

-- ============================================
-- POLÍTICAS PARA CONFIGURAÇÕES DO SICC
-- ============================================

-- Admins podem ver configurações SICC
CREATE POLICY "Admins can view sicc config"
  ON sicc_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.is_active = true
    )
  );

-- Super admins podem alterar configurações SICC
CREATE POLICY "Super admins can update sicc config"
  ON sicc_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role = 'super_admin'
      AND admin_check.is_active = true
    )
  );

-- ============================================
-- FUNÇÕES HELPER PARA VERIFICAR ADMIN
-- ============================================

-- Função para verificar se usuário é admin ativo
CREATE OR REPLACE FUNCTION is_admin_active(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE id = user_id
    AND is_active = true
  );
END;
$$;

-- Função para verificar se usuário é super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE id = user_id
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$;;
