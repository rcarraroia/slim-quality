#!/usr/bin/env python3
"""
INVESTIGAÇÃO RLS VIA API REST DO SUPABASE
Usa a API REST para investigar políticas RLS e estrutura do banco
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

class RLSAPIInvestigator:
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("❌ Credenciais Supabase não encontradas")
        
        print("🔍 INVESTIGAÇÃO RLS VIA API REST")
        print("=" * 50)
        print(f"🔗 URL: {self.supabase_url}")
        print(f"🔑 Key: {self.supabase_key[:20]}...")
    
    def get_headers(self):
        return {
            'apikey': self.supabase_key,
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json'
        }
    
    def test_table_access(self, table_name, operation='SELECT'):
        """Testa acesso a uma tabela específica"""
        print(f"\n🧪 Testando {operation} em {table_name}...")
        
        try:
            if operation == 'SELECT':
                response = requests.get(
                    f"{self.supabase_url}/rest/v1/{table_name}",
                    headers=self.get_headers(),
                    params={'limit': 1},
                    timeout=10
                )
            elif operation == 'INSERT':
                # Dados de teste mínimos
                test_data = self.get_test_data(table_name)
                if not test_data:
                    print(f"⚠️ Sem dados de teste para {table_name}")
                    return False
                
                response = requests.post(
                    f"{self.supabase_url}/rest/v1/{table_name}",
                    headers=self.get_headers(),
                    json=test_data,
                    timeout=10
                )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200 or response.status_code == 201:
                print(f"✅ {operation} permitido em {table_name}")
                return True
            elif response.status_code == 401:
                print(f"❌ {operation} negado em {table_name} - RLS bloqueando")
                print(f"Erro: {response.text}")
                return False
            else:
                print(f"⚠️ {operation} em {table_name} - Status {response.status_code}")
                print(f"Resposta: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao testar {table_name}: {e}")
            return False
    
    def get_test_data(self, table_name):
        """Retorna dados de teste para cada tabela"""
        test_data = {
            'customers': {
                'name': 'Teste RLS API',
                'email': f'teste.rls.api.{os.getpid()}@test.com',
                'phone': '11999999999',
                'street': 'Rua Teste',
                'number': '123',
                'neighborhood': 'Centro',
                'city': 'São Paulo',
                'state': 'SP',
                'postal_code': '01000-000',
                'source': 'website',
                'status': 'active'
            },
            'customer_timeline': {
                'customer_id': '00000000-0000-0000-0000-000000000000',  # UUID fake
                'event_type': 'created',
                'description': 'Teste RLS',
                'metadata': {}
            },
            'orders': {
                'customer_id': '00000000-0000-0000-0000-000000000000',
                'customer_name': 'Teste',
                'customer_email': 'teste@test.com',
                'customer_phone': '11999999999',
                'subtotal_cents': 100000,
                'shipping_cents': 0,
                'discount_cents': 0,
                'total_cents': 100000,
                'status': 'pending',
                'payment_method': 'pix'
            },
            'order_items': {
                'order_id': '00000000-0000-0000-0000-000000000000',
                'product_id': '00000000-0000-0000-0000-000000000000',
                'product_name': 'Produto Teste',
                'product_sku': 'TEST-001',
                'quantity': 1,
                'unit_price_cents': 100000,
                'total_price_cents': 100000
            },
            'shipping_addresses': {
                'order_id': '00000000-0000-0000-0000-000000000000',
                'recipient_name': 'Teste',
                'street': 'Rua Teste',
                'number': '123',
                'neighborhood': 'Centro',
                'city': 'São Paulo',
                'state': 'SP',
                'postal_code': '01000-000',
                'phone': '11999999999'
            },
            'referral_conversions': {
                'referral_code': 'TEST123',
                'order_id': '00000000-0000-0000-0000-000000000000',
                'converted_at': '2025-12-12T18:00:00Z'
            }
        }
        
        return test_data.get(table_name)
    
    def investigate_checkout_tables(self):
        """Investiga todas as tabelas do checkout"""
        print("\n🛒 INVESTIGAÇÃO DAS TABELAS DO CHECKOUT")
        print("=" * 50)
        
        checkout_tables = [
            'customers',
            'customer_timeline',
            'orders', 
            'order_items',
            'shipping_addresses',
            'referral_conversions',
            'products',
            'affiliates'
        ]
        
        results = {}
        
        for table in checkout_tables:
            print(f"\n📊 TABELA: {table}")
            print("-" * 30)
            
            # Testar SELECT
            select_ok = self.test_table_access(table, 'SELECT')
            
            # Testar INSERT (apenas para tabelas críticas)
            insert_ok = False
            if table in ['customers', 'customer_timeline', 'orders', 'order_items', 'shipping_addresses']:
                insert_ok = self.test_table_access(table, 'INSERT')
            
            results[table] = {
                'select': select_ok,
                'insert': insert_ok
            }
        
        return results
    
    def analyze_rls_patterns(self, results):
        """Analisa padrões nos resultados RLS"""
        print("\n📊 ANÁLISE DOS PADRÕES RLS")
        print("=" * 40)
        
        blocked_selects = [table for table, result in results.items() if not result['select']]
        blocked_inserts = [table for table, result in results.items() if not result['insert']]
        
        print(f"\n❌ Tabelas com SELECT bloqueado ({len(blocked_selects)}):")
        for table in blocked_selects:
            print(f"  - {table}")
        
        print(f"\n❌ Tabelas com INSERT bloqueado ({len(blocked_inserts)}):")
        for table in blocked_inserts:
            print(f"  - {table}")
        
        # Identificar padrão
        if len(blocked_inserts) > 0:
            print(f"\n🔍 PADRÃO IDENTIFICADO:")
            print(f"RLS está bloqueando inserções em {len(blocked_inserts)} tabelas")
            print(f"Isso indica políticas RLS muito restritivas ou ausentes")
        
        return blocked_selects, blocked_inserts
    
    def test_specific_customer_insert(self):
        """Testa inserção específica de cliente com dados reais"""
        print(f"\n🧪 TESTE ESPECÍFICO: INSERÇÃO DE CLIENTE")
        print("-" * 40)
        
        customer_data = {
            'name': 'Cliente Teste Checkout Real',
            'email': f'checkout.test.{os.getpid()}@slimquality.com.br',
            'phone': '11987654321',
            'street': 'Av. Paulista',
            'number': '1000',
            'complement': 'Apto 101',
            'neighborhood': 'Bela Vista',
            'city': 'São Paulo',
            'state': 'SP',
            'postal_code': '01310-100',
            'source': 'website',
            'status': 'active'
        }
        
        try:
            response = requests.post(
                f"{self.supabase_url}/rest/v1/customers",
                headers=self.get_headers(),
                json=customer_data,
                timeout=15
            )
            
            print(f"Status: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            
            if response.status_code == 201:
                customer = response.json()
                print(f"✅ Cliente criado com sucesso!")
                print(f"ID: {customer[0]['id']}")
                
                # Limpar o teste
                delete_response = requests.delete(
                    f"{self.supabase_url}/rest/v1/customers",
                    headers=self.get_headers(),
                    params={'id': f"eq.{customer[0]['id']}"},
                    timeout=10
                )
                print(f"🧹 Limpeza: {delete_response.status_code}")
                
                return True
            else:
                print(f"❌ Falha na criação do cliente")
                print(f"Resposta completa: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Erro na inserção: {e}")
            return False
    
    def run_investigation(self):
        """Executa investigação completa"""
        print("\n🚀 INICIANDO INVESTIGAÇÃO COMPLETA")
        
        # 1. Testar acesso às tabelas
        results = self.investigate_checkout_tables()
        
        # 2. Analisar padrões
        blocked_selects, blocked_inserts = self.analyze_rls_patterns(results)
        
        # 3. Teste específico de cliente
        customer_insert_ok = self.test_specific_customer_insert()
        
        # 4. Relatório final
        print(f"\n" + "=" * 60)
        print(f"📋 RELATÓRIO FINAL DA INVESTIGAÇÃO RLS")
        print(f"=" * 60)
        print(f"✅ Tabelas com acesso liberado: {len([t for t, r in results.items() if r['select']])}")
        print(f"❌ Tabelas com SELECT bloqueado: {len(blocked_selects)}")
        print(f"❌ Tabelas com INSERT bloqueado: {len(blocked_inserts)}")
        print(f"🧪 Teste de cliente específico: {'✅ OK' if customer_insert_ok else '❌ FALHOU'}")
        
        if len(blocked_inserts) > 0:
            print(f"\n🎯 AÇÃO NECESSÁRIA:")
            print(f"Criar políticas RLS permissivas para checkout público")
            print(f"Tabelas prioritárias: {', '.join(blocked_inserts[:3])}")
        else:
            print(f"\n🎉 RLS configurado corretamente para checkout!")
        
        return results

def main():
    try:
        investigator = RLSAPIInvestigator()
        results = investigator.run_investigation()
        
    except Exception as e:
        print(f"\n💥 Erro na investigação: {e}")

if __name__ == "__main__":
    main()