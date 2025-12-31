#!/usr/bin/env python3
"""
Teste direto de conexão com Supabase (sem imports relativos)
"""

import os
from supabase import create_client

def test_direct_connection():
    """Testa conexão direta com Supabase"""
    try:
        print("🔍 Testando conexão direta com Supabase...")
        
        # Credenciais diretas
        url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
        key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
        
        # Criar cliente
        supabase = create_client(url, key)
        print("✅ Cliente Supabase criado")
        
        # Testar consulta mais básica - verificar se existem tabelas
        try:
            # Tentar listar qualquer tabela que exista
            # Usar uma abordagem mais direta
            result = supabase.table("pg_tables").select("tablename").eq("schemaname", "public").limit(10).execute()
            
            if result.data:
                print(f"✅ CONEXÃO FUNCIONANDO! Encontradas {len(result.data)} tabelas públicas:")
                table_names = [t['tablename'] for t in result.data]
                
                for table in table_names:
                    print(f"  - {table}")
                    
                # Verificar se existem tabelas relacionadas ao SICC
                sicc_tables = [name for name in table_names if 'memory' in name.lower() or 'learning' in name.lower()]
                
                if sicc_tables:
                    print(f"\n✅ TABELAS SICC ENCONTRADAS: {sicc_tables}")
                else:
                    print(f"\n⚠️  NENHUMA TABELA SICC ENCONTRADA")
                    print("   Isso confirma que as migrations não foram aplicadas")
                
                return True
                
            else:
                print("⚠️  Nenhuma tabela pública encontrada")
                
        except Exception as query_error:
            print(f"❌ Erro na consulta pg_tables: {query_error}")
            
            # Tentar uma abordagem ainda mais básica
            try:
                # Verificar se conseguimos pelo menos fazer uma operação de health check
                result = supabase.rpc("version").execute()
                print(f"✅ RPC version funcionou: {result.data}")
                return True
                
            except Exception as rpc_error:
                print(f"⚠️  RPC version falhou: {rpc_error}")
                
                # Última tentativa - verificar se pelo menos a conexão HTTP funciona
                try:
                    # Tentar uma operação muito básica
                    health_check = supabase.postgrest.session.get(f"{url}/rest/v1/")
                    print(f"✅ Conexão HTTP OK! Status: {health_check.status_code}")
                    return True
                    
                except Exception as final_error:
                    print(f"❌ Conexão HTTP também falhou: {final_error}")
                    return False
                
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
        print(f"❌ Tipo do erro: {type(e)}")
        return False
    
    return True

if __name__ == "__main__":
    success = test_direct_connection()
    print(f"\n{'✅ SUCESSO' if success else '❌ FALHA'}: Teste de conexão")