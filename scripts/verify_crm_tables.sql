-- Script SQL para verificar tabelas CRM no banco real
-- Execute com: supabase db execute -f scripts/verify_crm_tables.sql

-- ============================================
-- VERIFICAÇÃO DE TABELAS EXISTENTES
-- ============================================

SELECT 
    'TABELAS EXISTENTES' as tipo,
    tablename as nome,
    schemaname as schema
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'customers',
    'customer_tags',
    'tags',
    'customer_timeline',
    'conversations',
    'messages',
    'appointments'
)
ORDER BY tablename;

-- ============================================
-- CONTAGEM DE REGISTROS
-- ============================================

SELECT 'customers' as tabela, COUNT(*) as registros FROM customers
UNION ALL
SELECT 'customer_tags', COUNT(*) FROM customer_tags
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'customer_timeline', COUNT(*) FROM customer_timeline
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments;

-- ============================================
-- STATUS DO RLS
-- ============================================

SELECT 
    'RLS STATUS' as tipo,
    tablename as tabela,
    CASE 
        WHEN rowsecurity THEN 'ATIVO ✅'
        ELSE 'DESATIVADO ❌'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'customers',
    'customer_tags',
    'tags',
    'customer_timeline',
    'conversations',
    'messages',
    'appointments'
)
ORDER BY tablename;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

SELECT 
    'POLÍTICAS RLS' as tipo,
    tablename as tabela,
    policyname as politica,
    cmd as comando,
    CASE 
        WHEN qual IS NOT NULL THEN 'COM FILTRO'
        ELSE 'SEM FILTRO'
    END as tem_filtro
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'customers',
    'customer_tags',
    'tags',
    'customer_timeline',
    'conversations',
    'messages',
    'appointments'
)
ORDER BY tablename, policyname;

-- ============================================
-- ESTRUTURA DAS TABELAS (COLUNAS)
-- ============================================

SELECT 
    'COLUNAS' as tipo,
    table_name as tabela,
    column_name as coluna,
    data_type as tipo,
    CASE 
        WHEN is_nullable = 'YES' THEN 'NULL'
        ELSE 'NOT NULL'
    END as nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'customers',
    'customer_tags',
    'tags',
    'customer_timeline',
    'conversations',
    'messages',
    'appointments'
)
ORDER BY table_name, ordinal_position;
