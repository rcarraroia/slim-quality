# 🔍 ANÁLISE PRÉVIA: Sprint 6 - Automações e Workflows

**Data:** 18/11/2025  
**Analista:** Kiro AI  
**Objetivo:** Identificar o que existe no frontend/backend antes de criar a spec

---

## ✅ RESUMO EXECUTIVO

**Status Geral:** ❌ **NADA EXISTE** - Sprint 6 será criado do zero

**Conclusão:**
- ✅ Não há conflitos com código existente
- ✅ Não há risco de sobrescrever funcionalidades
- ✅ Podemos criar toda a estrutura do zero
- ⚠️ Precisamos integrar com sistemas existentes (CRM, Vendas, Afiliados)

---

## 📊 ANÁLISE DETALHADA

### 1. BACKEND

#### 1.1. Migrations (Banco de Dados)

**Busca realizada:**
```bash
grep -r "automation\|workflow" supabase/migrations/
```

**Resultado:** ❌ **NENHUMA TABELA EXISTE**

**Tabelas necessárias (não existem):**
- ❌ `automations`
- ❌ `automation_triggers`
- ❌ `automation_conditions`
- ❌ `automation_actions`
- ❌ `automation_logs`

**Observação:** Existem triggers SQL (database triggers) nas migrations do CRM, mas são triggers de banco de dados (para atualizar timestamps), NÃO são triggers de automação de negócio.

#### 1.2. Serviços Backend

**Busca realizada:**
```bash
find src/services -name "*automation*" -o -name "*workflow*"
```

**Resultado:** ❌ **NENHUM SERVIÇO EXISTE**

**Estrutura atual de serviços:**
```
src/services/
├── affiliates/          ✅ Existe (Sprint 4)
├── asaas/              ✅ Existe (Sprint 3)
├── auth/               ✅ Existe (Sprint 1)
├── crm/                ✅ Existe (Sprint 5)
│   ├── notification.service.ts  ⚠️ Notificações CRM (não automações)
│   └── ...
├── inventory/          ✅ Existe (Sprint 2)
├── products/           ✅ Existe (Sprint 2)
├── sales/              ✅ Existe (Sprint 3)
└── frontend/           ✅ Existe (vários sprints)
```

**Serviços necessários (não existem):**
- ❌ `automation.service.ts`
- ❌ `trigger.service.ts`
- ❌ `workflow-engine.service.ts`
- ❌ `action-executor.service.ts`

**⚠️ IMPORTANTE:** Existe `notification.service.ts` no CRM, mas é para notificações do sistema CRM (conversas, agendamentos), NÃO para automações de workflow.

#### 1.3. Controllers e APIs

**Busca realizada:**
```bash
find src/api/controllers -name "*automation*" -o -name "*workflow*"
```

**Resultado:** ❌ **NENHUM CONTROLLER EXISTE**

**Controllers necessários (não existem):**
- ❌ `automation.controller.ts`
- ❌ `workflow.controller.ts`

#### 1.4. Validators

**Busca realizada:**
```bash
find src/api/validators -name "*automation*" -o -name "*workflow*"
```

**Resultado:** ❌ **NENHUM VALIDATOR EXISTE**

**Validators necessários (não existem):**
- ❌ `automation.validators.ts`

---

### 2. FRONTEND

#### 2.1. Páginas

**Busca realizada:**
```bash
find src/pages -name "*automacao*" -o -name "*automation*" -o -name "*workflow*"
```

**Resultado:** ❌ **NENHUMA PÁGINA EXISTE**

**Rotas no App.tsx:**
```typescript
// Verificado em src/App.tsx
// NÃO há rotas para:
// - /dashboard/automacoes
// - /admin/automacoes
// - /afiliados/dashboard/automacoes
```

**Páginas necessárias (não existem):**
- ❌ `/dashboard/automacoes` (lista)
- ❌ `/dashboard/automacoes/nova` (criar)
- ❌ `/dashboard/automacoes/:id/editar` (editar)
- ❌ `/dashboard/automacoes/:id/logs` (histórico)
- ❌ `/admin/automacoes` (dashboard admin)
- ❌ `/admin/automacoes/templates` (templates)

#### 2.2. Componentes

**Busca realizada:**
```bash
find src/components -name "*automacao*" -o -name "*automation*" -o -name "*workflow*"
```

**Resultado:** ❌ **NENHUM COMPONENTE EXISTE**

**Componentes necessários (não existem):**
- ❌ `AutomationBuilder` (editor visual)
- ❌ `TriggerSelector` (seletor de triggers)
- ❌ `ConditionBuilder` (construtor de condições)
- ❌ `ActionSelector` (seletor de ações)
- ❌ `AutomationPreview` (preview visual)
- ❌ `ExecutionTimeline` (timeline de execuções)
- ❌ `TemplateGallery` (galeria de templates)

**⚠️ NOTA:** Existem componentes de UI genéricos (Tooltip, Tabs, Select, etc.) que podem ser reutilizados, mas nenhum específico para automações.

#### 2.3. Serviços Frontend

**Busca realizada:**
```bash
find src/services -name "*automation*" -o -name "*workflow*"
```

**Resultado:** ❌ **NENHUM SERVIÇO FRONTEND EXISTE**

**Serviços necessários (não existem):**
- ❌ `automation-frontend.service.ts`
- ❌ `trigger-frontend.service.ts`
- ❌ `execution-frontend.service.ts`

#### 2.4. Hooks Customizados

**Busca realizada:**
```bash
find src/hooks -name "*automation*" -o -name "*workflow*"
```

**Resultado:** ❌ **NENHUM HOOK EXISTE**

**Hooks necessários (não existem):**
- ❌ `useAutomations`
- ❌ `useAutomationBuilder`
- ❌ `useExecutionLogs`

---

### 3. INTEGRAÇÕES EXISTENTES

#### 3.1. Sistemas que Automações Devem Integrar

**✅ Sprint 5 - CRM (EXISTE):**
- ✅ `customer.service.ts` - Eventos de cliente
- ✅ `conversation.service.ts` - Eventos de conversa
- ✅ `appointment.service.ts` - Eventos de agendamento
- ✅ `tag.service.ts` - Aplicar/remover tags
- ✅ `notification.service.ts` - Enviar notificações

**✅ Sprint 3 - Vendas (EXISTE):**
- ✅ `order.service.ts` - Eventos de pedido
- ✅ `asaas.service.ts` - Eventos de pagamento

**✅ Sprint 4 - Afiliados (EXISTE):**
- ✅ `commission.service.ts` - Eventos de comissão
- ✅ `affiliate.service.ts` - Dados de afiliados

**⚠️ ATENÇÃO:** Esses serviços existem, mas NÃO emitem eventos para automações ainda. Precisaremos:
1. Adicionar sistema de eventos (Event Emitter)
2. Fazer os serviços existentes emitirem eventos
3. Automações escutarem esses eventos

---

### 4. ESTRUTURA DE DADOS EXISTENTE

#### 4.1. Tabelas Relacionadas (que automações usarão)

**✅ Tabelas CRM (Sprint 5):**
```sql
customers              ✅ Existe
customer_tags          ✅ Existe
customer_tag_assignments ✅ Existe
conversations          ✅ Existe
messages               ✅ Existe
appointments           ✅ Existe
timeline_events        ✅ Existe
```

**✅ Tabelas Vendas (Sprint 3):**
```sql
orders                 ✅ Existe
order_items            ✅ Existe
payments               ✅ Existe
```

**✅ Tabelas Afiliados (Sprint 4):**
```sql
affiliates             ✅ Existe
commissions            ✅ Existe
```

**❌ Tabelas Automações (Sprint 6):**
```sql
automations            ❌ NÃO EXISTE
automation_triggers    ❌ NÃO EXISTE
automation_conditions  ❌ NÃO EXISTE
automation_actions     ❌ NÃO EXISTE
automation_logs        ❌ NÃO EXISTE
```

---

## 🎯 RECOMENDAÇÕES PARA A SPEC

### 1. Criar do Zero (Sem Conflitos)

✅ **Vantagens:**
- Não há código existente para conflitar
- Podemos seguir padrões estabelecidos nos sprints anteriores
- Estrutura limpa e organizada desde o início

⚠️ **Atenção:**
- Seguir padrão de nomenclatura dos sprints anteriores
- Reutilizar componentes UI existentes (Button, Card, Dialog, etc.)
- Integrar com serviços existentes (CRM, Vendas, Afiliados)

### 2. Padrões a Seguir

**Backend:**
```
src/services/automation/
├── automation.service.ts       (CRUD automações)
├── trigger.service.ts          (gestão triggers)
├── workflow-engine.service.ts  (motor de execução)
├── action-executor.service.ts  (executar ações)
└── event-emitter.service.ts    (sistema de eventos)
```

**Frontend:**
```
src/pages/dashboard/
├── Automacoes.tsx              (lista)
└── AutomacaoEditor.tsx         (criar/editar)

src/components/automation/
├── AutomationBuilder.tsx
├── TriggerSelector.tsx
├── ConditionBuilder.tsx
├── ActionSelector.tsx
└── ExecutionTimeline.tsx

src/services/frontend/
└── automation-frontend.service.ts
```

### 3. Integrações Necessárias

**Modificar serviços existentes para emitir eventos:**
```typescript
// Exemplo: src/services/crm/customer.service.ts
async create(data) {
  const customer = await supabase.from('customers').insert(data);
  
  // ✅ ADICIONAR: Emitir evento para automações
  eventEmitter.emit('customer.created', customer);
  
  return customer;
}
```

**Serviços a modificar:**
- ✅ `customer.service.ts` - Emitir eventos de cliente
- ✅ `order.service.ts` - Emitir eventos de pedido
- ✅ `conversation.service.ts` - Emitir eventos de conversa
- ✅ `appointment.service.ts` - Emitir eventos de agendamento

### 4. Componentes UI Reutilizáveis

**Já existem e podem ser usados:**
- ✅ `Button`, `Card`, `Dialog`, `Select`, `Input`
- ✅ `Table`, `Badge`, `Tabs`, `Tooltip`
- ✅ `Form`, `Label`, `Checkbox`, `Switch`
- ✅ `Calendar`, `Popover`, `Command`

**Precisam ser criados:**
- ❌ `AutomationBuilder` (editor visual drag-and-drop)
- ❌ `TriggerSelector` (seletor de triggers)
- ❌ `ConditionBuilder` (construtor de condições lógicas)
- ❌ `ActionSelector` (seletor de ações)

---

## 📋 CHECKLIST PARA SPEC

### Requirements.md

- [ ] Definir user stories para criação de automações
- [ ] Definir user stories para execução de automações
- [ ] Definir user stories para monitoramento de automações
- [ ] Listar todos os tipos de triggers necessários
- [ ] Listar todos os tipos de condições necessárias
- [ ] Listar todos os tipos de ações necessárias
- [ ] Definir requisitos de integração com CRM
- [ ] Definir requisitos de integração com Vendas
- [ ] Definir requisitos de integração com Afiliados

### Design.md

- [ ] Desenhar arquitetura do motor de automações
- [ ] Definir estrutura de dados (tabelas)
- [ ] Definir APIs REST necessárias
- [ ] Desenhar fluxo de execução de automações
- [ ] Definir sistema de eventos (Event Emitter)
- [ ] Desenhar interface do editor visual
- [ ] Definir estratégia de testes
- [ ] Definir tratamento de erros e retry

### Tasks.md

- [ ] Criar migrations (tabelas)
- [ ] Criar serviços backend
- [ ] Criar controllers e APIs
- [ ] Criar validators
- [ ] Modificar serviços existentes (emitir eventos)
- [ ] Criar páginas frontend
- [ ] Criar componentes de automação
- [ ] Criar serviços frontend
- [ ] Criar hooks customizados
- [ ] Integrar com sistemas existentes
- [ ] Criar testes unitários
- [ ] Criar testes de integração

---

## ⚠️ RISCOS E DESAFIOS

### 1. Complexidade do Motor de Execução

**Desafio:** Criar motor que processa triggers, avalia condições e executa ações de forma confiável.

**Mitigação:**
- Usar sistema de filas (Bull/Redis)
- Implementar retry automático
- Logging detalhado de execuções
- Testes extensivos

### 2. Performance com Muitas Automações

**Desafio:** Sistema pode ficar lento com muitas automações ativas.

**Mitigação:**
- Índices otimizados no banco
- Cache de automações ativas
- Rate limiting por automação
- Processamento assíncrono

### 3. Integração com Sistemas Existentes

**Desafio:** Modificar serviços existentes sem quebrar funcionalidades.

**Mitigação:**
- Adicionar eventos de forma não-invasiva
- Testes de regressão
- Deploy gradual
- Rollback fácil

### 4. UX do Editor Visual

**Desafio:** Criar interface intuitiva para construir automações complexas.

**Mitigação:**
- Inspirar em ferramentas existentes (Zapier, Make)
- Prototipar antes de implementar
- Feedback de usuários
- Templates prontos

---

## ✅ CONCLUSÃO

**Status:** ✅ **PRONTO PARA CRIAR SPEC**

**Resumo:**
- ❌ Nada existe relacionado a automações
- ✅ Não há conflitos com código existente
- ✅ Estrutura de sprints anteriores serve como referência
- ✅ Integrações com CRM, Vendas e Afiliados são viáveis
- ⚠️ Complexidade alta, mas gerenciável

**Próximos Passos:**
1. ✅ Enviar este relatório para aprovação
2. ⏳ Aguardar aprovação do usuário
3. ⏳ Criar `requirements.md`
4. ⏳ Criar `design.md`
5. ⏳ Criar `tasks.md`

---

**Relatório gerado por:** Kiro AI  
**Data:** 18/11/2025  
**Tempo de análise:** ~5 minutos  
**Arquivos analisados:** 50+  
**Buscas realizadas:** 10+
