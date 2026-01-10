-- Migration: Corrigir Foreign Keys de Afiliados em Orders
-- Created: 2026-01-11
-- Author: Kiro AI
-- Issue: FK constraint aponta para auth.users ao invés de affiliates

-- ============================================
-- PROBLEMA IDENTIFICADO
-- ============================================
-- Constraints de orders apontam para auth.users(id)
-- Mas o código passa affiliates.id
-- Erro: "violates foreign key constraint orders_affiliate_n1_id_fkey"

-- ============================================
-- CORREÇÃO
-- ============================================

BEGIN;

-- 1. Remover constraints antigas (apontam para auth.users)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_affiliate_n1_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_affiliate_n2_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_affiliate_n3_id_fkey;

-- 2. Criar constraints corretas (apontam para affiliates)
ALTER TABLE orders
  ADD CONSTRAINT orders_affiliate_n1_id_fkey
  FOREIGN KEY (affiliate_n1_id)
  REFERENCES affiliates(id)
  ON DELETE SET NULL;

ALTER TABLE orders
  ADD CONSTRAINT orders_affiliate_n2_id_fkey
  FOREIGN KEY (affiliate_n2_id)
  REFERENCES affiliates(id)
  ON DELETE SET NULL;

ALTER TABLE orders
  ADD CONSTRAINT orders_affiliate_n3_id_fkey
  FOREIGN KEY (affiliate_n3_id)
  REFERENCES affiliates(id)
  ON DELETE SET NULL;

COMMIT;

-- ============================================
-- VALIDAÇÕES
-- ============================================

-- Verificar constraints criadas
DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM pg_constraint
  WHERE conrelid = 'orders'::regclass
    AND conname LIKE 'orders_affiliate_%_fkey'
    AND pg_get_constraintdef(oid) LIKE '%REFERENCES affiliates(id)%';
  
  IF fk_count != 3 THEN
    RAISE EXCEPTION 'Constraints de afiliados não foram criadas corretamente';
  END IF;
  
  RAISE NOTICE '✅ 3 constraints de afiliados corrigidas';
END $$;
