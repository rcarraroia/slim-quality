from supabase import create_client

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

print("TESTE RÁPIDO:")

# Teste 1: Conversas com JOIN
try:
    query = "*,customers!inner(id,name,email,phone)"
    result = supabase.from('conversations').select(query).limit(1).execute()
    print(f"✅ Conversas com JOIN: OK")
except Exception as e:
    print(f"❌ Conversas com JOIN: {e}")

# Teste 2: Conversas sem JOIN  
try:
    result = supabase.from('conversations').select('*').limit(1).execute()
    print(f"✅ Conversas simples: OK")
except Exception as e:
    print(f"❌ Conversas simples: {e}")