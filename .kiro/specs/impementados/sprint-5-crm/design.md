# Design Document - Sprint 5: Sistema de CRM e Gestão de Clientes

## Overview

Este documento define a arquitetura técnica e design do sistema de CRM para o Sprint 5, baseado na análise prévia que identificou 30% de estrutura frontend existente e 70% de funcionalidades novas a serem implementadas.

**Estratégia de Desenvolvimento:**
- Reutilizar componentes e estruturas existentes (DashboardLayout, Conversas.tsx, componentes UI)
- Expandir funcionalidades existentes (sistema de conversas)
- Criar novos módulos integrados (clientes, agendamentos, tags)
- Integrar com sistemas existentes (vendas, afiliados, N8N)

## Architecture

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SLIM QUALITY CRM                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                             │
│  ├── Páginas Existentes (Adaptação)                        │
│  │   └── Conversas.tsx → Expandir com chat               │
│  ├── Páginas Novas                                         │
│  │   ├── Clientes.tsx                                     │
│  │   ├── ClienteDetalhes.tsx                              │
│  │   └── Agendamentos.tsx                                 │
│  └── Componentes Reutilizados + Novos                     │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Express.js + TypeScript)                       │
│  ├── /api/customers (CRUD + timeline)                      │
│  ├── /api/conversations (chat + atribuição)                │
│  ├── /api/appointments (calendário)                        │
│  ├── /api/admin/tags (gestão de tags)                      │
│  └── /webhooks/n8n/message (BIA integration)              │
├─────────────────────────────────────────────────────────────┤
│  Business Logic (Services)                                 │
│  ├── CustomerService (gestão de clientes)                  │
│  ├── ConversationService (chat multicanal)                 │
│  ├── TimelineService (eventos cronológicos)                │
│  ├── TagService (categorização)                            │
│  └── NotificationService (alertas)                         │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL + Supabase)                          │
│  ├── customers (dados principais)                          │
│  ├── customer_tags (segmentação)                           │
│  ├── customer_timeline (eventos)                           │
│  ├── conversations (threads de chat)                       │
│  ├── messages (mensagens individuais)                      │
│  └── appointments (agendamentos)                           │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   N8N/BIA    │───▶│  CRM System  │◀───│ Sales System │
│  (WhatsApp)  │    │              │    │   (Orders)   │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Affiliates   │
                    │   System     │
                    └──────────────┘
```

## Data Models

### Core Entities

#### 1. Customer (Cliente)
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  cpf_cnpj VARCHAR(18),
  birth_date DATE,
  
  -- Address
  street VARCHAR(255),
  number VARCHAR(10),
  complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  postal_code VARCHAR(10),
  
  -- Metadata
  source VARCHAR(50), -- 'organic', 'affiliate', 'n8n'
  referral_code VARCHAR(20), -- código do afiliado (se aplicável)
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);
```####
 2. Customer Tags (Tags de Cliente)
```sql
CREATE TABLE customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3B82F6', -- hex color
  description TEXT,
  auto_apply_rules JSONB, -- regras para aplicação automática
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES customer_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, tag_id)
);
```

#### 3. Customer Timeline (Linha do Tempo)
```sql
CREATE TYPE timeline_event_type AS ENUM (
  'customer_created',
  'order_placed',
  'payment_confirmed',
  'conversation_started',
  'note_added',
  'appointment_scheduled',
  'appointment_completed',
  'tag_added',
  'tag_removed',
  'status_changed'
);

CREATE TABLE customer_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  event_type timeline_event_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB, -- dados específicos do evento
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Conversations (Conversas)
```sql
CREATE TYPE conversation_status AS ENUM (
  'new', 'open', 'pending', 'resolved', 'closed'
);

CREATE TYPE conversation_channel AS ENUM (
  'whatsapp', 'email', 'chat', 'phone'
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  channel conversation_channel NOT NULL,
  status conversation_status DEFAULT 'new',
  subject VARCHAR(255),
  assigned_to UUID REFERENCES auth.users(id),
  priority INTEGER DEFAULT 1, -- 1=baixa, 2=média, 3=alta
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL, -- 'customer', 'agent', 'system'
  sender_id UUID, -- user_id se agent, customer_id se customer
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file'
  external_id VARCHAR(255), -- ID da mensagem no sistema externo (WhatsApp, etc)
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. Appointments (Agendamentos)
```sql
CREATE TYPE appointment_type AS ENUM (
  'call', 'meeting', 'follow_up', 'demo'
);

CREATE TYPE appointment_status AS ENUM (
  'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  appointment_type appointment_type NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location VARCHAR(255), -- 'online', endereço físico, etc
  notes TEXT, -- anotações pós-reunião
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Components and Interfaces

### Frontend Architecture

#### Estrutura de Componentes (Baseada na Análise)

```
src/
├── pages/
│   ├── dashboard/
│   │   ├── Conversas.tsx (ADAPTAR - expandir com chat)
│   │   ├── Clientes.tsx (CRIAR - lista de clientes)
│   │   ├── clientes/
│   │   │   └── [id].tsx (CRIAR - detalhes do cliente)
│   │   └── Agendamentos.tsx (CRIAR - calendário)
│   └── admin/
│       ├── Tags.tsx (CRIAR - gestão de tags)
│       └── RelatoriosCRM.tsx (CRIAR - relatórios)
├── components/
│   ├── crm/ (CRIAR - componentes específicos)
│   │   ├── CustomerCard.tsx
│   │   ├── CustomerTimeline.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── AppointmentCalendar.tsx
│   │   ├── TagSelector.tsx
│   │   └── CustomerFilters.tsx
│   ├── dashboard/ (REUTILIZAR)
│   │   ├── StatCard.tsx ✅
│   │   └── StatusBadge.tsx ✅
│   └── ui/ (REUTILIZAR)
│       └── *.tsx ✅ (todos os componentes shadcn/ui)
├── services/
│   ├── customer-frontend.service.ts (CRIAR)
│   ├── conversation-frontend.service.ts (CRIAR)
│   ├── appointment-frontend.service.ts (CRIAR)
│   └── tag-frontend.service.ts (CRIAR)
└── types/
    ├── customer.types.ts (CRIAR)
    ├── conversation.types.ts (CRIAR)
    └── appointment.types.ts (CRIAR)
```

#### Componentes Principais

##### 1. CustomerCard.tsx (CRIAR)
```typescript
interface CustomerCardProps {
  customer: Customer;
  showActions?: boolean;
  onEdit?: (customer: Customer) => void;
  onViewDetails?: (customerId: string) => void;
}

// Reutiliza padrão visual dos componentes existentes
// Similar ao AffiliateCard mas para clientes
```

##### 2. ChatInterface.tsx (CRIAR)
```typescript
interface ChatInterfaceProps {
  conversationId: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUser: User;
  loading?: boolean;
}

// Interface de chat em tempo real
// Integração com WebSocket (futuro)
```

##### 3. CustomerTimeline.tsx (CRIAR)
```typescript
interface CustomerTimelineProps {
  customerId: string;
  events: TimelineEvent[];
  showFilters?: boolean;
  onAddNote?: (note: string) => void;
}

// Timeline cronológica de eventos
// Similar ao conceito de atividades do sistema de afiliados
```

##### 4. Conversas.tsx (ADAPTAR)
```typescript
// Expandir página existente com:
// - Interface de chat lateral
// - Filtro por atendente
// - Sistema de atribuição
// - Indicadores de mensagens não lidas
// - Integração com dados reais (substituir mock)

// Manter estrutura existente:
// - Filtros por status ✅
// - Busca ✅
// - Cards de conversa ✅
// - Layout responsivo ✅
```

### API Design

#### REST Endpoints

##### Customers API
```typescript
// Gestão de clientes
GET    /api/customers                    // Lista com filtros
POST   /api/customers                    // Criar cliente
GET    /api/customers/:id                // Detalhes
PUT    /api/customers/:id                // Atualizar
DELETE /api/customers/:id                // Soft delete
GET    /api/customers/:id/timeline       // Timeline de eventos
POST   /api/customers/:id/notes          // Adicionar nota
POST   /api/customers/:id/tags           // Adicionar tag
DELETE /api/customers/:id/tags/:tagId    // Remover tag
```

##### Conversations API
```typescript
// Gestão de conversas
GET    /api/conversations                // Lista com filtros
POST   /api/conversations                // Criar conversa
GET    /api/conversations/:id            // Detalhes
PUT    /api/conversations/:id            // Atualizar
GET    /api/conversations/:id/messages   // Mensagens
POST   /api/conversations/:id/messages   // Enviar mensagem
PUT    /api/conversations/:id/assign     // Atribuir atendente
PUT    /api/conversations/:id/status     // Alterar status
```

##### Appointments API
```typescript
// Gestão de agendamentos
GET    /api/appointments                 // Lista/calendário
POST   /api/appointments                 // Criar agendamento
GET    /api/appointments/:id             // Detalhes
PUT    /api/appointments/:id             // Atualizar
DELETE /api/appointments/:id             // Cancelar
GET    /api/appointments/calendar        // Vista de calendário
```

##### Admin APIs
```typescript
// Gestão administrativa
GET    /api/admin/tags                   // Lista de tags
POST   /api/admin/tags                   // Criar tag
PUT    /api/admin/tags/:id               // Atualizar tag
DELETE /api/admin/tags/:id               // Deletar tag
GET    /api/admin/customers/stats        // Métricas de clientes
GET    /api/admin/conversations/stats    // Métricas de atendimento
GET    /api/admin/reports/crm            // Relatórios consolidados
```

##### Webhook
```typescript
// Integração N8N/BIA
POST   /webhooks/n8n/message             // Receber mensagens WhatsApp

// Payload esperado:
interface N8NWebhookPayload {
  phone: string;           // +5531999999999
  message: string;         // conteúdo da mensagem
  timestamp: string;       // ISO 8601
  messageId: string;       // ID único da mensagem
  customerName?: string;   // nome do cliente (se disponível)
}
```

## Error Handling

### Estratégia de Tratamento de Erros

#### Backend
```typescript
// Hierarquia de erros customizados
class CRMError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

class CustomerNotFoundError extends CRMError {
  constructor(customerId: string) {
    super(`Cliente ${customerId} não encontrado`, 'CUSTOMER_NOT_FOUND', 404);
  }
}

class ConversationNotFoundError extends CRMError {
  constructor(conversationId: string) {
    super(`Conversa ${conversationId} não encontrada`, 'CONVERSATION_NOT_FOUND', 404);
  }
}
```

#### Frontend
```typescript
// Service com tratamento de erros
class CustomerFrontendService {
  async getCustomers(params?: CustomerFilters) {
    try {
      const response = await apiClient.get('/api/customers', { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Nenhum cliente encontrado');
      }
      throw new Error('Erro ao carregar clientes');
    }
  }
}

// Hook para tratamento de erros
const useCustomers = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleError = (err: Error) => {
    setError(err.message);
    toast({
      title: "Erro",
      description: err.message,
      variant: "destructive"
    });
  };
  
  return { error, loading, handleError };
};
```

## Testing Strategy

### Backend Testing
```typescript
// Testes unitários para services
describe('CustomerService', () => {
  it('should create customer with valid data', async () => {
    const customerData = {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '+5531999999999'
    };
    
    const customer = await customerService.create(customerData);
    expect(customer.id).toBeDefined();
    expect(customer.name).toBe(customerData.name);
  });
  
  it('should validate CPF format', async () => {
    const invalidData = {
      name: 'João Silva',
      email: 'joao@email.com',
      cpf_cnpj: '123.456.789-00' // CPF inválido
    };
    
    await expect(customerService.create(invalidData))
      .rejects.toThrow('CPF inválido');
  });
});

// Testes de integração para APIs
describe('Customers API', () => {
  it('GET /api/customers should return paginated list', async () => {
    const response = await request(app)
      .get('/api/customers?page=1&limit=10')
      .expect(200);
      
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
  });
});
```

### Frontend Testing
```typescript
// Testes de componentes
describe('CustomerCard', () => {
  it('should render customer information', () => {
    const customer = {
      id: '1',
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '+5531999999999'
    };
    
    render(<CustomerCard customer={customer} />);
    
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@email.com')).toBeInTheDocument();
  });
});

// Testes de integração
describe('Customer Management Flow', () => {
  it('should create and display new customer', async () => {
    render(<CustomerList />);
    
    // Simular criação de cliente
    fireEvent.click(screen.getByText('Novo Cliente'));
    
    // Preencher formulário
    fireEvent.change(screen.getByLabelText('Nome'), {
      target: { value: 'João Silva' }
    });
    
    // Submeter
    fireEvent.click(screen.getByText('Salvar'));
    
    // Verificar se aparece na lista
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });
  });
});
```

## Integration Points

### 1. Integração com Sistema de Vendas
```typescript
// Quando pedido é criado, registrar na timeline
class OrderService {
  async createOrder(orderData: CreateOrderData) {
    const order = await this.orderRepository.create(orderData);
    
    // Registrar evento na timeline do cliente
    if (order.customer_id) {
      await timelineService.addEvent({
        customer_id: order.customer_id,
        event_type: 'order_placed',
        title: 'Pedido Realizado',
        description: `Pedido #${order.order_number} no valor de R$ ${order.total_cents / 100}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          total_cents: order.total_cents
        }
      });
    }
    
    return order;
  }
}
```

### 2. Integração com Sistema de Afiliados
```typescript
// Identificar clientes indicados por afiliados
class CustomerService {
  async create(customerData: CreateCustomerData) {
    const customer = await this.customerRepository.create(customerData);
    
    // Se cliente veio de link de afiliado
    if (customerData.referral_code) {
      const affiliate = await affiliateService.getByReferralCode(customerData.referral_code);
      
      if (affiliate) {
        // Adicionar tag "Indicação"
        await this.addTag(customer.id, 'indicacao');
        
        // Registrar na timeline
        await timelineService.addEvent({
          customer_id: customer.id,
          event_type: 'customer_created',
          title: 'Cliente Indicado',
          description: `Cliente indicado por ${affiliate.name}`,
          metadata: {
            affiliate_id: affiliate.id,
            referral_code: customerData.referral_code
          }
        });
      }
    }
    
    return customer;
  }
}
```

### 3. Integração com N8N/BIA
```typescript
// Webhook para receber mensagens do WhatsApp
class N8NWebhookController {
  async handleMessage(req: Request, res: Response) {
    const { phone, message, timestamp, messageId } = req.body;
    
    try {
      // 1. Buscar/criar cliente por telefone
      let customer = await customerService.getByPhone(phone);
      if (!customer) {
        customer = await customerService.create({
          name: `Cliente ${phone}`,
          phone: phone,
          source: 'n8n'
        });
      }
      
      // 2. Buscar/criar conversa ativa
      let conversation = await conversationService.getActiveByCustomer(
        customer.id, 
        'whatsapp'
      );
      
      if (!conversation) {
        conversation = await conversationService.create({
          customer_id: customer.id,
          channel: 'whatsapp',
          status: 'new',
          subject: 'Conversa WhatsApp'
        });
      }
      
      // 3. Adicionar mensagem
      await messageService.create({
        conversation_id: conversation.id,
        sender_type: 'customer',
        sender_id: customer.id,
        content: message,
        external_id: messageId
      });
      
      // 4. Atualizar timeline
      await timelineService.addEvent({
        customer_id: customer.id,
        event_type: 'conversation_started',
        title: 'Mensagem WhatsApp',
        description: message.substring(0, 100) + '...',
        metadata: {
          conversation_id: conversation.id,
          channel: 'whatsapp'
        }
      });
      
      // 5. Notificar atendente (se não atribuído)
      if (!conversation.assigned_to) {
        await notificationService.notifyAvailableAgents(conversation);
      }
      
      res.status(200).json({ success: true });
      
    } catch (error) {
      console.error('Erro ao processar webhook N8N:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}
```

## Security Considerations

### Row Level Security (RLS)
```sql
-- Clientes: vendedores veem apenas clientes atribuídos
CREATE POLICY "Vendedores veem clientes atribuídos"
  ON customers FOR ALL
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );

-- Conversas: acesso baseado em atribuição
CREATE POLICY "Acesso a conversas atribuídas"
  ON conversations FOR ALL
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_id 
      AND assigned_to = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );
```

### API Security
```typescript
// Middleware de autorização
const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Acesso negado' 
      });
    }
    
    next();
  };
};

// Aplicação em rotas
router.get('/api/admin/customers/stats', 
  authenticate, 
  requireRole(['admin', 'supervisor']), 
  customerController.getStats
);
```

## Performance Optimization

### Database Optimization
```sql
-- Índices para consultas frequentes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX idx_customers_created_at ON customers(created_at);

CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_channel ON conversations(channel);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

CREATE INDEX idx_timeline_customer_id ON customer_timeline(customer_id);
CREATE INDEX idx_timeline_event_type ON customer_timeline(event_type);
CREATE INDEX idx_timeline_created_at ON customer_timeline(created_at);
```

### Frontend Optimization
```typescript
// Lazy loading de componentes
const CustomerDetails = lazy(() => import('./pages/dashboard/clientes/[id]'));
const AppointmentCalendar = lazy(() => import('./components/crm/AppointmentCalendar'));

// Cache de dados com React Query
const useCustomers = (filters?: CustomerFilters) => {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => customerService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000 // 10 minutos
  });
};

// Paginação virtual para listas grandes
const CustomerList = () => {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['customers'],
    queryFn: ({ pageParam = 1 }) => 
      customerService.getAll({ page: pageParam, limit: 50 }),
    getNextPageParam: (lastPage) => lastPage.nextPage
  });
  
  return (
    <VirtualizedList
      items={data?.pages.flatMap(page => page.data) || []}
      renderItem={({ item }) => <CustomerCard customer={item} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
    />
  );
};
```

## Deployment Strategy

### Database Migrations
```sql
-- Migration: 20250125000000_create_crm_tables.sql
BEGIN;

-- Criar tabelas em ordem de dependência
-- 1. customers
-- 2. customer_tags
-- 3. customer_tag_assignments  
-- 4. customer_timeline
-- 5. conversations
-- 6. messages
-- 7. appointments

-- Criar índices
-- Criar políticas RLS
-- Criar triggers para updated_at

COMMIT;
```

### Environment Configuration
```typescript
// Variáveis de ambiente necessárias
interface CRMConfig {
  N8N_WEBHOOK_SECRET: string;     // Secret para validar webhooks N8N (obrigatório)
  N8N_ALLOWED_IPS: string;        // IPs permitidos para webhook (whitelist)
  WHATSAPP_API_URL: string;       // URL da API do WhatsApp (futuro)
  NOTIFICATION_EMAIL_FROM: string; // Email para notificações
  CRM_CACHE_TTL: number;          // TTL do cache em segundos
  MAX_CONVERSATION_IDLE: number;   // Tempo para marcar conversa como inativa
  WEBHOOK_RATE_LIMIT: number;     // Rate limit para webhook (req/min)
  SECURITY_LOG_LEVEL: string;     // Nível de log para eventos de segurança
}

// Validação de segurança para webhook N8N
interface WebhookSecurityConfig {
  requireBearerToken: true;       // Exigir token Bearer
  validateTimestamp: true;        // Validar timestamp para evitar replay
  maxTimestampAge: 300;          // Máximo 5 minutos de diferença
  ipWhitelist: string[];         // Lista de IPs permitidos
  rateLimitPerIP: 100;           // 100 requests por minuto por IP
  logSuspiciousActivity: true;   // Log de tentativas suspeitas
}
```

Este design document fornece a base técnica completa para implementação do Sprint 5, aproveitando a estrutura existente identificada na análise prévia e criando um sistema de CRM robusto e integrado.