#!/usr/bin/env python3
"""
Corrigir políticas RLS do Storage para permitir upload de imagens
"""

from supabase import create_client, Client

# Service Role Key
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    print("🔧 CORRIGINDO POLÍTICAS RLS DO STORAGE")
    print("=" * 45)
    
    try:
        supabase = create_client(SUPABASE_URL, SERVICE_KEY)
        
        print("\n1. Verificando bucket product-images...")
        
        # Verificar se bucket existe
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        if 'product-images' in bucket_names:
            print("✅ Bucket 'product-images' existe")
        else:
            print("❌ Bucket 'product-images' não existe")
            print("   Criando bucket...")
            
            # Criar bucket público
            result = supabase.storage.create_bucket('product-images', {'public': True})
            print("✅ Bucket criado")
        
        print(f"\n📋 EXECUTE ESTE SQL NO DASHBOARD DO SUPABASE:")
        print(f"   URL: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/sql/new")
        
        sql_script = """
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
"""
        
        print(f"\n{sql_script}")
        
        # Salvar script em arquivo
        with open('fix_storage_rls.sql', 'w') as f:
            f.write(sql_script)
        
        print(f"\n💾 Script salvo em: fix_storage_rls.sql")
        
        print(f"\n🎯 APÓS EXECUTAR O SQL:")
        print(f"   1. Upload de imagens deve funcionar")
        print(f"   2. Imagens devem ser acessíveis publicamente")
        print(f"   3. Não haverá mais erro 400 no storage")
        
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    main()