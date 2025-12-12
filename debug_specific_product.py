#!/usr/bin/env python3
"""
Debug específico para o produto Queen que está dando 404
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def debug_queen_product():
    """Debug específico para o produto Queen"""
    
    # Configurar Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não encontradas")
        return False
    
    supabase: Client = create_client(url, key)
    
    print("🔍 DEBUG: PRODUTO QUEEN ESPECÍFICO")
    print("=" * 50)
    
    try:
        # 1. Buscar produto Queen especificamente
        print("1️⃣ Buscando produto Queen...")
        
        queen_by_name = supabase.table('products').select('*').ilike('name', '%queen%').execute()
        print(f"   Busca por nome 'queen': {len(queen_by_name.data) if queen_by_name.data else 0} resultados")
        
        if queen_by_name.data:
            queen = queen_by_name.data[0]
            print(f"   ✅ Encontrado: {queen['name']}")
            print(f"   📋 ID: {queen['id']}")
            print(f"   🔗 Slug: '{queen['slug']}'")
            print(f"   ✅ Ativo: {queen['is_active']}")
            print(f"   📅 Criado: {queen.get('created_at', 'N/A')}")
        
        # 2. Buscar por slug específico
        print(f"\n2️⃣ Buscando por slug 'slim-quality-queen'...")
        
        queen_by_slug = supabase.table('products').select('*').eq('slug', 'slim-quality-queen').execute()
        print(f"   Busca por slug: {len(queen_by_slug.data) if queen_by_slug.data else 0} resultados")
        
        if queen_by_slug.data:
            print(f"   ✅ Produto encontrado por slug!")
        else:
            print(f"   ❌ Produto NÃO encontrado por slug!")
        
        # 3. Listar TODOS os slugs disponíveis
        print(f"\n3️⃣ Todos os slugs disponíveis no banco:")
        
        all_products = supabase.table('products').select('name, slug, is_active').eq('is_active', True).execute()
        
        if all_products.data:
            for p in all_products.data:
                print(f"   📦 {p['name']} → '{p['slug']}'")
        
        # 4. Testar query exata que o frontend faz
        print(f"\n4️⃣ Testando query exata do frontend...")
        
        frontend_query = supabase.table('products').select('''
            *,
            product_images(image_url)
        ''').eq('is_active', True).is_('deleted_at', None).order('display_order').execute()
        
        print(f"   Query frontend retornou: {len(frontend_query.data) if frontend_query.data else 0} produtos")
        
        # Simular busca por slug como o frontend faz
        target_slug = "slim-quality-queen"
        found_product = None
        
        for product in frontend_query.data:
            if product['slug'] == target_slug:
                found_product = product
                break
        
        if found_product:
            print(f"   ✅ Produto Queen encontrado na simulação frontend!")
            print(f"   📦 Nome: {found_product['name']}")
            print(f"   💰 Preço: R$ {found_product['price_cents']/100:.2f}")
            print(f"   📏 Dimensões: {found_product['width_cm']}x{found_product['length_cm']}x{found_product['height_cm']}cm")
        else:
            print(f"   ❌ Produto Queen NÃO encontrado na simulação frontend!")
            print(f"   🔍 Slugs disponíveis na query:")
            for p in frontend_query.data:
                print(f"      - '{p['slug']}'")
        
        # 5. Verificar se há problema de case sensitivity
        print(f"\n5️⃣ Testando case sensitivity...")
        
        test_slugs = [
            "slim-quality-queen",
            "Slim-Quality-Queen", 
            "SLIM-QUALITY-QUEEN",
            "slim-quality-Queen"
        ]
        
        for test_slug in test_slugs:
            result = supabase.table('products').select('name').eq('slug', test_slug).execute()
            status = "✅ ENCONTRADO" if result.data else "❌ NÃO ENCONTRADO"
            print(f"   '{test_slug}' → {status}")
        
        print(f"\n" + "=" * 50)
        print("🎯 DIAGNÓSTICO COMPLETO!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO NO DEBUG: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    debug_queen_product()