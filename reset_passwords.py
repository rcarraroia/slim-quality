#!/usr/bin/env python3
"""
Reset Passwords - Resetar senhas dos usuários no Supabase Auth
"""

from supabase import create_client, Client
import requests

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def reset_user_passwords():
    print("🔑 RESETANDO SENHAS DOS USUÁRIOS")
    print("=" * 50)
    
    try:
        # Primeiro, vamos listar todos os usuários para pegar os IDs
        print("\n1️⃣ LISTANDO USUÁRIOS EXISTENTES:")
        
        # Usar API REST diretamente para listar usuários
        headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_KEY
        }
        
        # Listar usuários via Admin API
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=headers
        )
        
        if response.status_code == 200:
            users = response.json().get('users', [])
            print(f"✅ Encontrados {len(users)} usuários")
            
            # Encontrar nossos usuários específicos
            target_emails = ['rcarrarocoach@gmail.com', 'jbmkt01@gmail.com']
            target_users = []
            
            for user in users:
                if user.get('email') in target_emails:
                    target_users.append(user)
                    print(f"   📧 {user.get('email')} - ID: {user.get('id')}")
                    print(f"      ✉️ Email confirmado: {user.get('email_confirmed_at')}")
                    print(f"      🔑 Último login: {user.get('last_sign_in_at')}")
            
            # Resetar senhas
            print(f"\n2️⃣ RESETANDO SENHAS:")
            
            passwords = {
                'rcarrarocoach@gmail.com': '123456',
                'jbmkt01@gmail.com': 'M&151173c@'
            }
            
            for user in target_users:
                email = user.get('email')
                user_id = user.get('id')
                new_password = passwords.get(email)
                
                if new_password:
                    print(f"\n🔐 Resetando senha para: {email}")
                    
                    # Resetar senha via Admin API
                    update_response = requests.put(
                        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                        headers=headers,
                        json={
                            "password": new_password,
                            "email_confirm": True
                        }
                    )
                    
                    if update_response.status_code == 200:
                        print(f"✅ Senha resetada com sucesso!")
                    else:
                        print(f"❌ Erro ao resetar senha: {update_response.text}")
            
            # Testar login após reset
            print(f"\n3️⃣ TESTANDO LOGIN APÓS RESET:")
            
            supabase_anon = create_client(SUPABASE_URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8")
            
            for email, password in passwords.items():
                try:
                    print(f"\n🔐 Testando login: {email}")
                    
                    auth_result = supabase_anon.auth.sign_in_with_password({
                        "email": email,
                        "password": password
                    })
                    
                    if auth_result.user:
                        print(f"✅ LOGIN SUCESSO!")
                        print(f"   🆔 User ID: {auth_result.user.id}")
                        print(f"   📧 Email: {auth_result.user.email}")
                        
                        # Logout
                        supabase_anon.auth.sign_out()
                    else:
                        print(f"❌ LOGIN FALHOU: Sem dados de usuário")
                        
                except Exception as e:
                    print(f"❌ LOGIN FALHOU: {str(e)}")
            
        else:
            print(f"❌ Erro ao listar usuários: {response.text}")
            
    except Exception as e:
        print(f"💥 ERRO GERAL: {str(e)}")
        
    print("\n" + "=" * 50)
    print("🏁 RESET DE SENHAS CONCLUÍDO")
    print("\n📋 CREDENCIAIS ATUALIZADAS:")
    print("👤 Super Admin: rcarrarocoach@gmail.com / 123456")
    print("👤 João Bosco: jbmkt01@gmail.com / M&151173c@")

if __name__ == "__main__":
    reset_user_passwords()