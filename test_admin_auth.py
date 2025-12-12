#!/usr/bin/env python3
"""
Teste de autenticação com usuário admin
"""
from supabase import create_client, Client

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def test_admin_login():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    print("🔐 TESTE DE AUTENTICAÇÃO ADMIN")
    print("=" * 50)
    
    try:
        # Fazer login com credenciais admin
        auth_response = supabase.auth.sign_in_with_password({
            "email": "rcarrarocoach@gmail.com",
            "password": "SlimQuality@2025"
        })
        
        if auth_response.user:
            user_id = auth_response.user.id
            email = auth_response.user.email
            print(f"✅ Login realizado com sucesso")
            print(f"   User ID: {user_id}")
            print(f"   Email: {email}")
            
            # Verificar se é admin
            try:
                roles_result = supabase.table('user_roles').select('*').eq('user_id', user_id).execute()
                if roles_result.data:
                    roles = [role['role'] for role in roles_result.data]
                    print(f"   Roles: {roles}")
                    is_admin = 'admin' in roles
                else:
                    print("   Roles: Nenhuma role encontrada")
                    is_admin = False
            except:
                print("   Roles: Erro ao verificar roles")
                is_admin = False
            
            return {
                'success': True,
                'user_id': user_id,
                'email': email,
                'is_admin': is_admin,
                'session': auth_response.session
            }
        else:
            print("❌ Falha no login")
            return {'success': False}
            
    except Exception as e:
        print(f"❌ Erro no login: {e}")
        return {'success': False, 'error': str(e)}

if __name__ == "__main__":
    result = test_admin_login()
    print(f"\n📊 RESULTADO: {'✅ SUCESSO' if result.get('success') else '❌ FALHA'}")
    if result.get('success'):
        print(f"Admin: {'✅ SIM' if result.get('is_admin') else '❌ NÃO'}")