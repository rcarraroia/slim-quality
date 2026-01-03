#!/usr/bin/env python3
"""
Testar correção RLS via Edge Function
"""

import requests
from supabase import create_client

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def test_fix_rls():
    print("🧪 TESTANDO CORREÇÃO RLS VIA EDGE FUNCTION")
    print("=" * 50)
    
    # 1. Chamar Edge Function para corrigir RLS
    print("\n1️⃣ Chamando Edge Function fix-profiles-rls...")
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/fix-profiles-rls",
            headers={
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "Content-Type": "application/json"
            },
            json={},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Edge Function executada com sucesso!")
            print(f"📊 Resultados: {len(result.get('results', []))} comandos SQL")
            print(f"🧪 Teste: {result.get('test', {})}")
        else:
            print(f"❌ Edge Function falhou: {response.status_code}")
            print(f"   Resposta: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro ao chamar Edge Function: {str(e)}")
    
    # 2. Testar acesso direto com anon key
    print("\n2️⃣ Testando acesso direto com anon key...")
    
    try:
        supabase_anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        result = supabase_anon.table('profiles').select('email, full_name, role').execute()
        
        if result.data:
            print(f"✅ SUCESSO! Frontend pode acessar {len(result.data)} perfis:")
            for profile in result.data:
                print(f"   👤 {profile.get('email')} - {profile.get('full_name')} ({profile.get('role')})")
        else:
            print("❌ Ainda não consegue acessar perfis")
            
    except Exception as e:
        print(f"❌ Erro no teste direto: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 TESTE CONCLUÍDO")

if __name__ == "__main__":
    test_fix_rls()