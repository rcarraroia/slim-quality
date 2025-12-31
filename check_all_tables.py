#!/usr/bin/env python3
"""
Script para mapear todas as tabelas do banco Slim Quality
"""

import os
from supabase import create_client

def check_all_tables():
    """Verifica todas as tabelas existentes"""
    try:
        print("🔍 Mapeando todas as tabelas do banco...")
        
        # Credenciais diretas
        url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
        key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
        
        # Criar cliente
        supabase = create_client(url, key)
        print("✅ Cliente Supabase criado")
        
        # Lista de tabelas possíveis baseada nos arquivos do projeto
        possible_tables = [
            # Tabelas SICC (já confirmadas)
            "memory_chunks",
            "sub_agents", 
            "behavior_patterns",
            "learning_logs",
            "agent_performance_metrics",
            
            # Tabelas de agente/conversas
            "conversations",
            "messages",
            "agent_sessions",
            "agent_configs",
            "agent_logs",
            
            # Tabelas de automação (vistas em outros arquivos)
            "automation_rules",
            "automation_logs",
            "automation_triggers",
            
            # Tabelas de afiliados
            "affiliates",
            "affiliate_network",
            "commissions",
            "referral_clicks",
            "referral_conversions",
            
            # Tabelas de vendas
            "orders",
            "order_items",
            "payments",
            "customers",
            
            # Tabelas de produtos
            "products",
            "product_categories",
            
            # Tabelas de usuários
            "profiles",
            "user_roles",
            
            # Tabelas Asaas
            "asaas_wallets",
            "asaas_transactions",
            "asaas_splits",
            
            # Outras possíveis
            "webhooks",
            "notifications",
            "settings",
            "api_keys"
        ]
        
        print(f"\n🔍 Verificando {len(possible_tables)} tabelas possíveis...")
        
        found_tables = []
        missing_tables = []
        table_info = {}
        
        for table_name in possible_tables:
            try:
                # Tentar fazer uma consulta simples na tabela
                result = supabase.table(table_name).select("*").limit(1).execute()
                
                found_tables.append(table_name)
                
                # Contar registros
                count_result = supabase.table(table_name).select("*", count="exact").execute()
                record_count = count_result.count if hasattr(count_result, 'count') else len(result.data)
                
                table_info[table_name] = {
                    'exists': True,
                    'count': record_count,
                    'sample_data': result.data[0] if result.data else None
                }
                
                print(f"✅ {table_name}: {record_count} registros")
                    
            except Exception as e:
                missing_tables.append(table_name)
                table_info[table_name] = {
                    'exists': False,
                    'error': str(e)
                }
                print(f"❌ {table_name}: NÃO ENCONTRADA")
        
        # Resumo detalhado
        print(f"\n📊 RESUMO COMPLETO:")
        print(f"✅ Tabelas encontradas: {len(found_tables)}")
        print(f"❌ Tabelas não encontradas: {len(missing_tables)}")
        
        if found_tables:
            print(f"\n✅ TABELAS EXISTENTES:")
            for table in sorted(found_tables):
                info = table_info[table]
                print(f"  - {table}: {info['count']} registros")
                
                # Mostrar estrutura básica se houver dados
                if info['sample_data']:
                    keys = list(info['sample_data'].keys())[:5]  # Primeiras 5 colunas
                    print(f"    Colunas: {', '.join(keys)}{'...' if len(info['sample_data'].keys()) > 5 else ''}")
        
        # Focar nas tabelas relacionadas ao agente
        agent_tables = [t for t in found_tables if any(keyword in t.lower() for keyword in ['agent', 'conversation', 'message', 'memory', 'learning', 'behavior'])]
        
        if agent_tables:
            print(f"\n🤖 TABELAS RELACIONADAS AO AGENTE:")
            for table in agent_tables:
                info = table_info[table]
                print(f"  - {table}: {info['count']} registros")
                if info['sample_data']:
                    print(f"    Estrutura: {list(info['sample_data'].keys())}")
        
        return found_tables, table_info
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        return [], {}

if __name__ == "__main__":
    found_tables, table_info = check_all_tables()
    print(f"\n{'✅ SUCESSO' if found_tables else '❌ FALHA'}: Mapeamento das tabelas")