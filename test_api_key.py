#!/usr/bin/env python3
"""
Teste simples da API key do Asaas
"""

import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('ASAAS_API_KEY')
print(f"API Key completa: '{api_key}'")
print(f"Tamanho: {len(api_key) if api_key else 0}")
print(f"Primeiros 20 chars: '{api_key[:20] if api_key else 'N/A'}'")
print(f"Últimos 20 chars: '{api_key[-20:] if api_key else 'N/A'}'")

# Testar se começa com $
if api_key and api_key.startswith('$'):
    print("⚠️ API Key começa com $ - pode ser problema de escape")
    
# Testar formato esperado
if api_key and api_key.startswith('$aact_'):
    print("✅ Formato parece correto para Asaas")
else:
    print("❌ Formato não reconhecido")