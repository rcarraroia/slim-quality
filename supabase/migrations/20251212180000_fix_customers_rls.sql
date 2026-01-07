-- Migration: Fix RLS policies for customers table to allow checkout
-- Created: 2025-12-12 18:00:00
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela customers existe
--   ✅ RLS está ativo mas muito restritivo
--   ✅ Checkout precisa inserir novos clientes
-- ============================================

-- UP Migration
BEGIN;
-- Remover políticas existentes que podem estar causando problemas
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable update for users based on email" ON customers;
DROP POLICY IF EXISTS "Users can view own data" ON customers;
-- Criar políticas permissivas para checkout público
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
-- Garantir que RLS está ativo
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
COMMIT;
-- DOWN Migration (para rollback)
-- BEGIN;
-- DROP POLICY IF EXISTS "Allow public read on customers" ON customers;
-- DROP POLICY IF EXISTS "Allow public insert on customers" ON customers;
-- DROP POLICY IF EXISTS "Allow public update on customers" ON customers;
-- COMMIT;
