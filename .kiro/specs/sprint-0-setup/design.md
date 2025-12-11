# Design Document - Sprint 0: Setup e Infraestrutura Base

## Overview

Este documento detalha o design técnico para o Sprint 0 do projeto Slim Quality Backend. O foco é estabelecer uma fundação sólida e escalável que suportará todos os sprints futuros, com ênfase em boas práticas, ferramentas modernas e preparação para crescimento.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Slim Quality Backend                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Node.js    │  │  TypeScript  │  │   Express    │      │
│  │   18.x+      │  │     5.x      │  │     4.x      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Development Tools                        │   │
│  │  • ESLint  • Prettier  • Vitest  • TSX              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Supabase Integration                     │   │
│  │  • PostgreSQL 15.x  • Auth  • Storage  • Functions  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Runtime & Language:**
- Node.js 18.x (LTS)
- TypeScript 5.x (strict mode)

**Framework:**
- Express.js 4.x (API REST)

**Database:**
- PostgreSQL 15.x (via Supabase)
- Supabase Client 2.x

**Development Tools:**
- tsx (TypeScript executor)
- Vitest (testing framework)
- ESLint (linting)
- Prettier (formatting)

**Infrastructure:**
- Supabase (BaaS)
- Git (version control)

## Components and Interfaces

### 1. Project Structure

```
slim-quality-backend/
├── .kiro/
│   ├── specs/
│   │   └── sprint-0-setup/
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   └── steering/
│       ├── product.md
│       ├── structure.md
│       └── tech.md
│
├── supabase/
│   ├── migrations/
│   │   └── 20250101000000_initial_setup.sql
│   ├── functions/
│   │   └── .gitkeep
│   └── config.toml
│
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   └── .gitkeep
│   │   ├── controllers/
│   │   │   └── .gitkeep
│   │   ├── middlewares/
│   │   │   └── .gitkeep
│   │   └── validators/
│   │       └── .gitkeep
│   ├── services/
│   │   └── .gitkeep
│   ├── types/
│   │   └── .gitkeep
│   ├── utils/
│   │   ├── logger.ts
│   │   └── .gitkeep
│   ├── config/
│   │   ├── database.ts
│   │   └── app.ts
│   └── server.ts
│
├── tests/
│   ├── unit/
│   │   └── .gitkeep
│   ├── integration/
│   │   └── .gitkeep
│   └── e2e/
│       └── .gitkeep
│
├── scripts/
│   ├── analyze_database.py
│   └── .gitkeep
│
├── docs/
│   ├── CRONOGRAMA_MACRO.md
│   ├── ROADMAP_TECNICO.md
│   ├── SPECS_TEMPLATE.md
│   ├── SUPABASE_ACCESS.md
│   ├── SUPABASE_CREDENTIALS.md
│   └── README.md
│
├── .env.example
├── .env (gitignored)
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── package.json
├── vitest.config.ts
└── README.md
```

### 2. Configuration Files

#### package.json
```json
{
  "name": "slim-quality-backend",
  "version": "0.1.0",
  "description": "Backend do sistema Slim Quality - Vendas e Afiliados",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "db:dump": "supabase db dump --schema public",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "vitest": "^1.1.0",
    "@vitest/coverage-v8": "^1.1.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "prettier": "^3.1.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

#### tsconfig.json
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
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### .eslintrc.json
```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  },
  "env": {
    "node": true,
    "es2022": true
  }
}
```

#### .prettierrc
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

#### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Initial Migration

#### 20250101000000_initial_setup.sql
```sql
-- Migration: Initial Setup - Funções Auxiliares e Extensões
-- Created: 2025-01-01
-- Author: Kiro AI
-- Sprint: 0 - Setup e Infraestrutura Base

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Banco de dados está vazio (novo projeto)
--   ✅ Nenhuma extensão conflitante
--   ✅ Primeira migration do projeto
-- ============================================

BEGIN;

-- ============================================
-- EXTENSÕES
-- ============================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 
'Função trigger para atualizar automaticamente o campo updated_at em qualquer tabela';

-- ============================================
-- VALIDAÇÃO
-- ============================================

-- Verificar se extensões foram criadas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    RAISE EXCEPTION 'Extensão uuid-ossp não foi criada';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'Extensão pgcrypto não foi criada';
  END IF;
  
  RAISE NOTICE 'Setup inicial concluído com sucesso!';
END $$;

COMMIT;

-- ============================================
-- ROLLBACK (para referência)
-- ============================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- COMMIT;
```

### 4. Core Files

#### src/server.ts
```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { appConfig } from './config/app';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create Express app
const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Slim Quality Backend API',
    version: '0.1.0',
    documentation: '/api/docs',
  });
});

// Start server
const PORT = appConfig.port;
app.listen(PORT, () => {
  logger.info('Server', `Server started on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    port: PORT,
  });
});

export default app;
```

#### src/config/app.ts
```typescript
export const appConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};
```

#### src/config/database.ts
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for public operations (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for admin operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

#### src/utils/logger.ts
```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private log(entry: LogEntry): void {
    const logString = JSON.stringify({
      ...entry,
      error: entry.error ? {
        message: entry.error.message,
        stack: entry.error.stack,
      } : undefined,
    });

    switch (entry.level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logString);
        }
        break;
      default:
        console.log(logString);
    }
  }

  debug(module: string, message: string, context?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      module,
      message,
      context,
    });
  }

  info(module: string, message: string, context?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      module,
      message,
      context,
    });
  }

  warn(module: string, message: string, context?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      module,
      message,
      context,
    });
  }

  error(module: string, message: string, error?: Error, context?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      module,
      message,
      error,
      context,
    });
  }
}

export const logger = new Logger();
```

## Data Models

Neste sprint não há criação de tabelas de dados. Apenas funções auxiliares e extensões são configuradas.

## Error Handling

### Environment Variables Validation
- Validar variáveis obrigatórias na inicialização
- Lançar erro descritivo se variável estiver faltando
- Não iniciar servidor se configuração estiver incompleta

### Migration Errors
- Usar transações (BEGIN/COMMIT) para garantir atomicidade
- Incluir validações após criação de extensões
- Documentar rollback para cada migration

### Runtime Errors
- Logger estruturado para capturar erros
- Stack traces preservadas
- Contexto adicional incluído nos logs

## Testing Strategy

### Unit Tests
- Testar funções utilitárias (logger)
- Testar validação de variáveis de ambiente
- Cobertura mínima: 80%

### Integration Tests
- Testar conexão com Supabase
- Testar endpoints de health check
- Validar que migrations foram aplicadas

### E2E Tests
- Não aplicável neste sprint

### Test Structure
```
tests/
├── unit/
│   ├── utils/
│   │   └── logger.test.ts
│   └── config/
│       └── app.test.ts
└── integration/
    ├── database.test.ts
    └── server.test.ts
```

## Performance Considerations

- Usar `tsx watch` para hot-reload em desenvolvimento
- Compilar TypeScript para JavaScript em produção
- Logger estruturado (JSON) para facilitar parsing
- Validação de env vars apenas na inicialização

## Security Considerations

- Nunca commitar `.env` no Git
- Usar `helmet` para headers de segurança
- Validar todas as variáveis de ambiente obrigatórias
- Service role key apenas para operações admin
- Anon key para operações públicas (com RLS)

## Deployment Considerations

- Documentar processo de setup no README
- Incluir `.env.example` com todas as variáveis
- Scripts NPM padronizados
- Validação de versão do Node.js (>=18.0.0)

## Future Enhancements

- Husky para git hooks (pre-commit, pre-push)
- Commitlint para mensagens de commit padronizadas
- Docker para containerização
- CI/CD com GitHub Actions
- Swagger/OpenAPI para documentação de API
