#!/usr/bin/env python3
"""
Verificar e corrigir slugs dos produtos no banco
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def check_and_fix_slugs():
    """Verifica e corrige slugs dos produtos"""
    
    # Configurar Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não encontradas")
        return False
    
    supabase: Client = create_client(url, key)
    
    print("🔍 VERIFICANDO SLUGS DOS PRODUTOS")
    print("=" * 50)
    
    try:
        # Buscar todos os produtos
        products = supabase.table('products').select('id, name, slug').eq('is_active', True).execute()
        
        if not products.data:
            print("❌ Nenhum produto encontrado")
            return False
        
        print(f"📦 Encontrados {len(products.data)} produtos:")
        
        updates_needed = []
        
        for product in products.data:
            print(f"\n🔸 Produto: {product['name']}")
            print(f"   ID: {product['id']}")
            print(f"   Slug atual: {product.get('slug', 'NULL')}")
            
            # Gerar slug se não existir
            if not product.get('slug'):
                # Gerar slug baseado no nome
                slug = product['name'].lower()
                slug = slug.replace('slim quality ', '')  # Remover prefixo
                slug = slug.replace(' ', '-')  # Espaços para hífens
                slug = slug.replace('ã', 'a').replace('õ', 'o')  # Acentos
                
                print(f"   Slug sugerido: {slug}")
                updates_needed.append({
                    'id': product['id'],
                    'slug': slug
                })
            else:
                print(f"   ✅ Slug já existe")
        
        if updates_needed:
            print(f"\n🔧 Atualizando {len(updates_needed)} produtos...")
            
            for update in updates_needed:
                result = supabase.table('products').update({
                    'slug': update['slug']
                }).eq('id', update['id']).execute()
                
                if result.data:
                    print(f"   ✅ Produto {update['id']} atualizado com slug: {update['slug']}")
                else:
                    print(f"   ❌ Erro ao atualizar produto {update['id']}")
        
        # Verificar resultado final
        print(f"\n📋 RESULTADO FINAL:")
        final_products = supabase.table('products').select('id, name, slug').eq('is_active', True).execute()
        
        for product in final_products.data:
            print(f"   📦 {product['name']} → /{product.get('slug', 'SEM-SLUG')}")
        
        print(f"\n✅ Verificação concluída!")
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    check_and_fix_slugs()