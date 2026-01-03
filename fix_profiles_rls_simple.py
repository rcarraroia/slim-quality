#!/usr/bin/env python3
"""
Correção Simples - RLS Policies da tabela profiles
Permitir acesso público de leitura aos perfis
"""

import requests

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def fix_profiles_rls():
    print("🔧 CORRIGINDO RLS POLICIES DA TABELA PROFILES")
    print("=" * 50)
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY
    }
    
    # SQL para corrigir RLS policies
    sql_commands = [
        # 1. Remover todas as policies existentes
        "DROP POLICY IF EXISTS \"Users can view own profile\" ON profiles;",
        "DROP POLICY IF EXISTS \"Admins view all profiles\" ON profiles;", 
        "DROP POLICY IF EXISTS \"Public can view profiles\" ON profiles;",
        "DROP POLICY IF EXISTS \"Users view own data\" ON profiles;",
        "DROP POLICY IF EXISTS \"Allow public read access to profiles\" ON profiles;",
        
        # 2. Criar policy simples para leitura pública
        """CREATE POLICY "Allow public read access to profiles"
           ON profiles FOR SELECT
           USING (true);""",
           
        # 3. Manter segurança para escrita
        """CREATE POLICY "Users can update own profile"
           ON profiles FOR UPDATE
           USING (auth.uid() = id);""",
           
        """CREATE POLICY "Service role can insert profiles"
           ON profiles FOR INSERT
           WITH CHECK (auth.role() = 'service_role');"""
    ]
    
    for i, sql in enumerate(sql_commands, 1):
        try:
            print(f"\n{i}. Executando: {sql[:50]}...")
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                headers=headers,
                json={"sql": sql},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                print(f"   ✅ Sucesso")
            else:
                print(f"   ⚠️ Status: {response.status_code} - {response.text[:100]}")
                
        except Exception as e:
            print(f"   ❌ Erro: {str(e)}")
    
    print("\n🧪 TESTANDO CORREÇÃO:")
    
    # Testar acesso com anon key
    from supabase import create_client
    
    supabase_anon = create_client(SUPABASE_URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8")
    
    try:
        result = supabase_anon.table('profiles').select('email, full_name, role').execute()
        print(f"✅ Frontend agora pode acessar profiles: {len(result.data)} registros")
        
        for profile in result.data:
            print(f"   👤 {profile.get('email')} - {profile.get('full_name')} ({profile.get('role')})")
            
    except Exception as e:
        print(f"❌ Ainda há problema: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 CORREÇÃO CONCLUÍDA")

if __name__ == "__main__":
    fix_profiles_rls()