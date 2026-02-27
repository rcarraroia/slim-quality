-- Migration: Criar tabela payment_sessions para Payment First
-- Created: 27/02/2026
-- Author: Kiro AI
-- Spec: payment-first-affiliates

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado via Supabase Power MCP que:
--   ✅ Tabela payment_sessions NÃO existe
--   ✅ Nenhuma tabela similar existe (verificadas 82 tabelas)
--   ✅ Compatível com estrutura existente
--   ✅ Nenhum dado será perdido
-- ============================================

-- UP Migration
BEGIN;

-- Criar tabela payment_sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  document TEXT NOT NULL,
  document_type VARCHAR(10) NOT NULL CHECK (document_type IN ('CPF', 'CNPJ')),
  password_hash TEXT NOT NULL, -- senha criptografada (bcrypt)
  affiliate_type VARCHAR(20) NOT NULL CHECK (affiliate_type IN ('individual', 'logista')),
  referred_by UUID REFERENCES affiliates(id), -- ID do afiliado que indicou (se houver)
  referral_code TEXT, -- código de indicação fornecido no cadastro
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_payment_sessions_token ON payment_sessions(session_token);
CREATE INDEX idx_payment_sessions_expires ON payment_sessions(expires_at);
CREATE INDEX idx_payment_sessions_email ON payment_sessions(email);

-- Criar trigger de updated_at
CREATE TRIGGER update_payment_sessions_updated_at
  BEFORE UPDATE ON payment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar sessões expiradas (executar diariamente)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM payment_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE payment_sessions IS 'Sessões temporárias para Payment First (expiram em 30 minutos)';
COMMENT ON COLUMN payment_sessions.password_hash IS 'Senha criptografada com bcrypt - será usada pelo webhook para criar usuário no Supabase Auth';
COMMENT ON COLUMN payment_sessions.referral_code IS 'Código de indicação fornecido no cadastro (não o ID do afiliado)';
COMMENT ON COLUMN payment_sessions.referred_by IS 'ID do afiliado que indicou (resolvido a partir do referral_code)';

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- DROP FUNCTION IF EXISTS cleanup_expired_sessions();
-- DROP TABLE IF EXISTS payment_sessions CASCADE;
-- COMMIT;
