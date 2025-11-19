-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS para permitir login
-- Execute no Supabase SQL Editor

-- Desabilitar RLS temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Isso é temporário! Reabilitar após corrigir políticas
