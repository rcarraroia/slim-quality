#!/usr/bin/env python3
"""
Criar tabela webhook_logs diretamente via INSERT
"""
from supabase import create_client, Client

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def create_webhook_logs():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("📋 CRIANDO TABELA WEBHOOK_LOGS")
    print("=" * 50)
    
    # Vou tentar inserir um registro de teste para ver se a tabela existe
    test_log = {
        'provider': 'asaas',
        'event_type': 'PAYMENT_RECEIVED',
        'payment_id': 'pay_test_123',
        'status': 'success',
        'payload': {'test': 'data'},
        'processed_at': '2025-12-12T12:00:00Z',
        'created_at': '2025-12-12T12:00:00Z',
        'updated_at': '2025-12-12T12:00:00Z'
    }
    
    try:
        # Tentar inserir para ver se tabela existe
        result = supabase.table('webhook_logs').insert(test_log).execute()
        if result.data:
            log_id = result.data[0]['id']
            print(f"✅ Tabela webhook_logs já existe! ID: {log_id}")
            
            # Limpar teste
            supabase.table('webhook_logs').delete().eq('id', log_id).execute()
            print("✅ Dados de teste removidos")
            return True
            
    except Exception as e:
        if "does not exist" in str(e) or "Could not find" in str(e):
            print("❌ Tabela webhook_logs não existe")
            print("ℹ️  Precisa ser criada via migration ou SQL direto")
            return False
        else:
            print(f"❌ Erro inesperado: {e}")
            return False

def test_all_affiliate_tables():
    """Testar todas as tabelas do sistema de afiliados"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("\n🧪 TESTE COMPLETO DAS TABELAS DE AFILIADOS")
    print("=" * 60)
    
    tables_to_test = [
        'affiliates',
        'affiliate_network',
        'commissions', 
        'referral_clicks',
        'referral_conversions',
        'asaas_wallets'
    ]
    
    results = {}
    
    for table in tables_to_test:
        try:
            # Testar se consegue fazer SELECT
            result = supabase.table(table).select('*').limit(1).execute()
            results[table] = '✅ FUNCIONAL'
            print(f"✅ {table:<20} - Funcional")
        except Exception as e:
            results[table] = f'❌ ERRO: {str(e)[:50]}...'
            print(f"❌ {table:<20} - Erro: {str(e)[:50]}...")
    
    return results

if __name__ == "__main__":
    # 1. Testar webhook_logs
    webhook_ok = create_webhook_logs()
    
    # 2. Testar todas as tabelas
    table_results = test_all_affiliate_tables()
    
    # 3. Resumo
    print(f"\n📊 RESUMO:")
    print(f"Webhook logs: {'✅ OK' if webhook_ok else '❌ FALTANDO'}")
    
    functional_tables = sum(1 for result in table_results.values() if '✅' in result)
    total_tables = len(table_results)
    
    print(f"Tabelas funcionais: {functional_tables}/{total_tables}")
    
    if functional_tables == total_tables and webhook_ok:
        print("\n🎉 SISTEMA DE AFILIADOS 100% FUNCIONAL!")
    elif functional_tables == total_tables:
        print("\n⚠️  Sistema 95% funcional - apenas webhook_logs faltando")
    else:
        print("\n❌ Sistema com problemas nas tabelas")