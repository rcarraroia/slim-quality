#!/usr/bin/env python3
"""
Script para criar produtos de teste usando Service Role
"""

from supabase import create_client, Client

# Service Role Key
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        supabase: Client = create_client(SUPABASE_URL, SERVICE_KEY)
        
        print("🛏️ CRIANDO PRODUTOS DE TESTE")
        print("=" * 30)
        
        # Produtos do catálogo real
        produtos = [
            {
                "name": "Slim Quality Solteiro",
                "description": "Colchão magnético terapêutico solteiro com 8 tecnologias integradas",
                "price_cents": 319000,  # R$ 3.190,00
                "width_cm": 88,
                "length_cm": 188,
                "height_cm": 28,
                "is_active": True
            },
            {
                "name": "Slim Quality Padrão",
                "description": "Colchão magnético terapêutico casal padrão - o mais vendido",
                "price_cents": 329000,  # R$ 3.290,00
                "width_cm": 138,
                "length_cm": 188,
                "height_cm": 28,
                "is_active": True
            },
            {
                "name": "Slim Quality Queen",
                "description": "Colchão magnético terapêutico Queen size para maior conforto",
                "price_cents": 349000,  # R$ 3.490,00
                "width_cm": 158,
                "length_cm": 198,
                "height_cm": 30,
                "is_active": True
            },
            {
                "name": "Slim Quality King",
                "description": "Colchão magnético terapêutico King size - linha premium",
                "price_cents": 489000,  # R$ 4.890,00
                "width_cm": 193,
                "length_cm": 203,
                "height_cm": 30,
                "is_active": True
            }
        ]
        
        # Verificar se já existem produtos
        existing = supabase.table('products').select('id, name').execute()
        if existing.data:
            print(f"⚠️ Já existem {len(existing.data)} produtos:")
            for p in existing.data:
                print(f"   - {p['name']}")
            
            resposta = input("\nDeseja limpar e recriar? (s/N): ")
            if resposta.lower() == 's':
                # Deletar produtos existentes
                for p in existing.data:
                    supabase.table('products').delete().eq('id', p['id']).execute()
                print("✅ Produtos existentes removidos")
            else:
                print("❌ Operação cancelada")
                return
        
        # Criar produtos
        print(f"\n📦 Criando {len(produtos)} produtos...")
        for i, produto in enumerate(produtos, 1):
            try:
                result = supabase.table('products').insert(produto).execute()
                print(f"✅ {i}. {produto['name']} - R$ {produto['price_cents']/100:.2f}")
            except Exception as e:
                print(f"❌ {i}. Erro ao criar {produto['name']}: {e}")
        
        # Verificar resultado final
        print(f"\n📊 Verificando produtos criados...")
        final = supabase.table('products').select('*').execute()
        if final.data:
            print(f"✅ Total de produtos no banco: {len(final.data)}")
            for p in final.data:
                print(f"   - {p['name']}: R$ {p['price_cents']/100:.2f} ({p['width_cm']}x{p['length_cm']}x{p['height_cm']}cm)")
        else:
            print("❌ Nenhum produto encontrado")
            
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()