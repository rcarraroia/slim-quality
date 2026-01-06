# Implementation Plan: Correção Painel Admin Afiliados

## Overview

Este plano detalha a implementação completa da correção do Painel de Administração de Afiliados, substituindo dados mockados por integrações reais com backend e banco de dados.

**Backend:** Express (TypeScript) - `src/api/routes/admin/`  
**Frontend:** React (TypeScript) - `src/pages/admin/`  
**Banco:** Supabase PostgreSQL  
**Autenticação:** JWT Básico (definitivo)  
**Abordagem:** Implementação incremental por funcionalidade, com testes após cada etapa.

## Tasks

- [ ] 0. Implementar Autenticação JWT (CRÍTICO - BLOQUEANTE)
  - [ ] 0.1 Criar Migration: Tabelas de Autenticação no Supabase
  - [ ] 0.2 Criar Router de Autenticação (`src/api/routes/auth.ts`)
  - [ ] 0.3 Criar Middleware de Autenticação (`src/api/middleware/auth.ts`)
  - [ ] 0.4 Adicionar Variáveis de Ambiente JWT
  - [ ] 0.5 Registrar Rotas no Server (`src/server.ts`)
  - [ ] 0.6 Testar Autenticação
  - _Requirements: 10.2, 10.4_
  - _Tempo estimado: 2-3 horas_
  - _⚠️ DEVE SER IMPLEMENTADA ANTES DE TODAS AS OUTRAS TASKS_

### Task 0: Implementar Autenticação JWT (DEFINITIVO)

**Objetivo:** Sistema de autenticação JWT para múltiplos admins com audit por usuário.

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
-- Hash gerado com: bcrypt.hash('Admin@123', 10)
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

**Código:**
```typescript
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/supabase';
import { verifyAdmin } from '../middleware/auth';

const router = Router();

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscar admin
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();
    
    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Validar senha
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Gerar tokens
    const accessToken = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
    
    const refreshToken = jwt.sign(
      { adminId: admin.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
    
    // Salvar refresh token
    await supabase.from('admin_sessions').insert({
      admin_id: admin.id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    // Atualizar last_login
    await supabase
      .from('admins')
      .update({ last_login_at: new Date() })
      .eq('id', admin.id);
    
    res.json({
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Validar refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    // Verificar se token existe no banco
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .eq('admin_id', decoded.adminId)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Buscar admin
    const { data: admin } = await supabase
      .from('admins')
      .select('*')
      .eq('id', decoded.adminId)
      .eq('is_active', true)
      .single();
    
    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' });
    }
    
    // Gerar novo access token
    const accessToken = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
    
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// LOGOUT
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Deletar sessão
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('refresh_token', refreshToken);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ME (dados do admin logado)
router.get('/me', verifyAdmin, async (req, res) => {
  res.json({ admin: req.admin });
});

export default router;
```

#### 0.3. Criar Middleware de Autenticação

**Arquivo:** `src/api/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminRequest extends Request {
  admin?: {
    adminId: string;
    email: string;
    role: string;
  };
}

export const verifyAdmin = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      adminId: string;
      email: string;
      role: string;
    };
    
    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireSuperAdmin = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};
```

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

// ...

app.use('/api/auth', authRoutes);
```

#### 0.6. Testar Autenticação

**Arquivo:** `tests/auth.test.ts`

```typescript
import request from 'supertest';
import app from '../src/server';

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'renato@slimquality.com.br',
        password: 'Admin@123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });
  
  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong@email.com',
        password: 'wrongpass'
      });
    
    expect(response.status).toBe(401);
  });
  
  it('should refresh token', async () => {
    // Login
    const login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'renato@slimquality.com.br',
        password: 'Admin@123'
      });
    
    // Refresh
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });
  
  it('should logout successfully', async () => {
    // Login
    const login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'renato@slimquality.com.br',
        password: 'Admin@123'
      });
    
    // Logout
    const response = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: login.body.refreshToken });
    
    expect(response.status).toBe(200);
  });
});
```

**Tempo estimado:** 2-3 horas

---

- [ ] 1. Setup e Preparação do Ambiente
  - Verificar estrutura de pastas backend Express (`src/api/routes/admin/`)
  - Instalar dependências necessárias (jsonwebtoken, bcrypt, axios para Asaas)
  - Ajustar tabela `audit_logs` para referenciar `admins`
  - Configurar variáveis de ambiente necessárias (Asaas, JWT)
  - Habilitar RLS em tabela `affiliates`
  - _Requirements: 8.1-8.12, 10.4_

### Task 1: Setup e Preparação do Ambiente

#### 1.1. Verificar Estrutura Backend Express

**Verificar que existe:**
- `src/api/routes/admin/affiliates.ts` ✅ (já existe)
- `src/api/middleware/` (criar se não existir)
- `src/services/` (criar se não existir)

#### 1.2. Instalar Dependências

```bash
npm install jsonwebtoken bcrypt axios
npm install -D @types/jsonwebtoken @types/bcrypt
```

#### 1.3. Ajustar Tabela audit_logs

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_adjust_audit_logs.sql`

```sql
-- Ajustar audit_logs para referenciar admins
ALTER TABLE audit_logs
  ADD COLUMN admin_id UUID REFERENCES admins(id);

-- Criar índice
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);

-- Comentário
COMMENT ON COLUMN audit_logs.admin_id IS 'Admin que executou a ação';
```

#### 1.4. Configurar Variáveis de Ambiente

**Arquivo:** `.env.example` (adicionar)

```bash
# Asaas API
ASAAS_API_KEY=your-asaas-api-key
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx

# JWT (já adicionado na Task 0)
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
```

#### 1.5. Habilitar RLS em affiliates

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_enable_rls_affiliates.sql`

```sql
-- Habilitar RLS
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

---

- [ ] 2. Implementar Serviço de Validação Asaas
  - [ ] 2.1 Criar `src/services/asaas-validator.service.ts`
    - Implementar classe `AsaasValidator`
    - Método `validateWallet(walletId)` com chamada à API Asaas
    - Método `getWalletInfo(walletId)` para detalhes da carteira
    - Integração com cache (Redis ou memória)
    - _Requirements: 9.1, 9.5_

  - [ ]* 2.2 Escrever testes para validação Asaas
    - **Property 3: Validação de Wallet ID Impede Cadastros Inválidos**
    - **Validates: Requirements 2.5, 6.3, 9.1**
    - Testar com IDs válidos e inválidos
    - Testar cache de validação
    - Testar timeout e erros de API

### Task 2: Implementar Serviço de Validação Asaas

#### 2.1. Criar Serviço de Validação

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

---

- [ ] 3. Implementar Serviço de Auditoria
  - [ ] 3.1 Criar `src/services/audit-logger.service.ts`
    - Implementar classe `AuditLogger`
    - Método `logAction()` para registrar ações administrativas
    - Capturar admin_id, action, resource_type, resource_id, details, IP, user_agent
    - _Requirements: 6.5, 7.5, 10.4_

  - [ ]* 3.2 Escrever testes para auditoria
    - **Property 11: Logs de Auditoria Registram Todas as Ações Administrativas**
    - **Validates: Requirements 6.5, 7.5**
    - Testar criação de logs para diferentes ações
    - Verificar campos obrigatórios

### Task 3: Implementar Serviço de Auditoria

#### 3.1. Criar Serviço de Auditoria

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

---

- [ ] 4. Checkpoint - Validar Serviços Base
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implementar API de Métricas do Dashboard
  - [ ] 5.1 Criar endpoint GET `/api/admin/affiliates/metrics`
    - Calcular total de afiliados ativos
    - Calcular comissões pagas no mês
    - Calcular vendas geradas por afiliados
    - Calcular taxa de conversão
    - Implementar cache de 5 minutos
    - Adicionar middleware `verifyAdmin`
    - _Requirements: 1.1, 1.2_

  - [ ]* 5.2 Escrever testes para métricas
    - **Property 1: Métricas do Dashboard Refletem Dados Reais**
    - **Validates: Requirements 1.1, 1.2**
    - Gerar dados aleatórios de afiliados e comissões
    - Verificar que métricas correspondem aos dados

### Task 5: Implementar API de Métricas do Dashboard

#### 5.1. Criar Endpoint de Métricas

**Arquivo:** `src/api/routes/admin/affiliates.ts` (adicionar)

```typescript
import { Router } from 'express';
import { verifyAdmin, AdminRequest } from '../../middleware/auth';
import { supabase } from '../../../config/supabase';
import { auditLogger } from '../../../services/audit-logger.service';

const router = Router();

// Cache simples em memória (5 minutos)
let metricsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

router.get('/metrics', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    // Verificar cache
    if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_TTL) {
      return res.json(metricsCache.data);
    }

    // Buscar métricas
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total de afiliados ativos
    const { count: totalActive } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('deleted_at', null);

    // Comissões pagas no mês
    const { data: commissionsData } = await supabase
      .from('commissions')
      .select('commission_value_cents')
      .eq('status', 'paid')
      .gte('paid_at', firstDayOfMonth.toISOString());

    const totalCommissionsPaid = commissionsData?.reduce(
      (sum, c) => sum + (c.commission_value_cents || 0),
      0
    ) || 0;

    // Vendas geradas por afiliados no mês
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total_cents')
      .not('affiliate_n1_id', 'is', null)
      .gte('created_at', firstDayOfMonth.toISOString());

    const totalSalesGenerated = ordersData?.reduce(
      (sum, o) => sum + (o.total_cents || 0),
      0
    ) || 0;

    // Taxa de conversão (conversões / cliques)
    const { count: totalClicks } = await supabase
      .from('referral_clicks')
      .select('*', { count: 'exact', head: true })
      .gte('clicked_at', firstDayOfMonth.toISOString());

    const { count: totalConversions } = await supabase
      .from('referral_conversions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth.toISOString());

    const conversionRate = totalClicks ? (totalConversions! / totalClicks) * 100 : 0;

    const metrics = {
      totalActiveAffiliates: totalActive || 0,
      totalCommissionsPaid: totalCommissionsPaid / 100, // Converter para reais
      totalSalesGenerated: totalSalesGenerated / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      period: {
        start: firstDayOfMonth.toISOString(),
        end: now.toISOString()
      }
    };

    // Salvar no cache
    metricsCache = { data: metrics, timestamp: Date.now() };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;
```

---

- [ ] 6. Implementar API de Listagem de Afiliados
  - [ ] 6.1 Criar endpoint GET `/api/admin/affiliates`
    - Implementar paginação (page, limit)
    - Implementar filtro por status
    - Implementar busca por nome/email
    - Implementar ordenação por colunas
    - Adicionar middleware `verifyAdmin`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Escrever testes para listagem
    - **Property 4: Filtragem de Dados Retorna Apenas Resultados Correspondentes**
    - **Validates: Requirements 3.2, 3.3**
    - **Property 5: Ordenação de Dados Mantém Ordem Correta**
    - **Validates: Requirements 3.4**
    - Testar filtros e ordenação com dados aleatórios

### Task 6: Implementar API de Listagem de Afiliados

#### 6.1. Criar Endpoint de Listagem

**Arquivo:** `src/api/routes/admin/affiliates.ts` (adicionar)

```typescript
router.get('/', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Construir query
    let query = supabase
      .from('affiliates')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Filtro por status
    if (status) {
      query = query.eq('status', status);
    }

    // Busca por nome ou email
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Ordenação
    query = query.order(sortBy as string, { ascending: sortOrder === 'asc' });

    // Paginação
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error listing affiliates:', error);
    res.status(500).json({ error: 'Failed to list affiliates' });
  }
});
```

---

- [ ] 7. Implementar API de Gestão de Solicitações
  - [ ] 7.1 Criar endpoints de solicitações
    - GET `/api/admin/affiliates/requests` - Listar pendentes
    - POST `/api/admin/affiliates/:id/approve` - Aprovar afiliado
    - POST `/api/admin/affiliates/:id/reject` - Rejeitar afiliado
    - Validar Wallet ID antes de aprovar
    - Registrar logs de auditoria com `req.admin.adminId`
    - Enviar notificações por email
    - Adicionar middleware `verifyAdmin`
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ]* 7.2 Escrever testes para solicitações
    - **Property 2: Mudança de Status de Solicitações Persiste Corretamente**
    - **Validates: Requirements 2.2, 2.3**
    - Testar aprovação e rejeição
    - Verificar logs de auditoria

### Task 7: Implementar API de Gestão de Solicitações

#### 7.1. Criar Endpoints de Solicitações

**Arquivo:** `src/api/routes/admin/affiliates.ts` (adicionar)

```typescript
import { asaasValidator } from '../../../services/asaas-validator.service';

// Listar solicitações pendentes
router.get('/requests', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    console.error('Error listing requests:', error);
    res.status(500).json({ error: 'Failed to list requests' });
  }
});

// Aprovar afiliado
router.post('/:id/approve', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin!.adminId;

    // Buscar afiliado
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Validar Wallet ID se existir
    if (affiliate.wallet_id) {
      const validation = await asaasValidator.validateWallet(affiliate.wallet_id);
      if (!validation.isValid || !validation.isActive) {
        return res.status(400).json({
          error: 'Invalid or inactive wallet ID',
          details: validation.error
        });
      }
    }

    // Atualizar status
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        status: 'active',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Log de auditoria
    await auditLogger.logAction({
      adminId,
      action: 'approve_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { affiliateEmail: affiliate.email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // TODO: Enviar email de aprovação

    res.json({ message: 'Affiliate approved successfully' });
  } catch (error) {
    console.error('Error approving affiliate:', error);
    res.status(500).json({ error: 'Failed to approve affiliate' });
  }
});

// Rejeitar afiliado
router.post('/:id/reject', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin!.adminId;

    // Buscar afiliado
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Atualizar status
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Log de auditoria
    await auditLogger.logAction({
      adminId,
      action: 'reject_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { affiliateEmail: affiliate.email, reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // TODO: Enviar email de rejeição

    res.json({ message: 'Affiliate rejected successfully' });
  } catch (error) {
    console.error('Error rejecting affiliate:', error);
    res.status(500).json({ error: 'Failed to reject affiliate' });
  }
});
```

---

- [ ] 8. Checkpoint - Validar APIs Básicas
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implementar API de Edição de Afiliados
  - [ ] 9.1 Criar endpoints de edição
    - GET `/api/admin/affiliates/:id` - Detalhes do afiliado
    - PUT `/api/admin/affiliates/:id` - Editar afiliado
    - POST `/api/admin/affiliates/:id/activate` - Ativar
    - POST `/api/admin/affiliates/:id/deactivate` - Desativar
    - Validar Wallet ID se alterado
    - Registrar logs de auditoria com `req.admin.adminId`
    - Adicionar middleware `verifyAdmin`
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.3_

**Arquivo:** `src/api/routes/admin/affiliates.ts` (adicionar)

```typescript
// Detalhes do afiliado
router.get('/:id', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    res.json({ data });
  } catch (error) {
    console.error('Error fetching affiliate:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate' });
  }
});

// Editar afiliado
router.put('/:id', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, wallet_id } = req.body;
    const adminId = req.admin!.adminId;
    
    // Validar Wallet ID se alterado
    if (wallet_id) {
      const validation = await asaasValidator.validateWallet(wallet_id);
      if (!validation.isValid || !validation.isActive) {
        return res.status(400).json({
          error: 'Invalid or inactive wallet ID',
          details: validation.error
        });
      }
    }
    
    // Atualizar afiliado
    const { data, error } = await supabase
      .from('affiliates')
      .update({
        name,
        email,
        phone,
        wallet_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log de auditoria
    await auditLogger.logAction({
      adminId,
      action: 'update_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { changes: { name, email, phone, wallet_id } },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({ data });
  } catch (error) {
    console.error('Error updating affiliate:', error);
    res.status(500).json({ error: 'Failed to update affiliate' });
  }
});

// Ativar afiliado
router.post('/:id/activate', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin!.adminId;
    
    const { error } = await supabase
      .from('affiliates')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    // Log de auditoria
    await auditLogger.logAction({
      adminId,
      action: 'activate_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({ message: 'Affiliate activated successfully' });
  } catch (error) {
    console.error('Error activating affiliate:', error);
    res.status(500).json({ error: 'Failed to activate affiliate' });
  }
});

// Desativar afiliado
router.post('/:id/deactivate', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin!.adminId;
    
    const { error } = await supabase
      .from('affiliates')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    // Log de auditoria
    await auditLogger.logAction({
      adminId,
      action: 'deactivate_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({ message: 'Affiliate deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating affiliate:', error);
    res.status(500).json({ error: 'Failed to deactivate affiliate' });
  }
});
```

  - [ ]* 9.2 Escrever testes para edição
    - **Property 8: Edição de Dados Persiste Todas as Mudanças**
    - **Validates: Requirements 6.2, 6.5**
    - **Property 9: Mudança de Status de Afiliado Afeta Comissões Corretamente**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
    - Testar edição de campos
    - Testar ativação/desativação

**Arquivo:** `tests/admin-affiliates.test.ts`

```typescript
import request from 'supertest';
import app from '../src/server';

describe('Admin Affiliates - Edit', () => {
  let accessToken: string;
  let affiliateId: string;
  
  beforeAll(async () => {
    // Login
    const login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'renato@slimquality.com.br',
        password: 'Admin@123'
      });
    accessToken = login.body.accessToken;
    
    // Criar afiliado de teste
    const affiliate = await request(app)
      .post('/api/admin/affiliates')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Affiliate',
        email: 'test@example.com',
        wallet_id: 'wal_test123'
      });
    affiliateId = affiliate.body.data.id;
  });
  
  it('should update affiliate data', async () => {
    const response = await request(app)
      .put(`/api/admin/affiliates/${affiliateId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Updated Name',
        email: 'updated@example.com'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Updated Name');
    expect(response.body.data.email).toBe('updated@example.com');
  });
  
  it('should activate affiliate', async () => {
    const response = await request(app)
      .post(`/api/admin/affiliates/${affiliateId}/activate`)
      .set('Authorization', `Bearer ${accessToken}`);
    
    expect(response.status).toBe(200);
  });
  
  it('should deactivate affiliate', async () => {
    const response = await request(app)
      .post(`/api/admin/affiliates/${affiliateId}/deactivate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: 'Test deactivation' });
    
    expect(response.status).toBe(200);
  });
});
```

- [ ] 10. Implementar API de Comissões
  - [ ] 10.1 Criar endpoints de comissões
    - GET `/api/admin/commissions` - Listar com filtros
    - GET `/api/admin/commissions/:id` - Detalhes
    - POST `/api/admin/commissions/:id/approve` - Aprovar
    - POST `/api/admin/commissions/:id/reject` - Rejeitar
    - POST `/api/admin/commissions/export` - Exportar relatório
    - Implementar filtros por status, nível, afiliado, período
    - Adicionar middleware `verifyAdmin`
    - Registrar logs de auditoria com `req.admin.adminId`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

**Arquivo:** `src/api/routes/admin/commissions.ts`

```typescript
import { Router } from 'express';
import { verifyAdmin, AdminRequest } from '../../middleware/auth';
import { supabase } from '../../../config/supabase';
import { auditLogger } from '../../../services/audit-logger.service';

const router = Router();

// Listar comissões
router.get('/', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      level,
      affiliate_id,
      start_date,
      end_date
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = supabase
      .from('commissions')
      .select('*, affiliate:affiliates(name, email)', { count: 'exact' });
    
    if (status) query = query.eq('status', status);
    if (level) query = query.eq('level', level);
    if (affiliate_id) query = query.eq('affiliate_id', affiliate_id);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // Calcular métricas
    const { data: metricsData } = await supabase
      .from('commissions')
      .select('status, commission_value_cents');
    
    const metrics = {
      total_pending: metricsData
        ?.filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.commission_value_cents, 0) / 100 || 0,
      total_paid: metricsData
        ?.filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.commission_value_cents, 0) / 100 || 0,
      count_pending: metricsData?.filter(c => c.status === 'pending').length || 0
    };
    
    res.json({
      data,
      metrics,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error listing commissions:', error);
    res.status(500).json({ error: 'Failed to list commissions' });
  }
});

// Detalhes da comissão
router.get('/:id', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('commissions')
      .select('*, affiliate:affiliates(*), order:orders(*)')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Commission not found' });
    }
    
    res.json({ data });
  } catch (error) {
    console.error('Error fetching commission:', error);
    res.status(500).json({ error: 'Failed to fetch commission' });
  }
});

// Aprovar comissão
router.post('/:id/approve', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin!.adminId;
    
    const { error } = await supabase
      .from('commissions')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    // Log de auditoria
    await auditLogger.logAction({
      adminId,
      action: 'approve_commission',
      resourceType: 'commission',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({ message: 'Commission approved successfully' });
  } catch (error) {
    console.error('Error approving commission:', error);
    res.status(500).json({ error: 'Failed to approve commission' });
  }
});

// Rejeitar comissão
router.post('/:id/reject', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin!.adminId;
    
    const { error } = await supabase
      .from('commissions')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    // Log de auditoria
    await auditLogger.logAction({
      adminId,
      action: 'reject_commission',
      resourceType: 'commission',
      resourceId: id,
      details: { reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({ message: 'Commission rejected successfully' });
  } catch (error) {
    console.error('Error rejecting commission:', error);
    res.status(500).json({ error: 'Failed to reject commission' });
  }
});

// Exportar relatório
router.post('/export', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { format, filters } = req.body;
    
    // Buscar comissões com filtros
    let query = supabase
      .from('commissions')
      .select('*, affiliate:affiliates(name, email), order:orders(id, total_cents)');
    
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.level) query = query.eq('level', filters.level);
    if (filters.affiliate_id) query = query.eq('affiliate_id', filters.affiliate_id);
    if (filters.start_date) query = query.gte('created_at', filters.start_date);
    if (filters.end_date) query = query.lte('created_at', filters.end_date);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Gerar arquivo (CSV ou PDF)
    if (format === 'csv') {
      const csv = generateCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=commissions.csv');
      res.send(csv);
    } else {
      // TODO: Implementar geração de PDF
      res.status(501).json({ error: 'PDF export not implemented yet' });
    }
  } catch (error) {
    console.error('Error exporting commissions:', error);
    res.status(500).json({ error: 'Failed to export commissions' });
  }
});

function generateCSV(data: any[]): string {
  const headers = ['ID', 'Afiliado', 'Email', 'Nível', 'Valor', 'Status', 'Data'];
  const rows = data.map(c => [
    c.id,
    c.affiliate?.name || '',
    c.affiliate?.email || '',
    c.level,
    (c.commission_value_cents / 100).toFixed(2),
    c.status,
    new Date(c.created_at).toLocaleDateString('pt-BR')
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export default router;
```

  - [ ]* 10.2 Escrever testes para comissões
    - **Property 7: Exportação de Relatórios Contém Dados Completos e Corretos**
    - **Validates: Requirements 5.4**
    - Testar filtros de comissões
    - Testar exportação de relatórios

**Arquivo:** `tests/admin-commissions.test.ts`

```typescript
import request from 'supertest';
import app from '../src/server';

describe('Admin Commissions', () => {
  let accessToken: string;
  
  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'renato@slimquality.com.br',
        password: 'Admin@123'
      });
    accessToken = login.body.accessToken;
  });
  
  it('should list commissions with filters', async () => {
    const response = await request(app)
      .get('/api/admin/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'pending', level: 'N1' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('metrics');
  });
  
  it('should export commissions as CSV', async () => {
    const response = await request(app)
      .post('/api/admin/commissions/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        format: 'csv',
        filters: { status: 'paid' }
      });
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
  });
});
```

- [ ] 11. Implementar API de Rede Genealógica
  - [ ] 11.1 Criar endpoint GET `/api/admin/affiliates/network`
    - Buscar estrutura completa da árvore
    - Calcular métricas por nível (N1, N2, N3)
    - Retornar relacionamentos hierárquicos
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 11.2 Escrever testes para rede genealógica
    - **Property 6: Estrutura de Rede Genealógica Reflete Relacionamentos Reais**
    - **Validates: Requirements 4.1, 4.2, 4.5**
    - Gerar árvores aleatórias
    - Verificar relacionamentos e métricas

- [ ] 12. Implementar API de Saques
  - [ ] 12.1 Criar endpoints de saques
    - GET `/api/admin/withdrawals` - Listar solicitações
    - GET `/api/admin/withdrawals/:id` - Detalhes
    - POST `/api/admin/withdrawals/:id/approve` - Aprovar
    - POST `/api/admin/withdrawals/:id/reject` - Rejeitar
    - Implementar filtros por status e afiliado
    - Registrar logs de auditoria
    - _Requirements: Não especificado mas presente na auditoria_

- [ ] 13. Checkpoint - Validar Todas as APIs Backend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Configurar Políticas RLS no Supabase
  - [ ] 14.1 Criar políticas para tabela `affiliates`
    - Política para admins verem todos
    - Política para afiliados verem apenas próprios dados
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 14.2 Criar políticas para tabela `commissions`
    - Política para admins verem todas
    - Política para afiliados verem apenas próprias
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 14.3 Criar políticas para tabela `withdrawals`
    - Política para admins verem todas
    - Política para afiliados verem apenas próprias
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 14.4 Criar políticas para tabela `audit_logs`
    - Apenas admins podem ler logs
    - Sistema pode inserir logs
    - _Requirements: 10.4_

- [ ] 15. Refatorar Frontend - Serviços
  - [ ] 15.1 Criar `src/services/admin-affiliates.service.ts`
    - Implementar métodos para consumir APIs de afiliados
    - getMetrics(), getAll(), getById(), update(), activate(), deactivate()
    - Tratamento de erros com toasts
    - _Requirements: 1.1, 2.1, 3.1, 6.2, 7.1, 7.3_

  - [ ] 15.2 Criar `src/services/admin-commissions.service.ts`
    - Implementar métodos para consumir APIs de comissões
    - getAll(), getById(), approve(), reject(), export()
    - _Requirements: 5.1, 5.4_

  - [ ] 15.3 Criar `src/services/admin-withdrawals.service.ts`
    - Implementar métodos para consumir APIs de saques
    - getAll(), getById(), approve(), reject()

- [ ] 16. Refatorar Frontend - Componentes
  - [ ] 16.1 Atualizar `ListaAfiliados.tsx`
    - Substituir queries diretas por chamadas ao service
    - Implementar loading states
    - Implementar tratamento de erros
    - Implementar retry automático
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 16.2 Atualizar `GestaoComissoes.tsx`
    - Substituir queries diretas por chamadas ao service
    - Implementar loading states
    - Implementar tratamento de erros
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 16.3 Atualizar `Solicitacoes.tsx`
    - Substituir queries diretas por chamadas ao service
    - Implementar loading states
    - Implementar tratamento de erros
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 17. Implementar Hook de Permissões
  - [ ] 17.1 Criar `src/hooks/usePermission.ts`
    - Verificar role do usuário (admin, super_admin)
    - Retornar hasPermission boolean
    - Usar em todas as páginas administrativas
    - _Requirements: 10.2_

- [ ] 18. Checkpoint - Validar Integração Frontend/Backend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Implementar Notificações
  - [ ] 19.1 Criar serviço de notificações por email
    - Notificar afiliado quando aprovado
    - Notificar afiliado quando rejeitado
    - Notificar afiliado quando comissão paga
    - _Requirements: 12.4_

  - [ ] 19.2 Implementar toasts de feedback
    - Toast de sucesso para ações bem-sucedidas
    - Toast de erro com detalhes
    - Toast de confirmação para ações críticas
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 20. Testes de Integração End-to-End
  - [ ]* 20.1 Testar fluxo completo de aprovação de afiliado
    - Criar solicitação → Aprovar → Verificar status → Verificar log
    - Verificar notificação enviada

  - [ ]* 20.2 Testar fluxo completo de gestão de comissões
    - Criar comissão → Aprovar → Verificar status → Exportar relatório

  - [ ]* 20.3 Testar fluxo completo de saque
    - Criar solicitação → Aprovar → Verificar status → Verificar log

- [ ] 21. Documentação e Deploy
  - [ ] 21.1 Atualizar documentação de APIs
    - Documentar todos os endpoints no README
    - Adicionar exemplos de uso
    - Documentar códigos de erro

  - [ ] 21.2 Deploy Backend
    - Build Docker image
    - Push para Docker Hub
    - Rebuild no EasyPanel

  - [ ] 21.3 Deploy Frontend
    - Commit e push para GitHub
    - Verificar deploy automático no Vercel

- [ ] 22. Checkpoint Final - Validação Completa
  - Ensure all tests pass, ask the user if questions arise.
  - Testar todas as funcionalidades em produção
  - Verificar logs de auditoria
  - Verificar métricas do dashboard

## Notes

- Tasks marcadas com `*` são opcionais (testes) e podem ser puladas para MVP mais rápido
- Cada task referencia requirements específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Property tests validam propriedades universais de correção
- Unit tests validam exemplos específicos e edge cases
- Integração frontend/backend é feita de forma incremental por funcionalidade

---

**Documento criado:** 05/01/2026  
**Baseado em:** requirements.md + design.md  
**Status:** Pronto para execução
