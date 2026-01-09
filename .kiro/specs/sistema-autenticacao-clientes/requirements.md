# Requirements Document

## Introduction

Sistema de autenticação unificado para clientes e afiliados da Slim Quality. Este documento define os requisitos para separar o login de administradores do login de clientes, criar o dashboard do cliente, e integrar o sistema de afiliados com dados reais.

## Glossary

- **Customer**: Cliente que comprou ou se cadastrou no sistema
- **Affiliate**: Afiliado que pode indicar produtos e receber comissões
- **Admin**: Administrador do sistema com acesso ao dashboard administrativo
- **Auth_System**: Sistema de autenticação baseado em Supabase Auth
- **Customer_Dashboard**: Painel do cliente para visualizar pedidos e dados
- **Affiliate_Dashboard**: Painel do afiliado para visualizar comissões e rede

## Requirements

### Requirement 1: Separação de Login Admin

**User Story:** As an admin, I want to access the admin login through a dedicated URL, so that the login page is not confused with customer login.

#### Acceptance Criteria

1. WHEN an admin accesses `/admin/login`, THE Auth_System SHALL display the admin login form
2. WHEN an admin successfully logs in at `/admin/login`, THE Auth_System SHALL redirect to `/dashboard`
3. WHEN a non-admin user tries to access `/dashboard/*`, THE Auth_System SHALL redirect to `/admin/login`
4. THE Header SHALL NOT display a link to `/admin/login` (admin access is hidden)
5. WHEN the current `/login` page is accessed, THE Auth_System SHALL redirect to `/entrar`

### Requirement 2: Login de Clientes

**User Story:** As a customer, I want to log in to my account, so that I can view my orders and manage my data.

#### Acceptance Criteria

1. WHEN a customer accesses `/entrar`, THE Auth_System SHALL display the customer login form
2. WHEN a customer successfully logs in, THE Auth_System SHALL redirect to `/minha-conta`
3. WHEN a customer enters invalid credentials, THE Auth_System SHALL display an error message
4. THE Login_Form SHALL include options for email/password login
5. THE Login_Form SHALL include a link to register a new account
6. THE Login_Form SHALL include a "Forgot Password" link
7. WHEN the Header "Entrar" button is clicked, THE System SHALL navigate to `/entrar`

### Requirement 3: Cadastro de Clientes

**User Story:** As a visitor, I want to create a customer account, so that I can track my orders and become an affiliate.

#### Acceptance Criteria

1. WHEN a visitor accesses `/entrar` and clicks "Criar Conta", THE Auth_System SHALL display the registration form
2. THE Registration_Form SHALL require: name, email, phone, password
3. WHEN registration is successful, THE Auth_System SHALL create a record in `auth.users`
4. WHEN registration is successful, THE Auth_System SHALL create a record in `customers` with `user_id`
5. WHEN registration is successful, THE Auth_System SHALL automatically log in the user
6. WHEN registration is successful, THE Auth_System SHALL redirect to `/minha-conta`
7. IF email already exists, THEN THE Auth_System SHALL display an appropriate error message

### Requirement 4: Vinculação de user_id em Customers

**User Story:** As a system architect, I want customers to be linked to auth users, so that they can log in and access their data.

#### Acceptance Criteria

1. THE Database SHALL have a `user_id` column in the `customers` table
2. WHEN a new customer registers, THE System SHALL set `user_id` to the authenticated user's ID
3. WHEN a customer makes a purchase without an account, THE System SHALL create a customer record with `user_id = null`
4. WHEN a customer with `user_id = null` registers with the same email, THE System SHALL update the existing customer record with the new `user_id`

### Requirement 5: Dashboard do Cliente

**User Story:** As a customer, I want to access my dashboard, so that I can view my orders and manage my profile.

#### Acceptance Criteria

1. WHEN a logged-in customer accesses `/minha-conta`, THE Customer_Dashboard SHALL display the main dashboard
2. THE Customer_Dashboard SHALL display a summary of recent orders
3. THE Customer_Dashboard SHALL have a menu with: Início, Meus Pedidos, Meus Dados
4. WHEN the customer is also an affiliate, THE Customer_Dashboard menu SHALL include "Painel de Afiliado"
5. WHEN the customer is NOT an affiliate, THE Customer_Dashboard SHALL display a "Quero Ser Afiliado" button
6. WHEN a non-authenticated user accesses `/minha-conta/*`, THE System SHALL redirect to `/entrar`

### Requirement 6: Página Meus Pedidos

**User Story:** As a customer, I want to view my order history, so that I can track my purchases.

#### Acceptance Criteria

1. WHEN a customer accesses `/minha-conta/pedidos`, THE System SHALL display a list of their orders
2. THE Order_List SHALL show: order date, status, total value, products
3. WHEN an order is clicked, THE System SHALL display order details
4. IF the customer has no orders, THEN THE System SHALL display an empty state message

### Requirement 7: Página Meus Dados

**User Story:** As a customer, I want to manage my profile data, so that I can keep my information updated.

#### Acceptance Criteria

1. WHEN a customer accesses `/minha-conta/dados`, THE System SHALL display their profile form
2. THE Profile_Form SHALL allow editing: name, email, phone, address
3. WHEN the customer saves changes, THE System SHALL update the `customers` table
4. THE System SHALL display a success message after saving

### Requirement 8: Ativação de Afiliado pelo Cliente

**User Story:** As a customer, I want to become an affiliate directly from my dashboard, so that I can start earning commissions.

#### Acceptance Criteria

1. WHEN a customer clicks "Quero Ser Afiliado" in the dashboard, THE System SHALL display a confirmation modal
2. THE Confirmation_Modal SHALL explain the affiliate program benefits
3. THE Confirmation_Modal SHALL have "Confirmar" and "Cancelar" buttons
4. WHEN the customer confirms, THE System SHALL create a record in `affiliates` with the customer's `user_id`
5. WHEN the affiliate is created, THE System SHALL generate a unique `referral_code`
6. WHEN the affiliate is created, THE System SHALL set status to `pending` (awaiting wallet configuration)
7. WHEN activation is successful, THE System SHALL show a success message and update the menu
8. THE Customer_Dashboard menu SHALL immediately show "Painel de Afiliado" after activation

### Requirement 9: Cadastro de Afiliado (Página Pública)

**User Story:** As a visitor, I want to register as an affiliate through the public page, so that I can start earning commissions.

#### Acceptance Criteria

1. THE `/afiliados` landing page SHALL remain public and unchanged
2. WHEN a visitor clicks "Quero Ser Afiliado", THE System SHALL navigate to `/afiliados/cadastro`
3. THE `/afiliados/cadastro` form SHALL create both customer and affiliate accounts
4. WHEN registration is successful, THE System SHALL create records in: `auth.users`, `customers`, `affiliates`
5. WHEN registration is successful, THE System SHALL automatically log in the user
6. WHEN registration is successful, THE System SHALL redirect to `/afiliados/dashboard`
7. IF the visitor was referred (has `ref` parameter), THE System SHALL link the new affiliate to the referrer

### Requirement 10: Customer Auth Service

**User Story:** As a developer, I want a dedicated authentication service for customers, so that customer auth is separated from admin auth.

#### Acceptance Criteria

1. THE System SHALL have a `customerAuthService` separate from `adminAuthService`
2. THE `customerAuthService` SHALL handle: login, logout, register, password reset
3. THE `customerAuthService` SHALL use Supabase Auth for authentication
4. THE `customerAuthService` SHALL manage customer session state
5. WHEN a customer logs in, THE `customerAuthService` SHALL fetch customer data from `customers` table
6. WHEN a customer logs in, THE `customerAuthService` SHALL check if customer is also an affiliate

### Requirement 11: Substituir Mocks no Dashboard de Afiliado

**User Story:** As an affiliate, I want to see real data in my dashboard, so that I can track my actual commissions and network.

#### Acceptance Criteria

1. THE Affiliate_Dashboard SHALL fetch real data from Supabase instead of mock data
2. THE `getNetwork()` method SHALL query `affiliate_network` and `affiliates` tables
3. THE `getCommissions()` method SHALL query `commissions` table
4. THE `getWithdrawals()` method SHALL query `withdrawals` table (or equivalent)
5. THE `checkAffiliateStatus()` method SHALL query `affiliates` table by `user_id`
6. WHEN the affiliate has no data, THE System SHALL display appropriate empty states

### Requirement 12: Proteção de Rotas

**User Story:** As a system architect, I want routes to be protected based on user type, so that unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN a non-authenticated user accesses `/minha-conta/*`, THE System SHALL redirect to `/entrar`
2. WHEN a non-authenticated user accesses `/afiliados/dashboard/*`, THE System SHALL redirect to `/entrar`
3. WHEN a non-admin user accesses `/dashboard/*`, THE System SHALL redirect to `/admin/login`
4. WHEN a non-affiliate user accesses `/afiliados/dashboard/*`, THE System SHALL redirect to `/minha-conta`
5. THE System SHALL use route guards to enforce these protections
