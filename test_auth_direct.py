#!/usr/bin/env python3
"""
Teste Direto de Autenticação - Verificar se o Supabase Auth está funcionando
"""

import os
from supabase import create_client, Client
from datetime import datetime

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def test_supabase_connection():
    print("🔍 TESTANDO CONEXÃO COM SUPABASE")
    print("=" * 50)
    
    try:
        # Testar com anon key (como o frontend)
        print("\n1️⃣ TESTANDO COM ANON KEY (Frontend):")
        supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Verificar se consegue acessar perfis
        try:
            profiles = supabase_anon.table('profiles').select('email, full_name, role').limit(5).execute()
            print(f"✅ Acesso a profiles: {len(profiles.data)} registros encontrados")
            
            for profile in profiles.data:
                print(f"   📧 {profile.get('email')} - {profile.get('full_name')} ({profile.get('role')})")
                
        except Exception as e:
            print(f"❌ Erro ao acessar profiles: {str(e)}")
        
        # Testar com service key (como Edge Function)
        print("\n2️⃣ TESTANDO COM SERVICE KEY (Backend):")
        supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        try:
            profiles = supabase_admin.table('profiles').select('email, full_name, role').limit(5).execute()
            print(f"✅ Acesso a profiles: {len(profiles.data)} registros encontrados")
            
            for profile in profiles.data:
                print(f"   📧 {profile.get('email')} - {profile.get('full_name')} ({profile.get('role')})")
                
        except Exception as e:
            print(f"❌ Erro ao acessar profiles: {str(e)}")
            
        # Testar autenticação com usuários conhecidos
        print("\n3️⃣ TESTANDO AUTENTICAÇÃO:")
        
        # Lista de usuários para testar
        test_users = [
            {"email": "rcarrarocoach@gmail.com", "password": "123456"},  # Senha padrão comum
            {"email": "jbmkt01@gmail.com", "password": "M&151173c@"},   # Senha do João Bosco
        ]
        
        for user in test_users:
            try:
                print(f"\n🔐 Testando login: {user['email']}")
                
                auth_result = supabase_anon.auth.sign_in_with_password({
                    "email": user['email'],
                    "password": user['password']
                })
                
                if auth_result.user:
                    print(f"✅ LOGIN SUCESSO!")
                    print(f"   🆔 User ID: {auth_result.user.id}")
                    print(f"   📧 Email: {auth_result.user.email}")
                    print(f"   ✉️ Email Confirmado: {auth_result.user.email_confirmed_at}")
                    
                    # Fazer logout
                    supabase_anon.auth.sign_out()
                else:
                    print(f"❌ LOGIN FALHOU: Sem dados de usuário")
                    
            except Exception as e:
                print(f"❌ LOGIN FALHOU: {str(e)}")
                
        # Verificar se Edge Function está acessível
        print("\n4️⃣ TESTANDO EDGE FUNCTION:")
        
        try:
            import requests
            
            response = requests.post(
                f"{SUPABASE_URL}/functions/v1/admin-create-user",
                headers={
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "email": "test@test.com",
                    "password": "test123",
                    "userData": {"full_name": "Test User", "role": "vendedor"}
                },
                timeout=5
            )
            
            print(f"✅ Edge Function acessível: Status {response.status_code}")
            
        except Exception as e:
            print(f"❌ Edge Function inacessível: {str(e)}")
            
    except Exception as e:
        print(f"💥 ERRO GERAL: {str(e)}")
        
    print("\n" + "=" * 50)
    print("🏁 TESTE CONCLUÍDO")

if __name__ == "__main__":
    test_supabase_connection()