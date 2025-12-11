#!/usr/bin/env python3
"""
Script para verificar RLS e estrutura da tabela products
"""

import os
from supabase import create_client, Client

# Usando Service Role Key para bypass RLS
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        # Conectar com Service Role (bypass RLS)
        supabase: Client = create_client(SUPABASE_URL, SERVICE_KEY)
        
        print("🔍 VERIFICANDO TABELA PRODUCTS COM SERVICE ROLE")
        print("=" * 55)
        
        # 1. Verificar se existem produtos
        print("\n1. Buscando produtos existentes...")
        try:
            result = supabase.table('products').select('*').limit(5).execute()
            if result.data:
                print(f"✅ Encontrados {len(result.data)} produtos:")
                for i, product in enumerate(result.data):
                    print(f"\n   Produto {i+1}:")
                    for key, value in product.items():
                        print(f"     {key}: {value}")
                        
                print(f"\n📋 CAMPOS DISPONÍVEIS NA TABELA:")
                if result.data:
                    fields = list(result.data[0].keys())
                    for field in sorted(fields):
                        print(f"   ✓ {field}")
            else:
                print("⚠️ Nenhum produto encontrado")
                
        except Exception as e:
            print(f"❌ Erro ao buscar produtos: {e}")
        
        # 2. Testar inserção com Service Role
        print("\n2. Testando inserção com Service Role...")
        test_product = {
            "name": "Produto Teste RLS",
            "price_cents": 329000,
            "width_cm": 138,
            "length_cm": 188,
            "height_cm": 28,
            "is_active": True,
            "description": "Teste de inserção"
        }
        
        try:
            result = supabase.table('products').insert(test_product).execute()
            print("✅ Inserção com Service Role bem-sucedida!")
            print(f"   ID criado: {result.data[0]['id']}")
            
            # Deletar o produto de teste
            supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
            print("   (Produto de teste removido)")
            
        except Exception as e:
            print(f"❌ Erro na inserção com Service Role: {e}")
        
        # 3. Verificar estrutura via SQL direto
        print("\n3. Consultando estrutura via SQL...")
        try:
            # Query para ver colunas da tabela
            sql_query = """
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
            """
            
            result = supabase.rpc('exec_sql', {'sql': sql_query}).execute()
            if result.data:
                print("✅ Estrutura da tabela products:")
                for col in result.data:
                    nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                    default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                    print(f"   {col['column_name']}: {col['data_type']} {nullable}{default}")
            
        except Exception as e:
            print(f"❌ Erro ao consultar estrutura: {e}")
            
        # 4. Verificar políticas RLS
        print("\n4. Verificando políticas RLS...")
        try:
            rls_query = """
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies 
            WHERE tablename = 'products';
            """
            
            result = supabase.rpc('exec_sql', {'sql': rls_query}).execute()
            if result.data:
                print("✅ Políticas RLS encontradas:")
                for policy in result.data:
                    print(f"   - {policy['policyname']}: {policy['cmd']} para {policy['roles']}")
                    if policy['qual']:
                        print(f"     Condição: {policy['qual']}")
            else:
                print("⚠️ Nenhuma política RLS encontrada")
                
        except Exception as e:
            print(f"❌ Erro ao verificar RLS: {e}")
            
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()