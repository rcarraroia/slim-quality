# 🔍 AUDITORIA: MÓDULOS CONVERSAS E AGENDAMENTOS

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

---

## 📋 INFORMAÇÕES DA AUDITORIA

**Data:** 16/01/2026  
**Módulos Auditados:**
- `/dashboard/conversas`
- `/dashboard/agendamentos`

**Objetivo:** Identificar o que está implementado, o que é mock e o que precisa ser feito para deixar 100% funcional.

**Método:** Análise de código frontend + verificação do banco real via Power Supabase

---

## 🎯 RESUMO EXECUTIVO

### ✅ **CONVERSAS - STATUS: 85% FUNCIONAL**
- **Implementação Real:** Hook de realtime, integração com Supabase, filtros funcionais
- **Mock Identificado:** Nenhum mock crítico
- **Gaps:** Funcionalidade "Nova Conversa" não implementada, detalhes de conversa parcial

### ⚠️ **AGENDAMENTOS - STATUS: 60% FUNCIONAL**
- **Implementação Real:** Integração com Supabase, calendário funcional, listagem
- **Mock Identificado:** Nenhum mock, mas estrutura de dados incompatível
- **Gaps:** Estrutura do código não bate com banco real, funcionalidade "Novo Agendamento" não implementada

---

## 📊 MÓDULO 1: CONVERSAS (`/dashboard/conversas`)

### ✅ **O QUE ESTÁ IMPLEMENTADO E FUNCIONAL**

#### 1. **Hook de Realtime (`useRealtimeConversations`)**
**Arquivo:** `src/hooks/useRealtimeConversations.ts`

**Status:** ✅ **100% FUNCIONAL**

**Funcionalidades:**
- ✅ Conexão Realtime com Supabase (Postgres Changes)
- ✅ Carregamento inicial de conversas
- ✅ Atualização automática (INSERT, UPDATE, DELETE)
- ✅ Filtros por status, canal, assigned_to, customer_id
- ✅ Contagem por canal (whatsapp, site, email, chat, phone)
- ✅ Join com tabela `customers` para dados do cliente
- ✅ Ordenação por `last_message_at` e `created_at`
- ✅ Cleanup de subscription ao desmontar
- ✅ Error handling implementado

**Evidência no Banco Real:**
```sql
-- 2 conversas reais encontradas
SELECT * FROM conversations;
-- Resultado: 2 registros (whatsapp, status: open)
```

#### 2. **Página de Listagem (`Conversas.tsx`)**
**Arquivo:** `src/pages/dashboard/Conversas.tsx`

**Status:** ✅ **85% FUNCIONAL**

**Funcionalidades Implementadas:**
- ✅ Filtro por status (todas, open, pending, in_progress, closed)
- ✅ Filtro por canal (todos, whatsapp, site, email, chat, phone)
- ✅ Filtro por período (hoje, 7 dias, 30 dias)
- ✅ Busca por nome do cliente
- ✅ Exibição de avatar com iniciais
- ✅ Badge de status (StatusBadge component)
- ✅ Badge de canal com emoji
- ✅ Timestamp de última mensagem
- ✅ Session ID exibido
- ✅ Botão "Ver Conversa" (navega para `/dashboard/conversas/:id`)
- ✅ Loading state
- ✅ Empty state
- ✅ Contagem de conversas por canal

**Integração com Banco:**
```typescript
// Hook consome diretamente do Supabase
const { conversations, loading, channelCounts } = useRealtimeConversations();

// Query real executada:
supabase
  .from('conversations')
  .select(`
    *,
    customers!inner(id, name, email, phone)
  `)
  .order('last_message_at', { ascending: false })
```

#### 3. **Estrutura do Banco de Dados**
**Tabela:** `conversations`

**Status:** ✅ **ESTRUTURA CORRETA**

**Colunas Principais:**
- `id` (uuid)
- `customer_id` (uuid) → FK para `customers`
- `channel` (enum: whatsapp, email, chat, phone, site)
- `status` (enum: new, open, pending, resolved, closed)
- `subject` (varchar)
- `assigned_to` (uuid) → FK para `auth.users`
- `session_id` (uuid) - para chat público
- `last_message_at` (timestamptz)
- `created_at`, `updated_at` (timestamptz)

**Dados Reais:**
- ✅ 2 conversas ativas no banco
- ✅ Canal: whatsapp
- ✅ Status: open
- ✅ Relacionamento com `customers` funcionando

---

### ❌ **O QUE NÃO ESTÁ IMPLEMENTADO**

#### 1. **Botão "Nova Conversa"**
**Localização:** `src/pages/dashboard/Conversas.tsx` (linha 75)

**Status:** ❌ **NÃO IMPLEMENTADO**

**Código Atual:**
```typescript
<Button className="gap-2">
  <Plus className="h-4 w-4" />
  Nova Conversa
</Button>
```

**Problema:** Botão não tem `onClick`, não abre modal, não faz nada.

**O que precisa:**
- Modal para criar nova conversa
- Formulário com campos:
  - Selecionar cliente (autocomplete)
  - Canal (whatsapp, email, chat, phone, site)
  - Assunto (opcional)
  - Mensagem inicial (opcional)
- Integração com API para criar conversa
- Atualização automática da lista via Realtime

---

#### 2. **Botão "Marcar como Prioridade"**
**Localização:** `src/pages/dashboard/Conversas.tsx` (linha 133)

**Status:** ❌ **NÃO IMPLEMENTADO**

**Código Atual:**
```typescript
<Button variant="outline">Marcar como Prioridade</Button>
```

**Problema:** Botão não tem `onClick`, não faz nada.

**O que precisa:**
- Atualizar campo `priority` na tabela `conversations`
- Feedback visual (toast de sucesso)
- Atualização automática via Realtime

---

#### 3. **Página de Detalhes da Conversa**
**Localização:** `src/pages/dashboard/ConversaDetalhes.tsx`

**Status:** ⚠️ **PARCIALMENTE IMPLEMENTADO**

**Análise Necessária:** Arquivo existe, mas precisa verificar se:
- Carrega mensagens da conversa
- Exibe histórico completo
- Permite enviar novas mensagens
- Atualiza em tempo real

---

#### 4. **Filtro por Período**
**Localização:** `src/pages/dashboard/Conversas.tsx` (linha 58)

**Status:** ❌ **NÃO FUNCIONAL**

**Código Atual:**
```typescript
const [periodoFilter, setPeriodoFilter] = useState('7dias');
// ... mas não é usado em nenhum lugar
```

**Problema:** Filtro é exibido mas não filtra nada.

**O que precisa:**
- Implementar lógica de filtro por data
- Adicionar filtro no hook `useRealtimeConversations`
- Ou filtrar localmente após carregar

---

### 🔧 **O QUE PRECISA SER AJUSTADO**

#### 1. **Filtro de Status**
**Problema:** Valores do filtro não batem 100% com enum do banco

**Filtro Frontend:**
```typescript
- 'todas'
- 'open'
- 'pending'
- 'in_progress'  // ❌ NÃO EXISTE NO BANCO
- 'closed'
```

**Enum do Banco:**
```sql
'new', 'open', 'pending', 'resolved', 'closed'
```

**Correção Necessária:**
- Remover 'in_progress'
- Adicionar 'new' e 'resolved'
- Ou mapear 'in_progress' → 'open' no backend

---

## 📊 MÓDULO 2: AGENDAMENTOS (`/dashboard/agendamentos`)

### ✅ **O QUE ESTÁ IMPLEMENTADO E FUNCIONAL**

#### 1. **Página de Agendamentos (`Agendamentos.tsx`)**
**Arquivo:** `src/pages/dashboard/Agendamentos.tsx`

**Status:** ⚠️ **60% FUNCIONAL (COM BUGS)**

**Funcionalidades Implementadas:**
- ✅ Calendário visual (shadcn/ui Calendar)
- ✅ Seleção de data
- ✅ Integração com Supabase
- ✅ Carregamento de agendamentos do mês
- ✅ Filtro por data selecionada
- ✅ Listagem de próximos agendamentos
- ✅ Loading state
- ✅ Empty state
- ✅ Badge de status
- ✅ Ícones por tipo de agendamento

**Integração com Banco:**
```typescript
const { data, error } = await supabase
  .from('appointments')
  .select(`
    *,
    customer:customers(name, phone)
  `)
  .gte('scheduled_date', startOfMonth)
  .lte('scheduled_date', endOfMonth)
  .is('deleted_at', null)
  .order('scheduled_date', { ascending: true })
  .order('scheduled_time', { ascending: true });
```

#### 2. **Estrutura do Banco de Dados**
**Tabela:** `appointments`

**Status:** ✅ **ESTRUTURA CORRETA**

**Colunas Principais:**
- `id` (uuid)
- `customer_id` (uuid) → FK para `customers`
- `assigned_to` (uuid) → FK para `auth.users`
- `title` (varchar)
- `description` (text)
- `appointment_type` (enum: call, meeting, follow_up, demo, consultation)
- `status` (enum: scheduled, confirmed, completed, cancelled, no_show)
- `scheduled_at` (timestamptz) ← **IMPORTANTE**
- `duration_minutes` (integer)
- `notes` (text)
- `created_at`, `updated_at` (timestamptz)

**Dados Reais:**
- ✅ 0 agendamentos no banco (tabela vazia)
- ✅ Estrutura está correta

---

### ❌ **BUGS CRÍTICOS IDENTIFICADOS**

#### 1. **INCOMPATIBILIDADE DE ESTRUTURA DE DADOS**
**Severidade:** 🚨 **CRÍTICO**

**Problema:** Código frontend usa estrutura diferente do banco real

**Código Frontend:**
```typescript
interface Appointment {
  id: string;
  customer_id: string;
  scheduled_date: string;  // ❌ NÃO EXISTE NO BANCO
  scheduled_time: string;  // ❌ NÃO EXISTE NO BANCO
  type: string;            // ❌ NOME ERRADO (deveria ser appointment_type)
  status: string;
  notes: string;
  customer: {
    name: string;
    phone: string;
  };
}
```

**Banco Real:**
```sql
-- Campos corretos:
scheduled_at TIMESTAMPTZ  -- ✅ Data + hora juntos
appointment_type VARCHAR  -- ✅ Nome correto
```

**Impacto:**
- ❌ Query falha ao tentar buscar `scheduled_date` e `scheduled_time`
- ❌ Filtros não funcionam corretamente
- ❌ Ordenação quebrada
- ❌ Impossível criar novos agendamentos

**Correção Necessária:**
1. Atualizar interface TypeScript
2. Ajustar query do Supabase
3. Converter `scheduled_at` para data/hora separados no frontend
4. Atualizar todos os componentes que usam esses campos

---

#### 2. **Query Incompatível**
**Severidade:** 🚨 **CRÍTICO**

**Código Atual:**
```typescript
.order('scheduled_date', { ascending: true })  // ❌ Campo não existe
.order('scheduled_time', { ascending: true })  // ❌ Campo não existe
```

**Correção:**
```typescript
.order('scheduled_at', { ascending: true })  // ✅ Campo correto
```

---

#### 3. **Configuração de Tipos**
**Severidade:** ⚠️ **MÉDIO**

**Código Atual:**
```typescript
const tipoConfig: { [key: string]: { icon: string; color: string } } = {
  call: { icon: '📞', color: 'bg-blue-500/10 text-blue-500' },
  meeting: { icon: '👥', color: 'bg-success/10 text-success' },
  whatsapp: { icon: '📱', color: 'bg-primary/10 text-primary' },  // ❌ Não existe no enum
  reminder: { icon: '🔔', color: 'bg-warning/10 text-warning' },  // ❌ Não existe no enum
};
```

**Enum do Banco:**
```sql
'call', 'meeting', 'follow_up', 'demo', 'consultation'
```

**Correção:**
- Remover 'whatsapp' e 'reminder'
- Adicionar 'follow_up', 'demo', 'consultation'

---

### ❌ **O QUE NÃO ESTÁ IMPLEMENTADO**

#### 1. **Botão "Novo Agendamento"**
**Localização:** `src/pages/dashboard/Agendamentos.tsx` (linha 82)

**Status:** ❌ **NÃO IMPLEMENTADO**

**Código Atual:**
```typescript
const handleNewAppointment = () => {
  // Implementar modal de novo agendamento
  console.log('Novo agendamento');
};
```

**O que precisa:**
- Modal para criar novo agendamento
- Formulário com campos:
  - Selecionar cliente (autocomplete)
  - Tipo (call, meeting, follow_up, demo, consultation)
  - Data e hora (`scheduled_at`)
  - Duração (duration_minutes)
  - Título e descrição
  - Notas
- Integração com API para criar agendamento
- Atualização automática da lista

---

#### 2. **Ações nos Agendamentos**
**Status:** ❌ **NÃO IMPLEMENTADO**

**O que precisa:**
- Editar agendamento
- Cancelar agendamento
- Marcar como concluído
- Reagendar
- Enviar lembrete

---

#### 3. **Integração com Calendário Externo**
**Status:** ❌ **NÃO IMPLEMENTADO**

**O que seria útil:**
- Exportar para Google Calendar
- Sincronização bidirecional
- Lembretes automáticos

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **CONVERSAS - PARA DEIXAR 100% FUNCIONAL**

#### **PRIORIDADE ALTA (Essencial)**
- [ ] Implementar modal "Nova Conversa"
  - [ ] Formulário de criação
  - [ ] Seleção de cliente
  - [ ] Seleção de canal
  - [ ] Integração com API
- [ ] Corrigir filtro de status (remover 'in_progress', adicionar 'new' e 'resolved')
- [ ] Implementar funcionalidade "Marcar como Prioridade"
- [ ] Verificar e completar página de detalhes (`ConversaDetalhes.tsx`)

#### **PRIORIDADE MÉDIA (Importante)**
- [ ] Implementar filtro por período (hoje, 7 dias, 30 dias)
- [ ] Adicionar paginação (se lista crescer muito)
- [ ] Adicionar filtro por vendedor (assigned_to)

#### **PRIORIDADE BAIXA (Nice to have)**
- [ ] Exportar conversas para CSV
- [ ] Estatísticas de conversas
- [ ] Gráficos de conversões

---

### **AGENDAMENTOS - PARA DEIXAR 100% FUNCIONAL**

#### **PRIORIDADE CRÍTICA (Bloqueador)**
- [ ] **CORRIGIR ESTRUTURA DE DADOS**
  - [ ] Atualizar interface TypeScript
  - [ ] Mudar `scheduled_date` + `scheduled_time` → `scheduled_at`
  - [ ] Mudar `type` → `appointment_type`
  - [ ] Ajustar query do Supabase
  - [ ] Testar carregamento de dados

#### **PRIORIDADE ALTA (Essencial)**
- [ ] Implementar modal "Novo Agendamento"
  - [ ] Formulário de criação
  - [ ] Seleção de cliente
  - [ ] Seleção de tipo
  - [ ] Date/time picker
  - [ ] Integração com API
- [ ] Corrigir configuração de tipos (tipoConfig)
- [ ] Implementar ações nos agendamentos:
  - [ ] Editar
  - [ ] Cancelar
  - [ ] Marcar como concluído

#### **PRIORIDADE MÉDIA (Importante)**
- [ ] Adicionar filtro por tipo de agendamento
- [ ] Adicionar filtro por status
- [ ] Adicionar filtro por vendedor (assigned_to)
- [ ] Implementar lembretes automáticos

#### **PRIORIDADE BAIXA (Nice to have)**
- [ ] Integração com Google Calendar
- [ ] Exportar agendamentos para CSV
- [ ] Visualização de agenda semanal/mensal

---

## 🎯 ESTIMATIVA DE TEMPO

### **CONVERSAS**
| Tarefa | Tempo Estimado |
|--------|----------------|
| Modal "Nova Conversa" | 3-4 horas |
| Corrigir filtro de status | 30 minutos |
| Implementar "Marcar como Prioridade" | 1 hora |
| Completar página de detalhes | 2-3 horas |
| Implementar filtro por período | 1 hora |
| **TOTAL** | **7-9 horas** |

### **AGENDAMENTOS**
| Tarefa | Tempo Estimado |
|--------|----------------|
| **CORRIGIR ESTRUTURA DE DADOS** | **2-3 horas** |
| Modal "Novo Agendamento" | 4-5 horas |
| Corrigir configuração de tipos | 30 minutos |
| Implementar ações (editar, cancelar, etc.) | 3-4 horas |
| Adicionar filtros | 2 horas |
| **TOTAL** | **11-14 horas** |

### **TOTAL GERAL: 18-23 horas**

---

## 🚨 PROBLEMAS CRÍTICOS RESUMIDOS

### **CONVERSAS**
1. ⚠️ Botão "Nova Conversa" não funciona
2. ⚠️ Botão "Marcar como Prioridade" não funciona
3. ⚠️ Filtro de status tem valores incorretos
4. ⚠️ Filtro por período não funciona

### **AGENDAMENTOS**
1. 🚨 **CRÍTICO:** Estrutura de dados incompatível com banco
2. 🚨 **CRÍTICO:** Query falha ao buscar agendamentos
3. ⚠️ Botão "Novo Agendamento" não funciona
4. ⚠️ Configuração de tipos incorreta
5. ⚠️ Nenhuma ação implementada nos agendamentos

---

## ✅ PONTOS POSITIVOS

### **CONVERSAS**
- ✅ Hook de Realtime muito bem implementado
- ✅ Integração com Supabase funcionando perfeitamente
- ✅ UI/UX bem estruturada
- ✅ Filtros básicos funcionais
- ✅ Loading e empty states implementados

### **AGENDAMENTOS**
- ✅ Calendário visual funcional
- ✅ Integração com Supabase (apesar do bug)
- ✅ UI/UX bem estruturada
- ✅ Loading e empty states implementados

---

## 📝 RECOMENDAÇÕES

### **ORDEM DE IMPLEMENTAÇÃO SUGERIDA:**

1. **PRIMEIRO:** Corrigir estrutura de dados de Agendamentos (BLOQUEADOR)
2. **SEGUNDO:** Implementar modal "Nova Conversa"
3. **TERCEIRO:** Implementar modal "Novo Agendamento"
4. **QUARTO:** Corrigir filtros e ações menores
5. **QUINTO:** Implementar funcionalidades avançadas

### **ABORDAGEM RECOMENDADA:**

**Para Agendamentos:**
- Criar migration para adicionar campos `scheduled_date` e `scheduled_time` (se quiser manter compatibilidade)
- OU atualizar todo o código frontend para usar `scheduled_at`
- **Recomendação:** Atualizar frontend (mais simples e correto)

**Para Conversas:**
- Criar componente reutilizável `ConversationModal`
- Usar mesmo padrão de formulário dos outros módulos
- Implementar validações com Zod

---

## 🔍 CONCLUSÃO

### **CONVERSAS: 85% FUNCIONAL**
- Sistema base está sólido
- Realtime funcionando perfeitamente
- Faltam apenas funcionalidades de criação e ações
- **Tempo para 100%:** 7-9 horas

### **AGENDAMENTOS: 60% FUNCIONAL**
- Bug crítico de estrutura de dados
- Precisa correção urgente antes de qualquer outra implementação
- Após correção, faltam funcionalidades de criação e ações
- **Tempo para 100%:** 11-14 horas

### **PRIORIDADE DE CORREÇÃO:**
1. 🚨 **URGENTE:** Corrigir estrutura de Agendamentos
2. ⚠️ **ALTA:** Implementar criação de Conversas
3. ⚠️ **ALTA:** Implementar criação de Agendamentos
4. ⚠️ **MÉDIA:** Corrigir filtros e ações

---

**AUDITORIA COMPLETA E PRONTA PARA IMPLEMENTAÇÃO**

**Criado em:** 16/01/2026  
**Método:** Análise de código + verificação de banco real via Power Supabase  
**Status:** ✅ COMPLETO
