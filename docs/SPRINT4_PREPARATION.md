# Preparação para Sprint 4 - Sistema de Afiliados

## ✅ Checklist de Preparação

### Estrutura de Banco de Dados

- [x] **Campos de afiliados em `orders`**
  - `referral_code` - Código de indicação usado
  - `affiliate_n1_id` - Afiliado direto (vendedor)
  - `affiliate_n2_id` - Indicado do N1
  - `affiliate_n3_id` - Indicado do N2
  - Índices criados para performance

- [x] **Sistema de splits configurado**
  - Tabela `asaas_splits` para auditoria
  - Cálculo automático de comissões (30%)
  - Redistribuição implementada
  - Logs completos de transações

- [x] **Webhooks processando corretamente**
  - Validação de authToken
  - Idempotência (asaas_event_id UNIQUE)
  - Processamento assíncrono
  - Handlers para todos os eventos
  - Atualização automática de status

- [x] **Wallet IDs configurados**
  - `ASAAS_WALLET_RENUM` no .env
  - `ASAAS_WALLET_JB` no .env
  - Validação de Wallet IDs implementada

### Lógica de Comissões

- [x] **Cálculo de splits implementado**
  - Método `calculateSplits()` no AsaasService
  - Percentuais corretos (15%, 3%, 2%, 5%, 5%)
  - Redistribuição automática
  - Validação de soma = 30%

- [x] **Integração com Asaas**
  - Splits configurados NA CRIAÇÃO da cobrança
  - Execução automática pelo Asaas
  - Logs de auditoria completos

## 📋 O Que Falta para Sprint 4

### 1. Tabela de Afiliados

Criar tabela `affiliates`:

```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Dados pessoais
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  cpf VARCHAR(14) NOT NULL,
  
  -- Asaas
  wallet_id VARCHAR(50) NOT NULL UNIQUE,
  wallet_validated BOOLEAN DEFAULT FALSE,
  
  -- Código de indicação
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  
  -- Rede genealógica
  sponsor_id UUID REFERENCES affiliates(id), -- Quem indicou
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);
```

### 2. Tabela de Comissões

Criar tabela `commissions`:

```sql
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  order_id UUID NOT NULL REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  
  -- Tipo
  level VARCHAR(10) NOT NULL, -- 'n1', 'n2', 'n3', 'renum', 'jb'
  
  -- Valores
  percentage DECIMAL(5,2) NOT NULL,
  amount_cents INTEGER NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  
  -- Asaas
  asaas_split_id VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Serviços a Criar

**AffiliateService:**
- `createAffiliate()` - Cadastrar afiliado
- `validateWalletId()` - Validar Wallet ID no Asaas
- `generateReferralCode()` - Gerar código único
- `getAffiliateByCode()` - Buscar por código
- `getAffiliateNetwork()` - Buscar rede genealógica
- `approveAffiliate()` - Aprovar afiliado (admin)

**CommissionService:**
- `calculateCommissions()` - Calcular comissões de um pedido
- `createCommissionRecords()` - Criar registros de comissões
- `getAffiliateCommissions()` - Listar comissões de um afiliado
- `getCommissionStats()` - Estatísticas de comissões

**NetworkService:**
- `buildNetworkTree()` - Construir árvore genealógica
- `findUpline()` - Buscar ascendentes (N1, N2, N3)
- `validateNetwork()` - Validar que não há loops
- `getNetworkStats()` - Estatísticas da rede

### 4. Controllers a Criar

**AffiliatesController:**
- `POST /api/affiliates/register` - Cadastro de afiliado
- `GET /api/affiliates/me` - Dados do afiliado logado
- `GET /api/affiliates/network` - Rede do afiliado
- `GET /api/affiliates/commissions` - Comissões do afiliado
- `GET /api/affiliates/stats` - Estatísticas do afiliado

**AdminAffiliatesController:**
- `GET /api/admin/affiliates` - Listar todos
- `GET /api/admin/affiliates/:id` - Detalhes
- `PUT /api/admin/affiliates/:id/approve` - Aprovar
- `GET /api/admin/affiliates/stats` - Estatísticas gerais

### 5. Integração com Orders

**Atualizar OrderService:**

```typescript
async createOrder(userId: string, input: CreateOrderInput) {
  // ...código existente...
  
  // Se houver referral_code, buscar afiliados
  if (input.referral_code) {
    const affiliate = await affiliateService.getAffiliateByCode(input.referral_code);
    
    if (affiliate) {
      // Buscar rede (N1, N2, N3)
      const network = await networkService.findUpline(affiliate.id);
      
      // Salvar no pedido
      order.affiliate_n1_id = network.n1?.id;
      order.affiliate_n2_id = network.n2?.id;
      order.affiliate_n3_id = network.n3?.id;
    }
  }
  
  // ...resto do código...
}
```

**Atualizar WebhookService:**

```typescript
async handlePaymentConfirmed(orderId: string, paymentId: string) {
  // ...código existente...
  
  // Criar registros de comissões
  const order = await orderService.getOrderById(orderId);
  
  if (order.affiliate_n1_id) {
    await commissionService.calculateCommissions(orderId);
  }
  
  // ...resto do código...
}
```

### 6. Frontend a Criar

**Páginas:**
- `/afiliados/cadastro` - Cadastro de afiliado
- `/afiliados/dashboard` - Dashboard do afiliado
- `/afiliados/rede` - Visualização da rede
- `/afiliados/comissoes` - Histórico de comissões
- `/admin/afiliados` - Gestão de afiliados (admin)

**Componentes:**
- `AffiliateRegistrationForm` - Formulário de cadastro
- `NetworkTree` - Árvore genealógica visual
- `CommissionsList` - Lista de comissões
- `AffiliateStats` - Estatísticas do afiliado

## 🔄 Fluxo Completo (Sprint 4)

```
1. Afiliado se cadastra
   └─ POST /api/affiliates/register
   └─ Validar Wallet ID no Asaas
   └─ Gerar código de indicação único
   └─ Aguardar aprovação (admin)

2. Admin aprova afiliado
   └─ PUT /api/admin/affiliates/:id/approve
   └─ Afiliado recebe email de boas-vindas

3. Afiliado compartilha link
   └─ https://slimquality.com.br?ref=ABC123
   └─ Cookie/localStorage salva código

4. Cliente compra usando link
   └─ POST /api/orders (com referral_code)
   └─ Sistema identifica afiliado N1
   └─ Busca N2 e N3 na árvore
   └─ Salva IDs no pedido

5. Pagamento confirmado
   └─ Webhook PAYMENT_CONFIRMED
   └─ Calcular comissões (15%, 3%, 2%, 5%, 5%)
   └─ Aplicar redistribuição se necessário
   └─ Criar registros em commissions
   └─ Split já foi configurado na criação

6. Asaas executa split automaticamente
   └─ Valores creditados nas Wallets
   └─ Webhook PAYMENT_RECEIVED
   └─ Atualizar status das comissões
   └─ Notificar afiliados
```

## 📊 Métricas a Implementar

### Para Afiliados
- Total de vendas geradas
- Comissões totais (por nível)
- Comissões pendentes vs pagas
- Tamanho da rede (N1, N2, N3)
- Taxa de conversão do link

### Para Admin
- Total de afiliados ativos
- Total de comissões pagas
- Afiliados top performers
- Crescimento da rede
- ROI do programa

## 🔐 Validações Importantes

### Cadastro de Afiliado
- ✅ Wallet ID válida no Asaas
- ✅ CPF válido e único
- ✅ Email único
- ✅ Código de indicação único
- ✅ Não permitir loops na rede (A → B → A)

### Cálculo de Comissões
- ✅ Soma sempre = 30%
- ✅ Redistribuição correta
- ✅ Valores em centavos (sem arredondamento)
- ✅ Logs completos para auditoria

### Segurança
- ✅ RLS para afiliados (ver apenas próprios dados)
- ✅ Admin pode ver tudo
- ✅ Validar ownership em todas as rotas
- ✅ Não expor Wallet IDs de outros afiliados

## 📝 Documentação Necessária

- [ ] Guia de cadastro de afiliado
- [ ] Guia de uso do dashboard
- [ ] FAQ sobre comissões
- [ ] Termos e condições do programa
- [ ] Política de comissões

## 🎯 Critérios de Aceite Sprint 4

### Funcionalidades
- [ ] Afiliado pode se cadastrar
- [ ] Admin pode aprovar afiliados
- [ ] Afiliado pode compartilhar link
- [ ] Sistema rastreia origem da venda
- [ ] Comissões são calculadas automaticamente
- [ ] Splits são executados pelo Asaas
- [ ] Afiliado vê dashboard com métricas
- [ ] Afiliado vê rede genealógica
- [ ] Afiliado vê histórico de comissões

### Técnico
- [ ] Tabelas criadas e migradas
- [ ] Serviços implementados
- [ ] Controllers implementados
- [ ] Rotas configuradas
- [ ] Validações implementadas
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Documentação completa

### Segurança
- [ ] RLS configurado
- [ ] Validações de ownership
- [ ] Wallet IDs protegidas
- [ ] Logs de auditoria
- [ ] Prevenção de loops na rede

## 🚀 Pronto para Sprint 4!

O sistema está **100% preparado** para receber o módulo de afiliados:

✅ Estrutura de banco pronta
✅ Campos de afiliados em orders
✅ Sistema de splits funcionando
✅ Webhooks processando corretamente
✅ Cálculo de comissões implementado
✅ Redistribuição automática
✅ Logs completos de auditoria

**Próximo passo:** Implementar tabelas de afiliados e comissões!
