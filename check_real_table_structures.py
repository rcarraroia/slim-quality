#!/usr/bin/env python3
"""
Verificar estrutura real de todas as tabelas
"""
from supabase import create_client, Client
import uuid

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def check_table_structure(table_name):
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print(f"\n📋 ESTRUTURA DA TABELA: {table_name}")
    print("-" * 50)
    
    try:
        # Inserir um registro de teste para descobrir a estrutura
        test_data = {}
        
        if table_name == 'affiliates':
            test_data = {
                'user_id': None,
                'name': 'Teste Estrutura',
                'email': 'teste@email.com',
                'phone': '11999999999',
                'document': '12345678901',
                'wallet_id': str(uuid.uuid4()),
                'referral_code': 'TEST01',
                'status': 'pending'
            }
        elif table_name == 'affiliate_network':
            # Primeiro criar um afiliado
            affiliate_data = {
                'user_id': None,
                'name': 'Teste Network',
                'email': 'network@email.com',
                'phone': '11999999999',
                'document': '12345678901',
                'wallet_id': str(uuid.uuid4()),
                'referral_code': 'NETW01',
                'status': 'pending'
            }
            affiliate_result = supabase.table('affiliates').insert(affiliate_data).execute()
            affiliate_id = affiliate_result.data[0]['id']
            
            test_data = {
                'affiliate_id': affiliate_id,
                'level': 1
            }
        elif table_name == 'commissions':
            test_data = {
                'affiliate_id': str(uuid.uuid4()),
                'order_id': str(uuid.uuid4()),
                'level': 1,
                'percentage': 15.0,
                'amount_cents': 49350,
                'status': 'pending'
            }
        elif table_name == 'referral_clicks':
            test_data = {
                'referral_code': 'TEST01',
                'affiliate_id': str(uuid.uuid4()),
                'ip_address': '192.168.1.1',
                'user_agent': 'Test Browser',
                'clicked_at': '2025-12-12T12:00:00Z'
            }
        elif table_name == 'referral_conversions':
            test_data = {
                'referral_code': 'TEST01',
                'affiliate_id': str(uuid.uuid4()),
                'order_id': str(uuid.uuid4()),
                'customer_email': 'customer@email.com',
                'order_value_cents': 329000,
                'converted_at': '2025-12-12T12:00:00Z'
            }
        elif table_name == 'asaas_wallets':
            test_data = {
                'wallet_id': str(uuid.uuid4()),
                'name': 'Teste Wallet',
                'status': 'ACTIVE',
                'is_valid': True,
                'last_validated_at': '2025-12-12T12:00:00Z'
            }
        elif table_name == 'webhook_logs':
            test_data = {
                'provider': 'asaas',
                'event_type': 'PAYMENT_RECEIVED',
                'payment_id': 'pay_test_123',
                'status': 'success',
                'payload': {'test': 'data'}
            }
        
        # Tentar inserir
        result = supabase.table(table_name).insert(test_data).execute()
        
        if result.data:
            record_id = result.data[0]['id']
            print(f"✅ Inserção bem-sucedida! ID: {record_id}")
            
            # Mostrar estrutura
            print("📄 Colunas encontradas:")
            for col in result.data[0].keys():
                print(f"   - {col}")
            
            # Limpar
            supabase.table(table_name).delete().eq('id', record_id).execute()
            
            # Limpar afiliado se foi criado para network
            if table_name == 'affiliate_network' and 'affiliate_id' in locals():
                supabase.table('affiliates').delete().eq('id', affiliate_id).execute()
            
            return True
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        
        # Tentar descobrir colunas obrigatórias pelo erro
        error_msg = str(e)
        if "violates not-null constraint" in error_msg:
            print("ℹ️  Campos obrigatórios identificados no erro")
        elif "Could not find" in error_msg and "column" in error_msg:
            print("ℹ️  Campo não existe na tabela")
        
        return False

def main():
    print("🔍 VERIFICAÇÃO COMPLETA DAS ESTRUTURAS DE TABELAS")
    print("=" * 70)
    
    tables = [
        'affiliates',
        'affiliate_network', 
        'commissions',
        'referral_clicks',
        'referral_conversions',
        'asaas_wallets',
        'webhook_logs'
    ]
    
    results = {}
    
    for table in tables:
        success = check_table_structure(table)
        results[table] = success
    
    print(f"\n📊 RESUMO:")
    print("=" * 50)
    for table, success in results.items():
        status = "✅ OK" if success else "❌ PROBLEMA"
        print(f"{table:<20} - {status}")

if __name__ == "__main__":
    main()