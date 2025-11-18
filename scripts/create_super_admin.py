#!/usr/bin/env python3
"""
Script para criar usuário Super Admin
Uso: python scripts/create_super_admin.py
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def create_super_admin():
    """Cria usuário super admin no sistema"""
    
    # Configurações
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ ERRO: Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas")
        print("Configure no arquivo .env")
        sys.exit(1)
    
    # Dados do super admin
    ADMIN_EMAIL = "rcarrarocoach@gmail.com"
    ADMIN_PASSWORD = "SlimQuality@2025"  # ⚠️ ALTERE APÓS PRIMEIRO LOGIN
    ADMIN_NAME = "Renato Carraro"
    
    print("🚀 Criando Super Admin...")
    print(f"📧 Email: {ADMIN_EMAIL}")
    print(f"👤 Nome: {ADMIN_NAME}")
    print()
    
    try:
        # Conectar ao Supabase com Service Role Key (bypass RLS)
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # 1. Verificar se usuário já existe
        print("🔍 Verificando se usuário já existe...")
        existing = supabase.table('profiles').select('*').eq('email', ADMIN_EMAIL).execute()
        
        if existing.data and len(existing.data) > 0:
            print(f"⚠️  Usuário {ADMIN_EMAIL} já existe!")
            user_id = existing.data[0]['id']
            print(f"📋 ID: {user_id}")
            
            # Verificar se já tem role admin
            roles = supabase.table('user_roles').select('*').eq('user_id', user_id).is_('deleted_at', 'null').execute()
            has_admin = any(r['role'] == 'admin' for r in roles.data)
            
            if has_admin:
                print("✅ Usuário já é admin!")
                return
            else:
                print("➕ Adicionando role admin...")
                supabase.table('user_roles').insert({
                    'user_id': user_id,
                    'role': 'admin'
                }).execute()
                print("✅ Role admin adicionada com sucesso!")
                return
        
        # 2. Criar usuário no Supabase Auth
        print("👤 Criando usuário no Supabase Auth...")
        auth_response = supabase.auth.admin.create_user({
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "email_confirm": True,  # Confirmar email automaticamente
            "user_metadata": {
                "full_name": ADMIN_NAME
            }
        })
        
        user_id = auth_response.user.id
        print(f"✅ Usuário criado! ID: {user_id}")
        
        # 3. Criar ou atualizar perfil
        print("📝 Verificando perfil...")
        profile_check = supabase.table('profiles').select('*').eq('id', user_id).execute()
        
        if profile_check.data and len(profile_check.data) > 0:
            print("ℹ️  Perfil já existe, atualizando...")
            supabase.table('profiles').update({
                'email': ADMIN_EMAIL,
                'full_name': ADMIN_NAME,
                'is_affiliate': False
            }).eq('id', user_id).execute()
            print("✅ Perfil atualizado!")
        else:
            print("📝 Criando perfil...")
            supabase.table('profiles').insert({
                'id': user_id,
                'email': ADMIN_EMAIL,
                'full_name': ADMIN_NAME,
                'is_affiliate': False
            }).execute()
            print("✅ Perfil criado!")
        
        # 4. Atribuir role admin
        print("🔐 Atribuindo role admin...")
        supabase.table('user_roles').insert({
            'user_id': user_id,
            'role': 'admin'
        }).execute()
        print("✅ Role admin atribuída!")
        
        print()
        print("=" * 60)
        print("✅ SUPER ADMIN CRIADO COM SUCESSO!")
        print("=" * 60)
        print()
        print("📧 Email:", ADMIN_EMAIL)
        print("🔑 Senha:", ADMIN_PASSWORD)
        print()
        print("⚠️  IMPORTANTE:")
        print("1. Faça login imediatamente")
        print("2. ALTERE A SENHA após primeiro acesso")
        print("3. Guarde as credenciais em local seguro")
        print()
        print("🔗 Acesse: http://localhost:5173/login")
        print()
        
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    create_super_admin()
