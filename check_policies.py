import os
from supabase import create_client

# Conectar ao Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

# Query para verificar policies
query = """
SELECT 
  policyname, 
  cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%product images%'
ORDER BY policyname;
"""

try:
    result = supabase.rpc('exec_sql', {'query': query}).execute()
    print("Policies existentes no storage.objects:")
    print("=" * 60)
    if result.data:
        for row in result.data:
            print(f"✅ {row['policyname']} ({row['cmd']})")
    else:
        print("Nenhuma policy encontrada")
except Exception as e:
    # Tentar via postgrest
    try:
        result = supabase.postgrest.rpc('exec_sql', {'query': query}).execute()
        print("Policies existentes no storage.objects:")
        print("=" * 60)
        if result.data:
            for row in result.data:
                print(f"✅ {row['policyname']} ({row['cmd']})")
        else:
            print("Nenhuma policy encontrada")
    except Exception as e2:
        print(f"Não foi possível verificar via API: {e2}")
        print("\nVou prosseguir assumindo que apenas a primeira policy existe.")
        print("(Baseado no erro reportado anteriormente)")
