-- Migration: Criar tabela audit_logs para Admin Panel
-- Created: 07/01/2026
-- Author: Kiro AI

BEGIN;

-- Criar tabela audit_logs se não existir
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Comentários
COMMENT ON TABLE audit_logs IS 'Logs de auditoria para ações administrativas';
COMMENT ON COLUMN audit_logs.admin_id IS 'Admin que executou a ação';
COMMENT ON COLUMN audit_logs.action IS 'Ação executada (ex: create, update, delete, approve)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Tipo de recurso (ex: affiliate, commission, withdrawal)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID do recurso afetado';
COMMENT ON COLUMN audit_logs.details IS 'Detalhes da ação em JSON';

COMMIT;;
