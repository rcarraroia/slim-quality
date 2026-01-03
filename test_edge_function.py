#!/usr/bin/env python3
"""
Teste da Edge Function admin-create-user
"""

import requests
import json
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def test_edge_function():
    """Testa a Edge Function de criação de usuário"""
    
    # URL da Edge Function
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
    
    # Dados de teste - ADMIN
    data = {
        'email': 'admin.teste@exemplo.com',
        'password': 'admin123',
        'userData': {
            'full_name': 'Admin Teste',
            'role': 'admin',
            'status': 'ativo',
            'phone': '31888888888',
            'is_affiliate': False
        }
    }
    
    print("🧪 Testando Edge Function...")
    print(f"URL: {url}")
    print(f"Headers: {headers}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        print(f"\n📊 Resposta:")
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.text:
            try:
                response_data = response.json()
                print(f"Body: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Body (raw): {response.text}")
        
        if response.status_code == 200:
            print("✅ Edge Function funcionando!")
        else:
            print(f"❌ Edge Function retornou erro: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro ao chamar Edge Function: {e}")

if __name__ == "__main__":
    test_edge_function()