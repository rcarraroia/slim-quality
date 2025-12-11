#!/usr/bin/env python3
"""
Script para adicionar coluna product_type na tabela products
"""

from supabase import create_client, Client

# Service Role Key
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        supabase: Client = create_client(SUPABASE_URL, SERVICE_KEY)
        
        print("🔧 ADICIONANDO COLUNA PRODUCT_TYPE")
        print("=" * 35)
        
        # Primeiro, vamos verificar se a coluna já existe
        print("\n1. Verificando se coluna product_type já existe...")
        
        # Tentar inserir um produto com product_type para testar
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
        
        try:
            result = supabase.table('products').insert(test_product).execute()
            print("✅ Coluna product_type já existe!")
            
            # Limpar teste
            supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
            
        except Exception as e:
            if "Could not find" in str(e) and "product_type" in str(e):
                print("❌ Coluna product_type não existe. Vou criar...")
                
                # Vou mostrar o SQL que precisa ser executado
                print(f"\n📋 EXECUTE ESTE SQL NO DASHBOARD:")
                print(f"   https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/sql/new")
                print(f"")
                print(f"   ALTER TABLE products ADD COLUMN product_type VARCHAR(50) DEFAULT 'mattress';")
                print(f"   UPDATE products SET product_type = 'mattress' WHERE product_type IS NULL;")
                print(f"")
                
                return
            else:
                print(f"❌ Outro erro: {e}")
                return
        
        # Se chegou aqui, a coluna existe. Vamos verificar os valores
        print("\n2. Verificando produtos existentes...")
        products = supabase.table('products').select('id, name, product_type').execute()
        
        if products.data:
            print(f"   Produtos encontrados:")
            for p in products.data:
                product_type = p.get('product_type', 'NULL')
                print(f"   - {p['name']}: {product_type}")
                
            # Atualizar produtos sem product_type
            null_products = [p for p in products.data if not p.get('product_type')]
            if null_products:
                print(f"\n3. Atualizando {len(null_products)} produtos sem product_type...")
                for p in null_products:
                    supabase.table('products').update({
                        'product_type': 'mattress'  # Padrão para colchão
                    }).eq('id', p['id']).execute()
                    print(f"   ✅ {p['name']} → mattress")
        
        print(f"\n✅ Coluna product_type configurada!")
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()