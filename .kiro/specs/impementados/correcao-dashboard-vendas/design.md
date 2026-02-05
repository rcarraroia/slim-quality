# Design Document

## Introduction

Este documento detalha o design técnico para corrigir os problemas críticos do dashboard de vendas identificados na auditoria. O sistema atualmente exibe métricas incorretas e não está conectado ao banco de dados real do Supabase.

**⚠️ REGRAS OBRIGATÓRIAS APLICÁVEIS:**
- 📋 **Análise Preventiva Obrigatória** (analise-preventiva-obrigatoria.md)
- 🔍 **Verificação do Banco Real** (verificacao-banco-real.md)  
- 💯 **Compromisso de Honestidade** (compromisso-honestidade.md)

## Overview

A solução implementará conexão real com o banco Supabase, corrigirá cálculos de métricas, separará conceitos de pedidos/vendas e implementará a página de vendas faltante. O design prioriza dados reais sobre dados mockados e implementa tratamento robusto de erros.

### Problemas Identificados na Auditoria
1. Cards do dashboard mostram valores incorretos (R$ 3.190,00 vs dados reais)
2. Lista "Vendas Recentes" inclui pedidos pendentes (deveria ser apenas 'paid')
3. Página /dashboard/vendas completamente vazia
4. Confusão conceitual entre pedidos e vendas
5. Frontend desconectado do banco real

## Architecture

### Arquitetura Atual (Problemática)
```
Frontend (React) → Dados Mock/Hardcoded → UI Incorreta
```

### Arquitetura Corrigida
```
Frontend (React) → Supabase Client → PostgreSQL (Produção) → Dados Reais → UI Correta
```

### Componentes Principais
- **Dashboard Cards**: Métricas principais (vendas, pedidos, conversão)
- **Sales List**: Lista de vendas recentes (apenas status 'paid')
- **Sales Page**: Página dedicada com filtros e paginação
- **Supabase Service**: Camada de acesso aos dados
- **Error Handling**: Tratamento robusto de erros

## Components and Interfaces

### Frontend Components

#### 1. DashboardCards Component
```typescript
interface DashboardMetrics {
  vendas_mes: number;           // Apenas pedidos 'paid'
  pedidos_realizados: number;   // Todos os pedidos
  taxa_conversao: number;       // (paid / total) * 100
  ticket_medio: number;         // valor_total / pedidos_paid
}

interface DashboardCardsProps {
  periodo?: 'mes' | 'trimestre' | 'ano';
  loading?: boolean;
  error?: string;
}
```

#### 2. SalesRecentList Component
```typescript
interface SaleRecent {
  id: string;
  customer_name: string;
  product_name: string;
  total_amount: number;        // Em reais (convertido de cents)
  status: 'paid';             // Apenas vendas confirmadas
  created_at: string;
}

interface SalesRecentListProps {
  limit?: number;
  loading?: boolean;
  error?: string;
}
```

#### 3. SalesPage Component
```typescript
interface SalesPageFilters {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  status: 'paid';              // Fixo para vendas
  cliente?: string;
  produto?: string;
}

interface SalesPageProps {
  filtros: SalesPageFilters;
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
  };
}
```

### Backend Services

#### 1. SupabaseService
```typescript
class SupabaseService {
  private client: SupabaseClient;
  
  // Métricas do dashboard
  async getDashboardMetrics(periodo: string): Promise<DashboardMetrics>;
  
  // Vendas recentes (apenas 'paid')
  async getRecentSales(limit: number): Promise<SaleRecent[]>;
  
  // Vendas com filtros e paginação
  async getSalesWithFilters(filters: SalesFilters): Promise<SalesPage>;
  
  // Validação de conexão
  async validateConnection(): Promise<boolean>;
}
```

#### 2. MetricsCalculator
```typescript
class MetricsCalculator {
  // Calcula vendas do mês (apenas 'paid')
  static calculateMonthSales(orders: Order[]): number;
  
  // Calcula taxa de conversão
  static calculateConversionRate(totalOrders: number, paidOrders: number): number;
  
  // Calcula ticket médio
  static calculateAverageTicket(totalValue: number, paidOrders: number): number;
  
  // Converte cents para reais
  static centsToReais(cents: number): number;
}
```

## Data Models

### Database Schema (Existing)
```sql
-- Tabela orders (existente no Supabase)
orders {
  id: UUID PRIMARY KEY
  customer_id: UUID
  total_amount_cents: INTEGER    -- Valor em centavos
  status: TEXT                   -- 'pending', 'paid', 'cancelled'
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

-- Tabela customers (existente)
customers {
  id: UUID PRIMARY KEY
  name: TEXT
  email: TEXT
  phone: TEXT
  created_at: TIMESTAMPTZ
}

-- Tabela products (existente)
products {
  id: UUID PRIMARY KEY
  name: TEXT
  price_cents: INTEGER
  status: TEXT
  created_at: TIMESTAMPTZ
}
```

### Frontend Data Models
```typescript
// Modelo para métricas do dashboard
interface DashboardData {
  metricas: {
    vendas_mes: number;
    pedidos_realizados: number;
    pedidos_pendentes: number;
    taxa_conversao: number;
    ticket_medio: number;
  };
  periodo: {
    inicio: Date;
    fim: Date;
  };
  ultima_atualizacao: Date;
}

// Modelo para venda individual
interface Sale {
  id: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    price: number;
  };
  total_amount: number;
  status: 'paid';
  created_at: Date;
  payment_method?: string;
}
```

## Error Handling

### Error Types
```typescript
enum ErrorType {
  CONNECTION_ERROR = 'connection_error',
  QUERY_ERROR = 'query_error',
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT_ERROR = 'timeout_error'
}

interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}
```

### Error Handling Strategy
1. **Connection Errors**: Retry automático até 3 tentativas
2. **Query Errors**: Log detalhado + fallback para dados em cache
3. **Validation Errors**: Exibir mensagem específica ao usuário
4. **Timeout Errors**: Aumentar timeout progressivamente

### Error UI States
- **Loading State**: Skeleton components durante carregamento
- **Error State**: Mensagem clara + botão de retry
- **Empty State**: Quando não há dados para exibir
- **Offline State**: Quando não há conexão

## Testing Strategy

### Unit Tests
- Testes para MetricsCalculator (cálculos corretos)
- Testes para SupabaseService (queries e conexão)
- Testes para componentes React (renderização e props)
- Testes para conversão cents → reais
- Testes para filtros de status ('paid' apenas)

### Integration Tests
- Teste de conexão real com Supabase
- Teste de queries com dados reais
- Teste de fluxo completo dashboard → dados → UI
- Teste de tratamento de erros end-to-end

### Property-Based Tests
Não aplicável para esta feature (principalmente correção de bugs e integração).

### Manual Testing Checklist
- [ ] Dashboard carrega com dados reais do Supabase
- [ ] Cards mostram valores corretos (não R$ 3.190,00 fixo)
- [ ] Lista "Vendas Recentes" mostra apenas status 'paid'
- [ ] Página /dashboard/vendas carrega e funciona
- [ ] Filtros por período funcionam corretamente
- [ ] Tratamento de erros funciona (desconectar internet)
- [ ] Performance adequada (< 2s para carregar)
- [ ] Responsividade em mobile