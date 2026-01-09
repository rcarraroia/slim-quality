-- Criar os dois novos admins com UIDs específicos e senhas hasheadas

-- João Bosco
INSERT INTO admins (
  id,
  email,
  password_hash,
  name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  '55335919-6968-4c6f-b32c-1a97a7b113ff',
  'jbmkt01@gmail.com',
  crypt('jb250470', gen_salt('bf', 10)),
  'João Bosco',
  'super_admin',
  true,
  NOW(),
  NOW()
);

-- Renato Carraro (atualizar o existente com UID específico e nova senha)
UPDATE admins 
SET 
  id = 'e8bb906b-18cf-4a07-bcff-32a152574d74',
  password_hash = crypt('M&151173c@', gen_salt('bf', 10)),
  email = 'rcarrarocoach@gmail.com',
  name = 'Renato Carraro',
  updated_at = NOW()
WHERE email = 'renato@slimquality.com.br';;
