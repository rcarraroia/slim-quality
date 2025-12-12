#!/usr/bin/env python3
"""
Criar tabela webhook_logs diretamente
"""
from supabase import create_client, Client

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def create_webhook_logs_table():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    sql = """
    -- Criar tabela webhook_logs
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider VARCHAR(50) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      payment_id VARCHAR(255),
      order_id UUID,
      status VARCHAR(50) NOT NULL,
      payload JSONB NOT NULL,
      processing_result JSONB,
      error_message TEXT,
      processed_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Criar índices
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
    
    -- RLS
    ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
    """
    
    try:
        result = supabase.rpc('exec_sql', {'sql': sql}).execute()
        print("✅ Tabela webhook_logs criada com sucesso")
        return True
    except Exception as e:
        print(f"❌ Erro ao criar tabela: {e}")
        return False

if __name__ == "__main__":
    create_webhook_logs_table()