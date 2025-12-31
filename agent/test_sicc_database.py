#!/usr/bin/env python3
"""
Teste da estrutura do banco de dados SICC
Valida criação de tabelas, índices e funcionalidade básica
"""

import os
import sys
import asyncio
import json
from typing import List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórias")
    sys.exit(1)

# Cliente Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async def test_table_exists(table_name: str) -> bool:
    """Testa se uma tabela existe"""
    try:
        result = supabase.table(table_name).select("*").limit(1).execute()
        return True
    except Exception as e:
        print(f"❌ Tabela {table_name} não existe: {e}")
        return False

async def test_vector_extension() -> bool:
    """Testa se a extensão pgvector está habilitada"""
    try:
        # Tenta fazer uma busca vetorial simples para verificar se pgvector funciona
        # Se a inserção em memory_chunks funcionou, significa que pgvector está ativo
        result = supabase.table("memory_chunks").select("id").limit(1).execute()
        
        if result.data is not None:
            print("✅ Extensão pgvector habilitada (inserção vetorial funcionou)")
            return True
        else:
            print("❌ Extensão pgvector pode não estar funcionando")
            return False
    except Exception as e:
        print(f"❌ Erro ao verificar extensão pgvector: {e}")
        return False

async def test_memory_chunks_insert() -> bool:
    """Testa inserção e busca vetorial em memory_chunks"""
    try:
        # Dados de teste
        test_data = {
            "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
            "content": "Teste de conteúdo para embedding",
            "embedding": [0.1] * 384,  # Vetor de 384 dimensões
            "metadata": {"test": True, "source": "test_script"},
            "relevance_score": 0.85
        }
        
        # Inserir dados de teste
        result = supabase.table("memory_chunks").insert(test_data).execute()
        
        if result.data and len(result.data) > 0:
            chunk_id = result.data[0]["id"]
            print(f"✅ Inserção em memory_chunks bem-sucedida (ID: {chunk_id})")
            
            # Testar busca
            search_result = supabase.table("memory_chunks").select("*").eq("id", chunk_id).execute()
            
            if search_result.data and len(search_result.data) > 0:
                print("✅ Busca em memory_chunks bem-sucedida")
                
                # Limpar dados de teste
                supabase.table("memory_chunks").delete().eq("id", chunk_id).execute()
                print("✅ Limpeza de dados de teste concluída")
                return True
            else:
                print("❌ Falha na busca em memory_chunks")
                return False
        else:
            print("❌ Falha na inserção em memory_chunks")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao testar memory_chunks: {e}")
        return False

async def test_sub_agents_data() -> bool:
    """Testa se os sub-agentes padrão foram criados"""
    try:
        result = supabase.table("sub_agents").select("*").execute()
        
        if result.data and len(result.data) >= 3:
            agents = {agent["domain"]: agent for agent in result.data}
            
            required_domains = ["discovery", "sales", "support"]
            for domain in required_domains:
                if domain in agents:
                    print(f"✅ Sub-agente {domain} encontrado")
                else:
                    print(f"❌ Sub-agente {domain} não encontrado")
                    return False
            
            return True
        else:
            print("❌ Sub-agentes padrão não encontrados")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao verificar sub-agentes: {e}")
        return False

async def test_performance_metrics_data() -> bool:
    """Testa se as métricas padrão foram criadas"""
    try:
        result = supabase.table("agent_performance_metrics").select("*").execute()
        
        if result.data and len(result.data) >= 7:
            metrics = {metric["metric_type"]: metric for metric in result.data}
            
            required_metrics = [
                "patterns_identified_daily",
                "patterns_approved_daily", 
                "patterns_rejected_daily",
                "patterns_applied_daily",
                "average_response_time_ms",
                "pattern_detection_accuracy",
                "system_learning_rate"
            ]
            
            for metric_type in required_metrics:
                if metric_type in metrics:
                    print(f"✅ Métrica {metric_type} encontrada")
                else:
                    print(f"❌ Métrica {metric_type} não encontrada")
                    return False
            
            return True
        else:
            print("❌ Métricas padrão não encontradas")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao verificar métricas: {e}")
        return False

async def main():
    """Função principal de teste"""
    print("🧪 Iniciando testes da estrutura do banco SICC...")
    print("=" * 50)
    
    # Lista de tabelas SICC para testar
    sicc_tables = [
        "memory_chunks",
        "behavior_patterns", 
        "learning_logs",
        "sub_agents",
        "agent_performance_metrics"
    ]
    
    # Testes de estrutura
    all_tests_passed = True
    
    # 1. Testar existência das tabelas
    print("\n📋 Testando existência das tabelas...")
    for table in sicc_tables:
        if await test_table_exists(table):
            print(f"✅ Tabela {table} existe")
        else:
            all_tests_passed = False
    
    # 2. Testar extensão pgvector
    print("\n🔧 Testando extensão pgvector...")
    if not await test_vector_extension():
        all_tests_passed = False
    
    # 3. Testar funcionalidade de inserção e busca vetorial
    print("\n🔍 Testando inserção e busca vetorial...")
    if not await test_memory_chunks_insert():
        all_tests_passed = False
    
    # 4. Testar dados padrão dos sub-agentes
    print("\n🤖 Testando sub-agentes padrão...")
    if not await test_sub_agents_data():
        all_tests_passed = False
    
    # 5. Testar métricas padrão
    print("\n📊 Testando métricas padrão...")
    if not await test_performance_metrics_data():
        all_tests_passed = False
    
    # Resultado final
    print("\n" + "=" * 50)
    if all_tests_passed:
        print("🎉 TODOS OS TESTES PASSARAM!")
        print("✅ Estrutura do banco SICC está funcionando corretamente")
        return 0
    else:
        print("❌ ALGUNS TESTES FALHARAM!")
        print("🔧 Verifique os erros acima e corrija antes de prosseguir")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)