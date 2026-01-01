# Sprint 5: Painel Admin - Agente IA

## 📋 Visão Geral

**Objetivo**: Integrar gestão completa do Agente IA no painel admin existente + Widget chat no site público.

**Contexto Validado**:
- ✅ Painel Admin existente e funcional
- ✅ DNS api.slimquality.com.br configurado (72.60.15.178)
- ✅ SSL com auto-renovação
- ✅ Vercel Backend pronto após Sprint 4

## 🎯 Objetivos de Negócio

1. **Centralizar Gestão do Agente IA**: Permitir configuração, monitoramento e aprendizado do agente através do painel admin
2. **Melhorar Experiência do Cliente**: Substituir redirecionamento WhatsApp por chat integrado no site
3. **Aumentar Conversões**: Facilitar interação imediata com especialistas via chat widget
4. **Otimizar Performance**: Monitorar métricas e aprendizados do agente em tempo real

## 👥 Personas

### Administrador (Usuário Principal)
- **Necessidades**: Configurar agente, aprovar aprendizados, monitorar performance
- **Contexto**: Acesso ao painel admin com autenticação JWT
- **Objetivos**: Maximizar eficiência do agente e taxa de conversão

### Visitante do Site (Usuário Final)
- **Necessidades**: Tirar dúvidas rapidamente sem sair do site
- **Contexto**: Navegação no site público sem autenticação
- **Objetivos**: Obter informações e suporte de forma rápida e intuitiva

## 📦 Entregáveis

### 1. Menu Sidebar "🤖 Meu Agente"

**User Story**: Como administrador, quero acessar todas as funcionalidades do agente através de um menu organizado no sidebar.

**Acceptance Criteria**:
- [ ] Dropdown no sidebar igual ao menu "Afiliados"
- [ ] 6 submenus: Overview, Configuração, SICC, Integrações, Métricas, Aprendizados
- [ ] Badge vermelho em "Aprendizados" quando há itens pendentes
- [ ] Ícones apropriados para cada submenu
- [ ] Navegação funcional entre todas as páginas

### 2. Páginas React do Painel Admin

### 2.1 AgenteIA.tsx (/dashboard/agente) - STATUS E CONFIGURAÇÃO

**User Story**: Como administrador, quero uma visão geral do status do agente e acesso rápido às configurações.

**Acceptance Criteria**:
- [ ] Cards com status do agente:
  - [ ] Status Online/Offline
  - [ ] Modelo Atual (GPT-4o, Claude, etc)
  - [ ] Última Atualização
  - [ ] Aprendizados Pendentes (com badge)
- [ ] Quick Actions:
  - [ ] "Configurar Agente" → redireciona para /agente/configuracao
  - [ ] "Testar Agente" → modal de teste
  - [ ] "Ver Logs" → logs detalhados
- [ ] **INTEGRAÇÃO COM DASHBOARD EXISTENTE**:
  - [ ] NÃO duplicar cards de "Conversas Ativas" (já existe no Dashboard.tsx)
  - [ ] Focar apenas em status e configuração do agente IA

#### 2.2 AgenteConfiguracao.tsx (/dashboard/agente/configuracao)

**User Story**: Como administrador, quero configurar os parâmetros do modelo de IA e testar prompts.

**Acceptance Criteria**:
- [ ] Formulário de configuração:
  - [ ] Select Modelo LLM (GPT-4o, GPT-4o Mini, Claude Sonnet)
  - [ ] Slider Temperatura (0-1)
  - [ ] Input Max Tokens
  - [ ] Textarea System Prompt com Monaco Editor
- [ ] Botões "Salvar" e "Testar Prompt"
- [ ] Preview com chat teste ao vivo (sidebar direita)
- [ ] Validação de campos obrigatórios
- [ ] Feedback visual de salvamento

#### 2.3 AgenteSicc.tsx (/dashboard/agente/sicc)

**User Story**: Como administrador, quero configurar o sistema de aprendizado contínuo (SICC) do agente.

**Acceptance Criteria**:
- [ ] Configurações SICC:
  - [ ] Toggle "SICC Ativo"
  - [ ] Slider Threshold Auto-Aprovação (0-100%)
  - [ ] Select Modelo Embedding (GTE-small, OpenAI)
  - [ ] Input Quota Memórias
- [ ] Métricas SICC:
  - [ ] Total Memórias Armazenadas
  - [ ] Progress bar Taxa Uso Quota
  - [ ] Data do Último Aprendizado
- [ ] Validação de limites e thresholds

#### 2.4 AgenteMcp.tsx (/dashboard/agente/mcp)

**User Story**: Como administrador, quero monitorar o status das integrações MCP do agente.

**Acceptance Criteria**:
- [ ] Cards de status para cada integração:
  - [ ] Evolution API (✅/❌)
  - [ ] Uazapi (✅/❌)
  - [ ] Supabase (✅/❌)
  - [ ] Redis (✅/❌)
- [ ] Para cada integração:
  - [ ] Badge de status (online/offline)
  - [ ] Timestamp última conexão
  - [ ] Latência média
  - [ ] Botão "Testar Conexão"
- [ ] Atualização automática de status
- [ ] Logs de erro quando aplicável

#### 2.5 AgenteMetricas.tsx (/dashboard/agente/metricas)

**User Story**: Como administrador, quero visualizar métricas técnicas específicas do agente IA.

**Acceptance Criteria**:
- [ ] **MÉTRICAS ESPECÍFICAS DO AGENTE (não duplicar Dashboard.tsx)**:
  - [ ] Uptime do agente (disponibilidade)
  - [ ] Latência média de resposta
  - [ ] Accuracy rate (respostas corretas)
  - [ ] Tokens consumidos por período
  - [ ] Distribuição por modelo LLM usado
- [ ] **NÃO DUPLICAR métricas já em Dashboard.tsx**:
  - ❌ Total conversas (já existe)
  - ❌ Taxa conversão vendas (já existe)
  - ❌ Vendas do mês (já existe)
- [ ] Charts usando Recharts:
  - [ ] Line chart: Latência por hora
  - [ ] Gauge: Uptime percentage
  - [ ] Bar chart: Tokens por modelo LLM
  - [ ] Pie chart: Distribuição de tipos de pergunta
- [ ] Filtros de período:
  - [ ] Hoje, 7 dias, 30 dias, período customizado
- [ ] Exportação de dados (CSV/PDF)
- [ ] Responsividade em diferentes telas

#### 2.6 AgenteAprendizados.tsx (/dashboard/agente/aprendizados)

**User Story**: Como administrador, quero revisar e aprovar aprendizados do agente antes da aplicação.

**Acceptance Criteria**:
- [ ] Tabs: "Fila Aprovação" e "Aprovados"
- [ ] Badge vermelho na tab "Fila Aprovação" se > 0 itens
- [ ] **Fila Aprovação**:
  - [ ] Card por aprendizado com:
    - [ ] Padrão identificado
    - [ ] Percentual de confiança
    - [ ] Origem (número de conversas)
    - [ ] Ações: Aprovar/Rejeitar/Editar
- [ ] **Aprovados**:
  - [ ] Tabela com padrão, data aprovação, uso
  - [ ] Ações: Desativar/Editar
- [ ] Paginação para grandes volumes
- [ ] Filtros por confiança e data

### 3. Widget Chat Site Público

#### 3.1 ChatWidget.tsx (Botão Flutuante)

**User Story**: Como visitante do site, quero conversar com um especialista sem sair da página atual.

**Acceptance Criteria**:
- [ ] Botão flutuante no canto inferior direito
- [ ] Texto: "Fale com Especialista"
- [ ] Substitui redirecionamento WhatsApp atual
- [ ] Presente em todas as páginas do site público
- [ ] Animação sutil para chamar atenção
- [ ] Responsivo em mobile e desktop

#### 3.2 Chat Modal

**User Story**: Como visitante, quero uma interface de chat intuitiva e responsiva.

**Acceptance Criteria**:
- [ ] Modal que abre ao clicar no botão
- [ ] Header: Logo + "Slim Quality"
- [ ] Body: Histórico de mensagens
- [ ] Footer: Input + Botão Enviar
- [ ] Persistência dual (localStorage + Supabase)
- [ ] Indicador de digitação
- [ ] Scroll automático para novas mensagens
- [ ] Botão fechar modal
- [ ] Responsivo (mobile-first)

#### Persistência Chat Widget (Dual Approach)

**localStorage (temporário - performance):**
- sessionId UUID
- Últimas 10 mensagens (cache UI)
- Estado isOpen (reabre após navegar página)

**Supabase (permanente - histórico completo):**
- Conversation completa
- Histórico total de messages
- Usado quando sessionId já existe
- Sincroniza com localStorage ao carregar

**Fluxo de Persistência:**
1. Visitante novo → gera sessionId → salva localStorage
2. Envia mensagem → salva Supabase + localStorage
3. Navega página → carrega de localStorage (fast)
4. Reabre chat → busca histórico completo Supabase
5. Sincroniza localStorage com dados mais recentes

#### 3.3 Integração Backend Chat

**User Story**: Como sistema, quero processar mensagens do chat público através do mesmo agente do WhatsApp.

**Acceptance Criteria**:
- [ ] Endpoint `POST /api/chat/message` implementado
- [ ] Rate limiting (10 msg/min por IP) configurado
- [ ] Processamento com agente LangGraph (mesmo do WhatsApp)
- [ ] Salvamento dual (conversations + messages)
- [ ] SessionId UUID gerado automaticamente se ausente
- [ ] Histórico persistente no Supabase
- [ ] Canal "site" separado de "whatsapp"
- [ ] CORS configurado para domínio público
- [ ] Error handling específico implementado

#### Endpoint Chat Detalhado

##### POST /api/chat/message

**Request:**
```json
{
  "message": "Quero saber sobre colchão Queen",
  "sessionId": "uuid-v4-here" // opcional, gerado se ausente
}
```

**Processo Backend:**
1. Validar rate limit (10 msg/min por IP)
2. Validar input (não vazio, max 500 chars)
3. Criar/recuperar conversation (channel='site', session_id)
4. Inserir message (role='user')
5. Processar com agente LangGraph (mesmo do WhatsApp)
6. Inserir message (role='assistant')
7. Atualizar conversation.updated_at (trigger Realtime)

**Response:**
```json
{
  "response": "Temos o Queen de 158x198x30cm por R$ 3.490...",
  "sessionId": "uuid-v4-here",
  "conversationId": "conv-uuid"
}
```

**Error Responses:**
- `429`: Rate limit exceeded (10 msg/min)
- `400`: Invalid message (empty, > 500 chars)
- `500`: Agent processing error
- `503`: Service temporarily unavailable

## 🔄 INTEGRAÇÃO CHAT ↔ DASHBOARD (CRÍTICO)

### 📋 CONTEXTO ATUAL (Sprint 4)

**✅ WhatsApp JÁ FUNCIONA:**
- Webhook Evolution → Backend (`/webhooks/evolution`)
- Backend → Agente LangGraph (processa mensagem)
- Agente → Resposta automática via Evolution API
- **MAS**: Conversas NÃO aparecem no dashboard admin

**✅ Chat Site SERÁ CRIADO:**
- Widget chat → Backend (`/api/chat/message`)
- Backend → Agente LangGraph (MESMO agente do WhatsApp)
- Resposta → Modal chat

**❌ PROBLEMA ATUAL:**
- Admin não vê conversas WhatsApp no painel
- Admin não terá visão das conversas do site

### ⚠️ ANÁLISE DASHBOARD EXISTENTE REALIZADA

**DESCOBERTAS IMPORTANTES:**
- ✅ `/dashboard/conversas` JÁ EXISTE e funciona
- ✅ `/dashboard/analytics` JÁ EXISTE com Recharts
- ✅ Tabela `conversations` JÁ EXISTE no Supabase
- ✅ Card "Conversas Ativas" JÁ EXISTE no Dashboard.tsx
- ✅ Componentes `StatCard` e `StatusBadge` disponíveis
- ❌ Campo `channel` FALTA na tabela conversations
- ❌ Supabase Realtime NÃO implementado (usa polling)

### Estratégia: INTEGRAÇÃO ao invés de DUPLICAÇÃO

#### 1. Modificações no Banco de Dados
```sql
-- Verificar se enum conversation_channel existe
-- Se não existir, criar:
CREATE TYPE conversation_channel AS ENUM ('whatsapp', 'site');

-- Adicionar campo channel na tabela existente
ALTER TABLE conversations 
ADD COLUMN channel conversation_channel DEFAULT 'whatsapp';

-- Adicionar session_id para chat público
ALTER TABLE conversations 
ADD COLUMN session_id UUID;

-- Criar índices para performance
CREATE INDEX idx_conversations_channel ON conversations(channel);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
```

#### 2. Modificar Webhook Evolution (JÁ EXISTE)
```typescript
// /webhooks/evolution/message-received (MODIFICAR EXISTENTE)
async function handleEvolutionWebhook(req, res) {
  const { remoteJid, message } = req.body;
  
  // 1. Processar com agente (JÁ EXISTE - NÃO MODIFICAR)
  const response = await agent.invoke({ message });
  
  // 2. ADICIONAR: Salvar no BD
  const conversation = await supabase
    .from('conversations')
    .upsert({
      session_id: remoteJid, // número WhatsApp
      channel: 'whatsapp',
      customer_phone: remoteJid,
      status: 'active'
    })
    .select()
    .single();
  
  // 3. ADICIONAR: Salvar mensagens
  await supabase.from('messages').insert([
    { conversation_id: conversation.id, role: 'user', content: message },
    { conversation_id: conversation.id, role: 'assistant', content: response }
  ]);
  
  // 4. Enviar resposta Evolution (JÁ EXISTE - NÃO MODIFICAR)
  await evolutionAPI.sendMessage(remoteJid, response);
}
```

#### 3. Chat Widget → Tabela Conversations
```typescript
// Endpoint: POST /api/chat/message (CRIAR NOVO)
// Body: { message: string, sessionId: string }
// Ação:
1. Buscar conversation existente por session_id
2. Se não existir: criar nova conversation (channel='site')
3. Inserir message (role='user')
4. Processar com agente IA (MESMO do WhatsApp)
5. Inserir response (role='assistant')
6. Trigger Supabase Realtime → Dashboard atualiza automaticamente
```

#### 4. Dashboard.tsx - INTEGRAR Card Existente
```typescript
// MODIFICAR Card "Conversas Recentes" existente
// ADICIONAR badge de canal (Site/WhatsApp)
// USAR Supabase Realtime ao invés de polling

const { data: conversasRecentes } = useRealtimeConversations({
  limit: 5,
  orderBy: 'updated_at'
});

// Mostrar badge do canal em cada conversa
<div className="flex items-center gap-2 mb-1">
  <p className="font-medium">{conversa.customer?.name || conversa.customer_phone || 'Cliente'}</p>
  <Badge variant={conversa.channel === 'site' ? 'default' : 'secondary'}>
    {conversa.channel === 'site' ? '🌐 Site' : '📱 WhatsApp'}
  </Badge>
  <StatusBadge status={conversa.status} />
</div>
```

#### 5. Conversas.tsx - ADICIONAR Filtro por Canal
```typescript
// MODIFICAR página existente /dashboard/conversas
// ADICIONAR Select para filtrar por canal

const [canalFilter, setCanalFilter] = useState('todos');

// Adicionar filtro na barra existente
<Select value={canalFilter} onValueChange={setCanalFilter}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Canal" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="todos">Todos Canais</SelectItem>
    <SelectItem value="site">🌐 Site</SelectItem>
    <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
  </SelectContent>
</Select>

// Aplicar filtro na query existente
const filteredConversas = conversas.filter(conversa => {
  if (canalFilter !== 'todos' && conversa.channel !== canalFilter) return false;
  // ... outros filtros existentes
  return true;
});
```

#### 6. Supabase Realtime - SUBSTITUIR Polling
```typescript
// hooks/useRealtimeConversations.ts (NOVO)
import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export function useRealtimeConversations(options = {}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Carregar dados iniciais
    loadInitialData();
    
    // Configurar subscription Realtime
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const handleRealtimeUpdate = (payload) => {
    if (payload.eventType === 'INSERT') {
      setConversations(prev => [payload.new, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      setConversations(prev => 
        prev.map(c => c.id === payload.new.id ? payload.new : c)
      );
    }
  };
  
  return { data: conversations, loading };
}

// APLICAR em Dashboard.tsx e Conversas.tsx
// REMOVER useEffect com setInterval
```

### Acceptance Criteria ATUALIZADOS
- [ ] Campo `channel` adicionado na tabela `conversations`
- [ ] Webhook Evolution MODIFICADO para salvar no BD
- [ ] Conversas WhatsApp aparecem no dashboard
- [ ] Chat widget salva conversas com `channel='site'`
- [ ] Dashboard.tsx mostra badge do canal nas conversas
- [ ] Conversas.tsx tem filtro por canal funcionando
- [ ] Supabase Realtime implementado (sem polling)
- [ ] Atualização em tempo real < 2 segundos
- [ ] Teste E2E: WhatsApp → aparece no dashboard imediatamente
- [ ] Teste E2E: mensagem site → aparece no dashboard imediatamente

### 🔄 Fluxo Completo Sprint 5

#### WhatsApp (modificar webhook existente)
```
Cliente WhatsApp envia mensagem
  ↓ Webhook Evolution recebe
  ↓ [JÁ EXISTE] Agente processa + responde
  ↓ [ADICIONAR] Salva em conversations (channel='whatsapp')
  ↓ [ADICIONAR] Salva messages (user + assistant)
  ↓ [REALTIME] Dashboard atualiza automaticamente
  ↓ Admin vê conversa com badge "📱 WhatsApp"
```

#### Site Chat (criar do zero)
```
Cliente site envia mensagem
  ↓ POST /api/chat/message
  ↓ Agente processa (MESMO do WhatsApp)
  ↓ Salva em conversations (channel='site')
  ↓ Salva messages (user + assistant)
  ↓ [REALTIME] Dashboard atualiza automaticamente
  ↓ Admin vê conversa com badge "🌐 Site"
```

### 3.4 Integração Widget em TODAS CTAs do Site

#### Substituir TODOS os Botões de Ação
**LOCALIZAR e SUBSTITUIR:**
- ❌ Botão "Agendar Consulta" (Hero Section)
- ❌ Botão "Fale com Especialista" (Header)
- ❌ Link "Falar com BIA" (várias seções)
- ❌ Botão "Quero Saber Mais" (CTAs)
- ❌ Redirecionamentos para WhatsApp
- ❌ Links `https://wa.me/...`

**SUBSTITUIR POR:**
- ✅ Chat Widget integrado
- ✅ Mesmo agente IA do WhatsApp
- ✅ Experiência unificada

#### Implementação Técnica
```tsx
// 1. Criar ChatStore (Zustand)
interface ChatStore {
  isOpen: boolean;
  sessionId: string;
  messages: Message[];
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
}

// 2. Substituir TODOS os botões existentes
// ANTES:
<Button onClick={() => window.open('https://wa.me/5511999999999')}>
  Fale com Especialista
</Button>

// DEPOIS:
<Button onClick={() => chatStore.openChat()}>
  Fale com Especialista
</Button>

// 3. Widget sempre presente
// App.tsx ou Layout principal
export function App() {
  return (
    <>
      <Router>
        {/* Todas as páginas */}
      </Router>
      
      {/* Widget SEMPRE presente */}
      <ChatWidget />
    </>
  );
}
```

#### Locais de Integração Específicos
```typescript
// src/pages/Home.tsx
// Seção Hero - Botão principal
<Button size="lg" onClick={() => chatStore.openChat()}>
  Transforme Suas Noites de Sono
</Button>

// Header - Botão secundário  
<Button variant="outline" onClick={() => chatStore.openChat()}>
  Fale com Especialista
</Button>

// Seção "Pronto para Transformar?" - CTA final
<Button size="lg" onClick={() => chatStore.openChat()}>
  Quero Conversar com Especialista
</Button>

// Footer - Link de contato
<a onClick={() => chatStore.openChat()}>
  Atendimento Online
</a>
```

#### Testes de Integração Obrigatórios
- [ ] TODOS os botões abrem chat widget
- [ ] Nenhum redirecionamento para WhatsApp externo
- [ ] Chat funciona em TODAS as páginas
- [ ] Sessão persiste ao navegar
- [ ] Mobile: widget não sobrepõe conteúdo importante

### Atualização Tempo Real (CRÍTICO)

❌ **REMOVER**: Polling a cada 30s/2s  
✅ **USAR**: Supabase Realtime

```typescript
// hooks/useRealtimeConversations.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeConversations() {
  const [conversations, setConversations] = useState([]);
  
  useEffect(() => {
    // Subscribe a mudanças na tabela
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: 'status=eq.active'
        },
        (payload) => {
          // Atualizar estado em tempo real
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev => 
              prev.map(c => c.id === payload.new.id ? payload.new : c)
            );
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return { data: conversations };
}
```

**Aplicar em:**
- [ ] Dashboard.tsx → Card "Conversas Ativas"
- [ ] Badge sidebar → Aprendizados pendentes
- [ ] /dashboard/conversas → Lista completa
- [ ] AgenteMetricas.tsx → Atualização de charts

## 🔧 Especificações Técnicas

### Estrutura de Rotas

```typescript
// src/app/Router.tsx
{
  path: '/dashboard',
  element: <DashboardLayout />,
  children: [
    // ... rotas existentes
    
    // NOVO: Agente IA
    { path: 'agente', element: <AgenteIA /> },
    { path: 'agente/configuracao', element: <AgenteConfiguracao /> },
    { path: 'agente/sicc', element: <AgenteSicc /> },
    { path: 'agente/mcp', element: <AgenteMcp /> },
    { path: 'agente/metricas', element: <AgenteMetricas /> },
    { path: 'agente/aprendizados', element: <AgenteAprendizados /> },
  ]
}
```

### React Query Hooks

```typescript
// hooks/useAgente.ts
export function useAgenteConfig() {
  return useQuery(['agente', 'config'], 
    () => api.get('/admin/agent/config')
  );
}

export function useUpdateConfig() {
  return useMutation(
    (data) => api.put('/admin/agent/config', data),
    { onSuccess: () => queryClient.invalidateQueries(['agente', 'config']) }
  );
}

export function useAgenteMetricas(periodo: string) {
  return useQuery(['agente', 'metricas', periodo],
    () => api.get(`/admin/agent/metrics?period=${periodo}`)
  );
}

export function useAprendizados() {
  return useQuery(['agente', 'aprendizados'],
    () => api.get('/admin/agent/learning-queue')
  );
}

export function useAprovarAprendizado() {
  return useMutation(
    (id: string) => api.post(`/admin/agent/learning/${id}/approve`),
    { onSuccess: () => queryClient.invalidateQueries(['agente', 'aprendizados']) }
  );
}
```

### Variáveis de Ambiente

```bash
# .env.production (Vercel)
VITE_API_URL=https://api.slimquality.com.br
VITE_WS_URL=wss://api.slimquality.com.br
```

### Endpoints Backend Necessários

#### Admin (Auth JWT)
- `GET /admin/agent/config`
- `PUT /admin/agent/config`
- `GET /admin/agent/metrics?period=7d`
- `GET /admin/agent/learning-queue`
- `POST /admin/agent/learning/:id/approve`
- `POST /admin/agent/learning/:id/reject`
- `GET /admin/agent/integrations/status`

#### Chat Público (Sem Auth)
- `POST /api/chat/message`
  - Body: `{ message, sessionId }`
  - Response: `{ response, sessionId }`

## 🚨 Considerações de Segurança

### Chat Widget Público
- ⚠️ **Sem autenticação JWT** (acesso público)
- ✅ **Rate limiting**: 10 mensagens/minuto por IP
- ✅ **SessionId UUID** para rastreamento
- ✅ **CORS configurado** para domínio específico
- ✅ **Validação de input** para prevenir XSS

### Painel Admin
- ✅ **Autenticação JWT** obrigatória
- ✅ **Validação de permissões** por endpoint
- ✅ **Sanitização de prompts** antes de salvar
- ✅ **Logs de auditoria** para alterações críticas

## 📊 Métricas de Sucesso

### Técnicas
- [ ] Tempo de carregamento < 2s para todas as páginas
- [ ] Uptime > 99.5% do chat widget
- [ ] Taxa de erro < 1% nas requisições
- [ ] Responsividade em dispositivos móveis

### Negócio
- [ ] Aumento de 30% nas interações com suporte
- [ ] Redução de 50% no tempo de resposta inicial
- [ ] Taxa de aprovação de aprendizados > 80%
- [ ] Satisfação do usuário admin > 4.5/5

## 🔄 Fluxos Críticos

### Fluxo 1: Configuração do Agente
1. Admin acessa `/dashboard/agente/configuracao`
2. Modifica parâmetros do modelo
3. Testa prompt no preview
4. Salva configuração
5. Sistema aplica mudanças em tempo real

### Fluxo 2: Aprovação de Aprendizado
1. Sistema identifica padrão em conversas
2. Adiciona à fila de aprovação
3. Badge aparece no sidebar
4. Admin revisa em `/dashboard/agente/aprendizados`
5. Aprova/rejeita aprendizado
6. Sistema aplica ou descarta padrão

### Fluxo 3: Chat Público
1. Visitante clica no widget
2. Modal abre com chat
3. Mensagem enviada via API
4. Agente processa e responde
5. Histórico salvo na sessão
6. Conversão rastreada nas métricas

## 📅 Cronograma de Implementação

### Dia 1: Estrutura + Páginas Base (8h)
**Manhã (4h)**:
- [ ] Criar rotas React Router
- [ ] Atualizar DashboardLayout (sidebar dropdown)
- [ ] Criar componentes vazios (6 páginas)
- [ ] Setup React Query hooks

**Tarde (4h)**:
- [ ] Implementar AgenteIA.tsx (overview)
- [ ] Implementar AgenteConfiguracao.tsx (formulário)

### Dia 2: Páginas Avançadas + Widget (8h)
**Manhã (4h)**:
- [ ] Implementar AgenteSicc.tsx
- [ ] Implementar AgenteMcp.tsx
- [ ] Implementar AgenteMetricas.tsx

**Tarde (4h)**:
- [ ] Implementar AgenteAprendizados.tsx
- [ ] Badge dinâmico sidebar (polling aprendizados)
- [ ] Criar ChatWidget.tsx (botão flutuante)

### Dia 3: Integração + Deploy (8h)
**Manhã (4h)**:
- [ ] Integrar todas as páginas com backend
- [ ] Implementar chat modal completo
- [ ] Substituir botão WhatsApp por chat widget
- [ ] Testes E2E (fluxo completo)

**Tarde (4h)**:
- [ ] Ajustes de responsividade
- [ ] Deploy Vercel
- [ ] Testes em produção
- [ ] Documentação final

## ✅ Definition of Done

### Funcional
- [ ] Todas as 6 páginas do painel admin funcionais
- [ ] Chat widget integrado no site público
- [ ] Badge dinâmico de aprendizados pendentes
- [ ] Todas as integrações com backend funcionando
- [ ] Testes E2E passando

### Técnico
- [ ] Código revisado e aprovado
- [ ] Deploy em produção realizado
- [ ] Monitoramento configurado
- [ ] Documentação atualizada
- [ ] Performance dentro dos SLAs

### Negócio
- [ ] Aprovação do stakeholder (Renato)
- [ ] Treinamento da equipe realizado
- [ ] Métricas de baseline coletadas
- [ ] Plano de rollback documentado

## 🔗 Dependências

### Pré-requisitos
- ✅ Sprint 4 concluído (backend endpoints)
- ✅ Painel admin existente funcional
- ✅ Autenticação JWT implementada
- ✅ DNS e SSL configurados

### Dependências Externas
- [ ] Aprovação final do design com Renato
- [ ] Confirmação de endpoints backend com Kiro
- [ ] Validação de rate limiting em produção
- [ ] Teste de carga do chat widget

## 📝 Notas de Implementação

### Decisões Técnicas
1. **Polling vs WebSocket**: Iniciar com polling (2s) para simplicidade
2. **Monaco Editor**: Usar para prompts (melhor UX para código)
3. **Badge Update**: Polling a cada 30s para aprendizados pendentes
4. **Chat Storage**: localStorage para sessão + Supabase para histórico
5. **Charts**: Recharts para consistência com painel existente

### Pontos de Atenção
1. **Performance**: Chat widget não deve impactar carregamento da página
2. **Segurança**: Rate limiting rigoroso no chat público
3. **UX**: Feedback visual claro em todas as ações
4. **Mobile**: Priorizar experiência mobile no chat widget
5. **Escalabilidade**: Preparar para alto volume de mensagens

---

**Especificação criada em**: 31/12/2025
**Versão**: 1.0
**Status**: Aguardando aprovação para implementação