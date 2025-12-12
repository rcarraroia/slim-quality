#!/usr/bin/env python3
"""
Comparar chaves para encontrar diferenças
"""

# Chave do CLI (obtida com supabase projects api-keys)
CLI_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MVk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

# Chave do .env atual
ENV_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MVk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"

def main():
    print("🔍 COMPARANDO CHAVES")
    print("=" * 25)
    
    print(f"\nCLI Key:  {CLI_KEY}")
    print(f"ENV Key:  {ENV_KEY}")
    
    if CLI_KEY == ENV_KEY:
        print("\n✅ Chaves são IDÊNTICAS")
    else:
        print("\n❌ Chaves são DIFERENTES")
        
        # Encontrar diferenças
        for i, (c1, c2) in enumerate(zip(CLI_KEY, ENV_KEY)):
            if c1 != c2:
                print(f"   Diferença na posição {i}: CLI='{c1}' vs ENV='{c2}'")
        
        if len(CLI_KEY) != len(ENV_KEY):
            print(f"   Tamanhos diferentes: CLI={len(CLI_KEY)} vs ENV={len(ENV_KEY)}")
    
    # Testar a chave do CLI diretamente
    print(f"\n🧪 TESTANDO CHAVE DO CLI...")
    
    try:
        from supabase import create_client
        
        supabase = create_client("https://vtynmmtuvxreiwcxxlma.supabase.co", CLI_KEY)
        result = supabase.table('products').select('id, name').limit(1).execute()
        
        if result.data:
            print("✅ Chave do CLI funciona!")
        else:
            print("⚠️ Chave do CLI funciona mas sem dados")
            
    except Exception as e:
        print(f"❌ Chave do CLI falhou: {e}")

if __name__ == "__main__":
    main()