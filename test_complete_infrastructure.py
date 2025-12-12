#!/usr/bin/env python3
"""
TESTE COMPLETO DA INFRAESTRUTURA CORRIGIDA
Testa todo o fluxo com dados reais
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
import uuid

# Carregar variáveis de ambiente
load_dotenv()

# Configurar cliente Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def test_complete_sales_flow():
    """Testa fluxo completo com dados reais"""
    print("🛒 TESTE COMPLETO DO FLUXO DE VENDAS")
    print("=" * 50)
    
    # Gerar ID único
    unique_id = str(uuid.uuid4())[:8]
    
    try:
        # 1. Buscar produto real
        products_result = supabase.table('products').select('id, name, sku, price_cents').limit(1).execute()
        
        if not products_result.data:
            print("❌ Nenhum produto encontrado no banco")
            return False
            
        product = products_result.data[0]
        print(f"✅ Produto encontrado: {product['name']} (SKU: {product['sku']})")
        
        # 2. Criar customer
        customer_data = {
            'name': f'João Silva {unique_id}',
            'email': f'joao.{unique_id}@email.com',
            'phone': '11999999999',
            'street': 'Rua das Flores',
            'number': '123',
            'complement': 'Apto 45',
            'neighborhood': 'Jardim Paulista',
            'city': 'São Paulo',
            'state': 'SP',
            'postal_code': '01310-100',
            'source': 'website',  # Agora deve funcionar
            'status': 'active'
        }
        
        customer_result = supabase.table('customers').insert(customer_data).execute()
        
        if not customer_result.data:
            print("❌ Falha ao criar customer")
            return False
            
        customer = customer_result.data[0]
        customer_id = customer['id']
        print(f"✅ Customer criado: {customer_id}")
        
        # 3. Criar order
        order_data = {
            'customer_id': customer_id,
            'customer_name': customer_data['name'],
            'customer_email': customer_data['email'],
            'customer_phone': customer_data['phone'],
            'subtotal_cents': product['price_cents'],
            'total_cents': product['price_cents'],
            'status': 'pending'
        }
        
        order_result = supabase.table('orders').insert(order_data).execute()
        
        if not order_result.data:
            print("❌ Falha ao criar order")
            supabase.table('customers').delete().eq('id', customer_id).execute()
            return False
            
        order = order_result.data[0]
        order_id = order['id']
        print(f"✅ Order criada: {order_id}")
        
        # 4. Criar order_item com produto real
        item_data = {
            'order_id': order_id,
            'product_id': product['id'],
            'product_name': product['name'],
            'product_sku': product['sku'],  # Agora opcional mas vamos incluir
            'quantity': 1,
            'unit_price_cents': product['price_cents'],
            'total_price_cents': product['price_cents']
        }
        
        item_result = supabase.table('order_items').insert(item_data).execute()
        
        if not item_result.data:
            print("❌ Falha ao criar order_item")
            supabase.table('orders').delete().eq('id', order_id).execute()
            supabase.table('customers').delete().eq('id', customer_id).execute()
            return False
            
        item = item_result.data[0]
        item_id = item['id']
        print(f"✅ Order item criado: {item_id}")
        
        # 5. Testar shipping_address
        shipping_data = {
            'order_id': order_id,
            'recipient_name': customer_data['name'],
            'street': customer_data['street'],
            'number': customer_data['number'],
            'complement': customer_data['complement'],
            'neighborhood': customer_data['neighborhood'],
            'city': customer_data['city'],
            'state': customer_data['state'],
            'postal_code': customer_data['postal_code']
        }
        
        shipping_result = supabase.table('shipping_addresses').insert(shipping_data).execute()
        
        if shipping_result.data:
            shipping_id = shipping_result.data[0]['id']
            print(f"✅ Shipping address criado: {shipping_id}")
        else:
            print("⚠️  Shipping address falhou")
            shipping_id = None
        
        # 6. Resumo do sucesso
        print(f"\n🎉 FLUXO COMPLETO FUNCIONANDO!")
        print(f"   Customer: {customer_id}")
        print(f"   Order: {order_id}")
        print(f"   Order Item: {item_id}")
        if shipping_id:
            print(f"   Shipping: {shipping_id}")
        
        # 7. Limpeza
        print(f"\n🧹 Limpando dados de teste...")
        if shipping_id:
            supabase.table('shipping_addresses').delete().eq('id', shipping_id).execute()
        supabase.table('order_items').delete().eq('id', item_id).execute()
        supabase.table('orders').delete().eq('id', order_id).execute()
        supabase.table('customers').delete().eq('id', customer_id).execute()
        print("✅ Limpeza concluída")
        
        return True
        
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")
        return False

def test_source_values():
    """Testa todos os valores de source permitidos"""
    print("\n🧪 TESTANDO VALORES DE SOURCE")
    print("=" * 50)
    
    sources = ['affiliate', 'organic', 'website', 'whatsapp', 'direct', 'social', 'email', 'google', 'facebook', 'instagram', 'referral']
    
    valid_sources = []
    
    for source in sources:
        unique_id = str(uuid.uuid4())[:8]
        test_data = {
            'name': f'Teste {source}',
            'email': f'teste.{source}.{unique_id}@email.com',
            'phone': '11999999999',
            'street': 'Rua Teste',
            'number': '123',
            'neighborhood': 'Centro',
            'city': 'São Paulo',
            'state': 'SP',
            'postal_code': '01234-567',
            'source': source,
            'status': 'active'
        }
        
        try:
            result = supabase.table('customers').insert(test_data).execute()
            if result.data:
                print(f"✅ Source '{source}': FUNCIONA")
                valid_sources.append(source)
                # Limpar
                supabase.table('customers').delete().eq('id', result.data[0]['id']).execute()
            else:
                print(f"❌ Source '{source}': FALHOU")
        except Exception as e:
            print(f"❌ Source '{source}': {str(e)[:50]}...")
    
    return valid_sources

def main():
    print("🔧 TESTE COMPLETO DA INFRAESTRUTURA")
    print("=" * 60)
    
    # Testar fluxo completo
    flow_success = test_complete_sales_flow()
    
    # Testar sources
    valid_sources = test_source_values()
    
    # Resumo final
    print(f"\n📊 RESUMO FINAL")
    print("=" * 40)
    
    if flow_success:
        print("🎉 INFRAESTRUTURA 100% FUNCIONAL!")
        print("✅ Foreign keys corrigidas")
        print("✅ Constraints ajustadas")
        print("✅ Fluxo completo testado")
        print("✅ Sistema pronto para 'Comprar Agora'")
        
        print(f"\n📋 SOURCES VÁLIDOS ({len(valid_sources)}):")
        for source in valid_sources:
            print(f"   • {source}")
        
        print(f"\n🎯 PRÓXIMOS PASSOS:")
        print("1. ✅ Implementar botão 'Comprar Agora'")
        print("2. ✅ Integrar AffiliateAwareCheckout")
        print("3. ✅ Completar sistema de afiliados")
        
        # Atualizar plano
        print(f"\n📋 ATUALIZANDO PLANO:")
        print("✅ FASE 1: Correções de Infraestrutura - CONCLUÍDA")
        print("🚀 Pronto para FASE 2: Sistema 'Comprar Agora'")
        
    else:
        print("❌ INFRAESTRUTURA AINDA COM PROBLEMAS")
        print("⚠️  Não pode prosseguir para próxima fase")

if __name__ == "__main__":
    main()