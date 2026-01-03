import os
import requests
import json

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def audit_supabase():
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    print("--- Auditoria de Tabelas ---")
    # Tentar pegar a lista de tabelas via API PostgREST
    try:
        response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
        if response.status_code == 200:
            print("Conexão bem sucedida!")
            data = response.json()
            print("Tabelas publicadas:")
            for table in data.get('definitions', {}):
                print(f"- {table}")
        else:
            print(f"Erro ao listar tabelas: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Erro na requisição: {e}")

    print("\n--- Auditoria de Perfil Específico ---")
    user_id = "55335919-6968-4c6f-b32c-1a97a7b113ff"
    try:
        response = requests.get(f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}", headers=headers)
        if response.status_code == 200:
            profiles = response.json()
            if profiles:
                print(f"Perfil encontrado: {json.dumps(profiles[0], indent=2)}")
            else:
                print("Perfil NÃO ENCONTRADO na tabela profiles.")
        else:
            print(f"Erro ao buscar perfil: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Erro na requisição de perfil: {e}")

    print("\n--- Verificação de Políticas RLS (via SQL se possível) ---")
    # Como não temos acesso CLI total pra ver RLS, vamos tentar um mock select pra ver se falha ou retorna (usando service role contorna RLS)
    # Mas o problema geralmente é no Anon Key que o frontend usa.

if __name__ == "__main__":
    audit_supabase()
