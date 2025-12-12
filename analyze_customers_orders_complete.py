#!/usr/bin/env python3
"""
ANÁLISE COMPLETA DO MÓDULO DE CLIENTES E PEDIDOS
Verifica estrutura real do banco e identifica o que está implementado
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

# Carregar variáveis de ambiente
load_dotenv()

# Configurar cliente Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def analyze_table_structure(table_name):
    """Analisa estrutura de uma tabela"""
    print(f"\n📋 ANALISANDO TABELA: {table_name}")
    print("=" * 50)
    
    try:
        # Verificar se tabela existe
        result = supabase.rpc('exec_sql', {
            'sql': f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '{table_name}'
            );
            """
        }).execute()
        
        if not result.data[0]['exec_sql']:
            print(f"❌ Tabela '{table_name}' NÃO EXISTE")
            return None
            
        print(f"✅ Tabela '{table_name}' EXISTE")
        
        # Obter estrutura da tabela
        structure_result = supabase.rpc('exec_sql', {
            'sql': f"""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = '{table_name}' 
            ORDER BY ordinal_position;
            """
        }).execute()
        
        columns = structure_result.data[0]['exec_sql'] if structure_result.data else []
        
        print(f"📊 COLUNAS ({len(columns)}):")
        for col in columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
            max_len = f"({col['character_maximum_length']})" if col['character_maximum_length'] else ""
            print(f"  • {col['column_name']}: {col['data_type']}{max_len} {nullable}{default}")
        
        # Verificar constraints
        constraints_result = supabase.rpc('exec_sql', {
            'sql': f"""
            SELECT 
                constraint_name,
                constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = '{table_name}';
            """
        }).execute()
        
        constraints = constraints_result.data[0]['exec_sql'] if constraints_result.data else []
        
        if constraints:
            print(f"\n🔒 CONSTRAINTS ({len(constraints)}):")
            for constraint in constraints:
                print(f"  • {constraint['constraint_name']}: {constraint['constraint_type']}")
        
        # Contar registros
        count_result = supabase.rpc('exec_sql', {
            'sql': f"SELECT COUNT(*) as total FROM {table_name};"
        }).execute()
        
        total = count_result.data[0]['exec_sql'][0]['total'] if count_result.data else 0
        print(f"\n📈 REGISTROS: {total}")
        
        return {
            'exists': True,
            'columns': columns,
            'constraints': constraints,
            'record_count': total
        }
        
    except Exception as e:
        print(f"❌ Erro ao analisar tabela '{table_name}': {str(e)}")
        return None

def analyze_check_constraints(table_name):
    """Analisa check constraints específicas"""
    try:
        result = supabase.rpc('exec_sql', {
            'sql': f"""
            SELECT 
                cc.constraint_name,
                cc.check_clause
            FROM information_schema.check_constraints cc
            JOIN information_schema.constraint_column_usage ccu 
                ON cc.constraint_name = ccu.constraint_name
            WHERE ccu.table_name = '{table_name}';
            """
        }).execute()
        
        constraints = result.data[0]['exec_sql'] if result.data else []
        
        if constraints:
            print(f"\n🔍 CHECK CONSTRAINTS para {table_name}:")
            for constraint in constraints:
                print(f"  • {constraint['constraint_name']}: {constraint['check_clause']}")
        
        return constraints
        
    except Exception as e:
        print(f"❌ Erro ao verificar check constraints: {str(e)}")
        return []

def analyze_foreign_keys(table_name):
    """Analisa foreign keys de uma tabela"""
    try:
        result = supabase.rpc('exec_sql', {
            'sql': f"""
            SELECT 
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.key_column_usage kcu
            JOIN information_schema.constraint_column_usage ccu 
                ON kcu.constraint_name = ccu.constraint_name
            JOIN information_schema.table_constraints tc 
                ON kcu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND kcu.table_name = '{table_name}';
            """
        }).execute()
        
        fks = result.data[0]['exec_sql'] if result.data else []
        
        if fks:
            print(f"\n🔗 FOREIGN KEYS para {table_name}:")
            for fk in fks:
                print(f"  • {fk['column_name']} → {fk['foreign_table_name']}.{fk['foreign_column_name']}")
        
        return fks
        
    except Exception as e:
        print(f"❌ Erro ao verificar foreign keys: {str(e)}")
        return []

def main():
    print("🔍 ANÁLISE COMPLETA DO MÓDULO DE CLIENTES E PEDIDOS")
    print("=" * 60)
    
    # Tabelas relacionadas ao módulo de vendas
    tables_to_analyze = [
        'customers',
        'orders', 
        'order_items',
        'payments',
        'shipping_addresses',
        'order_status_history',
        'asaas_transactions',
        'asaas_splits'
    ]
    
    analysis_results = {}
    
    for table in tables_to_analyze:
        result = analyze_table_structure(table)
        if result:
            analyze_check_constraints(table)
            analyze_foreign_keys(table)
            analysis_results[table] = result
        print("\n" + "-" * 60)
    
    # Resumo final
    print("\n📊 RESUMO DA ANÁLISE")
    print("=" * 40)
    
    existing_tables = [table for table, data in analysis_results.items() if data['exists']]
    missing_tables = [table for table in tables_to_analyze if table not in existing_tables]
    
    print(f"✅ TABELAS EXISTENTES ({len(existing_tables)}):")
    for table in existing_tables:
        count = analysis_results[table]['record_count']
        print(f"  • {table}: {count} registros")
    
    if missing_tables:
        print(f"\n❌ TABELAS FALTANTES ({len(missing_tables)}):")
        for table in missing_tables:
            print(f"  • {table}")
    
    # Salvar análise em arquivo
    with open('customers_orders_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(analysis_results, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"\n💾 Análise salva em: customers_orders_analysis.json")
    
    # Verificar implementação frontend
    print(f"\n🎯 PRÓXIMOS PASSOS IDENTIFICADOS:")
    print("1. Corrigir constraint 'customers_source_valid'")
    print("2. Implementar botão 'Comprar Agora' nas páginas de produto")
    print("3. Integrar AffiliateAwareCheckout com páginas públicas")
    print("4. Testar fluxo completo de compra com rastreamento de afiliados")

if __name__ == "__main__":
    main()