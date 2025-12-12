#!/usr/bin/env python3
"""
TESTE DE INTEGRAÇÃO ASAAS - CHECKOUT REAL
Testa a integração completa com a API do Asaas usando as credenciais reais
"""

import os
import requests
import json
from datetime import datetime, timedelta

# Carregar variáveis de ambiente
from dotenv import load_dotenv
load_dotenv()

class AsaasTestClient:
    def __init__(self):
        self.api_key = os.getenv('ASAAS_API_KEY')
        self.base_url = 'https://api.asaas.com/v3'
        self.wallet_renum = os.getenv('ASAAS_WALLET_RENUM')
        self.wallet_jb = os.getenv('ASAAS_WALLET_JB')
        
        if not self.api_key:
            raise ValueError("❌ ASAAS_API_KEY não encontrada no .env")
        
        print(f"🔑 API Key: {self.api_key[:20]}...")
        print(f"💰 Wallet Renum: {self.wallet_renum}")
        print(f"💰 Wallet JB: {self.wallet_jb}")
    
    def get_headers(self):
        return {
            'Content-Type': 'application/json',
            'access_token': self.api_key
        }
    
    def test_api_connection(self):
        """Testa conexão básica com a API"""
        print("\n🔍 Testando conexão com API Asaas...")
        
        try:
            response = requests.get(
                f"{self.base_url}/myAccount",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                account = response.json()
                print(f"✅ Conexão OK - Conta: {account.get('name', 'N/A')}")
                return True
            else:
                print(f"❌ Erro na conexão: {response.status_code}")
                print(f"Resposta: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Erro de conexão: {e}")
            return False
    
    def create_test_customer(self):
        """Cria customer de teste"""
        print("\n👤 Criando customer de teste...")
        
        customer_data = {
            "name": "Cliente Teste Slim Quality",
            "email": f"teste.{datetime.now().strftime('%Y%m%d%H%M%S')}@slimquality.com.br",
            "phone": "11999887766",
            "mobilePhone": "11999887766",
            "cpfCnpj": "12345678901",
            "postalCode": "01310-100",
            "address": "Av. Paulista",
            "addressNumber": "1000",
            "complement": "Apto 101",
            "province": "Bela Vista",
            "city": "São Paulo",
            "state": "SP"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/customers",
                headers=self.get_headers(),
                json=customer_data,
                timeout=30
            )
            
            if response.status_code == 200:
                customer = response.json()
                print(f"✅ Customer criado: {customer['id']}")
                return customer['id']
            else:
                print(f"❌ Erro ao criar customer: {response.status_code}")
                print(f"Resposta: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao criar customer: {e}")
            return None
    
    def create_test_payment(self, customer_id):
        """Cria cobrança de teste"""
        print(f"\n💳 Criando cobrança de teste para customer {customer_id}...")
        
        # Simular venda de colchão Padrão
        payment_data = {
            "customer": customer_id,
            "billingType": "PIX",
            "value": 3290.00,  # Colchão Padrão
            "dueDate": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
            "description": "Teste - Slim Quality Colchão Padrão",
            "externalReference": f"test_order_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/payments",
                headers=self.get_headers(),
                json=payment_data,
                timeout=30
            )
            
            if response.status_code == 200:
                payment = response.json()
                print(f"✅ Cobrança criada: {payment['id']}")
                print(f"💰 Valor: R$ {payment['value']}")
                print(f"🔗 URL de pagamento: {payment.get('invoiceUrl', 'N/A')}")
                print(f"📱 PIX QR Code: {payment.get('pixQrCode', 'N/A')}")
                return payment
            else:
                print(f"❌ Erro ao criar cobrança: {response.status_code}")
                print(f"Resposta: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao criar cobrança: {e}")
            return None
    
    def create_test_split(self, payment_id):
        """Cria split de teste (sem afiliado)"""
        print(f"\n💰 Criando split para pagamento {payment_id}...")
        
        # Split sem afiliado (redistribuição para gestores)
        splits = [
            {
                "walletId": "f9c7d1dd-9e52-4e81-8194-8b666f276405",  # Fábrica (85%)
                "percentualValue": 85.0
            },
            {
                "walletId": self.wallet_renum,  # Renum (7.5%)
                "percentualValue": 7.5
            },
            {
                "walletId": self.wallet_jb,  # JB (7.5%)
                "percentualValue": 7.5
            }
        ]
        
        split_data = {"splits": splits}
        
        try:
            response = requests.post(
                f"{self.base_url}/payments/{payment_id}/split",
                headers=self.get_headers(),
                json=split_data,
                timeout=30
            )
            
            if response.status_code == 200:
                split = response.json()
                print(f"✅ Split criado: {split['id']}")
                
                for i, split_item in enumerate(split.get('splits', [])):
                    wallet_id = split_item.get('walletId')
                    value = split_item.get('value', 0)
                    print(f"  💸 Split {i+1}: {wallet_id} = R$ {value:.2f}")
                
                return split
            else:
                print(f"❌ Erro ao criar split: {response.status_code}")
                print(f"Resposta: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao criar split: {e}")
            return None
    
    def validate_wallets(self):
        """Valida se as Wallet IDs existem e estão ativas"""
        print("\n🔍 Validando Wallet IDs...")
        
        wallets = {
            "Renum": self.wallet_renum,
            "JB": self.wallet_jb,
            "Fábrica": "f9c7d1dd-9e52-4e81-8194-8b666f276405"
        }
        
        for name, wallet_id in wallets.items():
            if not wallet_id:
                print(f"❌ {name}: Wallet ID não configurada")
                continue
            
            try:
                response = requests.get(
                    f"{self.base_url}/wallets/{wallet_id}",
                    headers=self.get_headers(),
                    timeout=30
                )
                
                if response.status_code == 200:
                    wallet = response.json()
                    print(f"✅ {name}: {wallet_id} - {wallet.get('name', 'N/A')}")
                else:
                    print(f"❌ {name}: {wallet_id} - Erro {response.status_code}")
                    
            except Exception as e:
                print(f"❌ {name}: Erro ao validar - {e}")
    
    def run_full_test(self):
        """Executa teste completo de checkout"""
        print("🚀 INICIANDO TESTE COMPLETO DE CHECKOUT ASAAS")
        print("=" * 60)
        
        # 1. Testar conexão
        if not self.test_api_connection():
            return False
        
        # 2. Validar wallets
        self.validate_wallets()
        
        # 3. Criar customer
        customer_id = self.create_test_customer()
        if not customer_id:
            return False
        
        # 4. Criar cobrança
        payment = self.create_test_payment(customer_id)
        if not payment:
            return False
        
        # 5. Criar split
        split = self.create_test_split(payment['id'])
        if not split:
            return False
        
        print("\n" + "=" * 60)
        print("✅ TESTE COMPLETO EXECUTADO COM SUCESSO!")
        print(f"🔗 Acesse para pagar: {payment.get('invoiceUrl', 'N/A')}")
        print("=" * 60)
        
        return True

def main():
    try:
        client = AsaasTestClient()
        success = client.run_full_test()
        
        if success:
            print("\n🎉 Integração Asaas funcionando perfeitamente!")
        else:
            print("\n❌ Falhas encontradas na integração Asaas")
            
    except Exception as e:
        print(f"\n💥 Erro crítico: {e}")

if __name__ == "__main__":
    main()