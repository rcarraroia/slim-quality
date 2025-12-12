#!/usr/bin/env python3
"""
ANALISAR RELAÇÃO ENTRE USERS, CUSTOMERS E ORDERS
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurar cliente Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def check_users_table():
    """Verifica estrutura da tabela users"""
    print("👤 ANALISANDO TABELA USERS")
    print("=" * 50)
    
    try:
        # Verificar se existe
        result = supabase.table('users').select('*').limit(3).execute()
        
        if result.data:
            print(f"✅ Tabela 'users' EXISTE")
            print(f"📊 Registros encontrados: {len(result.data)}")
            
            if result.data:
                user = result.data[0]
                print(f"\n📋 CAMPOS DA TABELA USERS:")
                for key, value in user.items():
                    if key not in ['created_at', 'updated_at']:
                        print(f"   • {key}: {type(value).__name__}")
                
                print(f"\n📝 EXEMPLO DE USER:")
                for key, value in user.items():
                    if key not in ['created_at', 'updated_at'] and value is not None:
                        print(f"   • {key}: {value}")
            
            return True
        else:
            print("✅ Tabela 'users' existe mas está vazia")
            return True
            
    except Exception as e:
        print(f"❌ Tabela 'users' NÃO EXISTE ou erro: {str(e)}")
        return False

def check_profiles_table():
    """Verifica tabela profiles (comum no Supabase Auth)"""
    print("\n👤 ANALISANDO TABELA PROFILES")
    print("=" * 50)
    
    try:
        result = supabase.table('profiles').select('*').limit(3).execute()
        
        if result.data:
            print(f"✅ Tabela 'profiles' EXISTE")
            print(f"📊 Registros encontrados: {len(result.data)}")
            
            if result.data:
                profile = result.data[0]
                print(f"\n📋 CAMPOS DA TABELA PROFILES:")
                for key, value in profile.items():
                    if key not in ['created_at', 'updated_at']:
                        print(f"   • {key}: {type(value).__name__}")
            
            return True
        else:
            print("✅ Tabela 'profiles' existe mas está vazia")
            return True
            
    except Exception as e:
        print(f"❌ Tabela 'profiles' NÃO EXISTE ou erro: {str(e)}")
        return False

def test_order_with_user():
    """Testa criação de order usando user_id real"""
    print("\n🛒 TESTANDO ORDER COM USER_ID")
    print("=" * 50)
    
    # Primeiro, verificar se há users
    try:
        users_result = supabase.table('users').select('id').limit(1).execute()
        
        if not users_result.data:
            print("❌ Não há users na tabela para testar")
            return False
            
        user_id = users_result.data[0]['id']
        print(f"✅ Usando user_id: {user_id}")
        
        # Testar order com user_id
        order_data = {
            'customer_id': user_id,  # Usar user_id como customer_id
            'customer_name': 'João Silva Teste User',
            'customer_email': 'joao.user@email.com',
            'customer_phone': '11999999999',
            'subtotal_cents': 329000,
            'total_cents': 329000,
            'status': 'pending'
        }
        
        order_result = supabase.table('orders').insert(order_data).execute()
        
        if order_result.data:
            print("✅ Order criada com user_id!")
            order = order_result.data[0]
            order_id = order['id']
            
            print(f"\n📊 ORDER CRIADA:")
            for key, value in order.items():
                if key not in ['created_at', 'updated_at'] and value is not None:
                    print(f"   • {key}: {value}")
            
            # Limpar
            supabase.table('orders').delete().eq('id', order_id).execute()
            print("✅ Order de teste removida")
            
            return True
        else:
            print("❌ Falha ao criar order")
            return False
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return False

def analyze_order_customer_relationship():
    """Analisa como deve ser a relação entre orders e customers"""
    print("\n🔍 ANALISANDO RELAÇÃO ORDERS-CUSTOMERS")
    print("=" * 50)
    
    print("📋 CENÁRIOS POSSÍVEIS:")
    print("1. orders.customer_id → users.id (Supabase Auth)")
    print("2. orders.customer_id → customers.id (Tabela separada)")
    print("3. orders sem FK, apenas dados diretos")
    
    # Verificar se customers tem relação com users
    try:
        customers_result = supabase.table('customers').select('*').limit(1).execute()
        
        if customers_result.data:
            customer = customers_result.data[0]
            
            print(f"\n📊 CUSTOMER ATUAL:")
            for key, value in customer.items():
                if key not in ['created_at', 'updated_at'] and value is not None:
                    print(f"   • {key}: {value}")
            
            # Verificar se customer tem user_id
            if 'user_id' in customer:
                print(f"\n✅ Customer tem user_id: {customer['user_id']}")
                return 'customers_linked_to_users'
            else:
                print(f"\n⚠️  Customer NÃO tem user_id")
                return 'customers_independent'
        
    except Exception as e:
        print(f"❌ Erro ao analisar customers: {str(e)}")
    
    return 'unknown'

def propose_solution():
    """Propõe solução baseada na análise"""
    print("\n💡 PROPOSTA DE SOLUÇÃO")
    print("=" * 50)
    
    print("🎯 OPÇÕES PARA IMPLEMENTAR 'COMPRAR AGORA':")
    
    print("\n1️⃣ OPÇÃO 1: Usar Supabase Auth")
    print("   • Cliente faz login/cadastro antes de comprar")
    print("   • orders.customer_id → auth.users.id")
    print("   • Mais seguro, integrado com autenticação")
    
    print("\n2️⃣ OPÇÃO 2: Checkout sem login")
    print("   • Cliente informa dados no checkout")
    print("   • Criar user temporário ou usar dados diretos")
    print("   • Mais simples para conversão")
    
    print("\n3️⃣ OPÇÃO 3: Híbrido")
    print("   • Checkout sem login para visitantes")
    print("   • Opção de criar conta após compra")
    print("   • Melhor experiência de usuário")
    
    print(f"\n🎯 RECOMENDAÇÃO:")
    print("Implementar OPÇÃO 3 (Híbrido):")
    print("1. Checkout funciona sem login")
    print("2. Criar user temporário se necessário")
    print("3. Oferecer criação de conta após compra")
    print("4. Integrar com sistema de afiliados")

def main():
    print("🔍 ANÁLISE COMPLETA: USERS, CUSTOMERS E ORDERS")
    print("=" * 60)
    
    # Verificar tabelas
    users_exists = check_users_table()
    profiles_exists = check_profiles_table()
    
    # Testar relação
    if users_exists:
        order_success = test_order_with_user()
    else:
        order_success = False
    
    # Analisar relação
    relationship = analyze_order_customer_relationship()
    
    # Propor solução
    propose_solution()
    
    # Resumo final
    print(f"\n📊 RESUMO DA ANÁLISE")
    print("=" * 40)
    
    print(f"✅ Tabela users: {'EXISTE' if users_exists else 'NÃO EXISTE'}")
    print(f"✅ Tabela profiles: {'EXISTE' if profiles_exists else 'NÃO EXISTE'}")
    print(f"✅ Order com user_id: {'FUNCIONA' if order_success else 'NÃO FUNCIONA'}")
    print(f"✅ Relação customers: {relationship}")
    
    print(f"\n🎯 PRÓXIMOS PASSOS:")
    print("1. Implementar checkout híbrido (com/sem login)")
    print("2. Criar user temporário quando necessário")
    print("3. Integrar com sistema de afiliados")
    print("4. Adicionar botão 'Comprar Agora' nas páginas")

if __name__ == "__main__":
    main()