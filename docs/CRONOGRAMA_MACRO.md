# 📅 CRONOGRAMA MACRO - SLIM QUALITY BACKEND

## 📊 Visão Geral do Projeto

**Projeto:** Sistema de Vendas e Afiliados - Colchões Magnéticos Terapêuticos  
**Duração Total:** 42-55 dias (~8-10 semanas)  
**Sprints:** 10  
**Abordagem:** Incremental com validação contínua  

---

## 🗓️ Timeline dos Sprints

```
Semana 1-2:  [Sprint 0] [Sprint 1========] [Sprint 2===]
Semana 3-4:  [Sprint 3==============] [Sprint 4=================
Semana 5-6:  =========] [Sprint 5======] [Sprint 6======]
Semana 7-8:  [Sprint 7===========] [Sprint 8====] [Sprint 9=]
Semana 9-10: [Sprint 10=============]
```

---

## 📋 Detalhamento por Sprint

### Sprint 0: Setup e Infraestrutura Base
**Duração:** 2-3 dias  
**Complexidade:** ⭐ Baixa  
**Prioridade:** 🔴 Obrigatória  

**Objetivo:**  
Configurar ambiente de desenvolvimento, Supabase, estrutura de pastas e ferramentas essenciais.

**Entregas:**
- ✅ Projeto Node.js/TypeScript configurado
- ✅ Supabase linkado e testado
- ✅ Estrutura de pastas seguindo padrões
- ✅ Migrations base (função update_updated_at)
- ✅ CI/CD inicial (GitHub Actions)
- ✅ .env template
- ✅ ESLint + Prettier configurados
- ✅ Scripts NPM básicos

**Dependências:** Nenhuma

**Validação de Saída:**
- [ ] `npm run dev` funciona
- [ ] `supabase db push` funciona
- [ ] Testes básicos passam
- [ ] CI/CD executa sem erros

**Risco:** 🟢 Baixo

---

### Sprint 1: Autenticação e Gestão de Usuários
**Duração:** 3-4 dias  
**Complexidade:** ⭐⭐ Média  
**Prioridade:** 🔴 Obrigatória  

**Objetivo:**  
Implementar sistema de autenticação completo com Supabase Auth e gestão de perfis/roles.

**Entregas:**
- ✅ Login/logout/registro
- ✅ Recuperação de senha
- ✅ Tabelas: `profiles`, `user_roles`
- ✅ RLS básico
- ✅ Middleware de autenticação
- ✅ **PREPARAÇÃO CRÍTICA:** Campo `wallet_id` em `profiles` (para futuros afiliados)

**Dependências:** Sprint 0

**⚠️ ATENÇÃO CRÍTICA:**
```sql
-- profiles deve ter estrutura preparatória:
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  phone TEXT,
  wallet_id TEXT, -- ⭐ PREPARAÇÃO PARA SPRINT 4
  is_affiliate BOOLEAN DEFAULT FALSE, -- ⭐ PREPARAÇÃO PARA SPRINT 4
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Validação de Saída:**
- [ ] Usuário consegue se registrar
- [ ] Login/logout funcionando
- [ ] RLS impede acesso não autorizado
- [ ] Campo `wallet_id` existe (mesmo que null)

**Risco:** 🟡 Médio (se não preparar para Sprint 4, haverá retrabalho)

---

### Sprint 2: Catálogo de Produtos
**Duração:** 2-3 dias  
**Complexidade:** ⭐ Baixa  
**Prioridade:** 🔴 Obrigatória  

**Objetivo:**  
Criar sistema de gestão de produtos com 4 modelos de colchões e suas tecnologias.

**Entregas:**
- ✅ Tabelas: `products`, `product_images`, `technologies`, `product_technologies`
- ✅ CRUD completo de produtos
- ✅ Upload de imagens (Supabase Storage)
- ✅ API pública de catálogo
- ✅ Seed com 4 produtos iniciais

**Produtos:**
| Modelo | Preço | Dimensões |
|--------|-------|-----------|
| Solteiro | R$ 3.190,00 | 88x188x28cm |
| Padrão | R$ 3.290,00 | 138x188x28cm |
| Queen | R$ 3.490,00 | 158x198x30cm |
| King | R$ 4.890,00 | 193x203x30cm |

**Dependências:** Sprint 1

**Validação de Saída:**
- [ ] 4 produtos cadastrados
- [ ] Imagens carregando corretamente
- [ ] API pública retorna catálogo
- [ ] Tecnologias vinculadas aos produtos

**Risco:** 🟢 Baixo

---

### Sprint 3: Sistema de Vendas + Integração Asaas
**Duração:** 5-7 dias  
**Complexidade:** ⭐⭐⭐ Alta  
**Prioridade:** 🔴 Obrigatória  

**Objetivo:**  
Implementar fluxo completo de vendas com integração Asaas (pagamentos PIX/Cartão).

**Entregas:**
- ✅ Tabelas: `orders`, `order_items`, `payments`, `shipping_addresses`, `asaas_transactions`, `asaas_webhook_logs`
- ✅ Integração Asaas API (criar cobrança)
- ✅ Webhook de confirmação de pagamento
- ✅ Gestão de status de pedidos
- ✅ **PREPARAÇÃO CRÍTICA:** Estrutura de webhook extensível para acionar comissões (Sprint 4)

**⚠️ ATENÇÃO CRÍTICA:**
```typescript
// Webhook deve ter estrutura extensível:
async function handleAsaasWebhook(event: AsaasEvent) {
  // 1. Atualizar status do pedido
  await updateOrderStatus(event);
  
  // 2. ⭐ HOOK PARA SPRINT 4: Acionar cálculo de comissões
  if (event.status === 'CONFIRMED') {
    await triggerCommissionCalculation(event.orderId); // Implementar no Sprint 4
  }
  
  // 3. Registrar log
  await logWebhookEvent(event);
}
```

**Split Preparatório:**
- 70% → Fábrica (implementar agora)
- 30% → Sistema de Comissões (preparar estrutura, implementar no Sprint 4)

**Dependências:** Sprint 1, Sprint 2

**Validação de Saída:**
- [ ] Pedido criado com sucesso
- [ ] Cobrança gerada no Asaas
- [ ] Webhook recebe confirmação de pagamento
- [ ] Status do pedido atualiza automaticamente
- [ ] Estrutura preparada para acionar comissões

**Risco:** 🟡 Médio (integração externa + preparação para Sprint 4)

---

### Sprint 4: Sistema de Afiliados Multinível ⭐ CRÍTICO
**Duração:** 10-12 dias (sprint mais complexo)  
**Complexidade:** ⭐⭐⭐⭐⭐ Muito Alta  
**Prioridade:** 🔴 CRÍTICA  

**Objetivo:**  
Implementar sistema completo de afiliados com 3 níveis, cálculo automático de comissões e split via Asaas.

**Entregas:**
- ✅ Tabelas: `affiliates`, `affiliate_network`, `referral_codes`, `referral_clicks`, `referral_conversions`
- ✅ Tabelas: `commissions`, `commission_splits`, `commission_logs`, `asaas_wallets`
- ✅ Lógica de árvore genealógica (self-referencing)
- ✅ Cálculo de comissões:
  - 15% → N1 (vendedor direto)
  - 3% → N2 (indicado do N1)
  - 2% → N3 (indicado do N2)
  - 5% → Renum (gestor)
  - 5% → JB (gestor)
- ✅ Regra de redistribuição quando não há rede completa
- ✅ Validação de Wallet ID (Asaas API)
- ✅ Split automático via Asaas
- ✅ Dashboard do afiliado
- ✅ Rastreamento de links de indicação

**⚠️ REGRAS CRÍTICAS:**
1. **SEMPRE validar Wallet ID antes de cadastrar afiliado**
2. **Soma de comissões = sempre 30% do valor total**
3. **Registrar logs de cálculo para auditoria**
4. **Não permitir loops na árvore (A → B → A)**

**Cenários de Redistribuição:**
```
Cenário 1: Apenas N1 (sem N2 e N3)
├─ N1: 15%
├─ Renum: 5% + 2,5% = 7,5%
└─ JB: 5% + 2,5% = 7,5%
Total: 30% ✅

Cenário 2: N1 + N2 (sem N3)
├─ N1: 15%
├─ N2: 3%
├─ Renum: 5% + 1% = 6%
└─ JB: 5% + 1% = 6%
Total: 30% ✅

Cenário 3: Rede Completa (N1 + N2 + N3)
├─ N1: 15%
├─ N2: 3%
├─ N3: 2%
├─ Renum: 5%
└─ JB: 5%
Total: 30% ✅
```

**Dependências:** Sprint 3 (vendas e Asaas)

**Validação de Saída:**
- [ ] Afiliado cadastrado com Wallet ID válida
- [ ] Árvore genealógica construída corretamente
- [ ] Venda com link de afiliado rastreada
- [ ] Comissões calculadas corretamente (3 cenários)
- [ ] Split executado no Asaas
- [ ] Afiliados recebem notificação
- [ ] Dashboard mostra métricas corretas
- [ ] Logs de auditoria completos

**Risco:** 🔴 Alto (complexidade + lógica crítica de negócio)

**Estratégias de Mitigação:**
1. Dividir em 3 sub-sprints:
   - Dias 1-4: Estrutura de tabelas + árvore genealógica
   - Dias 5-8: Cálculo de comissões + redistribuição
   - Dias 9-12: Split Asaas + dashboard + testes
2. Testes unitários rigorosos para cada cenário
3. Validação manual com dados reais antes de produção

---

### Sprint 5: CRM e Gestão de Clientes
**Duração:** 3-4 dias  
**Complexidade:** ⭐⭐ Média  
**Prioridade:** 🟠 Alta  

**Objetivo:**  
Criar sistema de CRM para gestão completa de clientes e histórico de interações.

**Entregas:**
- ✅ Tabelas: `customers`, `customer_tags`, `customer_notes`, `customer_timeline`
- ✅ Segmentação de clientes
- ✅ Histórico de compras
- ✅ Tags personalizadas
- ✅ Timeline de eventos

**Dependências:** Sprint 3 (vendas)

**Validação de Saída:**
- [ ] Cliente criado automaticamente ao fazer pedido
- [ ] Timeline registra eventos
- [ ] Tags funcionando
- [ ] Notas salvas corretamente

**Risco:** 🟢 Baixo

---

### Sprint 6: Conversas e Agendamentos
**Duração:** 3-4 dias  
**Complexidade:** ⭐⭐ Média  
**Prioridade:** 🟡 Média  

**Objetivo:**  
Implementar sistema de conversas (monitor BIA/WhatsApp) e agendamentos de follow-up.

**Entregas:**
- ✅ Tabelas: `conversations`, `messages`, `appointments`
- ✅ Integração webhook N8N
- ✅ Monitor de conversas
- ✅ Calendário de agendamentos
- ✅ Lembretes automáticos

**Dependências:** Sprint 5 (CRM)

**Integração:** Preparar para receber dados do N8N/BIA

**Validação de Saída:**
- [ ] Webhook N8N recebe mensagens
- [ ] Conversas armazenadas corretamente
- [ ] Agendamentos criados
- [ ] Lembretes disparados

**Risco:** 🟡 Médio (integração externa N8N)

---

### Sprint 7: Automações e Workflows
**Duração:** 5-6 dias  
**Complexidade:** ⭐⭐⭐ Alta  
**Prioridade:** 🟡 Média  

**Objetivo:**  
Criar sistema de automações para emails, follow-ups e recuperação de carrinho.

**Entregas:**
- ✅ Tabelas: `automations`, `automation_triggers`, `automation_actions`, `automation_conditions`, `automation_logs`
- ✅ Engine de automações
- ✅ Templates de email
- ✅ Triggers baseados em eventos:
  - Pós-venda
  - Abandono de carrinho
  - Aniversário
  - Recompra
- ✅ Logs de execução

**Dependências:** Sprint 3 (vendas), Sprint 5 (CRM), Sprint 6 (conversas)

**Validação de Saída:**
- [ ] Automação criada via interface
- [ ] Trigger dispara corretamente
- [ ] Email enviado
- [ ] Logs registrados

**Risco:** 🟡 Médio (lógica complexa de triggers)

---

### Sprint 8: Analytics e Relatórios
**Duração:** 2-3 dias  
**Complexidade:** ⭐⭐ Média  
**Prioridade:** 🟠 Alta  

**Objetivo:**  
Implementar dashboard de métricas e relatórios gerenciais (vendas, afiliados, conversões).

**Entregas:**
- ✅ Queries otimizadas para métricas
- ✅ Cache Redis (opcional, se tempo permitir)
- ✅ API de analytics
- ✅ Relatórios:
  - Vendas por período
  - Performance de afiliados
  - Taxa de conversão
  - LTV (Lifetime Value)
  - Profundidade da rede
  - Comissões pagas

**Dependências:** Sprint 3 (vendas), Sprint 4 (afiliados)

**Validação de Saída:**
- [ ] Dashboard carrega em < 2s
- [ ] Métricas corretas
- [ ] Filtros funcionando
- [ ] Exportação de relatórios

**Risco:** 🟡 Médio (performance de queries)

**Nota:** Se incluir Redis, pode precisar de +1 dia

---

### Sprint 9: Configurações e Administração
**Duração:** 2 dias  
**Complexidade:** ⭐ Baixa  
**Prioridade:** 🟢 Baixa  

**Objetivo:**  
Criar painel administrativo para gestão de usuários internos, permissões e configurações do sistema.

**Entregas:**
- ✅ CRUD de usuários internos
- ✅ Gestão de roles/permissions
- ✅ Configurações gerais:
  - Wallet IDs gestores (Renum, JB)
  - Percentuais de comissão
- ✅ Logs de auditoria
- ✅ Painel admin

**Dependências:** Sprint 1 (auth)

**Validação de Saída:**
- [ ] Admin consegue criar usuários
- [ ] Permissões funcionando
- [ ] Configurações salvas
- [ ] Logs de auditoria registrados

**Risco:** 🟢 Baixo

---

### Sprint 10: Testes, Ajustes Finais e Deploy
**Duração:** 5-7 dias  
**Complexidade:** ⭐⭐ Média  
**Prioridade:** 🔴 Obrigatória  

**Objetivo:**  
Testes completos end-to-end, correções finais, otimizações de performance e deploy em produção.

**Entregas:**
- ✅ Testes E2E de todos os fluxos críticos
- ✅ Otimização de queries
- ✅ Documentação completa da API
- ✅ Setup de monitoramento (Sentry, logs)
- ✅ Deploy em produção
- ✅ Treinamento da equipe

**Validações Críticas:**
1. **Fluxo completo:** Venda → Pagamento → Split → Comissões → Notificações
2. **Árvore de afiliados:** 3 níveis funcionando
3. **Redistribuição:** Cenários 1, 2 e 3 testados
4. **Webhooks Asaas:** Recebendo e processando corretamente
5. **Performance:** Queries < 500ms
6. **Segurança:** RLS ativo em todas as tabelas

**Dependências:** Todos os sprints anteriores

**Validação de Saída:**
- [ ] Todos os testes E2E passando
- [ ] Performance aceitável
- [ ] Documentação completa
- [ ] Monitoramento ativo
- [ ] Deploy em produção bem-sucedido
- [ ] Equipe treinada

**Risco:** 🟡 Médio (bugs inesperados)

---

## 🔗 Mapa de Dependências

```
Sprint 0 (Setup)
    ↓
Sprint 1 (Auth) ← ⚠️ Preparar para Sprint 4
    ↓
Sprint 2 (Produtos)
    ↓
Sprint 3 (Vendas + Asaas) ← ⚠️ Preparar webhook para Sprint 4
    ↓
Sprint 4 (Afiliados) ⭐ CRÍTICO
    ↓
Sprint 5 (CRM) ────────┐
    ↓                  ↓
Sprint 6 (Conversas) → Sprint 7 (Automações)
    ↓                  ↓
Sprint 8 (Analytics) ← Sprint 4
    ↓
Sprint 9 (Config)
    ↓
Sprint 10 (Deploy)
```

---

## 📊 Resumo Executivo

| Sprint | Módulo | Duração | Complexidade | Prioridade | Risco |
|--------|--------|---------|--------------|------------|-------|
| 0 | Setup | 2-3 dias | ⭐ | 🔴 Obrigatória | 🟢 |
| 1 | Auth | 3-4 dias | ⭐⭐ | 🔴 Obrigatória | 🟡 |
| 2 | Produtos | 2-3 dias | ⭐ | 🔴 Obrigatória | 🟢 |
| 3 | Vendas + Asaas | 5-7 dias | ⭐⭐⭐ | 🔴 Obrigatória | 🟡 |
| 4 | Afiliados | 10-12 dias | ⭐⭐⭐⭐⭐ | 🔴 CRÍTICA | 🔴 |
| 5 | CRM | 3-4 dias | ⭐⭐ | 🟠 Alta | 🟢 |
| 6 | Conversas | 3-4 dias | ⭐⭐ | 🟡 Média | 🟡 |
| 7 | Automações | 5-6 dias | ⭐⭐⭐ | 🟡 Média | 🟡 |
| 8 | Analytics | 2-3 dias | ⭐⭐ | 🟠 Alta | 🟡 |
| 9 | Config | 2 dias | ⭐ | 🟢 Baixa | 🟢 |
| 10 | Deploy | 5-7 dias | ⭐⭐ | 🔴 Obrigatória | 🟡 |

**Total:** 42-55 dias (~8-10 semanas)

---

## ⚠️ Pontos Críticos de Atenção

### 1. Sprint 1 → Sprint 4 (Preparação)
**Problema:** Se não preparar estrutura no Sprint 1, haverá retrabalho no Sprint 4.

**Solução:**
- Incluir campos `wallet_id` e `is_affiliate` em `profiles` desde o Sprint 1
- Documentar claramente que são preparatórios

### 2. Sprint 3 → Sprint 4 (Webhook Extensível)
**Problema:** Webhook do Asaas precisa acionar cálculo de comissões.

**Solução:**
- Criar estrutura de webhook com hooks extensíveis no Sprint 3
- Implementar hook de comissões no Sprint 4

### 3. Sprint 4 (Complexidade)
**Problema:** Sprint mais complexo, risco de atrasos.

**Solução:**
- Dividir em 3 sub-sprints
- Testes rigorosos em cada etapa
- Validação manual antes de produção

### 4. Sprint 8 (Performance)
**Problema:** Queries de analytics podem ser lentas.

**Solução:**
- Criar índices adequados desde os sprints anteriores
- Considerar cache Redis se necessário
- Otimizar queries antes de implementar dashboard

---

## 🎯 Marcos de Validação

### Marco 1: Fundação (Fim do Sprint 2)
**Validar:**
- [ ] Autenticação funcionando
- [ ] Produtos cadastrados
- [ ] Estrutura preparada para vendas

### Marco 2: Core Business (Fim do Sprint 4)
**Validar:**
- [ ] Vendas funcionando
- [ ] Pagamentos via Asaas
- [ ] Sistema de afiliados completo
- [ ] Comissões calculadas corretamente

### Marco 3: Experiência do Usuário (Fim do Sprint 7)
**Validar:**
- [ ] CRM funcionando
- [ ] Conversas registradas
- [ ] Automações disparando

### Marco 4: Inteligência de Negócio (Fim do Sprint 8)
**Validar:**
- [ ] Métricas corretas
- [ ] Relatórios funcionando
- [ ] Performance aceitável

### Marco 5: Produção (Fim do Sprint 10)
**Validar:**
- [ ] Todos os testes passando
- [ ] Deploy bem-sucedido
- [ ] Monitoramento ativo

---

## 📈 Caminho Crítico

**Sprints no caminho crítico (não podem atrasar):**
1. Sprint 0 (Setup)
2. Sprint 1 (Auth)
3. Sprint 3 (Vendas)
4. **Sprint 4 (Afiliados)** ⭐ MAIS CRÍTICO
5. Sprint 10 (Deploy)

**Sprints com folga (podem ser ajustados):**
- Sprint 6 (Conversas)
- Sprint 7 (Automações)
- Sprint 9 (Config)

---

## 🔄 Possíveis Otimizações

### Se Tiver 2 Desenvolvedores:
- **Paralelizar:** Sprint 5 (CRM) + Sprint 6 (Conversas)
- **Ganho:** -2 dias no cronograma

### Se Precisar Acelerar:
- **Reduzir:** Sprint 9 (Config) para 1 dia
- **Simplificar:** Sprint 7 (Automações) - implementar apenas triggers essenciais
- **Ganho:** -3 dias no cronograma

### Se Tiver Mais Tempo:
- **Adicionar:** Cache Redis no Sprint 8
- **Adicionar:** Testes de carga no Sprint 10
- **Adicionar:** Documentação interativa (Swagger)

---

## 📞 Próximos Passos

1. **Revisar este cronograma** e aprovar/ajustar
2. **Consultar ROADMAP_TECNICO.md** para detalhes de banco de dados
3. **Consultar SPECS_TEMPLATE.md** para estrutura de specs
4. **Iniciar Sprint 0** quando aprovado

---

**Última atualização:** 23/10/2025  
**Status:** ✅ Aprovado para execução  
**Responsável:** Kiro AI + Equipe Slim Quality
