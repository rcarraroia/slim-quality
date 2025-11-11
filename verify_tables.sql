-- Verificar tabelas do CRM no banco real
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%customer%' 
    OR table_name LIKE '%conversation%' 
    OR table_name LIKE '%appointment%' 
    OR table_name LIKE '%tag%'
    OR table_name LIKE '%timeline%'
    OR table_name LIKE '%message%'
)
ORDER BY table_name;
