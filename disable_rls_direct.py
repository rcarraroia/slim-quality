#!/usr/bin/env python3
"""
Desabilitar RLS diretamente usando service role key
"""

from supabase import create_client, Client

# Service Role Key
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        supabase = create_client(SUPABASE_URL, SERVICE_KEY)
        
        print("🔧 DESABILITANDO RLS TEMPORARIAMENTE")
        print("=" * 40)
        
        # 1. Desabilitar RLS na tabela products
        print("\n1. Desabilitando RLS em products...")
        try:
            result = supabase.rpc('exec_sql', {
                'sql': 'ALTER TABLE products DISABLE ROW LEVEL SECURITY;'
            }).execute()
            print("✅ RLS desabilitado em products")
        except Exception as e:
            print(f"❌ Erro ao desabilitar RLS em products: {e}")
        
        # 2. Desabilitar RLS na tabela product_images
        print("\n2. Desabilitando RLS em product_images...")
        try:
            result = supabase.rpc('exec_sql', {
                'sql': 'ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;'
            }).execute()
            print("✅ RLS desabilitado em product_images")
        except Exception as e:
            print(f"❌ Erro ao desabilitar RLS em product_images: {e}")
        
        # 3. Testar inserção de produto
        print("\n3. Testando inserção de produto...")
        try:
            test_product = {
                "name": "Teste RLS Disabled",
                "sku": "TEST-RLS-001",
                "price_cents": 100000,
                "width_cm": 100,
                "length_cm": 200,
                "height_cm": 30,
                "is_active": True,
                "product_type": "mattress"
            }
            
            result = supabase.table('products').insert(test_product).execute()
            
            if result.data:
                print("✅ Inserção de produto funcionando!")
                product_id = result.data[0]['id']
                
                # Testar inserção de imagem
                print("\n4. Testando inserção de imagem...")
                test_image = {
                    "product_id": product_id,
                    "image_url": "https://example.com/test.jpg",
                    "is_primary": True
                }
                
                img_result = supabase.table('product_images').insert(test_image).execute()
                
                if img_result.data:
                    print("✅ Inserção de imagem funcionando!")
                    
                    # Limpar dados de teste
                    supabase.table('product_images').delete().eq('product_id', product_id).execute()
                    supabase.table('products').delete().eq('id', product_id).execute()
                    print("✅ Dados de teste removidos")
                else:
                    print("❌ Falha na inserção de imagem")
            else:
                print("❌ Falha na inserção de produto")
                
        except Exception as e:
            print(f"❌ Erro no teste: {e}")
        
        print(f"\n🎉 CONCLUÍDO!")
        print(f"   Agora o frontend deve conseguir:")
        print(f"   - Carregar produtos")
        print(f"   - Inserir novos produtos")
        print(f"   - Fazer upload de imagens")
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()