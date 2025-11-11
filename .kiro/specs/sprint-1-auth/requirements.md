# Requirements Document - Sprint 1: Autenticação e Gestão de Usuários

## Introduction

Este documento define os requisitos para o Sprint 1 do projeto Slim Quality Backend. O objetivo é implementar um sistema completo de autenticação utilizando Supabase Auth, gestão de perfis de usuários e sistema de roles/permissões. Este sprint estabelece a base de segurança e controle de acesso para todo o sistema.

**Preparação Crítica:** Este sprint deve preparar a estrutura para o Sprint 4 (Sistema de Afiliados), incluindo campos preparatórios na tabela profiles.

## Glossary

- **Sistema**: Slim Quality Backend
- **Supabase Auth**: Sistema de autenticação JWT-based fornecido pelo Supabase
- **Profile**: Perfil de usuário contendo informações adicionais além das credenciais
- **Role**: Papel/função do usuário no sistema (admin, vendedor, afiliado, cliente)
- **RLS**: Row Level Security - sistema de segurança do PostgreSQL
- **JWT**: JSON Web Token - token de autenticação
- **Refresh Token**: Token usado para renovar o access token sem novo login
- **Wallet ID**: Identificador da carteira digital no gateway Asaas (preparatório para afiliados)
- **Middleware**: Função intermediária que processa requisições antes de chegar ao controller

## Requirements

### Requirement 1: Registro de Novos Usuários

**User Story:** Como visitante, eu quero me registrar no sistema com email e senha, para que eu possa acessar a plataforma.

#### Acceptance Criteria

1. WHEN o visitante envia dados de registro válidos, THE Sistema SHALL criar usuário no Supabase Auth e perfil correspondente
2. WHEN o email já está cadastrado, THE Sistema SHALL retornar erro HTTP 400 com mensagem descritiva
3. WHEN os dados são inválidos, THE Sistema SHALL retornar erro HTTP 400 com detalhes de validação
4. WHEN o registro é bem-sucedido, THE Sistema SHALL retornar HTTP 201 com dados do usuário e token JWT
5. WHEN o perfil é criado, THE Sistema SHALL atribuir role "cliente" por padrão

### Requirement 2: Autenticação de Usuários

**User Story:** Como usuário registrado, eu quero fazer login com email e senha, para que eu possa acessar funcionalidades protegidas.

#### Acceptance Criteria

1. WHEN o usuário envia credenciais válidas, THE Sistema SHALL retornar HTTP 200 com access token e refresh token
2. WHEN as credenciais são inválidas, THE Sistema SHALL retornar erro HTTP 401 com mensagem genérica
3. WHEN o usuário está inativo, THE Sistema SHALL retornar erro HTTP 403 indicando conta desativada
4. WHEN o login é bem-sucedido, THE Sistema SHALL registrar timestamp do último acesso
5. WHEN o token expira, THE Sistema SHALL permitir renovação via refresh token

### Requirement 3: Gestão de Perfis de Usuários

**User Story:** Como usuário autenticado, eu quero visualizar e atualizar meu perfil, para que eu possa manter minhas informações atualizadas.

#### Acceptance Criteria

1. WHEN o usuário solicita seu perfil, THE Sistema SHALL retornar HTTP 200 com dados completos do perfil
2. WHEN o usuário atualiza dados válidos, THE Sistema SHALL persistir alterações e retornar HTTP 200
3. WHEN o usuário tenta atualizar email, THE Sistema SHALL validar unicidade antes de persistir
4. WHEN o usuário tenta acessar perfil de outro usuário, THE Sistema SHALL retornar erro HTTP 403
5. THE Sistema SHALL atualizar automaticamente campo updated_at em toda modificação

### Requirement 4: Sistema de Roles e Permissões

**User Story:** Como administrador, eu quero atribuir roles aos usuários, para que eu possa controlar acesso a funcionalidades específicas.

#### Acceptance Criteria

1. THE Sistema SHALL suportar roles: admin, vendedor, afiliado, cliente
2. WHEN um usuário recebe nova role, THE Sistema SHALL registrar em user_roles com timestamp
3. WHEN um usuário tem múltiplas roles, THE Sistema SHALL retornar todas em consultas
4. WHEN uma role é removida, THE Sistema SHALL usar soft delete (deleted_at)
5. THE Sistema SHALL validar que role existe em enum antes de atribuir

### Requirement 5: Middleware de Autenticação

**User Story:** Como desenvolvedor, eu quero middleware de autenticação reutilizável, para que eu possa proteger rotas facilmente.

#### Acceptance Criteria

1. WHEN uma rota protegida é acessada sem token, THE Sistema SHALL retornar erro HTTP 401
2. WHEN o token é inválido ou expirado, THE Sistema SHALL retornar erro HTTP 401
3. WHEN o token é válido, THE Sistema SHALL adicionar dados do usuário ao objeto request
4. WHEN o middleware valida token, THE Sistema SHALL verificar assinatura JWT
5. THE Sistema SHALL extrair token do header Authorization no formato "Bearer {token}"

### Requirement 6: Middleware de Autorização

**User Story:** Como desenvolvedor, eu quero middleware de autorização por role, para que eu possa restringir acesso baseado em permissões.

#### Acceptance Criteria

1. WHEN usuário não tem role requerida, THE Sistema SHALL retornar erro HTTP 403
2. WHEN usuário tem role requerida, THE Sistema SHALL permitir acesso ao endpoint
3. WHEN múltiplas roles são aceitas, THE Sistema SHALL validar se usuário possui ao menos uma
4. WHEN role é verificada, THE Sistema SHALL consultar user_roles ativas (deleted_at IS NULL)
5. THE Sistema SHALL permitir configuração de roles requeridas por rota

### Requirement 7: Recuperação de Senha

**User Story:** Como usuário, eu quero recuperar minha senha via email, para que eu possa acessar minha conta caso esqueça a senha.

#### Acceptance Criteria

1. WHEN o usuário solicita recuperação com email válido, THE Sistema SHALL enviar link de reset via Supabase Auth
2. WHEN o email não existe, THE Sistema SHALL retornar HTTP 200 sem revelar inexistência (segurança)
3. WHEN o usuário clica no link, THE Sistema SHALL validar token de reset
4. WHEN o token é válido, THE Sistema SHALL permitir definição de nova senha
5. WHEN a senha é redefinida, THE Sistema SHALL invalidar tokens anteriores

### Requirement 8: Logout e Invalidação de Tokens

**User Story:** Como usuário autenticado, eu quero fazer logout, para que eu possa encerrar minha sessão de forma segura.

#### Acceptance Criteria

1. WHEN o usuário faz logout, THE Sistema SHALL invalidar refresh token no Supabase Auth
2. WHEN o logout é bem-sucedido, THE Sistema SHALL retornar HTTP 200
3. WHEN o token já está invalidado, THE Sistema SHALL retornar HTTP 200 (idempotente)
4. WHEN o usuário faz logout, THE Sistema SHALL registrar timestamp da ação
5. THE Sistema SHALL limpar sessão do lado do servidor

### Requirement 9: Row Level Security (RLS)

**User Story:** Como administrador de sistema, eu quero que dados sejam protegidos por RLS, para que usuários acessem apenas dados autorizados.

#### Acceptance Criteria

1. THE Sistema SHALL ativar RLS em tabelas profiles e user_roles
2. WHEN usuário consulta profiles, THE Sistema SHALL aplicar política permitindo acesso apenas ao próprio perfil
3. WHEN admin consulta profiles, THE Sistema SHALL aplicar política permitindo acesso a todos
4. WHEN usuário consulta user_roles, THE Sistema SHALL aplicar política permitindo ver apenas próprias roles
5. THE Sistema SHALL bloquear acesso direto ao banco sem passar por políticas RLS

### Requirement 10: Preparação para Sistema de Afiliados

**User Story:** Como arquiteto de sistema, eu quero estrutura preparada para afiliados, para que Sprint 4 não requeira alterações em tabelas existentes.

#### Acceptance Criteria

1. THE Sistema SHALL incluir campo wallet_id (TEXT NULL) em profiles
2. THE Sistema SHALL incluir campo is_affiliate (BOOLEAN DEFAULT FALSE) em profiles
3. THE Sistema SHALL incluir campo affiliate_status (TEXT NULL) em profiles
4. WHEN perfil é criado, THE Sistema SHALL inicializar is_affiliate como FALSE
5. THE Sistema SHALL criar índice em is_affiliate para otimizar queries futuras

### Requirement 11: Validação de Dados

**User Story:** Como desenvolvedor, eu quero validação robusta de entrada, para que dados inválidos sejam rejeitados antes de persistência.

#### Acceptance Criteria

1. WHEN dados são recebidos, THE Sistema SHALL validar usando schemas Zod
2. WHEN email é inválido, THE Sistema SHALL retornar erro HTTP 400 com detalhes
3. WHEN senha tem menos de 8 caracteres, THE Sistema SHALL retornar erro HTTP 400
4. WHEN telefone tem formato inválido, THE Sistema SHALL retornar erro HTTP 400
5. THE Sistema SHALL sanitizar entrada para prevenir SQL injection e XSS

### Requirement 12: Sincronização de Perfis

**User Story:** Como usuário, eu quero que meu perfil seja criado automaticamente ao registrar, para que eu não precise de passos adicionais.

#### Acceptance Criteria

1. WHEN usuário é criado no Supabase Auth, THE Sistema SHALL criar perfil correspondente automaticamente
2. WHEN criação de perfil falha, THE Sistema SHALL reverter criação do usuário (transação)
3. WHEN perfil é criado, THE Sistema SHALL copiar email do auth.users
4. WHEN perfil é criado, THE Sistema SHALL usar mesmo UUID do auth.users
5. THE Sistema SHALL garantir consistência entre auth.users e profiles
