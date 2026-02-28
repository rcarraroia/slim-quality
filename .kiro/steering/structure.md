# ARQUITETURA: SLIM QUALITY BACKEND
## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 🏗️ VISÃO GERAL

**Tipo:** API REST + Edge Functions  
**Arquitetura:** Backend-as-a-Service (Supabase) + Node.js  
**Padrão:** Modular, com separação de responsabilidades  

---

## 📐 STACK TÉCNICA

### Backend
- **Runtime:** Node.js 18+
- **Linguagem:** TypeScript
- **Framework:** Express.js (ou NestJS)
- **ORM/Query Builder:** Supabase Client + Raw SQL

### Banco de Dados
- **SGBD:** PostgreSQL (via Supabase)
- **Versionamento:** Migrations (Supabase CLI)
- **Segurança:** Row Level Security (RLS)

### Infraestrutura
- **BaaS:** Supabase
- **Edge Functions:** Deno (Supabase Functions)
- **Storage:** Supabase Storage (S3-compatible)
- **Auth:** Supabase Auth (JWT)

### Integrações
- **Pagamento:** Asaas API
- **Automação:** N8N (self-hosted ou cloud)
- **Mensageria:** WhatsApp Business API

---

## 📁 ESTRUTURA DE PASTAS (Backend)
```
slim-quality-backend/
├── supabase/
│   ├── functions/           # Edge Functions (Deno)
│   │   ├── webhook-asaas/
│   │   ├── process-payment/
│   │   └── calculate-commissions/
│   ├── migrations/          # SQL Migrations
│   │   ├── 20250101000000_initial_schema.sql
│   │   ├── 20250102000000_add_affiliates.sql
│   │   └── ...
│   └── config.toml          # Supabase config
│
├── src/
│   ├── api/                 # Express API (se necessário)
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   └── validators/
│   │
│   ├── services/            # Lógica de negócio
│   │   ├── affiliates/
│   │   │   ├── commission-calculator.ts
│   │   │   ├── network-builder.ts
│   │   │   └── redistribution-logic.ts
│   │   ├── sales/
│   │   │   ├── order-processor.ts
│   │   │   └── payment-handler.ts
│   │   ├── asaas/
│   │   │   ├── api-client.ts
│   │   │   ├── split-manager.ts
│   │   │   └── webhook-handler.ts
│   │   └── notifications/
│   │       ├── email-sender.ts
│   │       └── whatsapp-sender.ts
│   │
│   ├── types/               # TypeScript types
│   │   ├── database.types.ts  # Gerado do Supabase
│   │   ├── api.types.ts
│   │   └── business.types.ts
│   │
│   ├── utils/               # Utilitários
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── logger.ts
│   │
│   └── config/              # Configurações
│       ├── database.ts
│       ├── asaas.ts
│       └── app.ts
│
├── tests/                   # Testes
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                 # Scripts utilitários
│   ├── seed-database.ts
│   ├── migrate.ts
│   └── analyze-commissions.ts
│
├── docs/                    # Documentação
│   ├── API.md
│   ├── SUPABASE_ACCESS.md
│   └── DEPLOYMENT.md
│
├── .kiro/                   # Kiro AI
│   └── steering/
│       ├── product.md
│       ├── structure.md
│       └── tech.md
│
├── .env.example             # Variáveis de ambiente (template)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ ARQUITETURA DO BANCO DE DADOS

### Módulos Principais

#### 1. Autenticação e Usuários
```
users (Supabase Auth)
├── profiles (1:1)
└── user_roles (1:N)
```

#### 2. Produtos
```
products
├── product_images (1:N)
├── product_technologies (N:N)
└── inventory_logs (1:N)

technologies
```

#### 3. Vendas
```
orders
├── order_items (1:N)
├── order_status_history (1:N)
├── payments (1:1)
└── shipping_addresses (1:1)

asaas_transactions
asaas_splits
```

#### 4. Afiliados (CRÍTICO)
```
affiliates
├── affiliate_network (self-referencing tree)
│   ├── N1 (diretos)
│   ├── N2 (indicados dos diretos)
│   └── N3 (terceiro nível)
├── referral_codes (1:N)
├── referral_clicks (1:N)
├── referral_conversions (1:N)
└── show_room_purchases (1:N) ✨ NOVO

commissions
├── commission_splits (1:N)
├── commission_payments (1:N)
└── commission_logs (1:N)

asaas_wallets

show_room_purchases ✨ NOVO
├── affiliate_id (FK → affiliates)
├── product_id (FK → products)
├── order_id (FK → orders)
├── purchased_at (timestamp)
└── UNIQUE(affiliate_id, product_id) ← Impede duplicação
```

**Tabela `show_room_purchases`:**
- **Objetivo:** Controlar compras de produtos Show Room por logistas
- **Regra:** 1 unidade de cada modelo por logista (sem reposição)
- **Constraint:** UNIQUE(affiliate_id, product_id) garante unicidade
- **RLS:** 4 políticas (logistas, admins, system, delete)
- **Índices:** 5 índices para performance
- **Migration:** `supabase/migrations/20260227120000_create_show_room_purchases.sql`

#### 5. CRM
```
customers
├── customer_tags (N:N)
├── customer_notes (1:N)
└── customer_timeline (1:N)

conversations
└── messages (1:N)

appointments
```

#### 6. Automações
```
automations
├── automation_triggers (1:N)
├── automation_actions (1:N)
├── automation_conditions (1:N)
└── automation_logs (1:N)
```

---

## 🔄 FLUXOS CRÍTICOS

### 1. Fluxo de Venda Completo
```
1. Cliente acessa site/landing page
   └─ Tracking: origem, referral_code (se houver)

2. Cliente interage com BIA (N8N)
   └─ Qualificação do lead
   └─ Identificação de problemas de saúde
   └─ Recomendação de produto

3. Cliente decide comprar
   └─ Criar pedido (orders)
   └─ Gerar cobrança (Asaas API)
   └─ Aguardar confirmação de pagamento

4. Webhook Asaas confirma pagamento
   └─ Atualizar status do pedido
   └─ Identificar origem (link de afiliado?)
   └─ TRIGGER: Calcular comissões

5. Cálculo de Comissões (automático)
   └─ Identificar afiliado N1 (se houver)
   └─ Buscar N2 e N3 na árvore
   └─ Calcular valores (15%, 3%, 2%, gestores)
   └─ Aplicar redistribuição (se necessário)
   └─ Criar registros de comissões

6. Split Automático (Asaas)
   └─ Validar todas as Wallet IDs
   └─ Enviar requisição de split
   └─ Confirmar depósitos
   └─ Notificar afiliados

7. Pós-Venda
   └─ Atualizar métricas
   └─ Enviar notificações
   └─ Registrar na timeline do cliente
```

### 2. Fluxo de Cadastro de Afiliado
```
1. Candidato acessa /afiliados/cadastro
2. Preenche formulário (dados + Wallet ID Asaas)
3. Sistema valida Wallet ID
   └─ Chamada à API Asaas
   └─ Verificar se Wallet existe e está ativa
4. Sistema verifica código de indicação (opcional)
   └─ Se houver: Linkar na árvore genealógica
   └─ Se não: Afiliado direto (raiz)
5. Criar registro em `affiliates`
6. Gerar código de indicação único
7. Enviar email de boas-vindas
8. Ativar afiliado (ou aguardar aprovação manual)
```

### 3. Fluxo de Rastreamento de Indicação
```
1. Afiliado compartilha link:
   https://slimquality.com.br?ref=ABC123

2. Visitante clica no link
   └─ Salvar cookie/localStorage: ref=ABC123
   └─ Registrar click em `referral_clicks`

3. Visitante navega pelo site
   └─ Cookie persiste durante sessão

4. Visitante compra
   └─ Recuperar ref=ABC123 do cookie
   └─ Associar order ao afiliado
   └─ Registrar em `referral_conversions`

5. Pagamento confirmado
   └─ Disparar cálculo de comissões
   └─ Creditar afiliado N1 + ascendentes
```

---

## ⚡ EDGE FUNCTIONS (Supabase)

### Funções Principais

#### 1. `webhook-asaas`
**Trigger:** POST externo (webhook Asaas)  
**Função:** Processar notificações de pagamento  
**Ações:**
- Validar assinatura do webhook
- Atualizar status do pedido
- Disparar cálculo de comissões
- Registrar logs

#### 2. `calculate-commissions`
**Trigger:** Chamada interna (após confirmação de pagamento)  
**Função:** Calcular comissões multinível  
**Ações:**
- Buscar árvore genealógica do afiliado
- Calcular valores de N1, N2, N3
- Aplicar redistribuição
- Criar registros de comissões
- Enviar para `process-split`

#### 3. `process-split`
**Trigger:** Chamada interna (após calcular comissões)  
**Função:** Executar split no Asaas  
**Ações:**
- Validar todas as Wallet IDs
- Montar payload de split
- Enviar para API Asaas
- Confirmar depósitos
- Atualizar status das comissões
- Notificar afiliados

#### 4. `validate-wallet`
**Trigger:** Chamada externa/interna  
**Função:** Validar Wallet ID do Asaas  
**Retorno:** `{ valid: boolean, active: boolean, name: string }`

#### 5. `notify-commission`
**Trigger:** Chamada interna (após split confirmado)  
**Função:** Notificar afiliado sobre comissão recebida  
**Canais:** Email + WhatsApp (opcional)

---

## 🔐 SEGURANÇA

### Row Level Security (RLS)

**Todas as tabelas devem ter RLS ativo!**

#### Políticas Padrão

**Tabela `profiles`:**
```sql
-- Usuários veem apenas o próprio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins veem todos
CREATE POLICY "Admins view all profiles"
  ON profiles FOR SELECT
  USING (has_role('admin'));
```

**Tabela `orders`:**
```sql
-- Clientes veem apenas próprios pedidos
CREATE POLICY "Users view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id);

-- Vendedores e admins veem todos
CREATE POLICY "Staff view all orders"
  ON orders FOR SELECT
  USING (has_role('admin') OR has_role('vendedor'));
```

**Tabela `affiliates`:**
```sql
-- Afiliados veem apenas próprios dados
CREATE POLICY "Affiliates view own data"
  ON affiliates FOR SELECT
  USING (auth.uid() = user_id);

-- Afiliados veem apenas própria rede
CREATE POLICY "Affiliates view own network"
  ON affiliate_network FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM affiliates WHERE id = affiliate_id
    )
  );
```

### Validações Críticas

1. **Wallet ID:** SEMPRE validar via API Asaas antes de cadastrar
2. **Split:** SEMPRE validar que soma = 100% do valor
3. **Árvore:** SEMPRE verificar que não há loops (A → B → A)
4. **Comissões:** SEMPRE registrar logs de cálculo para auditoria

---

## 📊 PADRÕES DE CÓDIGO

### Convenções de Nomenclatura

**Tabelas:** `snake_case` (plural)
```sql
users, orders, affiliates, commission_logs
```

**Colunas:** `snake_case`
```sql
created_at, wallet_id, commission_percentage
```

**Funções/Services:** `camelCase`
```typescript
calculateCommissions(), buildNetworkTree(), validateWalletId()
```

**Tipos TypeScript:** `PascalCase`
```typescript
Order, Affiliate, CommissionSplit
```

---

**Este documento é a FONTE DA VERDADE sobre a arquitetura técnica.**
**Consulte sempre que for implementar novas features ou módulos.**
