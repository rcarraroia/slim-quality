import requests
import json

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def check_data_volumetry():
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "count=exact"
    }

    tables = [
        "profiles", 
        "conversations", 
        "orders", 
        "customers", 
        "learning_logs", 
        "affiliates", 
        "messages", 
        "order_items"
    ]
    
    print("--- Volumetria de Dados (Service Role) ---")
    for table in tables:
        try:
            # Pegar apenas o range 0-0 para obter a contagem no Content-Range
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{table}", 
                headers={**headers, "Range": "0-0"}
            )
            if response.status_code in [200, 206]:
                content_range = response.headers.get("Content-Range")
                count = content_range.split("/")[-1] if content_range else "0"
                print(f"Tabela {table}: {count} registros")
            else:
                print(f"Tabela {table}: Erro {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Erro ao contar {table}: {e}")

if __name__ == "__main__":
    check_data_volumetry()
