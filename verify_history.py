
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

def check_any_data():
    print("--- BUSCANDO QUALQUER REGISTRO DE AFILIADOS EM PEDIDOS ---")
    try:
        response = supabase.table('orders')\
            .select('id, referral_code, affiliate_n1_id, created_at')\
            .not_.is_('affiliate_n1_id', 'null')\
            .limit(10)\
            .execute()
        
        if response.data:
            print(f"Total encontrado: {len(response.data)}")
            for row in response.data:
                print(f"Pedido: {row['id']} | N1: {row['affiliate_n1_id']} | Data: {row['created_at']}")
        else:
            print("Nenhum pedido com afiliado encontrado em todo o histórico.")

    except Exception as e:
        print(f"Erro: {e}")

def check_any_splits():
    print("\n--- BUSCANDO QUALQUER REGISTRO EM COMMISSION_SPLITS ---")
    try:
        response = supabase.table('commission_splits')\
            .select('id, order_id, status, created_at')\
            .limit(10)\
            .execute()
        
        if response.data:
            print(f"Total encontrado: {len(response.data)}")
            for row in response.data:
                print(f"Split: {row['id']} | Order: {row['order_id']} | Status: {row['status']}")
        else:
            print("Nenhum split encontrado em todo o histórico.")
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    check_any_data()
    check_any_splits()
