#!/usr/bin/env python3
"""
Criar tabela product_images que está faltando
"""

from supabase import create_client, Client

# Service Role Key
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        supabase = create_client(SUPABASE_URL, SERVICE_KEY)
        
        print("🔧 CRIANDO TABELA PRODUCT_IMAGES")
        print("=" * 35)
        
        # Verificar se tabela já existe
        print("\n1. Verificando se tabela product_images existe...")
        try:
            result = supabase.table('product_images').select('id').limit(1).execute()
            print("✅ Tabela product_images já existe!")
            
            if result.data:
                print(f"   Encontradas {len(result.data)} imagens")
            else:
                print("   Tabela vazia")
                
        except Exception as e:
            if "does not exist" in str(e) or "relation" in str(e):
                print("❌ Tabela product_images NÃO EXISTE!")
                print("   Precisa ser criada via SQL no dashboard")
                
                print(f"\n📋 EXECUTE ESTE SQL NO DASHBOARD:")
                print(f"   https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/sql/new")
                print(f"")
                sql = """
-- Criar tabela product_images
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(display_order);

-- Desabilitar RLS temporariamente
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
                """
                print(sql)
                
            else:
                print(f"❌ Outro erro: {e}")
        
        # Verificar produtos sem imagens
        print(f"\n2. Verificando produtos sem imagens...")
        try:
            products = supabase.table('products').select('id, name').execute()
            
            if products.data:
                print(f"   Produtos encontrados: {len(products.data)}")
                
                # Verificar quais têm imagens
                for product in products.data[:3]:  # Apenas primeiros 3
                    try:
                        images = supabase.table('product_images').select('id').eq('product_id', product['id']).execute()
                        img_count = len(images.data) if images.data else 0
                        print(f"   - {product['name']}: {img_count} imagens")
                    except:
                        print(f"   - {product['name']}: Erro ao verificar imagens")
            
        except Exception as e:
            print(f"❌ Erro ao verificar produtos: {e}")
            
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()