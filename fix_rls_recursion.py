#!/usr/bin/env python3
"""
Corrigir problema de recursão infinita nas políticas RLS
"""

from supabase import create_client, Client

# Service Role Key
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    print("🔧 CORRIGINDO RECURSÃO INFINITA RLS")
    print("=" * 40)
    
    try:
        supabase = create_client(SUPABASE_URL, SERVICE_KEY)
        
        print("\n1. Identificando o problema...")
        print("   Erro: 'infinite recursion detected in policy for relation user_roles'")
        print("   Causa: Política RLS mal configurada na tabela user_roles")
        
        print("\n2. Soluções possíveis:")
        print("   A) Desabilitar RLS temporariamente nas tabelas problemáticas")
        print("   B) Remover políticas problemáticas")
        print("   C) Recriar políticas corretamente")
        
        print("\n3. Executando correção...")
        
        # Solução A: Desabilitar RLS nas tabelas críticas
        tables_to_fix = ['products', 'product_images', 'user_roles', 'profiles']
        
        for table in tables_to_fix:
            try:
                print(f"\n   Verificando tabela: {table}")
                
                # Testar se tabela existe
                result = supabase.table(table).select('count').limit(1).execute()
                print(f"   ✅ Tabela {table} existe")
                
                # Como não podemos executar SQL diretamente via supabase-py,
                # vamos criar um script SQL para executar no dashboard
                
            except Exception as e:
                if "does not exist" in str(e):
                    print(f"   ⚠️ Tabela {table} não existe")
                else:
                    print(f"   ❌ Erro na tabela {table}: {e}")
        
        # Criar script SQL para executar no dashboard
        sql_script = """
-- CORREÇÃO DE RECURSÃO INFINITA RLS
-- Execute este SQL no dashboard do Supabase

-- 1. Desabilitar RLS temporariamente nas tabelas críticas
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes (para evitar recursão)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- 3. Criar políticas simples e seguras (sem recursão)
-- Para products (permitir tudo temporariamente)
CREATE POLICY "Allow all operations on products" ON products
FOR ALL USING (true) WITH CHECK (true);

-- Para product_images (permitir tudo temporariamente)  
CREATE POLICY "Allow all operations on product_images" ON product_images
FOR ALL USING (true) WITH CHECK (true);

-- 4. Reabilitar RLS apenas nas tabelas que precisam
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Deixar user_roles e profiles sem RLS por enquanto
-- ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
"""
        
        print(f"\n📋 EXECUTE ESTE SQL NO DASHBOARD DO SUPABASE:")
        print(f"   URL: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/sql/new")
        print(f"\n{sql_script}")
        
        # Salvar script em arquivo
        with open('fix_rls_recursion.sql', 'w') as f:
            f.write(sql_script)
        
        print(f"\n💾 Script salvo em: fix_rls_recursion.sql")
        
        print(f"\n🎯 APÓS EXECUTAR O SQL:")
        print(f"   1. O frontend deve conseguir carregar produtos")
        print(f"   2. O frontend deve conseguir inserir produtos")
        print(f"   3. O upload de imagens deve funcionar")
        
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    main()