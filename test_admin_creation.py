#!/usr/bin/env python3
"""
Teste específico para criação de usuário Admin
"""

import requests
import json
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def test_admin_creation():
    """Testa criação de usuário Admin via Edge Function"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    anon_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not anon_key:
        print("❌ Variáveis de ambiente não configuradas")
        return
    
    url = f"{supabase_url}/functions/v1/admin-create-user"
    
    headers = {
        'Authorization': f'Bearer {anon_key}',
        'Content-Type': 'application/json',
        'apikey': anon_key
    }
    
    # Teste 1: Criar Admin
    print("🧪 TESTE 1: Criando usuário ADMIN...")
    data_admin = {
        'email': 'admin.final.teste@slimquality.com.br',
        'password': 'admin123456',
        'userData': {
            'full_name': 'Admin Final Teste',
            'role': 'admin',
            'status': 'ativo',
            'phone': '31987654321',
            'is_affiliate': False
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=data_admin, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Admin criado com sucesso!")
            result = response.json()
            user_id = result['data']['user']['id']
            print(f"User ID: {user_id}")
        else:
            print(f"❌ Erro ao criar Admin: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Teste 2: Criar Vendedor (para comparação)
    print("🧪 TESTE 2: Criando usuário VENDEDOR...")
    data_vendedor = {
        'email': 'vendedor.final.teste@slimquality.com.br',
        'password': 'vendedor123456',
        'userData': {
            'full_name': 'Vendedor Final Teste',
            'role': 'vendedor',
            'status': 'ativo',
            'phone': '31987654322',
            'is_affiliate': True
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=data_vendedor, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Vendedor criado com sucesso!")
            result = response.json()
            user_id = result['data']['user']['id']
            print(f"User ID: {user_id}")
        else:
            print(f"❌ Erro ao criar Vendedor: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    test_admin_creation()