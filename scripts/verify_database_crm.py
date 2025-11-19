#!/usr/bin/env python3
"""
Script para verificar estrutura real do banco de dados CRM
Verifica tabelas, colunas, RLS e políticas
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ ERRO: Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("=" * 80)
print("VERIFICAÇÃO DO BANCO DE DADOS - SPRINT 5 CRM")
print("=" * 80)
print()

# Tabelas esperadas da Sprint 5
EXPECTED_TABLES = [
    'customers',
    'customer_tags',
    'tags',
    'customer_timeline',
    'conversations',
    'messages',
    'appointments'
]

def check_table_exists(table_name):
    """Verifica se tabela existe"""
    try:
        result = supabase.table(table_name).select('*').limit(1).execute()
        return True, None
    except Exception as e:
        return False, str(e)

def check_rls_status(table_name):
    """Verifica status do RLS"""
    try:
        # Query para verificar RLS
        query = f"""
        SELECT 
            schemaname,
            tablename,
            rowsecurity
        FROM pg_tables 
        WHERE tablename = '{table_name}'
        AND schemaname = 'public';
        """
        result = supabase.rpc('exec_sql', {'query': query}).execute()
        return result.data if result.data else None
    except Exception as e:
        return None

def check_policies(table_name):
    """Verifica políticas RLS"""
    try:
        query = f"""
        SELECT 
            policyname,
            cmd,
            qual,
            with_check
        FROM pg_policies 
        WHERE tablename = '{table_name}'
        AND schemaname = 'public';
        """
        result = supabase.rpc('exec_sql', {'query': query}).execute()
        return result.data if result.data else []
    except Exception as e:
        return []

def get_table_columns(table_name):
    """Lista colunas da tabela"""
    try:
        query = f"""
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        AND table_schema = 'public'
        ORDER BY ordinal_position;
        """
        result = supabase.rpc('exec_sql', {'query': query}).execute()
        return result.data if result.data else []
    except Exception as e:
        return []

def count_records(table_name):
    """Conta registros na tabela"""
    try:
        result = supabase.table(table_name).select('*', count='exact').limit(0).execute()
        return result.count
    except Exception as e:
        return None

# Verificar cada tabela
results = {}

for table in EXPECTED_TABLES:
    print(f"📋 Verificando tabela: {table}")
    print("-" * 80)
    
    exists, error = check_table_exists(table)
    
    if exists:
        print(f"  ✅ Tabela existe")
        
        # Contar registros
        count = count_records(table)
        if count is not None:
            print(f"  📊 Registros: {count}")
        
        # Verificar colunas
        columns = get_table_columns(table)
        if columns:
            print(f"  📝 Colunas ({len(columns)}):")
            for col in columns[:5]:  # Mostrar apenas primeiras 5
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                print(f"     - {col['column_name']}: {col['data_type']} {nullable}")
            if len(columns) > 5:
                print(f"     ... e mais {len(columns) - 5} colunas")
        
        # Verificar RLS
        rls_status = check_rls_status(table)
        if rls_status:
            rls_enabled = rls_status[0].get('rowsecurity', False) if rls_status else False
            if rls_enabled:
                print(f"  🔒 RLS: ATIVO")
            else:
                print(f"  ⚠️  RLS: DESATIVADO")
        
        # Verificar políticas
        policies = check_policies(table)
        if policies:
            print(f"  🛡️  Políticas RLS ({len(policies)}):")
            for policy in policies:
                print(f"     - {policy['policyname']} ({policy['cmd']})")
        else:
            print(f"  ⚠️  Nenhuma política RLS encontrada")
        
        results[table] = {
            'exists': True,
            'count': count,
            'columns': len(columns),
            'rls_enabled': rls_enabled if rls_status else False,
            'policies': len(policies)
        }
    else:
        print(f"  ❌ Tabela NÃO existe")
        print(f"  ⚠️  Erro: {error}")
        results[table] = {
            'exists': False,
            'error': error
        }
    
    print()

# Resumo final
print("=" * 80)
print("RESUMO DA VERIFICAÇÃO")
print("=" * 80)
print()

existing_tables = [t for t, r in results.items() if r['exists']]
missing_tables = [t for t, r in results.items() if not r['exists']]

print(f"✅ Tabelas existentes: {len(existing_tables)}/{len(EXPECTED_TABLES)}")
for table in existing_tables:
    r = results[table]
    print(f"   - {table}: {r['count']} registros, {r['columns']} colunas, RLS: {'✅' if r['rls_enabled'] else '❌'}, Políticas: {r['policies']}")

if missing_tables:
    print()
    print(f"❌ Tabelas faltando: {len(missing_tables)}")
    for table in missing_tables:
        print(f"   - {table}")

# Salvar relatório em JSON
report = {
    'timestamp': str(os.popen('date').read().strip()),
    'total_tables': len(EXPECTED_TABLES),
    'existing_tables': len(existing_tables),
    'missing_tables': len(missing_tables),
    'details': results
}

with open('database_verification_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print()
print("📄 Relatório salvo em: database_verification_report.json")
print()

# Status final
if len(existing_tables) == len(EXPECTED_TABLES):
    print("✅ TODAS AS TABELAS EXISTEM!")
else:
    print(f"⚠️  FALTAM {len(missing_tables)} TABELAS")
    print("   Execute as migrations necessárias para criar as tabelas faltantes")
