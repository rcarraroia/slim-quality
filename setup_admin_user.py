#!/usr/bin/env python3
"""
Configurar usuário admin para testes
"""
from supabase import create_client, Client
import uuid

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def setup_test_admin():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("👤 CONFIGURANDO USUÁRIO ADMIN PARA TESTES")
    print("=" * 60)
    
    # Vou criar um usuário de teste diretamente no banco
    test_user_id = str(uuid.uuid4())
    
    try:
        # 1. Verificar se tabela profiles existe
        print("1. Verificando tabela profiles...")
        profiles_check = supabase.table('profiles').select('*').limit(1).execute()
        print("✅ Tabela profiles existe")
        
        # 2. Criar profile de teste
        print("2. Criando profile de teste...")
        profile_data = {
            'id': test_user_id,
            'email': 'admin.teste@slimquality.com',
            'name': 'Admin Teste',
            'created_at': '2025-12-12T12:00:00Z',
            'updated_at': '2025-12-12T12:00:00Z'
        }
        
        profile_result = supabase.table('profiles').insert(profile_data).execute()
        if profile_result.data:
            print(f"✅ Profile criado: {test_user_id}")
        
        # 3. Verificar se tabela user_roles existe
        print("3. Verificando tabela user_roles...")
        try:
            roles_check = supabase.table('user_roles').select('*').limit(1).execute()
            print("✅ Tabela user_roles existe")
            
            # 4. Criar role de admin
            print("4. Criando role de admin...")
            role_data = {
                'user_id': test_user_id,
                'role': 'admin',
                'created_at': '2025-12-12T12:00:00Z'
            }
            
            role_result = supabase.table('user_roles').insert(role_data).execute()
            if role_result.data:
                print("✅ Role admin criada")
            
        except Exception as e:
            print(f"❌ Tabela user_roles não existe: {e}")
        
        return test_user_id
        
    except Exception as e:
        print(f"❌ Erro ao configurar admin: {e}")
        return None

def test_affiliate_with_admin(admin_user_id):
    """Testar sistema de afiliados com usuário admin"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print(f"\n🧪 TESTANDO SISTEMA COM ADMIN: {admin_user_id}")
    print("=" * 60)
    
    # Dados do afiliado de teste
    affiliate_data = {
        'user_id': admin_user_id,
        'name': 'João Silva Admin',
        'email': 'joao.admin@email.com',
        'phone': '11999999999',
        'document': '12345678901',
        'wallet_id': str(uuid.uuid4()),
        'referral_code': 'ADMIN1',
        'status': 'pending',
        'total_clicks': 0,
        'total_conversions': 0,
        'total_commissions_cents': 0
    }
    
    try:
        # 1. Criar afiliado
        print("1. Criando afiliado com usuário admin...")
        affiliate_result = supabase.table('affiliates').insert(affiliate_data).execute()
        
        if affiliate_result.data:
            affiliate_id = affiliate_result.data[0]['id']
            print(f"✅ Afiliado criado: {affiliate_id}")
            
            # 2. Testar atualização de status (deve funcionar com admin)
            print("2. Testando atualização de status...")
            update_result = supabase.table('affiliates').update({
                'status': 'active'
            }).eq('id', affiliate_id).execute()
            
            if update_result.data:
                print("✅ Status atualizado com sucesso!")
            else:
                print("❌ Falha na atualização de status")
            
            # 3. Testar rede genealógica
            print("3. Testando rede genealógica...")
            network_data = {
                'affiliate_id': affiliate_id,
                'parent_affiliate_id': None,
                'level': 1,
                'created_at': '2025-12-12T12:00:00Z'
            }
            
            network_result = supabase.table('affiliate_network').insert(network_data).execute()
            if network_result.data:
                print("✅ Rede genealógica criada")
            
            # 4. Testar comissões
            print("4. Testando criação de comissão...")
            commission_data = {
                'affiliate_id': affiliate_id,
                'order_id': str(uuid.uuid4()),
                'level': 1,
                'percentage': 15.0,
                'amount_cents': 49350,  # R$ 493,50
                'status': 'pending',
                'created_at': '2025-12-12T12:00:00Z'
            }
            
            commission_result = supabase.table('commissions').insert(commission_data).execute()
            if commission_result.data:
                print("✅ Comissão criada")
            
            # 5. Limpar dados de teste
            print("5. Limpando dados de teste...")
            supabase.table('commissions').delete().eq('affiliate_id', affiliate_id).execute()
            supabase.table('affiliate_network').delete().eq('affiliate_id', affiliate_id).execute()
            supabase.table('affiliates').delete().eq('id', affiliate_id).execute()
            print("✅ Dados removidos")
            
            return True
            
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False

def cleanup_test_data(user_id):
    """Limpar dados de teste"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    try:
        supabase.table('user_roles').delete().eq('user_id', user_id).execute()
        supabase.table('profiles').delete().eq('id', user_id).execute()
        print("✅ Dados de teste limpos")
    except:
        pass

if __name__ == "__main__":
    # 1. Configurar admin
    admin_id = setup_test_admin()
    
    if admin_id:
        # 2. Testar sistema
        success = test_affiliate_with_admin(admin_id)
        
        # 3. Limpar
        cleanup_test_data(admin_id)
        
        print(f"\n📊 RESULTADO FINAL: {'✅ SISTEMA FUNCIONAL' if success else '❌ SISTEMA COM PROBLEMAS'}")
    else:
        print("\n❌ Não foi possível configurar usuário admin")