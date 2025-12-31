#!/usr/bin/env python3
"""
Teste específico para verificar tabelas SICC
"""

import os
from supabase import create_client

def test_sicc_tables():
    """Testa se as tabelas SICC existem"""
    try:
        print("🔍 Testando tabelas SICC específicas...")
        
        # Credenciais diretas
        url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
        key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
        
        # Criar cliente
        supabase = create_client(url, key)
        print("✅ Cliente Supabase criado")
        
        # Lista de tabelas SICC que deveriam existir (NOMES CORRETOS)
        expected_tables = [
            "memory_chunks",
            "sub_agents", 
            "behavior_patterns",  # CORRIGIDO: era behavioral_patterns
            "learning_logs",
            "agent_performance_metrics"  # CORRIGIDO: era performance_metrics
        ]
        
        print(f"\n🔍 Verificando {len(expected_tables)} tabelas SICC...")
        
        found_tables = []
        missing_tables = []
        
        for table_name in expected_tables:
            try:
                # Tentar fazer uma consulta simples na tabela
                result = supabase.table(table_name).select("*").limit(1).execute()
                
                print(f"✅ {table_name}: EXISTE (pode estar vazia)")
                found_tables.append(table_name)
                
                # Se tem dados, mostrar quantos
                if result.data:
                    print(f"   📊 Contém {len(result.data)} registro(s)")
                else:
                    print(f"   📊 Tabela vazia")
                    
            except Exception as e:
                print(f"❌ {table_name}: NÃO ENCONTRADA - {e}")
                missing_tables.append(table_name)
        
        # Resumo
        print(f"\n📊 RESUMO:")
        print(f"✅ Tabelas encontradas: {len(found_tables)}/{len(expected_tables)}")
        print(f"❌ Tabelas faltando: {len(missing_tables)}")
        
        if found_tables:
            print(f"\n✅ TABELAS FUNCIONAIS:")
            for table in found_tables:
                print(f"  - {table}")
        
        if missing_tables:
            print(f"\n❌ TABELAS FALTANDO:")
            for table in missing_tables:
                print(f"  - {table}")
        
        # Testar uma inserção simples se memory_chunks existir
        if "memory_chunks" in found_tables:
            print(f"\n🧪 Testando inserção em memory_chunks...")
            try:
                import uuid
                
                # Criar embedding de 384 dimensões (padrão OpenAI)
                embedding_384 = [0.1] * 384  # Vetor de 384 dimensões
                
                test_data = {
                    "conversation_id": str(uuid.uuid4()),  # UUID válido
                    "content": "Teste de inserção",
                    "embedding": embedding_384,  # Embedding com 384 dimensões
                    "metadata": {"test": True}
                }
                
                result = supabase.table("memory_chunks").insert(test_data).execute()
                
                if result.data:
                    print(f"✅ Inserção funcionou! ID: {result.data[0].get('id', 'N/A')}")
                    
                    # Testar busca do registro inserido
                    search_result = supabase.table("memory_chunks").select("*").eq("id", result.data[0]['id']).execute()
                    
                    if search_result.data:
                        print(f"✅ Busca funcionou! Conteúdo: {search_result.data[0]['content']}")
                    
                    # Limpar o teste
                    if result.data[0].get('id'):
                        delete_result = supabase.table("memory_chunks").delete().eq("id", result.data[0]['id']).execute()
                        print(f"🧹 Registro de teste removido")
                else:
                    print(f"⚠️  Inserção não retornou dados")
                    
            except Exception as insert_error:
                print(f"❌ Erro na inserção: {insert_error}")
        
        return len(found_tables) > 0
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        return False

if __name__ == "__main__":
    success = test_sicc_tables()
    print(f"\n{'✅ SUCESSO' if success else '❌ FALHA'}: Teste das tabelas SICC")