# Design Document

## Overview

Este documento descreve a arquitetura técnica para implementar o sistema de autenticação unificado de clientes e afiliados da Slim Quality. O sistema separa completamente a autenticação de administradores da autenticação de clientes, cria um dashboard para clientes, e integra o sistema de afiliados com dados reais do banco de dados.

## Architecture

### Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Public Pages │  │ Customer     │  │ Admin Dashboard      │  │
│  │ /, /produtos │  │ Dashboard    │  │ /dashboard/*         │  │
│  │ /afiliados   │  │ /minha-conta │  │                      │  │
│  │ /entrar      │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                 │                    │                 │
│         ▼                 ▼                    ▼                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Auth Services                         │   │
│  │  ┌─────────────────┐    ┌─────────────────────────┐     │   │
│  │  │customerAuthSvc  │    │ adminAuthService        │     │   │
│  │  │(clientes)       │    │ (administradores)       │     │   │
│  │  └─────────────────┘    └─────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ auth.users   │  │ customers    │  │ affiliates           │  │
│  │              │◄─┤ user_id (FK) │◄─┤ user_id (FK)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ admins       │  │ orders       │  │ commissions          │  │
│  │ user_id (FK) │  │ customer_id  │  │ affiliate_id         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE AUTENTICAÇÃO                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLIENTE:                                                        │
│  /entrar → customerAuthService.login() → /minha-conta           │
│                                                                  │
│  ADMIN:                                                          │
│  /admin/login → adminAuthService.login() → /dashboard           │
│                                                                  │
│  CADASTRO CLIENTE:                                               │
│  /entrar (criar conta) → customerAuthService.register()         │
│    → cria auth.users + customers → /minha-conta                 │
│                                                                  │
│  CADASTRO AFILIADO (público):                                    │
│  /afiliados/cadastro → customerAuthService.registerAffiliate()  │
│    → cria auth.users + customers + affiliates                   │
│    → /afiliados/dashboard                                        │
│                                                                  │
│  ATIVAÇÃO AFILIADO (cliente logado):                            │
│  /minha-conta → botão "Quero Ser Afiliado"                      │
│    → affiliateService.activateAffiliate()                       │
│    → cria affiliates → atualiza menu                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Services

#### CustomerAuthService

```typescript
// src/services/customer-auth.service.ts

interface CustomerUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  isAffiliate: boolean;
  affiliateId?: string;
}

interface CustomerAuthService {
  // Autenticação
  login(email: string, password: string): Promise<{ success: boolean; user?: CustomerUser; error?: string }>;
  logout(): Promise<void>;
  register(data: RegisterData): Promise<{ success: boolean; user?: CustomerUser; error?: string }>;
  registerWithAffiliate(data: RegisterAffiliateData): Promise<{ success: boolean; user?: CustomerUser; error?: string }>;
  
  // Estado
  isAuthenticated(): boolean;
  getCurrentUser(): Promise<CustomerUser | null>;
  getStoredUser(): CustomerUser | null;
  
  // Utilitários
  resetPassword(email: string): Promise<{ success: boolean; error?: string }>;
  updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }>;
}
```

#### AffiliateService (atualizado)

```typescript
// src/services/frontend/affiliate.service.ts (atualizado)

interface AffiliateService {
  // Ativação de afiliado (para clientes logados)
  activateAffiliate(): Promise<{ success: boolean; affiliate?: AffiliateData; error?: string }>;
  
  // Dados reais (substituir mocks)
  getNetwork(): Promise<NetworkData>;
  getCommissions(page?: number, limit?: number): Promise<CommissionsData>;
  getWithdrawals(page?: number, limit?: number): Promise<WithdrawalsData>;
  checkAffiliateStatus(): Promise<{ isAffiliate: boolean; affiliate?: AffiliateData }>;
}
```

### Pages

#### Novas Páginas

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/entrar` | `CustomerLogin.tsx` | Login/cadastro de clientes |
| `/admin/login` | `AdminLogin.tsx` | Login de administradores |
| `/minha-conta` | `CustomerDashboard.tsx` | Dashboard do cliente |
| `/minha-conta/pedidos` | `CustomerOrders.tsx` | Lista de pedidos |
| `/minha-conta/dados` | `CustomerProfile.tsx` | Dados do perfil |

#### Páginas Modificadas

| Rota | Modificação |
|------|-------------|
| `/login` | Redireciona para `/entrar` |
| `/afiliados/cadastro` | Cria cliente + afiliado junto |

### Layouts

#### CustomerDashboardLayout

```typescript
// src/layouts/CustomerDashboardLayout.tsx

interface CustomerDashboardLayoutProps {
  children: React.ReactNode;
}

// Menu items:
// - Início (/minha-conta)
// - Meus Pedidos (/minha-conta/pedidos)
// - Meus Dados (/minha-conta/dados)
// - [Se afiliado] Painel de Afiliado (/afiliados/dashboard)
// - [Se não afiliado] Botão "Quero Ser Afiliado"
```

### Hooks

#### useCustomerAuth

```typescript
// src/hooks/useCustomerAuth.ts

interface UseCustomerAuthReturn {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAffiliate: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<boolean>;
  activateAffiliate: () => Promise<boolean>;
}
```

## Data Models

### Alteração na Tabela customers

```sql
-- Adicionar coluna user_id
ALTER TABLE customers 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Criar índice para busca por user_id
CREATE INDEX idx_customers_user_id ON customers(user_id);
```

### Estrutura de Dados

```typescript
// Customer
interface Customer {
  id: string;
  user_id: string | null;  // NOVO - vincula com auth.users
  name: string;
  email: string;
  phone?: string;
  document?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  updated_at: string;
}

// Affiliate (existente)
interface Affiliate {
  id: string;
  user_id: string;  // Já existe
  name: string;
  email: string;
  phone?: string;
  document?: string;
  wallet_id?: string;
  referral_code: string;
  slug?: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'rejected';
  total_clicks: number;
  total_conversions: number;
  total_commissions_cents: number;
  created_at: string;
  updated_at: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Route Protection for Admin Dashboard

*For any* user that is not authenticated as an admin, accessing any route under `/dashboard/*` SHALL result in a redirect to `/admin/login`.

**Validates: Requirements 1.3, 12.3**

### Property 2: Route Protection for Customer Dashboard

*For any* user that is not authenticated as a customer, accessing any route under `/minha-conta/*` SHALL result in a redirect to `/entrar`.

**Validates: Requirements 5.6, 12.1**

### Property 3: Route Protection for Affiliate Dashboard

*For any* user that is authenticated as a customer but is NOT an affiliate, accessing any route under `/afiliados/dashboard/*` SHALL result in a redirect to `/minha-conta`.

**Validates: Requirements 12.4**

### Property 4: Customer Registration Creates Linked Records

*For any* valid registration data, when a customer registers successfully, the system SHALL create a record in `auth.users` AND a record in `customers` with `user_id` matching the auth user's ID.

**Validates: Requirements 3.3, 3.4, 4.2**

### Property 5: Affiliate Registration Creates All Records

*For any* valid affiliate registration data, when a visitor registers through `/afiliados/cadastro`, the system SHALL create records in `auth.users`, `customers`, AND `affiliates`, all linked by the same `user_id`.

**Validates: Requirements 9.4**

### Property 6: Customer Email Linking

*For any* customer record with `user_id = null`, when a user registers with the same email, the system SHALL update the existing customer record with the new `user_id` instead of creating a duplicate.

**Validates: Requirements 4.4**

### Property 7: Affiliate Activation Creates Record

*For any* authenticated customer that is not yet an affiliate, when they click "Quero Ser Afiliado" and confirm, the system SHALL create an affiliate record with the customer's `user_id` and a unique `referral_code`.

**Validates: Requirements 8.4, 8.5, 8.6**

### Property 8: Dashboard Menu Reflects Affiliate Status

*For any* authenticated customer, the dashboard menu SHALL show "Painel de Afiliado" if and only if the customer has an active affiliate record.

**Validates: Requirements 5.4, 5.5, 8.8**

### Property 9: Real Data in Affiliate Dashboard

*For any* authenticated affiliate, the dashboard data (network, commissions, withdrawals) SHALL match the records in the database for that affiliate's `user_id`.

**Validates: Requirements 11.2, 11.3, 11.4, 11.5**

## Error Handling

### Erros de Autenticação

| Código | Mensagem | Ação |
|--------|----------|------|
| `AUTH_INVALID_CREDENTIALS` | "Email ou senha incorretos" | Mostrar erro no formulário |
| `AUTH_EMAIL_EXISTS` | "Este email já está cadastrado" | Sugerir login ou recuperação |
| `AUTH_WEAK_PASSWORD` | "Senha muito fraca" | Mostrar requisitos de senha |
| `AUTH_SESSION_EXPIRED` | "Sessão expirada" | Redirecionar para login |

### Erros de Afiliado

| Código | Mensagem | Ação |
|--------|----------|------|
| `AFFILIATE_ALREADY_EXISTS` | "Você já é um afiliado" | Redirecionar para dashboard |
| `AFFILIATE_ACTIVATION_FAILED` | "Erro ao ativar conta de afiliado" | Mostrar erro e retry |

## Testing Strategy

### Testes Unitários

- `customerAuthService`: login, logout, register, isAuthenticated
- `affiliateService`: activateAffiliate, getNetwork, getCommissions
- Route guards: verificar redirecionamentos

### Testes de Propriedade

- **Property 1-3**: Gerar usuários aleatórios de diferentes tipos e verificar redirecionamentos
- **Property 4-5**: Gerar dados de registro aleatórios e verificar criação de records
- **Property 6**: Gerar customers sem user_id e verificar merge
- **Property 7**: Gerar clientes e verificar ativação de afiliado
- **Property 8**: Gerar clientes com/sem afiliado e verificar menu
- **Property 9**: Gerar dados de afiliado e verificar que dashboard mostra dados corretos

### Testes de Integração

- Fluxo completo de cadastro de cliente
- Fluxo completo de cadastro de afiliado
- Fluxo de ativação de afiliado por cliente
- Proteção de rotas end-to-end
