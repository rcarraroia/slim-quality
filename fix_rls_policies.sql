-- Corrigir políticas RLS para permitir operações do frontend
-- Execute este SQL no dashboard do Supabase

-- 1. Desabilitar RLS temporariamente para products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 2. Desabilitar RLS temporariamente para product_images  
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- 3. Verificar se storage tem políticas corretas
-- Criar política para permitir upload de imagens
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Política para permitir upload de arquivos
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-images');

-- 5. Política para permitir leitura de arquivos
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- 6. Política para permitir delete de arquivos
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'product-images');