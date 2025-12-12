
-- CORREÇÃO DE POLÍTICAS RLS DO STORAGE
-- Execute este SQL no dashboard do Supabase

-- 1. Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;

-- 2. Criar políticas simples e permissivas para product-images

-- Política para permitir qualquer pessoa fazer upload
CREATE POLICY "Allow all uploads to product-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-images');

-- Política para permitir qualquer pessoa ler arquivos
CREATE POLICY "Allow all access to product-images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Política para permitir qualquer pessoa deletar arquivos
CREATE POLICY "Allow all deletes from product-images" ON storage.objects
FOR DELETE USING (bucket_id = 'product-images');

-- Política para permitir qualquer pessoa atualizar arquivos
CREATE POLICY "Allow all updates to product-images" ON storage.objects
FOR UPDATE USING (bucket_id = 'product-images');

-- 3. Garantir que o bucket seja público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'product-images';
