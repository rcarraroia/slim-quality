#!/usr/bin/env python3
"""
ANÁLISE COMPLETA DO BANCO DE DADOS - SLIM QUALITY
Verifica TODAS as tabelas e identifica o que falta
"""
from supabase import create_client, Client
import json

# Credenciais
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def analyze_complete_database():
    """Análise completa do banco"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("=" * 100)
    print("ANÁLISE COMPLETA DO BANCO DE DADOS - SLIM QUALITY")
    print("=" * 100)
    
    # Todas as tabelas esperadas por sprint
    expected_tables = {
        'Sprint 1 - Auth': [
            'profiles',
            'user_roles',
            'auth_logs'
        ],
        'Sprint 2 - Produtos': [
            'products',
            'technologies',
            'product_technologies',
            'product_images',
            'inventory_logs'
        ],
        'Sprint 3 - Vendas': [
            'orders',
            'order_items',
            'order_status_history',
            'payments',
            'shipping_addresses',
            'asaas_transactions',
            'asaas_splits',
            'asaas_webhook_logs'
        ],
        'Sprint 4 - Afiliados': [
            'affiliates',
            'affiliate_network',
            'referral_codes',
            'referral_clicks',
            'referral_conversions',
            'commissions',
            'commission_splits',
            'commission_logs',
            'asaas_wallets',
            'notification_logs'
        ],
        'Sprint 5 - CRM': [
            'customers',
            'customer_tags',
            'customer_tag_assignments',
            'customer_timeline',
            'conversations',
            'messages',
            'appointments'
        ]
    }
    
    all_results = {}
    sprint_summary = {}
    
    for sprint, tables in expected_tables.items():
        print(f"\n{'='*100}")
        print(f"{sprint}")
        print(f"{'='*100}")
        
        sprint_results = {
            'existing': [],
            'missing': [],
            'total_records': 0
        }
        
        for table in tables:
            try:
                response = supabase.table(table).select('*', count='exact').limit(0).execute()
                count = response.count
                
                print(f"✅ {table:<35} | {count:>6} registros")
                
                sprint_results['existing'].append(table)
                sprint_results['total_records'] += count
                all_results[table] = {'exists': True, 'count': count}
                
            except Exception as e:
                error_msg = str(e)
                if 'does not exist' in error_msg or 'relation' in error_msg or 'PGRST205' in error_msg:
                    print(f"❌ {table:<35} | NÃO EXISTE")
                    sprint_results['missing'].append(table)
                    all_results[table] = {'exists': False}
                else:
                    print(f"⚠️  {table:<35} | ERRO: {error_msg[:50]}")
                    sprint_results['missing'].append(table)
                    all_results[table] = {'exists': False, 'error': error_msg}
        
        sprint_summary[sprint] = sprint_results
    
    # RESUMO GERAL
    print("\n" + "=" * 100)
    print("RESUMO GERAL POR SPRINT")
    print("=" * 100)
    
    for sprint, results in sprint_summary.items():
        total = len(results['existing']) + len(results['missing'])
        existing = len(results['existing'])
        percentage = (existing / total * 100) if total > 0 else 0
        
        status = "✅ COMPLETO" if percentage == 100 else "⚠️  INCOMPLETO" if percentage > 0 else "❌ NÃO APLICADO"
        
        print(f"\n{sprint}")
        print(f"  Status: {status}")
        print(f"  Tabelas: {existing}/{total} ({percentage:.0f}%)")
        print(f"  Registros: {results['total_records']}")
        
        if results['missing']:
            print(f"  Faltando: {', '.join(results['missing'])}")
    
    # ANÁLISE DE MIGRATIONS
    print("\n" + "=" * 100)
    print("ANÁLISE DE MIGRATIONS")
    print("=" * 100)
    
    import os
    migration_files = []
    if os.path.exists('supabase/migrations'):
        migration_files = sorted([f for f in os.listdir('supabase/migrations') if f.endswith('.sql')])
    
    print(f"\nTotal de migrations locais: {len(migration_files)}")
    
    # Identificar migrations do CRM
    crm_migrations = [f for f in migration_files if '20250125' in f and int(f.split('_')[0]) >= 20250125000010]
    print(f"Migrations do CRM (Sprint 5): {len(crm_migrations)}")
    for m in crm_migrations:
        print(f"  - {m}")
    
    # CONCLUSÃO FINAL
    print("\n" + "=" * 100)
    print("CONCLUSÃO E RECOMENDAÇÕES")
    print("=" * 100)
    
    total_tables = sum(len(tables) for tables in expected_tables.values())
    existing_tables = sum(len(r['existing']) for r in sprint_summary.values())
    missing_tables = sum(len(r['missing']) for r in sprint_summary.values())
    
    print(f"\n📊 ESTATÍSTICAS:")
    print(f"   Total de tabelas esperadas: {total_tables}")
    print(f"   Tabelas existentes: {existing_tables} ({existing_tables/total_tables*100:.0f}%)")
    print(f"   Tabelas faltando: {missing_tables} ({missing_tables/total_tables*100:.0f}%)")
    
    print(f"\n🎯 SITUAÇÃO:")
    if missing_tables == 0:
        print("   ✅ Banco de dados COMPLETO - Todas as tabelas existem")
    elif missing_tables == len(expected_tables['Sprint 5 - CRM']):
        print("   ⚠️  Apenas tabelas do Sprint 5 (CRM) estão faltando")
        print("   📋 AÇÃO: Aplicar migrations do Sprint 5")
    else:
        print(f"   ❌ {missing_tables} tabelas faltando em múltiplos sprints")
        print("   📋 AÇÃO: Revisar e aplicar migrations pendentes")
    
    print(f"\n🔧 PROBLEMA IDENTIFICADO:")
    print("   Migration 20250124000001_storage_policies.sql está causando erro")
    print("   Erro: Policy 'Anyone can view product images' já existe")
    print("   Impacto: Bloqueia aplicação de migrations subsequentes")
    
    print(f"\n💡 SOLUÇÕES POSSÍVEIS:")
    print("   1. Editar migration para usar 'CREATE POLICY IF NOT EXISTS'")
    print("   2. Remover/comentar a policy duplicada na migration")
    print("   3. Aplicar migrations do CRM manualmente via Dashboard")
    print("   4. Marcar migration problemática como aplicada e continuar")
    
    return all_results, sprint_summary

if __name__ == "__main__":
    try:
        results, summary = analyze_complete_database()
        
        # Salvar resultados em JSON
        with open('analise_banco_resultado.json', 'w', encoding='utf-8') as f:
            json.dump({
                'results': results,
                'summary': {k: {
                    'existing': v['existing'],
                    'missing': v['missing'],
                    'total_records': v['total_records']
                } for k, v in summary.items()}
            }, f, indent=2)
        
        print(f"\n✅ Resultados salvos em: analise_banco_resultado.json")
        
    except Exception as e:
        print(f"\n❌ ERRO FATAL: {e}")
        import traceback
        traceback.print_exc()
