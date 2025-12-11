#!/usr/bin/env python3
"""
Debug: Por que os produtos não estão carregando?
"""

from supabase import create_client, Client

# Chaves
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MVk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    print("🔍 DEBUGANDO CARREGAMENTO DE PRODUTOS")
    print("=" * 45)
    
    # Teste 1: Com Service Role Key
    print("\n1. Testando com Service Role Key...")
    try:
        service_supabase = create_client(SUPABASE_URL, SERVICE_KEY)
        result = service_supabase.table('products').select('*').execute()
        
        if result.data:
            print(f"✅ Service Role: {len(result.data)} produtos encontrados")
            for p in result.data[:2]:  # Mostrar apenas 2
                print(f"   - {p['name']} (ID: {p['id']})")
                print(f"     Campos: {list(p.keys())}")
        else:
            print("❌ Service Role: Nenhum produto encontrado")
            
    except Exception as e:
        print(f"❌ Service Role erro: {e}")
    
    # Teste 2: Com Anon Key (mesma que o frontend usa)
    print("\n2. Testando com Anon Key (frontend)...")
    try:
        anon_supabase = create_client(SUPABASE_URL, ANON_KEY)
        
        # Query exata que o frontend faz
        result = anon_supabase.table('products').select('*, product_images(image_url)').is_('deleted_at', None).order('created_at', desc=True).execute()
        
        if result.data:
            print(f"✅ Anon Key: {len(result.data)} produtos encontrados")
            for p in result.data[:2]:
                print(f"   - {p['name']} (ID: {p['id']})")
        else:
            print("❌ Anon Key: Nenhum produto encontrado")
            
    except Exception as e:
        print(f"❌ Anon Key erro: {e}")
        
        # Teste simplificado
        print("\n   Tentando query simplificada...")
        try:
            simple_result = anon_supabase.table('products').select('*').execute()
            if simple_result.data:
                print(f"✅ Query simples: {len(simple_result.data)} produtos")
            else:
                print("❌ Query simples: Nenhum produto")
        except Exception as e2:
            print(f"❌ Query simples erro: {e2}")
    
    # Teste 3: Verificar se coluna product_type existe
    print("\n3. Verificando coluna product_type...")
    try:
        service_supabase = create_client(SUPABASE_URL, SERVICE_KEY)
        
        # Tentar inserir com product_type
        test_product = {
            "name": "Teste Product Type Debug",
            "sku": "TEST-DEBUG-001",
            "price_cents": 100000,
            "width_cm": 100,
            "length_cm": 200,
            "height_cm": 30,
            "is_active": True,
            "product_type": "mattress"
        }
        
        result = service_supabase.table('products').insert(test_product).execute()
        print("✅ Coluna product_type existe!")
        
        # Limpar
        service_supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
        
    except Exception as e:
        if "Could not find" in str(e) and "product_type" in str(e):
            print("❌ Coluna product_type NÃO EXISTE!")
            print("   Precisa executar: ALTER TABLE products ADD COLUMN product_type VARCHAR(50) DEFAULT 'mattress';")
        else:
            print(f"❌ Erro inesperado: {e}")
    
    # Teste 4: Verificar RLS
    print("\n4. Verificando RLS...")
    try:
        anon_supabase = create_client(SUPABASE_URL, ANON_KEY)
        
        # Tentar inserir com anon key
        test_insert = {
            "name": "Teste RLS Debug",
            "sku": "TEST-RLS-DEBUG",
            "price_cents": 100000,
            "width_cm": 100,
            "length_cm": 200,
            "height_cm": 30,
            "is_active": True
        }
        
        result = anon_supabase.table('products').insert(test_insert).execute()
        print("✅ RLS permite inserção")
        
        # Limpar
        service_supabase = create_client(SUPABASE_URL, SERVICE_KEY)
        service_supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
        
    except Exception as e:
        if "row-level security policy" in str(e):
            print("❌ RLS está bloqueando inserções")
        else:
            print(f"❌ Outro erro RLS: {e}")

if __name__ == "__main__":
    main()