# ARQUITETURA FRONTEND — BIA v2

## Contexto

O BIA v2 **não cria um novo frontend** — adiciona o menu "Meu Agente" ao dashboard de afiliados existente em `src/`. Todo o código novo vive dentro da estrutura React/TypeScript/Tailwind/shadcn já existente.

---

## Stack (Existente — sem mudanças)

- **Framework:** React + TypeScript
- **Estilo:** Tailwind CSS + shadcn/ui
- **Roteamento:** React Router (padrão existente)
- **Estado global:** Context API ou biblioteca existente no projeto
- **Auth:** Supabase Auth (customer_token no localStorage)
- **HTTP:** padrão existente (fetch ou axios, verificar no projeto)
- **Layout:** `AffiliateDashboardLayout.tsx` existente

---

## Estrutura de Pastas — Adições do BIA v2

```
src/
├── pages/
│   └── afiliados/
│       └── dashboard/
│           └── meu-agente/               ← NOVO
│               ├── index.tsx             ← Overview do agente
│               ├── conectar.tsx          ← Conectar WhatsApp / QR Code
│               ├── configuracoes.tsx     ← Rules: nome, tom, personalidade, TTS
│               ├── napkin.tsx            ← Editor do Napkin (memória)
│               ├── conversas.tsx         ← Histórico de conversas
│               └── metricas.tsx          ← Métricas do agente
├── components/
│   └── agente/                           ← NOVO
│       ├── AgentStatusCard.tsx           ← Card de status (ativo/suspenso/sem WhatsApp)
│       ├── QRCodeDisplay.tsx             ← Exibe QR Code com polling de status
│       ├── ConversationList.tsx          ← Lista de conversas
│       ├── ConversationDetail.tsx        ← Chat completo de uma conversa
│       ├── NapkinEditor.tsx              ← Textarea com preview Markdown
│       ├── AgentConfigForm.tsx           ← Formulário de rules (nome, tom, TTS)
│       └── MetricsCards.tsx              ← Cards de métricas
└── services/
    └── agente/                           ← NOVO
        ├── agente.service.ts             ← Chamadas para o backend BIA v2
        └── agente.types.ts               ← Tipos TypeScript do domínio do agente
```

---

## Navegação — Menu "Meu Agente"

### Regra de visibilidade

O menu "Meu Agente" segue o mesmo padrão do menu "Loja" — visível apenas para `has_subscription = true`.

```typescript
// Em AffiliateDashboardLayout.tsx — adicionar ao array de menu items:
{
  icon: Bot,
  label: 'Meu Agente',
  path: '/afiliados/dashboard/meu-agente',
  visible: affiliate.has_subscription === true
}
```

### Rotas adicionadas ao Router

```
/afiliados/dashboard/meu-agente              → MeuAgenteOverview
/afiliados/dashboard/meu-agente/conectar     → ConectarWhatsApp
/afiliados/dashboard/meu-agente/configuracoes → ConfiguracaoAgente
/afiliados/dashboard/meu-agente/napkin       → NapkinEditor
/afiliados/dashboard/meu-agente/conversas    → HistoricoConversas
/afiliados/dashboard/meu-agente/metricas     → MetricasAgente
```

---

## Gerenciamento de Estado

### Estado local (por página)

Cada página gerencia seu próprio estado com `useState` e `useEffect`. Sem estado global para o agente no MVP — as páginas são independentes.

### Cache de dados

- Configurações do agente: re-fetched a cada acesso à página (não há necessidade de cache agressivo no frontend)
- Napkin: carregado uma vez por acesso, salvo explicitamente pelo afiliado (botão "Salvar")
- Histórico de conversas: paginado, sem cache local

### Polling de QR Code

A página de conexão WhatsApp faz polling do status da instância Evolution a cada 3 segundos enquanto aguarda o scan do QR Code:

```typescript
// QRCodeDisplay.tsx — lógica de polling
useEffect(() => {
  if (status === 'connecting') {
    const interval = setInterval(async () => {
      const newStatus = await agenteService.getWhatsAppStatus(tenantId)
      if (newStatus === 'connected') {
        setStatus('connected')
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }
}, [status, tenantId])
```

---

## Serviço de Comunicação com o Backend BIA v2

```typescript
// agente.service.ts

const BIA_API_URL = process.env.REACT_APP_BIA_API_URL // ex: https://agent.slimquality.com.br

function getAuthHeaders() {
  const token = localStorage.getItem('customer_token')
  return { Authorization: `Bearer ${token}` }
}

const agenteService = {
  // Overview e status
  getAgentStatus: () => fetch(`${BIA_API_URL}/api/agent/status`, { headers: getAuthHeaders() }),

  // WhatsApp
  connectWhatsApp: () => fetch(`${BIA_API_URL}/api/agent/connect`, { method: 'POST', headers: getAuthHeaders() }),
  getWhatsAppStatus: () => fetch(`${BIA_API_URL}/api/agent/whatsapp-status`, { headers: getAuthHeaders() }),
  getQRCode: () => fetch(`${BIA_API_URL}/api/agent/qrcode`, { headers: getAuthHeaders() }),

  // Configurações (Rules)
  getConfig: () => fetch(`${BIA_API_URL}/api/agent/config`, { headers: getAuthHeaders() }),
  saveConfig: (config) => fetch(`${BIA_API_URL}/api/agent/config`, { method: 'PUT', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(config) }),

  // Napkin
  getNapkin: () => fetch(`${BIA_API_URL}/api/agent/napkin`, { headers: getAuthHeaders() }),
  saveNapkin: (content) => fetch(`${BIA_API_URL}/api/agent/napkin`, { method: 'PUT', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }),

  // Conversas
  getConversations: (page = 1) => fetch(`${BIA_API_URL}/api/conversations?page=${page}`, { headers: getAuthHeaders() }),
  getConversation: (id) => fetch(`${BIA_API_URL}/api/conversations/${id}`, { headers: getAuthHeaders() }),

  // Métricas
  getMetrics: () => fetch(`${BIA_API_URL}/api/agent/metrics`, { headers: getAuthHeaders() }),
}
```

---

## Painel Admin — Adições

O painel admin em `slimquality.com.br/dashboard` recebe uma nova seção "Gestão de Agentes" visível apenas para Super Admin.

```
/dashboard/agentes              → Lista todos os tenants + status
/dashboard/agentes/{id}         → Detalhes e ações (suspender/ativar)
/dashboard/agentes/skills       → Visualizar Skills globais ativas
```

Estas páginas ficam em:
```
src/pages/admin/agentes/
├── index.tsx          ← Lista de tenants
├── detalhe.tsx        ← Detalhes do tenant
└── skills.tsx         ← Visualização das Skills
```

---

## Design System

O BIA v2 segue o Design System existente do Slim Quality (shadcn/ui + Tailwind). Não cria novos tokens de design.

**Cor de destaque para o agente:** usar `teal` (já presente no design do painel existente — vide prints das telas com elementos teal/verde-água).

**Componentes reutilizados do sistema existente:**
- `Card`, `Badge`, `Button`, `Input`, `Textarea`, `Select` — todos do shadcn/ui
- `PaymentBanner` — reutilizado para banner de agente suspenso
- `NotificationBell` — reutilizado para notificação de nova conversa

**Componentes novos específicos do agente:**
- `QRCodeDisplay` — exibe QR Code com indicador de status e instrução
- `NapkinEditor` — textarea grande com botão salvar e preview
- `ConversationList` + `ConversationDetail` — lista e visualização de chat
- `AgentStatusCard` — card de status do agente (conectado/desconectado/suspenso)

---

## Estratégia de Performance

- Lazy loading das rotas de "Meu Agente" (React.lazy) — não impacta carregamento do dashboard principal
- Imagens/áudios das conversas: exibir link para URL Evolution, não fazer download no frontend
- Paginação no histórico de conversas (20 por página)
- Debounce de 500ms no editor do Napkin antes de salvar
