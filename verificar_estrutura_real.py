#!/usr/bin/env python3
"""
CORREÇÃO URGENTE: Verificar estrutura REAL das tabelas
NUNCA MAIS inventar nomes de colunas!
"""

import sys
from supabase import create_client, Client

# Credenciais reais
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def conectar_supabase():
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Conectado ao Supabase")
        return supabase
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return None

def verificar_estrutura_orders(supabase):
    """Verificar estrutura REAL da tabela orders"""
    print("\n🔍 VERIFICANDO ESTRUTURA REAL DA TABELA ORDERS...")
    
    try:
        # Buscar 1 registro para ver as colunas reais
        result = supabase.table('orders').select('*').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            order = result.data[0]
            print("📋 COLUNAS REAIS ENCONTRADAS:")
            for coluna, valor in order.items():
                tipo_valor = type(valor).__name__
                print(f"  - {coluna}: {valor} ({tipo_valor})")
            
            return list(order.keys())
        else:
            print("❌ Nenhum registro encontrado na tabela orders")
            return []
            
    except Exception as e:
        print(f"❌ Erro ao verificar estrutura orders: {e}")
        return []

def verificar_estrutura_customers(supabase):
    """Verificar estrutura REAL da tabela customers"""
    print("\n🔍 VERIFICANDO ESTRUTURA REAL DA TABELA CUSTOMERS...")
    
    try:
        result = supabase.table('customers').select('*').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            customer = result.data[0]
            print("📋 COLUNAS REAIS ENCONTRADAS:")
            for coluna, valor in customer.items():
                tipo_valor = type(valor).__name__
                print(f"  - {coluna}: {valor} ({tipo_valor})")
            
            return list(customer.keys())
        else:
            print("❌ Nenhum registro encontrado na tabela customers")
            return []
            
    except Exception as e:
        print(f"❌ Erro ao verificar estrutura customers: {e}")
        return []

def verificar_estrutura_products(supabase):
    """Verificar estrutura REAL da tabela products"""
    print("\n🔍 VERIFICANDO ESTRUTURA REAL DA TABELA PRODUCTS...")
    
    try:
        result = supabase.table('products').select('*').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            product = result.data[0]
            print("📋 COLUNAS REAIS ENCONTRADAS:")
            for coluna, valor in product.items():
                tipo_valor = type(valor).__name__
                print(f"  - {coluna}: {valor} ({tipo_valor})")
            
            return list(product.keys())
        else:
            print("❌ Nenhum registro encontrado na tabela products")
            return []
            
    except Exception as e:
        print(f"❌ Erro ao verificar estrutura products: {e}")
        return []

def verificar_estrutura_order_items(supabase):
    """Verificar estrutura REAL da tabela order_items"""
    print("\n🔍 VERIFICANDO ESTRUTURA REAL DA TABELA ORDER_ITEMS...")
    
    try:
        result = supabase.table('order_items').select('*').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            item = result.data[0]
            print("📋 COLUNAS REAIS ENCONTRADAS:")
            for coluna, valor in item.items():
                tipo_valor = type(valor).__name__
                print(f"  - {coluna}: {valor} ({tipo_valor})")
            
            return list(item.keys())
        else:
            print("❌ Nenhum registro encontrado na tabela order_items")
            return []
            
    except Exception as e:
        print(f"❌ Erro ao verificar estrutura order_items: {e}")
        return []

def main():
    print("🚨 CORREÇÃO URGENTE: VERIFICANDO ESTRUTURA REAL DAS TABELAS")
    print("=" * 70)
    print("❌ ERRO IDENTIFICADO: Inventei nomes de colunas sem verificar")
    print("✅ CORREÇÃO: Verificar estrutura real do banco")
    print("=" * 70)
    
    supabase = conectar_supabase()
    if not supabase:
        print("❌ Falha crítica na conexão")
        sys.exit(1)
    
    # Verificar estruturas reais
    orders_cols = verificar_estrutura_orders(supabase)
    customers_cols = verificar_estrutura_customers(supabase)
    products_cols = verificar_estrutura_products(supabase)
    order_items_cols = verificar_estrutura_order_items(supabase)
    
    print("\n" + "=" * 70)
    print("📋 RESUMO DAS ESTRUTURAS REAIS:")
    print("=" * 70)
    print(f"📦 ORDERS: {orders_cols}")
    print(f"👥 CUSTOMERS: {customers_cols}")
    print(f"🛏️ PRODUCTS: {products_cols}")
    print(f"📋 ORDER_ITEMS: {order_items_cols}")
    
    print("\n✅ VERIFICAÇÃO CONCLUÍDA!")
    print("🎯 Agora posso corrigir os serviços com nomes reais")

if __name__ == "__main__":
    main()