-- CORREÇÃO DE FOREIGN KEY: orders.customer_id
-- Data: 12/12/2025
-- Objetivo: Fazer orders.customer_id apontar para customers.id

-- 1. Remover constraint existente (se existir)
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

-- 2. Adicionar nova constraint apontando para customers
ALTER TABLE orders 
ADD CONSTRAINT orders_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) 
ON DELETE CASCADE;

-- 3. Verificar constraint criada
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'orders'
    AND kcu.column_name = 'customer_id';