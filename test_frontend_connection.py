#!/usr/bin/env python3
"""
Testar conexão exatamente como o frontend faz
"""

from supabase import create_client, Client

# Chaves exatas do .env
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MVk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def main():
    print("🔍 TESTANDO CONEXÃO FRONTEND")
    print("=" * 35)
    
    try:
        supabase = create_client(SUPABASE_URL, ANON_KEY)
        
        # Query exata que o frontend faz
        print("\n1. Testando query exata do frontend...")
        result = supabase.table('products').select('*, product_images(image_url)').is_('deleted_at', None).order('created_at', desc=True).execute()
        
        if result.data:
            print(f"✅ Frontend query funcionando! {len(result.data)} produtos encontrados")
            for p in result.data[:2]:
                print(f"   - {p['name']} (ID: {p['id']})")
                if p.get('product_images'):
                    print(f"     Imagens: {len(p['product_images'])}")
        else:
            print("⚠️ Query funcionou mas nenhum produto encontrado")
            
    except Exception as e:
        print(f"❌ Erro na query do frontend: {e}")
        
        # Teste mais simples
        print("\n2. Testando query simples...")
        try:
            simple_result = supabase.table('products').select('id, name').execute()
            if simple_result.data:
                print(f"✅ Query simples funcionou: {len(simple_result.data)} produtos")
            else:
                print("⚠️ Query simples sem resultados")
        except Exception as e2:
            print(f"❌ Query simples falhou: {e2}")
    
    # Teste de inserção
    print("\n3. Testando inserção com anon key...")
    try:
        test_product = {
            "name": "Teste Frontend Anon",
            "sku": "TEST-ANON-001",
            "price_cents": 100000,
            "width_cm": 100,
            "length_cm": 200,
            "height_cm": 30,
            "is_active": True,
            "product_type": "mattress"
        }
        
        result = supabase.table('products').insert(test_product).execute()
        
        if result.data:
            print("✅ Inserção com anon key funcionando!")
            
            # Limpar
            service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
            service_supabase = create_client(SUPABASE_URL, service_key)
            service_supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
            print("✅ Produto de teste removido")
        else:
            print("❌ Inserção com anon key falhou")
            
    except Exception as e:
        if "row-level security policy" in str(e):
            print("❌ RLS está bloqueando inserção com anon key")
        else:
            print(f"❌ Outro erro na inserção: {e}")

if __name__ == "__main__":
    main()