#!/usr/bin/env python3
"""
Verificar estrutura REAL da tabela customer_tags
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("=" * 80)
print("ESTRUTURA REAL DA TABELA customer_tags")
print("=" * 80)
print()

# Buscar dados reais
try:
    result = supabase.table('customer_tags').select('*').limit(5).execute()
    
    if result.data and len(result.data) > 0:
        print(f"✅ Tabela tem {len(result.data)} registros")
        print()
        print("📋 COLUNAS ENCONTRADAS:")
        print("-" * 80)
        
        # Pegar primeiro registro para ver colunas
        first_record = result.data[0]
        for column, value in first_record.items():
            value_type = type(value).__name__
            print(f"  - {column}: {value_type} = {value}")
        
        print()
        print("📊 TODOS OS REGISTROS:")
        print("-" * 80)
        for i, record in enumerate(result.data, 1):
            print(f"\nRegistro {i}:")
            for key, val in record.items():
                print(f"  {key}: {val}")
    else:
        print("⚠️  Tabela existe mas está vazia")
        print("Não é possível determinar estrutura de colunas")
        
except Exception as e:
    print(f"❌ Erro: {e}")

print()
print("=" * 80)
