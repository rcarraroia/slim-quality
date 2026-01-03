#!/usr/bin/env python3
"""
Debug Auth Users - Verificar usuários no Supabase Auth
"""

import os
from supabase import create_client, Client
from datetime import datetime

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    print("🔍 VERIFICANDO USUÁRIOS NO SUPABASE AUTH")
    print("=" * 50)
    
    try:
        # Criar cliente Supabase com service role
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Verificar usuários específicos
        emails_to_check = ['rcarrarocoach@gmail.com', 'jbmkt01@gmail.com']
        
        print("\n📋 USUÁRIOS NO AUTH.USERS:")
        
        # Query direta no banco
        result = supabase.table('auth.users').select('*').execute()
        
        if result.data:
            for user in result.data:
                if user.get('email') in emails_to_check:
                    print(f"\n✅ USUÁRIO ENCONTRADO:")
                    print(f"   📧 Email: {user.get('email')}")
                    print(f"   🆔 ID: {user.get('id')}")
                    print(f"   ✉️ Email Confirmado: {user.get('email_confirmed_at')}")
                    print(f"   📅 Criado em: {user.get('created_at')}")
                    print(f"   🔑 Último Login: {user.get('last_sign_in_at')}")
        else:
            print("❌ Nenhum usuário encontrado!")
            
        # Verificar perfis na tabela profiles
        print("\n📋 PERFIS NA TABELA PROFILES:")
        
        profiles_result = supabase.table('profiles').select('*').in_('email', emails_to_check).execute()
        
        if profiles_result.data:
            for profile in profiles_result.data:
                print(f"\n✅ PERFIL ENCONTRADO:")
                print(f"   📧 Email: {profile.get('email')}")
                print(f"   👤 Nome: {profile.get('full_name')}")
                print(f"   🎭 Role: {profile.get('role')}")
                print(f"   📊 Status: {profile.get('status')}")
                print(f"   📅 Criado em: {profile.get('created_at')}")
        else:
            print("❌ Nenhum perfil encontrado!")
            
        # Testar autenticação diretamente
        print("\n🔐 TESTANDO AUTENTICAÇÃO:")
        
        # Tentar login com Super Admin
        try:
            auth_result = supabase.auth.sign_in_with_password({
                "email": "rcarrarocoach@gmail.com",
                "password": "sua_senha_aqui"  # Você precisa fornecer a senha
            })
            print("✅ Login Super Admin: SUCESSO")
        except Exception as e:
            print(f"❌ Login Super Admin: FALHOU - {str(e)}")
            
        # Tentar login com João Bosco
        try:
            auth_result = supabase.auth.sign_in_with_password({
                "email": "jbmkt01@gmail.com", 
                "password": "M&151173c@"
            })
            print("✅ Login João Bosco: SUCESSO")
        except Exception as e:
            print(f"❌ Login João Bosco: FALHOU - {str(e)}")
            
    except Exception as e:
        print(f"💥 ERRO GERAL: {str(e)}")
        
    print("\n" + "=" * 50)
    print("🏁 VERIFICAÇÃO CONCLUÍDA")

if __name__ == "__main__":
    main()