#!/usr/bin/env python3
"""
Debug RLS na tabela profiles
"""

from supabase import create_client, Client

def debug_rls():
    """Debug completo do RLS"""
    
    # Service role key
    supabase_service: Client = create_client(
        "https://vtynmmtuvxreiwcxxlma.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
    )
    
    # Anon key
    supabase_anon: Client = create_client(
        "https://vtynmmtuvxreiwcxxlma.supabase.co", 
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
    )
    
    print("=== DEBUG RLS PROFILES ===")
    
    # Teste 1: Service role
    print("\n1. TESTE COM SERVICE ROLE:")
    try:
        result = supabase_service.table('profiles').select('*').execute()
        print(f"   ✅ Service role: {len(result.data)} usuários")
        for user in result.data:
            print(f"      - {user['full_name']} ({user['email']}) - {user['role']}")
    except Exception as e:
        print(f"   ❌ Service role erro: {e}")
    
    # Teste 2: Anon key sem auth
    print("\n2. TESTE COM ANON KEY (SEM AUTH):")
    try:
        result = supabase_anon.table('profiles').select('*').execute()
        print(f"   ✅ Anon key: {len(result.data)} usuários")
        if result.data:
            for user in result.data:
                print(f"      - {user['full_name']} ({user['email']}) - {user['role']}")
        else:
            print("   ⚠️ Nenhum usuário retornado (RLS bloqueando)")
    except Exception as e:
        print(f"   ❌ Anon key erro: {e}")
    
    # Teste 3: Anon key com auth (simular frontend logado)
    print("\n3. TESTE COM ANON KEY + AUTH:")
    try:
        # Tentar fazer login como o usuário
        auth_result = supabase_anon.auth.sign_in_with_password({
            "email": "rcarrarocoach@gmail.com",
            "password": "M&151173c@"  # Senha do usuário
        })
        
        if auth_result.user:
            print(f"   ✅ Login realizado: {auth_result.user.email}")
            
            # Agora testar acesso aos profiles
            result = supabase_anon.table('profiles').select('*').execute()
            print(f"   ✅ Profiles com auth: {len(result.data)} usuários")
            for user in result.data:
                print(f"      - {user['full_name']} ({user['email']}) - {user['role']}")
        else:
            print("   ❌ Falha no login")
            
    except Exception as e:
        print(f"   ❌ Auth + profiles erro: {e}")
    
    # Teste 4: Verificar se RLS está ativo
    print("\n4. VERIFICAR STATUS RLS:")
    try:
        # Usar uma query direta para verificar RLS
        result = supabase_service.rpc('exec_sql', {
            'sql': 'SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = \'profiles\';'
        }).execute()
        print(f"   RLS Status: {result.data}")
    except Exception as e:
        print(f"   ❌ Erro ao verificar RLS: {e}")
        
        # Tentar método alternativo
        try:
            # Verificar diretamente na tabela
            result = supabase_service.table('profiles').select('*').limit(1).execute()
            print("   ✅ Service role consegue acessar profiles")
            
            # Verificar se existe alguma política
            print("   📋 Tentando verificar políticas existentes...")
            
        except Exception as e2:
            print(f"   ❌ Service role também falhou: {e2}")

if __name__ == "__main__":
    debug_rls()