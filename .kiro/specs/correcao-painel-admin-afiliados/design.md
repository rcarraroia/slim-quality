# Design Document - Correção Painel Admin Afiliados

## Overview

Este documento detalha o design técnico para correção completa do Painel de Administração de Afiliados. A auditoria identificou que o painel está funcional visualmente mas opera com dados mockados. Este design especifica a arquitetura necessária para integração completa com backend real.

### Objetivos

1. Substituir todos os dados mockados por dados reais do banco
2. Implementar APIs REST no backend Python/FastAPI
3. Adicionar validação de permissões (apenas admins)
4. Configurar políticas RLS no Supabase
5. Implementar logs de auditoria
6. Adicionar tratamento robusto de erros

### Escopo

**Páginas a corrigir:**
- `/dashboard/afiliados` - Lista de Afiliados
- `/dashboard/afiliados/comissoes` - Gestão de Comissões  
- `/dashboard/afiliados/solicitacoes` - Solicitações de Saque

**Componentes afetados:**
- `ListaAfiliados.tsx`
- `GestaoComissoes.tsx`
- `Solicitacoes.tsx`
- `affiliate-frontend.service.ts`

## Architecture

### Arquitetura Atual (Problemática)

```
Frontend (React)
    ↓ Query Direta
Supabase Client
    ↓
PostgreSQL Database
```

**Problemas:**
- Sem validação de permissões
- Sem logs de auditoria
- Regras de negócio no frontend
- Difícil manutenção

### Arquitetura Proposta (Corrigida)

```
Frontend (React)
    ↓ HTTP REST
Backend API (FastAPI)
    ↓ Validação + Logs
Supabase Client
    ↓ RLS Policies
PostgreSQL Database
```

**Benefícios:**
- Validação centralizada no backend
- Logs de auditoria automáticos
- Regras de negócio no backend
- Segurança com RLS
- Fácil manutenção


## Components and Interfaces

### Backend Components

#### 1. Admin Affiliates Router (`agent/src/api/admin_affiliates.py`)

**Responsabilidade:** Gerenciar todas as operações administrativas de afiliados

**Endpoints:**
```python
# Métricas do Dashboard
GET /api/admin/affiliates/metrics
Response: {
  total_affiliates: int,
  active_affiliates: int,
  total_commissions_paid: float,
  total_sales: int,
  conversion_rate: float
}

# Listar Afiliados
GET /api/admin/affiliates
Query Params: status?, search?, page?, limit?
Response: {
  data: Affiliate[],
  total: int,
  page: int,
  limit: int
}

# Detalhes de Afiliado
GET /api/admin/affiliates/:id
Response: Affiliate

# Editar Afiliado
PUT /api/admin/affiliates/:id
Body: { name?, email?, phone?, wallet_id?, status? }
Response: Affiliate

# Ativar/Desativar Afiliado
POST /api/admin/affiliates/:id/activate
POST /api/admin/affiliates/:id/deactivate
Body: { reason: string }
Response: { success: boolean, message: string }
```

#### 2. Admin Commissions Router (`agent/src/api/admin_commissions.py`)

**Responsabilidade:** Gerenciar comissões de afiliados

**Endpoints:**
```python
# Listar Comissões
GET /api/admin/commissions
Query Params: status?, level?, affiliate_id?, page?, limit?
Response: {
  data: Commission[],
  total: int,
  metrics: {
    total_pending: float,
    total_paid: float,
    count_pending: int
  }
}

# Detalhes de Comissão
GET /api/admin/commissions/:id
Response: Commission

# Aprovar Comissão
POST /api/admin/commissions/:id/approve
Response: { success: boolean, message: string }

# Rejeitar Comissão
POST /api/admin/commissions/:id/reject
Body: { reason: string }
Response: { success: boolean, message: string }

# Exportar Relatório
POST /api/admin/commissions/export
Body: { format: 'csv' | 'pdf', filters: {...} }
Response: { download_url: string }
```


#### 3. Admin Withdrawals Router (`agent/src/api/admin_withdrawals.py`)

**Responsabilidade:** Gerenciar solicitações de saque

**Endpoints:**
```python
# Listar Solicitações
GET /api/admin/withdrawals
Query Params: status?, affiliate_id?, page?, limit?
Response: {
  data: Withdrawal[],
  total: int,
  metrics: {
    total_pending: float,
    total_processed: float,
    count_pending: int
  }
}

# Detalhes de Solicitação
GET /api/admin/withdrawals/:id
Response: Withdrawal

# Aprovar Saque
POST /api/admin/withdrawals/:id/approve
Response: { success: boolean, message: string }

# Rejeitar Saque
POST /api/admin/withdrawals/:id/reject
Body: { reason: string }
Response: { success: boolean, message: string }
```

#### 4. Asaas Validation Service (`agent/src/services/asaas_validator.py`)

**Responsabilidade:** Validar Wallet IDs do Asaas

**Métodos:**
```python
class AsaasValidator:
    async def validate_wallet(wallet_id: str) -> ValidationResult:
        """
        Valida Wallet ID via API Asaas
        Cacheia resultado por 24h
        """
        
    async def get_wallet_info(wallet_id: str) -> WalletInfo:
        """
        Busca informações da carteira
        """
```

#### 5. Audit Logger Service (`agent/src/services/audit_logger.py`)

**Responsabilidade:** Registrar logs de auditoria

**Métodos:**
```python
class AuditLogger:
    async def log_action(
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: dict
    ):
        """
        Registra ação administrativa
        Salva em audit_logs table
        """
```

### Frontend Components

#### 1. Admin Affiliates Service (`src/services/admin-affiliates.service.ts`)

**Responsabilidade:** Comunicação com APIs de afiliados

**Métodos:**
```typescript
class AdminAffiliatesService {
  // Métricas
  async getMetrics(): Promise<AffiliateMetrics>
  
  // CRUD
  async getAll(filters?: AffiliateFilters): Promise<PaginatedResponse<Affiliate>>
  async getById(id: string): Promise<Affiliate>
  async update(id: string, data: Partial<Affiliate>): Promise<Affiliate>
  
  // Ações
  async activate(id: string): Promise<void>
  async deactivate(id: string, reason: string): Promise<void>
}
```

#### 2. Admin Commissions Service (`src/services/admin-commissions.service.ts`)

**Responsabilidade:** Comunicação com APIs de comissões

**Métodos:**
```typescript
class AdminCommissionsService {
  // Listagem
  async getAll(filters?: CommissionFilters): Promise<PaginatedResponse<Commission>>
  async getById(id: string): Promise<Commission>
  
  // Ações
  async approve(id: string): Promise<void>
  async reject(id: string, reason: string): Promise<void>
  
  // Relatórios
  async export(format: 'csv' | 'pdf', filters: CommissionFilters): Promise<string>
}
```


#### 3. Admin Withdrawals Service (`src/services/admin-withdrawals.service.ts`)

**Responsabilidade:** Comunicação com APIs de saques

**Métodos:**
```typescript
class AdminWithdrawalsService {
  // Listagem
  async getAll(filters?: WithdrawalFilters): Promise<PaginatedResponse<Withdrawal>>
  async getById(id: string): Promise<Withdrawal>
  
  // Ações
  async approve(id: string): Promise<void>
  async reject(id: string, reason: string): Promise<void>
}
```

#### 4. Permission Guard Hook (`src/hooks/usePermission.ts`)

**Responsabilidade:** Validar permissões no frontend

**Uso:**
```typescript
const usePermission = (requiredRole: 'admin' | 'super_admin') => {
  const { user } = useAuth();
  const hasPermission = user?.role === requiredRole || user?.role === 'super_admin';
  
  return { hasPermission, user };
}
```

## Data Models

### Database Schema

#### Tabela: `affiliates`
```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  wallet_id VARCHAR(50) NOT NULL,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

#### Tabela: `commissions`
```sql
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  order_id UUID REFERENCES orders(id),
  level VARCHAR(10) NOT NULL, -- 'N1', 'N2', 'N3'
  amount_cents INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: `withdrawals`
```sql
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  requested_amount_cents INTEGER NOT NULL,
  fee_amount_cents INTEGER NOT NULL,
  net_amount_cents INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: `audit_logs` (Nova)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### TypeScript Interfaces

```typescript
// Affiliate
interface Affiliate {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  wallet_id: string;
  referral_code: string;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Commission
interface Commission {
  id: string;
  affiliate_id: string;
  order_id: string;
  level: 'N1' | 'N2' | 'N3';
  amount_cents: number;
  percentage: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  
  // Joins
  affiliate?: Affiliate;
  order?: Order;
}

// Withdrawal
interface Withdrawal {
  id: string;
  affiliate_id: string;
  requested_amount_cents: number;
  fee_amount_cents: number;
  net_amount_cents: number;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  processed_at?: string;
  created_at: string;
  
  // Joins
  affiliate?: Affiliate;
}

// Audit Log
interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}
```


## Correctness Properties

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas de um sistema - essencialmente, uma declaração formal sobre o que o sistema deve fazer. Propriedades servem como a ponte entre especificações legíveis por humanos e garantias de correção verificáveis por máquina.*

### Property Reflection

Após análise do prework, identifiquei as seguintes redundâncias:

**Redundâncias Identificadas:**
1. Propriedades 2.2 e 2.3 (aprovar/rejeitar solicitações) podem ser combinadas em uma propriedade sobre mudança de status
2. Propriedades 7.1 e 7.3 (desativar/reativar) são similares e podem ser combinadas
3. Propriedades 7.2 e 7.4 (impedir/permitir comissões) são inversas e podem ser uma única propriedade
4. Propriedades 3.2 e 3.3 (busca e filtro) são comportamentos similares de filtragem
5. Propriedades 5.2 e 5.3 (filtros de comissão) são comportamentos similares de filtragem
6. Propriedades 2.5, 6.3 e 9.1 (validação de Wallet ID) são a mesma validação em contextos diferentes

**Propriedades Consolidadas:**
- Mudança de status de solicitações (aprovar/rejeitar)
- Mudança de status de afiliados (ativar/desativar)
- Regras de comissão baseadas em status
- Filtragem genérica de dados
- Validação de Wallet ID (única propriedade para todos os contextos)

### Correctness Properties List

**Property 1: Métricas do Dashboard Refletem Dados Reais**
*For any* conjunto de afiliados, comissões e vendas no banco de dados, as métricas calculadas pelo dashboard devem corresponder exatamente aos valores agregados dos dados reais.
**Validates: Requirements 1.1, 1.2**

**Property 2: Mudança de Status de Solicitações Persiste Corretamente**
*For any* solicitação de afiliado e qualquer mudança de status válida (pending → approved ou pending → rejected), após executar a ação, o status no banco de dados deve refletir a mudança e incluir metadados apropriados (aprovador, data, motivo se rejeitado).
**Validates: Requirements 2.2, 2.3**

**Property 3: Validação de Wallet ID Impede Cadastros Inválidos**
*For any* Wallet ID fornecido, o sistema deve validar via API Asaas antes de aprovar um afiliado, e apenas IDs válidos e ativos devem permitir aprovação.
**Validates: Requirements 2.5, 6.3, 9.1**

**Property 4: Filtragem de Dados Retorna Apenas Resultados Correspondentes**
*For any* lista de dados (afiliados, comissões, saques) e qualquer critério de filtro (status, nome, email, período, afiliado_id), os resultados retornados devem conter apenas itens que correspondem exatamente ao critério especificado.
**Validates: Requirements 3.2, 3.3, 5.2, 5.3**

**Property 5: Ordenação de Dados Mantém Ordem Correta**
*For any* lista de dados e qualquer critério de ordenação (nome, data, valor), os resultados devem estar ordenados corretamente segundo o critério, seja ascendente ou descendente.
**Validates: Requirements 3.4**

**Property 6: Estrutura de Rede Genealógica Reflete Relacionamentos Reais**
*For any* conjunto de afiliados com relacionamentos N1/N2/N3 no banco, a árvore genealógica retornada deve representar corretamente todos os relacionamentos, com métricas calculadas para cada nível correspondendo aos dados reais.
**Validates: Requirements 4.1, 4.2, 4.5**

**Property 7: Exportação de Relatórios Contém Dados Completos e Corretos**
*For any* conjunto de comissões e critérios de filtro, o arquivo exportado deve conter exatamente os mesmos dados que seriam exibidos na interface, sem perda ou corrupção de informação.
**Validates: Requirements 5.4**

**Property 8: Edição de Dados Persiste Todas as Mudanças**
*For any* afiliado e qualquer conjunto de campos válidos a serem editados, após salvar, todos os campos modificados devem estar atualizados no banco de dados e um log de auditoria deve ser criado com detalhes completos da mudança.
**Validates: Requirements 6.2, 6.5**

**Property 9: Mudança de Status de Afiliado Afeta Comissões Corretamente**
*For any* afiliado, quando seu status muda para "inactive", nenhuma nova comissão deve ser criada para ele; quando reativado para "active", novas comissões devem ser permitidas novamente.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

**Property 10: Cache de Validação de Wallet Evita Chamadas Redundantes**
*For any* Wallet ID já validado, validações subsequentes dentro de 24 horas devem usar o resultado cacheado sem fazer nova chamada à API Asaas, mas após 24 horas uma nova validação deve ser executada.
**Validates: Requirements 9.5**

**Property 11: Logs de Auditoria Registram Todas as Ações Administrativas**
*For any* ação administrativa (aprovar, rejeitar, editar, ativar, desativar), um log de auditoria deve ser criado contendo user_id, action, resource_type, resource_id, timestamp e detalhes relevantes da ação.
**Validates: Requirements 6.5, 7.5**


## Error Handling

### Backend Error Handling

#### 1. Validation Errors (400 Bad Request)
```python
class ValidationError(Exception):
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message

# Exemplo de uso
if not is_valid_email(email):
    raise ValidationError("email", "Email inválido")
```

#### 2. Permission Errors (403 Forbidden)
```python
class PermissionError(Exception):
    def __init__(self, message: str = "Sem permissão para esta ação"):
        self.message = message

# Exemplo de uso
if user.role not in ['admin', 'super_admin']:
    raise PermissionError()
```

#### 3. Not Found Errors (404 Not Found)
```python
class NotFoundError(Exception):
    def __init__(self, resource: str, id: str):
        self.message = f"{resource} com ID {id} não encontrado"

# Exemplo de uso
affiliate = await get_affiliate(id)
if not affiliate:
    raise NotFoundError("Afiliado", id)
```

#### 4. External API Errors (502 Bad Gateway)
```python
class ExternalAPIError(Exception):
    def __init__(self, service: str, message: str):
        self.service = service
        self.message = message

# Exemplo de uso
try:
    result = await asaas_client.validate_wallet(wallet_id)
except Exception as e:
    raise ExternalAPIError("Asaas", str(e))
```

#### 5. Database Errors (500 Internal Server Error)
```python
class DatabaseError(Exception):
    def __init__(self, operation: str, details: str):
        self.operation = operation
        self.details = details

# Exemplo de uso
try:
    await supabase.table('affiliates').insert(data)
except Exception as e:
    raise DatabaseError("insert", str(e))
```

### Frontend Error Handling

#### 1. API Error Handler
```typescript
class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

async function handleAPIError(response: Response): Promise<never> {
  const data = await response.json();
  
  switch (response.status) {
    case 400:
      toast.error(`Erro de validação: ${data.message}`);
      break;
    case 403:
      toast.error('Você não tem permissão para esta ação');
      break;
    case 404:
      toast.error('Recurso não encontrado');
      break;
    case 502:
      toast.error('Erro ao comunicar com serviço externo. Tente novamente.');
      break;
    default:
      toast.error('Erro inesperado. Tente novamente.');
  }
  
  throw new APIError(response.status, data.message, data.details);
}
```

#### 2. Loading States
```typescript
interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
}

// Hook customizado
function useAsyncData<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<LoadingState<T>>({
    isLoading: true,
    error: null,
    data: null
  });
  
  useEffect(() => {
    fetcher()
      .then(data => setState({ isLoading: false, error: null, data }))
      .catch(error => setState({ isLoading: false, error, data: null }));
  }, []);
  
  return state;
}
```

#### 3. Retry Logic
```typescript
async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Error Logging

#### Backend Logging
```python
import logging

logger = logging.getLogger(__name__)

try:
    # Operação
    pass
except Exception as e:
    logger.error(
        f"Erro ao processar {operation}",
        extra={
            "user_id": user.id,
            "resource_id": resource_id,
            "error": str(e),
            "stack_trace": traceback.format_exc()
        }
    )
    raise
```

#### Frontend Logging
```typescript
class ErrorLogger {
  static log(error: Error, context?: Record<string, any>) {
    console.error('Error:', error);
    console.error('Context:', context);
    
    // Enviar para serviço de monitoramento (Sentry, etc)
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error, { extra: context });
    }
  }
}
```


## Testing Strategy

### Dual Testing Approach

Este projeto utilizará uma abordagem dupla de testes:

1. **Unit Tests:** Verificar exemplos específicos, casos extremos e condições de erro
2. **Property Tests:** Verificar propriedades universais através de todos os inputs

Ambos são complementares e necessários para cobertura abrangente.

### Property-Based Testing

**Framework:** Hypothesis (Python) para backend

**Configuração:**
- Mínimo 100 iterações por teste de propriedade
- Cada teste deve referenciar sua propriedade do documento de design
- Tag format: `# Feature: correcao-painel-admin-afiliados, Property {number}: {property_text}`

**Exemplo de Property Test:**
```python
from hypothesis import given, strategies as st
import pytest

# Feature: correcao-painel-admin-afiliados, Property 1: Métricas do Dashboard Refletem Dados Reais
@given(
    affiliates=st.lists(st.builds(Affiliate), min_size=0, max_size=100),
    commissions=st.lists(st.builds(Commission), min_size=0, max_size=500)
)
@pytest.mark.property_test
async def test_dashboard_metrics_reflect_real_data(affiliates, commissions):
    # Inserir dados no banco
    for affiliate in affiliates:
        await db.insert('affiliates', affiliate)
    for commission in commissions:
        await db.insert('commissions', commission)
    
    # Buscar métricas
    metrics = await admin_service.get_metrics()
    
    # Verificar que métricas correspondem aos dados
    assert metrics.total_affiliates == len(affiliates)
    assert metrics.total_commissions_paid == sum(
        c.amount_cents for c in commissions if c.status == 'paid'
    )
```

### Unit Testing

**Framework:** Pytest (Python) para backend, Vitest (TypeScript) para frontend

**Foco dos Unit Tests:**
- Exemplos específicos de uso
- Casos extremos (edge cases)
- Condições de erro
- Integração entre componentes

**Exemplo de Unit Test:**
```python
@pytest.mark.asyncio
async def test_approve_affiliate_with_invalid_wallet_id():
    # Arrange
    affiliate = create_test_affiliate(wallet_id="invalid_wallet")
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc:
        await admin_service.approve_affiliate(affiliate.id)
    
    assert "Wallet ID inválido" in str(exc.value)
```

### Integration Testing

**Foco:** Testar fluxos completos end-to-end

**Exemplo:**
```python
@pytest.mark.integration
async def test_complete_affiliate_approval_flow():
    # 1. Criar solicitação
    affiliate = await create_affiliate_request()
    
    # 2. Aprovar
    result = await admin_service.approve_affiliate(affiliate.id)
    
    # 3. Verificar status atualizado
    updated = await db.get_affiliate(affiliate.id)
    assert updated.status == 'active'
    
    # 4. Verificar log de auditoria
    logs = await db.get_audit_logs(resource_id=affiliate.id)
    assert len(logs) == 1
    assert logs[0].action == 'approve_affiliate'
    
    # 5. Verificar notificação enviada
    notifications = await db.get_notifications(affiliate_id=affiliate.id)
    assert len(notifications) == 1
```

### Test Coverage Goals

**Objetivo:** > 80% de cobertura de código

**Prioridades:**
1. **Crítico (100% cobertura):**
   - Validação de Wallet ID
   - Mudanças de status
   - Cálculo de métricas
   - Logs de auditoria

2. **Alto (> 90% cobertura):**
   - APIs REST
   - Serviços de negócio
   - Filtragem e busca

3. **Médio (> 70% cobertura):**
   - Utilitários
   - Formatadores
   - Helpers

### Test Organization

```
tests/
├── unit/
│   ├── services/
│   │   ├── test_admin_affiliates_service.py
│   │   ├── test_admin_commissions_service.py
│   │   └── test_asaas_validator.py
│   └── api/
│       ├── test_admin_affiliates_routes.py
│       └── test_admin_commissions_routes.py
├── integration/
│   ├── test_affiliate_approval_flow.py
│   ├── test_commission_management_flow.py
│   └── test_withdrawal_processing_flow.py
└── property/
    ├── test_dashboard_metrics_properties.py
    ├── test_filtering_properties.py
    └── test_status_change_properties.py
```

### Running Tests

```bash
# Todos os testes
pytest

# Apenas unit tests
pytest tests/unit/

# Apenas property tests
pytest -m property_test

# Apenas integration tests
pytest -m integration

# Com cobertura
pytest --cov=src --cov-report=html
```


## Security Considerations

### Authentication & Authorization

#### 1. JWT Token Validation
```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        return await get_user(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
```

#### 2. Role-Based Access Control
```python
def require_admin(user: User = Depends(get_current_user)):
    if user.role not in ['admin', 'super_admin']:
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores podem acessar este recurso"
        )
    return user
```

### Row Level Security (RLS)

#### Políticas para `affiliates`
```sql
-- Admins veem todos os afiliados
CREATE POLICY "Admins view all affiliates"
  ON affiliates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Afiliados veem apenas seus próprios dados
CREATE POLICY "Affiliates view own data"
  ON affiliates FOR SELECT
  USING (user_id = auth.uid());
```

#### Políticas para `commissions`
```sql
-- Admins veem todas as comissões
CREATE POLICY "Admins view all commissions"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Afiliados veem apenas suas comissões
CREATE POLICY "Affiliates view own commissions"
  ON commissions FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid()
    )
  );
```

### Data Validation

#### Input Sanitization
```python
from pydantic import BaseModel, EmailStr, validator

class AffiliateUpdate(BaseModel):
    name: Optional[str]
    email: Optional[EmailStr]
    phone: Optional[str]
    wallet_id: Optional[str]
    
    @validator('name')
    def validate_name(cls, v):
        if v and len(v) < 3:
            raise ValueError('Nome deve ter pelo menos 3 caracteres')
        return v
    
    @validator('wallet_id')
    def validate_wallet_id(cls, v):
        if v and not v.startswith('wal_'):
            raise ValueError('Wallet ID inválido')
        return v
```

### Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/admin/affiliates")
@limiter.limit("100/minute")
async def get_affiliates():
    pass
```

### Audit Logging

Todas as ações administrativas devem ser registradas:

```python
async def log_admin_action(
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    details: dict,
    request: Request
):
    await db.insert('audit_logs', {
        'user_id': user_id,
        'action': action,
        'resource_type': resource_type,
        'resource_id': resource_id,
        'details': details,
        'ip_address': request.client.host,
        'user_agent': request.headers.get('user-agent'),
        'created_at': datetime.now()
    })
```

## Performance Considerations

### Database Optimization

#### 1. Índices Necessários
```sql
-- Índices para queries frequentes
CREATE INDEX idx_affiliates_status ON affiliates(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_affiliates_email ON affiliates(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_commissions_affiliate_id ON commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_withdrawals_affiliate_id ON withdrawals(affiliate_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

#### 2. Query Optimization
```python
# Usar select específico ao invés de SELECT *
query = supabase.table('affiliates').select(
    'id, name, email, status, created_at'
)

# Usar joins eficientes
query = supabase.table('commissions').select(
    '''
    *,
    affiliate:affiliates(name, email),
    order:orders(id, total_amount)
    '''
)
```

### Caching Strategy

#### 1. Cache de Validação de Wallet
```python
from redis import Redis
import json

redis_client = Redis(host='localhost', port=6379, db=0)

async def validate_wallet_cached(wallet_id: str) -> bool:
    # Verificar cache
    cached = redis_client.get(f"wallet_validation:{wallet_id}")
    if cached:
        return json.loads(cached)
    
    # Validar via API
    result = await asaas_client.validate_wallet(wallet_id)
    
    # Cachear por 24 horas
    redis_client.setex(
        f"wallet_validation:{wallet_id}",
        86400,  # 24 horas
        json.dumps(result)
    )
    
    return result
```

#### 2. Cache de Métricas
```python
# Cachear métricas por 5 minutos
@cache(ttl=300)
async def get_dashboard_metrics():
    return await calculate_metrics()
```

### Pagination

```python
@router.get("/api/admin/affiliates")
async def get_affiliates(
    page: int = 1,
    limit: int = 50,
    status: Optional[str] = None
):
    offset = (page - 1) * limit
    
    query = supabase.table('affiliates').select('*', count='exact')
    
    if status:
        query = query.eq('status', status)
    
    result = query.range(offset, offset + limit - 1).execute()
    
    return {
        'data': result.data,
        'total': result.count,
        'page': page,
        'limit': limit,
        'pages': math.ceil(result.count / limit)
    }
```

## Deployment Strategy

### Backend Deployment

1. **Build Docker Image:**
```bash
cd agent
docker build -t renumvscode/slim-agent:latest .
```

2. **Push to Docker Hub:**
```bash
docker push renumvscode/slim-agent:latest
```

3. **Rebuild on EasyPanel:**
- Acessar EasyPanel Dashboard
- Selecionar service `slim-agent`
- Clicar em "Rebuild"

### Frontend Deployment

1. **Commit & Push:**
```bash
git add .
git commit -m "feat: correção painel admin afiliados"
git push origin main
```

2. **Deploy Automático:**
- Vercel detecta push automaticamente
- Build e deploy em ~2 minutos
- Verificar em https://slimquality.com.br

### Database Migrations

```bash
# Aplicar migrations via Supabase Power
# Usar Power: Supabase Hosted Development
# Executar SQL migrations na ordem correta
```

### Environment Variables

**Backend (.env):**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
ASAAS_API_KEY=xxx
REDIS_URL=redis://localhost:6379
JWT_SECRET=xxx
```

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_API_URL=https://api.slimquality.com.br
```

---

**Documento criado:** 05/01/2026  
**Baseado em:** requirements.md + AUDITORIA_PAINEL_ADMIN_AFILIADOS.md  
**Status:** Pronto para revisão
