#!/usr/bin/env python3
"""
Debug do erro 500 na query de produtos
"""

from supabase import create_client, Client

# Credenciais corretas
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MVk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def main():
    print("🔍 DEBUGANDO ERRO 500 NA QUERY DE PRODUTOS")
    print("=" * 45)
    
    supabase = create_client(SUPABASE_URL, ANON_KEY)
    
    # Teste 1: Query mais simples possível
    print("\n1. Testando query simples...")
    try:
        result = supabase.table('products').select('id').limit(1).execute()
        print(f"✅ Query simples OK: {len(result.data)} produtos")
    except Exception as e:
        print(f"❌ Query simples falhou: {e}")
        return
    
    # Teste 2: Adicionar campos um por um
    print("\n2. Testando campos individuais...")
    
    campos_teste = [
        'id, name',
        'id, name, sku', 
        'id, name, sku, price_cents',
        'id, name, sku, price_cents, width_cm, length_cm, height_cm',
        'id, name, sku, price_cents, width_cm, length_cm, height_cm, is_active',
        '*'
    ]
    
    for campos in campos_teste:
        try:
            result = supabase.table('products').select(campos).limit(1).execute()
            print(f"✅ Campos OK: {campos}")
        except Exception as e:
            print(f"❌ Erro em '{campos}': {e}")
            break
    
    # Teste 3: Testar join com product_images
    print("\n3. Testando join com product_images...")
    try:
        result = supabase.table('products').select('id, name, product_images(image_url)').limit(1).execute()
        print(f"✅ Join com product_images OK")
    except Exception as e:
        print(f"❌ Erro no join: {e}")
        
        # Verificar se tabela product_images existe
        print("\n   Verificando se tabela product_images existe...")
        try:
            result = supabase.table('product_images').select('id').limit(1).execute()
            print(f"✅ Tabela product_images existe")
        except Exception as e2:
            print(f"❌ Tabela product_images não existe: {e2}")
    
    # Teste 4: Testar filtros
    print("\n4. Testando filtros...")
    try:
        result = supabase.table('products').select('*').is_('deleted_at', None).limit(1).execute()
        print(f"✅ Filtro deleted_at OK")
    except Exception as e:
        print(f"❌ Erro no filtro: {e}")
    
    # Teste 5: Testar ordenação
    print("\n5. Testando ordenação...")
    try:
        result = supabase.table('products').select('*').order('created_at', desc=True).limit(1).execute()
        print(f"✅ Ordenação OK")
    except Exception as e:
        print(f"❌ Erro na ordenação: {e}")
    
    # Teste 6: Query exata do frontend
    print("\n6. Testando query exata do frontend...")
    try:
        # Esta é a query que está falhando
        result = supabase.table('products').select('*, product_images(image_url)').is_('deleted_at', None).order('created_at', desc=True).execute()
        print(f"✅ Query completa OK: {len(result.data)} produtos")
    except Exception as e:
        print(f"❌ Query completa falhou: {e}")
        
        # Tentar sem o join
        print("\n   Tentando sem join...")
        try:
            result = supabase.table('products').select('*').is_('deleted_at', None).order('created_at', desc=True).execute()
            print(f"✅ Sem join OK: {len(result.data)} produtos")
        except Exception as e2:
            print(f"❌ Ainda falha sem join: {e2}")

if __name__ == "__main__":
    main()