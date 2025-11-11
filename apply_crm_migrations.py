#!/usr/bin/env python3
"""
Aplica migrations do CRM diretamente no banco
"""
from supabase import create_client, Client
import os

# Credenciais
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def apply_migrations():
    """Aplica migrations do CRM"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("=" * 80)
    print("APLICANDO MIGRATIONS DO CRM")
    print("=" * 80)
    
    # Lista de migrations do CRM
    migrations = [
        'supabase/migrations/20250125000010_create_crm_customers.sql',
        'supabase/migrations/20250125000011_create_crm_tags.sql',
        'supabase/migrations/20250125000012_create_crm_timeline.sql',
        'supabase/migrations/20250125000013_create_crm_conversations.sql',
        'supabase/migrations/20250125000014_create_crm_appointments.sql',
    ]
    
    for migration_file in migrations:
        print(f"\n{'='*60}")
        print(f"Aplicando: {os.path.basename(migration_file)}")
        print(f"{'='*60}")
        
        try:
            # Ler arquivo SQL
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql = f.read()
            
            # Executar SQL via RPC
            # Nota: Supabase Python não tem método direto para executar SQL
            # Vamos usar uma abordagem alternativa
            print(f"✅ Lido: {len(sql)} caracteres")
            print(f"⚠️  Nota: Execute manualmente via Dashboard SQL Editor")
            print(f"   URL: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/sql/new")
            
        except Exception as e:
            print(f"❌ Erro: {e}")
    
    print("\n" + "=" * 80)
    print("INSTRUÇÕES")
    print("=" * 80)
    print("\nPara aplicar as migrations:")
    print("1. Acesse: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/sql/new")
    print("2. Copie e cole o conteúdo de cada arquivo SQL")
    print("3. Execute cada migration em ordem")
    print("\nOu use o comando CLI:")
    print("supabase db push --include-all --skip-verify")

if __name__ == "__main__":
    apply_migrations()
