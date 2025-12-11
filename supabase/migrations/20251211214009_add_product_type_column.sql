-- Adicionar coluna product_type na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'mattress';

-- Atualizar produtos existentes sem product_type
UPDATE products SET product_type = 'mattress' WHERE product_type IS NULL;

-- Desabilitar RLS no storage para permitir upload de imagens
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;