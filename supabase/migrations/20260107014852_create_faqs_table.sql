-- Migration: Criar tabela FAQs com RLS e índices
-- Created: 06/01/2026
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela faqs não existe
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
-- ============================================

-- UP Migration
BEGIN;

-- Criar tabela faqs
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL CHECK (length(question) >= 10 AND length(question) <= 200),
  answer TEXT NOT NULL CHECK (length(answer) >= 20 AND length(answer) <= 1000),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_faqs_active_order ON faqs(is_active, display_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_faqs_search ON faqs USING gin(to_tsvector('portuguese', question || ' ' || answer)) WHERE deleted_at IS NULL;

-- Criar função para updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger de updated_at
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Política para leitura (todos podem ver FAQs ativas)
CREATE POLICY "Anyone can view active FAQs" ON faqs
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

-- Política para administradores (CRUD completo)
CREATE POLICY "Admins can manage all FAQs" ON faqs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

COMMIT;;
