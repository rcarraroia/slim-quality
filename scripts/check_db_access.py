
import os
from supabase import create_client

def check_tables():
    project_url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
    service_role_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
    
    try:
        supabase = create_client(project_url, service_role_key)
        print("--- CHECKING ALL TABLES ---")
        tables = [
            "affiliates", "commissions", "withdrawals", "orders", 
            "customers", "products", "conversations", "messages",
            "memory_chunks", "sub_agents", "behavior_patterns", 
            "automation_rules", "agent_performance_metrics"
        ]
        
        for table in tables:
            try:
                res = supabase.table(table).select("count", count="exact").limit(1).execute()
                print(f"Table '{table}': EXISTS (Count: {res.count})")
            except Exception as e:
                print(f"Table '{table}': NOT FOUND OR ERROR: {str(e)}")
                
    except Exception as e:
        print(f"GENERAL ERROR: {str(e)}")

if __name__ == "__main__":
    check_tables()
