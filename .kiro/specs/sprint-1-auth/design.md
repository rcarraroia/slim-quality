# Design Document - Sprint 1: Autenticação e Gestão de Usuários

## Overview

Este documento detalha o design técnico para o Sprint 1 do projeto Slim Quality Backend. O foco é implementar um sistema robusto de autenticação utilizando Supabase Auth, com gestão de perfis, roles e preparação crítica para o sistema de afiliados (Sprint 4).

## Architecture

### Authentication Flow

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ POST /api/auth/register
       ↓
┌─────────────────────────────────────┐
│     Auth Controller                 │
│  1. Validar dados (Zod)            │
│  2. Criar usuário (Supabase Auth)  │
│  3. Criar perfil (profiles)        │
│  4. Atribuir role (user_roles)     │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│     Supabase Auth                   │
│  • Gera JWT                         │
│  • Gera Refresh Token               │
│  • Armazena em auth.users           │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│     Database (PostgreSQL)           │
│  • profiles (1:1 com auth.users)   │
│  • user_roles (1:N)                 │
└─────────────────────────────────────┘
```

### Authorization Flow

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ GET /api/admin/users
       │ Header: Authorization: Bearer {token}
       ↓
┌─────────────────────────────────────┐
│  requireAuth Middleware             │
│  1. Extrair token                   │
│  2. Validar JWT                     │
│  3. Buscar usuário                  │
│  4. Adicionar ao req.user           │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  requireRole(['admin']) Middleware  │
│  1. Verificar req.user              │
│  2. Buscar roles do usuário         │
│  3. Validar se tem role requerida   │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│     Controller                      │
│  Executa lógica de negócio          │
└─────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Schema

#### Tabela: profiles

**Objetivo:** Armazenar informações adicionais dos usuários

⚠️ **PREPARAÇÃO CRÍTICA PARA SPRINT 4:**
- Campo `wallet_id` para futuros afiliados
- Campo `is_affiliate` para identificar afiliados
- Campo `affiliate_status` para status do afiliado

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações básicas
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  
  -- ⭐ PREPARAÇÃO PARA SPRINT 4 (Afiliados)
  wallet_id TEXT, -- Wallet ID do Asaas (null até virar afiliado)
  is_affiliate BOOLEAN DEFAULT FALSE, -- Flag de afiliado
  affiliate_status TEXT CHECK (
    affiliate_status IS NULL OR 
    affiliate_status IN ('pending', 'active', 'inactive', 'suspended')
  ), -- Status do afiliado
  
  -- Metadados
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_profiles_email ON profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_is_affiliate ON profiles(is_affiliate) WHERE deleted_at IS NULL; -- ⭐ Para Sprint 4
CREATE INDEX idx_profiles_wallet_id ON profiles(wallet_id) WHERE wallet_id IS NOT NULL; -- ⭐ Para Sprint 4

-- Trigger para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );
```

#### Tabela: user_roles

**Objetivo:** Gerenciar roles/permissões dos usuários

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor', 'afiliado', 'cliente')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(user_id, role, deleted_at)
);

-- Índices
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_role ON user_roles(role) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.deleted_at IS NULL
    )
  );
```

### 2. API Endpoints

#### POST /api/auth/register

**Descrição:** Registrar novo usuário

**Autenticação:** Não requerida

**Request:**
```typescript
{
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}
```

**Response (201):**
```typescript
{
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}
```

**Validações:**
- email: formato válido
- password: mínimo 8 caracteres
- full_name: mínimo 3 caracteres
- phone: formato internacional (opcional)

---

#### POST /api/auth/login

**Descrição:** Autenticar usuário

**Autenticação:** Não requerida

**Request:**
```typescript
{
  email: string;
  password: string;
}
```

**Response (200):**
```typescript
{
  user: {
    id: string;
    email: string;
    full_name: string;
    roles: string[];
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}
```

---

#### POST /api/auth/logout

**Descrição:** Encerrar sessão

**Autenticação:** Requerida

**Response (200):**
```typescript
{
  message: "Logout successful";
}
```

---

#### POST /api/auth/forgot-password

**Descrição:** Solicitar reset de senha

**Autenticação:** Não requerida

**Request:**
```typescript
{
  email: string;
}
```

**Response (200):**
```typescript
{
  message: "If email exists, reset link was sent";
}
```

---

#### GET /api/auth/me

**Descrição:** Obter dados do usuário autenticado

**Autenticação:** Requerida

**Response (200):**
```typescript
{
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_affiliate: boolean;
  roles: string[];
  created_at: string;
}
```

---

#### PUT /api/users/profile

**Descrição:** Atualizar perfil do usuário

**Autenticação:** Requerida

**Request:**
```typescript
{
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}
```

**Response (200):**
```typescript
{
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  updated_at: string;
}
```

### 3. Services

#### AuthService

**Responsabilidade:** Gerenciar autenticação e registro

```typescript
class AuthService {
  /**
   * Registra novo usuário no sistema
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    // 1. Validar dados
    // 2. Criar usuário no Supabase Auth
    // 3. Criar perfil
    // 4. Atribuir role "cliente"
    // 5. Retornar tokens
  }
  
  /**
   * Autentica usuário
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // 1. Autenticar via Supabase Auth
    // 2. Buscar perfil e roles
    // 3. Atualizar last_login_at
    // 4. Retornar tokens e dados
  }
  
  /**
   * Encerra sessão
   */
  async logout(token: string): Promise<void> {
    // 1. Invalidar refresh token
    // 2. Registrar logout
  }
  
  /**
   * Solicita reset de senha
   */
  async forgotPassword(email: string): Promise<void> {
    // 1. Enviar email via Supabase Auth
  }
}
```

#### ProfileService

**Responsabilidade:** Gerenciar perfis de usuários

```typescript
class ProfileService {
  /**
   * Busca perfil por ID
   */
  async getProfile(userId: string): Promise<Profile> {
    // 1. Buscar em profiles
    // 2. Buscar roles
    // 3. Retornar dados completos
  }
  
  /**
   * Atualiza perfil
   */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<Profile> {
    // 1. Validar dados
    // 2. Verificar unicidade de email (se alterado)
    // 3. Atualizar perfil
    // 4. Retornar dados atualizados
  }
  
  /**
   * Cria perfil (usado internamente após registro)
   */
  async createProfile(userId: string, data: CreateProfileData): Promise<Profile> {
    // 1. Criar registro em profiles
    // 2. Atribuir role padrão
    // 3. Retornar perfil criado
  }
}
```

#### RoleService

**Responsabilidade:** Gerenciar roles de usuários

```typescript
class RoleService {
  /**
   * Busca roles de um usuário
   */
  async getUserRoles(userId: string): Promise<string[]> {
    // 1. Buscar em user_roles
    // 2. Filtrar deleted_at IS NULL
    // 3. Retornar array de roles
  }
  
  /**
   * Atribui role a usuário
   */
  async assignRole(userId: string, role: string): Promise<void> {
    // 1. Validar role existe
    // 2. Verificar se já tem role
    // 3. Inserir em user_roles
  }
  
  /**
   * Remove role de usuário (soft delete)
   */
  async removeRole(userId: string, role: string): Promise<void> {
    // 1. Buscar role
    // 2. Soft delete (updated_at)
  }
  
  /**
   * Verifica se usuário tem role específica
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    // 1. Buscar em user_roles
    // 2. Retornar boolean
  }
}
```

### 4. Middlewares

#### requireAuth

**Responsabilidade:** Validar autenticação

```typescript
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extrair token do header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }
    
    const token = authHeader.substring(7);
    
    // 2. Validar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // 3. Buscar perfil e roles
    const profile = await profileService.getProfile(user.id);
    const roles = await roleService.getUserRoles(user.id);
    
    // 4. Adicionar ao request
    req.user = {
      id: user.id,
      email: user.email!,
      profile,
      roles,
    };
    
    next();
  } catch (error) {
    logger.error('requireAuth', 'Authentication error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### requireRole

**Responsabilidade:** Validar autorização por role

```typescript
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Verificar se usuário está autenticado
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // 2. Verificar se tem role requerida
      const hasRequiredRole = req.user.roles.some(role => 
        allowedRoles.includes(role)
      );
      
      if (!hasRequiredRole) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: allowedRoles,
        });
      }
      
      next();
    } catch (error) {
      logger.error('requireRole', 'Authorization error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};
```

### 5. Validation Schemas (Zod)

```typescript
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  full_name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido').optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(3).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  avatar_url: z.string().url().optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});
```

### 6. TypeScript Types

```typescript
// src/types/auth.types.ts

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    roles: string[];
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  wallet_id: string | null;
  is_affiliate: boolean;
  affiliate_status: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'vendedor' | 'afiliado' | 'cliente';
  created_at: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        profile: Profile;
        roles: string[];
      };
    }
  }
}
```

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth)
│  - id (PK)      │
│  - email        │
│  - encrypted_pw │
└────────┬────────┘
         │ 1:1
         ↓
┌─────────────────┐
│    profiles     │
│  - id (PK, FK)  │
│  - full_name    │
│  - email        │
│  - phone        │
│  - wallet_id ⭐ │ (Para Sprint 4)
│  - is_affiliate⭐│ (Para Sprint 4)
└────────┬────────┘
         │ 1:N
         ↓
┌─────────────────┐
│   user_roles    │
│  - id (PK)      │
│  - user_id (FK) │
│  - role         │
└─────────────────┘
```

## Error Handling

### Authentication Errors
- **401 Unauthorized:** Token ausente, inválido ou expirado
- **403 Forbidden:** Usuário sem permissão para ação
- **400 Bad Request:** Dados de entrada inválidos

### Validation Errors
```typescript
{
  error: "Validation failed",
  details: [
    {
      field: "email",
      message: "Email inválido"
    }
  ]
}
```

### Database Errors
- Tratar violação de unique constraint (email duplicado)
- Tratar foreign key violations
- Usar transações para operações críticas

## Testing Strategy

### Unit Tests

**Arquivos:**
- `tests/unit/services/auth.service.test.ts`
- `tests/unit/services/profile.service.test.ts`
- `tests/unit/services/role.service.test.ts`
- `tests/unit/middlewares/auth.middleware.test.ts`

**Casos de teste:**
- Registro com dados válidos
- Registro com email duplicado
- Login com credenciais válidas
- Login com credenciais inválidas
- Validação de tokens
- Verificação de roles

### Integration Tests

**Arquivos:**
- `tests/integration/auth.test.ts`

**Casos de teste:**
- Fluxo completo: registro → login → acesso protegido
- Fluxo de recuperação de senha
- Fluxo de atualização de perfil
- Verificação de RLS

## Performance Considerations

- Índices em campos de busca frequente (email, phone, is_affiliate)
- Cache de roles em memória (considerar para Sprint 8)
- Queries otimizadas com JOINs eficientes

## Security Considerations

### Password Security
- Supabase Auth gerencia hash de senhas (bcrypt)
- Nunca retornar senha em responses
- Validar força da senha (mínimo 8 caracteres)

### Token Security
- JWT assinado pelo Supabase
- Refresh token armazenado de forma segura
- Tokens expiram em 1 hora (configurável)

### RLS Policies
- Usuários acessam apenas próprios dados
- Admins têm acesso total
- Políticas testadas rigorosamente

### Input Validation
- Zod para validação de schemas
- Sanitização de entrada
- Prevenção de SQL injection (via Supabase Client)

## Deployment Considerations

- Migrations devem ser aplicadas antes de deploy
- Testar RLS em ambiente de staging
- Validar que função update_updated_at_column existe
- Configurar variáveis de ambiente de produção

## Future Enhancements

- OAuth (Google, Facebook) - Sprint 2 ou 3
- 2FA (Two-Factor Authentication) - Sprint 9
- Auditoria de acessos - Sprint 9
- Rate limiting por usuário - Sprint 3
