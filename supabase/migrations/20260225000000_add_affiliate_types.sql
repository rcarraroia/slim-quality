-- Migration: Adicionar Tipos de Afiliados (Individual e Logista)
-- ETAPA 1: Base de Dados e Tipos de Afiliados
-- Created: 2026-02-25
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela affiliates existe com 23 registros ativos
--   ✅ ENUM affiliate_status já existe
--   ✅ ENUM product_category já existe
--   ✅ Nenhum dado será perdido
-- ============================================

BEGIN;

-- ============================================
-- 1. CRIAR NOVOS ENUMs
-- ============================================

-- 1.1 Criar ENUM affiliate_type
CREATE TYPE affiliate_type AS ENUM ('individual', 'logista');

-- 1.2 Criar ENUM financial_status
CREATE TYPE financial_status AS ENUM ('financeiro_pendente', 'ativo');

-- 1.3 Adicionar valor 'show_row' ao ENUM product_category
ALTER TYPE product_category ADD VALUE 'show_row';

-- ============================================
-- 2. ADICIONAR COLUNAS NA TABELA AFFILIATES
-- ============================================

-- 2.1 Adicionar coluna affiliate_type (nullable temporariamente)
ALTER TABLE affiliates 
ADD COLUMN affiliate_type affiliate_type;

-- 2.2 Adicionar coluna financial_status (nullable temporariamente)
ALTER TABLE affiliates 
ADD COLUMN financial_status financial_status;

-- ============================================
-- 3. ATUALIZAR REGISTROS EXISTENTES
-- ============================================

-- 3.1 Atualizar todos os 23 registros existentes com valores padrão
UPDATE affiliates 
SET 
  affiliate_type = 'individual',
  financial_status = 'financeiro_pendente'
WHERE affiliate_type IS NULL;

-- ============================================
-- 4. TORNAR COLUNAS NOT NULL
-- ============================================

-- 4.1 Tornar affiliate_type NOT NULL com default
ALTER TABLE affiliates 
ALTER COLUMN affiliate_type SET NOT NULL;

ALTER TABLE affiliates 
ALTER COLUMN affiliate_type SET DEFAULT 'individual';

-- 4.2 Tornar financial_status NOT NULL com default
ALTER TABLE affiliates 
ALTER COLUMN financial_status SET NOT NULL;

ALTER TABLE affiliates 
ALTER COLUMN financial_status SET DEFAULT 'financeiro_pendente';

-- ============================================
-- 5. CRIAR ÍNDICES
-- ============================================

-- 5.1 Índice para affiliate_type
CREATE INDEX idx_affiliates_affiliate_type 
ON affiliates(affiliate_type);

-- 5.2 Índice para financial_status
CREATE INDEX idx_affiliates_financial_status 
ON affiliates(financial_status);

-- 5.3 Índice composto para affiliate_type + financial_status
CREATE INDEX idx_affiliates_type_status 
ON affiliates(affiliate_type, financial_status);

COMMIT;

-- ============================================
-- MIGRATION CONCLUÍDA
-- ============================================
-- Resumo:
--   ✅ ENUM affiliate_type criado (individual, logista)
--   ✅ ENUM financial_status criado (financeiro_pendente, ativo)
--   ✅ Valor 'show_row' adicionado ao ENUM product_category
--   ✅ Colunas adicionadas na tabela affiliates
--   ✅ 23 registros existentes atualizados
--   ✅ 3 índices criados
-- ============================================
