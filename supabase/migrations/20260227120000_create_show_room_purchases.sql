-- Migration: Criar tabela show_room_purchases para rastreamento de compras Show Room
-- Created: 27/02/2026
-- Author: Kiro AI
-- Task: Implementação de Regras Especiais Show Room - Fase 0

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela show_room_purchases não existe
--   ✅ Tabelas affiliates, products, orders existem
--   ✅ Categoria 'show_row' existe no ENUM product_category
--   ✅ Campo affiliate_type existe em affiliates
--   ✅ Nenhum dado será perdido
-- ============================================

-- ============================================
-- OBJETIVO
-- ============================================
-- Rastrear compras de produtos Show Room por logista.
-- Garantir que cada logista possa comprar apenas 1 unidade de cada modelo.
-- Constraint UNIQUE(affiliate_id, product_id) impede compras duplicadas.
-- ============================================

BEGIN;

-- ============================================
-- 1. CRIAR TABELA show_room_purchases
-- ============================================

CREATE TABLE IF NOT EXISTS show_room_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Metadados
  purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraint: 1 compra por logista por produto
  CONSTRAINT unique_affiliate_product UNIQUE(affiliate_id, product_id)
);

-- Comentários
COMMENT ON TABLE show_room_purchases IS 'Rastreamento de compras Show Room por logista (1 unidade por produto)';
COMMENT ON COLUMN show_room_purchases.affiliate_id IS 'ID do afiliado logista que comprou';
COMMENT ON COLUMN show_room_purchases.product_id IS 'ID do produto Show Room comprado';
COMMENT ON COLUMN show_room_purchases.order_id IS 'ID do pedido que originou a compra';
COMMENT ON COLUMN show_room_purchases.purchased_at IS 'Data e hora da compra';
COMMENT ON CONSTRAINT unique_affiliate_product ON show_room_purchases IS 'Garante que cada logista compre apenas 1 unidade de cada modelo';

-- ============================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para buscar compras por afiliado (query mais comum)
CREATE INDEX idx_show_room_purchases_affiliate 
ON show_room_purchases(affiliate_id);

-- Índice para buscar compras por produto
CREATE INDEX idx_show_room_purchases_product 
ON show_room_purchases(product_id);

-- Índice para buscar compras por pedido
CREATE INDEX idx_show_room_purchases_order 
ON show_room_purchases(order_id);

-- Índice composto para verificação rápida de compra duplicada
CREATE INDEX idx_show_room_purchases_affiliate_product 
ON show_room_purchases(affiliate_id, product_id);

-- Índice para ordenação por data
CREATE INDEX idx_show_room_purchases_purchased_at 
ON show_room_purchases(purchased_at DESC);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE show_room_purchases ENABLE ROW LEVEL SECURITY;

-- Política: Logistas podem visualizar apenas suas próprias compras
CREATE POLICY "Logistas can view own purchases"
  ON show_room_purchases FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Admins podem visualizar todas as compras
CREATE POLICY "Admins can view all purchases"
  ON show_room_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Política: Sistema pode inserir compras (via Service Key)
-- Esta política permite que o webhook insira registros
CREATE POLICY "System can insert purchases"
  ON show_room_purchases FOR INSERT
  WITH CHECK (true);

-- Política: Admins podem deletar compras (para correções)
CREATE POLICY "Admins can delete purchases"
  ON show_room_purchases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

COMMIT;

-- ============================================
-- VALIDAÇÕES PÓS-MIGRATION
-- ============================================
-- Para validar que a migration foi aplicada corretamente:
--
-- 1. Verificar que tabela foi criada:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'show_room_purchases';
--
-- 2. Verificar constraint UNIQUE:
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'show_room_purchases' AND constraint_type = 'UNIQUE';
--
-- 3. Verificar índices:
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'show_room_purchases';
--
-- 4. Verificar políticas RLS:
-- SELECT policyname FROM pg_policies 
-- WHERE tablename = 'show_room_purchases';
--
-- 5. Testar inserção (deve funcionar):
-- INSERT INTO show_room_purchases (affiliate_id, product_id, order_id)
-- VALUES (
--   (SELECT id FROM affiliates LIMIT 1),
--   (SELECT id FROM products WHERE category = 'show_row' LIMIT 1),
--   (SELECT id FROM orders LIMIT 1)
-- );
--
-- 6. Testar constraint UNIQUE (deve falhar):
-- INSERT INTO show_room_purchases (affiliate_id, product_id, order_id)
-- VALUES (
--   (SELECT affiliate_id FROM show_room_purchases LIMIT 1),
--   (SELECT product_id FROM show_room_purchases LIMIT 1),
--   (SELECT id FROM orders LIMIT 1)
-- );
-- Esperado: ERROR: duplicate key value violates unique constraint "unique_affiliate_product"
-- ============================================

-- ============================================
-- ROLLBACK (se necessário)
-- ============================================
-- Para reverter esta migration:
-- BEGIN;
-- DROP TABLE IF EXISTS show_room_purchases CASCADE;
-- COMMIT;
-- ============================================
