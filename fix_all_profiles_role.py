import os
import re

# Padrão a ser substituído
old_pattern = r"SELECT 1 FROM profiles\s+WHERE profiles\.id = auth\.uid\(\)\s+AND profiles\.role = 'admin'"
new_pattern = "SELECT 1 FROM user_roles\n      WHERE user_roles.user_id = auth.uid()\n      AND user_roles.role = 'admin'\n      AND user_roles.deleted_at IS NULL"

# Diretório de migrations
migrations_dir = "supabase/migrations"

# Arquivos a corrigir
files_to_fix = [
    "20250125000001_create_affiliate_network.sql",
    "20250125000002_create_referral_tracking.sql",
    "20250125000003_create_commissions_tables.sql",
    "20250125000004_create_auxiliary_tables.sql",
    "20250125000005_create_notification_logs.sql",
    "20250125000010_create_crm_customers.sql",
    "20250125000011_create_crm_tags.sql",
    "20250125000012_create_crm_timeline.sql",
    "20250125000013_create_crm_conversations.sql",
    "20250125000014_create_crm_appointments.sql",
]

fixed_count = 0
for filename in files_to_fix:
    filepath = os.path.join(migrations_dir, filename)
    
    if not os.path.exists(filepath):
        print(f"⚠️  {filename} não encontrado")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Contar ocorrências
    matches = re.findall(old_pattern, content, re.MULTILINE | re.DOTALL)
    
    if matches:
        # Substituir
        new_content = re.sub(old_pattern, new_pattern, content, flags=re.MULTILINE | re.DOTALL)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✅ {filename}: {len(matches)} ocorrências corrigidas")
        fixed_count += len(matches)
    else:
        print(f"✓  {filename}: nenhuma correção necessária")

print(f"\n🎯 Total: {fixed_count} correções aplicadas")
