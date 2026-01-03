#!/usr/bin/env python3
"""
Teste de acesso ao banco de dados real do Supabase
Análise completa da estrutura e dados
"""

import requests
import json

# Credenciais do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def test_profiles_table():
    """Testa acesso à tabela profiles"""
    print("=" * 60)
    print("1. TESTANDO ACESSO À TABELA PROFILES")
    print("=" * 60)

    url = f"{SUPABASE_URL}/rest/v1/profiles"
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        # Buscar primeiros 5 perfis
        response = requests.get(
            f"{url}?select=*&limit=5",
            headers=headers,
            timeout=10
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            profiles = response.json()
            print(f"✅ Sucesso! Encontrados {len(profiles)} perfis")

            if profiles:
                print("\n📊 Estrutura da tabela (baseado no primeiro registro):")
                first_profile = profiles[0]
                for key in sorted(first_profile.keys()):
                    value = first_profile[key]
                    value_type = type(value).__name__
                    print(f"  - {key}: {value_type} = {value}")

                print("\n👥 Usuários encontrados:")
                for idx, profile in enumerate(profiles, 1):
                    print(f"  {idx}. {profile.get('full_name', 'N/A')} ({profile.get('email', 'N/A')}) - Role: {profile.get('role', 'N/A')}")
            else:
                print("⚠️  Tabela profiles existe mas está vazia")
        else:
            print(f"❌ Erro: {response.status_code}")
            print(f"Resposta: {response.text}")

    except Exception as e:
        print(f"❌ Erro ao acessar tabela profiles: {e}")

def test_edge_function():
    """Testa a Edge Function admin-create-user"""
    print("\n" + "=" * 60)
    print("2. TESTANDO EDGE FUNCTION admin-create-user")
    print("=" * 60)

    url = f"{SUPABASE_URL}/functions/v1/admin-create-user"
    headers = {
        'apikey': ANON_KEY,
        'Authorization': f'Bearer {ANON_KEY}',
        'Content-Type': 'application/json'
    }

    # Dados de teste (usuário fictício)
    data = {
        'email': f'teste.edge.function.{int(requests.utils.default_user_agent())}@exemplo.com',
        'password': 'TesteSenha123!',
        'userData': {
            'full_name': 'Teste Edge Function',
            'email': f'teste.edge.function@exemplo.com',
            'role': 'vendedor',
            'status': 'ativo',
            'is_affiliate': False
        }
    }

    print(f"📧 Tentando criar usuário: {data['userData']['full_name']}")

    try:
        response = requests.post(
            url,
            headers=headers,
            json=data,
            timeout=35  # 35 segundos para ver se dá timeout
        )

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 200:
            print("✅ Edge Function FUNCIONANDO!")
            result = response.json()
            print(f"Resposta: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Edge Function retornou erro: {response.status_code}")
            print(f"Resposta: {response.text}")

    except requests.exceptions.Timeout:
        print("⏱️  TIMEOUT! Edge Function demorou mais de 35 segundos")
        print("❌ CONFIRMADO: Edge Function não está respondendo (mesmo problema do frontend)")
    except Exception as e:
        print(f"❌ Erro ao chamar Edge Function: {e}")

def count_users():
    """Conta quantos usuários existem"""
    print("\n" + "=" * 60)
    print("3. CONTANDO USUÁRIOS NO BANCO")
    print("=" * 60)

    url = f"{SUPABASE_URL}/rest/v1/profiles"
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Prefer': 'count=exact'
    }

    try:
        response = requests.get(
            f"{url}?select=id",
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            # O count vem no header Content-Range
            content_range = response.headers.get('Content-Range', '')
            if content_range:
                # Format: 0-4/10 (significa 10 total)
                total = content_range.split('/')[-1]
                print(f"✅ Total de usuários na tabela profiles: {total}")
            else:
                users = response.json()
                print(f"✅ Total de usuários: {len(users)}")
        else:
            print(f"❌ Erro ao contar: {response.status_code}")

    except Exception as e:
        print(f"❌ Erro: {e}")

def check_rls_with_anon():
    """Verifica se RLS está bloqueando acesso com anon key"""
    print("\n" + "=" * 60)
    print("4. TESTANDO RLS COM ANON KEY")
    print("=" * 60)

    url = f"{SUPABASE_URL}/rest/v1/profiles"
    headers = {
        'apikey': ANON_KEY,
        'Authorization': f'Bearer {ANON_KEY}',
    }

    try:
        response = requests.get(
            f"{url}?select=*&limit=5",
            headers=headers,
            timeout=10
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            profiles = response.json()
            print(f"✅ Anon key pode acessar! Retornou {len(profiles)} perfis")
            print("⚠️  ATENÇÃO: Isso pode ser um problema de segurança se não for intencional")
        elif response.status_code == 401 or response.status_code == 403:
            print("✅ RLS está funcionando corretamente - anon key bloqueada")
        else:
            print(f"Status inesperado: {response.status_code}")
            print(f"Resposta: {response.text}")

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    print("🔍 ANÁLISE DO BANCO DE DADOS REAL - SLIM QUALITY")
    print("Project: vtynmmtuvxreiwcxxlma")
    print("URL: https://vtynmmtuvxreiwcxxlma.supabase.co")
    print()

    test_profiles_table()
    count_users()
    check_rls_with_anon()
    test_edge_function()

    print("\n" + "=" * 60)
    print("ANÁLISE CONCLUÍDA")
    print("=" * 60)
