#!/usr/bin/env python3
"""
ANÁLISE COMPLETA DO SISTEMA SUPABASE
Diagnóstico total: tabelas, RLS policies, Edge Functions, dados
"""

from supabase import create_client, Client
import requests

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def analise_completa():
    print("🔍 ANÁLISE COMPLETA DO SISTEMA SUPABASE")
    print("=" * 60)
    
    # Criar clientes
    supabase_anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # 1. VERIFICAR TODAS AS TABELAS
    print("\n1️⃣ VERIFICANDO TODAS AS TABELAS:")
    print("-" * 40)
    
    tabelas_principais = [
        'profiles', 'conversations', 'messages', 'products', 'orders', 
        'affiliates', 'commissions', 'customers', 'memory_chunks'
    ]
    
    tabela_status = {}
    
    for tabela in tabelas_principais:
        try:
            # Testar com anon key (frontend)
            result_anon = supabase_anon.table(tabela).select('*').limit(1).execute()
            count_anon = len(result_anon.data)
            
            # Testar com service key (backend)
            result_admin = supabase_admin.table(tabela).select('*').limit(5).execute()
            count_admin = len(result_admin.data)
            
            tabela_status[tabela] = {
                'existe': True,
                'anon_access': count_anon > 0 or len(result_anon.data) == 0,
                'admin_access': count_admin > 0 or len(result_admin.data) == 0,
                'registros_anon': count_anon,
                'registros_admin': count_admin
            }
            
            status_anon = "✅" if tabela_status[tabela]['anon_access'] else "❌"
            status_admin = "✅" if tabela_status[tabela]['admin_access'] else "❌"
            
            print(f"{tabela:15} | Anon: {status_anon} ({count_anon}) | Admin: {status_admin} ({count_admin})")
            
        except Exception as e:
            tabela_status[tabela] = {
                'existe': False,
                'erro': str(e)
            }
            print(f"{tabela:15} | ❌ ERRO: {str(e)[:50]}...")
    
    # 2. VERIFICAR RLS POLICIES
    print("\n2️⃣ VERIFICANDO RLS POLICIES:")
    print("-" * 40)
    
    try:
        # Usar requests para acessar API REST diretamente
        headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_KEY
        }
        
        # Query para listar policies RLS
        query = """
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
        """
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={"sql": query},
            timeout=10
        )
        
        if response.status_code == 200:
            policies = response.json()
            if policies:
                for policy in policies:
                    print(f"📋 {policy.get('tablename', 'N/A'):15} | {policy.get('policyname', 'N/A')}")
                    print(f"   └─ Comando: {policy.get('cmd', 'N/A')} | Roles: {policy.get('roles', 'N/A')}")
            else:
                print("⚠️ Nenhuma policy RLS encontrada")
        else:
            print(f"❌ Erro ao buscar policies: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro ao verificar RLS policies: {str(e)}")
    
    # 3. VERIFICAR EDGE FUNCTIONS
    print("\n3️⃣ VERIFICANDO EDGE FUNCTIONS:")
    print("-" * 40)
    
    edge_functions = ['admin-create-user']
    
    for func in edge_functions:
        try:
            response = requests.post(
                f"{SUPABASE_URL}/functions/v1/{func}",
                headers={
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json"
                },
                json={"test": True},
                timeout=5
            )
            
            if response.status_code in [200, 400, 422]:  # Função existe
                print(f"✅ {func}: Acessível (Status: {response.status_code})")
            else:
                print(f"❌ {func}: Erro {response.status_code}")
                
        except Exception as e:
            print(f"❌ {func}: {str(e)}")
    
    # 4. VERIFICAR USUÁRIOS AUTH
    print("\n4️⃣ VERIFICANDO USUÁRIOS AUTH:")
    print("-" * 40)
    
    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "apikey": SUPABASE_SERVICE_KEY
            }
        )
        
        if response.status_code == 200:
            users = response.json().get('users', [])
            print(f"👥 Total de usuários: {len(users)}")
            
            for user in users:
                email = user.get('email', 'N/A')
                confirmed = "✅" if user.get('email_confirmed_at') else "❌"
                last_login = user.get('last_sign_in_at', 'Nunca')
                print(f"   📧 {email} | Confirmado: {confirmed} | Último login: {last_login}")
        else:
            print(f"❌ Erro ao listar usuários: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro ao verificar usuários: {str(e)}")
    
    # 5. DIAGNÓSTICO FINAL
    print("\n5️⃣ DIAGNÓSTICO FINAL:")
    print("-" * 40)
    
    problemas = []
    
    # Verificar problemas de acesso
    for tabela, status in tabela_status.items():
        if status.get('existe', False):
            if not status.get('anon_access', False) and status.get('registros_admin', 0) > 0:
                problemas.append(f"❌ Tabela '{tabela}': Frontend não consegue acessar (RLS muito restritivo)")
            elif status.get('registros_anon', 0) == 0 and status.get('registros_admin', 0) == 0:
                problemas.append(f"⚠️ Tabela '{tabela}': Sem dados")
        else:
            problemas.append(f"❌ Tabela '{tabela}': Não existe ou erro de acesso")
    
    if problemas:
        print("🚨 PROBLEMAS IDENTIFICADOS:")
        for problema in problemas:
            print(f"   {problema}")
    else:
        print("✅ Sistema aparenta estar funcionando corretamente")
    
    print("\n" + "=" * 60)
    print("🏁 ANÁLISE COMPLETA CONCLUÍDA")

if __name__ == "__main__":
    analise_completa()