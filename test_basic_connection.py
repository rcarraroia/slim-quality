#!/usr/bin/env python3
"""
Teste Básico de Conexão - Verificar se Supabase está acessível
"""

from supabase import create_client, Client

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def test_basic_connection():
    print("🔍 TESTE BÁSICO DE CONEXÃO")
    print("=" * 40)
    
    try:
        # Criar cliente com anon key (como frontend)
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Testar acesso básico a tabelas
        tables_to_test = ['profiles', 'conversations', 'products', 'orders']
        
        for table in tables_to_test:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                print(f"✅ {table}: {len(result.data)} registros")
            except Exception as e:
                print(f"❌ {table}: {str(e)}")
                
        print("\n" + "=" * 40)
        print("🏁 TESTE CONCLUÍDO")
        
    except Exception as e:
        print(f"💥 ERRO GERAL: {str(e)}")

if __name__ == "__main__":
    test_basic_connection()