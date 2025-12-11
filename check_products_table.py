#!/usr/bin/env python3
"""
Script para verificar a estrutura real da tabela products no Supabase
"""

import os
from supabase import create_client, Client

# Configurações do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def main():
    try:
        # Conectar ao Supabase
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print("🔍 VERIFICANDO ESTRUTURA DA TABELA PRODUCTS")
        print("=" * 50)
        
        # Tentar fazer uma query simples para ver os campos
        print("\n1. Tentando SELECT * LIMIT 1...")
        try:
            result = supabase.table('products').select('*').limit(1).execute()
            if result.data:
                print("✅ Sucesso! Campos encontrados:")
                for key in result.data[0].keys():
                    print(f"   - {key}")
            else:
                print("⚠️ Tabela vazia, mas existe")
        except Exception as e:
            print(f"❌ Erro: {e}")
        
        # Tentar inserir um produto de teste para ver qual campo está faltando
        print("\n2. Testando inserção com dados mínimos...")
        test_product = {
            "name": "Teste Produto",
            "price_cents": 329000,
            "width_cm": 138,
            "length_cm": 188,
            "height_cm": 28,
            "is_active": True
        }
        
        try:
            result = supabase.table('products').insert(test_product).execute()
            print("✅ Inserção bem-sucedida!")
            print(f"   ID criado: {result.data[0]['id']}")
            
            # Deletar o produto de teste
            supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
            print("   (Produto de teste removido)")
            
        except Exception as e:
            print(f"❌ Erro na inserção: {e}")
            
            # Tentar com campos diferentes
            print("\n3. Testando com outros campos possíveis...")
            
            # Teste 1: Com description
            try:
                test_with_desc = {**test_product, "description": "Teste"}
                result = supabase.table('products').insert(test_with_desc).execute()
                print("✅ Funcionou com description!")
                supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
            except Exception as e2:
                print(f"❌ Com description: {e2}")
            
            # Teste 2: Com product_type
            try:
                test_with_type = {**test_product, "product_type": "mattress"}
                result = supabase.table('products').insert(test_with_type).execute()
                print("✅ Funcionou com product_type!")
                supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
            except Exception as e2:
                print(f"❌ Com product_type: {e2}")
                
            # Teste 3: Com sku
            try:
                test_with_sku = {**test_product, "sku": "TEST-001"}
                result = supabase.table('products').insert(test_with_sku).execute()
                print("✅ Funcionou com sku!")
                supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
            except Exception as e2:
                print(f"❌ Com sku: {e2}")
        
        print("\n4. Verificando produtos existentes...")
        try:
            existing = supabase.table('products').select('*').limit(3).execute()
            if existing.data:
                print(f"✅ Encontrados {len(existing.data)} produtos:")
                for product in existing.data:
                    print(f"   - {product.get('name', 'Sem nome')} (ID: {product.get('id', 'N/A')})")
                    print(f"     Campos: {list(product.keys())}")
            else:
                print("⚠️ Nenhum produto encontrado")
        except Exception as e:
            print(f"❌ Erro ao buscar produtos: {e}")
            
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()