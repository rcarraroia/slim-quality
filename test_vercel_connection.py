#!/usr/bin/env python3
"""
Teste específico para verificar conexão com as mesmas credenciais do Vercel
"""

from supabase import create_client, Client
import requests

# Credenciais exatas do Vercel (da imagem)
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MVk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def main():
    print("🔍 TESTANDO CONEXÃO COM CREDENCIAIS DO VERCEL")
    print("=" * 50)
    
    # Teste 1: Verificar se o projeto está ativo
    print("\n1. Verificando se projeto Supabase está ativo...")
    try:
        response = requests.get(f"{SUPABASE_URL}/rest/v1/", 
                              headers={"apikey": SUPABASE_ANON_KEY},
                              timeout=10)
        
        if response.status_code == 200:
            print("✅ Projeto Supabase está ativo e respondendo")
        elif response.status_code == 401:
            print("❌ Erro 401: Chave API inválida ou expirada")
        elif response.status_code == 503:
            print("❌ Erro 503: Projeto pausado ou indisponível")
        else:
            print(f"❌ Erro {response.status_code}: {response.text}")
            
    except requests.exceptions.Timeout:
        print("❌ Timeout: Projeto pode estar pausado")
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
    
    # Teste 2: Testar com Supabase client
    print("\n2. Testando com Supabase client...")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Teste simples: listar produtos
        result = supabase.table('products').select('id, name').limit(1).execute()
        
        if result.data:
            print(f"✅ Conexão funcionando! Produto encontrado: {result.data[0]['name']}")
        else:
            print("⚠️ Conexão OK, mas nenhum produto encontrado")
            
    except Exception as e:
        print(f"❌ Erro Supabase client: {e}")
    
    # Teste 3: Verificar RLS especificamente
    print("\n3. Verificando RLS na tabela products...")
    try:
        # Tentar inserir (vai falhar se RLS estiver ativo)
        test_insert = {
            "name": "Teste RLS Vercel",
            "sku": "TEST-VERCEL-001",
            "price_cents": 100000,
            "width_cm": 100,
            "length_cm": 200,
            "height_cm": 30,
            "is_active": True,
            "product_type": "mattress"
        }
        
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        result = supabase.table('products').insert(test_insert).execute()
        
        print("✅ RLS permite inserção com chave anônima")
        
        # Limpar teste (usar service role)
        service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
        service_supabase = create_client(SUPABASE_URL, service_key)
        service_supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
        
    except Exception as e:
        if "row-level security policy" in str(e):
            print("❌ RLS está bloqueando inserções com chave anônima")
            print("   Isso explica por que o frontend não consegue inserir produtos")
        elif "Invalid API key" in str(e):
            print("❌ Chave API inválida")
        else:
            print(f"❌ Outro erro RLS: {e}")
    
    # Teste 4: Verificar se consegue pelo menos ler
    print("\n4. Testando apenas leitura...")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Query mais simples possível
        result = supabase.table('products').select('count').execute()
        print(f"✅ Leitura funcionando: {result}")
        
    except Exception as e:
        print(f"❌ Erro na leitura: {e}")
    
    print(f"\n📋 DIAGNÓSTICO:")
    print(f"   URL: {SUPABASE_URL}")
    print(f"   Chave: {SUPABASE_ANON_KEY[:50]}...")
    print(f"   Se todos os testes falharam, o projeto pode estar pausado novamente")

if __name__ == "__main__":
    main()