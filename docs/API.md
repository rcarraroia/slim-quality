# API Documentation - Sistema de Vendas

## 📋 Índice

- [Autenticação](#autenticação)
- [Endpoints Públicos](#endpoints-públicos)
  - [Criar Pedido](#criar-pedido)
  - [Gerar Pagamento](#gerar-pagamento)
  - [Listar Meus Pedidos](#listar-meus-pedidos)
  - [Detalhes do Pedido](#detalhes-do-pedido)
  - [Status do Pedido](#status-do-pedido)
- [Endpoints Administrativos](#endpoints-administrativos)
  - [Listar Todos os Pedidos](#listar-todos-os-pedidos)
  - [Detalhes do Pedido (Admin)](#detalhes-do-pedido-admin)
  - [Atualizar Status](#atualizar-status)
  - [Estatísticas](#estatísticas)
  - [Cancelar Pedido](#cancelar-pedido)
- [Webhooks](#webhooks)
  - [Webhook Asaas](#webhook-asaas)

---

## 🔐 Autenticação

Todas as rotas (exceto webhooks) requerem autenticação via JWT do Supabase.

**Header:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Obter Token:**
```bash
# Login via Supabase Auth
curl -X POST https://YOUR_SUPABASE_URL/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

---

## 📦 Endpoints Públicos

### Criar Pedido

Cria um novo pedido.

**Endpoint:** `POST /api/orders`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "items": [
    {
      "product_id": "uuid-do-produto",
      "quantity": 1
    }
  ],
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com",
    "cpfCnpj": "12345678901",
    "phone": "(11) 99999-9999",
    "mobilePhone": "(11) 99999-9999",
    "address": "Rua Exemplo",
    "addressNumber": "123",
    "complement": "Apto 45",
    "province": "Centro",
    "postalCode": "12345-678"
  },
  "shipping_address": {
    "recipient_name": "João Silva",
    "street": "Rua Exemplo",
    "number": "123",
    "complement": "Apto 45",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "postal_code": "12345-678",
    "phone": "(11) 99999-9999"
  },
  "referral_code": "ABC123",
  "notes": "Entregar pela manhã"
}
```

**Response:** `201 Created`
```json
{
  "message": "Pedido criado com sucesso",
  "order": {
    "id": "uuid-do-pedido",
    "order_number": "ORD-20250124-0001",
    "customer_id": "uuid-do-usuario",
    "customer_name": "João Silva",
    "customer_email": "joao@example.com",
    "subtotal_cents": 329000,
    "shipping_cents": 0,
    "discount_cents": 0,
    "total_cents": 329000,
    "status": "pending",
    "createdAt": "2025-01-24T10:00:00Z",
    "items": [...],
    "shippingAddress": {...}
  }
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": "uuid", "quantity": 1}],
    "customer": {...},
    "shipping_address": {...}
  }'
```

---

### Gerar Pagamento

Gera pagamento PIX ou Cartão para um pedido.

**Endpoint:** `POST /api/orders/:id/payment`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body (PIX):**
```json
{
  "payment_method": "pix"
}
```

**Body (Cartão):**
```json
{
  "payment_method": "credit_card",
  "card": {
    "holder_name": "JOAO SILVA",
    "number": "5162306219378829",
    "expiry_month": "12",
    "expiry_year": "2028",
    "ccv": "123"
  },
  "card_holder": {
    "name": "João Silva",
    "email": "joao@example.com",
    "cpfCnpj": "12345678901",
    "postalCode": "12345-678",
    "addressNumber": "123",
    "phone": "(11) 99999-9999",
    "mobilePhone": "(11) 99999-9999"
  },
  "installments": 3,
  "remote_ip": "192.168.1.1"
}
```

**Response PIX:** `201 Created`
```json
{
  "message": "Pagamento PIX gerado com sucesso",
  "payment": {
    "id": "uuid-do-payment",
    "method": "pix",
    "status": "pending",
    "amount": 3290.00,
    "pix": {
      "qr_code": "data:image/png;base64,...",
      "copy_paste": "00020126580014br.gov.bcb.pix...",
      "expires_at": "2025-01-25T10:00:00Z"
    }
  }
}
```

**Response Cartão:** `201 Created`
```json
{
  "message": "Pagamento processado com sucesso",
  "payment": {
    "id": "uuid-do-payment",
    "method": "credit_card",
    "status": "confirmed",
    "amount": 3290.00,
    "card": {
      "brand": "VISA",
      "last_digits": "8829",
      "installments": 3
    }
  }
}
```

**Exemplo cURL (PIX):**
```bash
curl -X POST http://localhost:3000/api/orders/ORDER_ID/payment \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payment_method": "pix"}'
```

---

### Listar Meus Pedidos

Lista pedidos do usuário autenticado.

**Endpoint:** `GET /api/orders/my-orders`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Items por página (padrão: 20, máx: 100)
- `status` (opcional): Filtrar por status
- `order_number` (opcional): Filtrar por número do pedido
- `date_from` (opcional): Data inicial (ISO 8601)
- `date_to` (opcional): Data final (ISO 8601)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-20250124-0001",
      "status": "paid",
      "total_cents": 329000,
      "createdAt": "2025-01-24T10:00:00Z",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/orders/my-orders?page=1&limit=20&status=paid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Detalhes do Pedido

Busca detalhes completos de um pedido.

**Endpoint:** `GET /api/orders/:id`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "order_number": "ORD-20250124-0001",
  "customer_name": "João Silva",
  "status": "paid",
  "total_cents": 329000,
  "items": [...],
  "payment": {...},
  "shippingAddress": {...},
  "createdAt": "2025-01-24T10:00:00Z"
}
```

**Exemplo cURL:**
```bash
curl -X GET http://localhost:3000/api/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Status do Pedido

Busca status atual e histórico de um pedido.

**Endpoint:** `GET /api/orders/:id/status`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
{
  "current_status": "paid",
  "history": [
    {
      "id": "uuid",
      "from_status": null,
      "to_status": "pending",
      "created_at": "2025-01-24T10:00:00Z"
    },
    {
      "id": "uuid",
      "from_status": "pending",
      "to_status": "paid",
      "notes": "Pagamento confirmado via webhook Asaas",
      "created_at": "2025-01-24T10:05:00Z"
    }
  ]
}
```

---

## 👨‍💼 Endpoints Administrativos

**Requer:** `role = 'admin'` no perfil do usuário

### Listar Todos os Pedidos

Lista todos os pedidos do sistema.

**Endpoint:** `GET /api/admin/orders`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `page`, `limit`, `status`, `order_number`, `date_from`, `date_to` (mesmos da rota pública)
- `customer_id` (opcional): Filtrar por cliente

**Response:** `200 OK` (mesmo formato da rota pública)

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/admin/orders?status=pending" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

### Detalhes do Pedido (Admin)

Busca detalhes completos incluindo histórico.

**Endpoint:** `GET /api/admin/orders/:id`

**Response:** `200 OK`
```json
{
  "order": {...},
  "history": [...]
}
```

---

### Atualizar Status

Atualiza status de um pedido.

**Endpoint:** `PUT /api/admin/orders/:id/status`

**Body:**
```json
{
  "status": "processing",
  "notes": "Pedido em separação"
}
```

**Response:** `200 OK`
```json
{
  "message": "Status atualizado com sucesso",
  "order": {...}
}
```

**Status válidos:**
- `pending` → `paid`, `cancelled`
- `paid` → `processing`, `cancelled`
- `processing` → `shipped`, `cancelled`
- `shipped` → `delivered`, `cancelled`

---

### Estatísticas

Retorna estatísticas de pedidos.

**Endpoint:** `GET /api/admin/orders/stats`

**Response:** `200 OK`
```json
{
  "totalOrders": 150,
  "totalRevenue": 493500.00,
  "ordersByStatus": {
    "pending": 10,
    "paid": 50,
    "processing": 30,
    "shipped": 40,
    "delivered": 15,
    "cancelled": 5
  },
  "revenueByMonth": [
    {"month": "2025-01", "revenue": 98700.00},
    {"month": "2025-02", "revenue": 131600.00}
  ]
}
```

---

### Cancelar Pedido

Cancela um pedido (admin).

**Endpoint:** `POST /api/admin/orders/:id/cancel`

**Body:**
```json
{
  "reason": "Produto indisponível"
}
```

**Response:** `200 OK`

---

## 🔔 Webhooks

### Webhook Asaas

Recebe notificações de eventos do Asaas.

**Endpoint:** `POST /webhooks/asaas`

**Headers:**
```
asaas-access-token: YOUR_WEBHOOK_TOKEN
Content-Type: application/json
```

**Body:** (Enviado pelo Asaas)
```json
{
  "id": "evt_xxxxx",
  "event": "PAYMENT_CONFIRMED",
  "dateCreated": "2025-01-24T10:00:00Z",
  "payment": {
    "id": "pay_xxxxx",
    "status": "CONFIRMED",
    "value": 3290.00,
    ...
  }
}
```

**Response:** `200 OK`
```json
{
  "received": true
}
```

**Eventos Processados:**
- `PAYMENT_CONFIRMED` - Pagamento confirmado
- `PAYMENT_RECEIVED` - Pagamento recebido
- `PAYMENT_OVERDUE` - Pagamento vencido
- `PAYMENT_REFUNDED` - Pagamento estornado
- `PAYMENT_CANCELLED` - Pagamento cancelado

**Configurar no Asaas:**
1. Acesse: https://www.asaas.com/config/webhooks
2. URL: `https://seu-dominio.com/webhooks/asaas`
3. Token: Mesmo valor de `ASAAS_WEBHOOK_TOKEN` no `.env`
4. Eventos: Selecionar todos de pagamento

---

## 🚨 Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `MISSING_TOKEN` | Token de autenticação ausente |
| `INVALID_TOKEN` | Token inválido ou expirado |
| `FORBIDDEN` | Acesso negado (requer admin) |
| `ORDER_NOT_FOUND` | Pedido não encontrado |
| `PRODUCT_NOT_FOUND` | Produto não encontrado |
| `INSUFFICIENT_STOCK` | Estoque insuficiente |
| `INVALID_ORDER_STATUS` | Status do pedido inválido |
| `PAYMENT_ALREADY_EXISTS` | Pedido já possui pagamento |
| `ASAAS_CUSTOMER_ERROR` | Erro ao criar customer no Asaas |
| `ASAAS_PIX_ERROR` | Erro ao gerar cobrança PIX |
| `ASAAS_CARD_ERROR` | Erro ao processar cartão |
| `REMOTE_IP_REQUIRED` | remoteIp obrigatório para cartão |
| `INVALID_PAYMENT_METHOD` | Método de pagamento inválido |
| `INVALID_STATUS_TRANSITION` | Transição de status inválida |
| `CANNOT_CANCEL` | Pedido não pode ser cancelado |

---

## 📝 Notas Importantes

### Pagamento com Cartão
- `remote_ip` é **obrigatório**
- Parcelamento: 1 a 21x (Visa/Mastercard)
- Dados do cartão **não são armazenados** (apenas últimos 4 dígitos)

### Splits Automáticos
- Configurados **na criação** da cobrança
- Executados automaticamente pelo Asaas
- 30% dividido entre afiliados e gestores
- 70% para a fábrica (automático)

### Webhooks
- Validação via `authToken` no header
- Idempotência garantida (eventos não são reprocessados)
- Processamento assíncrono
- Sempre retornar 200 para não reenviar

### RLS (Row Level Security)
- Usuários veem apenas próprios pedidos
- Admins veem todos os pedidos
- Logs do Asaas apenas para admins


---

## 👥 Endpoints de Afiliados

### Registrar Afiliado

Registra um novo afiliado no sistema.

**Endpoint:** `POST /api/affiliates`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999",
  "wallet_id": "wal_abcdefghij1234567890",
  "referral_code": "ABC123",
  "cpf_cnpj": "12345678901"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid-do-afiliado",
    "name": "João Silva",
    "email": "joao@example.com",
    "referral_code": "JOAO123",
    "status": "pending",
    "created_at": "2025-01-25T10:00:00Z"
  },
  "timestamp": "2025-01-25T10:00:00Z"
}
```

**Erros:**
- `422 Unprocessable Entity` - Dados inválidos
- `409 Conflict` - Email ou Wallet ID já cadastrado

---

### Validar Wallet ID

Valida se um Wallet ID do Asaas é válido.

**Endpoint:** `POST /api/affiliates/validate-wallet`

**Body:**
```json
{
  "wallet_id": "wal_abcdefghij1234567890"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "valid": true,
    "active": true,
    "name": "João Silva"
  }
}
```

---

### Meu Dashboard (Afiliado)

Retorna dados do dashboard do afiliado autenticado.

**Endpoint:** `GET /api/affiliate/dashboard`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_commissions_cents": 150000,
      "pending_commissions_cents": 50000,
      "paid_commissions_cents": 100000,
      "available_balance_cents": 100000,
      "total_referrals": 15,
      "active_referrals": 12
    },
    "recent_commissions": [...],
    "network_summary": {
      "n1": 5,
      "n2": 7,
      "n3": 3
    }
  }
}
```

---

### Minha Rede (Afiliado)

Retorna a rede genealógica do afiliado.

**Endpoint:** `GET /api/affiliate/network`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Afiliado N1",
      "level": 1,
      "status": "active",
      "joined_at": "2025-01-20T10:00:00Z",
      "children": [...]
    }
  ]
}
```

---

### Minhas Comissões (Afiliado)

Lista comissões do afiliado autenticado.

**Endpoint:** `GET /api/affiliate/commissions`

**Query Params:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 50)
- `status` (opcional): Filtrar por status (pending, paid, cancelled)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "order_id": "uuid",
        "amount_cents": 49350,
        "level": 1,
        "percentage": 15,
        "status": "paid",
        "paid_at": "2025-01-25T10:00:00Z",
        "created_at": "2025-01-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2,
      "hasMore": true
    }
  }
}
```

---

## 🔧 Endpoints Administrativos - Afiliados

### Listar Todos os Afiliados (Admin)

**Endpoint:** `GET /api/admin/affiliates`

**Query Params:**
- `page` (opcional): Número da página
- `limit` (opcional): Itens por página
- `status` (opcional): Filtrar por status
- `search` (opcional): Buscar por nome/email
- `sortBy` (opcional): Campo de ordenação
- `sortOrder` (opcional): asc ou desc

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

---

### Buscar Afiliado por ID (Admin)

**Endpoint:** `GET /api/admin/affiliates/:id`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "wallet_id": "wal_xxx",
    "status": "active",
    "referral_code": "JOAO123",
    "total_commissions_cents": 150000,
    "available_balance_cents": 100000,
    "created_at": "2025-01-20T10:00:00Z"
  }
}
```

---

### Atualizar Status de Afiliado (Admin)

**Endpoint:** `PUT /api/admin/affiliates/:id/status`

**Body:**
```json
{
  "status": "active",
  "reason": "Documentação aprovada"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "active",
    "updated_at": "2025-01-25T10:00:00Z"
  }
}
```

---

### Estatísticas de Afiliados (Admin)

**Endpoint:** `GET /api/admin/affiliates/stats`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total": 150,
    "active": 120,
    "pending": 20,
    "inactive": 10
  }
}
```

---

## 💰 Endpoints de Comissões

### Listar Todas as Comissões (Admin)

**Endpoint:** `GET /api/admin/commissions`

**Query Params:**
- `page`, `limit`, `status`, `affiliate_id`, `start_date`, `end_date`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {...}
  }
}
```

---

### Estatísticas de Comissões (Admin)

**Endpoint:** `GET /api/admin/commissions/stats`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_commissions_cents": 5000000,
    "pending_commissions_cents": 1500000,
    "paid_commissions_cents": 3500000,
    "total_count": 500,
    "pending_count": 150,
    "paid_count": 350
  }
}
```

---

### Marcar Comissão como Paga (Admin)

**Endpoint:** `POST /api/admin/commissions/:id/approve`

**Body:**
```json
{
  "admin_id": "uuid-do-admin"
}
```

**Response:** `200 OK`

---

## 💸 Endpoints de Saques

### Solicitar Saque (Afiliado)

**Endpoint:** `POST /api/affiliate/withdrawals`

**Body:**
```json
{
  "amount_cents": 10000,
  "bank_code": "001",
  "bank_name": "Banco do Brasil",
  "agency": "1234",
  "account": "12345678",
  "account_type": "checking",
  "account_holder_name": "João Silva",
  "account_holder_document": "12345678901"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "amount_cents": 10000,
    "status": "pending",
    "requested_at": "2025-01-25T10:00:00Z"
  }
}
```

---

### Listar Todos os Saques (Admin)

**Endpoint:** `GET /api/admin/withdrawals`

**Query Params:**
- `page`, `limit`, `status`, `affiliate_id`

**Response:** `200 OK`

---

### Aprovar Saque (Admin)

**Endpoint:** `POST /api/admin/withdrawals/:id/approve`

**Body:**
```json
{
  "admin_id": "uuid-do-admin",
  "reason": "Aprovado conforme política"
}
```

**Response:** `200 OK`

---

### Rejeitar Saque (Admin)

**Endpoint:** `POST /api/admin/withdrawals/:id/reject`

**Body:**
```json
{
  "admin_id": "uuid-do-admin",
  "reason": "Dados bancários inválidos"
}
```

**Response:** `200 OK`

---

### Estatísticas de Saques (Admin)

**Endpoint:** `GET /api/admin/withdrawals/stats`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_withdrawals": 50,
    "pending_withdrawals": 10,
    "approved_withdrawals": 35,
    "rejected_withdrawals": 5,
    "total_amount_cents": 500000
  }
}
```

---

## 🚨 Códigos de Erro

### Códigos HTTP

- `200 OK` - Sucesso
- `201 Created` - Recurso criado
- `400 Bad Request` - Requisição inválida
- `401 Unauthorized` - Não autenticado
- `403 Forbidden` - Sem permissão
- `404 Not Found` - Recurso não encontrado
- `409 Conflict` - Conflito (duplicação)
- `422 Unprocessable Entity` - Erro de validação
- `500 Internal Server Error` - Erro interno

### Formato de Erro

```json
{
  "success": false,
  "error": "Mensagem de erro amigável",
  "code": "ERROR_CODE",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "Email inválido",
        "code": "invalid_string"
      }
    ]
  },
  "timestamp": "2025-01-25T10:00:00Z"
}
```

### Códigos de Erro Comuns

- `VALIDATION_ERROR` - Erro de validação de dados
- `UNAUTHORIZED` - Não autenticado
- `FORBIDDEN` - Sem permissão
- `NOT_FOUND` - Recurso não encontrado
- `CONFLICT` - Recurso já existe
- `INTERNAL_ERROR` - Erro interno do servidor
- `BAD_REQUEST` - Requisição inválida
- `SERVICE_UNAVAILABLE` - Serviço indisponível

---

## 📝 Notas Importantes

1. **Autenticação**: Todos os endpoints (exceto webhooks) requerem JWT do Supabase
2. **Paginação**: Padrão de 50 itens por página, máximo de 100
3. **Timestamps**: Todos em formato ISO 8601 (UTC)
4. **Valores Monetários**: Sempre em centavos (cents)
5. **RLS**: Row Level Security ativo - usuários veem apenas seus dados
6. **Rate Limiting**: 100 requisições por 15 minutos por IP

---

**Última atualização:** 2025-01-25  
**Versão da API:** 1.0.0
