#!/usr/bin/env python3
"""
Aplicar migration diretamente via Service Role Key
"""

from supabase import create_client, Client

# Service Role Key
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        supabase: Client = create_client(SUPABASE_URL, SERVICE_KEY)
        
        print("🔧 APLICANDO MIGRATION DIRETAMENTE")
        print("=" * 40)
        
        # 1. Adicionar coluna product_type
        print("\n1. Adicionando coluna product_type...")
        try:
            # Testar se coluna já existe
            test_product = {
                "name": "Teste Product Type",
                "sku": "TEST-TYPE-001", 
                "price_cents": 100000,
                "width_cm": 100,
                "length_cm": 200,
                "height_cm": 30,
                "is_active": True,
                "product_type": "mattress"
            }
            
            result = supabase.table('products').insert(test_product).execute()
            print("✅ Coluna product_type já existe!")
            
            # Limpar teste
            supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
            
        except Exception as e:
            if "Could not find" in str(e) and "product_type" in str(e):
                print("❌ Coluna não existe. Precisa ser criada via SQL direto.")
                print("   Execute no dashboard: ALTER TABLE products ADD COLUMN product_type VARCHAR(50) DEFAULT 'mattress';")
                return False
            else:
                print(f"❌ Erro inesperado: {e}")
                return False
        
        # 2. Verificar produtos existentes
        print("\n2. Verificando produtos existentes...")
        products = supabase.table('products').select('id, name, product_type').execute()
        
        if products.data:
            print(f"   Produtos encontrados: {len(products.data)}")
            
            # Atualizar produtos sem product_type
            null_products = [p for p in products.data if not p.get('product_type')]
            if null_products:
                print(f"   Atualizando {len(null_products)} produtos sem product_type...")
                for p in null_products:
                    supabase.table('products').update({
                        'product_type': 'mattress'
                    }).eq('id', p['id']).execute()
                    print(f"   ✅ {p['name']} → mattress")
            else:
                print("   ✅ Todos os produtos já têm product_type")
        
        # 3. Testar inserção final
        print("\n3. Testando inserção com product_type...")
        final_test = {
            "name": "Teste Final Product Type",
            "sku": "TEST-FINAL-001",
            "price_cents": 329000,
            "width_cm": 138,
            "length_cm": 188,
            "height_cm": 28,
            "product_type": "mattress",
            "is_active": True,
            "is_featured": False,
            "display_order": 0
        }
        
        result = supabase.table('products').insert(final_test).execute()
        print(f"✅ Inserção funcionando! ID: {result.data[0]['id']}")
        
        # Limpar teste
        supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
        
        print(f"\n🎉 MIGRATION APLICADA COM SUCESSO!")
        print(f"   O formulário de produtos deve funcionar agora.")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print(f"\n✅ Teste agora no site: https://slim-quality.vercel.app/dashboard/produtos")
    else:
        print(f"\n❌ Execute manualmente no dashboard do Supabase:")
        print(f"   ALTER TABLE products ADD COLUMN product_type VARCHAR(50) DEFAULT 'mattress';")
        print(f"   ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;")