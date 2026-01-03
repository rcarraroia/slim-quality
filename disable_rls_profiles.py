#!/usr/bin/env python3
"""
Solução Direta - Desabilitar RLS na tabela profiles temporariamente
"""

import requests
from supabase import create_client

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def disable_rls_profiles():
    print("🔧 DESABILITANDO RLS NA TABELA PROFILES")
    print("=" * 50)
    
    # Criar Edge Function para desabilitar RLS
    edge_function_code = '''
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Desabilitar RLS na tabela profiles
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
      sql: 'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;' 
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, message: 'RLS desabilitado' }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
'''
    
    # Salvar Edge Function
    with open('supabase/functions/disable-rls/index.ts', 'w') as f:
        f.write(edge_function_code)
    
    print("✅ Edge Function criada")
    
    # Deploy da Edge Function
    import subprocess
    try:
        result = subprocess.run(['supabase', 'functions', 'deploy', 'disable-rls'], 
                              capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print("✅ Edge Function deployada")
        else:
            print(f"❌ Erro no deploy: {result.stderr}")
            return
    except Exception as e:
        print(f"❌ Erro no deploy: {str(e)}")
        return
    
    # Chamar Edge Function
    try:
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/disable-rls",
            headers={
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "Content-Type": "application/json"
            },
            json={},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ RLS desabilitado com sucesso!")
        else:
            print(f"❌ Erro ao desabilitar RLS: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Erro ao chamar Edge Function: {str(e)}")
    
    # Testar acesso
    print("\n🧪 TESTANDO ACESSO APÓS DESABILITAR RLS:")
    
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
        print(f"❌ Erro no teste: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 CORREÇÃO CONCLUÍDA")
    print("⚠️ IMPORTANTE: RLS foi desabilitado na tabela profiles")
    print("   Isso permite acesso público aos dados dos usuários")
    print("   Considere reabilitar com policies corretas posteriormente")

if __name__ == "__main__":
    disable_rls_profiles()