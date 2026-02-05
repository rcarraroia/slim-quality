# Design Document - Sprint 7: Correções Críticas do Sistema

## Overview

Este documento define o design técnico para o Sprint 7 - Correções Críticas, focado em resolver problemas estruturais identificados na análise do sistema. O sprint implementa backend ausente, remove dados mockados e corrige fluxos quebrados.

**Abordagem:** Correção incremental e segura, priorizando funcionalidades críticas sem quebrar código existente.

**Princípios:**
1. Mínima interrupção do sistema em produção
2. Reutilização máxima de código existente
3. Testes em cada etapa crítica
4. Rollback fácil em caso de problemas

## Architecture

### Visão Geral da Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Admin      │  │  Affiliate   │  │   Public     │      │
│  │  Dashboard   │  │  Dashboard   │  │    Pages     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
│                  ┌────────▼────────┐                        │
│                  │  Frontend       │                        │
│                  │  Services       │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │   API Client    │
                   │  (axios/fetch)  │
                   └────────┬────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    BACKEND (Express + Supabase)              │
│                           │                                  │
│                  ┌────────▼────────┐                        │
│                  │   API Routes    │                        │
│                  └────────┬────────┘                        │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐              │
│         │                 │                 │              │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐       │
│  │ Controllers │  │ Middlewares │  │ Validators  │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                                  │
│                  ┌────────▼────────┐                        │
│                  │    Services     │                        │
│                  └────────┬────────┘                        │
│                           │                                  │
└───────────────────────────┼─────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │   Supabase      │
                   │   PostgreSQL    │
                   └─────────────────┘
```



### Camadas da Aplicação

**1. Frontend Layer**
- **Páginas:** Componentes React que renderizam UI
- **Serviços Frontend:** Classes TypeScript que consomem APIs
- **Hooks:** Lógica reutilizável de estado e efeitos
- **Contextos:** Estado global (Auth, Theme, etc)

**2. API Layer**
- **Routes:** Definição de endpoints REST
- **Controllers:** Lógica de controle de requisições
- **Middlewares:** Autenticação, validação, logging
- **Validators:** Schemas Zod para validação de entrada

**3. Service Layer**
- **Business Logic:** Regras de negócio
- **Database Access:** Queries ao Supabase
- **External APIs:** Integração com Asaas, N8N
- **Utilities:** Funções auxiliares

**4. Data Layer**
- **Supabase PostgreSQL:** Banco de dados principal
- **RLS Policies:** Segurança em nível de linha
- **Migrations:** Versionamento de schema

## Components and Interfaces

### Backend Components a Implementar

#### 1. Affiliate Controller (`src/api/controllers/affiliate.controller.ts`)

```typescript
class AffiliateController {
  // Públicos
  register(req, res): Promise<void>
  validateWallet(req, res): Promise<void>
  validateReferralCode(req, res): Promise<void>
  
  // Afiliado autenticado
  getMyDashboard(req, res): Promise<void>
  getMyNetwork(req, res): Promise<void>
  getMyCommissions(req, res): Promise<void>
  getMyReferralLink(req, res): Promise<void>
  getMyClicks(req, res): Promise<void>
  getMyConversions(req, res): Promise<void>
}
```

#### 2. Admin Affiliate Controller (`src/api/controllers/admin-affiliate.controller.ts`)

```typescript
class AdminAffiliateController {
  getAllAffiliates(req, res): Promise<void>
  getAffiliateById(req, res): Promise<void>
  updateAffiliateStatus(req, res): Promise<void>
  getAffiliateNetwork(req, res): Promise<void>
  getAffiliateStats(req, res): Promise<void>
  exportAffiliates(req, res): Promise<void>
}
```



#### 3. Commission Controller (`src/api/controllers/commission.controller.ts`)

```typescript
class CommissionController {
  // Admin
  getAllCommissions(req, res): Promise<void>
  getCommissionById(req, res): Promise<void>
  getCommissionStats(req, res): Promise<void>
  recalculateCommission(req, res): Promise<void>
}
```

#### 4. Withdrawal Controller (`src/api/controllers/withdrawal.controller.ts`)

```typescript
class WithdrawalController {
  // Admin
  getAllWithdrawals(req, res): Promise<void>
  approveWithdrawal(req, res): Promise<void>
  rejectWithdrawal(req, res): Promise<void>
  getWithdrawalStats(req, res): Promise<void>
}
```

### Service Layer Components

#### 1. Affiliate Service (`src/services/affiliates/affiliate.service.ts`)

```typescript
class AffiliateService {
  // Cadastro
  register(data: AffiliateRegistrationData): Promise<Affiliate>
  validateWalletId(walletId: string): Promise<ValidationResult>
  generateReferralCode(): string
  
  // Consultas
  getById(id: string): Promise<Affiliate>
  getByUserId(userId: string): Promise<Affiliate>
  getByReferralCode(code: string): Promise<Affiliate>
  
  // Rede
  getNetwork(affiliateId: string): Promise<NetworkData>
  getUpline(affiliateId: string): Promise<UplineData>
  getDownline(affiliateId: string): Promise<Affiliate[]>
  
  // Métricas
  getStats(affiliateId: string): Promise<AffiliateStats>
  getClicks(affiliateId: string, filters): Promise<ClickData[]>
  getConversions(affiliateId: string, filters): Promise<ConversionData[]>
}
```

#### 2. Commission Service (`src/services/affiliates/commission.service.ts`)

```typescript
class CommissionService {
  // Consultas
  getByAffiliateId(affiliateId: string, filters): Promise<Commission[]>
  getById(id: string): Promise<Commission>
  getStats(filters): Promise<CommissionStats>
  
  // Cálculo (já existe, apenas validar)
  calculate(orderId: string): Promise<CommissionResult>
  
  // Administração
  recalculate(commissionId: string): Promise<Commission>
  markAsPaid(commissionId: string): Promise<void>
}
```



#### 3. Withdrawal Service (`src/services/affiliates/withdrawal.service.ts`)

```typescript
class WithdrawalService {
  // Consultas
  getAll(filters): Promise<Withdrawal[]>
  getById(id: string): Promise<Withdrawal>
  getByAffiliateId(affiliateId: string): Promise<Withdrawal[]>
  
  // Operações
  create(affiliateId: string, amount: number): Promise<Withdrawal>
  approve(id: string, adminId: string): Promise<Withdrawal>
  reject(id: string, adminId: string, reason: string): Promise<Withdrawal>
  
  // Validações
  validateBalance(affiliateId: string, amount: number): Promise<boolean>
}
```

### Frontend Components a Atualizar

#### 1. Páginas Admin

**ListaAfiliados.tsx** - Remover mock, integrar com API
```typescript
// Antes (mock)
const afiliados = mockAfiliadosAdmin;

// Depois (real)
const { data: afiliados, loading, error } = useAdminAffiliates();
```

**GestaoComissoes.tsx** - Remover mock, integrar com API
```typescript
// Antes (mock)
const comissoes = mockComissoesAdmin;

// Depois (real)
const { data: comissoes, loading } = useAdminCommissions();
```

**GestaoSaques.tsx** - Remover mock, integrar com API
```typescript
// Antes (mock)
const saques = mockSaques;

// Depois (real)
const { data: saques, loading } = useAdminWithdrawals();
```

**Dashboard.tsx** - Remover mock de conversas e vendas
```typescript
// Antes (mock)
const conversas = mockConversas;
const vendas = mockVendas;

// Depois (real)
const { data: conversas } = useConversations();
const { data: vendas } = useSales();
```

#### 2. Páginas Afiliado

**Comissoes.tsx** - Remover mock, integrar com API
```typescript
// Antes (mock)
const comissoes = mockComissoes;

// Depois (real)
const { data: comissoes, loading } = useMyCommissions();
```

**MinhaRede.tsx** - Integrar com API real
```typescript
const { data: network, loading } = useMyNetwork();
```



### Hooks Customizados a Criar

```typescript
// src/hooks/useAdminAffiliates.ts
function useAdminAffiliates(filters?: AffiliateFilters) {
  return useQuery(['admin-affiliates', filters], () => 
    affiliateService.getAllAffiliates(filters)
  );
}

// src/hooks/useAdminCommissions.ts
function useAdminCommissions(filters?: CommissionFilters) {
  return useQuery(['admin-commissions', filters], () =>
    commissionService.getAll(filters)
  );
}

// src/hooks/useAdminWithdrawals.ts
function useAdminWithdrawals(filters?: WithdrawalFilters) {
  return useQuery(['admin-withdrawals', filters], () =>
    withdrawalService.getAll(filters)
  );
}

// src/hooks/useMyCommissions.ts
function useMyCommissions() {
  return useQuery(['my-commissions'], () =>
    affiliateService.getMyCommissions()
  );
}

// src/hooks/useMyNetwork.ts
function useMyNetwork() {
  return useQuery(['my-network'], () =>
    affiliateService.getMyNetwork()
  );
}
```

## Data Models

### Affiliate (já existe no banco)

```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  referral_code VARCHAR(6) UNIQUE NOT NULL,
  referred_by UUID REFERENCES affiliates(id),
  wallet_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commissions_cents BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### Commission (já existe no banco)

```sql
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  affiliate_id UUID REFERENCES affiliates(id) NOT NULL,
  level INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  commission_value_cents BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'calculated',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Withdrawal (precisa criar)

```sql
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) NOT NULL,
  amount_cents BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  pix_key VARCHAR(255) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```



### RLS Policies (já existem, validar)

```sql
-- Affiliates: ver apenas próprios dados
CREATE POLICY "Affiliates view own data"
  ON affiliates FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Commissions: ver apenas próprias comissões
CREATE POLICY "Affiliates view own commissions"
  ON commissions FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid()
    )
  );

-- Admins veem tudo
CREATE POLICY "Admins view all"
  ON affiliates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Empty State Display
*For any* page that displays data, when the data array is empty, the system should display an appropriate empty state component with helpful messaging.
**Validates: Requirements 2.5**

### Property 2: API Validation Completeness
*For any* POST /api/affiliates request, the system should validate all required fields (name, email, phone, cpf_cnpj, wallet_id) and reject invalid data with status 400.
**Validates: Requirements 3.1**

### Property 3: Wallet Validation Integration
*For any* affiliate registration, the system should call the Asaas API to validate the wallet_id before creating the affiliate record.
**Validates: Requirements 3.2**

### Property 4: Referral Code Linking
*For any* affiliate registration with a valid referral code, the system should correctly link the new affiliate to the referring affiliate in the genealogical tree.
**Validates: Requirements 3.3**

### Property 5: Referral Code Generation
*For any* newly created affiliate, the system should generate a unique 6-character alphanumeric referral code.
**Validates: Requirements 3.4**

### Property 6: Database Consistency on Registration
*For any* successful affiliate registration, the system should create a record in `affiliates` table AND update `profiles.is_affiliate = true` atomically.
**Validates: Requirements 3.5**



### Property 7: Affiliate Data Isolation (RLS)
*For any* affiliate user, when querying their own data via GET /api/affiliates/me/*, the system should return only their own data and never expose other affiliates' data.
**Validates: Requirements 4.5**

### Property 8: Admin-Only Access
*For any* non-admin user attempting to access /api/admin/* routes, the system should return status 403 Forbidden.
**Validates: Requirements 5.5**

### Property 9: Commission Split Completeness
*For any* commission record, the system should include complete split details showing N1, N2, N3, and manager percentages.
**Validates: Requirements 6.4**

### Property 10: Commission Status Presence
*For any* commission record, the system should have a valid status field (pending, paid, or error).
**Validates: Requirements 6.5**

### Property 11: Withdrawal Balance Validation
*For any* withdrawal approval request, the system should validate that the affiliate has sufficient available balance before approving.
**Validates: Requirements 7.4**

### Property 12: Withdrawal Audit Logging
*For any* withdrawal operation (create, approve, reject), the system should create an audit log entry with user_id, timestamp, and operation details.
**Validates: Requirements 7.5**

### Property 13: RLS Policy Enforcement - Affiliates
*For any* affiliate user querying the `affiliates` table, RLS policies should ensure they can only see their own record.
**Validates: Requirements 10.1**

### Property 14: RLS Policy Enforcement - Commissions
*For any* affiliate user querying the `commissions` table, RLS policies should ensure they can only see their own commissions.
**Validates: Requirements 10.2**

### Property 15: RLS Policy Enforcement - Customers
*For any* vendedor user querying the `customers` table, RLS policies should ensure they can only see customers assigned to them.
**Validates: Requirements 10.3**

### Property 16: Admin Full Access
*For any* admin user, RLS policies should allow access to all records in all tables.
**Validates: Requirements 10.4**

### Property 17: Error Handling Consistency
*For any* API error response, the system should return errors in the format `{ error: string, details?: any }`.
**Validates: Requirements 16.1**



### Property 18: HTTP Status Codes - Validation
*For any* API request with invalid data, the system should return HTTP status 400 with validation details.
**Validates: Requirements 16.2**

### Property 19: HTTP Status Codes - Not Found
*For any* API request for a non-existent resource, the system should return HTTP status 404.
**Validates: Requirements 16.3**

### Property 20: HTTP Status Codes - Forbidden
*For any* API request without proper permissions, the system should return HTTP status 403.
**Validates: Requirements 16.4**

### Property 21: HTTP Status Codes - Internal Error
*For any* internal server error, the system should log the error details and return HTTP status 500 with a generic message.
**Validates: Requirements 16.5**

### Property 22: Pagination Consistency
*For any* list endpoint, the system should implement pagination with a default limit of 100 records.
**Validates: Requirements 17.3**

### Property 23: Wallet ID Format Validation
*For any* wallet_id input, the system should validate it matches the regex pattern `/^wal_[a-zA-Z0-9]{20}$/`.
**Validates: Requirements 14.1**

### Property 24: Email Format Validation
*For any* email input, the system should validate it conforms to RFC 5322 standard format.
**Validates: Requirements 14.2**

### Property 25: Phone Format Validation
*For any* phone input, the system should validate it conforms to E.164 international format.
**Validates: Requirements 14.3**

### Property 26: CPF/CNPJ Validation
*For any* CPF or CNPJ input, the system should validate it using the official Brazilian algorithm including check digits.
**Validates: Requirements 14.4**

### Property 27: Audit Log Completeness
*For any* audit log entry, the system should include user_id, timestamp, operation type, and relevant details.
**Validates: Requirements 15.4**

### Property 28: Loading State Display
*For any* data fetching operation, the system should display a loading indicator (skeleton or spinner) until data is loaded or an error occurs.
**Validates: Requirements 13.1**

### Property 29: Error Message Display
*For any* failed operation, the system should display a user-friendly error message explaining what went wrong.
**Validates: Requirements 13.2**

### Property 30: Success Feedback
*For any* successful operation, the system should display a toast notification confirming the action.
**Validates: Requirements 13.3**



## Error Handling

### Error Response Format

All API errors follow consistent format:

```typescript
interface ErrorResponse {
  error: string;           // Human-readable error message
  code?: string;           // Error code for programmatic handling
  details?: any;           // Additional context (validation errors, etc)
  timestamp: string;       // ISO 8601 timestamp
}
```

### HTTP Status Codes

- **200 OK**: Successful GET/PUT/DELETE
- **201 Created**: Successful POST
- **400 Bad Request**: Validation errors, invalid input
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Duplicate resource (e.g., email already exists)
- **500 Internal Server Error**: Unexpected server error

### Frontend Error Handling

```typescript
try {
  const data = await affiliateService.register(formData);
  toast.success('Afiliado cadastrado com sucesso!');
  navigate('/afiliados/dashboard');
} catch (error) {
  if (error.response?.status === 400) {
    // Validation errors
    setErrors(error.response.data.details);
  } else if (error.response?.status === 409) {
    // Duplicate
    toast.error('Email já cadastrado');
  } else {
    // Generic error
    toast.error('Erro ao cadastrar afiliado. Tente novamente.');
  }
}
```

## Testing Strategy

### Unit Tests

**Backend Services:**
- AffiliateService: registration, validation, queries
- CommissionService: calculations, queries
- WithdrawalService: operations, validations

**Frontend Services:**
- affiliate-frontend.service.ts: API calls, error handling
- commission-frontend.service.ts: API calls
- withdrawal-frontend.service.ts: API calls

**Utilities:**
- Validation functions (CPF, CNPJ, email, phone)
- Referral code generation
- Error formatting

### Integration Tests

**API Endpoints:**
- POST /api/affiliates (registration flow)
- GET /api/affiliates/me/* (affiliate queries)
- GET /api/admin/affiliates/* (admin queries)
- POST /api/admin/withdrawals/:id/approve (withdrawal approval)

**Authentication & Authorization:**
- RLS policies enforcement
- Role-based access control
- Token validation

### Property-Based Tests

**Property 1: Empty State Display**
- Generate random empty data arrays
- Verify empty state component renders

**Property 2-6: Affiliate Registration**
- Generate random valid/invalid affiliate data
- Verify validation, wallet check, code generation

**Property 7-16: Security & RLS**
- Generate random user contexts
- Verify data isolation and access control

**Property 17-21: Error Handling**
- Generate various error scenarios
- Verify consistent error format and status codes

**Property 22-30: Validation & UI**
- Generate random inputs
- Verify validation rules and UI feedback



### End-to-End Tests

**Critical User Flows:**
1. Admin login → View affiliates list (real data)
2. Admin login → View commissions (real data)
3. Admin login → Approve withdrawal
4. Affiliate login → View dashboard (real data)
5. Affiliate login → View commissions
6. Affiliate registration → Wallet validation → Success

### Test Coverage Goals

- **Unit Tests:** 80% coverage on services and utilities
- **Integration Tests:** All API endpoints
- **Property Tests:** All 30 correctness properties
- **E2E Tests:** 6 critical user flows

## Implementation Strategy

### Phase 1: Backend Foundation (Days 1-3)

**Priority: CRITICAL**

1. Create backend structure
   - Controllers (affiliate, commission, withdrawal)
   - Services (affiliate, commission, withdrawal)
   - Validators (Zod schemas)
   - Routes

2. Implement core affiliate endpoints
   - POST /api/affiliates (registration)
   - GET /api/affiliates/me/* (queries)
   - Wallet validation integration

3. Implement admin endpoints
   - GET /api/admin/affiliates
   - GET /api/admin/commissions
   - GET /api/admin/withdrawals

4. Test backend thoroughly
   - Unit tests for services
   - Integration tests for endpoints
   - RLS policy validation

### Phase 2: Frontend Integration (Days 4-5)

**Priority: HIGH**

1. Remove mock data imports
   - Delete mockData.ts references
   - Update all affected pages

2. Integrate admin pages
   - ListaAfiliados.tsx → use real API
   - GestaoComissoes.tsx → use real API
   - GestaoSaques.tsx → use real API
   - Dashboard.tsx → use real metrics

3. Integrate affiliate pages
   - Comissoes.tsx → use real API
   - MinhaRede.tsx → use real API
   - Dashboard → use real metrics

4. Implement UI states
   - Loading skeletons
   - Error messages
   - Empty states
   - Success toasts

### Phase 3: Redirection Fix (Day 6)

**Priority: HIGH**

1. Update AuthContext
   - Enhance login flow
   - Add role-based redirect logic

2. Update AuthRedirect component
   - Use getDashboardByRole utility
   - Handle all role types

3. Test all redirect scenarios
   - Admin → /dashboard
   - Vendedor → /dashboard
   - Afiliado → /afiliados/dashboard
   - Cliente → /minha-conta

### Phase 4: CRM Validation (Day 7)

**Priority: MEDIUM**

1. Run database validation script
   - Check table structure
   - Verify foreign keys
   - Validate indexes

2. Execute corrections if needed
   - Run fix_crm_tables.sql
   - Verify data integrity

3. Test CRM functionality
   - Customer queries
   - Conversation queries
   - Timeline functionality



### Phase 5: RLS & Security (Day 8)

**Priority: CRITICAL**

1. Validate existing RLS policies
   - Affiliates table
   - Commissions table
   - Customers table

2. Create missing policies
   - Withdrawals table
   - Admin access policies

3. Test security thoroughly
   - Attempt unauthorized access
   - Verify data isolation
   - Test admin override

### Phase 6: Testing & Validation (Days 9-10)

**Priority: HIGH**

1. Run full test suite
   - Unit tests
   - Integration tests
   - Property tests
   - E2E tests

2. Manual testing
   - Test all user flows
   - Verify no mock data
   - Check redirects
   - Validate security

3. Performance testing
   - Query optimization
   - Load testing
   - Response time validation

4. Production validation
   - Smoke tests
   - Monitoring setup
   - Rollback plan ready

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] No mock data imports in production code
- [ ] RLS policies validated
- [ ] API documentation updated
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Rollback plan documented

### Deployment Steps

1. **Database Migration**
   ```bash
   # Create withdrawals table
   supabase db push
   
   # Verify RLS policies
   supabase db check
   ```

2. **Backend Deployment**
   ```bash
   # Deploy to Vercel/production
   npm run build
   vercel --prod
   ```

3. **Smoke Tests**
   - Test affiliate registration
   - Test admin dashboard
   - Test affiliate dashboard
   - Test redirects

4. **Monitoring**
   - Check error logs
   - Monitor API response times
   - Verify database queries
   - Watch for RLS violations

### Rollback Plan

If critical issues are found:

1. **Immediate Actions**
   - Revert to previous deployment
   - Restore database if needed
   - Notify team

2. **Investigation**
   - Collect error logs
   - Identify root cause
   - Document issue

3. **Fix & Redeploy**
   - Fix identified issues
   - Re-run full test suite
   - Deploy with extra monitoring



## Risk Mitigation

### High-Risk Areas

**1. Data Loss Risk**
- **Risk:** Removing mock data might break pages
- **Mitigation:** Implement empty states, test thoroughly
- **Rollback:** Keep mock data in separate branch

**2. Security Risk**
- **Risk:** RLS policies might have gaps
- **Mitigation:** Comprehensive security testing
- **Rollback:** Disable public access if breach detected

**3. Performance Risk**
- **Risk:** Real queries might be slow
- **Mitigation:** Add indexes, implement caching
- **Rollback:** Add query limits, optimize later

**4. Integration Risk**
- **Risk:** Frontend-backend mismatch
- **Mitigation:** Contract testing, API documentation
- **Rollback:** Feature flags to disable new endpoints

### Monitoring & Alerts

**Critical Metrics:**
- API response time (< 2s for 95th percentile)
- Error rate (< 1% of requests)
- RLS policy violations (0 expected)
- Failed authentications (monitor for attacks)

**Alert Thresholds:**
- Response time > 5s: WARNING
- Error rate > 5%: CRITICAL
- RLS violation detected: CRITICAL
- Failed auth > 10/min: WARNING

## Success Criteria

### Functional Requirements

- [ ] All mock data removed from production pages
- [ ] Affiliate registration working with Asaas validation
- [ ] Admin can view real affiliates, commissions, withdrawals
- [ ] Affiliates can view their real data and network
- [ ] Redirects work correctly for all user roles
- [ ] CRM structure validated and corrected
- [ ] RLS policies enforced correctly

### Non-Functional Requirements

- [ ] API response time < 2s (95th percentile)
- [ ] Zero RLS policy violations
- [ ] Test coverage > 70%
- [ ] Zero critical bugs in production
- [ ] All endpoints documented
- [ ] Monitoring and alerts configured

### Business Impact

- [ ] Affiliate program operational
- [ ] Admin can make data-driven decisions
- [ ] User experience improved (no broken redirects)
- [ ] System security validated
- [ ] Foundation for future features solid

## Dependencies

### External Services

- **Asaas API:** Wallet validation
- **Supabase:** Database, Auth, RLS
- **Vercel:** Hosting and deployment

### Internal Dependencies

- **Sprint 3 (Vendas):** Order and payment data
- **Sprint 4 (Afiliados):** Database schema already created
- **Sprint 5 (CRM):** Customer data structure

### Team Dependencies

- **Backend Developer:** API implementation
- **Frontend Developer:** UI integration
- **DevOps:** Deployment and monitoring
- **QA:** Testing and validation

## Timeline

**Total Duration:** 10 days

- **Days 1-3:** Backend implementation
- **Days 4-5:** Frontend integration
- **Day 6:** Redirection fix
- **Day 7:** CRM validation
- **Day 8:** Security & RLS
- **Days 9-10:** Testing & deployment

**Critical Path:**
Backend → Frontend → Testing → Deployment

**Buffer:** 2 days for unexpected issues

## Conclusion

This sprint addresses critical system issues that prevent the Slim Quality platform from functioning correctly in production. By removing mock data, implementing missing backend functionality, and fixing broken user flows, we establish a solid foundation for the affiliate program and future development.

The phased approach ensures minimal disruption while maintaining high quality standards. Comprehensive testing and monitoring provide confidence in the deployment, with clear rollback procedures if issues arise.

**Success of this sprint is measured by:**
1. Zero mock data in production
2. Functional affiliate program
3. Correct user redirects
4. Validated security policies
5. Improved system reliability

