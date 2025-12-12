#!/usr/bin/env python3
"""
DEBUG DETALHADO DA API ASAAS
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

def debug_asaas_api():
    api_key = os.getenv('ASAAS_API_KEY')
    
    print("🔍 DEBUG DETALHADO DA API ASAAS")
    print("=" * 50)
    print(f"API Key original: '{api_key}'")
    print(f"Tamanho: {len(api_key) if api_key else 0}")
    print(f"Tipo: {type(api_key)}")
    
    # Testar diferentes formatos
    test_keys = [
        api_key,  # Original
        api_key.strip() if api_key else None,  # Sem espaços
        api_key.replace('$', '') if api_key else None,  # Sem $
    ]
    
    for i, key in enumerate(test_keys):
        if not key:
            continue
            
        print(f"\n🧪 TESTE {i+1}: {key[:30]}...")
        
        headers = {
            'Content-Type': 'application/json',
            'access_token': key
        }
        
        try:
            response = requests.get(
                'https://api.asaas.com/v3/myAccount',
                headers=headers,
                timeout=10
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ SUCESSO!")
                account = response.json()
                print(f"Conta: {account.get('name', 'N/A')}")
                return True
            else:
                print(f"❌ Erro: {response.text}")
                
        except Exception as e:
            print(f"❌ Exceção: {e}")
    
    # Testar com diferentes URLs
    print(f"\n🌐 TESTANDO DIFERENTES ENDPOINTS:")
    
    urls = [
        'https://api.asaas.com/v3/myAccount',
        'https://www.asaas.com/api/v3/myAccount',
        'https://sandbox.asaas.com/api/v3/myAccount'
    ]
    
    for url in urls:
        print(f"\n🔗 {url}")
        
        try:
            response = requests.get(
                url,
                headers={'access_token': api_key, 'Content-Type': 'application/json'},
                timeout=10
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code != 401:
                print(f"Resposta: {response.text[:200]}")
                
        except Exception as e:
            print(f"❌ Erro: {e}")

if __name__ == "__main__":
    debug_asaas_api()