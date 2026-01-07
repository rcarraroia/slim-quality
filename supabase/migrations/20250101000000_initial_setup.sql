-- Migration: Initial Setup - Funções Auxiliares e Extensões
-- Created: 2025-01-01
-- Author: Kiro AI
-- Sprint: 0 - Setup e Infraestrutura Base

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Banco de dados está vazio (novo projeto)
--   ✅ Nenhuma extensão conflitante
--   ✅ Primeira migration do projeto
-- ============================================

BEGIN;
-- ============================================
-- EXTENSÕES
-- ============================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION update_updated_at_column() IS 
'Função trigger para atualizar automaticamente o campo updated_at em qualquer tabela';
-- ============================================
-- VALIDAÇÃO
-- ============================================

-- Verificar se extensões foram criadas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    RAISE EXCEPTION 'Extensão uuid-ossp não foi criada';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'Extensão pgcrypto não foi criada';
  END IF;
  
  RAISE NOTICE 'Setup inicial concluído com sucesso!';
END $$;
COMMIT;
-- ============================================
-- ROLLBACK (para referência)
-- ============================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- COMMIT;;
