# ESPECIFICAÇÃO DE TELAS — BIA v2

## Contexto

Todas as telas do afiliado vivem dentro do `AffiliateDashboardLayout` existente (sidebar + topbar). As telas admin vivem dentro do layout admin existente. O menu "Meu Agente" aparece na sidebar apenas para `has_subscription = true`.

---

## TELAS DO AFILIADO

---

### Tela 1 — Meu Agente: Overview

**Rota:** `/afiliados/dashboard/meu-agente`
**Arquivo:** `src/pages/afiliados/dashboard/meu-agente/index.tsx`

**Propósito:** Visão geral do status do agente e atalhos rápidos.

**Componentes principais:**
- `AgentStatusCard` — card grande no topo mostrando status do agente
- 4 cards de métricas (conversas hoje, mensagens, áudios transcritos, tempo médio de resposta)
- Lista das últimas 5 conversas com preview
- 2 botões de ação rápida: "Configurar Agente" e "Ver Conversas"

**Estados:**
- **Loading:** skeleton nos cards e lista
- **WhatsApp não conectado:** AgentStatusCard em destaque com CTA "Conectar WhatsApp" + demais seções com overlay bloqueado
- **Agente ativo:** exibe métricas e conversas normalmente
- **Agente suspenso:** banner vermelho no topo + AgentStatusCard vermelho + overlay em tudo

**AgentStatusCard — variantes:**
```
Status: 'inactive'  → Cinza  → "WhatsApp não conectado" → CTA "Conectar"
Status: 'connecting' → Amarelo → "Conectando..." → spinner
Status: 'active'    → Verde  → "Agente ativo" → número do WhatsApp conectado
Status: 'suspended' → Vermelho → "Agente suspenso" → link "Regularizar pagamento"
```

**Dados carregados:** `GET /api/agent/status` + `GET /api/agent/metrics?days=1` + `GET /api/conversations?per_page=5`

**Navegação de entrada:** menu sidebar "Meu Agente"
**Navegação de saída:** cards → telas específicas; botão "Conectar" → Tela 2; lista → Tela 5

---

### Tela 2 — Conectar WhatsApp

**Rota:** `/afiliados/dashboard/meu-agente/conectar`
**Arquivo:** `src/pages/afiliados/dashboard/meu-agente/conectar.tsx`

**Propósito:** Provisionar instância Evolution e conectar o WhatsApp do afiliado.

**Componentes principais:**
- Instrução passo a passo (3 steps visuais)
- `QRCodeDisplay` — exibe QR Code ou estado de carregamento/sucesso

**QRCodeDisplay — estados:**
```
'idle'       → Botão "Gerar QR Code" (para primeira vez ou reconexão)
'loading'    → Spinner "Gerando QR Code..."
'showing'    → QR Code grande + instrução + timer (60s) + botão "Gerar novo"
'connecting' → Animação "Aguardando scan..."
'connected'  → Ícone de sucesso verde + "WhatsApp conectado! Redirecionando..."
'error'      → Mensagem de erro + botão "Tentar novamente"
```

**Instruções visuais (3 steps):**
1. Abra o WhatsApp no celular
2. Toque em "Aparelhos Conectados" → "Conectar aparelho"
3. Aponte a câmera para o QR Code abaixo

**Dados carregados:** `POST /api/agent/connect` (ao clicar) + polling `GET /api/agent/whatsapp-status` a cada 3s

**Navegação de entrada:** Tela 1 (CTA) ou sidebar
**Navegação de saída:** após conexão → Tela 1 (redirect automático)

---

### Tela 3 — Configurações do Agente

**Rota:** `/afiliados/dashboard/meu-agente/configuracoes`
**Arquivo:** `src/pages/afiliados/dashboard/meu-agente/configuracoes.tsx`

**Propósito:** Personalizar o comportamento do agente (Rules).

**Componentes principais:**
- `AgentConfigForm` — formulário de configuração
- Preview de como o agente se apresenta (texto dinâmico)

**AgentConfigForm — campos:**

| Campo | Tipo | Validação |
|-------|------|-----------|
| Nome do Agente | Input text | 1-50 chars |
| Tom de Voz | Select | amigavel / formal / casual / tecnico |
| Personalidade | Textarea | máx 1000 chars — placeholder com exemplo |
| Responder em Áudio | Toggle | on/off — default: on |

**Preview dinâmico (abaixo do formulário):**
```
"Olá! Sou [Nome do Agente], assistente de [nome do afiliado]. 
Em que posso ajudar você hoje?"
```
Atualiza em tempo real conforme o afiliado edita.

**Estados:**
- **Loading:** skeleton no formulário
- **Salvando:** botão com spinner "Salvando..."
- **Salvo:** toast verde "Configuração salva com sucesso!"
- **Erro:** toast vermelho com mensagem

**Dados carregados:** `GET /api/agent/config`
**Dados enviados:** `PUT /api/agent/config`

**Navegação de entrada:** Tela 1 (botão ação rápida) ou sidebar
**Navegação de saída:** fica na tela após salvar

---

### Tela 4 — Napkin (Memória do Agente)

**Rota:** `/afiliados/dashboard/meu-agente/napkin`
**Arquivo:** `src/pages/afiliados/dashboard/meu-agente/napkin.tsx`

**Propósito:** Visualizar e editar a memória acumulada do agente.

**Componentes principais:**
- Explicação do que é o Napkin (card informativo)
- `NapkinEditor` — textarea grande com Markdown

**NapkinEditor:**
- Textarea de altura mínima 400px
- Contador de caracteres (X / 10.000)
- Último update: "Atualizado pelo agente em X" ou "Atualizado por você em X"
- Botão "Salvar" (desabilitado se sem alterações)
- Botão "Resetar" (restaura para versão anterior — confirmar em modal)

**Card informativo (expansível):**
```
ℹ️ O que é a Memória do Agente?
O agente registra automaticamente padrões que aprende sobre seu 
negócio e clientes. Você pode corrigir ou complementar essas 
informações aqui. Quanto mais completa a memória, melhor o agente 
atende seus clientes.
```

**Estados:**
- **Loading:** skeleton
- **Vazio:** placeholder com exemplo de conteúdo + dica
- **Com conteúdo:** editor preenchido
- **Editado (não salvo):** botão "Salvar" habilitado + indicador "* Alterações não salvas"
- **Salvando:** spinner
- **Salvo:** toast "Memória atualizada!"

**Dados carregados:** `GET /api/agent/napkin`
**Dados enviados:** `PUT /api/agent/napkin`

---

### Tela 5 — Histórico de Conversas

**Rota:** `/afiliados/dashboard/meu-agente/conversas`
**Arquivo:** `src/pages/afiliados/dashboard/meu-agente/conversas.tsx`

**Propósito:** Listar todas as conversas do agente com possibilidade de visualizar detalhes.

**Componentes principais:**
- Filtros (status, busca por nome/telefone)
- `ConversationList` — lista paginada
- `ConversationDetail` — painel lateral ou modal com o chat completo

**ConversationList — item:**
```
[Avatar com iniciais] [Nome ou Telefone] [Status badge]
Última mensagem: "Qual o prazo de entrega?"          há 2h
```

**ConversationDetail — mensagens:**
```
[Balão cinza esquerda] Cliente: "Quero saber sobre os colchões"  10:25
[Ícone de áudio] 🎵 Áudio (0:40) — Transcrição: "Quero saber..."

[Balão teal direita] Agente: "Boa tarde! Temos uma linha completa..." 10:25
[Ícone de áudio] 🎵 Resposta em áudio
```

**Filtros:**
- Busca: por nome ou telefone
- Status: Todas / Ativas / Encerradas
- Ordenação: Mais recentes primeiro (padrão)

**Estados:**
- **Loading:** skeleton list
- **Vazia:** "Nenhuma conversa ainda. Quando seu agente atender clientes, elas aparecerão aqui."
- **Com dados:** lista normal
- **Conversa selecionada:** painel lateral abre com chat completo

**Dados carregados:** `GET /api/conversations` + `GET /api/conversations/{id}` (ao selecionar)

---

### Tela 6 — Métricas do Agente

**Rota:** `/afiliados/dashboard/meu-agente/metricas`
**Arquivo:** `src/pages/afiliados/dashboard/meu-agente/metricas.tsx`

**Propósito:** Métricas simples de performance do agente.

**Componentes principais:**
- Selector de período (7 dias / 15 dias / 30 dias)
- 4 cards de métricas
- Gráfico de barras simples (conversas por dia)
- Cards de totais de áudio

**Cards de métricas:**
```
[Total de Conversas]  [Mensagens Recebidas]  [Áudios Transcritos]  [Tempo Médio de Resposta]
      45                     180                     32                    2.3s
```

**Gráfico:** barras simples (conversas/dia) — sem biblioteca pesada, pode ser CSS ou Recharts (já no projeto)

**Dados carregados:** `GET /api/agent/metrics?days=7`

---

## TELAS DO ADMIN

---

### Tela 7 — Admin: Lista de Tenants

**Rota:** `/dashboard/agentes`
**Arquivo:** `src/pages/admin/agentes/index.tsx`

**Propósito:** Visão geral de todos os tenants ativos.

**Componentes principais:**
- Sumário (total tenants, ativos, suspensos, sem WhatsApp)
- Tabela de tenants com ações

**Tabela — colunas:**
| Afiliado | Tipo | WhatsApp | Status | Conversas hoje | Ativado em | Ações |
|----------|------|----------|--------|----------------|------------|-------|

**Filtros:** Status (todos/ativos/suspensos), Tipo (individual/logista), Busca por nome

**Ações por linha:**
- Ver detalhes → Tela 8
- Suspender / Reativar (botão contextual)

**Dados carregados:** `GET /api/admin/tenants`

---

### Tela 8 — Admin: Detalhes do Tenant

**Rota:** `/dashboard/agentes/{tenant_id}`
**Arquivo:** `src/pages/admin/agentes/detalhe.tsx`

**Propósito:** Visualizar detalhes e tomar ações em um tenant específico.

**Componentes:**
- Card de status e informações do afiliado
- Card de status do WhatsApp e instância Evolution
- Card de métricas do tenant
- Botão de suspender/reativar com confirmação
- Histórico de ativações

**Dados carregados:** tenant específico via `GET /api/admin/tenants` (filtrado por ID)

---

### Tela 9 — Admin: Skills Globais

**Rota:** `/dashboard/agentes/skills`
**Arquivo:** `src/pages/admin/agentes/skills.tsx`

**Propósito:** Visualizar as Skills globais ativas (não editar — edição via repositório no MVP).

**Componentes:**
- Lista de Skills com nome, tamanho e última modificação
- Botão "Ver conteúdo" → modal com texto do arquivo .md
- Aviso: "Para editar as Skills, atualize os arquivos no repositório e faça um novo deploy."

**Dados carregados:** `GET /api/admin/skills`
