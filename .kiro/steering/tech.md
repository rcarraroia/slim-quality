---
inclusion: manual
---

# TECNOLOGIAS E PADRÕES: SLIM QUALITY BACKEND
## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 🛠️ STACK TÉCNICA DETALHADA

### Runtime & Linguagens
- **Node.js:** 18.x ou superior
- **TypeScript:** 5.x
- **Deno:** Para Edge Functions (Supabase)

### Framework Backend
- **Express.js:** 4.x (API REST, se necessário)
- **Alternativa:** NestJS (se precisar de estrutura mais robusta)

### Banco de Dados
- **PostgreSQL:** 15.x (via Supabase)
- **Supabase Client:** Para queries e mutations
- **SQL Raw:** Para operações complexas

### Autenticação
- **Supabase Auth:** JWT-based
- **Row Level Security (RLS):** Políticas no PostgreSQL

### Bibliotecas Principais
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "express": "^4.x",
    "cors": "^2.x",
    "helmet": "^7.x",
    "dotenv": "^16.x",
    "zod": "^3.x",              // Validação de schemas
    "date-fns": "^2.x",          // Manipulação de datas
    "axios": "^1.x"              // Cliente HTTP (Asaas API)
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/express": "^4.x",
    "typescript": "^5.x",
    "tsx": "^4.x",               // TypeScript executor
    "vitest": "^1.x",            // Testes
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

---

## 📐 PADRÕES DE CÓDIGO

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### ESLint Rules
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "prefer-const": "error"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100
}
```

---

## 🗃️ PADRÕES DE BANCO DE DADOS

### Convenções de Nomenclatura

**Tabelas:**
- Plural, snake_case
- Exemplo: `orders`, `affiliates`, `commission_logs`

**Colunas:**
- Singular, snake_case
- Exemplo: `created_at`, `wallet_id`, `total_amount`

**Foreign Keys:**
- `{tabela_singular}_id`
- Exemplo: `order_id`, `affiliate_id`, `user_id`

**Timestamps:**
- SEMPRE incluir: `created_at`, `updated_at`
- Tipo: `timestamptz` (com timezone)

**Soft Deletes:**
- Usar coluna: `deleted_at timestamptz NULL`
- Políticas RLS devem filtrar `deleted_at IS NULL`

### Migrations

**Nome do arquivo:**
```
{timestamp}_{descricao_curta}.sql
```

**Exemplo:**
```
20250115120000_create_affiliates_table.sql
20250115130000_add_wallet_id_to_affiliates.sql
```

**Template de Migration:**
```sql
-- Migration: {Descrição detalhada}
-- Created: {Data}
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabela não existe
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
-- ============================================

-- UP Migration
BEGIN;

-- Criar tabela
CREATE TABLE IF NOT EXISTS nome_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Criar índices
CREATE INDEX idx_nome_tabela_campo ON nome_tabela(campo);

-- Criar trigger de updated_at
CREATE TRIGGER update_nome_tabela_updated_at
  BEFORE UPDATE ON nome_tabela
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar políticas RLS
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON nome_tabela FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- DROP TABLE IF EXISTS nome_tabela CASCADE;
-- COMMIT;
```

---

## 🔐 SEGURANÇA

### Variáveis de Ambiente

**Nunca commitar:**
- API Keys
- Tokens
- Senhas
- Service Role Keys

**Usar `.env` e `.env.example`:**
```bash
# .env.example (commitar no Git)
# Supabase
SUPABASE_URL=sua-url-aqui
SUPABASE_ANON_KEY=sua-chave-publica-aqui
SUPABASE_SERVICE_KEY=sua-chave-privada-aqui

# Asaas
ASAAS_API_KEY=sua-chave-asaas-aqui
ASAAS_WALLET_FABRICA=wal_xxxxx
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx

# App
NODE_ENV=development
PORT=3000
```

### Validação de Entrada

**SEMPRE usar Zod para validar:**
```typescript
import { z } from 'zod';

const CreateAffiliateSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  wallet_id: z.string().regex(/^wal_[a-zA-Z0-9]{20}$/),
  referral_code: z.string().optional()
});

// Uso:
const result = CreateAffiliateSchema.safeParse(requestBody);
if (!result.success) {
  return res.status(400).json({ errors: result.error.issues });
}
```

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

---

## 🧪 TESTES

### Framework: Vitest
```typescript
// tests/unit/commission-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { CommissionCalculator } from '@/services/affiliates/commission-calculator';

describe('CommissionCalculator', () => {
  describe('calculate', () => {
    it('deve calcular corretamente com apenas N1', async () => {
      const calculator = new CommissionCalculator();
      const result = await calculator.calculate({
        orderId: 'order_123',
        total: 3290.00,
        n1: { id: 'aff_1', walletId: 'wal_abc123' },
        n2: null,
        n3: null
      });
      
      expect(result.n1).toBe(493.50);  // 15%
      expect(result.n2).toBe(0);
      expect(result.n3).toBe(0);
      expect(result.renum).toBe(246.75); // 5% + 2.5%
      expect(result.jb).toBe(246.75);    // 5% + 2.5%
      expect(result.total).toBe(987.00); // 30% total
    });
    
    it('deve calcular corretamente com rede completa', async () => {
      // ... teste com N1 + N2 + N3
    });
  });
});
```

### Cobertura de Testes

**Objetivo:** > 70% de cobertura
```bash
# Executar testes com cobertura
npm run test:coverage

# Deve gerar relatório em coverage/
```

---

## 📊 LOGGING

### Estrutura de Log
```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}
```

### Logger Service
```typescript
// src/utils/logger.ts
export class Logger {
  static info(module: string, message: string, context?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      module,
      message,
      context
    }));
  }
  
  static error(module: string, message: string, error?: Error, context?: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module,
      message,
      error: error?.stack,
      context
    }));
  }
}

// Uso:
Logger.info('CommissionCalculator', 'Calculando comissões', { orderId: '123' });
```

---

## 🔄 INTEGRAÇÃO ASAAS

### Client HTTP
```typescript
// src/services/asaas/api-client.ts
import axios from 'axios';

export class AsaasClient {
  private client;
  
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.asaas.com/v3',
      headers: {
        'access_token': process.env.ASAAS_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    // Interceptor para logs
    this.client.interceptors.request.use(config => {
      Logger.debug('AsaasClient', 'Request', {
        method: config.method,
        url: config.url,
        data: config.data
      });
      return config;
    });
    
    this.client.interceptors.response.use(
      response => {
        Logger.info('AsaasClient', 'Response', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      error => {
        Logger.error('AsaasClient', 'Error', error, {
          response: error.response?.data
        });
        throw error;
      }
    );
  }
  
  async validateWallet(walletId: string) {
    const response = await this.client.get(`/wallets/${walletId}`);
    return response.data;
  }
  
  async createSplit(paymentId: string, splits: Split[]) {
    const response = await this.client.post(`/payments/${paymentId}/split`, {
      splits
    });
    return response.data;
  }
}
```

---

## 📚 DOCUMENTAÇÃO

### Comentários de Código

**Usar JSDoc para funções públicas:**
```typescript
/**
 * Calcula comissões multinível para uma venda
 * 
 * @param orderId - ID do pedido no formato UUID
 * @returns Objeto com comissões calculadas para cada nível
 * @throws {Error} Se order não for encontrado
 * @throws {ValidationError} Se soma de comissões != 30%
 * 
 * @example
 * ```typescript
 * const result = await calculator.calculate('order_123');
 * console.log(result.n1); // 493.50
 * ```
 */
async calculate(orderId: string): Promise<CommissionResult> {
  // ...
}
```

### README.md

**Todo módulo deve ter:**
- Descrição do que faz
- Como instalar
- Como usar
- Exemplos
- Testes
- Deploy

---

## 🚀 PERFORMANCE

### Índices de Banco

**Criar índices para:**
- Foreign keys
- Campos de busca frequente
- Campos de ordenação
- Campos de filtro (WHERE)
```sql
-- Índice composto para queries comuns
CREATE INDEX idx_orders_customer_status 
  ON orders(customer_id, status)
  WHERE deleted_at IS NULL;

-- Índice parcial para queries específicas
CREATE INDEX idx_orders_pending
  ON orders(created_at)
  WHERE status = 'pending' AND deleted_at IS NULL;
```

### Cache (Redis)

**Cachear:**
- Dados de produtos (TTL: 1 hora)
- Configurações do sistema (TTL: 5 minutos)
- Métricas do dashboard (TTL: 1 minuto)

**NÃO cachear:**
- Dados financeiros
- Comissões
- Pedidos

---

## 🔧 FERRAMENTAS DE DESENVOLVIMENTO

### Scripts NPM
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    "db:migrate": "supabase db push",
    "db:reset": "supabase db reset",
    "functions:deploy": "supabase functions deploy"
  }
}
```

### Git Hooks (Husky)
```bash
# Pre-commit
npm run lint
npm run format
npm run test
```

---

## 📖 RECURSOS E REFERÊNCIAS

### Documentação Oficial
- Supabase: https://supabase.com/docs
- Asaas API: https://docs.asaas.com
- TypeScript: https://www.typescriptlang.org/docs
- Express: https://expressjs.com

### Boas Práticas
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices
- TypeScript Do's and Don'ts: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html

---

**Este documento define os PADRÕES TÉCNICOS do projeto.**
**Siga rigorosamente para manter consistência e qualidade do código.**
