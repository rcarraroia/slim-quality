SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%memory%' OR table_name LIKE '%learning%') 
ORDER BY table_name;