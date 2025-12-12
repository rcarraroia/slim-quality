#!/usr/bin/env python3
"""
VERIFICAR ESTRUTURA REAL DA TABELA ORDERS
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

def check_orders_structure():
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json'
    }
    
    print("🔍 VERIFICANDO ESTRUTURA DA TABELA ORDERS")
    print("=" * 50)
    
    # Tentar buscar um registro existente para ver a estrutura
    try:
        response = requests.get(
            f"{supabase_url}/rest/v1/orders",
            headers=headers,
            params={'limit': 1},
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            orders = response.json()
            if orders:
                print("✅ Estrutura encontrada:")
                order = orders[0]
                for key, value in order.items():
                    print(f"  {key}: {type(value).__name__} = {value}")
            else:
                print("⚠️ Tabela vazia, não é possível ver estrutura")
        else:
            print(f"❌ Erro: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro: {e}")

def test_simple_customer_insert():
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'  # Importante para retornar dados
    }
    
    print("\n🧪 TESTE SIMPLES DE INSERÇÃO DE CLIENTE")
    print("=" * 50)
    
    customer_data = {
        'name': 'Teste Estrutura',
        'email': f'teste.estrutura.{os.getpid()}@test.com',
        'phone': '11999999999',
        'street': 'Rua Teste',
        'number': '123',
        'neighborhood': 'Centro',
        'city': 'São Paulo',
        'state': 'SP',
        'postal_code': '01000-000',
        'source': 'website',
        'status': 'active'
    }
    
    try:
        response = requests.post(
            f"{supabase_url}/rest/v1/customers",
            headers=headers,
            json=customer_data,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            if response.text:
                customer = response.json()
                print(f"✅ Cliente criado:")
                print(f"ID: {customer[0]['id']}")
                print(f"Nome: {customer[0]['name']}")
                
                # Limpar
                delete_response = requests.delete(
                    f"{supabase_url}/rest/v1/customers",
                    headers=headers,
                    params={'id': f"eq.{customer[0]['id']}"},
                    timeout=10
                )
                print(f"🧹 Limpeza: {delete_response.status_code}")
                
                return customer[0]
            else:
                print("⚠️ Inserção bem-sucedida mas sem retorno de dados")
                return True
        else:
            print(f"❌ Falha: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    check_orders_structure()
    test_simple_customer_insert()