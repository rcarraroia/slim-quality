#!/usr/bin/env python3
"""
Verificar estrutura da tabela affiliates
"""
from supabase import create_client, Client

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def check_table_constraints():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Tentar inserir dados simples para descobrir as validações
    test_data = {
        'user_id': '123e4567-e89b-12d3-a456-426614174000',
        'name': 'Teste',
        'email': 'teste@email.com',
        'phone': '11999999999',
        'document': '12345678901',  # CPF sem formatação
        'wallet_id': '123e4567-e89b-12d3-a456-426614174001',
        'referral_code': 'TEST01',
        'status': 'pending'
    }
    
    try:
        result = supabase.table('affiliates').insert(test_data).execute()
        if result.data:
            affiliate_id = result.data[0]['id']
            print(f"✅ Teste passou! ID: {affiliate_id}")
            # Limpar
            supabase.table('affiliates').delete().eq('id', affiliate_id).execute()
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    check_table_constraints()