#!/usr/bin/env python3
"""
Listar TODAS as tabelas do banco
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("=" * 80)
print("TODAS AS TABELAS DO BANCO")
print("=" * 80)
print()

# Lista de tabelas para tentar
possible_tables = [
    'profiles', 'user_roles',
    'products', 'orders', 'order_items',
    'affiliates', 'commissions',
    'customers', 'customer_tags', 'tags',
    'customer_tag_assignments',  # Possível nome
    'customer_timeline', 'conversations', 'messages', 'appointments'
]

existing_tables = []

for table in possible_tables:
    try:
        result = supabase.table(table).select('*', count='exact').limit(0).execute()
        count = result.count
        existing_tables.append((table, count))
        print(f"✅ {table}: {count} registros")
    except Exception as e:
        pass

print()
print("=" * 80)
print(f"TOTAL: {len(existing_tables)} tabelas encontradas")
print("=" * 80)
