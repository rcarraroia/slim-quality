#!/usr/bin/env python3
"""
Teste simples da API Asaas
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('ASAAS_API_KEY')
print(f"🔑 Testando API Key: {api_key[:30]}...")

# Testar diferentes endpoints
endpoints = [
    '/myAccount',
    '/customers',
    '/payments'
]

headers = {
    'Content-Type': 'application/json',
    'access_token': api_key
}

for endpoint in endpoints:
    print(f"\n🔍 Testando {endpoint}...")
    
    try:
        response = requests.get(
            f"https://api.asaas.com/v3{endpoint}",
            headers=headers,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Sucesso!")
            data = response.json()
            if endpoint == '/myAccount':
                print(f"Conta: {data.get('name', 'N/A')}")
        else:
            print(f"❌ Erro: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ Exceção: {e}")

# Testar também ambiente sandbox
print(f"\n🧪 Testando ambiente SANDBOX...")
sandbox_headers = {
    'Content-Type': 'application/json',
    'access_token': api_key
}

try:
    response = requests.get(
        "https://sandbox.asaas.com/api/v3/myAccount",
        headers=sandbox_headers,
        timeout=10
    )
    
    print(f"Sandbox Status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Sandbox funcionando!")
        data = response.json()
        print(f"Conta Sandbox: {data.get('name', 'N/A')}")
    else:
        print(f"❌ Sandbox Erro: {response.text[:200]}")
        
except Exception as e:
    print(f"❌ Sandbox Exceção: {e}")