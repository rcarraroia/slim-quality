#!/usr/bin/env python3
"""
Teste real do cadastro de afiliados
"""
from supabase import create_client, Client
import uuid
from datetime import datetime

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def test_affiliate_registration():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 TESTE DE CADASTRO DE AFILIADO")
    print("=" * 50)
    
    # Dados de teste
    test_affiliate = {
        'user_id': str(uuid.uuid4()),  # Simular um user_id
        'name': 'João Silva Teste',
        'email': 'joao.teste@email.com',
        'phone': '(11) 99999-9999',
        'document': '123.456.789-00',
        'wallet_id': str(uuid.uuid4()),  # UUID válido para teste
        'referral_code': 'JOAO24',
        'status': 'pending',
        'total_clicks': 0,
        'total_conversions': 0,
        'total_commissions_cents': 0,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    try:
        # 1. Testar inserção na tabela affiliates
        print("1. Testando inserção de afiliado...")
        result = supabase.table('affiliates').insert(test_affiliate).execute()
        
        if result.data:
            affiliate_id = result.data[0]['id']
            print(f"✅ Afiliado criado com ID: {affiliate_id}")
            
            # 2. Testar busca do afiliado criado
            print("2. Testando busca do afiliado...")
            search_result = supabase.table('affiliates').select('*').eq('id', affiliate_id).execute()
            
            if search_result.data:
                print("✅ Afiliado encontrado na busca")
                print(f"   Nome: {search_result.data[0]['name']}")
                print(f"   Email: {search_result.data[0]['email']}")
                print(f"   Status: {search_result.data[0]['status']}")
            else:
                print("❌ Afiliado não encontrado na busca")
            
            # 3. Testar atualização
            print("3. Testando atualização do afiliado...")
            update_result = supabase.table('affiliates').update({
                'status': 'active',
                'updated_at': datetime.now().isoformat()
            }).eq('id', affiliate_id).execute()
            
            if update_result.data:
                print("✅ Afiliado atualizado com sucesso")
            else:
                print("❌ Falha na atualização")
            
            # 4. Testar inserção na rede genealógica
            print("4. Testando rede genealógica...")
            network_data = {
                'affiliate_id': affiliate_id,
                'parent_affiliate_id': None,  # Afiliado raiz
                'level': 1,
                'created_at': datetime.now().isoformat()
            }
            
            network_result = supabase.table('affiliate_network').insert(network_data).execute()
            
            if network_result.data:
                print("✅ Entrada na rede genealógica criada")
            else:
                print("❌ Falha ao criar entrada na rede")
            
            # 5. Testar cache de wallet
            print("5. Testando cache de wallet...")
            wallet_data = {
                'wallet_id': test_affiliate['wallet_id'],
                'name': 'João Silva Teste',
                'status': 'ACTIVE',
                'is_valid': True,
                'last_validated_at': datetime.now().isoformat()
            }
            
            wallet_result = supabase.table('asaas_wallets').insert(wallet_data).execute()
            
            if wallet_result.data:
                print("✅ Cache de wallet criado")
            else:
                print("❌ Falha ao criar cache de wallet")
            
            # 6. Limpar dados de teste
            print("6. Limpando dados de teste...")
            supabase.table('affiliate_network').delete().eq('affiliate_id', affiliate_id).execute()
            supabase.table('asaas_wallets').delete().eq('wallet_id', test_affiliate['wallet_id']).execute()
            supabase.table('affiliates').delete().eq('id', affiliate_id).execute()
            print("✅ Dados de teste removidos")
            
            return True
            
        else:
            print("❌ Falha ao criar afiliado")
            return False
            
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False

def test_service_methods():
    """Testar métodos específicos do serviço"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("\n🔧 TESTE DOS MÉTODOS DO SERVIÇO")
    print("=" * 50)
    
    try:
        # Testar busca de afiliados (deve retornar lista vazia)
        print("1. Testando listagem de afiliados...")
        affiliates = supabase.table('affiliates').select('*').execute()
        print(f"✅ Encontrados {len(affiliates.data)} afiliados")
        
        # Testar busca de comissões (deve retornar lista vazia)
        print("2. Testando listagem de comissões...")
        commissions = supabase.table('commissions').select('*').execute()
        print(f"✅ Encontradas {len(commissions.data)} comissões")
        
        # Testar busca de rede (deve retornar lista vazia)
        print("3. Testando rede genealógica...")
        network = supabase.table('affiliate_network').select('*').execute()
        print(f"✅ Encontradas {len(network.data)} entradas na rede")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro nos métodos do serviço: {e}")
        return False

if __name__ == "__main__":
    print("🚀 INICIANDO TESTES DO SISTEMA DE AFILIADOS")
    print("=" * 60)
    
    # Teste 1: Cadastro completo
    test1 = test_affiliate_registration()
    
    # Teste 2: Métodos do serviço
    test2 = test_service_methods()
    
    print(f"\n📊 RESULTADO DOS TESTES:")
    print(f"Cadastro de afiliado: {'✅ PASSOU' if test1 else '❌ FALHOU'}")
    print(f"Métodos do serviço: {'✅ PASSOU' if test2 else '❌ FALHOU'}")
    
    if test1 and test2:
        print("\n🎉 SISTEMA DE AFILIADOS FUNCIONAL!")
    else:
        print("\n⚠️ Sistema tem problemas que precisam ser corrigidos")