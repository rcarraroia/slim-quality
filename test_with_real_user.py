#!/usr/bin/env python3
"""
Teste com usuário real ou criando um
"""
from supabase import create_client, Client
import uuid

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def test_affiliate_system():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 TESTE SIMPLIFICADO DO SISTEMA DE AFILIADOS")
    print("=" * 60)
    
    # Vou testar sem foreign key - usando NULL para user_id
    test_data = {
        'user_id': None,  # Permitir NULL temporariamente
        'name': 'João Silva Teste',
        'email': 'joao.teste@email.com',
        'phone': '11999999999',
        'document': '12345678901',
        'wallet_id': str(uuid.uuid4()),
        'referral_code': 'JOAO01',
        'status': 'pending',
        'total_clicks': 0,
        'total_conversions': 0,
        'total_commissions_cents': 0
    }
    
    try:
        print("1. Testando inserção básica...")
        result = supabase.table('affiliates').insert(test_data).execute()
        
        if result.data:
            affiliate_id = result.data[0]['id']
            print(f"✅ Afiliado criado: {affiliate_id}")
            
            # Testar busca
            print("2. Testando busca...")
            search = supabase.table('affiliates').select('*').eq('id', affiliate_id).execute()
            if search.data:
                print("✅ Busca funcionou")
                print(f"   Nome: {search.data[0]['name']}")
                print(f"   Email: {search.data[0]['email']}")
            
            # Testar atualização
            print("3. Testando atualização...")
            update = supabase.table('affiliates').update({'status': 'active'}).eq('id', affiliate_id).execute()
            if update.data:
                print("✅ Atualização funcionou")
            
            # Limpar
            print("4. Limpando dados de teste...")
            supabase.table('affiliates').delete().eq('id', affiliate_id).execute()
            print("✅ Dados removidos")
            
            return True
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    success = test_affiliate_system()
    print(f"\n📊 RESULTADO: {'✅ SISTEMA FUNCIONAL' if success else '❌ SISTEMA COM PROBLEMAS'}")