#!/usr/bin/env python3
"""
Teste rápido para verificar se a inserção funciona após desabilitar RLS
"""

from supabase import create_client, Client

# Chave anônima (mesma que o frontend usa)
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MVk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def main():
    try:
        supabase: Client = create_client(SUPABASE_URL, ANON_KEY)
        
        print("🧪 TESTANDO INSERÇÃO COM CHAVE ANÔNIMA")
        print("=" * 40)
        
        # Produto de teste
        test_product = {
            "name": "Teste Inserção Frontend",
            "sku": "TEST-FRONTEND-001",
            "description": "Produto de teste para verificar se inserção funciona",
            "price_cents": 329000,
            "width_cm": 138,
            "length_cm": 188,
            "height_cm": 28,
            "weight_kg": 25.0,
            "is_active": True,
            "is_featured": False,
            "display_order": 0
        }
        
        # Tentar inserir
        result = supabase.table('products').insert(test_product).execute()
        
        if result.data:
            product_id = result.data[0]['id']
            print(f"✅ SUCESSO! Produto criado com ID: {product_id}")
            print(f"   Nome: {result.data[0]['name']}")
            print(f"   SKU: {result.data[0]['sku']}")
            print(f"   Preço: R$ {result.data[0]['price_cents']/100:.2f}")
            
            # Limpar teste
            supabase.table('products').delete().eq('id', product_id).execute()
            print(f"   (Produto de teste removido)")
            
            print(f"\n🎉 FRONTEND DEVE FUNCIONAR AGORA!")
            print(f"   Acesse: https://slim-quality.vercel.app/dashboard/produtos")
            print(f"   E tente criar um novo produto.")
            
        else:
            print("❌ Falha na inserção - sem dados retornados")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        print(f"\n💡 Se ainda há erro, pode ser necessário aguardar alguns minutos")
        print(f"   para o cache do Supabase atualizar.")

if __name__ == "__main__":
    main()