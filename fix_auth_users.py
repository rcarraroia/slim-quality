#!/usr/bin/env python3
"""
Fix Auth Users - Criar usuários no Supabase Auth corretamente
"""

from supabase import create_client, Client

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def fix_auth_users():
    print("🔧 CORRIGINDO USUÁRIOS NO SUPABASE AUTH")
    print("=" * 50)
    
    try:
        # Criar cliente com service role
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Usuários para criar/corrigir
        users_to_fix = [
            {
                "email": "rcarrarocoach@gmail.com",
                "password": "123456",  # Senha temporária simples
                "full_name": "Renato Carraro",
                "role": "super_admin"
            },
            {
                "email": "jbmkt01@gmail.com", 
                "password": "M&151173c@",
                "full_name": "Joao Bosco",
                "role": "admin"
            }
        ]
        
        for user_data in users_to_fix:
            print(f"\n🔐 Processando usuário: {user_data['email']}")
            
            try:
                # Tentar criar usuário no Auth
                auth_result = supabase.auth.admin.create_user({
                    "email": user_data["email"],
                    "password": user_data["password"],
                    "email_confirm": True,  # Confirmar email automaticamente
                    "user_metadata": {
                        "full_name": user_data["full_name"],
                        "role": user_data["role"]
                    }
                })
                
                if auth_result.user:
                    print(f"✅ Usuário criado no Auth: {auth_result.user.id}")
                    
                    # Atualizar perfil na tabela profiles
                    profile_result = supabase.table('profiles').upsert({
                        "id": auth_result.user.id,
                        "email": user_data["email"],
                        "full_name": user_data["full_name"],
                        "role": user_data["role"],
                        "status": "ativo"
                    }).execute()
                    
                    print(f"✅ Perfil atualizado na tabela profiles")
                    
                else:
                    print(f"❌ Falha ao criar usuário no Auth")
                    
            except Exception as e:
                error_msg = str(e)
                if "User already registered" in error_msg:
                    print(f"⚠️ Usuário já existe no Auth")
                    
                    # Tentar resetar senha
                    try:
                        reset_result = supabase.auth.admin.update_user_by_id(
                            user_data["email"],  # Usar email como ID temporariamente
                            {
                                "password": user_data["password"],
                                "email_confirm": True
                            }
                        )
                        print(f"✅ Senha resetada para usuário existente")
                    except Exception as reset_error:
                        print(f"❌ Erro ao resetar senha: {str(reset_error)}")
                        
                else:
                    print(f"❌ Erro ao criar usuário: {error_msg}")
        
        # Testar login após correções
        print(f"\n🧪 TESTANDO LOGIN APÓS CORREÇÕES:")
        
        # Criar cliente anon para testar login
        supabase_anon = create_client(SUPABASE_URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8")
        
        for user_data in users_to_fix:
            try:
                print(f"\n🔐 Testando login: {user_data['email']}")
                
                auth_result = supabase_anon.auth.sign_in_with_password({
                    "email": user_data["email"],
                    "password": user_data["password"]
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
                
    except Exception as e:
        print(f"💥 ERRO GERAL: {str(e)}")
        
    print("\n" + "=" * 50)
    print("🏁 CORREÇÃO CONCLUÍDA")
    print("\n📋 CREDENCIAIS PARA TESTE:")
    print("👤 Super Admin: rcarrarocoach@gmail.com / 123456")
    print("👤 João Bosco: jbmkt01@gmail.com / M&151173c@")

if __name__ == "__main__":
    fix_auth_users()