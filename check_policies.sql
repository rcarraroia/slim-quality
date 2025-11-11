-- Verificar policies existentes no storage.objects
SELECT 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%product images%'
ORDER BY policyname;
