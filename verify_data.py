
import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

if not url or not key:
    print("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontrados no .env")
    exit(1)

supabase: Client = create_client(url, key)

def check_structure():
    print("--- VERIFICANDO ESTRUTURA DA TABELA 'orders' ---")
    try:
        # Tentar buscar um registro para ver as colunas
        response = supabase.table('orders').select('*').limit(1).execute()
        if response.data:
            columns = response.data[0].keys()
            required = ['affiliate_n1_id', 'affiliate_n2_id', 'affiliate_n3_id', 'referral_code']
            for col in required:
                if col in columns:
                    print(f"✅ Coluna encontrada: {col}")
                else:
                    print(f"❌ Coluna FALTANDO: {col}")
        else:
            print("Nenhum pedido encontrado para validar colunas.")
    except Exception as e:
        print(f"Erro ao verificar colunas: {e}")

def check_recent_data():
    print("\n--- VERIFICANDO DADOS RECENTES ---")
    try:
        # Buscar pedidos recentes com afiliados preenchidos
        # Corrigindo sintaxe do filtro not.is_
        response = supabase.table('orders')\
            .select('id, referral_code, affiliate_n1_id, created_at')\
            .not_.is_('affiliate_n1_id', 'null')\
            .order('created_at', desc=True)\
            .limit(5)\
            .execute()
        
        if response.data:
            print(f"Encontrados {len(response.data)} pedidos vinculados a afiliados recentemente.")
            for row in response.data:
                print(f"Pedido: {row['id']} | N1: {row['affiliate_n1_id']} | Data: {row['created_at']}")
        else:
            print("Nenhum pedido recente com affiliate_n1_id encontrado.")

    except Exception as e:
        print(f"Erro ao verificar dados: {e}")

def check_commission_splits():
    print("\n--- VERIFICANDO COMMISSION_SPLITS ---")
    try:
        response = supabase.table('commission_splits')\
            .select('*')\
            .order('created_at', desc=True)\
            .limit(5)\
            .execute()
        
        if response.data:
            print(f"Encontrados {len(response.data)} registros de split de comissão.")
            for row in response.data:
                print(f"Split ID: {row['id']} | Order: {row['order_id']} | Status: {row['status']}")
        else:
            print("Nenhum registro em commission_splits encontrado.")
    except Exception as e:
        print(f"Erro ao verificar splits: {e}")

if __name__ == "__main__":
    check_structure()
    check_recent_data()
    check_commission_splits()
