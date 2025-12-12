#!/usr/bin/env python3
"""
TESTE COMPLETO DO SISTEMA DE CHECKOUT
Testa o fluxo completo: produto -> checkout -> banco
"""

import os
import requests
import json
from datetime import datetime

# Carregar variáveis de ambiente
from dotenv import load_dotenv
load_dotenv()

class CheckoutSystemTest:
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("❌ Credenciais Supabase não encontradas")
        
        print(f"🔗 Supabase URL: {self.supabase_url}")
        print(f"🔑 Supabase Key: {self.supabase_key[:20]}...")
    
    def get_supabase_headers(self):
        return {
            'apikey': self.supabase_key,
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    
    def test_products_loading(self):
        """Testa se os produtos estão carregando"""
        print("\n📦 Testando carregamento de produtos...")
        
        try:
            response = requests.get(
                f"{self.supabase_url}/rest/v1/products",
                headers=self.get_supabase_headers(),
                params={'select': '*', 'is_active': 'eq.true'},
                timeout=10
            )
            
            if response.status_code == 200:
                products = response.json()
                print(f"✅ {len(products)} produtos encontrados")
                
                if products:
                    first_product = products[0]
                    print(f"  📋 Produto teste: {first_product['name']}")
                    print(f"  💰 Preço: R$ {first_product['price_cents'] / 100:.2f}")
                    return first_product
                else:
                    print("❌ Nenhum produto ativo encontrado")
                    return None
            else:
                print(f"❌ Erro ao carregar produtos: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao testar produtos: {e}")
            return None
    
    def test_customer_creation(self):
        """Testa criação de cliente"""
        print("\n👤 Testando criação de cliente...")
        
        customer_data = {
            "name": "Cliente Teste Checkout",
            "email": f"teste.checkout.{datetime.now().strftime('%Y%m%d%H%M%S')}@slimquality.com.br",
            "phone": "11999887766",
            "street": "Rua Teste",
            "number": "123",
            "neighborhood": "Centro",
            "city": "São Paulo",
            "state": "SP",
            "postal_code": "01310-100",
            "source": "website",
            "status": "active"
        }
        
        try:
            response = requests.post(
                f"{self.supabase_url}/rest/v1/customers",
                headers=self.get_supabase_headers(),
                json=customer_data,
                timeout=10
            )
            
            if response.status_code == 201:
                customer = response.json()
                print(f"✅ Cliente criado: {customer[0]['id']}")
                return customer[0]
            else:
                print(f"❌ Erro ao criar cliente: {response.status_code}")
                print(f"Resposta: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao criar cliente: {e}")
            return None
    
    def test_order_creation(self, customer, product):
        """Testa criação de pedido"""
        print(f"\n📦 Testando criação de pedido...")
        
        order_data = {
            "customer_id": customer['id'],
            "customer_name": customer['name'],
            "customer_email": customer['email'],
            "customer_phone": customer['phone'],
            "subtotal_cents": product['price_cents'],
            "shipping_cents": 0,
            "discount_cents": 0,
            "total_cents": product['price_cents'],
            "status": "pending"
            # Remover payment_method - não existe na estrutura real
        }
        
        try:
            response = requests.post(
                f"{self.supabase_url}/rest/v1/orders",
                headers=self.get_supabase_headers(),
                json=order_data,
                timeout=10
            )
            
            if response.status_code == 201:
                order = response.json()
                print(f"✅ Pedido criado: {order[0]['id']}")
                return order[0]
            else:
                print(f"❌ Erro ao criar pedido: {response.status_code}")
                print(f"Resposta: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao criar pedido: {e}")
            return None
    
    def test_order_item_creation(self, order, product):
        """Testa criação de item do pedido"""
        print(f"\n📋 Testando criação de item do pedido...")
        
        item_data = {
            "order_id": order['id'],
            "product_id": product['id'],
            "product_name": product['name'],
            "product_sku": product['sku'],
            "quantity": 1,
            "unit_price_cents": product['price_cents'],
            "total_price_cents": product['price_cents']
        }
        
        try:
            response = requests.post(
                f"{self.supabase_url}/rest/v1/order_items",
                headers=self.get_supabase_headers(),
                json=item_data,
                timeout=10
            )
            
            if response.status_code == 201:
                item = response.json()
                print(f"✅ Item criado: {item[0]['id']}")
                return item[0]
            else:
                print(f"❌ Erro ao criar item: {response.status_code}")
                print(f"Resposta: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao criar item: {e}")
            return None
    
    def test_shipping_address_creation(self, order):
        """Testa criação de endereço de entrega"""
        print(f"\n🏠 Testando criação de endereço de entrega...")
        
        shipping_data = {
            "order_id": order['id'],
            "recipient_name": order['customer_name'],
            "street": "Rua de Entrega",
            "number": "456",
            "neighborhood": "Bairro Teste",
            "city": "São Paulo",
            "state": "SP",
            "postal_code": "01310-200",
            "phone": order['customer_phone']
        }
        
        try:
            response = requests.post(
                f"{self.supabase_url}/rest/v1/shipping_addresses",
                headers=self.get_supabase_headers(),
                json=shipping_data,
                timeout=10
            )
            
            if response.status_code == 201:
                address = response.json()
                print(f"✅ Endereço criado: {address[0]['id']}")
                return address[0]
            else:
                print(f"❌ Erro ao criar endereço: {response.status_code}")
                print(f"Resposta: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao criar endereço: {e}")
            return None
    
    def run_complete_test(self):
        """Executa teste completo do sistema"""
        print("🚀 INICIANDO TESTE COMPLETO DO SISTEMA DE CHECKOUT")
        print("=" * 60)
        
        # 1. Testar produtos
        product = self.test_products_loading()
        if not product:
            return False
        
        # 2. Testar criação de cliente
        customer = self.test_customer_creation()
        if not customer:
            return False
        
        # 3. Testar criação de pedido
        order = self.test_order_creation(customer, product)
        if not order:
            return False
        
        # 4. Testar criação de item
        item = self.test_order_item_creation(order, product)
        if not item:
            return False
        
        # 5. Testar criação de endereço
        address = self.test_shipping_address_creation(order)
        if not address:
            return False
        
        print("\n" + "=" * 60)
        print("✅ SISTEMA DE CHECKOUT FUNCIONANDO COMPLETAMENTE!")
        print(f"📦 Pedido: {order['id']}")
        print(f"👤 Cliente: {customer['name']}")
        print(f"💰 Valor: R$ {order['total_cents'] / 100:.2f}")
        print("=" * 60)
        
        return True

def main():
    try:
        tester = CheckoutSystemTest()
        success = tester.run_complete_test()
        
        if success:
            print("\n🎉 Sistema de checkout está funcionando!")
            print("⚠️ Apenas a integração Asaas precisa de API key válida")
        else:
            print("\n❌ Problemas encontrados no sistema")
            
    except Exception as e:
        print(f"\n💥 Erro crítico: {e}")

if __name__ == "__main__":
    main()