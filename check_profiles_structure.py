#!/usr/bin/env python3
"""
Verificar estrutura real da tabela profiles
"""
from supabase import create_client, Client

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def check_profiles_structure():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 VERIFICANDO ESTRUTURA DAS TABELAS")
    print("=" * 50)
    
    # Verificar profiles
    try:
        profiles = supabase.table('profiles').select('*').limit(1).execute()
        if profiles.data:
            print("✅ Tabela profiles - Colunas:")
            for col in profiles.data[0].keys():
                print(f"   - {col}")
        else:
            print("✅ Tabela profiles existe mas está vazia")
    except Exception as e:
        print(f"❌ Erro profiles: {e}")
    
    # Verificar user_roles
    try:
        roles = supabase.table('user_roles').select('*').limit(1).execute()
        if roles.data:
            print("\n✅ Tabela user_roles - Colunas:")
            for col in roles.data[0].keys():
                print(f"   - {col}")
        else:
            print("\n✅ Tabela user_roles existe mas está vazia")
    except Exception as e:
        print(f"\n❌ Erro user_roles: {e}")

def test_simple_affiliate():
    """Teste mais simples sem foreign keys"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("\n🧪 TESTE SIMPLES SEM FOREIGN KEYS")
    print("=" * 50)
    
    # Usar NULL para user_id para evitar foreign key
    simple_data = {
        'user_id': None,
        'name': 'Teste Simples',
        'email': 'teste.simples@email.com',
        'phone': '11999999999',
        'document': '12345678901',
        'wallet_id': 'f47ac10b-58cc-4372-a567-0e02b2c3d479',  # UUID válido
        'referral_code': 'TESTE1',
        'status': 'pending'
    }
    
    try:
        # Inserir
        result = supabase.table('affiliates').insert(simple_data).execute()
        if result.data:
            affiliate_id = result.data[0]['id']
            print(f"✅ Afiliado criado: {affiliate_id}")
            
            # Buscar
            search = supabase.table('affiliates').select('*').eq('id', affiliate_id).execute()
            if search.data:
                print("✅ Busca funcionou")
            
            # Limpar
            supabase.table('affiliates').delete().eq('id', affiliate_id).execute()
            print("✅ Dados limpos")
            
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    check_profiles_structure()
    success = test_simple_affiliate()
    print(f"\n📊 TESTE BÁSICO: {'✅ PASSOU' if success else '❌ FALHOU'}")