
import os
from supabase import create_client

def list_all_tables():
    project_url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
    service_role_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
    
    try:
        supabase = create_client(project_url, service_role_key)
        # Query information_schema to list tables
        res = supabase.rpc("execute_sql", {"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"}).execute()
        # Wait, usually rpc "execute_sql" doesn't exist unless defined.
        # Let's try a different approach if rpc fails.
        
        # Alternative: Just try to select from a few likely candidates or use a known RPC if exists.
        # But safest is to try and see if we can get table list via SQL if we have a way.
        
        # Let's try to just check the columns of 'conversations' specifically since we have the client.
        print("--- COLUMNS OF 'conversations' ---")
        # We can't directly query info_schema via supabase-py without a custom RPC usually.
        # But we can try to get one row and see the keys.
        res = supabase.table("conversations").select("*").limit(1).execute()
        if res.data:
            print(f"Sample data keys: {res.data[0].keys()}")
        else:
            print("Table 'conversations' is empty, cannot infer columns from data.")
            
        print("\n--- CHECKING FOR 'automation_rules' ---")
        res = supabase.table("automation_rules").select("*").limit(1).execute()
        if res.data:
            print(f"Sample data keys: {res.data[0].keys()}")
        else:
            print("Table 'automation_rules' is empty.")

    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    list_all_tables()
