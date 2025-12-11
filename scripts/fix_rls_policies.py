#!/usr/bin/env python3
"""
Script para corrigir políticas RLS que causam recursão infinita
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔧 Corrigindo políticas RLS...")

# SQL para corrigir políticas
sql = """
-- Remover políticas antigas de user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Criar políticas corretas SEM recursão
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Service role full access"
  ON user_roles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Remover políticas antigas de profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Criar políticas corretas
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Service role full access on profiles"
  ON profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
"""

try:
    # Executar SQL via RPC ou diretamente
    result = supabase.rpc('exec_sql', {'sql': sql}).execute()
    print("✅ Políticas RLS corrigidas com sucesso!")
except Exception as e:
    print(f"❌ Erro: {e}")
    print("\n⚠️  Execute manualmente no Supabase SQL Editor:")
    print(sql)
