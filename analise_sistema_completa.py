#!/usr/bin/env python3
"""
Script de Análise Completa do Sistema Slim Quality
IMPORTANTE: Apenas análise e verificação - NÃO faz alterações
"""
from supabase import create_client, Client
import json
from datetime import datetime
from typing import Dict, List, Any

# Credenciais do projeto Slim Quality
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def analyze_database():
    """Análise completa do banco de dados"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("=" * 100)
    print("ANÁLISE COMPLETA DO SISTEMA SLIM QUALITY")
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 100)
    
    # Lista de tabelas do sistema
    tables = [
        # Autenticação e Usuários
        'profiles',
        'user_roles',
        
        # Produtos
        'products',
        'product_images',
        'product_technologies',
        'technologies',
        'inventory_logs',
        
        # Vendas
        'orders',
        'order_items',
        'order_status_history',
        'payments',
        'shipping_addresses',
        
        # Afiliados
        'affiliates',
        'affiliate_network',
        'referral_codes',
        'referral_clicks',
        'referral_conversions',
        'commissions',
        'commission_splits',
        'commission_payments',
        'commission_logs',
        'withdrawals',
        
        # Asaas
        'asaas_transactions',
        'asaas_splits',
        'asaas_wallets',
        'asaas_webhook_logs',
        
        # CRM
        'customers',
        'customer_tags',
        'tags',
        'customer_notes',
        'customer_timeline',
        'conversations',
        'messages',
        'appointments',
        
        # Notificações
        'notification_logs',
    ]
    
    results = {}
    total_records = 0
    
    for table in tables:
        print(f"\n{'='*80}")
        print(f"Tabela: {table}")
        print(f"{'='*80}")
        
        try:
            # 1. Contar registros
            count_response = supabase.table(table).select('*', count='exact').execute()
            count = count_response.count
            
            print(f"✅ Total de registros: {count}")
            total_records += count
            
            # 2. Pegar amostra de dados
            if count > 0:
                sample_response = supabase.table(table).select('*').limit(3).execute()
                sample = sample_response.data
                
                print(f"\n📋 Amostra de dados (primeiros 3 registros):")
                for i, record in enumerate(sample, 1):
                    print(f"\n--- Registro {i} ---")
                    print(json.dumps(record, indent=2, default=str))
                
                # 3. Identificar colunas
                if sample:
                    columns = list(sample[0].keys())
                    print(f"\n🔍 Colunas ({len(columns)}):")
                    for col in columns:
                        print(f"  - {col}")
            
            results[table] = {
                'exists': True,
                'count': count,
                'status': 'OK'
            }
            
        except Exception as e:
            print(f"❌ Erro ao acessar tabela: {str(e)}")
            results[table] = {
                'exists': False,
                'error': str(e),
                'status': 'ERROR'
            }
    
    # Resumo final
    print(f"\n{'='*100}")
    print("RESUMO DA ANÁLISE")
    print(f"{'='*100}")
    
    total_tables = len(tables)
    success_tables = sum(1 for r in results.values() if r.get('status') == 'OK')
    error_tables = total_tables - success_tables
    
    print(f"\n📊 ESTATÍSTICAS GERAIS:")
    print(f"  - Tabelas analisadas: {total_tables}")
    print(f"  - Tabelas acessíveis: {success_tables}")
    print(f"  - Tabelas com erro: {error_tables}")
    print(f"  - Total de registros: {total_records}")
    
    # Detalhamento por módulo
    print(f"\n📦 DETALHAMENTO POR MÓDULO:")
    
    modules = {
        'Autenticação': ['profiles', 'user_roles'],
        'Produtos': ['products', 'product_images', 'product_technologies', 'technologies', 'inventory_logs'],
        'Vendas': ['orders', 'order_items', 'order_status_history', 'payments', 'shipping_addresses'],
        'Afiliados': ['affiliates', 'affiliate_network', 'referral_codes', 'referral_clicks', 
                      'referral_conversions', 'commissions', 'commission_splits', 
                      'commission_payments', 'commission_logs', 'withdrawals'],
        'Asaas': ['asaas_transactions', 'asaas_splits', 'asaas_wallets', 'asaas_webhook_logs'],
        'CRM': ['customers', 'customer_tags', 'tags', 'customer_notes', 'customer_timeline', 
                'conversations', 'messages', 'appointments'],
        'Notificações': ['notification_logs']
    }
    
    for module_name, module_tables in modules.items():
        module_count = sum(results.get(t, {}).get('count', 0) for t in module_tables)
        module_ok = sum(1 for t in module_tables if results.get(t, {}).get('status') == 'OK')
        module_total = len(module_tables)
        
        print(f"\n  {module_name}:")
        print(f"    - Tabelas: {module_ok}/{module_total}")
        print(f"    - Registros: {module_count}")
    
    # Salvar resultado em JSON
    output_file = 'analise_sistema_completa_resultado.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tables': total_tables,
                'success_tables': success_tables,
                'error_tables': error_tables,
                'total_records': total_records
            },
            'modules': {
                module_name: {
                    'tables_ok': sum(1 for t in module_tables if results.get(t, {}).get('status') == 'OK'),
                    'tables_total': len(module_tables),
                    'records': sum(results.get(t, {}).get('count', 0) for t in module_tables)
                }
                for module_name, module_tables in modules.items()
            },
            'tables': results
        }, f, indent=2, default=str)
    
    print(f"\n✅ Resultado salvo em: {output_file}")
    
    return results

def analyze_rls_policies():
    """Análise de políticas RLS"""
    print(f"\n{'='*100}")
    print("ANÁLISE DE POLÍTICAS RLS")
    print(f"{'='*100}")
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Query para verificar políticas RLS
    query = """
    SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
    """
    
    try:
        # Executar via RPC ou função customizada
        print("⚠️ Análise de RLS requer acesso direto ao PostgreSQL")
        print("Recomendação: Usar Supabase CLI ou Dashboard para verificar políticas")
    except Exception as e:
        print(f"❌ Erro: {str(e)}")

def analyze_storage():
    """Análise de storage buckets"""
    print(f"\n{'='*100}")
    print("ANÁLISE DE STORAGE")
    print(f"{'='*100}")
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    try:
        buckets = supabase.storage.list_buckets()
        print(f"\n📦 Buckets encontrados: {len(buckets)}")
        
        for bucket in buckets:
            print(f"\n  - {bucket.name}")
            print(f"    ID: {bucket.id}")
            print(f"    Público: {bucket.public}")
            
            # Listar arquivos no bucket
            try:
                files = supabase.storage.from_(bucket.name).list()
                print(f"    Arquivos: {len(files)}")
            except Exception as e:
                print(f"    Erro ao listar arquivos: {str(e)}")
                
    except Exception as e:
        print(f"❌ Erro ao acessar storage: {str(e)}")

if __name__ == "__main__":
    print("\n🔍 INICIANDO ANÁLISE COMPLETA DO SISTEMA SLIM QUALITY")
    print("⚠️  MODO: SOMENTE LEITURA - Nenhuma alteração será feita\n")
    
    # Análise do banco de dados
    analyze_database()
    
    # Análise de RLS
    analyze_rls_policies()
    
    # Análise de Storage
    analyze_storage()
    
    print(f"\n{'='*100}")
    print("✅ ANÁLISE COMPLETA FINALIZADA")
    print(f"{'='*100}\n")
