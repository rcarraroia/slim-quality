#!/usr/bin/env python3
"""
Analisar o dump do Supabase para encontrar tabelas relacionadas ao agente
"""

# Lista de tabelas extraídas do dump
tables_from_dump = [
    "affiliate_network",
    "affiliates", 
    "withdrawals",
    "affiliate_withdrawal_summary",
    "agent_performance_metrics",  # ← AGENTE!
    "appointments",
    "asaas_splits",
    "asaas_transactions", 
    "asaas_wallets",
    "asaas_webhook_logs",
    "auth_logs",
    "automation_rules",  # ← AUTOMAÇÃO!
    "rule_execution_logs",
    "automation_execution_stats",  # ← AUTOMAÇÃO!
    "behavior_patterns",  # ← COMPORTAMENTO/SICC!
    "commission_logs",
    "commission_logs_summary",
    "commission_splits",
    "commissions",
    "conversations",
    "customer_tag_assignments",
    "customer_tags",
    "customer_timeline",
    "customers",
    "inventory_logs",
    "learning_logs",  # ← APRENDIZADO/SICC!
    "memory_chunks",  # ← MEMÓRIA/SICC!
    "messages",
    "notification_logs",
    "notification_summary",
    "order_items",
    "order_status_history",
    "orders",
    "payments",
    "product_images",
    "products",
    "product_inventory",
    "product_technologies",
    "profiles",
    "referral_clicks",
    "referral_codes",
    "referral_conversions",
    "shipping_addresses",
    "sub_agents",  # ← SUB-AGENTES!
    "technologies",
    "user_roles",
    "wallet_cache_stats",
    "webhook_logs",
    "withdrawal_logs",
    "withdrawal_stats"
]

def main():
    print("🔍 ANÁLISE DAS TABELAS DO BANCO REAL")
    print("=" * 50)
    
    # Filtrar tabelas relacionadas ao agente
    agent_keywords = ['agent', 'sicc', 'memory', 'learning', 'behavior', 'automation', 'sub_agent']
    
    agent_tables = []
    for table in tables_from_dump:
        for keyword in agent_keywords:
            if keyword in table.lower():
                agent_tables.append(table)
                break
    
    print(f"📊 Total de tabelas no banco: {len(tables_from_dump)}")
    print(f"🤖 Tabelas relacionadas ao agente: {len(agent_tables)}")
    print()
    
    print("🤖 TABELAS RELACIONADAS AO AGENTE ENCONTRADAS:")
    for table in agent_tables:
        print(f"  ✅ {table}")
    
    print()
    print("📋 ANÁLISE POR FUNCIONALIDADE:")
    print()
    
    # Configuração do Agente
    config_tables = [t for t in agent_tables if 'config' in t.lower() or 'setting' in t.lower()]
    if config_tables:
        print("⚙️ CONFIGURAÇÃO DO AGENTE:")
        for table in config_tables:
            print(f"  - {table}")
    else:
        print("❌ CONFIGURAÇÃO DO AGENTE: Nenhuma tabela específica encontrada")
    
    print()
    
    # SICC (Sistema de Aprendizado)
    sicc_tables = [t for t in agent_tables if any(keyword in t.lower() for keyword in ['memory', 'learning', 'behavior'])]
    if sicc_tables:
        print("🧠 SISTEMA SICC (Aprendizado):")
        for table in sicc_tables:
            print(f"  - {table}")
    else:
        print("❌ SISTEMA SICC: Nenhuma tabela específica encontrada")
    
    print()
    
    # Performance e Métricas
    metrics_tables = [t for t in agent_tables if 'performance' in t.lower() or 'metric' in t.lower() or 'stats' in t.lower()]
    if metrics_tables:
        print("📊 MÉTRICAS E PERFORMANCE:")
        for table in metrics_tables:
            print(f"  - {table}")
    else:
        print("❌ MÉTRICAS: Nenhuma tabela específica encontrada")
    
    print()
    
    # Automação
    automation_tables = [t for t in agent_tables if 'automation' in t.lower() or 'rule' in t.lower()]
    if automation_tables:
        print("🔄 AUTOMAÇÃO:")
        for table in automation_tables:
            print(f"  - {table}")
    else:
        print("❌ AUTOMAÇÃO: Nenhuma tabela específica encontrada")
    
    print()
    
    # Sub-agentes
    subagent_tables = [t for t in agent_tables if 'sub_agent' in t.lower()]
    if subagent_tables:
        print("👥 SUB-AGENTES:")
        for table in subagent_tables:
            print(f"  - {table}")
    else:
        print("❌ SUB-AGENTES: Nenhuma tabela específica encontrada")
    
    print()
    print("🎯 CONCLUSÕES:")
    print()
    
    # Análise das páginas vs tabelas
    print("📄 MAPEAMENTO PÁGINAS → TABELAS:")
    print()
    
    print("1. /dashboard/agente/configuracao")
    print("   📝 Dados salvos: model, temperature, max_tokens, system_prompt, sicc_enabled")
    print("   🔍 Tabelas possíveis:")
    if 'agent_performance_metrics' in agent_tables:
        print("     ✅ agent_performance_metrics (pode conter configurações)")
    else:
        print("     ❌ Nenhuma tabela específica de configuração encontrada")
    print("     ❓ Possível: dados em JSON em outra tabela ou variáveis de ambiente")
    print()
    
    print("2. /dashboard/agente/sicc")
    print("   📝 Dados salvos: sicc_enabled, auto_approval_threshold, embedding_model, memory_quota")
    print("   🔍 Tabelas possíveis:")
    for table in sicc_tables:
        print(f"     ✅ {table}")
    if not sicc_tables:
        print("     ❌ Nenhuma tabela SICC específica encontrada")
    print()
    
    print("🚨 PROBLEMA IDENTIFICADO:")
    print("   ❌ Não há tabelas específicas para configuração do agente")
    print("   ❌ As configurações podem estar sendo armazenadas em:")
    print("     - Variáveis de ambiente (.env)")
    print("     - Arquivos de configuração locais")
    print("     - Campos JSON em outras tabelas")
    print("     - Ou não estão sendo persistidas (apenas em memória)")
    print()
    
    print("✅ RECOMENDAÇÃO:")
    print("   Criar tabelas específicas:")
    print("   - agent_config (configurações gerais do agente)")
    print("   - sicc_config (configurações do sistema SICC)")
    print("   - Ou usar campos JSON em tabelas existentes")

if __name__ == "__main__":
    main()