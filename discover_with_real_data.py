#!/usr/bin/env python3
"""
Descobrir estruturas usando dados reais conectados
"""
from supabase import create_client, Client
import uuid

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def discover_complete_system():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 DESCOBRINDO SISTEMA COMPLETO COM DADOS REAIS")
    print("=" * 70)
    
    created_ids = {}
    
    try:
        # 1. CRIAR CLIENTE (sabemos que funciona)
        print("1. Criando cliente...")
        customer_data = {
            'name': 'João Silva Teste',
            'email': 'joao.teste@email.com',
            'phone': '11999999999',
            'cpf_cnpj': '12345678901',
            'street': 'Rua Teste, 123',
            'number': '123',
            'neighborhood': 'Centro',
            'city': 'São Paulo',
            'state': 'SP',
            'postal_code': '01234-567',
            'source': 'website'
        }
        
        customer_result = supabase.table('customers').insert(customer_data).execute()
        customer_id = customer_result.data[0]['id']
        created_ids['customer'] = customer_id
        print(f"✅ Cliente criado: {customer_id}")
        
        # 2. BUSCAR PRODUTO REAL
        print("2. Buscando produto real...")
        products = supabase.table('products').select('*').limit(1).execute()
        if products.data:
            product = products.data[0]
            product_id = product['id']
            print(f"✅ Produto encontrado: {product['name']} ({product_id})")
        else:
            print("❌ Nenhum produto encontrado")
            return
        
        # 3. DESCOBRIR ESTRUTURA DE ORDERS
        print("3. Descobrindo estrutura de orders...")
        order_data = {
            'customer_id': customer_id,
            'total_cents': product['price_cents'],
            'status': 'pending'
        }
        
        try:
            order_result = supabase.table('orders').insert(order_data).execute()
            order_id = order_result.data[0]['id']
            created_ids['order'] = order_id
            print(f"✅ Order criado: {order_id}")
            
            print("📄 Estrutura de ORDERS:")
            for col in sorted(order_result.data[0].keys()):
                value = order_result.data[0][col]
                print(f"   - {col}: {type(value).__name__} = {value}")
                
        except Exception as e:
            print(f"❌ Erro ao criar order: {e}")
            # Tentar descobrir campos obrigatórios
            if "not-null constraint" in str(e):
                field = extract_required_field(str(e))
                print(f"   → Campo obrigatório: {field}")
        
        # 4. DESCOBRIR ORDER_ITEMS (se order foi criado)
        if 'order' in created_ids:
            print("4. Descobrindo estrutura de order_items...")
            item_data = {
                'order_id': created_ids['order'],
                'product_id': product_id,
                'product_sku': product['sku'],
                'product_name': product['name'],
                'quantity': 1,
                'unit_price_cents': product['price_cents'],
                'total_price_cents': product['price_cents']
            }
            
            try:
                item_result = supabase.table('order_items').insert(item_data).execute()
                item_id = item_result.data[0]['id']
                created_ids['order_item'] = item_id
                print(f"✅ Order item criado: {item_id}")
                
                print("📄 Estrutura de ORDER_ITEMS:")
                for col in sorted(item_result.data[0].keys()):
                    value = item_result.data[0][col]
                    print(f"   - {col}: {type(value).__name__} = {value}")
                    
            except Exception as e:
                print(f"❌ Erro ao criar order_item: {e}")
        
        # 5. DESCOBRIR PAYMENTS
        if 'order' in created_ids:
            print("5. Descobrindo estrutura de payments...")
            payment_data = {
                'order_id': created_ids['order'],
                'amount_cents': product['price_cents'],
                'status': 'pending',
                'payment_method': 'pix'
            }
            
            try:
                payment_result = supabase.table('payments').insert(payment_data).execute()
                payment_id = payment_result.data[0]['id']
                created_ids['payment'] = payment_id
                print(f"✅ Payment criado: {payment_id}")
                
                print("📄 Estrutura de PAYMENTS:")
                for col in sorted(payment_result.data[0].keys()):
                    value = payment_result.data[0][col]
                    print(f"   - {col}: {type(value).__name__} = {value}")
                    
            except Exception as e:
                print(f"❌ Erro ao criar payment: {e}")
        
        # 6. DESCOBRIR SHIPPING_ADDRESSES
        if 'order' in created_ids:
            print("6. Descobrindo estrutura de shipping_addresses...")
            shipping_data = {
                'order_id': created_ids['order'],
                'recipient_name': 'João Silva Teste',
                'street': 'Rua Teste, 123',
                'city': 'São Paulo',
                'state': 'SP',
                'postal_code': '01234-567'
            }
            
            try:
                shipping_result = supabase.table('shipping_addresses').insert(shipping_data).execute()
                shipping_id = shipping_result.data[0]['id']
                created_ids['shipping'] = shipping_id
                print(f"✅ Shipping address criado: {shipping_id}")
                
                print("📄 Estrutura de SHIPPING_ADDRESSES:")
                for col in sorted(shipping_result.data[0].keys()):
                    value = shipping_result.data[0][col]
                    print(f"   - {col}: {type(value).__name__} = {value}")
                    
            except Exception as e:
                print(f"❌ Erro ao criar shipping: {e}")
        
        # 7. DESCOBRIR CONVERSATIONS
        print("7. Descobrindo estrutura de conversations...")
        conversation_data = {
            'customer_id': customer_id,
            'subject': 'Dúvida sobre produto',
            'status': 'open'
        }
        
        try:
            conv_result = supabase.table('conversations').insert(conversation_data).execute()
            conv_id = conv_result.data[0]['id']
            created_ids['conversation'] = conv_id
            print(f"✅ Conversation criado: {conv_id}")
            
            print("📄 Estrutura de CONVERSATIONS:")
            for col in sorted(conv_result.data[0].keys()):
                value = conv_result.data[0][col]
                print(f"   - {col}: {type(value).__name__} = {value}")
                
        except Exception as e:
            print(f"❌ Erro ao criar conversation: {e}")
        
        # 8. DESCOBRIR APPOINTMENTS
        print("8. Descobrindo estrutura de appointments...")
        appointment_data = {
            'customer_id': customer_id,
            'title': 'Consulta sobre colchão',
            'scheduled_at': '2025-12-15T10:00:00Z',
            'status': 'scheduled'
        }
        
        try:
            appt_result = supabase.table('appointments').insert(appointment_data).execute()
            appt_id = appt_result.data[0]['id']
            created_ids['appointment'] = appt_id
            print(f"✅ Appointment criado: {appt_id}")
            
            print("📄 Estrutura de APPOINTMENTS:")
            for col in sorted(appt_result.data[0].keys()):
                value = appt_result.data[0][col]
                print(f"   - {col}: {type(value).__name__} = {value}")
                
        except Exception as e:
            print(f"❌ Erro ao criar appointment: {e}")
        
        return created_ids
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        return created_ids

def extract_required_field(error_msg):
    """Extrair campo obrigatório do erro"""
    try:
        if 'column "' in error_msg and '" of relation' in error_msg:
            start = error_msg.find('column "') + 8
            end = error_msg.find('" of relation', start)
            return error_msg[start:end]
    except:
        pass
    return "desconhecido"

def cleanup_test_data(created_ids):
    """Limpar dados de teste"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print(f"\n🧹 LIMPANDO DADOS DE TESTE...")
    
    # Ordem de limpeza (reversa para evitar FK errors)
    cleanup_order = [
        ('appointments', 'appointment'),
        ('conversations', 'conversation'),
        ('shipping_addresses', 'shipping'),
        ('payments', 'payment'),
        ('order_items', 'order_item'),
        ('orders', 'order'),
        ('customers', 'customer')
    ]
    
    for table, key in cleanup_order:
        if key in created_ids:
            try:
                supabase.table(table).delete().eq('id', created_ids[key]).execute()
                print(f"✅ {table}: removido")
            except Exception as e:
                print(f"⚠️  {table}: erro na limpeza - {e}")

def main():
    created_ids = discover_complete_system()
    
    print(f"\n📊 RESUMO DA DESCOBERTA:")
    print("=" * 50)
    
    discovered_tables = list(created_ids.keys())
    total_tables = 7  # customers, orders, order_items, payments, shipping, conversations, appointments
    
    print(f"Tabelas descobertas: {len(discovered_tables)}/{total_tables}")
    for table in discovered_tables:
        print(f"✅ {table}")
    
    if len(discovered_tables) >= 4:  # customers + orders + items + payments
        print(f"\n🎉 SISTEMA BÁSICO DE PEDIDOS FUNCIONAL!")
        print(f"✅ Pode implementar 'Comprar Agora'")
        print(f"✅ Integração com afiliados possível")
    else:
        print(f"\n⚠️  Sistema precisa de mais ajustes")
    
    # Limpar dados de teste
    cleanup_test_data(created_ids)
    print(f"\n✅ Dados de teste removidos")

if __name__ == "__main__":
    main()