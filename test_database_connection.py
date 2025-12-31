#!/usr/bin/env python3
"""
Teste de conexão real com o banco Supabase
"""

import os
import sys

# Definir variáveis de ambiente antes de importar
os.environ["SUPABASE_URL"] = "https://vtynmmtuvxreiwcxxlma.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

sys.path.append('agent/src')

from services.supabase_client import get_supabase_client

def test_database_connection():
    """Testa conexão com o banco e verifica tabelas"""
    try:
        print("🔍 Testando conexão com Supabase...")
        
        # Obter cliente
        supabase = get_supabase_client()
        print("✅ Cliente Supabase criado")
        
        # Testar consulta simples
        result = supabase.table("information_schema.tables").select("table_name").eq("table_schema", "public").execute()
        
        if result.data:
            print(f"✅ Conexão funcionando! Encontradas {len(result.data)} tabelas públicas")
            
            # Filtrar tabelas relacionadas ao SICC
            sicc_tables = [row['table_name'] for row in result.data if 'memory' in row['table_name'].lower() or 'learning' in row['table_name'].lower()]
            
            if sicc_tables:
                print(f"✅ Tabelas SICC encontradas: {sicc_tables}")
            else:
                print("⚠️  Nenhuma tabela SICC encontrada")
                
            # Listar algumas tabelas para debug
            all_tables = [row['table_name'] for row in result.data]
            print(f"📋 Primeiras 10 tabelas: {all_tables[:10]}")
            
        else:
            print("❌ Nenhuma tabela encontrada")
            
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = test_database_connection()
    sys.exit(0 if success else 1)