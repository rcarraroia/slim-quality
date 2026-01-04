#!/usr/bin/env python3
"""
TESTE DOS SERVIÇOS CORRIGIDOS
Verificar se os nomes das colunas estão corretos
"""

import sys
from supabase import create_client, Client

# Credenciais reais
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def testar_query_corrigida():
    """Testar query com nomes corretos das colunas"""
    print("🧪 TESTANDO QUERY CORRIGIDA...")
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Query igual ao SupabaseService corrigido
        result = supabase.table('orders').select("""
          id,
          created_at,
          total_cents,
          status,
          customer_id,
          customer_name,
          customer_email,
          customer_phone,
          order_items(product_name)
        """).limit(2).execute()
        
        if result.data:
            print("✅ Query funcionou! Dados retornados:")
            for order in result.data:
                print(f"  - ID: {order['id']}")
                print(f"  - Total: R$ {order['total_cents'] / 100:.2f}")
                print(f"  - Status: {order['status']}")
                print(f"  - Cliente: {order['customer_name']}")
                print()
            return True
        else:
            print("❌ Query não retornou dados")
            return False
            
    except Exception as e:
        print(f"❌ Erro na query: {e}")
        return False

def testar_metricas():
    """Testar cálculo de métricas com dados reais"""
    print("📊 TESTANDO CÁLCULO DE MÉTRICAS...")
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Buscar todos os pedidos
        result = supabase.table('orders').select('id, status, total_cents').execute()
        
        if not result.data:
            print("❌ Nenhum pedido encontrado")
            return False
        
        orders = result.data
        
        # Separar por status
        pedidos_pendentes = [o for o in orders if o['status'] == 'pending']
        vendas_confirmadas = [o for o in orders if o['status'] == 'paid']
        pedidos_cancelados = [o for o in orders if o['status'] == 'cancelled']
        
        # Calcular valores
        valor_total_pedidos = sum(o['total_cents'] / 100 for o in orders)
        valor_vendas_confirmadas = sum(o['total_cents'] / 100 for o in vendas_confirmadas)
        
        # Ticket médio
        ticket_medio = valor_vendas_confirmadas / len(vendas_confirmadas) if vendas_confirmadas else 0
        
        # Taxa de conversão
        taxa_conversao = (len(vendas_confirmadas) / len(orders) * 100) if orders else 0
        
        print("✅ MÉTRICAS CALCULADAS:")
        print(f"  📦 Total Pedidos: {len(orders)}")
        print(f"  ⏳ Pedidos Pendentes: {len(pedidos_pendentes)}")
        print(f"  ✅ Vendas Confirmadas: {len(vendas_confirmadas)}")
        print(f"  ❌ Pedidos Cancelados: {len(pedidos_cancelados)}")
        print(f"  💰 Valor Total Pedidos: R$ {valor_total_pedidos:.2f}")
        print(f"  💚 Valor Vendas Confirmadas: R$ {valor_vendas_confirmadas:.2f}")
        print(f"  🎯 Ticket Médio: R$ {ticket_medio:.2f}")
        print(f"  📊 Taxa de Conversão: {taxa_conversao:.1f}%")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no cálculo de métricas: {e}")
        return False

def main():
    print("🧪 TESTE DOS SERVIÇOS CORRIGIDOS")
    print("=" * 50)
    
    # Teste 1: Query corrigida
    sucesso_query = testar_query_corrigida()
    
    print()
    
    # Teste 2: Métricas
    sucesso_metricas = testar_metricas()
    
    print("\n" + "=" * 50)
    if sucesso_query and sucesso_metricas:
        print("✅ TODOS OS TESTES PASSARAM!")
        print("🎯 Serviços corrigidos e funcionando")
    else:
        print("❌ ALGUNS TESTES FALHARAM!")
        print("🚨 Serviços precisam de mais correções")
    
    return sucesso_query and sucesso_metricas

if __name__ == "__main__":
    sucesso = main()
    sys.exit(0 if sucesso else 1)