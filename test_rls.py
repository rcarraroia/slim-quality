import requests
import json

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
# Anon Key do steering/supabase-credentials.md
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
# Service Role Key para auditoria sem RLS
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def test_rls():
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }

    tables = ["profiles", "conversations", "orders", "customers", "learning_logs"]
    
    print("--- Testando acesso ANON KEY (Sem JWT de Usuário) ---")
    for table in tables:
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?limit=1", headers=headers)
            print(f"Tabela {table}: Status {response.status_code}")
            if response.status_code == 200:
                print(f"  Acesso liberado (provavelmente política select ALL para anon ou roles)")
            else:
                print(f"  Acesso restrito/erro: {response.text}")
        except Exception as e:
            print(f"  Erro ao testar {table}: {e}")

    print("\n--- Verificando Políticas de RLS (via RPC ou SQL se possível com Service Role) ---")
    # Tentar listar políticas de RLS via SQL usando Service Role
    service_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Query SQL para listar políticas
    sql_query = {
        "query": """
        SELECT 
            schemaname, 
            tablename, 
            policyname, 
            permissive, 
            roles, 
            cmd, 
            qual, 
            with_check 
        FROM pg_policies 
        WHERE schemaname = 'public';
        """
    }
    
    # Infelizmente o REST API não permite execução de SQL arbitrário diretamente desta forma sem uma RPC
    # Mas no Supabase MCP server eu tenho o execute_sql. Vamos tentar usá-lo se os privilégios permitirem agora que tenho a service role no script.
    
    # Outra forma: Verificar se a função 'has_role' existe
    sql_check_func = {
        "query": "SELECT proname FROM pg_proc WHERE proname = 'has_role';"
    }

if __name__ == "__main__":
    test_rls()
