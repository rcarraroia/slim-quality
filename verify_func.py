
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

if not url or not key:
    print("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontrados no .env")
    exit(1)

supabase: Client = create_client(url, key)

query = """
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'calculate_commission_split';
"""

try:
    # Usando query direta via Supabase para pegar a definição
    # Nota: Em alguns ambientes o Supabase Client não permite query arbitrária facilmente sem RPC
    # Vou tentar via query de sistema se possível ou assumir o risco de RPC
    response = supabase.postgrest.rpc('execute_sql', {'sql_query': query}).execute()
    if response.data:
        print("--- DEFINIÇÃO DA FUNÇÃO ---")
        print(response.data[0]['routine_definition'])
    else:
        print("Função não encontrada ou permissão insuficiente.")
except Exception as e:
    print(f"Erro ao consultar: {e}")
    # Tentativa B: Se o 'execute_sql' não existir, vou tentar listar as funções
    print("\nTentando listar funções via RPC alternativo...")
