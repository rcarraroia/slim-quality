
import os
from supabase import create_client

def check_structure():
    project_url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
    service_role_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
    
    try:
        supabase = create_client(project_url, service_role_key)
        
        # Test inserting with customer_phone vs customer_id
        print("--- TESTING CONVERSATIONS TABLE STRUCTURE ---")
        
        try:
            # Try to select just to see if we can get an error with column names if we provide a wrong one
            res = supabase.table("conversations").select("customer_phone").limit(1).execute()
            print("SUCCESS: 'customer_phone' column exists.")
        except Exception as e:
            print(f"FAILED: 'customer_phone' does not exist or error: {str(e)}")
            
        try:
            res = supabase.table("conversations").select("customer_id").limit(1).execute()
            print("SUCCESS: 'customer_id' column exists.")
        except Exception as e:
            print(f"FAILED: 'customer_id' does not exist or error: {str(e)}")

        try:
            res = supabase.table("conversations").select("lead_id").limit(1).execute()
            print("SUCCESS: 'lead_id' column exists.")
        except Exception as e:
            print(f"FAILED: 'lead_id' does not exist or error: {str(e)}")

    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    check_structure()
