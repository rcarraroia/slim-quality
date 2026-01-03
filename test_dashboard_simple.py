#!/usr/bin/env python3
from supabase import create_client

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

print("🔍 TESTANDO QUERIES DO DASHBOARD")
print("=" * 50)

# 1. TESTAR QUERY DE CONVERSAS (SUSPEITA PRINCIPAL)
print("\n1️⃣ QUERY DE CONVERSAS:")
try:
    result = supabase.from('conversations').select('*,customers!inner(id,name,email,phone)').limit(3).execute()
    print(f"✅ Conversas: {len(result.data)} registros")
except Exception as e:
    print(f"❌ ERRO CONVERSAS: {str(e)}")
    print("🚨 ESTE É O PROBLEMA!")

# 2. TESTAR QUERY DE PEDIDOS
print("\n2️⃣ QUERY DE PEDIDOS:")
try:
    result = supabase.from('orders').select('id,created_at,total_cents,status,customer_name').limit(3).execute()
    print(f"✅ Pedidos: {len(result.data)} registros")
except Exception as e:
    print(f"❌ ERRO PEDIDOS: {str(e)}")

# 3. TESTAR CONVERSAS SEM JOIN
print("\n3️⃣ CONVERSAS SEM JOIN:")
try:
    result = supabase.from('conversations').select('*').limit(3).execute()
    print(f"✅ Conversas simples: {len(result.data)} registros")
except Exception as e:
    print(f"❌ ERRO CONVERSAS SIMPLES: {str(e)}")

print("\n" + "=" * 50)