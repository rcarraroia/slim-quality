# Design Document - ETAPA 1: Base de Dados e Tipos de Afiliados

## Overview

Este documento especifica o design técnico para implementação da ETAPA 1 do sistema de diferenciação de perfis de afiliados. A solução cria a fundação estrutural necessária para suportar dois tipos distintos de afiliados: Individual (pessoa física revendedora) e Logista (loja física parceira).

### Objetivos

1. Adicionar suporte a dois tipos de afiliados no banco de dados
2. Implementar sistema de status financeiro para controlar acesso a funcionalidades
3. Criar categoria Show Row para produtos exclusivos de Logistas (preparação para ETAPA 3)
4. Implementar validação robusta de CPF e CNPJ
5. Atualizar formulário de cadastro e API para suportar novos campos
6. Garantir zero breaking changes no sistema existente

### Escopo

**Incluído nesta ETAPA:**
- ✅ Alterações de schema do banco de dados (ENUMs, colunas, índices)
- ✅ Migration de dados existentes (23 afiliados)
- ✅ Parser e validador de CPF/CNPJ com round-trip property
- ✅ Atualização da API de cadastro (Serverless Function)
- ✅ Atualização do formulário de cadastro (React)
- ✅ Restrições de funcionalidades para status pendente

**Não incluído (ETAPAs futuras):**
- ❌ Configuração de wallet (ETAPA 2)
- ❌ Produtos Show Row (ETAPA 3)
- ❌ Perfil de loja e vitrine (ETAPA 4)
- ❌ Sistema de monetização (ETAPA 5)


## Architecture

### System Context

O sistema Slim Quality utiliza uma arquitetura moderna baseada em:

**Frontend:** React/Vite + TypeScript
- Componentes UI: shadcn/ui
- State management: React hooks
- Validação: Zod schemas
- Localização: `/src`

**Backend:** Vercel Serverless Functions (JavaScript/ESM)
- Padrão: Cada arquivo em `/api` é uma função independente
- Roteamento: Via query parameter `action`
- Autenticação: Supabase Auth (JWT)
- Referência: `api/affiliates.js`

**Database:** Supabase PostgreSQL
- Project ID: vtynmmtuvxreiwcxxlma
- Tabela principal: `affiliates` (23 registros existentes)
- Segurança: Row Level Security (RLS)
- Migrations: SQL scripts em `supabase/migrations/`

### Architectural Decisions

**AD-1: Usar campos existentes `document` e `document_type`**
- Decisão: Reutilizar campos existentes ao invés de criar novos
- Razão: Evitar duplicação e manter compatibilidade
- Impacto: Zero breaking changes para afiliados existentes

**AD-2: ENUMs para tipos e status**
- Decisão: Usar PostgreSQL ENUMs ao invés de strings livres
- Razão: Garantir integridade de dados e performance
- Impacto: Validação no nível do banco de dados

**AD-3: Valores padrão para novos campos**
- Decisão: `affiliate_type='individual'` e `financial_status='financeiro_pendente'`
- Razão: Garantir compatibilidade com sistema existente
- Impacto: Afiliados existentes continuam funcionando

**AD-4: Validação em múltiplas camadas**
- Decisão: Validar em frontend, API e banco de dados
- Razão: Segurança em profundidade
- Impacto: Melhor UX e maior segurança

**AD-5: Parser/Formatter como funções puras**
- Decisão: Implementar como funções puras com round-trip property
- Razão: Testabilidade e confiabilidade
- Impacto: Código mais robusto e testável


## Components and Interfaces

### Database Schema Changes

#### 1. ENUM Types

```sql
-- Tipo de afiliado
CREATE TYPE affiliate_type AS ENUM ('individual', 'logista');

-- Status financeiro
CREATE TYPE financial_status AS ENUM ('financeiro_pendente', 'ativo');

-- Extensão de product_category (já existe)
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'show_row';
```

#### 2. Table: affiliates

**Novas colunas:**

```sql
ALTER TABLE affiliates 
  ADD COLUMN affiliate_type affiliate_type DEFAULT 'individual' NOT NULL,
  ADD COLUMN financial_status financial_status DEFAULT 'financeiro_pendente' NOT NULL;
```

**Índices:**

```sql
CREATE INDEX idx_affiliates_affiliate_type ON affiliates(affiliate_type);
CREATE INDEX idx_affiliates_financial_status ON affiliates(financial_status);
CREATE INDEX idx_affiliates_type_status ON affiliates(affiliate_type, financial_status);
```

**Schema completo após alterações:**

```typescript
interface Affiliate {
  // Campos existentes
  id: string; // uuid
  user_id: string; // uuid, FK auth.users
  name: string;
  email: string;
  phone: string;
  document: string; // CPF ou CNPJ (apenas números)
  document_type: 'CPF' | 'CNPJ';
  referral_code: string;
  wallet_id: string | null;
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'rejected';
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  deleted_at: string | null; // timestamptz
  
  // Novos campos (ETAPA 1)
  affiliate_type: 'individual' | 'logista';
  financial_status: 'financeiro_pendente' | 'ativo';
}
```

### API Endpoints

#### Endpoint: POST /api/affiliates?action=register

**Request:**

```typescript
interface RegisterAffiliateRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  affiliate_type: 'individual' | 'logista';
  document: string; // CPF (11 dígitos) ou CNPJ (14 dígitos)
  referral_code?: string; // Código de quem indicou (opcional)
}
```

**Response (Success - 201):**

```typescript
interface RegisterAffiliateResponse {
  success: true;
  data: {
    id: string;
    name: string;
    email: string;
    affiliate_type: 'individual' | 'logista';
    financial_status: 'financeiro_pendente';
    referral_code: string;
    message: string; // "Cadastro realizado com sucesso"
  };
}
```

**Response (Error - 400):**

```typescript
interface RegisterAffiliateError {
  success: false;
  error: string; // Mensagem descritiva
  field?: string; // Campo que causou o erro
}
```

**Validações:**

1. `affiliate_type` deve ser 'individual' ou 'logista'
2. Se `affiliate_type='individual'`: `document` deve ter 11 dígitos (CPF)
3. Se `affiliate_type='logista'`: `document` deve ter 14 dígitos (CNPJ) e não pode estar vazio
4. `document` deve passar na validação de dígitos verificadores
5. `document` deve ser único no banco
6. `email` deve ser único no banco


### Frontend Components

#### 1. CadastroAfiliado.tsx (Atualização)

**Localização:** `src/pages/auth/CadastroAfiliado.tsx`

**Novos campos:**

```typescript
interface CadastroAfiliadoForm {
  // Campos existentes
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  referralCode?: string;
  
  // Novos campos (ETAPA 1)
  affiliateType: 'individual' | 'logista';
  document: string; // CPF ou CNPJ
}
```

**Comportamento:**

1. Campo de seleção "Tipo de Afiliado" com opções:
   - "Individual (Pessoa Física)" → value: 'individual'
   - "Logista (Loja Física)" → value: 'logista'

2. Campo de documento condicional:
   - Se `affiliateType='individual'`: Label "CPF", máscara "XXX.XXX.XXX-XX"
   - Se `affiliateType='logista'`: Label "CNPJ", máscara "XX.XXX.XXX/XXXX-XX"

3. Validação client-side:
   - CPF: 11 dígitos, validar dígitos verificadores
   - CNPJ: 14 dígitos, validar dígitos verificadores, obrigatório para logista

#### 2. AffiliateStatusBanner.tsx (Novo)

**Localização:** `src/components/affiliates/AffiliateStatusBanner.tsx`

**Propósito:** Exibir banner de alerta para afiliados com status financeiro pendente

```typescript
interface AffiliateStatusBannerProps {
  financialStatus: 'financeiro_pendente' | 'ativo';
  onConfigureWallet?: () => void;
}
```

**Comportamento:**

- Se `financialStatus='financeiro_pendente'`:
  - Exibir banner amarelo com ícone de alerta
  - Mensagem: "Configure sua carteira digital para começar a receber comissões"
  - Botão: "Configurar Wallet" (desabilitado na ETAPA 1, funcional na ETAPA 2)

- Se `financialStatus='ativo'`:
  - Não exibir nada

### Utility Functions

#### 1. Document Parser/Validator

**Localização:** `src/utils/validators.ts`

```typescript
/**
 * Remove caracteres não numéricos de CPF/CNPJ
 */
export function parseDocument(document: string): string {
  return document.replace(/\D/g, '');
}

/**
 * Valida CPF (11 dígitos)
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = parseDocument(cpf);
  
  // Deve ter 11 dígitos
  if (cleaned.length !== 11) return false;
  
  // Rejeitar CPFs com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validar dígitos verificadores
  return validateCPFCheckDigits(cleaned);
}

/**
 * Valida CNPJ (14 dígitos)
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = parseDocument(cnpj);
  
  // Deve ter 14 dígitos
  if (cleaned.length !== 14) return false;
  
  // Rejeitar CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Validar dígitos verificadores
  return validateCNPJCheckDigits(cleaned);
}

/**
 * Formata CPF no padrão XXX.XXX.XXX-XX
 */
export function formatCPF(cpf: string): string {
  const cleaned = parseDocument(cpf);
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ no padrão XX.XXX.XXX/XXXX-XX
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = parseDocument(cnpj);
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}
```


## Data Models

### Affiliate Type Enum

```typescript
enum AffiliateType {
  INDIVIDUAL = 'individual', // Pessoa física revendedora
  LOGISTA = 'logista'        // Loja física parceira
}
```

**Regras de negócio:**

- `individual`: Usa CPF (11 dígitos), pode vender todos os produtos atuais
- `logista`: Usa CNPJ (14 dígitos), futuramente terá acesso a produtos Show Row

### Financial Status Enum

```typescript
enum FinancialStatus {
  PENDENTE = 'financeiro_pendente', // Wallet não configurada
  ATIVO = 'ativo'                   // Wallet configurada e validada
}
```

**Regras de negócio:**

- `financeiro_pendente`: 
  - Não pode receber comissões
  - Não pode gerar link de indicação
  - Deve ver banner orientando configuração de wallet
  
- `ativo`:
  - Pode receber comissões
  - Pode gerar link de indicação
  - Acesso completo a todas as funcionalidades

**Transições de estado:**

```
financeiro_pendente → ativo (quando wallet é configurada e validada)
```

Nota: A transição de `financeiro_pendente` para `ativo` será implementada na ETAPA 2.

### Product Category Enum (Extensão)

```typescript
enum ProductCategory {
  COLCHAO = 'colchao',                 // Existente
  FERRAMENTA_IA = 'ferramenta_ia',     // Existente
  SERVICO_DIGITAL = 'servico_digital', // Existente
  SHOW_ROW = 'show_row'                // Novo (ETAPA 1)
}
```

**Regras de negócio:**

- `show_row`: Categoria preparatória para produtos exclusivos de Logistas
- Produtos Show Row serão criados na ETAPA 3
- Por enquanto, apenas adicionar o valor ao ENUM

### Document Validation Rules

#### CPF (11 dígitos)

**Formato:** XXX.XXX.XXX-XX (apenas números no banco)

**Validação:**

1. Remover caracteres não numéricos
2. Verificar se tem exatamente 11 dígitos
3. Rejeitar se todos os dígitos forem iguais (ex: 111.111.111-11)
4. Calcular e validar primeiro dígito verificador
5. Calcular e validar segundo dígito verificador

**Algoritmo de validação:**

```
Dígito 1:
- Multiplicar os 9 primeiros dígitos por 10, 9, 8, 7, 6, 5, 4, 3, 2
- Somar os resultados
- Calcular resto da divisão por 11
- Se resto < 2, dígito = 0; senão, dígito = 11 - resto

Dígito 2:
- Multiplicar os 10 primeiros dígitos por 11, 10, 9, 8, 7, 6, 5, 4, 3, 2
- Somar os resultados
- Calcular resto da divisão por 11
- Se resto < 2, dígito = 0; senão, dígito = 11 - resto
```

#### CNPJ (14 dígitos)

**Formato:** XX.XXX.XXX/XXXX-XX (apenas números no banco)

**Validação:**

1. Remover caracteres não numéricos
2. Verificar se tem exatamente 14 dígitos
3. Rejeitar se todos os dígitos forem iguais (ex: 11.111.111/1111-11)
4. Calcular e validar primeiro dígito verificador
5. Calcular e validar segundo dígito verificador

**Algoritmo de validação:**

```
Dígito 1:
- Multiplicar os 12 primeiros dígitos por 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2
- Somar os resultados
- Calcular resto da divisão por 11
- Se resto < 2, dígito = 0; senão, dígito = 11 - resto

Dígito 2:
- Multiplicar os 13 primeiros dígitos por 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2
- Somar os resultados
- Calcular resto da divisão por 11
- Se resto < 2, dígito = 0; senão, dígito = 11 - resto
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Document Round-Trip Preservation

*For any* valid CPF or CNPJ, parsing (removing formatting) then formatting (adding formatting) then parsing again should produce an equivalent document.

**Validates: Requirements 10.1, 10.6, 10.7, 10.8**

**Rationale:** This is the most critical property for document handling. It ensures that our parser and formatter are true inverses of each other, guaranteeing data integrity throughout the system.

### Property 2: CPF Validation Correctness

*For any* string with 11 numeric digits, the CPF validator should accept it if and only if the check digits are mathematically correct according to the CPF algorithm.

**Validates: Requirements 10.2, 10.4**

**Rationale:** Ensures that only valid CPFs are accepted, preventing invalid data from entering the system.

### Property 3: CNPJ Validation Correctness

*For any* string with 14 numeric digits, the CNPJ validator should accept it if and only if the check digits are mathematically correct according to the CNPJ algorithm.

**Validates: Requirements 10.3, 10.5**

**Rationale:** Ensures that only valid CNPJs are accepted, preventing invalid data from entering the system.

### Property 4: Document Type Consistency

*For any* affiliate registration, when `affiliate_type` is 'individual', the system should automatically set `document_type` to 'CPF', and when `affiliate_type` is 'logista', the system should automatically set `document_type` to 'CNPJ'.

**Validates: Requirements 4.3, 4.4**

**Rationale:** Ensures consistency between affiliate type and document type, preventing data inconsistencies.

### Property 5: Document Length Validation

*For any* affiliate registration, when `affiliate_type` is 'individual', the system should accept `document` with exactly 11 digits, and when `affiliate_type` is 'logista', the system should accept `document` with exactly 14 digits.

**Validates: Requirements 4.1, 4.2, 7.2, 7.3**

**Rationale:** Ensures that document length matches the expected format for each affiliate type.

### Property 6: Financial Status Default

*For any* newly created affiliate, the `financial_status` should be set to 'financeiro_pendente' by default.

**Validates: Requirements 2.4, 7.6**

**Rationale:** Ensures that all new affiliates start with pending financial status until they configure their wallet.

### Property 7: API Validation Rejection

*For any* invalid affiliate registration request (wrong document length, invalid check digits, or invalid affiliate_type), the API should return HTTP 400 with a descriptive error message.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

**Rationale:** Ensures that the API properly validates input and provides clear feedback on validation failures.

### Property 8: Commission Blocking for Pending Status

*For any* affiliate with `financial_status='financeiro_pendente'`, the system should prevent participation in commission splits and block generation of referral links.

**Validates: Requirements 8.1, 8.2, 8.5**

**Rationale:** Ensures that only affiliates with configured wallets can receive commissions and generate referral links.

### Property 9: Full Functionality for Active Status

*For any* affiliate with `financial_status='ativo'`, the system should allow all affiliate functionalities including commission participation and referral link generation.

**Validates: Requirements 8.4**

**Rationale:** Ensures that active affiliates have full access to all system features.

### Property 10: Form Field Conditional Display

*For any* form state, when `affiliateType='individual'` is selected, the form should display a CPF field, and when `affiliateType='logista'` is selected, the form should display a CNPJ field.

**Validates: Requirements 6.2, 6.3**

**Rationale:** Ensures that the UI adapts correctly based on the selected affiliate type.

### Property 11: Form Validation by Type

*For any* form submission, when `affiliateType='individual'`, the form should validate the document as CPF (11 digits), and when `affiliateType='logista'`, the form should validate the document as CNPJ (14 digits) and require it to be non-empty.

**Validates: Requirements 6.4, 6.5, 6.6**

**Rationale:** Ensures that client-side validation matches the expected document format for each affiliate type.


## Error Handling

### Database Errors

#### 1. Migration Failures

**Scenario:** Migration script fails during execution

**Handling:**
- Use PostgreSQL transactions (BEGIN/COMMIT/ROLLBACK)
- If any step fails, rollback all changes
- Log detailed error message
- Preserve original database state

**Example:**

```sql
BEGIN;
  -- Migration steps here
  -- If any step fails, PostgreSQL automatically rolls back
COMMIT;
```

#### 2. Constraint Violations

**Scenario:** Attempt to insert duplicate document or invalid enum value

**Handling:**
- Database rejects the operation
- API catches the error and returns HTTP 400
- Provide user-friendly error message

**Example errors:**

```typescript
{
  success: false,
  error: "CPF já cadastrado no sistema",
  field: "document"
}

{
  success: false,
  error: "Tipo de afiliado inválido",
  field: "affiliate_type"
}
```

### API Errors

#### 1. Validation Errors (HTTP 400)

**Scenarios:**
- Invalid `affiliate_type` value
- Document length doesn't match type
- Invalid CPF/CNPJ check digits
- Missing required fields
- Duplicate email or document

**Response format:**

```typescript
{
  success: false,
  error: string, // User-friendly message
  field?: string // Field that caused the error
}
```

**Example messages:**

```typescript
"Tipo de afiliado deve ser 'individual' ou 'logista'"
"CPF deve ter 11 dígitos"
"CNPJ deve ter 14 dígitos"
"CNPJ é obrigatório para Logistas"
"CPF inválido - verifique os dígitos"
"CNPJ inválido - verifique os dígitos"
"CPF já cadastrado no sistema"
"Email já cadastrado no sistema"
```

#### 2. Authentication Errors (HTTP 401)

**Scenarios:**
- Missing authorization header
- Invalid JWT token
- Expired token

**Response:**

```typescript
{
  success: false,
  error: "Token de autenticação inválido ou expirado"
}
```

#### 3. Server Errors (HTTP 500)

**Scenarios:**
- Database connection failure
- Unexpected exceptions
- Supabase service unavailable

**Response:**

```typescript
{
  success: false,
  error: "Erro interno do servidor. Tente novamente mais tarde."
}
```

**Logging:**
- Log full error details to console
- Include stack trace for debugging
- Do NOT expose internal details to client

### Frontend Errors

#### 1. Form Validation Errors

**Handling:**
- Display inline error messages below fields
- Highlight invalid fields with red border
- Prevent form submission until all errors are fixed
- Show error summary at top of form if multiple errors

**Example messages:**

```typescript
"CPF deve ter 11 dígitos"
"CNPJ deve ter 14 dígitos"
"CPF inválido"
"CNPJ inválido"
"Este campo é obrigatório"
"Email inválido"
"As senhas não coincidem"
```

#### 2. API Call Errors

**Handling:**
- Show toast notification with error message
- Keep form data filled (don't clear on error)
- Allow user to retry submission
- Log error to console for debugging

**Example:**

```typescript
try {
  const response = await registerAffiliate(formData);
  // Success handling
} catch (error) {
  toast.error(error.message || 'Erro ao cadastrar afiliado');
  console.error('Registration error:', error);
}
```

#### 3. Network Errors

**Handling:**
- Detect network failures
- Show user-friendly message
- Provide retry button
- Cache form data to prevent loss

**Example message:**

```
"Erro de conexão. Verifique sua internet e tente novamente."
```

### Error Recovery Strategies

#### 1. Database Migration Rollback

If migration fails:
1. PostgreSQL automatically rolls back transaction
2. Database returns to previous state
3. Log error details
4. Notify administrator
5. Fix migration script
6. Retry migration

#### 2. Partial Registration Failure

If user creation succeeds but affiliate creation fails:
1. Catch the error
2. Delete the created user (cleanup)
3. Return error to client
4. User can retry registration

#### 3. Duplicate Data Handling

If user tries to register with existing email/document:
1. Check for existing records before insertion
2. Return clear error message
3. Suggest password recovery if email exists
4. Suggest contacting support if document exists


## Testing Strategy

### Dual Testing Approach

This project uses a complementary dual testing strategy:

**Unit Tests:** Verify specific examples, edge cases, and error conditions
**Property Tests:** Verify universal properties across all inputs

Both are necessary for comprehensive coverage. Unit tests catch concrete bugs, while property tests verify general correctness.

### Property-Based Testing

**Library:** fast-check (JavaScript/TypeScript)

**Configuration:**
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `Feature: etapa-1-tipos-afiliados, Property {number}: {property_text}`

**Property Tests to Implement:**

#### 1. Document Round-Trip Property

```typescript
// Feature: etapa-1-tipos-afiliados, Property 1: Document Round-Trip Preservation
test('parse → format → parse preserves document', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.cpf(), // Generator de CPFs válidos
        fc.cnpj()  // Generator de CNPJs válidos
      ),
      (document) => {
        const parsed1 = parseDocument(document);
        const formatted = document.length === 11 
          ? formatCPF(parsed1) 
          : formatCNPJ(parsed1);
        const parsed2 = parseDocument(formatted);
        
        expect(parsed1).toBe(parsed2);
      }
    ),
    { numRuns: 100 }
  );
});
```

#### 2. CPF Validation Property

```typescript
// Feature: etapa-1-tipos-afiliados, Property 2: CPF Validation Correctness
test('validates CPF check digits correctly', () => {
  fc.assert(
    fc.property(
      fc.cpf(), // Generator de CPFs válidos
      (cpf) => {
        expect(validateCPF(cpf)).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});

test('rejects invalid CPF check digits', () => {
  fc.assert(
    fc.property(
      fc.invalidCPF(), // Generator de CPFs inválidos
      (cpf) => {
        expect(validateCPF(cpf)).toBe(false);
      }
    ),
    { numRuns: 100 }
  );
});
```

#### 3. CNPJ Validation Property

```typescript
// Feature: etapa-1-tipos-afiliados, Property 3: CNPJ Validation Correctness
test('validates CNPJ check digits correctly', () => {
  fc.assert(
    fc.property(
      fc.cnpj(), // Generator de CNPJs válidos
      (cnpj) => {
        expect(validateCNPJ(cnpj)).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});

test('rejects invalid CNPJ check digits', () => {
  fc.assert(
    fc.property(
      fc.invalidCNPJ(), // Generator de CNPJs inválidos
      (cnpj) => {
        expect(validateCNPJ(cnpj)).toBe(false);
      }
    ),
    { numRuns: 100 }
  );
});
```

#### 4. Document Type Consistency Property

```typescript
// Feature: etapa-1-tipos-afiliados, Property 4: Document Type Consistency
test('sets document_type based on affiliate_type', () => {
  fc.assert(
    fc.property(
      fc.record({
        affiliate_type: fc.constantFrom('individual', 'logista'),
        document: fc.oneof(fc.cpf(), fc.cnpj())
      }),
      async (data) => {
        const result = await registerAffiliate(data);
        
        if (data.affiliate_type === 'individual') {
          expect(result.document_type).toBe('CPF');
        } else {
          expect(result.document_type).toBe('CNPJ');
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

#### 5. Financial Status Default Property

```typescript
// Feature: etapa-1-tipos-afiliados, Property 6: Financial Status Default
test('new affiliates have pending financial status', () => {
  fc.assert(
    fc.property(
      fc.affiliateRegistrationData(), // Generator de dados válidos
      async (data) => {
        const result = await registerAffiliate(data);
        expect(result.financial_status).toBe('financeiro_pendente');
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Framework:** Vitest

**Focus Areas:**
- Specific examples of valid/invalid documents
- Edge cases (all digits equal, empty strings)
- Error conditions (network failures, database errors)
- Integration points between components

**Unit Tests to Implement:**

#### 1. Document Validation Edge Cases

```typescript
describe('validateCPF', () => {
  test('rejects CPF with all equal digits', () => {
    expect(validateCPF('111.111.111-11')).toBe(false);
    expect(validateCPF('222.222.222-22')).toBe(false);
  });
  
  test('accepts known valid CPF', () => {
    expect(validateCPF('123.456.789-09')).toBe(true);
  });
  
  test('rejects CPF with wrong length', () => {
    expect(validateCPF('123.456.789')).toBe(false);
    expect(validateCPF('123.456.789-099')).toBe(false);
  });
});

describe('validateCNPJ', () => {
  test('rejects CNPJ with all equal digits', () => {
    expect(validateCNPJ('11.111.111/1111-11')).toBe(false);
  });
  
  test('accepts known valid CNPJ', () => {
    expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
  });
  
  test('rejects CNPJ with wrong length', () => {
    expect(validateCNPJ('11.222.333/0001')).toBe(false);
  });
});
```

#### 2. API Validation Tests

```typescript
describe('POST /api/affiliates?action=register', () => {
  test('returns 400 for invalid affiliate_type', async () => {
    const response = await request(app)
      .post('/api/affiliates?action=register')
      .send({ affiliate_type: 'invalid', document: '12345678909' });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
  
  test('returns 400 for individual with CNPJ', async () => {
    const response = await request(app)
      .post('/api/affiliates?action=register')
      .send({ 
        affiliate_type: 'individual', 
        document: '11222333000181' // 14 digits
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('CPF deve ter 11 dígitos');
  });
  
  test('returns 201 for valid registration', async () => {
    const response = await request(app)
      .post('/api/affiliates?action=register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        phone: '11999999999',
        password: 'Test@123',
        affiliate_type: 'individual',
        document: '12345678909'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.financial_status).toBe('financeiro_pendente');
  });
});
```

#### 3. Component Tests

```typescript
describe('CadastroAfiliado', () => {
  test('shows CPF field when individual is selected', () => {
    render(<CadastroAfiliado />);
    
    const typeSelect = screen.getByLabelText('Tipo de Afiliado');
    fireEvent.change(typeSelect, { target: { value: 'individual' } });
    
    expect(screen.getByLabelText('CPF')).toBeInTheDocument();
    expect(screen.queryByLabelText('CNPJ')).not.toBeInTheDocument();
  });
  
  test('shows CNPJ field when logista is selected', () => {
    render(<CadastroAfiliado />);
    
    const typeSelect = screen.getByLabelText('Tipo de Afiliado');
    fireEvent.change(typeSelect, { target: { value: 'logista' } });
    
    expect(screen.getByLabelText('CNPJ')).toBeInTheDocument();
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
  });
  
  test('validates CPF format for individual', async () => {
    render(<CadastroAfiliado />);
    
    const typeSelect = screen.getByLabelText('Tipo de Afiliado');
    fireEvent.change(typeSelect, { target: { value: 'individual' } });
    
    const cpfInput = screen.getByLabelText('CPF');
    fireEvent.change(cpfInput, { target: { value: '123' } });
    fireEvent.blur(cpfInput);
    
    expect(await screen.findByText(/CPF deve ter 11 dígitos/)).toBeInTheDocument();
  });
});
```

### Integration Testing

**Focus:** End-to-end flows

**Tests to Implement:**

1. **Complete Registration Flow:**
   - User fills form → submits → API validates → database saves → success response

2. **Migration Integrity:**
   - Count records before migration → run migration → count after → verify all preserved

3. **Status Restrictions:**
   - Create affiliate with pending status → attempt to generate referral link → verify blocked

### Test Coverage Goals

- **Overall:** > 70%
- **Critical paths:** > 90% (document validation, API endpoints)
- **UI components:** > 60%
- **Utility functions:** > 80%


## Implementation Plan

### Phase 1: Database Foundation (Priority: CRITICAL)

**Tasks:**

1. **Create Migration Script**
   - File: `supabase/migrations/YYYYMMDDHHMMSS_add_affiliate_types.sql`
   - Create ENUMs: `affiliate_type`, `financial_status`
   - Extend ENUM: `product_category` (add 'show_row')
   - Add columns to `affiliates` table
   - Create indexes
   - Update existing records with default values
   - Wrap in transaction (BEGIN/COMMIT)

2. **Test Migration**
   - Backup production database
   - Run migration on staging environment
   - Verify all 23 affiliates have correct default values
   - Verify no data loss
   - Verify indexes created
   - Test rollback if needed

3. **Apply to Production**
   - Schedule maintenance window (if needed)
   - Run migration
   - Verify success
   - Monitor for errors

**Deliverables:**
- ✅ Migration SQL file
- ✅ Migration tested on staging
- ✅ Migration applied to production
- ✅ All existing data preserved

**Estimated Effort:** 2-3 hours

---

### Phase 2: Document Validation (Priority: HIGH)

**Tasks:**

1. **Implement Parser Functions**
   - File: `src/utils/validators.ts`
   - `parseDocument(document: string): string`
   - `formatCPF(cpf: string): string`
   - `formatCNPJ(cnpj: string): string`

2. **Implement Validation Functions**
   - `validateCPF(cpf: string): boolean`
   - `validateCNPJ(cnpj: string): boolean`
   - `validateCPFCheckDigits(cpf: string): boolean` (helper)
   - `validateCNPJCheckDigits(cnpj: string): boolean` (helper)

3. **Write Property Tests**
   - Round-trip property test
   - CPF validation property test
   - CNPJ validation property test
   - Run 100+ iterations per test

4. **Write Unit Tests**
   - Edge cases (all digits equal)
   - Known valid/invalid documents
   - Wrong length documents
   - Empty strings

**Deliverables:**
- ✅ Validator functions implemented
- ✅ Property tests passing (100+ runs)
- ✅ Unit tests passing
- ✅ Code coverage > 80%

**Estimated Effort:** 3-4 hours

---

### Phase 3: API Update (Priority: HIGH)

**Tasks:**

1. **Add Registration Action to API**
   - File: `api/affiliates.js`
   - Add case 'register' to switch statement
   - Implement `handleRegister(req, res, supabase)` function

2. **Implement Validation Logic**
   - Validate `affiliate_type` field
   - Validate document length based on type
   - Validate document check digits
   - Check for duplicate email/document

3. **Implement Registration Logic**
   - Create user in Supabase Auth
   - Create affiliate record with correct fields
   - Set `financial_status='financeiro_pendente'`
   - Set `document_type` based on `affiliate_type`
   - Generate unique `referral_code`

4. **Error Handling**
   - Return 400 for validation errors
   - Return 409 for duplicate email/document
   - Return 500 for server errors
   - Provide descriptive error messages

5. **Write API Tests**
   - Test valid registrations
   - Test invalid affiliate_type
   - Test wrong document length
   - Test invalid check digits
   - Test duplicate email/document

**Deliverables:**
- ✅ API endpoint implemented
- ✅ Validation working correctly
- ✅ Error handling comprehensive
- ✅ API tests passing

**Estimated Effort:** 4-5 hours

---

### Phase 4: Frontend Update (Priority: MEDIUM)

**Tasks:**

1. **Update CadastroAfiliado Component**
   - File: `src/pages/auth/CadastroAfiliado.tsx`
   - Add affiliate type selection field
   - Add conditional document field (CPF/CNPJ)
   - Implement client-side validation
   - Add document formatting (masks)
   - Update form submission to include new fields

2. **Create AffiliateStatusBanner Component**
   - File: `src/components/affiliates/AffiliateStatusBanner.tsx`
   - Display warning for pending financial status
   - Show "Configure Wallet" button (disabled for now)
   - Use shadcn/ui Alert component

3. **Update Affiliate Service**
   - File: `src/services/affiliates.service.ts`
   - Add `registerAffiliate()` function
   - Call new API endpoint
   - Handle errors appropriately

4. **Write Component Tests**
   - Test type selection changes document field
   - Test CPF/CNPJ validation
   - Test form submission
   - Test error display

**Deliverables:**
- ✅ Form updated with new fields
- ✅ Client-side validation working
- ✅ Status banner component created
- ✅ Component tests passing

**Estimated Effort:** 5-6 hours

---

### Phase 5: Status Restrictions (Priority: MEDIUM)

**Tasks:**

1. **Update Commission Logic**
   - File: `api/commissions.js` (or relevant file)
   - Check `financial_status` before processing commission
   - Skip affiliates with 'financeiro_pendente' status
   - Log skipped commissions for audit

2. **Update Referral Link Generation**
   - File: `api/affiliates.js` (action=referral-link)
   - Check `financial_status` before generating link
   - Return error if status is 'financeiro_pendente'
   - Provide helpful error message

3. **Update Affiliate Dashboard**
   - File: `src/pages/affiliates/Dashboard.tsx`
   - Add AffiliateStatusBanner at top
   - Disable commission-related features if pending
   - Show explanatory messages

4. **Write Integration Tests**
   - Test commission blocking for pending status
   - Test referral link blocking for pending status
   - Test full access for active status

**Deliverables:**
- ✅ Commission logic updated
- ✅ Referral link logic updated
- ✅ Dashboard updated with restrictions
- ✅ Integration tests passing

**Estimated Effort:** 3-4 hours

---

### Phase 6: Testing & Validation (Priority: HIGH)

**Tasks:**

1. **Run Full Test Suite**
   - Unit tests
   - Property tests
   - Integration tests
   - Component tests

2. **Manual Testing**
   - Test registration flow for both types
   - Test document validation
   - Test status restrictions
   - Test existing affiliate compatibility

3. **Verify Existing Functionality**
   - Existing affiliates can still login
   - Existing commission system works
   - Existing dashboard works
   - No breaking changes

4. **Performance Testing**
   - Verify indexes improve query performance
   - Check API response times
   - Monitor database load

**Deliverables:**
- ✅ All automated tests passing
- ✅ Manual testing completed
- ✅ No regressions found
- ✅ Performance acceptable

**Estimated Effort:** 2-3 hours

---

### Phase 7: Documentation & Deployment (Priority: MEDIUM)

**Tasks:**

1. **Update Documentation**
   - Update API documentation
   - Update database schema documentation
   - Create migration guide
   - Update user guide (if exists)

2. **Prepare Deployment**
   - Review all changes
   - Create deployment checklist
   - Prepare rollback plan
   - Schedule deployment

3. **Deploy to Production**
   - Deploy frontend changes (Vercel auto-deploy)
   - Verify deployment successful
   - Monitor for errors
   - Verify all features working

4. **Post-Deployment Verification**
   - Test registration flow in production
   - Verify existing affiliates unaffected
   - Monitor error logs
   - Check performance metrics

**Deliverables:**
- ✅ Documentation updated
- ✅ Changes deployed to production
- ✅ Post-deployment verification complete
- ✅ No critical issues found

**Estimated Effort:** 2-3 hours

---

### Total Estimated Effort

**Total:** 21-28 hours (approximately 3-4 working days)

**Critical Path:**
1. Database Migration (Phase 1)
2. Document Validation (Phase 2)
3. API Update (Phase 3)
4. Frontend Update (Phase 4)
5. Testing (Phase 6)
6. Deployment (Phase 7)

**Can be done in parallel:**
- Phase 2 and Phase 3 (after Phase 1 complete)
- Phase 5 (after Phase 3 complete)


## Migration Strategy

### Database Migration Script

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_affiliate_types.sql`

```sql
-- Migration: Add Affiliate Types and Financial Status
-- Created: 2025-02-XX
-- Author: Kiro AI
-- Description: Adds support for Individual and Logista affiliate types,
--              financial status tracking, and Show Row product category

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela affiliates existe com 23 registros
--   ✅ Campos document e document_type já existem
--   ✅ ENUM product_category já existe
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Create ENUM Types
-- ============================================

-- Tipo de afiliado
CREATE TYPE affiliate_type AS ENUM ('individual', 'logista');

-- Status financeiro
CREATE TYPE financial_status AS ENUM ('financeiro_pendente', 'ativo');

-- Estender product_category (se ainda não existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'show_row' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'product_category')
  ) THEN
    ALTER TYPE product_category ADD VALUE 'show_row';
  END IF;
END $$;

-- ============================================
-- STEP 2: Add Columns to affiliates Table
-- ============================================

ALTER TABLE affiliates 
  ADD COLUMN affiliate_type affiliate_type DEFAULT 'individual' NOT NULL,
  ADD COLUMN financial_status financial_status DEFAULT 'financeiro_pendente' NOT NULL;

-- ============================================
-- STEP 3: Update Existing Records
-- ============================================

-- Todos os afiliados existentes são Individual com status pendente
UPDATE affiliates 
SET 
  affiliate_type = 'individual',
  financial_status = 'financeiro_pendente'
WHERE affiliate_type IS NULL OR financial_status IS NULL;

-- ============================================
-- STEP 4: Create Indexes
-- ============================================

-- Índice simples para affiliate_type
CREATE INDEX idx_affiliates_affiliate_type 
  ON affiliates(affiliate_type)
  WHERE deleted_at IS NULL;

-- Índice simples para financial_status
CREATE INDEX idx_affiliates_financial_status 
  ON affiliates(financial_status)
  WHERE deleted_at IS NULL;

-- Índice composto para queries que filtram por ambos
CREATE INDEX idx_affiliates_type_status 
  ON affiliates(affiliate_type, financial_status)
  WHERE deleted_at IS NULL;

-- ============================================
-- STEP 5: Add Comments for Documentation
-- ============================================

COMMENT ON COLUMN affiliates.affiliate_type IS 
  'Tipo de afiliado: individual (pessoa física) ou logista (loja física)';

COMMENT ON COLUMN affiliates.financial_status IS 
  'Status financeiro: financeiro_pendente (wallet não configurada) ou ativo (wallet configurada)';

COMMENT ON TYPE affiliate_type IS 
  'Tipos de afiliado no sistema Slim Quality';

COMMENT ON TYPE financial_status IS 
  'Status financeiro do afiliado para controle de comissões';

-- ============================================
-- STEP 6: Verify Data Integrity
-- ============================================

-- Verificar que nenhum registro foi perdido
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM affiliates;
  
  IF record_count < 23 THEN
    RAISE EXCEPTION 'Data loss detected! Expected at least 23 records, found %', record_count;
  END IF;
  
  RAISE NOTICE 'Data integrity verified: % records found', record_count;
END $$;

-- Verificar que todos os registros têm os novos campos preenchidos
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM affiliates 
  WHERE affiliate_type IS NULL OR financial_status IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % records with NULL values in new columns', null_count;
  END IF;
  
  RAISE NOTICE 'All records have valid values for new columns';
END $$;

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (for emergency use)
-- ============================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_affiliates_type_status;
-- DROP INDEX IF EXISTS idx_affiliates_financial_status;
-- DROP INDEX IF EXISTS idx_affiliates_affiliate_type;
-- ALTER TABLE affiliates DROP COLUMN IF EXISTS financial_status;
-- ALTER TABLE affiliates DROP COLUMN IF EXISTS affiliate_type;
-- DROP TYPE IF EXISTS financial_status;
-- DROP TYPE IF EXISTS affiliate_type;
-- COMMIT;
```

### Migration Execution Plan

#### Pre-Migration Checklist

- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify staging has same data structure as production
- [ ] Verify all 23 affiliates exist in staging
- [ ] Run migration on staging
- [ ] Verify no data loss in staging
- [ ] Verify indexes created in staging
- [ ] Test rollback script on staging
- [ ] Document any issues found

#### Migration Execution

1. **Schedule Maintenance Window** (optional)
   - Low-traffic time (e.g., 2 AM - 4 AM)
   - Notify users if needed
   - Prepare rollback plan

2. **Execute Migration**
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or manually via SQL editor
   # Copy and paste migration script
   ```

3. **Verify Success**
   ```sql
   -- Check record count
   SELECT COUNT(*) FROM affiliates;
   -- Should be >= 23
   
   -- Check new columns
   SELECT affiliate_type, financial_status, COUNT(*) 
   FROM affiliates 
   GROUP BY affiliate_type, financial_status;
   -- Should show: individual | financeiro_pendente | 23
   
   -- Check indexes
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'affiliates' 
   AND indexname LIKE 'idx_affiliates_%';
   -- Should show 3 new indexes
   ```

4. **Monitor for Issues**
   - Check Supabase logs
   - Monitor API error rates
   - Verify existing affiliates can login
   - Test new registration flow

#### Post-Migration Verification

- [ ] All 23 existing affiliates preserved
- [ ] All affiliates have `affiliate_type='individual'`
- [ ] All affiliates have `financial_status='financeiro_pendente'`
- [ ] Indexes created successfully
- [ ] No errors in Supabase logs
- [ ] Existing functionality still works
- [ ] New registration flow works

#### Rollback Plan

If migration fails or causes issues:

1. **Immediate Rollback**
   ```sql
   -- Run rollback script (commented at end of migration)
   BEGIN;
   DROP INDEX IF EXISTS idx_affiliates_type_status;
   DROP INDEX IF EXISTS idx_affiliates_financial_status;
   DROP INDEX IF EXISTS idx_affiliates_affiliate_type;
   ALTER TABLE affiliates DROP COLUMN IF EXISTS financial_status;
   ALTER TABLE affiliates DROP COLUMN IF EXISTS affiliate_type;
   DROP TYPE IF EXISTS financial_status;
   DROP TYPE IF EXISTS affiliate_type;
   COMMIT;
   ```

2. **Verify Rollback**
   - Check that columns are removed
   - Check that types are removed
   - Verify existing data intact

3. **Investigate Issue**
   - Review error logs
   - Identify root cause
   - Fix migration script
   - Test on staging again

### Data Migration Validation

**Validation Queries:**

```sql
-- 1. Verify record count
SELECT 
  COUNT(*) as total_affiliates,
  COUNT(*) FILTER (WHERE affiliate_type = 'individual') as individuals,
  COUNT(*) FILTER (WHERE affiliate_type = 'logista') as logistas,
  COUNT(*) FILTER (WHERE financial_status = 'financeiro_pendente') as pending,
  COUNT(*) FILTER (WHERE financial_status = 'ativo') as active
FROM affiliates
WHERE deleted_at IS NULL;

-- Expected: total_affiliates >= 23, individuals = 23, logistas = 0, pending = 23, active = 0

-- 2. Verify no NULL values
SELECT COUNT(*) as null_count
FROM affiliates
WHERE affiliate_type IS NULL OR financial_status IS NULL;

-- Expected: null_count = 0

-- 3. Verify existing fields intact
SELECT 
  COUNT(*) as total,
  COUNT(name) as has_name,
  COUNT(email) as has_email,
  COUNT(document) as has_document
FROM affiliates
WHERE deleted_at IS NULL;

-- Expected: all counts equal

-- 4. Verify indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'affiliates'
AND indexname LIKE 'idx_affiliates_%'
ORDER BY indexname;

-- Expected: 3 new indexes visible
```


## Security Considerations

### Data Validation

**Defense in Depth Strategy:**

1. **Client-Side Validation (First Layer)**
   - Immediate feedback to user
   - Prevents unnecessary API calls
   - Validates format and length
   - NOT trusted for security

2. **API Validation (Second Layer)**
   - Validates all input fields
   - Checks document format and check digits
   - Verifies affiliate_type is valid enum value
   - Trusted layer for security

3. **Database Constraints (Third Layer)**
   - ENUM types enforce valid values
   - NOT NULL constraints prevent missing data
   - UNIQUE constraints prevent duplicates
   - Final layer of protection

### Authentication & Authorization

**Current System (Maintained):**

- Supabase Auth for user authentication
- JWT tokens for API requests
- Row Level Security (RLS) policies on database

**No Changes Required:**

- Existing RLS policies continue to work
- New columns inherit existing security model
- No new permissions needed for ETAPA 1

### Data Privacy

**Document Storage:**

- Documents (CPF/CNPJ) stored without formatting (numbers only)
- No sensitive data exposed in logs
- API errors don't reveal document values
- Frontend masks documents in display

**PII Protection:**

- CPF/CNPJ are considered PII (Personally Identifiable Information)
- Access restricted by RLS policies
- Only affiliate owner can see their own document
- Admins have controlled access via service role

### Input Sanitization

**SQL Injection Prevention:**

- Using Supabase client (parameterized queries)
- No raw SQL with user input
- All queries use prepared statements

**XSS Prevention:**

- React automatically escapes output
- No dangerouslySetInnerHTML used
- User input sanitized before display

### Rate Limiting

**API Protection:**

- Vercel Serverless Functions have built-in rate limiting
- Consider adding explicit rate limiting for registration endpoint
- Prevent brute force attacks on document validation

**Recommendation:**

```javascript
// Add to api/affiliates.js
import rateLimit from 'express-rate-limit';

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 registration attempts per IP
  message: 'Muitas tentativas de cadastro. Tente novamente em 15 minutos.'
});
```

### Audit Logging

**What to Log:**

- Registration attempts (success and failure)
- Document validation failures
- Financial status changes
- Suspicious activity (multiple failed validations)

**What NOT to Log:**

- Full document values (log only last 4 digits)
- Passwords
- JWT tokens

**Example:**

```javascript
console.log('Registration attempt', {
  email: data.email,
  affiliate_type: data.affiliate_type,
  document_last_4: data.document.slice(-4),
  success: true
});
```

### LGPD Compliance (Brazilian Data Protection Law)

**Requirements:**

1. **Consent:** User must consent to data collection (handled in registration form)
2. **Purpose:** Data used only for affiliate program (stated in terms)
3. **Access:** User can access their own data (via dashboard)
4. **Deletion:** User can request data deletion (soft delete with deleted_at)
5. **Security:** Data must be protected (RLS policies + encryption)

**Compliance Status:**

- ✅ Consent obtained during registration
- ✅ Purpose clearly stated
- ✅ User can access their data
- ✅ Soft delete implemented
- ✅ Data encrypted at rest (Supabase)
- ✅ Access controlled by RLS


## Performance Considerations

### Database Indexes

**Indexes Created:**

1. `idx_affiliates_affiliate_type` - Single column index
   - Used for: Queries filtering by affiliate type
   - Example: `SELECT * FROM affiliates WHERE affiliate_type = 'logista'`

2. `idx_affiliates_financial_status` - Single column index
   - Used for: Queries filtering by financial status
   - Example: `SELECT * FROM affiliates WHERE financial_status = 'ativo'`

3. `idx_affiliates_type_status` - Composite index
   - Used for: Queries filtering by both fields
   - Example: `SELECT * FROM affiliates WHERE affiliate_type = 'logista' AND financial_status = 'ativo'`

**Index Strategy:**

- All indexes include `WHERE deleted_at IS NULL` (partial index)
- Reduces index size by excluding soft-deleted records
- Improves query performance for active records

**Expected Performance Impact:**

- Queries filtering by type/status: 10-100x faster
- Minimal impact on INSERT/UPDATE (small table size)
- Index size: ~1-2 KB per index (negligible)

### API Response Times

**Target Response Times:**

- Registration endpoint: < 500ms (p95)
- Document validation: < 50ms (pure computation)
- Database queries: < 100ms (with indexes)

**Optimization Strategies:**

1. **Validation Order:**
   - Check format first (fast)
   - Check check digits second (medium)
   - Check database uniqueness last (slow)

2. **Early Returns:**
   - Return error immediately on first validation failure
   - Don't continue validation if early check fails

3. **Database Queries:**
   - Use indexes for all queries
   - Limit result sets
   - Use `maybeSingle()` instead of `select()` when expecting one result

### Frontend Performance

**Optimization Strategies:**

1. **Lazy Loading:**
   - Load AffiliateStatusBanner only when needed
   - Don't render if status is 'ativo'

2. **Memoization:**
   - Memoize document validation functions
   - Avoid re-validating on every render

3. **Debouncing:**
   - Debounce document input validation
   - Wait 300ms after user stops typing

**Example:**

```typescript
import { useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

const debouncedValidate = useMemo(
  () => debounce((value) => {
    if (affiliateType === 'individual') {
      setIsValid(validateCPF(value));
    } else {
      setIsValid(validateCNPJ(value));
    }
  }, 300),
  [affiliateType]
);
```

### Caching Strategy

**What to Cache:**

- ❌ Don't cache registration requests (always fresh)
- ❌ Don't cache document validation (security risk)
- ✅ Cache affiliate type options (static data)
- ✅ Cache validation error messages (static data)

**Why Not Cache:**

- Registration data must be real-time
- Document validation must be accurate
- Security risk if cached validation results are reused

### Monitoring & Metrics

**Key Metrics to Track:**

1. **API Metrics:**
   - Registration success rate
   - Registration response time (p50, p95, p99)
   - Validation failure rate by reason
   - Error rate by error type

2. **Database Metrics:**
   - Query execution time
   - Index usage statistics
   - Table size growth
   - Connection pool usage

3. **Frontend Metrics:**
   - Form submission time
   - Validation response time
   - Error display time
   - User drop-off rate

**Monitoring Tools:**

- Vercel Analytics (API response times)
- Supabase Dashboard (database metrics)
- Browser DevTools (frontend performance)
- Custom logging (business metrics)

### Scalability Considerations

**Current Scale:**

- 23 existing affiliates
- Expected growth: ~100-500 affiliates in first year
- Registration rate: ~1-5 per day

**Scalability Assessment:**

- ✅ Database: Can handle millions of records
- ✅ Indexes: Will remain efficient up to 100k+ records
- ✅ API: Serverless scales automatically
- ✅ Frontend: Static assets, scales infinitely

**Future Considerations:**

- If affiliates > 100k: Consider partitioning by affiliate_type
- If registration rate > 100/day: Add caching layer
- If validation becomes bottleneck: Move to edge functions


## Deployment Strategy

### Deployment Order

**Phase 1: Database (FIRST)**
1. Backup production database
2. Run migration script
3. Verify migration success
4. Monitor for errors

**Phase 2: Backend (SECOND)**
1. Deploy API changes (Vercel auto-deploy on git push)
2. Verify API endpoints working
3. Test registration flow
4. Monitor error logs

**Phase 3: Frontend (THIRD)**
1. Deploy frontend changes (Vercel auto-deploy on git push)
2. Verify form rendering correctly
3. Test complete registration flow
4. Monitor user feedback

**Why This Order:**

- Database must be ready before API uses new fields
- API must be ready before frontend calls new endpoints
- Minimizes downtime and errors

### Deployment Checklist

#### Pre-Deployment

- [ ] All tests passing (unit, property, integration)
- [ ] Code reviewed and approved
- [ ] Migration tested on staging
- [ ] Backup of production database created
- [ ] Rollback plan documented
- [ ] Deployment window scheduled (if needed)

#### Database Deployment

- [ ] Connect to production Supabase
- [ ] Run migration script
- [ ] Verify record count (>= 23)
- [ ] Verify new columns exist
- [ ] Verify indexes created
- [ ] Check for errors in logs
- [ ] Test existing affiliate login

#### Backend Deployment

- [ ] Push code to main branch
- [ ] Verify Vercel deployment successful
- [ ] Test API endpoint: `GET /api/affiliates?action=register`
- [ ] Test with valid data
- [ ] Test with invalid data
- [ ] Verify error responses
- [ ] Check Vercel logs for errors

#### Frontend Deployment

- [ ] Push code to main branch
- [ ] Verify Vercel deployment successful
- [ ] Test registration form loads
- [ ] Test affiliate type selection
- [ ] Test document field switching
- [ ] Test validation messages
- [ ] Test successful registration
- [ ] Verify existing pages still work

#### Post-Deployment

- [ ] Monitor error rates for 24 hours
- [ ] Check user feedback
- [ ] Verify no increase in support tickets
- [ ] Document any issues found
- [ ] Update status to stakeholders

### Rollback Procedures

#### If Database Migration Fails

1. **Immediate Action:**
   ```sql
   -- Run rollback script
   BEGIN;
   DROP INDEX IF EXISTS idx_affiliates_type_status;
   DROP INDEX IF EXISTS idx_affiliates_financial_status;
   DROP INDEX IF EXISTS idx_affiliates_affiliate_type;
   ALTER TABLE affiliates DROP COLUMN IF EXISTS financial_status;
   ALTER TABLE affiliates DROP COLUMN IF EXISTS affiliate_type;
   DROP TYPE IF EXISTS financial_status;
   DROP TYPE IF EXISTS affiliate_type;
   COMMIT;
   ```

2. **Verify Rollback:**
   - Check columns removed
   - Check types removed
   - Verify existing data intact

3. **Investigate & Fix:**
   - Review error logs
   - Fix migration script
   - Test on staging again

#### If API Deployment Fails

1. **Immediate Action:**
   - Revert git commit
   - Push to trigger re-deploy
   - Or use Vercel dashboard to rollback to previous deployment

2. **Verify Rollback:**
   - Test existing API endpoints
   - Verify no errors in logs

3. **Investigate & Fix:**
   - Review error logs
   - Fix code issues
   - Test locally
   - Re-deploy

#### If Frontend Deployment Fails

1. **Immediate Action:**
   - Revert git commit
   - Push to trigger re-deploy
   - Or use Vercel dashboard to rollback to previous deployment

2. **Verify Rollback:**
   - Test existing pages load
   - Verify no console errors

3. **Investigate & Fix:**
   - Review error logs
   - Fix code issues
   - Test locally
   - Re-deploy

### Monitoring Post-Deployment

**Metrics to Watch:**

1. **Error Rates:**
   - API 4xx errors (validation failures)
   - API 5xx errors (server errors)
   - Frontend console errors
   - Database query errors

2. **Performance:**
   - API response times
   - Page load times
   - Database query times

3. **Business Metrics:**
   - Registration success rate
   - Registration completion rate
   - User drop-off points

**Alert Thresholds:**

- Error rate > 5%: Investigate immediately
- Response time > 1s: Investigate within 1 hour
- Registration success rate < 90%: Investigate within 1 hour

**Monitoring Tools:**

- Vercel Dashboard (deployments, errors, performance)
- Supabase Dashboard (database metrics, logs)
- Browser Console (frontend errors)
- Custom logging (business metrics)

### Communication Plan

**Stakeholders to Notify:**

1. **Development Team:**
   - Notify before deployment
   - Share deployment checklist
   - Assign monitoring responsibilities

2. **Product Owner:**
   - Notify of deployment schedule
   - Share expected impact
   - Report deployment success/failure

3. **Support Team:**
   - Notify of new features
   - Share user-facing changes
   - Provide troubleshooting guide

4. **Users (if needed):**
   - Notify if maintenance window required
   - Announce new features
   - Provide documentation

**Communication Channels:**

- Slack/Discord for team
- Email for stakeholders
- In-app notification for users (if needed)


## Dependencies

### External Dependencies

**No New Dependencies Required:**

All required libraries are already installed in the project:

- `@supabase/supabase-js` - Database client (already installed)
- `react` - Frontend framework (already installed)
- `vite` - Build tool (already installed)
- `vitest` - Testing framework (already installed)
- `fast-check` - Property-based testing (verify if installed, install if needed)

**Optional Dependencies:**

- `express-rate-limit` - API rate limiting (recommended for production)
- `react-input-mask` - Document input masking (optional, can use custom implementation)

### Internal Dependencies

**Database:**
- Supabase PostgreSQL (existing)
- Table: `affiliates` (existing)
- ENUM: `product_category` (existing)

**API:**
- `api/affiliates.js` (existing, will be extended)
- Supabase Auth (existing)

**Frontend:**
- `src/pages/auth/CadastroAfiliado.tsx` (existing, will be updated)
- `src/services/affiliates.service.ts` (existing, will be extended)
- shadcn/ui components (existing)

### Version Requirements

**Node.js:** >= 18.x (Vercel requirement)
**PostgreSQL:** >= 15.x (Supabase default)
**React:** >= 18.x (current version)
**TypeScript:** >= 5.x (current version)

### Compatibility Matrix

| Component | Current Version | Required Version | Compatible |
|-----------|----------------|------------------|------------|
| Node.js | 18.x | >= 18.x | ✅ |
| PostgreSQL | 15.x | >= 15.x | ✅ |
| React | 18.x | >= 18.x | ✅ |
| TypeScript | 5.x | >= 5.x | ✅ |
| Supabase | Latest | Latest | ✅ |
| Vercel | Latest | Latest | ✅ |


## Risks and Mitigations

### Risk 1: Data Loss During Migration

**Probability:** Low  
**Impact:** Critical  
**Risk Level:** HIGH

**Description:**
Migration script could fail and cause data loss of existing 23 affiliates.

**Mitigation:**
1. ✅ Backup database before migration
2. ✅ Test migration on staging environment first
3. ✅ Use PostgreSQL transactions (automatic rollback on error)
4. ✅ Verify record count before and after migration
5. ✅ Have rollback script ready

**Contingency:**
- If data loss detected: Restore from backup
- If migration fails: Run rollback script
- If partial failure: Manual data recovery

---

### Risk 2: Breaking Changes to Existing System

**Probability:** Medium  
**Impact:** High  
**Risk Level:** HIGH

**Description:**
New fields or validation logic could break existing affiliate functionality.

**Mitigation:**
1. ✅ Use default values for new fields
2. ✅ Maintain backward compatibility
3. ✅ Test existing flows before deployment
4. ✅ Comprehensive regression testing
5. ✅ Gradual rollout (database → API → frontend)

**Contingency:**
- If breaking change detected: Rollback deployment
- If partial breakage: Hotfix and re-deploy
- If widespread issues: Full rollback and investigation

---

### Risk 3: Invalid Document Validation Logic

**Probability:** Medium  
**Impact:** Medium  
**Risk Level:** MEDIUM

**Description:**
CPF/CNPJ validation algorithm could be incorrect, accepting invalid documents or rejecting valid ones.

**Mitigation:**
1. ✅ Use standard validation algorithms
2. ✅ Test with known valid/invalid documents
3. ✅ Property-based testing with 100+ iterations
4. ✅ Round-trip property verification
5. ✅ Manual testing with real documents

**Contingency:**
- If validation too strict: Hotfix to relax validation
- If validation too loose: Hotfix to tighten validation
- If widespread issues: Disable validation temporarily and fix

---

### Risk 4: Performance Degradation

**Probability:** Low  
**Impact:** Medium  
**Risk Level:** LOW

**Description:**
New indexes or validation logic could slow down queries or API responses.

**Mitigation:**
1. ✅ Create appropriate indexes
2. ✅ Use partial indexes (WHERE deleted_at IS NULL)
3. ✅ Optimize validation logic
4. ✅ Monitor response times post-deployment
5. ✅ Load testing before production

**Contingency:**
- If queries slow: Add more indexes
- If API slow: Optimize validation logic
- If database slow: Analyze query plans and optimize

---

### Risk 5: User Confusion with New Fields

**Probability:** Medium  
**Impact:** Low  
**Risk Level:** LOW

**Description:**
Users might not understand the difference between Individual and Logista, or might select the wrong type.

**Mitigation:**
1. ✅ Clear labels and descriptions
2. ✅ Helpful tooltips or info icons
3. ✅ Validation messages guide user
4. ✅ Support documentation
5. ✅ Allow admin to change type if needed (future)

**Contingency:**
- If confusion widespread: Add more explanatory text
- If wrong selections common: Add confirmation step
- If support tickets increase: Create FAQ and video tutorial

---

### Risk 6: CNPJ Validation Complexity

**Probability:** Low  
**Impact:** Medium  
**Risk Level:** LOW

**Description:**
CNPJ validation is more complex than CPF and could have edge cases we didn't consider.

**Mitigation:**
1. ✅ Use well-tested validation algorithm
2. ✅ Test with real CNPJs
3. ✅ Property-based testing
4. ✅ Edge case testing (all digits equal, etc.)
5. ✅ Manual testing with various CNPJ formats

**Contingency:**
- If edge case found: Hotfix validation logic
- If algorithm wrong: Replace with correct algorithm
- If widespread issues: Temporarily allow manual verification

---

### Risk 7: Incomplete Migration of Existing Affiliates

**Probability:** Low  
**Impact:** High  
**Risk Level:** MEDIUM

**Description:**
Some existing affiliates might not get updated with default values, causing NULL values or errors.

**Mitigation:**
1. ✅ Migration script updates ALL records
2. ✅ Verification step checks for NULL values
3. ✅ Transaction ensures all-or-nothing update
4. ✅ Test on staging with same data structure
5. ✅ Post-migration verification queries

**Contingency:**
- If NULL values found: Run UPDATE query to fix
- If some records missed: Identify and update manually
- If widespread: Rollback and fix migration script

---

### Risk 8: API Validation Bypass

**Probability:** Low  
**Impact:** High  
**Risk Level:** MEDIUM

**Description:**
Malicious users could bypass frontend validation and send invalid data directly to API.

**Mitigation:**
1. ✅ API validates ALL input (never trust client)
2. ✅ Database constraints as final layer
3. ✅ Rate limiting on registration endpoint
4. ✅ Logging of validation failures
5. ✅ Monitoring for suspicious activity

**Contingency:**
- If bypass detected: Strengthen API validation
- If malicious activity: Block IP addresses
- If data corruption: Clean up invalid records

---

### Risk Summary

| Risk | Probability | Impact | Level | Mitigation Status |
|------|-------------|--------|-------|-------------------|
| Data Loss | Low | Critical | HIGH | ✅ Comprehensive |
| Breaking Changes | Medium | High | HIGH | ✅ Comprehensive |
| Invalid Validation | Medium | Medium | MEDIUM | ✅ Comprehensive |
| Performance | Low | Medium | LOW | ✅ Adequate |
| User Confusion | Medium | Low | LOW | ✅ Adequate |
| CNPJ Complexity | Low | Medium | LOW | ✅ Adequate |
| Incomplete Migration | Low | High | MEDIUM | ✅ Comprehensive |
| API Bypass | Low | High | MEDIUM | ✅ Comprehensive |

**Overall Risk Assessment:** MEDIUM (acceptable with mitigations in place)


## Conclusion

### Summary

This design document specifies the complete technical implementation for ETAPA 1 of the Slim Quality affiliate differentiation system. The solution creates a solid foundation for supporting two distinct affiliate types (Individual and Logista) while maintaining full backward compatibility with the existing system.

### Key Achievements

1. **Zero Breaking Changes:** All existing affiliates continue to function normally
2. **Robust Validation:** CPF/CNPJ validation with round-trip property guarantees data integrity
3. **Scalable Architecture:** Database indexes and API design support future growth
4. **Security in Depth:** Validation at frontend, API, and database layers
5. **Comprehensive Testing:** Property-based and unit tests ensure correctness
6. **Clear Migration Path:** Well-documented migration strategy with rollback plan

### Success Criteria

The ETAPA 1 implementation will be considered successful when:

- ✅ All 10 requirements from requirements.md are implemented
- ✅ Database migration applied successfully with zero data loss
- ✅ All 23 existing affiliates migrated with correct default values
- ✅ Registration form supports both Individual and Logista types
- ✅ CPF/CNPJ validation working correctly (100+ property test iterations passing)
- ✅ API endpoints validate and process registrations correctly
- ✅ Financial status restrictions implemented and working
- ✅ All automated tests passing (unit, property, integration)
- ✅ Zero breaking changes to existing functionality
- ✅ Documentation complete and up-to-date

### Next Steps

After ETAPA 1 is complete and deployed:

1. **ETAPA 2: Configuração de Wallet**
   - Implement wallet configuration flow
   - Add wallet validation via Asaas API
   - Implement financial_status transition (pendente → ativo)
   - Enable commission participation for active affiliates

2. **ETAPA 3: Produtos Show Row**
   - Create Show Row products in database
   - Implement product visibility rules (Logistas only)
   - Add product catalog filtering
   - Update commission calculation for Show Row

3. **ETAPA 4: Perfil de Loja e Vitrine**
   - Create store profile page
   - Implement product showcase
   - Add store customization options
   - Create public store URL

4. **ETAPA 5: Sistema de Monetização**
   - Implement commission rules for Show Row
   - Add revenue tracking
   - Create payout system
   - Implement reporting dashboard

### Maintenance and Support

**Post-Deployment:**

- Monitor error rates and performance metrics
- Collect user feedback on new registration flow
- Address any issues or bugs promptly
- Update documentation based on real-world usage

**Long-Term:**

- Review and optimize database indexes as data grows
- Update validation logic if CPF/CNPJ rules change
- Enhance user experience based on feedback
- Prepare for ETAPA 2 implementation

### Approval

This design document should be reviewed and approved by:

- [ ] Technical Lead
- [ ] Product Owner
- [ ] Backend Developer
- [ ] Frontend Developer
- [ ] QA Engineer

**Approval Date:** _________________

**Approved By:** _________________

---

## Appendix

### A. CPF Validation Algorithm (Detailed)

```typescript
function validateCPFCheckDigits(cpf: string): boolean {
  // CPF must be 11 digits
  if (cpf.length !== 11) return false;
  
  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  // Verify first check digit
  if (digit1 !== parseInt(cpf[9])) return false;
  
  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  // Verify second check digit
  return digit2 === parseInt(cpf[10]);
}
```

### B. CNPJ Validation Algorithm (Detailed)

```typescript
function validateCNPJCheckDigits(cnpj: string): boolean {
  // CNPJ must be 14 digits
  if (cnpj.length !== 14) return false;
  
  // Calculate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * weights1[i];
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  // Verify first check digit
  if (digit1 !== parseInt(cnpj[12])) return false;
  
  // Calculate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * weights2[i];
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  // Verify second check digit
  return digit2 === parseInt(cnpj[13]);
}
```

### C. Example API Request/Response

**Request:**

```bash
curl -X POST https://slimquality.com.br/api/affiliates?action=register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "11999999999",
    "password": "Senha@123",
    "affiliate_type": "individual",
    "document": "12345678909",
    "referral_code": "ABC123"
  }'
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "João Silva",
    "email": "joao@example.com",
    "affiliate_type": "individual",
    "financial_status": "financeiro_pendente",
    "referral_code": "XYZ789",
    "message": "Cadastro realizado com sucesso"
  }
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "CPF inválido - verifique os dígitos",
  "field": "document"
}
```

### D. Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        affiliates                            │
├─────────────────────────────────────────────────────────────┤
│ id                    UUID (PK)                              │
│ user_id               UUID (FK → auth.users)                 │
│ name                  TEXT                                   │
│ email                 TEXT (UNIQUE)                          │
│ phone                 TEXT                                   │
│ document              TEXT (UNIQUE)                          │
│ document_type         VARCHAR ('CPF' | 'CNPJ')              │
│ referral_code         TEXT (UNIQUE)                          │
│ wallet_id             TEXT (NULLABLE)                        │
│ status                ENUM (pending, active, inactive, ...)  │
│ affiliate_type        ENUM (individual, logista) ← NEW      │
│ financial_status      ENUM (financeiro_pendente, ativo) ← NEW│
│ created_at            TIMESTAMPTZ                            │
│ updated_at            TIMESTAMPTZ                            │
│ deleted_at            TIMESTAMPTZ (NULLABLE)                 │
└─────────────────────────────────────────────────────────────┘

Indexes:
- idx_affiliates_affiliate_type (affiliate_type) WHERE deleted_at IS NULL
- idx_affiliates_financial_status (financial_status) WHERE deleted_at IS NULL
- idx_affiliates_type_status (affiliate_type, financial_status) WHERE deleted_at IS NULL
```

### E. References

**Brazilian Document Validation:**
- CPF Algorithm: https://www.geradorcpf.com/algoritmo_do_cpf.htm
- CNPJ Algorithm: https://www.geradorcnpj.com/algoritmo_do_cnpj.htm

**Property-Based Testing:**
- fast-check Documentation: https://fast-check.dev/
- Property-Based Testing Guide: https://fsharpforfunandprofit.com/posts/property-based-testing/

**Supabase:**
- Supabase Documentation: https://supabase.com/docs
- PostgreSQL ENUM Types: https://www.postgresql.org/docs/current/datatype-enum.html

**Vercel:**
- Serverless Functions: https://vercel.com/docs/functions/serverless-functions
- Deployment: https://vercel.com/docs/deployments/overview

---

**Document Version:** 1.0  
**Created:** 2025-02-XX  
**Last Updated:** 2025-02-XX  
**Status:** Ready for Review  
**Author:** Kiro AI

