#!/usr/bin/env python3
"""
Debug: Verificar se frontend consegue ver as conversas
"""

from supabase import create_client, Client

def debug_frontend_conversations():
    """Simula a query que o frontend faz"""
    
    # Configurar Supabase
    supabase_url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
    supabase_anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
    
    # Usar ANON KEY (como o frontend)
    supabase: Client = create_client(supabase_url, supabase_anon_key)
    
    print("=== DEBUG FRONTEND CONVERSATIONS ===")
    
    try:
        # 1. TESTAR QUERY EXATA DO FRONTEND
        print("\n1. TESTANDO QUERY DO FRONTEND (com ANON KEY)...")
        
        result = supabase.table('conversations').select("""
            *,
            customers!inner(
                id,
                name,
                email,
                phone
            )
        """).order('last_message_at', desc=True).order('created_at', desc=True).limit(50).execute()
        
        if result.data:
            print(f"   ✅ Frontend consegue ver {len(result.data)} conversas")
            for i, conv in enumerate(result.data, 1):
                print(f"      {i}. ID: {conv['id']}")
                print(f"         Customer: {conv.get('customers', {}).get('name', 'N/A')}")
                print(f"         Canal: {conv.get('channel', 'N/A')}")
                print(f"         Status: {conv.get('status', 'N/A')}")
                print()
        else:
            print(f"   ❌ Frontend NÃO consegue ver conversas")
            print(f"   📊 Resultado: {result}")
        
        # 2. TESTAR SEM INNER JOIN
        print("\n2. TESTANDO SEM INNER JOIN...")
        
        result2 = supabase.table('conversations').select('*').order('created_at', desc=True).limit(10).execute()
        
        if result2.data:
            print(f"   ✅ Sem inner join: {len(result2.data)} conversas")
        else:
            print(f"   ❌ Sem inner join: Nenhuma conversa")
            print(f"   📊 Resultado: {result2}")
        
        # 3. TESTAR CONTAGEM TOTAL
        print("\n3. TESTANDO CONTAGEM TOTAL...")
        
        count_result = supabase.table('conversations').select('id', count='exact').execute()
        
        print(f"   📊 Total de conversas (ANON): {count_result.count}")
        
        # 4. TESTAR POLÍTICAS RLS
        print("\n4. VERIFICANDO POLÍTICAS RLS...")
        
        # Tentar com service key para comparar
        service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
        supabase_service: Client = create_client(supabase_url, service_key)
        
        service_result = supabase_service.table('conversations').select('id', count='exact').execute()
        
        print(f"   📊 Total de conversas (SERVICE): {service_result.count}")
        print(f"   📊 Diferença: {service_result.count - (count_result.count or 0)}")
        
        if service_result.count != (count_result.count or 0):
            print(f"   🚨 PROBLEMA: RLS está bloqueando conversas para usuário anônimo!")
        
        # 5. VERIFICAR CUSTOMERS
        print("\n5. VERIFICANDO CUSTOMERS...")
        
        customers_result = supabase.table('customers').select('id', count='exact').execute()
        customers_service = supabase_service.table('customers').select('id', count='exact').execute()
        
        print(f"   📊 Customers (ANON): {customers_result.count}")
        print(f"   📊 Customers (SERVICE): {customers_service.count}")
        
        if customers_service.count != (customers_result.count or 0):
            print(f"   🚨 PROBLEMA: RLS está bloqueando customers para usuário anônimo!")
        
    except Exception as e:
        print(f"❌ ERRO: {e}")
        import traceback
        print(f"❌ TRACEBACK: {traceback.format_exc()}")

if __name__ == "__main__":
    debug_frontend_conversations()