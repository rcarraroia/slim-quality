#!/usr/bin/env python3
"""
Script para corrigir referências profiles.role -> user_roles nas migrações
"""

import os
import re

def fix_profiles_references():
    """Corrige todas as referências profiles.role nas migrações"""
    
    migrations_dir = "supabase/migrations"
    
    # Padrão para encontrar referências profiles.role
    old_pattern = r'EXISTS \(\s*SELECT 1 FROM profiles\s*WHERE profiles\.id = auth\.uid\(\)\s*AND profiles\.role = \'admin\'\s*\)'
    
    # Novo padrão corrigido
    new_pattern = '''EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.deleted_at IS NULL
    )'''
    
    files_fixed = []
    
    # Processar todos os arquivos .sql no diretório de migrações
    for filename in os.listdir(migrations_dir):
        if filename.endswith('.sql'):
            filepath = os.path.join(migrations_dir, filename)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Verificar se contém o padrão antigo
                if 'profiles.role' in content:
                    print(f"Corrigindo {filename}...")
                    
                    # Substituir o padrão
                    new_content = re.sub(old_pattern, new_pattern, content, flags=re.MULTILINE | re.DOTALL)
                    
                    # Escrever arquivo corrigido
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    
                    files_fixed.append(filename)
                    print(f"✅ {filename} corrigido")
                
            except Exception as e:
                print(f"❌ Erro ao processar {filename}: {e}")
    
    print(f"\n=== RESUMO ===")
    print(f"Arquivos corrigidos: {len(files_fixed)}")
    for file in files_fixed:
        print(f"  - {file}")
    
    return len(files_fixed) > 0

if __name__ == "__main__":
    print("=== CORRIGINDO REFERÊNCIAS PROFILES.ROLE ===")
    success = fix_profiles_references()
    
    if success:
        print("\n✅ Correções aplicadas com sucesso!")
    else:
        print("\n⚠️ Nenhuma correção necessária.")