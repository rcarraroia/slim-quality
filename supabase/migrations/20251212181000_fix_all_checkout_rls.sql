-- Migration: Fix RLS policies for all checkout-related tables
-- Created: 2025-12-12 18:10:00
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Checkout precisa inserir em múltiplas tabelas
--   ✅ RLS está bloqueando inserções em cascata
--   ✅ Tabelas relacionadas: customers, orders, order_items, shipping_addresses, customer_timeline
-- ============================================

-- UP Migration
BEGIN;

-- ============================================
-- CUSTOMERS (já corrigido, mas garantindo)
-- ============================================
DROP POLICY IF EXISTS "Allow public read on customers" ON customers;
DROP POLICY IF EXISTS "Allow public insert on customers" ON customers;
DROP POLICY IF EXISTS "Allow public update on customers" ON customers;

CREATE POLICY "Allow public read on customers"
  ON customers FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on customers"
  ON customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on customers"
  ON customers FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CUSTOMER_TIMELINE
-- ============================================
DROP POLICY IF EXISTS "Users can view own timeline" ON customer_timeline;
DROP POLICY IF EXISTS "Users can insert own timeline" ON customer_timeline;

CREATE POLICY "Allow public read on customer_timeline"
  ON customer_timeline FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on customer_timeline"
  ON customer_timeline FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on customer_timeline"
  ON customer_timeline FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ORDERS
-- ============================================
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Staff view all orders" ON orders;

CREATE POLICY "Allow public read on orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on orders"
  ON orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ORDER_ITEMS
-- ============================================
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;

CREATE POLICY "Allow public read on order_items"
  ON order_items FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on order_items"
  ON order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on order_items"
  ON order_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- SHIPPING_ADDRESSES
-- ============================================
DROP POLICY IF EXISTS "Users can view own shipping addresses" ON shipping_addresses;

CREATE POLICY "Allow public read on shipping_addresses"
  ON shipping_addresses FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on shipping_addresses"
  ON shipping_addresses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on shipping_addresses"
  ON shipping_addresses FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- REFERRAL_CONVERSIONS (para afiliados)
-- ============================================
DROP POLICY IF EXISTS "Affiliates can view own conversions" ON referral_conversions;

CREATE POLICY "Allow public read on referral_conversions"
  ON referral_conversions FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on referral_conversions"
  ON referral_conversions FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Garantir que RLS está ativo em todas as tabelas
-- ============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- -- Remover todas as políticas públicas criadas
-- DROP POLICY IF EXISTS "Allow public read on customers" ON customers;
-- DROP POLICY IF EXISTS "Allow public insert on customers" ON customers;
-- DROP POLICY IF EXISTS "Allow public update on customers" ON customers;
-- DROP POLICY IF EXISTS "Allow public read on customer_timeline" ON customer_timeline;
-- DROP POLICY IF EXISTS "Allow public insert on customer_timeline" ON customer_timeline;
-- DROP POLICY IF EXISTS "Allow public update on customer_timeline" ON customer_timeline;
-- DROP POLICY IF EXISTS "Allow public read on orders" ON orders;
-- DROP POLICY IF EXISTS "Allow public insert on orders" ON orders;
-- DROP POLICY IF EXISTS "Allow public update on orders" ON orders;
-- DROP POLICY IF EXISTS "Allow public read on order_items" ON order_items;
-- DROP POLICY IF EXISTS "Allow public insert on order_items" ON order_items;
-- DROP POLICY IF EXISTS "Allow public update on order_items" ON order_items;
-- DROP POLICY IF EXISTS "Allow public read on shipping_addresses" ON shipping_addresses;
-- DROP POLICY IF EXISTS "Allow public insert on shipping_addresses" ON shipping_addresses;
-- DROP POLICY IF EXISTS "Allow public update on shipping_addresses" ON shipping_addresses;
-- DROP POLICY IF EXISTS "Allow public read on referral_conversions" ON referral_conversions;
-- DROP POLICY IF EXISTS "Allow public insert on referral_conversions" ON referral_conversions;
-- COMMIT;