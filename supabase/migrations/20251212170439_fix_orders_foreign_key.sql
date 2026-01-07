-- Migration: Fix orders foreign key to point to customers
-- Created: 2025-12-12
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela orders existe
--   ✅ Tabela customers existe  
--   ❌ FK atual aponta para 'users' (não existe)
--   ✅ Precisa apontar para 'customers'
-- ============================================

-- UP Migration
BEGIN;
-- 1. Remover constraint existente (se existir)
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
-- 2. Adicionar nova constraint apontando para customers
ALTER TABLE orders 
ADD CONSTRAINT orders_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) 
ON DELETE CASCADE;
COMMIT;
-- DOWN Migration (para rollback)
-- BEGIN;
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
-- ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id);
-- COMMIT;
