#!/usr/bin/env python3
"""
Desabilitar RLS permanentemente usando service role
"""

from supabase import create_client, Client
import requests

# Service Role Key (que sabemos que funciona)
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        print("🔧 DESABILITANDO RLS PERMANENTEMENTE")
        print("=" * 40)
        
        # Usar requests diretamente para executar SQL
        headers = {
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json"
        }
        
        # SQL para desabilitar RLS
        sql_commands = [
            "ALTER TABLE products DISABLE ROW LEVEL SECURITY;",
            "ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;",
            "DROP POLICY IF EXISTS products_policy ON products;",
            "DROP POLICY IF EXISTS product_images_policy ON product_images;"
        ]
        
        for i, sql in enumerate(sql_commands, 1):
            print(f"\n{i}. Executando: {sql}")
            
            try:
                # Usar a API SQL do Supabase
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                    headers=headers,
                    json={"sql": sql},
                    timeout=10
                )
                
                if response.status_code == 200:
                    print("✅ Sucesso")
                else:
                    print(f"❌ Erro {response.status_code}: {response.text}")
                    
            except Exception as e:
                print(f"❌ Erro na requisição: {e}")
        
        # Testar se agora funciona com anon key
        print(f"\n🧪 TESTANDO COM ANON KEY APÓS DESABILITAR RLS...")
        
        anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MVk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
        
        try:
            supabase_anon = create_client(SUPABASE_URL, anon_key)
            result = supabase_anon.table('products').select('id, name').limit(1).execute()
            
            if result.data:
                print("✅ ANON KEY FUNCIONANDO!")
                print(f"   Produto encontrado: {result.data[0]['name']}")
            else:
                print("⚠️ Anon key funciona mas sem dados")
                
        except Exception as e:
            print(f"❌ Anon key ainda falhando: {e}")
            
            # Verificar se é problema de chave ou RLS
            if "Invalid API key" in str(e):
                print("   Problema: Chave inválida")
            elif "row-level security" in str(e):
                print("   Problema: RLS ainda ativo")
            else:
                print("   Problema: Outro erro")
        
        # Alternativa: Usar service role no frontend temporariamente
        print(f"\n💡 ALTERNATIVA TEMPORÁRIA:")
        print(f"   Se anon key não funcionar, podemos usar service role no frontend")
        print(f"   APENAS para desenvolvimento (NUNCA em produção)")
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()