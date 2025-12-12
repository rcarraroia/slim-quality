#!/usr/bin/env python3
"""
ANÁLISE DIRETA DO MÓDULO DE CLIENTES E PEDIDOS
Verifica estrutura real do banco usando queries diretas
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

def check_table_exists(table_name):
    """Verifica se uma tabela existe"""
    try:
        # Tentar fazer uma query simples na tabela
        result = supabase.table(table_name).select("*").limit(1).execute()
        return True, len(result.data) if result.data else 0
    except Exception as e:
        return False, str(e)

def get_table_sample(table_name, limit=3):
    """Obtém uma amostra de dados da tabela"""
    try:
        result = supabase.table(table_name).select("*").limit(limit).execute()
        return result.data
    except Exception as e:
        return f"Erro: {str(e)}"

def analyze_customers_table():
    """Análise específica da tabela customers"""
    print("\n📋 ANÁLISE DETALHADA: CUSTOMERS")
    print("=" * 50)
    
    exists, info = check_table_exists('customers')
    
    if not exists:
        print(f"❌ Tabela 'customers' NÃO EXISTE")
        print(f"   Erro: {info}")
        return None
    
    print(f"✅ Tabela 'customers' EXISTE")
    
    # Tentar inserir um registro de teste para descobrir constraints
    test_customer = {
        'name': 'Teste Análise',
        'email': 'teste.analise@email.com',
        'phone': '11999999999',
        'cpf': '12345678901',
        'address': 'Rua Teste',
        'number': '123',
        'complement': 'Apto 1',
        'neighborhood': 'Centro',
        'city': 'São Paulo',
        'state': 'SP',
        'zip_code': '01234-567',
        'source': 'website',  # Vamos testar diferentes valores
        'status': 'active'
    }
    
    print("\n🧪 TESTANDO INSERÇÃO PARA DESCOBRIR CONSTRAINTS...")
    
    # Testar diferentes valores de source
    sources_to_test = ['website', 'whatsapp', 'affiliate', 'direct', 'organic', 'paid']
    
    for source in sources_to_test:
        try:
            test_data = test_customer.copy()
            test_data['source'] = source
            test_data['email'] = f'teste.{source}@email.com'
            
            result = supabase.table('customers').insert(test_data).execute()
            
            if result.data:
                print(f"✅ Source '{source}' é VÁLIDO")
                # Remover o registro de teste
                supabase.table('customers').delete().eq('email', test_data['email']).execute()
            
        except Exception as e:
            if 'customers_source_valid' in str(e):
                print(f"❌ Source '{source}' é INVÁLIDO")
            else:
                print(f"❌ Erro com source '{source}': {str(e)}")
    
    # Obter amostra de dados reais
    print(f"\n📊 AMOSTRA DE DADOS REAIS:")
    sample = get_table_sample('customers', 2)
    
    if isinstance(sample, list) and sample:
        print(f"   Registros encontrados: {len(sample)}")
        for i, record in enumerate(sample, 1):
            print(f"   Registro {i}:")
            for key, value in record.items():
                if key not in ['created_at', 'updated_at']:  # Pular timestamps
                    print(f"     • {key}: {value}")
    else:
        print(f"   {sample}")
    
    return True

def analyze_orders_table():
    """Análise específica da tabela orders"""
    print("\n📋 ANÁLISE DETALHADA: ORDERS")
    print("=" * 50)
    
    exists, info = check_table_exists('orders')
    
    if not exists:
        print(f"❌ Tabela 'orders' NÃO EXISTE")
        print(f"   Erro: {info}")
        return None
    
    print(f"✅ Tabela 'orders' EXISTE")
    
    # Obter amostra de dados
    sample = get_table_sample('orders', 2)
    
    if isinstance(sample, list) and sample:
        print(f"📊 AMOSTRA DE DADOS ({len(sample)} registros):")
        for i, record in enumerate(sample, 1):
            print(f"   Registro {i}:")
            for key, value in record.items():
                if key not in ['created_at', 'updated_at']:
                    print(f"     • {key}: {value}")
    else:
        print(f"📊 DADOS: {sample}")
    
    return True

def analyze_related_tables():
    """Análise das tabelas relacionadas"""
    print("\n📋 ANÁLISE DE TABELAS RELACIONADAS")
    print("=" * 50)
    
    related_tables = [
        'order_items',
        'payments', 
        'shipping_addresses',
        'order_status_history',
        'asaas_transactions',
        'asaas_splits'
    ]
    
    results = {}
    
    for table in related_tables:
        exists, info = check_table_exists(table)
        results[table] = {
            'exists': exists,
            'info': info
        }
        
        if exists:
            print(f"✅ {table}: EXISTE")
            sample = get_table_sample(table, 1)
            if isinstance(sample, list) and sample:
                print(f"   📊 Campos disponíveis: {list(sample[0].keys())}")
            else:
                print(f"   📊 Tabela vazia ou erro: {sample}")
        else:
            print(f"❌ {table}: NÃO EXISTE - {info}")
    
    return results

def main():
    print("🔍 ANÁLISE COMPLETA DO MÓDULO DE CLIENTES E PEDIDOS")
    print("=" * 60)
    
    # Análise das tabelas principais
    customers_result = analyze_customers_table()
    orders_result = analyze_orders_table()
    related_results = analyze_related_tables()
    
    # Resumo final
    print("\n📊 RESUMO EXECUTIVO")
    print("=" * 40)
    
    existing_tables = []
    missing_tables = []
    
    # Verificar customers e orders
    if customers_result:
        existing_tables.append('customers')
    else:
        missing_tables.append('customers')
        
    if orders_result:
        existing_tables.append('orders')
    else:
        missing_tables.append('orders')
    
    # Verificar tabelas relacionadas
    for table, result in related_results.items():
        if result['exists']:
            existing_tables.append(table)
        else:
            missing_tables.append(table)
    
    print(f"✅ TABELAS EXISTENTES ({len(existing_tables)}):")
    for table in existing_tables:
        print(f"   • {table}")
    
    if missing_tables:
        print(f"\n❌ TABELAS FALTANTES ({len(missing_tables)}):")
        for table in missing_tables:
            print(f"   • {table}")
    
    # Análise do fluxo de vendas atual
    print(f"\n🎯 ANÁLISE DO FLUXO DE VENDAS:")
    
    if 'customers' in existing_tables and 'orders' in existing_tables:
        print("✅ Estrutura básica de vendas EXISTE")
        print("✅ Pode implementar botão 'Comprar Agora'")
    else:
        print("❌ Estrutura básica de vendas INCOMPLETA")
        print("❌ Precisa criar tabelas antes do 'Comprar Agora'")
    
    # Próximos passos
    print(f"\n📋 PRÓXIMOS PASSOS RECOMENDADOS:")
    
    if customers_result:
        print("1. ✅ Corrigir constraint 'customers_source_valid'")
        print("2. ✅ Implementar botão 'Comprar Agora'")
        print("3. ✅ Integrar AffiliateAwareCheckout")
    else:
        print("1. ❌ CRIAR tabela 'customers' primeiro")
        print("2. ❌ CRIAR tabela 'orders' depois")
        print("3. ❌ SÓ ENTÃO implementar 'Comprar Agora'")
    
    # Salvar resultados
    analysis_data = {
        'customers': customers_result,
        'orders': orders_result,
        'related_tables': related_results,
        'existing_tables': existing_tables,
        'missing_tables': missing_tables
    }
    
    with open('customers_orders_analysis_direct.json', 'w', encoding='utf-8') as f:
        json.dump(analysis_data, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"\n💾 Análise completa salva em: customers_orders_analysis_direct.json")

if __name__ == "__main__":
    main()