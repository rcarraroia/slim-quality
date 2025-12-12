#!/usr/bin/env python3
"""
DESCOBRIR CONSTRAINT DE SOURCE E ESTRUTURA COMPLETA
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

def test_source_values():
    """Testa valores válidos para o campo source"""
    print("🔍 TESTANDO VALORES VÁLIDOS PARA 'source'")
    print("=" * 50)
    
    base_customer = {
        'name': 'Teste Source',
        'email': 'teste.source@email.com',
        'phone': '11999999999',
        'street': 'Rua Teste',
        'number': '123',
        'complement': 'Apto 1',
        'neighborhood': 'Centro',
        'city': 'São Paulo',
        'state': 'SP',
        'postal_code': '01234-567',
        'status': 'active'
    }
    
    # Valores comuns para testar
    source_values = [
        'website',
        'whatsapp', 
        'affiliate',
        'direct',
        'organic',
        'paid',
        'social',
        'email',
        'referral',
        'landing_page',
        'google',
        'facebook',
        'instagram',
        'youtube',
        'tiktok',
        'bia',
        'chatbot',
        'phone',
        'store',
        'event'
    ]
    
    valid_sources = []
    
    for source in source_values:
        test_data = base_customer.copy()
        test_data['source'] = source
        test_data['email'] = f'teste.{source}@email.com'
        
        try:
            result = supabase.table('customers').insert(test_data).execute()
            if result.data:
                print(f"✅ Source '{source}': VÁLIDO")
                valid_sources.append(source)
                # Limpar
                supabase.table('customers').delete().eq('id', result.data[0]['id']).execute()
        except Exception as e:
            if 'source_valid' in str(e):
                print(f"❌ Source '{source}': INVÁLIDO (constraint)")
            else:
                print(f"❌ Source '{source}': Erro - {str(e)[:50]}...")
    
    return valid_sources

def discover_orders_with_customer():
    """Descobre estrutura de orders criando um customer primeiro"""
    print("\n🔍 DESCOBRINDO ORDERS COM CUSTOMER REAL")
    print("=" * 50)
    
    # Criar customer primeiro
    customer_data = {
        'name': 'João Silva Teste Orders',
        'email': 'joao.orders@email.com',
        'phone': '11999999999',
        'street': 'Rua Teste',
        'number': '123',
        'neighborhood': 'Centro',
        'city': 'São Paulo',
        'state': 'SP',
        'postal_code': '01234-567',
        'status': 'active'
    }
    
    try:
        # Inserir customer
        customer_result = supabase.table('customers').insert(customer_data).execute()
        
        if not customer_result.data:
            print("❌ Não conseguiu criar customer")
            return None
            
        customer_id = customer_result.data[0]['id']
        print(f"✅ Customer criado: {customer_id}")
        
        # Testar order com customer_id
        order_data = {
            'customer_id': customer_id,
            'customer_name': 'João Silva Teste Orders',
            'customer_email': 'joao.orders@email.com',
            'customer_phone': '11999999999',
            'total_cents': 329000,  # R$ 3.290,00
            'status': 'pending'
        }
        
        try:
            order_result = supabase.table('orders').insert(order_data).execute()
            
            if order_result.data:
                print("✅ Order criada com sucesso!")
                order_id = order_result.data[0]['id']
                
                # Ver todos os campos que foram criados
                order_created = order_result.data[0]
                print(f"\n📊 CAMPOS DA ORDER CRIADA:")
                for key, value in order_created.items():
                    if key not in ['created_at', 'updated_at']:
                        print(f"   • {key}: {value}")
                
                # Limpar
                supabase.table('orders').delete().eq('id', order_id).execute()
                supabase.table('customers').delete().eq('id', customer_id).execute()
                
                return order_created
                
        except Exception as e:
            print(f"❌ Erro ao criar order: {str(e)}")
            # Limpar customer
            supabase.table('customers').delete().eq('id', customer_id).execute()
            return None
            
    except Exception as e:
        print(f"❌ Erro ao criar customer: {str(e)}")
        return None

def test_order_items():
    """Testa estrutura da tabela order_items"""
    print("\n🔍 TESTANDO ORDER_ITEMS")
    print("=" * 50)
    
    # Criar customer e order primeiro
    customer_data = {
        'name': 'Teste Order Items',
        'email': 'teste.items@email.com',
        'phone': '11999999999',
        'street': 'Rua Teste',
        'number': '123',
        'neighborhood': 'Centro',
        'city': 'São Paulo',
        'state': 'SP',
        'postal_code': '01234-567',
        'status': 'active'
    }
    
    try:
        # Customer
        customer_result = supabase.table('customers').insert(customer_data).execute()
        customer_id = customer_result.data[0]['id']
        
        # Order
        order_data = {
            'customer_id': customer_id,
            'customer_name': 'Teste Order Items',
            'customer_email': 'teste.items@email.com',
            'customer_phone': '11999999999',
            'total_cents': 329000,
            'status': 'pending'
        }
        
        order_result = supabase.table('orders').insert(order_data).execute()
        order_id = order_result.data[0]['id']
        
        # Order Item
        item_data = {
            'order_id': order_id,
            'product_id': 'test-product-id',
            'product_name': 'Colchão Padrão',
            'quantity': 1,
            'unit_price_cents': 329000,
            'total_price_cents': 329000
        }
        
        item_result = supabase.table('order_items').insert(item_data).execute()
        
        if item_result.data:
            print("✅ Order item criado com sucesso!")
            item_created = item_result.data[0]
            
            print(f"📊 CAMPOS DO ORDER_ITEM:")
            for key, value in item_created.items():
                if key not in ['created_at', 'updated_at']:
                    print(f"   • {key}: {value}")
            
            # Limpar tudo
            supabase.table('order_items').delete().eq('id', item_created['id']).execute()
            supabase.table('orders').delete().eq('id', order_id).execute()
            supabase.table('customers').delete().eq('id', customer_id).execute()
            
            return item_created
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return None

def main():
    print("🔍 DESCOBRINDO CONSTRAINTS E ESTRUTURAS COMPLETAS")
    print("=" * 60)
    
    # Testar source constraint
    valid_sources = test_source_values()
    
    # Descobrir orders
    orders_structure = discover_orders_with_customer()
    
    # Testar order_items
    items_structure = test_order_items()
    
    # Resumo
    print(f"\n📊 RESUMO FINAL")
    print("=" * 40)
    
    print(f"✅ SOURCES VÁLIDOS ({len(valid_sources)}):")
    for source in valid_sources:
        print(f"   • {source}")
    
    if orders_structure:
        print(f"\n✅ ORDERS - Estrutura descoberta:")
        for key in orders_structure.keys():
            if key not in ['created_at', 'updated_at']:
                print(f"   • {key}")
    
    if items_structure:
        print(f"\n✅ ORDER_ITEMS - Estrutura descoberta:")
        for key in items_structure.keys():
            if key not in ['created_at', 'updated_at']:
                print(f"   • {key}")
    
    # Salvar tudo
    complete_structure = {
        'customers': {
            'valid_sources': valid_sources,
            'fields': ['name', 'email', 'phone', 'street', 'number', 'complement', 
                      'neighborhood', 'city', 'state', 'postal_code', 'source', 'status']
        },
        'orders': orders_structure,
        'order_items': items_structure
    }
    
    import json
    with open('complete_sales_structure.json', 'w', encoding='utf-8') as f:
        json.dump(complete_structure, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"\n💾 Estrutura completa salva em: complete_sales_structure.json")

if __name__ == "__main__":
    main()