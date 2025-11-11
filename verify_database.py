#!/usr/bin/env python3
"""
Verificação do Banco de Dados Real - Slim Quality
Verifica quais tabelas do CRM existem no Supabase
"""
from supabase import create_client, Client

# Credenciais do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def verify_crm_tables():
    """Verifica tabelas do CRM no banco real"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("=" * 80)
    print("VERIFICAÇÃO DE TABELAS DO CRM - BANCO REAL")
    print("=" * 80)
    
    # Lista de tabelas para verificar
    tables_to_check = [
        # Sem prefixo crm_
        'customers',
        'customer_tags',
        'customer_tag_assignments',
        'customer_timeline',
        'conversations',
        'messages',
        'appointments',
        
        # Com prefixo crm_
        'crm_customers',
        'crm_tags',
        'crm_customer_tags',
        'crm_timeline',
        'crm_conversations',
        'crm_messages',
        'crm_appointments',
    ]
    
    results = {}
    
    for table in tables_to_check:
        try:
            # Tentar contar registros
            response = supabase.table(table).select('*', count='exact').limit(0).execute()
            count = response.count
            
            print(f"\n✅ Tabela '{table}' EXISTE")
            print(f"   Registros: {count}")
            
            results[table] = {
                'exists': True,
                'count': count
            }
            
        except Exception as e:
            error_msg = str(e)
            if 'does not exist' in error_msg or 'relation' in error_msg:
                print(f"\n❌ Tabela '{table}' NÃO EXISTE")
            else:
                print(f"\n⚠️  Tabela '{table}' - Erro: {error_msg}")
            
            results[table] = {
                'exists': False,
                'error': error_msg
            }
    
    # Resumo
    print("\n" + "=" * 80)
    print("RESUMO DA VERIFICAÇÃO")
    print("=" * 80)
    
    existing_tables = [t for t, r in results.items() if r['exists']]
    missing_tables = [t for t, r in results.items() if not r['exists']]
    
    print(f"\n✅ Tabelas que EXISTEM ({len(existing_tables)}):")
    for table in existing_tables:
        print(f"   - {table} ({results[table]['count']} registros)")
    
    print(f"\n❌ Tabelas que NÃO EXISTEM ({len(missing_tables)}):")
    for table in missing_tables:
        print(f"   - {table}")
    
    # Conclusão
    print("\n" + "=" * 80)
    print("CONCLUSÃO")
    print("=" * 80)
    
    if any('crm_' in t for t in existing_tables):
        print("\n🔍 RESULTADO: Tabelas usam PREFIXO 'crm_'")
        print("   Ação: Manter serviços frontend como estão (com crm_)")
    elif any(t in ['customers', 'conversations', 'appointments'] for t in existing_tables):
        print("\n🔍 RESULTADO: Tabelas NÃO usam prefixo 'crm_'")
        print("   Ação: Aplicar correções nos serviços frontend (remover crm_)")
    else:
        print("\n⚠️  RESULTADO: Nenhuma tabela do CRM encontrada!")
        print("   Ação: Aplicar migrations para criar as tabelas")
    
    return results

if __name__ == "__main__":
    try:
        verify_crm_tables()
    except Exception as e:
        print(f"\n❌ ERRO FATAL: {e}")
        import traceback
        traceback.print_exc()
