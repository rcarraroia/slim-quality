-- Script para atribuir role admin ao usuário admin@slimquality.com
-- Execute este script no SQL Editor do Supabase

-- Atribuir role admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM profiles
WHERE email = 'admin@slimquality.com'
AND NOT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = profiles.id AND role = 'admin'
);

-- Verificar roles do usuário
SELECT 
  p.id,
  p.email,
  p.full_name,
  array_agg(ur.role) as roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.deleted_at IS NULL
WHERE p.email = 'admin@slimquality.com'
GROUP BY p.id, p.email, p.full_name;
