#!/usr/bin/env python3
"""
Verificar estrutura das tabelas conversations e messages
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

print("=" * 80)
print("ESTRUTURA DAS TABELAS DE CONVERSAS")
print("=" * 80)

# Verificar conversations
print("\n📋 TABELA: conversations")
print("-" * 80)
try:
    result = supabase.table('conversations').select('*').limit(1).execute()
    if result.data:
        print("✅ Tabela existe e tem dados")
        print("Colunas:", list(result.data[0].keys()))
    else:
        print("✅ Tabela existe mas está vazia")
        # Tentar inserir e deletar para ver estrutura
        print("Tentando descobrir estrutura...")
except Exception as e:
    print(f"❌ Erro: {e}")

# Verificar messages
print("\n📋 TABELA: messages")
print("-" * 80)
try:
    result = supabase.table('messages').select('*').limit(1).execute()
    if result.data:
        print("✅ Tabela existe e tem dados")
        print("Colunas:", list(result.data[0].keys()))
    else:
        print("✅ Tabela existe mas está vazia")
except Exception as e:
    print(f"❌ Erro: {e}")

# Verificar customers
print("\n📋 TABELA: customers")
print("-" * 80)
try:
    result = supabase.table('customers').select('*').limit(1).execute()
    if result.data:
        print("✅ Tabela existe e tem dados")
        print("Colunas:", list(result.data[0].keys()))
    else:
        print("✅ Tabela existe mas está vazia")
except Exception as e:
    print(f"❌ Erro: {e}")

print("\n" + "=" * 80)
