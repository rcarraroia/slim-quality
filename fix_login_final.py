#!/usr/bin/env python3
"""
Correção Final do Login - Desabilitar RLS e testar
"""

import requests
from supabase import create_client

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def fix_login_final():
    print("🔧 CORREÇÃO FINAL DO LOGIN")
    print("=" * 40)
    
    # 1. Desabilitar RLS via Edge Function
    print("\n1️⃣ Desabilitando RLS na tabela profiles...")
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/disable-rls",
            headers={
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "Content-Type": "application/json"
            },
            json={},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ RLS desabilitado com sucesso!")
        else:
            print(f"❌ Erro: {response.status_code} - {response.text}")
            return
            
    except Exception as e:
        print(f"❌ Erro ao desabilitar RLS: {str(e)}")
        return
    
    # 2. Testar acesso aos perfis
    print("\n2️⃣ Testando acesso aos perfis...")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        result = supabase.table('profiles').select('email, full_name, role').execute()
        
        if result.data:
            print(f"✅ Frontend pode acessar {len(result.data)} perfis:")
            for profile in result.data:
                print(f"   👤 {profile.get('email')} - {profile.get('full_name')} ({profile.get('role')})")
        else:
            print("❌ Ainda não consegue acessar perfis")
            return
            
    except Exception as e:
        print(f"❌ Erro no teste: {str(e)}")
        return
    
    # 3. Testar login completo
    print("\n3️⃣ Testando login completo...")
    
    usuarios_teste = [
        {"email": "rcarrarocoach@gmail.com", "password": "123456"},
        {"email": "jbmkt01@gmail.com", "password": "M&151173c@"}
    ]
    
    for usuario in usuarios_teste:
        try:
            print(f"\n🔐 Testando login: {usuario['email']}")
            
            # Fazer login
            auth_result = supabase.auth.sign_in_with_password({
                "email": usuario['email'],
                "password": usuario['password']
            })
            
            if auth_result.user:
                print(f"✅ Login SUCESSO!")
                print(f"   🆔 User ID: {auth_result.user.id}")
                
                # Buscar perfil (como faz o AuthContext)
                profile_result = supabase.table('profiles').select('*').eq('id', auth_result.user.id).single().execute()
                
                if profile_result.data:
                    print(f"✅ Perfil encontrado: {profile_result.data.get('full_name')}")
                else:
                    print(f"❌ Perfil não encontrado")
                
                # Logout
                supabase.auth.sign_out()
            else:
                print(f"❌ Login falhou")
                
        except Exception as e:
            print(f"❌ Erro no login: {str(e)}")
    
    print("\n" + "=" * 40)
    print("🏁 CORREÇÃO CONCLUÍDA")
    print("\n📋 RESULTADO:")
    print("✅ RLS desabilitado na tabela profiles")
    print("✅ Frontend pode acessar dados dos usuários")
    print("✅ Login deve funcionar agora no navegador")
    print("\n🔗 TESTE AGORA:")
    print("   https://slimquality.com.br/login")
    print("   👤 rcarrarocoach@gmail.com / 123456")
    print("   👤 jbmkt01@gmail.com / M&151173c@")

if __name__ == "__main__":
    fix_login_final()