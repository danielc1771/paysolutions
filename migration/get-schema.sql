-- Get all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name NOT LIKE '%_realtime%'
ORDER BY table_name;

-- Get table structures
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND c.table_schema = 'public'
  AND t.table_name NOT LIKE '%_realtime%'
ORDER BY t.table_name, c.ordinal_position;