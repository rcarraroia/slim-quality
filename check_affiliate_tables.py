#!/usr/bin/env python3
"""
Verificar estrutura real das tabelas de afiliados
"""
import os
from supabase import create_client, Client

# Configuração do Supabase
url = "https://ixqjqjqjqjqjqjqj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzc2NzI2NCwiZXhwIjoyMDQ5MzQzMjY0fQ.VQjTI_TgLBEKGgGnGdGjJhJzJQJQJQJQJQJQJQJQJQJ"

supabase: Client = create_client(url, key)

def check_table_structure(table_name):
    """Verifica se tabela existe e sua estrutura"""
    try:
        # Tentar fazer uma query simples para verificar se existe
        result = supabase.table(table_name).select("*").limit(1).execute()
        print(f"✅ Tabela '{table_name}' existe")
        
        # Se tem dados, mostrar estrutura
        if result.data:
            print(f"   Exemplo de dados: {list(result.data[0].keys())}")
        else:
            print(f"   Tabela vazia")
        return True
    except Exception as e:
        print(f"❌ Tabela '{table_name}' não existe ou erro: {e}")
        return False

def main():
    print("🔍 VERIFICANDO ESTRUTURA REAL DO BANCO DE DADOS\n")
    
    # Tabelas relacionadas a afiliados
    tables_to_check = [
        'affiliates',
        'affiliate_network', 
        'commissions',
        'referral_clicks',
        'referral_conversions',
        'asaas_wallets',
        'webhook_logs'
    ]
    
    existing_tables = []
    
    for table in tables_to_check:
        if check_table_structure(table):
            existing_tables.append(table)
    
    print(f"\n📊 RESUMO:")
    print(f"Tabelas existentes: {len(existing_tables)}/{len(tables_to_check)}")
    print(f"Tabelas encontradas: {existing_tables}")
    
    # Verificar se há dados de teste
    if 'affiliates' in existing_tables:
        try:
            result = supabase.table('affiliates').select("*").execute()
            print(f"\n👥 AFILIADOS CADASTRADOS: {len(result.data)}")
            for affiliate in result.data[:3]:  # Mostrar apenas 3 primeiros
                print(f"   - {affiliate.get('name', 'N/A')} ({affiliate.get('status', 'N/A')})")
        except Exception as e:
            print(f"Erro ao buscar afiliados: {e}")

if __name__ == "__main__":
    main()