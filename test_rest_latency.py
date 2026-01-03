import requests
import time

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
USER_ID = "55335919-6968-4c6f-b32c-1a97a7b113ff"

def test_rest_latency():
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }

    url = f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{USER_ID}&select=*"
    
    print(f"--- Testando REST API: {url} ---")
    start_time = time.time()
    try:
        response = requests.get(url, headers=headers, timeout=10)
        elapsed = time.time() - start_time
        print(f"Status Code: {response.status_code}")
        print(f"Tempo total: {elapsed:.2f}s")
        if response.status_code == 200:
            print(f"Dados retornados: {response.json()}")
        else:
            print(f"Erro: {response.text}")
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT: A requisição demorou mais de 10 segundos.")
    except Exception as e:
        print(f"❌ ERRO: {e}")

if __name__ == "__main__":
    test_rest_latency()
