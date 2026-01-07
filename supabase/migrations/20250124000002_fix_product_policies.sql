-- ============================================
-- Migration: Corrigir Políticas RLS de Produtos
-- Sprint: 2
-- Created: 2025-01-24
-- Author: Kiro AI
-- ============================================
-- Objetivo: Remover recursão infinita nas políticas RLS
-- ============================================

BEGIN;
-- ============================================
-- 1. REMOVER POLÍTICAS ANTIGAS
-- ============================================

DROP POLICY IF EXISTS "Admins can view all products" ON products;
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can manage technologies" ON technologies;
DROP POLICY IF EXISTS "Admins can manage product technologies" ON product_technologies;
DROP POLICY IF EXISTS "Admins can manage product images" ON product_images;
DROP POLICY IF EXISTS "Admins can view inventory logs" ON inventory_logs;
DROP POLICY IF EXISTS "Admins can insert inventory logs" ON inventory_logs;
-- ============================================
-- 2. CRIAR NOVAS POLÍTICAS (sem recursão)
-- ============================================

-- 2.1 Products - Admins podem fazer tudo (usando service role)
-- Nota: Operações admin devem usar supabaseAdmin (service role) no backend
-- Não precisamos de políticas RLS para admin, pois service role bypassa RLS

-- 2.2 Technologies - Admins podem fazer tudo (usando service role)
CREATE POLICY "Service role can manage technologies"
  ON technologies FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
-- 2.3 Product Technologies - Admins podem fazer tudo (usando service role)
CREATE POLICY "Service role can manage product technologies"
  ON product_technologies FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
-- 2.4 Product Images - Admins podem fazer tudo (usando service role)
CREATE POLICY "Service role can manage product images"
  ON product_images FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
-- 2.5 Inventory Logs - Admins podem fazer tudo (usando service role)
CREATE POLICY "Service role can view inventory logs"
  ON inventory_logs FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role can insert inventory logs"
  ON inventory_logs FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
COMMIT;
-- ============================================
-- NOTAS
-- ============================================
-- As operações administrativas devem usar supabaseAdmin (service role key)
-- no backend, que bypassa RLS automaticamente.
-- 
-- As políticas públicas (Anyone can view) permanecem ativas para
-- consultas sem autenticação.;
