-- Migration: Create CRM Customers Table
-- Sprint 5: Sistema de CRM e Gestão de Clientes
-- Created: 2025-01-25
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela customers não existe
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
--   ✅ Integração com sistema de vendas planejada
-- ============================================

BEGIN;

-- Criar função para validar CPF/CNPJ
CREATE OR REPLACE FUNCTION validate_cpf_cnpj(doc TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove caracteres não numéricos
  doc := regexp_replace(doc, '[^0-9]', '', 'g');
  
  -- Verifica se é CPF (11 dígitos) ou CNPJ (14 dígitos)
  IF length(doc) = 11 THEN
    -- Validação básica de CPF (pode ser expandida)
    RETURN doc ~ '^[0-9]{11}$' AND doc NOT IN ('00000000000', '11111111111', '22222222222');
  ELSIF length(doc) = 14 THEN
    -- Validação básica de CNPJ (pode ser expandida)
    RETURN doc ~ '^[0-9]{14}$' AND doc NOT IN ('00000000000000', '11111111111111');
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações básicas (obrigatórias)
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  
  -- Documentos
  cpf_cnpj VARCHAR(18),
  birth_date DATE,
  
  -- Endereço completo
  street VARCHAR(255),
  number VARCHAR(10),
  complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  postal_code VARCHAR(10),
  
  -- Metadata de origem e atribuição
  source VARCHAR(50) DEFAULT 'organic', -- 'organic', 'affiliate', 'n8n', 'manual'
  referral_code VARCHAR(20), -- código do afiliado (se aplicável)
  assigned_to UUID REFERENCES auth.users(id), -- vendedor responsável
  
  -- Status e observações
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'blocked'
  notes TEXT, -- observações gerais
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT customers_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT customers_phone_format CHECK (phone IS NULL OR phone ~ '^\+?[1-9][0-9]{8,14}$'),
  CONSTRAINT customers_cpf_cnpj_valid CHECK (cpf_cnpj IS NULL OR validate_cpf_cnpj(cpf_cnpj)),
  CONSTRAINT customers_source_valid CHECK (source IN ('organic', 'affiliate', 'n8n', 'manual')),
  CONSTRAINT customers_status_valid CHECK (status IN ('active', 'inactive', 'blocked')),
  CONSTRAINT customers_state_format CHECK (state IS NULL OR length(state) = 2),
  CONSTRAINT customers_postal_code_format CHECK (postal_code IS NULL OR postal_code ~ '^[0-9]{5}-?[0-9]{3}$')
);

-- Criar índices otimizados
CREATE INDEX idx_customers_email ON customers(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_phone ON customers(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_cpf_cnpj ON customers(cpf_cnpj) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_assigned_to ON customers(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_source ON customers(source) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_status ON customers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_created_at ON customers(created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_city_state ON customers(city, state) WHERE deleted_at IS NULL;

-- Criar índice para busca full-text
CREATE INDEX idx_customers_search ON customers USING gin(
  to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, ''))
) WHERE deleted_at IS NULL;

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Configurar Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Política: Vendedores veem apenas clientes atribuídos ou não atribuídos
CREATE POLICY "Vendedores veem clientes atribuídos"
  ON customers FOR ALL
  USING (
    -- Admin e supervisor veem todos
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
    OR
    -- Vendedor vê clientes atribuídos a ele
    assigned_to = auth.uid()
    OR
    -- Vendedor vê clientes não atribuídos (para poder assumir)
    assigned_to IS NULL
  );

-- Política específica para inserção (qualquer usuário autenticado pode criar)
CREATE POLICY "Usuários autenticados podem criar clientes"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Comentários para documentação
COMMENT ON TABLE customers IS 'Tabela principal de clientes do CRM';
COMMENT ON COLUMN customers.source IS 'Origem do cliente: organic, affiliate, n8n, manual';
COMMENT ON COLUMN customers.assigned_to IS 'Vendedor responsável pelo cliente';
COMMENT ON COLUMN customers.referral_code IS 'Código do afiliado que indicou (se aplicável)';
COMMENT ON COLUMN customers.cpf_cnpj IS 'CPF ou CNPJ do cliente (validado)';
COMMENT ON COLUMN customers.deleted_at IS 'Soft delete - quando não nulo, cliente foi removido';

COMMIT;