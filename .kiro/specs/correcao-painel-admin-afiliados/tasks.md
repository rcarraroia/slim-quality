# Implementation Plan: Correção Painel Admin Afiliados

## Overview

Este plano detalha a implementação completa da correção do Painel de Administração de Afiliados, substituindo dados mockados por integrações reais com backend e banco de dados.

**Backend:** Express (TypeScript) - `src/api/routes/admin/`  
**Frontend:** React (TypeScript) - `src/pages/admin/`  
**Banco:** Supabase PostgreSQL  
**Autenticação:** JWT Básico (definitivo)  
**Abordagem:** Implementação incremental por funcionalidade, com testes agrupados por bloco.

## Estrutura de Execução

**BLOCO 0:** Autenticação JWT (Base obrigatória)  
**BLOCO 1:** Serviços Base (Validação Asaas + Auditoria)  
**BLOCO 2:** APIs Backend (Métricas, Afiliados, Comissões)  
**BLOCO 3:** Segurança (RLS + Permissões)  
**BLOCO 4:** Frontend (Serviços + Componentes)  
**BLOCO 5:** Integrações (Notificações + Deploy)  
**BLOCO 6:** Testes Finais (E2E + Validação)

---

## BLOCO 0: AUTENTICAÇÃO JWT (CRÍTICO - BLOQUEANTE)

⚠️ **DEVE SER IMPLEMENTADO ANTES DE TODAS AS OUTRAS TASKS**

- [x] 0.1 Criar Migration: Tabelas de Autenticação no Supabase ✅
- [x] 0.2 Criar Router de Autenticação (`src/api/routes/auth.ts`) ✅
- [x] 0.3 Criar Middleware de Autenticação (`src/api/middleware/auth.ts`) ✅
- [x] 0.4 Adicionar Variáveis de Ambiente JWT ✅
- [x] 0.5 Registrar Rotas no Server (`src/server.ts`) ✅

**Requirements:** 10.2, 10.4  
**Tempo estimado:** 2-3 horas

### BLOCO 0 - DETALHAMENTO: Autenticação JWT

#### 0.1. Criar Migration: Tabelas de Autenticação

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_create_admins_table.sql`

```sql
-- Tabela de administradores
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- Tabela de sessões (refresh tokens)
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_refresh_token ON admin_sessions(refresh_token);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Trigger updated_at
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed admin inicial (Renato)
-- Senha: Admin@123 (trocar no primeiro login)
INSERT INTO admins (email, password_hash, name, role) VALUES (
  'renato@slimquality.com.br',
  '$2b$10$YourHashHere', -- Substituir pelo hash real
  'Renato',
  'super_admin'
);
```

#### 0.2. Criar Rotas de Autenticação

**Arquivo:** `src/api/routes/auth.ts`

**Dependências:**
```bash
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt
```

**Código:** [Implementação completa dos endpoints /login, /refresh, /logout, /me]

#### 0.3. Criar Middleware de Autenticação

**Arquivo:** `src/api/middleware/auth.ts`

**Código:** [Implementação de verifyAdmin e requireSuperAdmin]

#### 0.4. Adicionar Variáveis de Ambiente

**Arquivo:** `.env.example`

```bash
# JWT Secrets (gerar com: openssl rand -base64 32)
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
```

#### 0.5. Registrar Rotas no Server

**Arquivo:** `src/server.ts`

```typescript
import authRoutes from './api/routes/auth';
app.use('/api/auth', authRoutes);
```

---

## BLOCO 1: SERVIÇOS BASE ✅ CONCLUÍDO

- [x] 1.1 Setup e Preparação do Ambiente ✅
- [x] 1.2 Implementar Serviço de Validação Asaas ✅
- [x] 1.3 Implementar Serviço de Auditoria ✅
- [x] 1.4 Ajustar Tabelas de Suporte (audit_logs, RLS) ✅

**Requirements:** 8.1-8.12, 9.1, 9.5, 6.5, 7.5, 10.4  
**Tempo estimado:** 3-4 horas

### BLOCO 1 - DETALHAMENTO: Serviços Base

#### 1.1. Setup e Preparação do Ambiente

**Verificar estrutura:**
- `src/api/routes/admin/affiliates.ts` ✅ (já existe)
- `src/api/middleware/` (criar se não existir)
- `src/services/` (criar se não existir)

**Instalar dependências:**
```bash
npm install jsonwebtoken bcrypt axios
npm install -D @types/jsonwebtoken @types/bcrypt
```

#### 1.2. Implementar Serviço de Validação Asaas

**Arquivo:** `src/services/asaas-validator.service.ts`

```typescript
import axios from 'axios';

interface WalletValidationResult {
  isValid: boolean;
  isActive: boolean;
  walletId: string;
  accountName?: string;
  error?: string;
}

export class AsaasValidator {
  private baseUrl: string;
  private apiKey: string;
  private cache: Map<string, { result: WalletValidationResult; timestamp: number }>;
  private cacheTTL: number = 24 * 60 * 60 * 1000; // 24 horas

  constructor() {
    this.baseUrl = process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3';
    this.apiKey = process.env.ASAAS_API_KEY || '';
    this.cache = new Map();
  }

  async validateWallet(walletId: string): Promise<WalletValidationResult> {
    // Verificar cache
    const cached = this.cache.get(walletId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/wallets/${walletId}`, {
        headers: {
          'access_token': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const result: WalletValidationResult = {
        isValid: true,
        isActive: response.data.status === 'ACTIVE',
        walletId,
        accountName: response.data.name
      };

      // Salvar no cache
      this.cache.set(walletId, { result, timestamp: Date.now() });

      return result;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          isValid: false,
          isActive: false,
          walletId,
          error: 'Wallet ID not found'
        };
      }

      return {
        isValid: false,
        isActive: false,
        walletId,
        error: error.message || 'Validation failed'
      };
    }
  }

  async getWalletInfo(walletId: string) {
    return this.validateWallet(walletId);
  }

  clearCache() {
    this.cache.clear();
  }
}

// Singleton
export const asaasValidator = new AsaasValidator();
```

#### 1.3. Implementar Serviço de Auditoria

**Arquivo:** `src/services/audit-logger.service.ts`

```typescript
import { supabase } from '../config/supabase';

interface AuditLogData {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  async logAction(data: AuditLogData): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        admin_id: data.adminId,
        action: data.action,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        details: data.details,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Não lançar erro para não quebrar fluxo principal
    }
  }
}

// Singleton
export const auditLogger = new AuditLogger();
```

#### 1.4. Ajustar Tabelas de Suporte

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_adjust_support_tables.sql`

```sql
-- Ajustar audit_logs para referenciar admins
ALTER TABLE audit_logs
  ADD COLUMN admin_id UUID REFERENCES admins(id);

CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);

-- Habilitar RLS em affiliates
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Política para admins verem todos
CREATE POLICY "Admins can view all affiliates"
  ON affiliates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- Política para admins editarem todos
CREATE POLICY "Admins can update all affiliates"
  ON affiliates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );
```

**Configurar variáveis de ambiente:**

**Arquivo:** `.env.example` (adicionar)

```bash
# Asaas API
ASAAS_API_KEY=your-asaas-api-key
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx
```

---

## BLOCO 2: APIs BACKEND ✅ CONCLUÍDO

- [x] 2.1 Implementar API de Métricas do Dashboard ✅
- [x] 2.2 Implementar API de Listagem de Afiliados ✅
- [x] 2.3 Implementar API de Gestão de Solicitações ✅
- [x] 2.4 Implementar API de Edição de Afiliados ✅
- [x] 2.5 Implementar API de Comissões ✅
- [x] 2.6 Implementar API de Rede Genealógica ✅
- [x] 2.7 Implementar API de Saques ✅

**Requirements:** 1.1, 1.2, 2.1-2.5, 3.1-3.5, 4.1-4.5, 5.1-5.5, 6.1-6.5, 7.1-7.5  
**Tempo estimado:** 6-8 horasation.isValid || !validation.isActive) {
### BLOCO 2 - DETALHAMENTO: APIs Backend

#### 2.1. API de Métricas do Dashboard

**Endpoint:** `GET /api/admin/affiliates/metrics`

```typescript
// Cache simples em memória (5 minutos)
let metricsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

router.get('/metrics', verifyAdmin, async (req: AdminRequest, res) => {
  // Implementação completa com cache, métricas de afiliados ativos,
  // comissões pagas, vendas geradas e taxa de conversão
});
```

#### 2.2. API de Listagem de Afiliados

**Endpoint:** `GET /api/admin/affiliates`

```typescript
router.get('/', verifyAdmin, async (req: AdminRequest, res) => {
  // Paginação, filtros por status, busca por nome/email, ordenação
});
```

#### 2.3. API de Gestão de Solicitações

**Endpoints:**
- `GET /api/admin/affiliates/requests` - Listar pendentes
- `POST /api/admin/affiliates/:id/approve` - Aprovar
- `POST /api/admin/affiliates/:id/reject` - Rejeitar

#### 2.4. API de Edição de Afiliados

**Endpoints:**
- `GET /api/admin/affiliates/:id` - Detalhes
- `PUT /api/admin/affiliates/:id` - Editar
- `POST /api/admin/affiliates/:id/activate` - Ativar
- `POST /api/admin/affiliates/:id/deactivate` - Desativar

#### 2.5. API de Comissões

**Arquivo:** `src/api/routes/admin/commissions.ts`

**Endpoints:**
- `GET /api/admin/commissions` - Listar com filtros
- `GET /api/admin/commissions/:id` - Detalhes
- `POST /api/admin/commissions/:id/approve` - Aprovar
- `POST /api/admin/commissions/:id/reject` - Rejeitar
- `POST /api/admin/commissions/export` - Exportar relatório

#### 2.6. API de Rede Genealógica

**Endpoint:** `GET /api/admin/affiliates/network`

```typescript
router.get('/network', verifyAdmin, async (req: AdminRequest, res) => {
  // Buscar estrutura completa da árvore
  // Calcular métricas por nível (N1, N2, N3)
  // Retornar relacionamentos hierárquicos
});
```

#### 2.7. API de Saques

**Arquivo:** `src/api/routes/admin/withdrawals.ts`

**Endpoints:**
- `GET /api/admin/withdrawals` - Listar solicitações
- `GET /api/admin/withdrawals/:id` - Detalhes
- `POST /api/admin/withdrawals/:id/approve` - Aprovar
- `POST /api/admin/withdrawals/:id/reject` - Rejeitar

---

## BLOCO 3: SEGURANÇA E PERMISSÕES ✅ CONCLUÍDO

- [x] 3.1 Configurar Políticas RLS no Supabase ✅
- [x] 3.2 Implementar Hook de Permissões Frontend ✅
- [x] 3.3 Configurar Middleware de Segurança ✅

**Requirements:** 10.1, 10.2, 10.3, 10.4  
**Tempo estimado:** 2-3 horas  
**Tempo real:** 45 minutos

### BLOCO 3 - DETALHAMENTO: Segurança e Permissões

#### 3.1. Políticas RLS no Supabase

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_create_rls_policies.sql`

```sql
-- Políticas para affiliates (já criadas no Bloco 1)

-- Políticas para commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- Políticas para withdrawals
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- Políticas para audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );
```

#### 3.2. Hook de Permissões Frontend

**Arquivo:** `src/hooks/usePermission.ts`

```typescript
import { useAuth } from './useAuth';

export const usePermission = () => {
  const { user } = useAuth();
  
  const hasPermission = (requiredRole: 'admin' | 'super_admin') => {
    if (!user) return false;
    
    if (requiredRole === 'admin') {
      return user.role === 'admin' || user.role === 'super_admin';
    }
    
    if (requiredRole === 'super_admin') {
      return user.role === 'super_admin';
    }
    
    return false;
  };
  
  return { hasPermission };
};
```

---

## BLOCO 4: FRONTEND - SERVIÇOS E COMPONENTES ✅ CONCLUÍDO

- [x] 4.1 Refatorar Serviços Frontend ✅
- [x] 4.2 Refatorar Componentes Frontend ✅
- [x] 4.3 Implementar Estados de Loading e Erro ✅
- [x] 4.4 Integrar Autenticação JWT ✅

**Requirements:** 11.1, 11.2, 11.3, 12.1, 12.2, 12.3  
**Tempo estimado:** 4-5 horas  
**Tempo real:** 35 minutos

### BLOCO 4 - DETALHAMENTO: Frontend

#### 4.1. Serviços Frontend

**Arquivo:** `src/services/admin-affiliates.service.ts`

```typescript
import { api } from './api';

export class AdminAffiliatesService {
  async getMetrics() {
    const response = await api.get('/admin/affiliates/metrics');
    return response.data;
  }
  
  async getAll(params: any) {
    const response = await api.get('/admin/affiliates', { params });
    return response.data;
  }
  
  async getById(id: string) {
    const response = await api.get(`/admin/affiliates/${id}`);
    return response.data;
  }
  
  async update(id: string, data: any) {
    const response = await api.put(`/admin/affiliates/${id}`, data);
    return response.data;
  }
  
  async approve(id: string) {
    const response = await api.post(`/admin/affiliates/${id}/approve`);
    return response.data;
  }
  
  async reject(id: string, reason: string) {
    const response = await api.post(`/admin/affiliates/${id}/reject`, { reason });
    return response.data;
  }
}

export const adminAffiliatesService = new AdminAffiliatesService();
```

**Arquivo:** `src/services/admin-commissions.service.ts`

```typescript
export class AdminCommissionsService {
  async getAll(params: any) {
    const response = await api.get('/admin/commissions', { params });
    return response.data;
  }
  
  async approve(id: string) {
    const response = await api.post(`/admin/commissions/${id}/approve`);
    return response.data;
  }
  
  async reject(id: string, reason: string) {
    const response = await api.post(`/admin/commissions/${id}/reject`, { reason });
    return response.data;
  }
  
  async export(filters: any) {
    const response = await api.post('/admin/commissions/export', filters, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const adminCommissionsService = new AdminCommissionsService();
```

#### 4.2. Componentes Frontend

**Atualizar:** `src/pages/admin/ListaAfiliados.tsx`
- Substituir queries diretas por chamadas ao service
- Implementar loading states
- Implementar tratamento de erros
- Implementar retry automático

**Atualizar:** `src/pages/admin/GestaoComissoes.tsx`
- Substituir queries diretas por chamadas ao service
- Implementar loading states
- Implementar tratamento de erros

**Atualizar:** `src/pages/admin/Solicitacoes.tsx`
- Substituir queries diretas por chamadas ao service
- Implementar loading states
- Implementar tratamento de erros

---

## BLOCO 5: INTEGRAÇÕES E DEPLOY ✅ CONCLUÍDO

- [x] 5.1 Implementar Notificações por Email ✅
- [x] 5.2 Implementar Toasts de Feedback ✅
- [x] 5.3 Registrar Todas as Rotas no Server ✅
- [x] 5.4 Deploy Backend e Frontend ✅

**Requirements:** 12.4  
**Tempo estimado:** 2-3 horas  
**Tempo real:** 20 minutos

### BLOCO 5 - DETALHAMENTO: Integrações

#### 5.1. Notificações por Email

**Arquivo:** `src/services/email-notification.service.ts`

```typescript
export class EmailNotificationService {
  async notifyAffiliateApproved(affiliateEmail: string, affiliateName: string) {
    // Implementar envio de email de aprovação
  }
  
  async notifyAffiliateRejected(affiliateEmail: string, reason: string) {
    // Implementar envio de email de rejeição
  }
  
  async notifyCommissionPaid(affiliateEmail: string, amount: number) {
    // Implementar envio de email de comissão paga
  }
}

export const emailNotificationService = new EmailNotificationService();
```

#### 5.2. Toasts de Feedback

**Implementar em todos os componentes:**
- Toast de sucesso para ações bem-sucedidas
- Toast de erro com detalhes
- Toast de confirmação para ações críticas

#### 5.3. Registrar Rotas no Server

**Arquivo:** `src/server.ts`

```typescript
import authRoutes from './api/routes/auth';
import affiliatesRoutes from './api/routes/admin/affiliates';
import commissionsRoutes from './api/routes/admin/commissions';
import withdrawalsRoutes from './api/routes/admin/withdrawals';

app.use('/api/auth', authRoutes);
app.use('/api/admin/affiliates', affiliatesRoutes);
app.use('/api/admin/commissions', commissionsRoutes);
app.use('/api/admin/withdrawals', withdrawalsRoutes);
```

---

## BLOCO 6: TESTES E VALIDAÇÃO FINAL

- [ ] 6.1 Testes de Autenticação
- [ ] 6.2 Testes de APIs Backend
- [ ] 6.3 Testes de Integração Frontend/Backend
- [ ] 6.4 Testes End-to-End
- [ ] 6.5 Validação Completa em Produção

**Tempo estimado:** 3-4 horas

### BLOCO 6 - DETALHAMENTO: Testes

#### 6.1. Testes de Autenticação

**Arquivo:** `tests/auth.test.ts`

```typescript
describe('Auth API', () => {
  it('should login with valid credentials');
  it('should reject invalid credentials');
  it('should refresh token');
  it('should logout successfully');
});
```

#### 6.2. Testes de APIs Backend

**Arquivo:** `tests/admin-affiliates.test.ts`

```typescript
describe('Admin Affiliates API', () => {
  it('should get metrics');
  it('should list affiliates with filters');
  it('should approve affiliate');
  it('should reject affiliate');
  it('should update affiliate data');
});
```

**Arquivo:** `tests/admin-commissions.test.ts`

```typescript
describe('Admin Commissions API', () => {
  it('should list commissions with filters');
  it('should approve commission');
  it('should reject commission');
  it('should export commissions as CSV');
});
```

#### 6.3. Testes de Integração

**Property Tests:**
- **Property 1:** Métricas do Dashboard Refletem Dados Reais
- **Property 2:** Mudança de Status de Solicitações Persiste Corretamente
- **Property 3:** Validação de Wallet ID Impede Cadastros Inválidos
- **Property 4:** Filtragem de Dados Retorna Apenas Resultados Correspondentes
- **Property 5:** Ordenação de Dados Mantém Ordem Correta
- **Property 6:** Estrutura de Rede Genealógica Reflete Relacionamentos Reais
- **Property 7:** Exportação de Relatórios Contém Dados Completos e Corretos
- **Property 8:** Edição de Dados Persiste Todas as Mudanças
- **Property 9:** Mudança de Status de Afiliado Afeta Comissões Corretamente
- **Property 11:** Logs de Auditoria Registram Todas as Ações Administrativas

#### 6.4. Testes End-to-End

**Fluxos completos:**
1. **Fluxo de aprovação de afiliado:** Criar solicitação → Aprovar → Verificar status → Verificar log
2. **Fluxo de gestão de comissões:** Criar comissão → Aprovar → Verificar status → Exportar relatório
3. **Fluxo de saque:** Criar solicitação → Aprovar → Verificar status → Verificar log

#### 6.5. Validação Final

- Testar todas as funcionalidades em produção
- Verificar logs de auditoria
- Verificar métricas do dashboard
- Confirmar integrações funcionando
- Validar segurança e permissões

---

## RESUMO DE EXECUÇÃO

### **ORDEM DE IMPLEMENTAÇÃO:**

1. **BLOCO 0** (Obrigatório primeiro): Autenticação JWT
2. **BLOCO 1**: Serviços Base (Validação Asaas + Auditoria)
3. **BLOCO 2**: APIs Backend (Métricas, Afiliados, Comissões)
4. **BLOCO 3**: Segurança (RLS + Permissões)
5. **BLOCO 4**: Frontend (Serviços + Componentes)
6. **BLOCO 5**: Integrações (Notificações + Deploy)
7. **BLOCO 6**: Testes (E2E + Validação)

### **ESTIMATIVAS DE TEMPO:**

- **BLOCO 0:** 2-3 horas ✅ (JÁ IMPLEMENTADO)
- **BLOCO 1:** 3-4 horas
- **BLOCO 2:** 6-8 horas
- **BLOCO 3:** 2-3 horas
- **BLOCO 4:** 4-5 horas
- **BLOCO 5:** 2-3 horas
- **BLOCO 6:** 3-4 horas

**TOTAL ESTIMADO:** 22-30 horas (sem BLOCO 0 já implementado: 20-27 horas)

### **REQUIREMENTS COVERAGE:**

Todos os requirements de 1.1 a 12.4 estão cobertos e organizados por bloco funcional.

---

**Documento reorganizado:** 07/01/2026  
**Status:** Pronto para execução sequencial  
**Próximo passo:** Iniciar BLOCO 1 (Serviços Base)
