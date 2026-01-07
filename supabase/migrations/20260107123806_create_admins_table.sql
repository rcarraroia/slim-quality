-- Migration: Criar tabelas de autenticação para admins
-- Created: 05/01/2026
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabelas não existem
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
-- ============================================

-- UP Migration
BEGIN;

-- Criar tabela de administradores
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- Criar tabela de sessões (refresh tokens)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_refresh_token ON admin_sessions(refresh_token);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger updated_at
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed admin inicial (Renato)
-- Senha: Admin@123 (trocar no primeiro login)
-- Hash gerado com: bcrypt.hash('Admin@123', 10)
INSERT INTO admins (email, password_hash, name, role) VALUES (
  'renato@slimquality.com.br',
  '$2b$10$YourHashHere', -- Substituir pelo hash real
  'Renato',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- DROP TABLE IF EXISTS admin_sessions CASCADE;
-- DROP TABLE IF EXISTS admins CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- COMMIT;;
