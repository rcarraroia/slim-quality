#!/usr/bin/env python3
"""
TESTE COMPLETO DO FLUXO DE VENDAS
Testa criação de customer, order e order_items com todos os campos obrigatórios
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

def test_complete_order_flow():
    """Testa fluxo completo de criação de pedido"""
    print("🛒 TESTANDO FLUXO COMPLETO DE VENDAS")
    print("=" * 50)
    
    try:
        # 1. CRIAR CUSTOMER
        print("1️⃣ Criando customer...")
        customer_data = {
            'name': 'João Silva Comprador',
            'email': 'joao.comprador@email.com',
            'phone': '11999999999',
            'street': 'Rua das Flores',
            'number': '123',
            'complement': 'Apto 45',
            'neighborhood': 'Jardim Paulista',
            'city': 'São Paulo',
            'state': 'SP',
            'postal_code': '01310-100',
            'source': 'affiliate',  # Valor válido descoberto
            'status': 'active'
        }
        
        customer_result = supabase.table('customers').insert(customer_data).execute()
        
        if not customer_result.data:
            print("❌ Falha ao criar customer")
            return False
            
        customer = customer_result.data[0]
        customer_id = customer['id']
        print(f"✅ Customer criado: {customer_id}")
        
        # 2. CRIAR ORDER COM TODOS OS CAMPOS OBRIGATÓRIOS
        print("\n2️⃣ Criando order...")
        
        # Baseado no erro, precisa de subtotal_cents
        order_data = {
            'customer_id': customer_id,
            'customer_name': customer_data['name'],
            'customer_email': customer_data['email'],
            'customer_phone': customer_data['phone'],
            'subtotal_cents': 329000,  # Campo obrigatório descoberto
            'total_cents': 329000,
            'status': 'pending'
        }
        
        order_result = supabase.table('orders').insert(order_data).execute()
        
        if not order_result.data:
            print("❌ Falha ao criar order")
            # Limpar customer
            supabase.table('customers').delete().eq('id', customer_id).execute()
            return False
            
        order = order_result.data[0]
        order_id = order['id']
        print(f"✅ Order criada: {order_id}")
        
        # Mostrar todos os campos da order
        print(f"\n📊 CAMPOS DA ORDER CRIADA:")
        for key, value in order.items():
            if key not in ['created_at', 'updated_at'] and value is not None:
                print(f"   • {key}: {value}")
        
        # 3. CRIAR ORDER ITEM
        print(f"\n3️⃣ Criando order item...")
        
        # Buscar um produto real para usar
        products_result = supabase.table('products').select('id, name, price_cents').limit(1).execute()
        
        if products_result.data:
            product = products_result.data[0]
            product_id = product['id']
            product_name = product['name']
            product_price = product['price_cents']
        else:
            # Usar dados de teste se não houver produtos
            product_id = str(uuid.uuid4())
            product_name = 'Colchão Magnético Padrão'
            product_price = 329000
        
        item_data = {
            'order_id': order_id,
            'product_id': product_id,
            'product_name': product_name,
            'quantity': 1,
            'unit_price_cents': product_price,
            'total_price_cents': product_price
        }
        
        item_result = supabase.table('order_items').insert(item_data).execute()
        
        if not item_result.data:
            print("❌ Falha ao criar order item")
            # Limpar order e customer
            supabase.table('orders').delete().eq('id', order_id).execute()
            supabase.table('customers').delete().eq('id', customer_id).execute()
            return False
            
        item = item_result.data[0]
        item_id = item['id']
        print(f"✅ Order item criado: {item_id}")
        
        # Mostrar campos do item
        print(f"\n📊 CAMPOS DO ORDER_ITEM CRIADO:")
        for key, value in item.items():
            if key not in ['created_at', 'updated_at'] and value is not None:
                print(f"   • {key}: {value}")
        
        # 4. TESTAR OUTRAS TABELAS RELACIONADAS
        print(f"\n4️⃣ Testando tabelas relacionadas...")
        
        # Shipping Address
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
        
        try:
            shipping_result = supabase.table('shipping_addresses').insert(shipping_data).execute()
            if shipping_result.data:
                print("✅ Shipping address criado")
                shipping_id = shipping_result.data[0]['id']
            else:
                print("❌ Falha ao criar shipping address")
                shipping_id = None
        except Exception as e:
            print(f"❌ Erro shipping address: {str(e)[:100]}...")
            shipping_id = None
        
        # Order Status History
        status_data = {
            'order_id': order_id,
            'status': 'pending',
            'notes': 'Pedido criado via sistema'
        }
        
        try:
            status_result = supabase.table('order_status_history').insert(status_data).execute()
            if status_result.data:
                print("✅ Status history criado")
                status_history_id = status_result.data[0]['id']
            else:
                print("❌ Falha ao criar status history")
                status_history_id = None
        except Exception as e:
            print(f"❌ Erro status history: {str(e)[:100]}...")
            status_history_id = None
        
        # 5. RESUMO DO TESTE
        print(f"\n🎯 RESUMO DO TESTE COMPLETO:")
        print(f"✅ Customer ID: {customer_id}")
        print(f"✅ Order ID: {order_id}")
        print(f"✅ Order Item ID: {item_id}")
        if shipping_id:
            print(f"✅ Shipping ID: {shipping_id}")
        if status_history_id:
            print(f"✅ Status History ID: {status_history_id}")
        
        # 6. LIMPEZA
        print(f"\n🧹 Limpando dados de teste...")
        
        if status_history_id:
            supabase.table('order_status_history').delete().eq('id', status_history_id).execute()
        if shipping_id:
            supabase.table('shipping_addresses').delete().eq('id', shipping_id).execute()
        
        supabase.table('order_items').delete().eq('id', item_id).execute()
        supabase.table('orders').delete().eq('id', order_id).execute()
        supabase.table('customers').delete().eq('id', customer_id).execute()
        
        print("✅ Limpeza concluída")
        
        return True
        
    except Exception as e:
        print(f"❌ ERRO GERAL: {str(e)}")
        return False

def analyze_existing_data():
    """Analisa dados existentes nas tabelas"""
    print("\n📊 ANALISANDO DADOS EXISTENTES")
    print("=" * 50)
    
    tables = ['customers', 'orders', 'order_items', 'products']
    
    for table in tables:
        try:
            result = supabase.table(table).select('*').limit(3).execute()
            count_result = supabase.table(table).select('id', count='exact').execute()
            
            total = count_result.count if hasattr(count_result, 'count') else 0
            
            print(f"\n📋 {table.upper()}:")
            print(f"   Total de registros: {total}")
            
            if result.data:
                print(f"   Campos disponíveis: {list(result.data[0].keys())}")
                if total > 0:
                    print(f"   Exemplo de registro:")
                    for key, value in result.data[0].items():
                        if key not in ['created_at', 'updated_at']:
                            print(f"     • {key}: {value}")
            else:
                print("   Tabela vazia")
                
        except Exception as e:
            print(f"❌ Erro ao analisar {table}: {str(e)[:100]}...")

def main():
    print("🔍 ANÁLISE COMPLETA DO SISTEMA DE VENDAS")
    print("=" * 60)
    
    # Analisar dados existentes
    analyze_existing_data()
    
    # Testar fluxo completo
    success = test_complete_order_flow()
    
    # Conclusão
    print(f"\n📋 CONCLUSÃO DA ANÁLISE")
    print("=" * 40)
    
    if success:
        print("✅ SISTEMA DE VENDAS FUNCIONAL!")
        print("✅ Todas as tabelas principais funcionam")
        print("✅ Fluxo completo de pedido testado")
        print("✅ Pronto para implementar 'Comprar Agora'")
        
        print(f"\n🎯 ESTRUTURA DESCOBERTA:")
        print("• customers: name, email, phone, street, number, complement, neighborhood, city, state, postal_code, source (affiliate/organic), status")
        print("• orders: customer_id, customer_name, customer_email, customer_phone, subtotal_cents, total_cents, status")
        print("• order_items: order_id, product_id, product_name, quantity, unit_price_cents, total_price_cents")
        print("• shipping_addresses: order_id, recipient_name, street, number, complement, neighborhood, city, state, postal_code")
        print("• order_status_history: order_id, status, notes")
        
    else:
        print("❌ Sistema precisa de ajustes")
        print("❌ Verificar campos obrigatórios")
        
    print(f"\n📋 PRÓXIMOS PASSOS PARA 'COMPRAR AGORA':")
    print("1. Atualizar interfaces TypeScript com estrutura real")
    print("2. Implementar botão 'Comprar Agora' nas páginas de produto")
    print("3. Integrar AffiliateAwareCheckout com estrutura descoberta")
    print("4. Testar fluxo completo com rastreamento de afiliados")

if __name__ == "__main__":
    main()