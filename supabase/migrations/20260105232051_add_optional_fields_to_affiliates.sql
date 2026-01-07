-- Migration: Adicionar campos opcionais para afiliados
-- Data: 2026-01-05
-- Descrição: Adiciona campos city, state, cep e birth_date para preenchimento posterior

BEGIN;

-- Adicionar colunas opcionais
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Adicionar comentários para documentação
COMMENT ON COLUMN affiliates.city IS 'Cidade do afiliado (opcional, preenchido em configurações)';
COMMENT ON COLUMN affiliates.state IS 'Estado do afiliado (opcional, preenchido em configurações)';
COMMENT ON COLUMN affiliates.cep IS 'CEP do afiliado (opcional, preenchido em configurações)';
COMMENT ON COLUMN affiliates.birth_date IS 'Data de nascimento (opcional, para validação futura se necessário)';

-- Criar índices para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_affiliates_city ON affiliates(city) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_affiliates_state ON affiliates(state) WHERE deleted_at IS NULL;

COMMIT;;
