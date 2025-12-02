# 📋 PLANO DE AÇÃO - CORREÇÕES SISTEMA SLIM QUALITY

**Data:** 01/12/2025  
**Responsável:** Equipe Técnica  
**Prazo Total:** 30 dias  
**Status:** 🟡 Aguardando Execução

---

## 🎯 OBJETIVO

Corrigir os achados críticos identificados na análise do sistema Slim Quality, garantindo:
- ✅ Segurança adequada
- ✅ Funcionamento correto de autorização
- ✅ Conformidade com boas práticas
- ✅ Preparação para produção

---

## 📅 CRONOGRAMA

### Fase 1: CRÍTICO (Dias 1-3) 🔴
- Verificação de segurança
- Correção de autorização
- Atualização de políticas RLS

### Fase 2: IMPORTANTE (Dias 4-14) 🟡
- Implementação de testes
- Rate limiting global
- Refatoração de código

### Fase 3: MELHORIAS (Dias 15-30) 🟢
- Monitoramento
- Performance
- Documentação

---

## 🔴 FASE 1: AÇÕES CRÍTICAS (Dias 1-3)

### DIA 1: Segurança e Verificação

#### ✅ TAREFA 1.1: Verificar Exposição de Credenciais
**Prioridade:** 🔴 CRÍTICA  
**Tempo Estimado:** 30 minutos  
**Responsável:** DevOps/Segurança

**Passos:**

1. **Verificar histórico do Git:**
```bash
cd "E:\PROJETOS SITE\repositorios\slim-quality"

# Verificar se arquivo foi commitado
git log --all --full-history -- "docs/SUPABASE_CREDENTIALS.md"

# Verificar se credenciais aparecem em commits
git log -p --all -S "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" --source --all
```

2. **Se credenciais foram expostas:**

   a. **Revogar Service Role Key:**
   - Acessar: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/settings/api
   - Clicar em "Reset" na Service Role Key
   - Copiar nova key

   b. **Atualizar `.env` em TODOS os ambientes:**
   ```bash
   # Desenvolvimento
   SUPABASE_SERVICE_ROLE_KEY=nova-key-aqui
   
   # Produção (Vercel/outro)
   # Atualizar variáveis de ambiente
   ```

   c. **Atualizar documentação:**
   ```bash
   # Atualizar docs/SUPABASE_CREDENTIALS.md com nova key
   # NÃO COMMITAR!
   ```

   d. **Limpar histórico do Git (se necessário):**
   ```bash
   # CUIDADO: Isso reescreve o histórico!
   # Fazer backup antes!
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch docs/SUPABASE_CREDENTIALS.md" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Forçar push (CUIDADO!)
   git push origin --force --all
   ```

3. **Verificar `.gitignore`:**
```bash
# Confirmar que está protegido
grep "SUPABASE_CREDENTIALS.md" .gitignore
```

**Critério de Sucesso:**
- [ ] Histórico verificado
- [ ] Credenciais revogadas (se necessário)
- [ ] Novas credenciais configuradas
- [ ] `.gitignore` confirmado

---

#### ✅ TAREFA 1.2: Corrigir Middleware de Autorização
**Prioridade:** 🔴 CRÍTICA  
**Tempo Estimado:** 2 horas  
**Responsável:** Backend Developer

**Problema Atual:**
- Dois middlewares diferentes: `auth.middleware.ts` e `authorize.middleware.ts`
- `auth.middleware.ts` tenta acessar `profiles.role` (não existe)

**Solução:**

1. **Criar novo middleware unificado:**

```typescript
// src/api/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
      };
    }
  }
}

/**
 * Middleware para autenticação JWT
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticação não fornecido',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.substring(7);

    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN',
      });
    }

    // ✅ CORREÇÃO: Buscar roles de user_roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    const roles = userRoles?.map(r => r.role) || ['cliente'];

    // Definir usuário na request
    req.user = {
      id: user.id,
      email: user.email!,
      roles: roles,
    };

    logger.debug('AuthMiddleware', 'User authenticated', {
      userId: user.id,
      roles: roles,
    });

    next();
  } catch (error) {
    logger.error('AuthMiddleware', 'Authentication error', error as Error);
    return res.status(500).json({
      error: 'Erro interno de autenticação',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Middleware para verificar roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticação requerida',
        code: 'AUTH_REQUIRED',
      });
    }

    const hasRequiredRole = req.user.roles.some(role =>
      allowedRoles.includes(role)
    );

    if (!hasRequiredRole) {
      logger.warn('AuthMiddleware', 'Insufficient permissions', {
        userId: req.user.id,
        userRoles: req.user.roles,
        requiredRoles: allowedRoles,
      });

      return res.status(403).json({
        error: 'Acesso negado',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
      });
    }

    next();
  };
};

// Atalhos
export const requireAdmin = requireRole(['admin']);
export const requireVendedor = requireRole(['admin', 'vendedor']);
export const requireAfiliado = requireRole(['admin', 'vendedor', 'afiliado']);
```

2. **Remover middleware antigo:**
```bash
# Fazer backup primeiro
cp src/api/middlewares/authorize.middleware.ts src/api/middlewares/authorize.middleware.ts.bak

# Remover arquivo
rm src/api/middlewares/authorize.middleware.ts
```

3. **Atualizar imports em todas as rotas:**
```bash
# Buscar arquivos que importam authorize.middleware
grep -r "authorize.middleware" src/api/routes/

# Substituir imports
# De: import { requireRole } from '../middlewares/authorize.middleware';
# Para: import { requireRole } from '../middlewares/auth.middleware';
```

4. **Testar:**
```bash
# Executar testes de autenticação
npm run test:auth

# Testar manualmente cada rota
# - Login
# - Acesso de cliente
# - Acesso de admin
# - Acesso negado
```

**Critério de Sucesso:**
- [ ] Middleware unificado criado
- [ ] Middleware antigo removido
- [ ] Imports atualizados
- [ ] Testes passando
- [ ] Autenticação funcionando

---

### DIA 2: Correção de Políticas RLS

#### ✅ TAREFA 2.1: Atualizar Políticas RLS
**Prioridade:** 🔴 CRÍTICA  
**Tempo Estimado:** 3 horas  
**Responsável:** Database Administrator

**Problema:**
- Políticas RLS verificam `profiles.role` (não existe)
- Admins não conseguem acessar dados

**Solução:**

1. **Criar migration de correção:**

```bash
cd supabase/migrations
touch 20251201000000_fix_admin_rls_policies.sql
```

2. **Conteúdo da migration:**

```sql
-- Migration: Corrigir Políticas RLS de Admin
-- Data: 2025-12-01
-- Autor: Equipe Técnica
-- Descrição: Atualizar políticas para usar user_roles em vez de profiles.role

BEGIN;

-- ============================================
-- ORDERS
-- ============================================

-- Remover política antiga
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;

-- Criar política correta
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- ============================================
-- ORDER_ITEMS
-- ============================================

DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- ============================================
-- PAYMENTS
-- ============================================

DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- ============================================
-- SHIPPING_ADDRESSES
-- ============================================

DROP POLICY IF EXISTS "Admins can view all shipping addresses" ON shipping_addresses;

CREATE POLICY "Admins can view all shipping addresses"
  ON shipping_addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- ============================================
-- ORDER_STATUS_HISTORY
-- ============================================

DROP POLICY IF EXISTS "Admins can view all order history" ON order_status_history;

CREATE POLICY "Admins can view all order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- ============================================
-- ASAAS_TRANSACTIONS
-- ============================================

DROP POLICY IF EXISTS "Admins can view asaas transactions" ON asaas_transactions;

CREATE POLICY "Admins can view asaas transactions"
  ON asaas_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- ============================================
-- ASAAS_SPLITS
-- ============================================

DROP POLICY IF EXISTS "Admins can view asaas splits" ON asaas_splits;

CREATE POLICY "Admins can view asaas splits"
  ON asaas_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- ============================================
-- ASAAS_WEBHOOK_LOGS
-- ============================================

DROP POLICY IF EXISTS "Admins can view webhook logs" ON asaas_webhook_logs;

CREATE POLICY "Admins can view webhook logs"
  ON asaas_webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

-- ============================================
-- PRODUCTS
-- ============================================

DROP POLICY IF EXISTS "Admins can manage products" ON products;

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.deleted_at IS NULL
    )
  );

COMMIT;

-- ============================================
-- VALIDAÇÃO
-- ============================================
-- Verificar políticas atualizadas:
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND policyname LIKE '%Admin%'
-- ORDER BY tablename;
```

3. **Aplicar migration:**

```bash
# Via Supabase CLI
supabase db push

# Ou via script
npm run migrate
```

4. **Testar acesso de admin:**

```bash
# Criar script de teste
cat > test_admin_access.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TEST_TOKEN;

const supabase = createClient(SUPABASE_URL, ADMIN_TOKEN);

async function testAdminAccess() {
  console.log('🧪 Testando acesso de admin...\n');

  // Testar orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  console.log('Orders:', ordersError ? '❌ ERRO' : '✅ OK', ordersError?.message || '');

  // Testar payments
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .limit(1);

  console.log('Payments:', paymentsError ? '❌ ERRO' : '✅ OK', paymentsError?.message || '');

  // Testar products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .limit(1);

  console.log('Products:', productsError ? '❌ ERRO' : '✅ OK', productsError?.message || '');
}

testAdminAccess();
EOF

# Executar teste
node test_admin_access.js
```

**Critério de Sucesso:**
- [ ] Migration criada
- [ ] Migration aplicada
- [ ] Políticas atualizadas
- [ ] Testes de acesso passando
- [ ] Admin consegue acessar todos os dados

---

### DIA 3: Validação e Documentação

#### ✅ TAREFA 3.1: Validação Completa
**Prioridade:** 🔴 CRÍTICA  
**Tempo Estimado:** 2 horas  
**Responsável:** QA/Tester

**Checklist de Validação:**

1. **Autenticação:**
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Token é validado corretamente
- [ ] Token expirado é rejeitado

2. **Autorização:**
- [ ] Cliente acessa apenas próprios dados
- [ ] Admin acessa todos os dados
- [ ] Vendedor acessa dados permitidos
- [ ] Afiliado acessa dados permitidos
- [ ] Acesso negado retorna 403

3. **Políticas RLS:**
- [ ] Cliente vê apenas próprios pedidos
- [ ] Admin vê todos os pedidos
- [ ] Cliente não vê pedidos de outros
- [ ] Admin consegue atualizar pedidos

4. **Segurança:**
- [ ] Credenciais não estão no Git
- [ ] `.env` está no `.gitignore`
- [ ] Service role key funciona
- [ ] Anon key funciona

**Script de Validação:**

```bash
#!/bin/bash
# validate_system.sh

echo "🧪 VALIDAÇÃO DO SISTEMA SLIM QUALITY"
echo "===================================="
echo ""

# 1. Verificar credenciais
echo "1️⃣ Verificando proteção de credenciais..."
if git log --all --full-history -- "docs/SUPABASE_CREDENTIALS.md" | grep -q "commit"; then
    echo "   ❌ ERRO: Credenciais foram commitadas!"
else
    echo "   ✅ OK: Credenciais não estão no histórico"
fi

# 2. Verificar .gitignore
echo "2️⃣ Verificando .gitignore..."
if grep -q "SUPABASE_CREDENTIALS.md" .gitignore; then
    echo "   ✅ OK: Arquivo protegido no .gitignore"
else
    echo "   ❌ ERRO: Arquivo não está no .gitignore!"
fi

# 3. Verificar middleware
echo "3️⃣ Verificando middleware..."
if [ -f "src/api/middlewares/authorize.middleware.ts" ]; then
    echo "   ⚠️  AVISO: Middleware antigo ainda existe"
else
    echo "   ✅ OK: Middleware antigo removido"
fi

# 4. Verificar migrations
echo "4️⃣ Verificando migrations..."
if [ -f "supabase/migrations/20251201000000_fix_admin_rls_policies.sql" ]; then
    echo "   ✅ OK: Migration de correção existe"
else
    echo "   ❌ ERRO: Migration de correção não encontrada!"
fi

echo ""
echo "===================================="
echo "✅ Validação concluída!"
```

**Critério de Sucesso:**
- [ ] Todos os testes passando
- [ ] Script de validação OK
- [ ] Documentação atualizada

---

## 🟡 FASE 2: AÇÕES IMPORTANTES (Dias 4-14)

### ✅ TAREFA 4: Implementar Rate Limiting Global
**Prioridade:** 🟡 IMPORTANTE  
**Tempo Estimado:** 4 horas  
**Prazo:** Dia 7

**Implementação:**

```typescript
// src/api/middlewares/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

// Rate limit global
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: 'Muitas requisições. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit para autenticação
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentativas de login
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  skipSuccessfulRequests: true,
});

// Rate limit para webhooks
export const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 webhooks por minuto
  message: 'Rate limit excedido',
});
```

**Aplicar no server:**

```typescript
// src/server.ts
import { globalRateLimit, authRateLimit } from './api/middlewares/rate-limit.middleware';

// Aplicar rate limit global
app.use(globalRateLimit);

// Aplicar rate limit específico em rotas de auth
app.use('/api/auth', authRateLimit);
```

---

### ✅ TAREFA 5: Implementar Testes Automatizados
**Prioridade:** 🟡 IMPORTANTE  
**Tempo Estimado:** 16 horas  
**Prazo:** Dia 14

**Estrutura de Testes:**

```
tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   ├── affiliate.service.test.ts
│   │   └── commission.service.test.ts
│   └── utils/
│       └── validators.test.ts
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── orders.test.ts
│   │   └── affiliates.test.ts
│   └── database/
│       └── rls.test.ts
└── e2e/
    └── user-journey.test.ts
```

**Exemplo de Teste:**

```typescript
// tests/unit/services/auth.service.test.ts
import { describe, it, expect } from 'vitest';
import { AuthService } from '@/services/auth/auth.service';

describe('AuthService', () => {
  describe('login', () => {
    it('should login with valid credentials', async () => {
      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'wrong',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
```

**Meta de Cobertura:**
- Unitários: 70%
- Integração: 50%
- E2E: 30%

---

## 🟢 FASE 3: MELHORIAS (Dias 15-30)

### ✅ TAREFA 6: Implementar Monitoramento
**Prioridade:** 🟢 BAIXA  
**Tempo Estimado:** 8 horas  
**Prazo:** Dia 21

**Ferramentas:**
- Sentry para tracking de erros
- Winston para logs estruturados
- Prometheus para métricas (opcional)

---

### ✅ TAREFA 7: Otimizar Performance
**Prioridade:** 🟢 BAIXA  
**Tempo Estimado:** 12 horas  
**Prazo:** Dia 28

**Ações:**
- Implementar cache Redis
- Otimizar queries N+1
- Implementar paginação
- CDN para assets

---

## 📊 TRACKING DE PROGRESSO

### Checklist Geral

**🔴 Fase 1: CRÍTICO (Dias 1-3)**
- [ ] Verificar exposição de credenciais
- [ ] Revogar credenciais (se necessário)
- [ ] Corrigir middleware de autorização
- [ ] Atualizar políticas RLS
- [ ] Validar correções

**🟡 Fase 2: IMPORTANTE (Dias 4-14)**
- [ ] Implementar rate limiting global
- [ ] Renomear migration sem timestamp
- [ ] Implementar testes unitários
- [ ] Implementar testes de integração
- [ ] Configurar CI/CD

**🟢 Fase 3: MELHORIAS (Dias 15-30)**
- [ ] Configurar Sentry
- [ ] Implementar cache Redis
- [ ] Otimizar queries
- [ ] Gerar documentação OpenAPI
- [ ] Revisar documentação

---

## 📞 CONTATOS E RESPONSÁVEIS

| Área | Responsável | Contato |
|------|-------------|---------|
| Backend | [Nome] | [Email] |
| Frontend | [Nome] | [Email] |
| Database | [Nome] | [Email] |
| DevOps | [Nome] | [Email] |
| QA | [Nome] | [Email] |

---

## 📝 REGISTRO DE EXECUÇÃO

### Dia 1
- [ ] Tarefa 1.1 concluída
- [ ] Tarefa 1.2 concluída
- **Notas:** 

### Dia 2
- [ ] Tarefa 2.1 concluída
- **Notas:** 

### Dia 3
- [ ] Tarefa 3.1 concluída
- **Notas:** 

---

**Preparado por:** Kiro AI  
**Data:** 01/12/2025  
**Versão:** 1.0  
**Status:** 🟡 Aguardando Execução
