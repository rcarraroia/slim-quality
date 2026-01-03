-- Verificar se há configurações em campos JSON
-- Buscar em tabelas que podem conter configurações do agente

-- 1. Verificar se existe tabela de configurações gerais
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('config', 'configs', 'settings', 'app_config', 'system_config');

-- 2. Verificar colunas JSON em todas as tabelas
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND (data_type = 'json' OR data_type = 'jsonb')
ORDER BY table_name, column_name;