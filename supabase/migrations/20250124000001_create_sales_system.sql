-- Migration: Sistema de Vendas - Sprint 3
-- Created: 2025-01-24
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabelas não existem
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
--   ✅ Preparado para Sprint 4 (afiliados)
-- ============================================

BEGIN;

-- ============================================
-- ENUMS
-- ============================================

-- Status de pedidos
CREATE TYPE order_status AS ENUM (
  'pending',      -- Aguardando pagamento
  'paid',         -- Pagamento confirmado
  'processing',   -- Em processamento
  'shipped',      -- Enviado
  'delivered',    -- Entregue
  'cancelled'     -- Cancelado
);

-- Métodos de pagamento
CREATE TYPE payment_method AS ENUM (
  'pix',
  'credit_card'
);

-- Status de pagamento
CREATE TYPE payment_status AS ENUM (
  'pending',      -- Aguardando
  'confirmed',    -- Confirmado
  'received',     -- Recebido
  'overdue',      -- Vencido
  'refunded',     -- Estornado
  'cancelled',    -- Cancelado
  'authorized'    -- Autorizado (cartão)
);

-- Status de split
CREATE TYPE split_status AS ENUM (
  'pending',              -- Aguardando pagamento
  'awaiting_credit',      -- Aguardando crédito
  'done',                 -- Concluído
  'cancelled',            -- Cancelado
  'refused',              -- Recusado
  'refunded'              -- Estornado
);

-- ============================================
-- TABELA: orders
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Número do pedido (gerado automaticamente)
  order_number VARCHAR(20) UNIQUE NOT NULL,
  
  -- Cliente
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_cpf VARCHAR(14), -- CPF sem formatação
  
  -- Valores (em centavos)
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  
  -- Status
  status order_status NOT NULL DEFAULT 'pending',
  
  -- Integração Asaas
  asaas_customer_id VARCHAR(50), -- ID do customer no Asaas
  remote_ip INET, -- IP do cliente (obrigatório para cartão)
  
  -- Afiliados (preparatório para Sprint 4)
  referral_code VARCHAR(20), -- Código de indicação usado
  affiliate_n1_id UUID REFERENCES auth.users(id), -- Afiliado direto
  affiliate_n2_id UUID REFERENCES auth.users(id), -- Indicado do N1
  affiliate_n3_id UUID REFERENCES auth.users(id), -- Indicado do N2
  
  -- Observações
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Índices
CREATE INDEX idx_orders_customer_id ON orders(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_order_number ON orders(order_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_created_at ON orders(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_referral_code ON orders(referral_code) WHERE deleted_at IS NULL AND referral_code IS NOT NULL;
CREATE INDEX idx_orders_affiliate_n1 ON orders(affiliate_n1_id) WHERE deleted_at IS NULL AND affiliate_n1_id IS NOT NULL;

-- ============================================
-- TABELA: order_items
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pedido
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Produto
  product_id UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  product_sku VARCHAR(50) NOT NULL,
  
  -- Quantidade e preços (em centavos)
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  total_price_cents INTEGER NOT NULL CHECK (total_price_cents >= 0),
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ============================================
-- TABELA: order_status_history
-- ============================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pedido
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Status
  from_status order_status,
  to_status order_status NOT NULL,
  
  -- Quem alterou
  changed_by UUID REFERENCES auth.users(id),
  
  -- Observações
  notes TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- ============================================
-- TABELA: payments
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pedido
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Método e valor
  payment_method payment_method NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  
  -- Status
  status payment_status NOT NULL DEFAULT 'pending',
  
  -- Integração Asaas
  asaas_payment_id VARCHAR(50) UNIQUE, -- ID do payment no Asaas
  asaas_charge_id VARCHAR(50), -- ID da cobrança (se diferente)
  
  -- PIX
  pix_qr_code TEXT, -- Base64 do QR Code
  pix_copy_paste TEXT, -- Copia e cola
  pix_expires_at TIMESTAMPTZ, -- Expiração do PIX
  
  -- Cartão
  card_brand VARCHAR(20), -- Visa, Mastercard, etc
  card_last_digits VARCHAR(4), -- Últimos 4 dígitos
  installments INTEGER NOT NULL DEFAULT 1 CHECK (installments >= 1 AND installments <= 21),
  
  -- Datas
  paid_at TIMESTAMPTZ, -- Quando foi pago
  confirmed_at TIMESTAMPTZ, -- Quando foi confirmado
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_asaas_payment_id ON payments(asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ============================================
-- TABELA: shipping_addresses
-- ============================================

CREATE TABLE IF NOT EXISTS shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pedido
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Destinatário
  recipient_name VARCHAR(100) NOT NULL,
  
  -- Endereço
  street VARCHAR(200) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(100),
  neighborhood VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL, -- UF
  postal_code VARCHAR(9) NOT NULL, -- CEP
  
  -- Contato
  phone VARCHAR(20) NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_shipping_addresses_order_id ON shipping_addresses(order_id);
CREATE INDEX idx_shipping_addresses_postal_code ON shipping_addresses(postal_code);

-- ============================================
-- TABELA: asaas_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS asaas_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  order_id UUID REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  
  -- Tipo de transação
  transaction_type VARCHAR(50) NOT NULL, -- create_customer, create_payment, get_payment, webhook
  
  -- Payloads
  request_payload JSONB,
  response_payload JSONB,
  
  -- Resultado
  success BOOLEAN NOT NULL,
  error_message TEXT,
  http_status INTEGER,
  
  -- IDs do Asaas
  asaas_customer_id VARCHAR(50),
  asaas_payment_id VARCHAR(50),
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_asaas_transactions_order_id ON asaas_transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_asaas_transactions_payment_id ON asaas_transactions(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_asaas_transactions_type ON asaas_transactions(transaction_type);
CREATE INDEX idx_asaas_transactions_created_at ON asaas_transactions(created_at DESC);
CREATE INDEX idx_asaas_transactions_asaas_payment_id ON asaas_transactions(asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;

-- ============================================
-- TABELA: asaas_splits (Auditoria)
-- ============================================

CREATE TABLE IF NOT EXISTS asaas_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  payment_id UUID REFERENCES payments(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  
  -- Configuração do split
  split_config JSONB NOT NULL, -- Array de splits enviado ao Asaas
  
  -- Valores
  total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
  net_amount_cents INTEGER, -- Valor líquido após taxas
  
  -- Status
  status split_status DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_asaas_splits_order_id ON asaas_splits(order_id);
CREATE INDEX idx_asaas_splits_payment_id ON asaas_splits(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_asaas_splits_status ON asaas_splits(status);

-- ============================================
-- TABELA: asaas_webhook_logs
-- ============================================

CREATE TABLE IF NOT EXISTS asaas_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Idempotência (UNIQUE)
  asaas_event_id VARCHAR(100) UNIQUE NOT NULL,
  
  -- Evento
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  
  -- Validação
  token_valid BOOLEAN NOT NULL,
  
  -- Processamento
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Referências (preenchidas após processamento)
  asaas_payment_id VARCHAR(50),
  payment_id UUID REFERENCES payments(id),
  order_id UUID REFERENCES orders(id),
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_asaas_webhook_logs_event_id ON asaas_webhook_logs(asaas_event_id);
CREATE INDEX idx_asaas_webhook_logs_event_type ON asaas_webhook_logs(event_type);
CREATE INDEX idx_asaas_webhook_logs_processed ON asaas_webhook_logs(processed);
CREATE INDEX idx_asaas_webhook_logs_asaas_payment_id ON asaas_webhook_logs(asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
CREATE INDEX idx_asaas_webhook_logs_created_at ON asaas_webhook_logs(created_at DESC);

-- ============================================
-- FUNÇÃO: generate_order_number()
-- ============================================

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_number VARCHAR(20);
  counter INTEGER;
BEGIN
  -- Formato: ORD-YYYYMMDD-XXXX
  -- Exemplo: ORD-20250124-0001
  
  -- Buscar último número do dia
  SELECT COUNT(*) + 1 INTO counter
  FROM orders
  WHERE order_number LIKE 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';
  
  -- Gerar novo número
  new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: auto_generate_order_number
-- ============================================

CREATE OR REPLACE FUNCTION trigger_generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_order_number();

-- ============================================
-- TRIGGER: update_updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asaas_splits_updated_at
  BEFORE UPDATE ON asaas_splits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id AND deleted_at IS NULL);

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )
  );

-- Políticas para order_items
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
      AND orders.deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )
  );

-- Políticas para payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.customer_id = auth.uid()
      AND orders.deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )
  );

-- Políticas para shipping_addresses
CREATE POLICY "Users can view own shipping addresses"
  ON shipping_addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipping_addresses.order_id
      AND orders.customer_id = auth.uid()
      AND orders.deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all shipping addresses"
  ON shipping_addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )
  );

-- Políticas para order_status_history
CREATE POLICY "Users can view own order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND orders.customer_id = auth.uid()
      AND orders.deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can view all order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )
  );

-- Políticas para asaas_transactions (apenas admin)
CREATE POLICY "Admins can view asaas transactions"
  ON asaas_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )
  );

-- Políticas para asaas_splits (apenas admin)
CREATE POLICY "Admins can view asaas splits"
  ON asaas_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )
  );

-- Políticas para asaas_webhook_logs (apenas admin)
CREATE POLICY "Admins can view webhook logs"
  ON asaas_webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )
  );

COMMIT;

-- ============================================
-- ROLLBACK (para referência)
-- ============================================

-- BEGIN;
-- DROP TABLE IF EXISTS asaas_webhook_logs CASCADE;
-- DROP TABLE IF EXISTS asaas_splits CASCADE;
-- DROP TABLE IF EXISTS asaas_transactions CASCADE;
-- DROP TABLE IF EXISTS shipping_addresses CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS order_status_history CASCADE;
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
-- DROP FUNCTION IF EXISTS trigger_generate_order_number() CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- DROP TYPE IF EXISTS order_status CASCADE;
-- DROP TYPE IF EXISTS payment_method CASCADE;
-- DROP TYPE IF EXISTS payment_status CASCADE;
-- DROP TYPE IF EXISTS split_status CASCADE;
-- COMMIT;
