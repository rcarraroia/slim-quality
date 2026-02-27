# Design Document - ETAPA 2: Configuração Financeira (Wallet)

## Overview

Este documento especifica o design técnico para implementação da ETAPA 2 do sistema de diferenciação de perfis de afiliados. A solução permite que afiliados configurem sua conta de recebimento no Asaas diretamente pelo painel, habilitando-os a receber comissões através de dois fluxos distintos: informar Wallet ID existente ou criar nova subconta.

**⚠️ NOTA CRÍTICA - DIVERGÊNCIAS CORRIGIDAS:**

Esta especificação foi corrigida após validação com a API real do Asaas via MCP. As seguintes divergências foram identificadas e corrigidas:

1. **Endpoint GET /wallets/{id} não existe**: A API Asaas não fornece endpoint para validar Wallet ID de terceiros. GET /v3/wallets/ retorna apenas wallets da própria conta. **Solução:** Removido endpoint validate-wallet. Validação ocorre implicitamente na primeira tentativa de split.

2. **Formato do walletId**: O formato real é UUID padrão (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx), não `wal_XXXXXXXXXXXXXXXXXXXX`. **Solução:** Atualizado regex para `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`.

3. **POST /accounts retorna apiKey adicional**: Além de `walletId`, o endpoint também retorna `apiKey` da subconta criada. **Solução:** Capturar `apiKey` para armazenamento opcional.

**Decisão de Design:** Sem endpoint de validação disponível, a abordagem é aceitar o walletId informado, validar apenas o formato UUID, e confiar que erros aparecem na primeira tentativa de split. O sistema já tem logs e o erro seria detectado no primeiro pagamento real.

### Objetivos

1. Permitir que afiliados configurem Wallet ID manualmente (se já têm conta Asaas)
2. Permitir que afiliados criem subconta Asaas diretamente pelo painel
3. Validar Wallet IDs via API do Asaas antes de aceitar
4. Transicionar automaticamente status de 'financeiro_pendente' para 'ativo'
5. Restringir acesso ao link de indicação para afiliados sem wallet configurada
6. Garantir segurança e integridade dos dados financeiros

### Escopo

**Incluído nesta ETAPA:**
- ✅ Seção de Configurações Financeiras no painel do afiliado
- ✅ Fluxo "Já tenho conta Asaas" (informar Wallet ID manualmente)
- ✅ Fluxo "Criar conta Asaas" (criar subconta via API)
- ✅ Validação de Wallet ID via API Asaas
- ✅ Criação de subconta via API Asaas
- ✅ Transição automática de status financeiro
- ✅ Restrições de acesso ao link de indicação
- ✅ Validações de segurança e integridade

**Não incluído (ETAPAs futuras):**
- ❌ Produtos Show Row (ETAPA 3)
- ❌ Perfil de loja e vitrine (ETAPA 4)
- ❌ Sistema de monetização (ETAPA 5)
- ❌ Alteração de wallet após configuração
- ❌ Múltiplas wallets por afiliado


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
- Tabela principal: `affiliates`
- Campos relevantes: `wallet_id`, `financial_status`, `wallet_configured_at`, `onboarding_completed`
- Segurança: Row Level Security (RLS)

**External API:** Asaas
- Base URL: https://api.asaas.com/v3
- Autenticação: Header `access_token`
- Endpoints usados: GET /wallets/{id}, POST /accounts

### Architectural Decisions

**AD-1: Dois fluxos independentes para configuração**
- Decisão: Oferecer "Já tenho conta" e "Criar conta" como opções separadas
- Razão: Não faz sentido criar nova conta para quem já tem
- Impacto: UX mais clara e menos erros

**AD-2: Validação de formato UUID apenas (sem validação via API Asaas)**
- Decisão: Validar apenas formato UUID do Wallet ID, sem validação via API Asaas
- Razão: API Asaas não fornece endpoint para validar Wallet ID de terceiros (GET /v3/wallets/ retorna apenas wallets da própria conta)
- Impacto: Validação ocorre implicitamente na primeira tentativa de split de comissão; erros são detectados e registrados em logs
- Nota: Constraint UNIQUE do banco previne duplicação

**AD-3: Transição automática de status**
- Decisão: Atualizar `financial_status` automaticamente após configuração
- Razão: Simplificar fluxo e evitar inconsistências
- Impacto: Afiliado fica ativo imediatamente

**AD-4: Wallet ID imutável após configuração**
- Decisão: Afiliado não pode alterar wallet_id após configurar
- Razão: Segurança e auditoria
- Impacto: Apenas admin pode alterar via painel administrativo

**AD-5: Constraint UNIQUE no wallet_id**
- Decisão: Garantir que cada wallet só pode ser usada por um afiliado
- Razão: Prevenir fraudes e erros de configuração
- Impacto: Validação no nível do banco de dados


## Components and Interfaces

### Database Schema (Existing)

A tabela `affiliates` já possui os campos necessários (criados na ETAPA 1 e migrations anteriores):

```typescript
interface Affiliate {
  // Campos existentes relevantes
  id: string; // uuid
  user_id: string; // uuid, FK auth.users
  name: string;
  email: string;
  phone: string;
  document: string; // CPF ou CNPJ
  document_type: 'CPF' | 'CNPJ';
  
  // Campos de wallet (já existem)
  wallet_id: string | null; // Formato UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  wallet_configured_at: string | null; // timestamptz
  onboarding_completed: boolean; // default false
  
  // Campos de status (ETAPA 1)
  affiliate_type: 'individual' | 'logista';
  financial_status: 'financeiro_pendente' | 'ativo';
  
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

**Nenhuma alteração de schema necessária** - todos os campos já existem.

### API Endpoints

#### Endpoint 1: POST /api/affiliates?action=create-asaas-account

**Propósito:** Criar subconta no Asaas e retornar Wallet ID

**Request:**

```typescript
interface CreateAsaasAccountRequest {
  name: string;
  email: string;
  cpfCnpj: string; // 11 ou 14 dígitos
  mobilePhone: string; // +55XXXXXXXXXXX
  incomeValue: number; // Em reais
  address: string;
  addressNumber: string;
  province: string; // Bairro
  postalCode: string; // XXXXX-XXX
}
```

**Response (Success - 201):**

```typescript
interface CreateAsaasAccountResponse {
  success: true;
  data: {
    walletId: string; // Formato UUID
    accountId: string;
    apiKey: string; // API Key da subconta criada (opcional armazenar)
    message: string; // "Conta criada com sucesso"
  };
}
```

**Response (Error - 400/409):**

```typescript
interface CreateAsaasAccountError {
  success: false;
  error: string;
  field?: string; // Campo que causou o erro
}
```

#### Endpoint 2: POST /api/affiliates?action=configure-wallet

**Propósito:** Salvar Wallet ID e atualizar status do afiliado

**Nota:** Este endpoint NÃO valida o Wallet ID via API Asaas. A validação ocorre implicitamente na primeira tentativa de split de comissão.

**Request:**

```typescript
interface ConfigureWalletRequest {
  walletId: string; // Formato UUID
}
```

**Response (Success - 200):**

```typescript
interface ConfigureWalletResponse {
  success: true;
  data: {
    affiliateId: string;
    walletId: string;
    financial_status: 'ativo';
    message: string; // "Wallet configurada com sucesso"
  };
}
```

**Response (Error - 400/409):**

```typescript
interface ConfigureWalletError {
  success: false;
  error: string; // "Wallet já cadastrada" | "Wallet inválida"
}
```


### Frontend Components

#### 1. ConfiguracoesFinanceiras.tsx (Nova Página)

**Localização:** `src/pages/affiliates/ConfiguracoesFinanceiras.tsx`

**Propósito:** Página principal de configuração de wallet

**Estado:**

```typescript
interface ConfiguracoesFinanceirasState {
  affiliate: Affiliate | null;
  loading: boolean;
  selectedFlow: 'existing' | 'create' | null;
}
```

**Comportamento:**

1. Verificar `financial_status` do afiliado ao carregar
2. Se `financial_status='ativo'`: Exibir informações da wallet configurada
3. Se `financial_status='financeiro_pendente'`: Exibir opções de configuração
4. Permitir seleção entre "Já tenho conta" e "Criar conta"
5. Renderizar componente apropriado baseado na seleção

#### 2. ExistingWalletForm.tsx (Novo Componente)

**Localização:** `src/components/affiliates/ExistingWalletForm.tsx`

**Propósito:** Formulário para informar Wallet ID existente

**Props:**

```typescript
interface ExistingWalletFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Campos:**

- `walletId`: string (input text com máscara)

**Validação:**

- Formato UUID: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
- Obrigatório

**Fluxo:**

1. Usuário digita Wallet ID (formato UUID)
2. Validar formato UUID client-side
3. Ao submeter, chamar `configureWallet(walletId)` diretamente (sem validação via API Asaas)
4. Exibir feedback de sucesso/erro
5. Nota: Validação real ocorre na primeira tentativa de split de comissão


#### 3. CreateAsaasAccountForm.tsx (Novo Componente)

**Localização:** `src/components/affiliates/CreateAsaasAccountForm.tsx`

**Propósito:** Formulário para criar subconta no Asaas

**Props:**

```typescript
interface CreateAsaasAccountFormProps {
  affiliate: Affiliate;
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Campos:**

- `name`: string (pré-preenchido)
- `email`: string (pré-preenchido)
- `cpfCnpj`: string (pré-preenchido)
- `mobilePhone`: string (pré-preenchido)
- `incomeValue`: number (novo)
- `address`: string (novo)
- `addressNumber`: string (novo)
- `province`: string (novo)
- `postalCode`: string (novo)

**Validação:**

- Todos os campos obrigatórios
- `incomeValue`: número positivo
- `postalCode`: 8 dígitos
- `mobilePhone`: formato brasileiro

**Fluxo:**

1. Pré-preencher campos com dados do afiliado
2. Usuário preenche campos adicionais
3. Validar todos os campos
4. Ao submeter, chamar `createAsaasAccount(data)`
5. Se sucesso, extrair `walletId` (UUID) e `apiKey` da resposta
6. Chamar `configureWallet(walletId)` automaticamente
7. Opcionalmente armazenar `apiKey` para uso futuro
8. Exibir feedback de sucesso/erro


## Correctness Properties

### Property 1: Wallet ID Format Validation

*For any* Wallet ID string, the system should accept it if and only if it matches the UUID format: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`

**Validates: Requirements 2.3, 2.4, 3.1**

**Rationale:** Ensures only valid UUID format Wallet IDs are accepted, preventing obvious configuration errors.

**Nota:** A validação real da existência e status da wallet ocorre implicitamente na primeira tentativa de split de comissão, pois a API Asaas não fornece endpoint para validar Wallet ID de terceiros.

### Property 2: Wallet ID Uniqueness

*For any* Wallet ID being configured, the system should reject it if it already exists for another affiliate in the database.

**Validates: Requirements 9.7, 9.8**

**Rationale:** Prevents multiple affiliates from using the same wallet, ensuring commission integrity.

### Property 3: Status Transition Atomicity

*For any* successful wallet configuration, the system should atomically update `wallet_id`, `financial_status`, `wallet_configured_at`, and `onboarding_completed` in a single transaction.

**Validates: Requirements 6.1, 6.2, 6.3**

**Rationale:** Ensures data consistency and prevents partial updates.

### Property 4: Access Restriction Enforcement

*For any* affiliate with `financial_status='financeiro_pendente'`, the system should prevent access to referral link generation and hide the link section in the dashboard.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

**Rationale:** Ensures only affiliates ready to receive commissions can generate referral links.

### Property 5: Authentication and Authorization

*For any* wallet configuration request, the system should verify that the authenticated user is the owner of the affiliate account being modified.

**Validates: Requirements 9.1, 9.2**

**Rationale:** Prevents unauthorized modification of wallet configurations.

### Property 6: Asaas Account Creation Idempotency

*For any* affiliate attempting to create an Asaas account with email or CPF/CNPJ already registered, the system should return a clear error without creating duplicate accounts.

**Validates: Requirements 5.6**

**Rationale:** Prevents duplicate accounts and provides clear feedback to users.


## Error Handling

### API Errors

#### 1. Wallet Format Validation Errors

**Scenario:** Wallet ID format invalid (não é UUID)

**Handling:**
- Return HTTP 400
- Message: "Formato de Wallet ID inválido. Use formato UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

**Nota:** Não há validação via API Asaas. Erros de Wallet ID inválido serão detectados na primeira tentativa de split de comissão e registrados em logs.

#### 2. Account Creation Errors

**Scenario:** Email or CPF/CNPJ already registered

**Handling:**
- Return HTTP 409
- Message: "Email ou CPF/CNPJ já cadastrado no Asaas. Use a opção 'Já tenho conta'."

**Scenario:** Invalid field data

**Handling:**
- Return HTTP 400
- Message: "Campo {field} inválido: {reason}"
- Include field name for frontend highlighting

#### 3. Configuration Errors

**Scenario:** Wallet ID already used by another affiliate

**Handling:**
- Return HTTP 409
- Message: "Esta wallet já está cadastrada para outro afiliado."

**Scenario:** Affiliate already has wallet configured

**Handling:**
- Return HTTP 400
- Message: "Você já possui uma wallet configurada. Entre em contato com o suporte para alterações."


## Testing Strategy

### Property-Based Testing

**Library:** fast-check (JavaScript/TypeScript)

**Property Tests to Implement:**

#### 1. Wallet ID Format Property

```typescript
// Feature: etapa-2-configuracao-wallet, Property 1: Wallet ID Format Validation
test('validates wallet ID UUID format correctly', () => {
  fc.assert(
    fc.property(
      fc.string(),
      (walletId) => {
        const isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(walletId);
        expect(validateWalletIdFormat(walletId)).toBe(isValid);
      }
    ),
    { numRuns: 100 }
  );
});
```

#### 2. Status Transition Property

```typescript
// Feature: etapa-2-configuracao-wallet, Property 4: Status Transition Atomicity
test('status transition is atomic', async () => {
  fc.assert(
    fc.property(
      fc.walletId(), // Generator de Wallet IDs válidos
      async (walletId) => {
        const affiliate = await configureWallet(affiliateId, walletId);
        
        // Verificar que todos os campos foram atualizados
        expect(affiliate.wallet_id).toBe(walletId);
        expect(affiliate.financial_status).toBe('ativo');
        expect(affiliate.wallet_configured_at).not.toBeNull();
        expect(affiliate.onboarding_completed).toBe(true);
      }
    ),
    { numRuns: 50 }
  );
});
```

### Unit Testing

**Framework:** Vitest

**Unit Tests to Implement:**

#### 1. Wallet ID Validation

```typescript
describe('validateWalletIdFormat', () => {
  test('accepts valid UUID wallet ID', () => {
    expect(validateWalletIdFormat('c0c1688f-636b-42c0-b6ee-7339182276b7')).toBe(true);
  });
  
  test('rejects wallet ID without hyphens', () => {
    expect(validateWalletIdFormat('c0c1688f636b42c0b6ee7339182276b7')).toBe(false);
  });
  
  test('rejects wallet ID with wrong format', () => {
    expect(validateWalletIdFormat('wal_12345678901234567890')).toBe(false); // Formato antigo, deve rejeitar
  });
  
  test('rejects wallet ID with uppercase letters', () => {
    expect(validateWalletIdFormat('C0C1688F-636B-42C0-B6EE-7339182276B7')).toBe(false);
  });
  
  test('rejects wallet ID with special characters', () => {
    expect(validateWalletIdFormat('c0c1688f-636b-42c0-b6ee-733918227@b7')).toBe(false);
  });
});
```

#### 2. API Integration Tests

```typescript
describe('POST /api/affiliates?action=configure-wallet', () => {
  test('returns 200 for valid UUID wallet', async () => {
    const response = await request(app)
      .post('/api/affiliates?action=configure-wallet')
      .send({ walletId: 'c0c1688f-636b-42c0-b6ee-7339182276b7' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.financial_status).toBe('ativo');
  });
  
  test('returns 400 for invalid UUID format', async () => {
    const response = await request(app)
      .post('/api/affiliates?action=configure-wallet')
      .send({ walletId: 'wal_invalidformat12345' }); // Formato antigo, deve retornar 400
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
  
  test('returns 409 for duplicate wallet', async () => {
    // Configurar wallet para afiliado 1
    await request(app)
      .post('/api/affiliates?action=configure-wallet')
      .send({ walletId: 'c0c1688f-636b-42c0-b6ee-7339182276b7' });
    
    // Tentar configurar mesma wallet para afiliado 2
    const response = await request(app)
      .post('/api/affiliates?action=configure-wallet')
      .send({ walletId: 'c0c1688f-636b-42c0-b6ee-7339182276b7' });
    
    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });
});
```


## Implementation Plan

### Phase 1: API Backend (Priority: CRITICAL)

**Tasks:**

1. **Implementar createAsaasAccount action**
   - Adicionar case 'create-asaas-account' em `api/affiliates.js`
   - Implementar função `handleCreateAsaasAccount()`
   - Integrar com API Asaas POST /accounts
   - Validar todos os campos obrigatórios
   - Extrair `walletId` (UUID) e `apiKey` da resposta
   - Opcionalmente armazenar `apiKey` para uso futuro

2. **Implementar configureWallet action**
   - Adicionar case 'configure-wallet' em `api/affiliates.js`
   - Implementar função `handleConfigureWallet()`
   - Validar formato UUID do wallet_id
   - Validar unicidade de wallet_id (constraint UNIQUE do banco)
   - Atualizar campos: wallet_id, financial_status, wallet_configured_at, onboarding_completed
   - Usar transação para garantir atomicidade
   - Nota: NÃO validar via API Asaas (endpoint não disponível para wallets de terceiros)

**Deliverables:**
- ✅ API endpoints implementados
- ✅ Integração com Asaas funcionando
- ✅ Validações de segurança implementadas
- ✅ Testes de API passando

**Nota Importante:** A validação real da existência e status da wallet ocorre implicitamente na primeira tentativa de split de comissão. Erros serão detectados e registrados em logs.

### Phase 2: Frontend Components (Priority: HIGH)

**Tasks:**

1. **Criar página ConfiguracoesFinanceiras**
   - Criar `src/pages/affiliates/ConfiguracoesFinanceiras.tsx`
   - Implementar verificação de status
   - Renderizar opções de configuração
   - Implementar navegação entre fluxos

2. **Criar ExistingWalletForm**
   - Criar `src/components/affiliates/ExistingWalletForm.tsx`
   - Implementar campo de Wallet ID com máscara UUID
   - Implementar validação client-side de formato UUID
   - Integrar com API de configuração (sem validação via Asaas)
   - Implementar feedback visual

3. **Criar CreateAsaasAccountForm**
   - Criar `src/components/affiliates/CreateAsaasAccountForm.tsx`
   - Pré-preencher campos com dados do afiliado
   - Implementar campos adicionais
   - Implementar validações client-side
   - Integrar com API de criação

**Deliverables:**
- ✅ Página de configurações criada
- ✅ Formulários funcionando
- ✅ Validações client-side implementadas
- ✅ Integração com API funcionando

### Phase 3: Status Restrictions (Priority: MEDIUM)

**Tasks:**

1. **Atualizar Dashboard**
   - Modificar `src/pages/affiliates/Dashboard.tsx`
   - Ocultar seção de link para status pendente
   - Exibir mensagem orientando configuração
   - Exibir link apenas para status ativo

2. **Atualizar API de referral-link**
   - Modificar action 'referral-link' em `api/affiliates.js`
   - Verificar financial_status antes de gerar link
   - Retornar erro 403 se status pendente

**Deliverables:**
- ✅ Dashboard atualizado com restrições
- ✅ API validando status
- ✅ Mensagens orientativas exibidas

### Phase 4: Testing & Validation (Priority: HIGH)

**Tasks:**

1. **Testes de Integração com Asaas**
   - Testar criação de conta com API real (sandbox)
   - Verificar extração de `walletId` (UUID) e `apiKey`
   - Verificar tratamento de erros

2. **Testes End-to-End**
   - Testar fluxo completo "Já tenho conta" (validação apenas de formato UUID)
   - Testar fluxo completo "Criar conta"
   - Testar transição de status
   - Testar restrições de acesso
   - Testar detecção de wallet duplicada (constraint UNIQUE)

**Deliverables:**
- ✅ Testes de integração passando
- ✅ Testes E2E passando
- ✅ Cobertura de testes > 70%

**Nota:** Não há testes de validação de wallet via API Asaas, pois o endpoint não está disponível para wallets de terceiros.


## Security Considerations

### API Key Protection

- Chave de API do Asaas armazenada em variável de ambiente
- Nunca expor chave no frontend
- Usar apenas em Serverless Functions

### Data Validation

- Validar formato de Wallet ID em múltiplas camadas
- Validar unicidade antes de salvar
- Validar autenticação em todas as requisições

### Audit Logging

- Registrar todas as tentativas de configuração
- Registrar validações de wallet
- Registrar criações de conta
- Não registrar dados sensíveis completos


## Deployment Strategy

### Deployment Order

1. **Backend First:** Deploy API changes
2. **Frontend Second:** Deploy UI changes
3. **Verification:** Test complete flows

### Rollback Plan

- Reverter deploy do frontend se necessário
- Backend é backward compatible (não quebra sistema existente)
