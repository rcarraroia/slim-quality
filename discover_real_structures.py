#!/usr/bin/env python3
"""
Descobrir estruturas reais das tabelas
"""
from supabase import create_client, Client
import uuid

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def discover_table_structure(table_name):
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print(f"\n🔍 DESCOBRINDO ESTRUTURA: {table_name}")
    print("-" * 50)
    
    # Estratégias para descobrir estrutura
    strategies = [
        'minimal_insert',
        'empty_insert', 
        'single_field_insert'
    ]
    
    for strategy in strategies:
        try:
            test_data = get_minimal_data(table_name, strategy)
            if not test_data:
                continue
                
            print(f"Tentativa: {strategy}")
            result = supabase.table(table_name).insert(test_data).execute()
            
            if result.data:
                record_id = result.data[0]['id']
                print(f"✅ Sucesso! Estrutura descoberta:")
                
                columns = list(result.data[0].keys())
                for col in sorted(columns):
                    value = result.data[0][col]
                    print(f"   - {col}: {type(value).__name__} = {value}")
                
                # Limpar
                supabase.table(table_name).delete().eq('id', record_id).execute()
                return columns
                
        except Exception as e:
            error_msg = str(e)
            print(f"❌ {strategy}: {error_msg[:80]}...")
            
            # Analisar erro para descobrir campos obrigatórios
            if "not-null constraint" in error_msg:
                field = extract_field_from_error(error_msg)
                if field:
                    print(f"   → Campo obrigatório identificado: {field}")
            elif "Could not find" in error_msg:
                field = extract_missing_field(error_msg)
                if field:
                    print(f"   → Campo não existe: {field}")
    
    return None

def get_minimal_data(table_name, strategy):
    """Gerar dados mínimos para teste"""
    
    if strategy == 'empty_insert':
        return {}
    
    elif strategy == 'minimal_insert':
        if table_name == 'customers':
            return {
                'name': 'Teste',
                'email': 'teste@email.com'
            }
        elif table_name == 'orders':
            return {
                'customer_name': 'Teste',
                'total_cents': 100
            }
        elif table_name == 'order_items':
            return {
                'product_name': 'Teste',
                'quantity': 1,
                'product_sku': 'TEST001'
            }
        elif table_name == 'payments':
            return {
                'amount_cents': 100,
                'status': 'pending'
            }
        elif table_name == 'shipping_addresses':
            return {
                'recipient_name': 'Teste',
                'street': 'Rua Teste'
            }
        elif table_name == 'conversations':
            return {
                'subject': 'Teste',
                'status': 'open'
            }
        elif table_name == 'appointments':
            return {
                'title': 'Teste',
                'scheduled_at': '2025-12-15T10:00:00Z'
            }
    
    elif strategy == 'single_field_insert':
        # Tentar com apenas um campo comum
        return {'name': 'Teste'} if table_name != 'order_items' else {'quantity': 1}
    
    return None

def extract_field_from_error(error_msg):
    """Extrair nome do campo do erro"""
    try:
        if 'column "' in error_msg and '" of relation' in error_msg:
            start = error_msg.find('column "') + 8
            end = error_msg.find('" of relation', start)
            return error_msg[start:end]
    except:
        pass
    return None

def extract_missing_field(error_msg):
    """Extrair campo faltante do erro"""
    try:
        if "Could not find the '" in error_msg and "' column" in error_msg:
            start = error_msg.find("Could not find the '") + 20
            end = error_msg.find("' column", start)
            return error_msg[start:end]
    except:
        pass
    return None

def analyze_existing_data():
    """Analisar dados existentes para descobrir estrutura"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print(f"\n📊 ANALISANDO DADOS EXISTENTES")
    print("=" * 50)
    
    # Verificar products que sabemos que tem dados
    try:
        products = supabase.table('products').select('*').limit(1).execute()
        if products.data:
            print("✅ Estrutura de PRODUCTS (referência):")
            for col in sorted(products.data[0].keys()):
                value = products.data[0][col]
                print(f"   - {col}: {type(value).__name__}")
    except Exception as e:
        print(f"❌ Erro ao analisar products: {e}")

def main():
    print("🔍 DESCOBRINDO ESTRUTURAS REAIS DAS TABELAS")
    print("=" * 70)
    
    # Analisar dados existentes primeiro
    analyze_existing_data()
    
    # Tabelas para descobrir estrutura
    tables = [
        'customers',
        'orders', 
        'order_items',
        'payments',
        'shipping_addresses',
        'conversations',
        'appointments'
    ]
    
    discovered_structures = {}
    
    for table in tables:
        columns = discover_table_structure(table)
        discovered_structures[table] = columns
    
    # Resumo
    print(f"\n📋 RESUMO DAS ESTRUTURAS DESCOBERTAS")
    print("=" * 70)
    
    for table, columns in discovered_structures.items():
        if columns:
            print(f"✅ {table}: {len(columns)} colunas descobertas")
        else:
            print(f"❌ {table}: Estrutura não descoberta")
    
    return discovered_structures

if __name__ == "__main__":
    structures = main()
    
    # Salvar resultados
    import json
    with open('discovered_structures.json', 'w') as f:
        json.dump(structures, f, indent=2)
    
    print(f"\n💾 Estruturas salvas em: discovered_structures.json")