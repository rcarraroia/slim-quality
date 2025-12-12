#!/usr/bin/env python3
"""
Corrigir slug do produto Padrão
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def fix_padrao_slug():
    """Corrige o slug do produto Padrão"""
    
    # Configurar Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não encontradas")
        return False
    
    supabase: Client = create_client(url, key)
    
    print("🔧 CORRIGINDO SLUG DO PRODUTO PADRÃO")
    print("=" * 50)
    
    try:
        # Buscar produto Padrão
        product = supabase.table('products').select('*').ilike('name', '%padrão%').execute()
        
        if not product.data:
            print("❌ Produto Padrão não encontrado")
            return False
        
        product_data = product.data[0]
        print(f"📦 Produto encontrado: {product_data['name']}")
        print(f"   Slug atual: {product_data['slug']}")
        
        # Corrigir slug
        new_slug = "slim-quality-padrao"
        
        result = supabase.table('products').update({
            'slug': new_slug
        }).eq('id', product_data['id']).execute()
        
        if result.data:
            print(f"✅ Slug corrigido para: {new_slug}")
            
            # Verificar resultado
            updated = supabase.table('products').select('name, slug').eq('id', product_data['id']).execute()
            if updated.data:
                print(f"   Confirmado: {updated.data[0]['name']} → /{updated.data[0]['slug']}")
        else:
            print("❌ Erro ao atualizar slug")
            return False
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    fix_padrao_slug()