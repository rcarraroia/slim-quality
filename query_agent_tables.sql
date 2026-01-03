-- Verificar todas as tabelas relacionadas ao agente
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (
    table_name ILIKE '%agent%' OR 
    table_name ILIKE '%sicc%' OR 
    table_name ILIKE '%config%' OR
    table_name ILIKE '%automation%' OR
    table_name ILIKE '%memory%' OR
    table_name ILIKE '%learning%' OR
    table_name ILIKE '%behavior%'
  )
ORDER BY table_name;