#!/usr/bin/env python3
"""
CORREÇÃO ESPECÍFICA - Desabilitar RLS na tabela affiliates
"""

from supabase import create_client, Client

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def fix_affiliates_rls():
    print("🔧 CORRIGINDO RLS NA TABELA AFFILIATES")
    print("=" * 50)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    try:
        # Desabilitar RLS na tabela affiliates
        result = supabase.rpc('disable_rls_for_table', {'table_name': 'affiliates'}).execute()
        print("✅ RLS desabilitado na tabela affiliates")
        
        # Testar acesso
        test_result = supabase.table('affiliates').select('*').limit(1).execute()
        print(f"✅ Teste de acesso: {len(test_result.data)} registros encontrados")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao desabilitar RLS: {str(e)}")
        
        # Tentar método alternativo - SQL direto
        try:
            print("🔄 Tentando método alternativo...")
            
            # Executar SQL direto para desabilitar RLS
            sql_result = supabase.rpc('execute_sql', {
                'sql': 'ALTER TABLE affiliates DISABLE ROW LEVEL SECURITY;'
            }).execute()
            
            print("✅ RLS desabilitado via SQL direto")
            return True
            
        except Exception as e2:
            print(f"❌ Método alternativo também falhou: {str(e2)}")
            return False

if __name__ == "__main__":
    success = fix_affiliates_rls()
    if success:
        print("\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO")
    else:
        print("\n💥 CORREÇÃO FALHOU - Intervenção manual necessária")