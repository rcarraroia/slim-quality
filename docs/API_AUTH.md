# API de Autenticação - Slim Quality Backend

## Visão Geral

Sistema completo de autenticação e gestão de usuários implementado no Sprint 1.

**Base URL:** `http://localhost:3000/api`

**Autenticação:** JWT Bearer Token

---

## Endpoints Públicos

### POST /auth/register

Registra novo usuário no sistema.

**Request:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123456",
  "full_name": "Nome Completo",
  "phone": "+5511999999999" // opcional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@exemplo.com",
      "full_name": "Nome Completo",
      "roles": ["cliente"]
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_in": 3600
    }
  },
  "message": "Usuário registrado com sucesso"
}
```

**Erros:**
- `400` - Dados inválidos
- `409` - Email já cadastrado

---

### POST /auth/login

Autentica usuário e retorna tokens.

**Request:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@exemplo.com",
      "full_name": "Nome Completo",
      "roles": ["cliente"]
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_in": 3600
    }
  },
  "message": "Login realizado com sucesso"
}
```

**Erros:**
- `400` - Dados inválidos
- `401` - Credenciais inválidas

---

### POST /auth/forgot-password

Solicita recuperação de senha via email.

**Request:**
```json
{
  "email": "usuario@exemplo.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Se o email existir, você receberá instruções para redefinir sua senha"
}
```

**Nota:** Por segurança, sempre retorna sucesso mesmo se o email não existir.

---

## Endpoints Protegidos

### GET /auth/me

Retorna dados do usuário autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "full_name": "Nome Completo",
    "phone": "+5511999999999",
    "avatar_url": null,
    "is_affiliate": false,
    "affiliate_status": null,
    "roles": ["cliente"],
    "created_at": "2025-01-23T00:00:00Z",
    "last_login_at": "2025-01-23T12:00:00Z"
  }
}
```

**Erros:**
- `401` - Token ausente ou inválido

---

### POST /auth/logout

Encerra sessão do usuário.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Logout realizado com sucesso"
}
```

---

### PUT /users/profile

Atualiza perfil do usuário autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "full_name": "Novo Nome",
  "phone": "+5511988888888",
  "avatar_url": "https://exemplo.com/avatar.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "full_name": "Novo Nome",
    "email": "usuario@exemplo.com",
    "phone": "+5511988888888",
    "avatar_url": "https://exemplo.com/avatar.jpg",
    "updated_at": "2025-01-23T12:30:00Z"
  },
  "message": "Perfil atualizado com sucesso"
}
```

**Erros:**
- `400` - Dados inválidos
- `401` - Token ausente ou inválido

---

## Endpoints Administrativos

Todos os endpoints abaixo requerem role `admin`.

### GET /admin/users

Lista todos os usuários do sistema.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "usuario@exemplo.com",
      "full_name": "Nome Completo",
      "phone": "+5511999999999",
      "is_affiliate": false,
      "affiliate_status": null,
      "roles": ["cliente"],
      "created_at": "2025-01-23T00:00:00Z",
      "last_login_at": "2025-01-23T12:00:00Z"
    }
  ]
}
```

**Erros:**
- `401` - Token ausente ou inválido
- `403` - Permissão insuficiente (não é admin)

---

### GET /admin/users/:id

Busca usuário específico por ID.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "full_name": "Nome Completo",
    "phone": "+5511999999999",
    "avatar_url": null,
    "is_affiliate": false,
    "affiliate_status": null,
    "wallet_id": null,
    "roles": ["cliente"],
    "created_at": "2025-01-23T00:00:00Z",
    "updated_at": "2025-01-23T12:00:00Z",
    "last_login_at": "2025-01-23T12:00:00Z"
  }
}
```

**Erros:**
- `400` - ID inválido
- `401` - Token ausente ou inválido
- `403` - Permissão insuficiente
- `404` - Usuário não encontrado

---

### POST /admin/users/:id/roles

Atribui role a usuário.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "role": "vendedor"
}
```

**Roles disponíveis:**
- `admin` - Administrador do sistema
- `vendedor` - Vendedor
- `afiliado` - Afiliado (preparação para Sprint 4)
- `cliente` - Cliente (padrão)

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Role 'vendedor' atribuída com sucesso"
}
```

**Erros:**
- `400` - Role inválida ou ID inválido
- `401` - Token ausente ou inválido
- `403` - Permissão insuficiente

---

### DELETE /admin/users/:id/roles/:role

Remove role de usuário (soft delete).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Role 'vendedor' removida com sucesso"
}
```

**Erros:**
- `400` - Role inválida ou ID inválido
- `401` - Token ausente ou inválido
- `403` - Permissão insuficiente

---

## Sistema de Roles

### Hierarquia de Permissões

1. **admin** - Acesso total ao sistema
2. **vendedor** - Pode gerenciar vendas
3. **afiliado** - Pode acessar sistema de afiliados (Sprint 4)
4. **cliente** - Acesso básico (padrão)

### Atribuição de Roles

- Usuários podem ter múltiplas roles
- Role padrão: `cliente` (atribuída automaticamente no registro)
- Apenas admins podem atribuir/remover roles

---

## Rate Limiting

### Rotas de Autenticação

- **Limite:** 10 requisições por 15 minutos por IP
- **Aplica-se a:**
  - POST /auth/register
  - POST /auth/login
  - POST /auth/forgot-password

**Response (429):**
```json
{
  "error": "Muitas tentativas. Tente novamente em 15 minutos."
}
```

### Rotas de API Geral

- **Limite:** 100 requisições por 15 minutos por IP

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token ausente ou inválido |
| 403 | Forbidden - Permissão insuficiente |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Email já cadastrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro interno |

---

## Formato de Erro Padrão

```json
{
  "error": "Mensagem de erro",
  "details": [
    {
      "field": "email",
      "message": "Email inválido"
    }
  ]
}
```

---

## Preparação para Sprint 4 (Afiliados)

Os seguintes campos já estão preparados na tabela `profiles`:

- `wallet_id` (TEXT, nullable) - Wallet ID do Asaas
- `is_affiliate` (BOOLEAN, default false) - Flag de afiliado
- `affiliate_status` (TEXT, nullable) - Status do afiliado

Estes campos serão utilizados no Sprint 4 para implementar o sistema de afiliados multinível.

---

## Exemplos de Uso

### Fluxo Completo de Autenticação

```bash
# 1. Registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123456",
    "full_name": "Nome Completo"
  }'

# 2. Fazer login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123456"
  }'

# 3. Obter dados do usuário
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer {access_token}"

# 4. Atualizar perfil
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Novo Nome"
  }'

# 5. Fazer logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {access_token}"
```

---

## Segurança

### JWT Tokens

- **Expiração:** 1 hora (3600 segundos)
- **Algoritmo:** HS256
- **Refresh Token:** Disponível para renovação

### Senhas

- **Mínimo:** 8 caracteres
- **Hash:** bcrypt (gerenciado pelo Supabase Auth)
- **Nunca retornadas:** Senhas nunca são incluídas em responses

### RLS (Row Level Security)

- Usuários acessam apenas próprios dados
- Admins têm acesso total
- Políticas testadas e validadas

---

## Suporte

Para dúvidas ou problemas, consulte:
- Documentação do Supabase: https://supabase.com/docs
- Repositório do projeto: [link]
- Issues: [link]
