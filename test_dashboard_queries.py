#!/usr/bin/env python3
"""
TESTE ESPECÍFICO - Verificar queries do Dashboard
"""

from supabase import create_client, Client

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def test_dashboard_queries():
    print("🔍 TESTANDO QUERIES ESPECÍFICAS DO DASHBOARD")
    print("=" * 60)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    # 1. TESTAR QUERY DE CONVERSAS (useRealtimeConversations)
    print("\n1️⃣ TESTANDO QUERY DE CONVERSAS:")
    print("-" * 50)
    
    try:
        result = supabase.from('conversations').select(
            "*,customers!inner(id,name,email,phone)"
        ).limit(5).execute()
        
        print(f"✅ Query de conversas: {len(result.data)} registros")
        if result.data:
            print(f"   Exemplo: {result.data[0].get('id', 'N/A')}")
            
    except Exception as e:
        print(f"❌ ERRO na query de conversas: {str(e)}")
        print("   🚨 ESTE É PROVAVELMENTE O PROBLEMA!")
    
    # 2. TESTAR QUERY DE PEDIDOS
    print("\n2️⃣ TESTANDO QUERY DE PEDIDOS:")
    print("-" * 50)
    
    try:
        result = supabase.from('orders').select(
            "id,created_at,total_cents,status,customer_name,order_items(product_name)"
        ).limit(5).execute()
        
        print(f"✅ Query de pedidos: {len(result.data)} registros")
        
    except Exception as e:
        print(f"❌ ERRO na query de pedidos: {str(e)}")
    
    # 3. TESTAR QUERIES DE ESTATÍSTICAS
    print("\n3️⃣ TESTANDO QUERIES DE ESTATÍSTICAS:")
    print("-" * 50)
    
    try:
        # Conversas ativas
        result1 = supabase.from('conversations').select('*', count='exact', head=True).eq('status', 'open').execute()
        print(f"✅ Conversas ativas: {result1.count}")
        
        # Pedidos do mês
        from datetime import datetime
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        result2 = supabase.from('orders').select('total_cents').gte('created_at', start_of_month.isoformat()).execute()
        print(f"✅ Pedidos do mês: {len(result2.data)}")
        
    except Exception as e:
        print(f"❌ ERRO nas queries de estatísticas: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🏁 TESTE DE QUERIES CONCLUÍDO")

if __name__ == "__main__":
    test_dashboard_queries()