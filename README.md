# Slim Quality - Sistema de Vendas e Afiliados

Sistema completo de e-commerce com integração Asaas para pagamentos e splits automáticos de comissões.

## 🎯 Visão Geral

Sistema de vendas de colchões magnéticos terapêuticos com:
- ✅ Gestão completa de pedidos
- ✅ Pagamentos via PIX e Cartão (Asaas)
- ✅ Splits automáticos de comissões (30%)
- ✅ Sistema de afiliados multinível (preparado)
- ✅ Webhooks com idempotência
- ✅ Controle de estoque automático
- ✅ Dashboard administrativo

## 📋 Índice

- [Stack Técnica](#stack-técnica)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Migrations](#migrations)
- [Executar](#executar)
- [Documentação](#documentação)
- [Integração Asaas](#integração-asaas)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Scripts Disponíveis](#scripts-disponíveis)

## 🛠️ Stack Técnica

### Backend
- **Node.js** 18+
- **TypeScript** 5.x
- **Express.js** 4.x
- **Supabase** (PostgreSQL + Auth + RLS)

### Integrações
- **Asaas** - Gateway de pagamento e splits
- **N8N** - Automação (BIA)
- **WhatsApp Business** - Atendimento

### Bibliotecas Principais
```json
{
  "@supabase/supabase-js": "^2.x",
  "express": "^4.x",
  "axios": "^1.x",
  "zod": "^3.x",
  "cors": "^2.x",
  "helmet": "^7.x",
  "dotenv": "^16.x"
}
```

## 📦 Instalação

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/slim-quality-backend.git
cd slim-quality-backend

# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Editar variáveis de ambiente
nano .env
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Edite o arquivo `.env`:

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-publica
SUPABASE_SERVICE_KEY=sua-chave-privada

# Asaas
ASAAS_API_KEY=sua-api-key-asaas
ASAAS_ENVIRONMENT=sandbox # ou production
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx
ASAAS_WEBHOOK_TOKEN=seu-token-secreto

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### 2. Obter Credenciais Asaas

**Sandbox (Testes):**
1. Criar conta: https://sandbox.asaas.com
2. API Key: https://sandbox.asaas.com/config/api
3. Wallet IDs: Criar subcontas para Renum e JB

**Produção:**
1. Criar conta: https://www.asaas.com
2. Completar verificação KYC
3. Obter API Key e Wallet IDs

### 3. Configurar Webhooks no Asaas

1. Acesse: https://www.asaas.com/config/webhooks (ou sandbox)
2. **URL:** `https://seu-dominio.com/webhooks/asaas`
3. **Token:** Mesmo valor de `ASAAS_WEBHOOK_TOKEN`
4. **Eventos:** Selecionar todos de pagamento:
   - PAYMENT_CONFIRMED
   - PAYMENT_RECEIVED
   - PAYMENT_OVERDUE
   - PAYMENT_REFUNDED
   - PAYMENT_CANCELLED

## 🗄️ Migrations

### Aplicar Migrations

```bash
# Via Supabase CLI (recomendado)
supabase db push

# Ou via script
npm run migrate
```

### Validar Banco de Dados

```bash
npm run validate:db
```

### Estrutura Criada

- ✅ 8 tabelas (orders, payments, etc)
- ✅ 4 enums (order_status, payment_status, etc)
- ✅ 3 funções (generate_order_number, etc)
- ✅ Triggers automáticos
- ✅ Políticas RLS completas
- ✅ Índices otimizados

## 🚀 Executar

### Desenvolvimento

```bash
npm run dev
```

Servidor rodando em: http://localhost:3000

### Produção

```bash
# Build
npm run build

# Start
npm start
```

### Health Check

```bash
curl http://localhost:3000/health
```

## 📚 Documentação

### API Endpoints

Documentação completa: [docs/API.md](docs/API.md)

**Endpoints Principais:**
- `POST /api/orders` - Criar pedido
- `POST /api/orders/:id/payment` - Gerar pagamento
- `GET /api/orders/my-orders` - Listar pedidos
- `GET /api/admin/orders` - Listar todos (admin)
- `POST /webhooks/asaas` - Webhook Asaas

### Exemplos de Uso

**Criar Pedido:**
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

**Gerar Pagamento PIX:**
```bash
curl -X POST http://localhost:3000/api/orders/ORDER_ID/payment \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payment_method": "pix"}'
```

## 💳 Integração Asaas

### Fluxo de Pagamento

```
1. Cliente cria pedido
   └─ POST /api/orders

2. Sistema gera cobrança no Asaas
   └─ POST /api/orders/:id/payment
   └─ Splits configurados automaticamente (30%)

3. Cliente paga (PIX ou Cartão)
   └─ Asaas processa pagamento

4. Webhook confirma pagamento
   └─ POST /webhooks/asaas
   └─ Status atualizado para 'paid'
   └─ Estoque reduzido
   └─ Splits executados automaticamente
```

### Splits Automáticos

**Distribuição Fixa (30% do valor):**
- 15% → Afiliado N1 (vendedor direto)
- 3% → Afiliado N2 (indicado do N1)
- 2% → Afiliado N3 (indicado do N2)
- 5% → Renum (gestor)
- 5% → JB (gestor)
- 70% → Fábrica (automático - não configurado)

**Redistribuição:**
- Sem N2 e N3: +2.5% Renum, +2.5% JB
- Sem N3: +1% Renum, +1% JB

### Cartões de Teste (Sandbox)

```
Aprovado: 5162306219378829
Rejeitado: 5162306219378837
CVV: Qualquer
Validade: Qualquer data futura
```

## 📁 Estrutura do Projeto

```
slim-quality-backend/
├── src/
│   ├── api/
│   │   ├── controllers/       # Controllers
│   │   ├── middlewares/       # Middlewares
│   │   ├── routes/            # Rotas
│   │   └── validators/        # Schemas Zod
│   ├── services/
│   │   ├── asaas/             # Integração Asaas
│   │   ├── sales/             # Lógica de vendas
│   │   └── inventory/         # Controle de estoque
│   ├── types/                 # TypeScript types
│   ├── utils/                 # Utilitários
│   ├── config/                # Configurações
│   └── server.ts              # Servidor Express
├── supabase/
│   └── migrations/            # SQL Migrations
├── scripts/                   # Scripts utilitários
├── docs/                      # Documentação
├── .env.example               # Exemplo de variáveis
├── tsconfig.json              # Config TypeScript
└── package.json
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor com hot-reload

# Build
npm run build            # Compilar TypeScript
npm start                # Executar produção

# Banco de Dados
npm run migrate          # Aplicar migrations
npm run validate:db      # Validar estrutura

# Testes
npm test                 # Executar testes
npm run test:coverage    # Cobertura de testes

# Qualidade de Código
npm run lint             # ESLint
npm run format           # Prettier
```

## 🔐 Segurança

### Implementado

- ✅ JWT Authentication (Supabase)
- ✅ Row Level Security (RLS)
- ✅ Validação de entrada (Zod)
- ✅ Webhook token validation
- ✅ Idempotência de webhooks
- ✅ Helmet.js (headers de segurança)
- ✅ CORS configurado
- ✅ Rate limiting (webhooks)
- ✅ Dados sensíveis não logados

### Boas Práticas

- Nunca commitar `.env`
- Usar `SUPABASE_SERVICE_KEY` apenas no backend
- Validar `authToken` em todos os webhooks
- Implementar rate limiting em produção
- Monitorar logs do Asaas

## 📊 Monitoramento

### Logs Estruturados

Todos os logs são em formato JSON:

```json
{
  "timestamp": "2025-01-24T10:00:00Z",
  "level": "info",
  "module": "OrderService",
  "message": "Pedido criado com sucesso",
  "context": {
    "orderId": "uuid",
    "total": 3290.00
  }
}
```

### Auditoria

Todas as transações Asaas são registradas em `asaas_transactions`:
- Request/Response completos
- Timestamps
- Status de sucesso/erro
- IDs de referência

## 🚧 Roadmap

### Sprint 3 (Atual) ✅
- [x] Sistema de vendas completo
- [x] Integração Asaas (PIX + Cartão)
- [x] Splits automáticos
- [x] Webhooks com idempotência
- [x] Controle de estoque
- [x] Dashboard admin

### Sprint 4 (Próximo)
- [ ] Sistema de afiliados completo
- [ ] Cálculo de comissões multinível
- [ ] Dashboard de afiliados
- [ ] Links de indicação rastreáveis
- [ ] Árvore genealógica

### Futuro
- [ ] Notificações (Email + WhatsApp)
- [ ] Relatórios avançados
- [ ] Integração com transportadoras
- [ ] Sistema de cupons
- [ ] Programa de fidelidade

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'Add nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário da Slim Quality.

## 📞 Suporte

- **Documentação:** [docs/API.md](docs/API.md)
- **Issues:** https://github.com/seu-usuario/slim-quality-backend/issues
- **Email:** suporte@slimquality.com.br

---

**Desenvolvido com ❤️ pela equipe Slim Quality**
