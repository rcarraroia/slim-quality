#!/usr/bin/env python3
"""
Script de Análise do Banco Supabase - Slim Quality
IMPORTANTE: Use service_role key, não anon key!
"""
import os
from supabase import create_client, Client
import json
from datetime import datetime
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def analyze_database():
    """Análise completa do banco de dados"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("=" * 80)
    print("ANÁLISE DO BANCO DE DADOS - SLIM QUALITY")
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"URL: {SUPABASE_URL}")
    print("=" * 80)
    
    # Lista de tabelas para verificar (Slim Quality)
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
        
        # Afiliados (CRÍTICO)
        'affiliates',
        'affiliate_network',
        'referral_codes',
        'referral_clicks',
        'referral_conversions',
        'commissions',
        'commission_splits',
        'commission_payments',
        'commission_logs',
        
        # Asaas
        'asaas_transactions',
        'asaas_splits',
        'asaas_wallets',
        'asaas_webhook_logs',
        
        # CRM
        'customers',
        'customer_tags',
        'customer_notes',
        'customer_timeline',
        'conversations',
        'messages',
        'appointments',
        
        # Automações
        'automations',
        'automation_triggers',
        'automation_actions',
        'automation_conditions',
        'automation_logs'
    ]
    
    results = {}
    existing_tables = []
    missing_tables = []
    
    for table in tables:
        print(f"\n{'='*60}")
        print(f"Tabela: {table}")
        print(f"{'='*60}")
        
        try:
            # 1. Contar registros
            count_response = supabase.table(table).select('*', count='exact').execute()
            count = count_response.count
            
            print(f"✅ Total de registros: {count}")
            existing_tables.append(table)
            
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
            error_msg = str(e)
            if "does not exist" in error_msg or "relation" in error_msg:
                print(f"❌ Tabela não existe")
                missing_tables.append(table)
            else:
                print(f"❌ Erro ao acessar tabela: {error_msg}")
            
            results[table] = {
                'exists': False,
                'error': error_msg,
                'status': 'ERROR'
            }
    
    # Resumo final
    print(f"\n{'='*80}")
    print("RESUMO DA ANÁLISE")
    print(f"{'='*80}")
    
    total_tables = len(tables)
    success_tables = len(existing_tables)
    total_records = sum(r.get('count', 0) for r in results.values() if r.get('status') == 'OK')
    
    print(f"\n📊 Estatísticas:")
    print(f"  Total de tabelas esperadas: {total_tables}")
    print(f"  Tabelas existentes: {success_tables}")
    print(f"  Tabelas faltando: {len(missing_tables)}")
    print(f"  Total de registros: {total_records}")
    
    if existing_tables:
        print(f"\n✅ Tabelas Existentes ({len(existing_tables)}):")
        for table in existing_tables:
            count = results[table].get('count', 0)
            print(f"  - {table} ({count} registros)")
    
    if missing_tables:
        print(f"\n❌ Tabelas Faltando ({len(missing_tables)}):")
        for table in missing_tables:
            print(f"  - {table}")
    
    return results

if __name__ == "__main__":
    try:
        analyze_database()
    except Exception as e:
        print(f"\n❌ ERRO FATAL: {str(e)}")
        print("\nVerifique se:")
        print("  1. O arquivo .env existe e está configurado")
        print("  2. As credenciais estão corretas")
        print("  3. A biblioteca supabase está instalada: pip install supabase python-dotenv")
