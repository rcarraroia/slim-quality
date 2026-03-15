# DESIGN SYSTEM — BIA v2

## Contexto

O BIA v2 **herda integralmente** o Design System existente do Slim Quality (shadcn/ui + Tailwind CSS). Este documento especifica apenas os **tokens e componentes novos** específicos do módulo "Meu Agente", garantindo consistência visual com o restante do dashboard.

Referência base: `DESIGN_SYSTEM_RENUM.md` do projeto existente.

---

## Cores do Módulo "Meu Agente"

O módulo usa a paleta existente do sistema. A cor de destaque para elementos do agente é **teal** — já presente visualmente no dashboard atual (botões e badges nas telas existentes).

```css
/* Tokens específicos do módulo Agente — adicionar ao globals.css */

/* Status do agente */
--agent-active: #0d9488;      /* teal-600 — agente ativo */
--agent-inactive: #6b7280;    /* gray-500 — sem WhatsApp */
--agent-connecting: #d97706;  /* amber-600 — conectando */
--agent-suspended: #dc2626;   /* red-600 — suspenso */

/* Balões de conversa */
--bubble-customer-bg: #f3f4f6;    /* gray-100 */
--bubble-customer-text: #111827;  /* gray-900 */
--bubble-agent-bg: #0d9488;       /* teal-600 */
--bubble-agent-text: #ffffff;     /* white */
```

---

## Paleta Existente (referência rápida)

| Token | Valor | Uso |
|-------|-------|-----|
| `--primary-600` | `#2563eb` | Botões primários, links |
| `--success-500` | `#22c55e` | Sucesso, ativo |
| `--warning-500` | `#f97316` | Alerta, pendente |
| `--error-600` | `#dc2626` | Erro, suspenso |
| `--gray-900` | `#111827` | Textos principais |
| `--gray-600` | `#4b5563` | Textos secundários |
| `--gray-100` | `#f3f4f6` | Backgrounds de cards |

---

## Tipografia (Existente — sem mudanças)

Fonte: `Inter` (sistema)

Hierarquia usada nas telas do agente:
- Títulos de seção: `text-xl font-semibold text-gray-900`
- Labels de card: `text-sm font-medium text-gray-500 uppercase tracking-wide`
- Valores de métricas: `text-3xl font-bold text-gray-900`
- Texto de preview/chat: `text-sm text-gray-700 leading-relaxed`
- Timestamps: `text-xs text-gray-400`

---

## Componentes Novos

### AgentStatusCard

Card principal que exibe o status do agente na tela de Overview.

**Estrutura:**
```
┌─────────────────────────────────────────────┐
│  [ícone status]  Status: Agente Ativo        │
│  WhatsApp: +55 11 99999-9999                 │
│  Conectado desde: 14/03/2026                 │
│                          [botão ação]        │
└─────────────────────────────────────────────┘
```

**Variantes por status:**

| Status | Borda | Ícone | Cor do texto | Botão |
|--------|-------|-------|-------------|-------|
| `active` | `border-teal-500` | `CheckCircle` verde | `text-teal-700` | "Ver Conversas" |
| `inactive` | `border-gray-300` | `WifiOff` cinza | `text-gray-600` | "Conectar WhatsApp" (primário) |
| `connecting` | `border-amber-400` | `Loader` spin | `text-amber-700` | "Aguardando..." disabled |
| `suspended` | `border-red-500` | `XCircle` vermelho | `text-red-700` | "Regularizar Pagamento" |

---

### QRCodeDisplay

Componente de exibição do QR Code com instruções.

**Estrutura:**
```
┌─────────────────────────────┐
│  Passo 1: Abra o WhatsApp   │
│  Passo 2: Aparelhos...      │
│  Passo 3: Aponte a câmera   │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   [QR CODE IMAGE]   │    │
│  │                     │    │
│  └─────────────────────┘    │
│  ⏱ Expira em: 45s           │
│  [Gerar novo QR Code]       │
└─────────────────────────────┘
```

**Estados visuais:**
- QR Code: imagem `img` com `src={qrCode}`, borda cinza, padding 16px, bg branco
- Loading: skeleton quadrado + spinner centralizado
- Conectado: ícone `CheckCircle` teal grande + "WhatsApp conectado!"

---

### NapkinEditor

Editor de texto para o Napkin com indicadores de estado.

**Estrutura:**
```
┌────────────────────────────────────────────┐
│  📝 Memória do Agente                       │
│  Última atualização: pelo agente, há 2h    │
├────────────────────────────────────────────┤
│                                            │
│  [textarea - 400px min height]             │
│  Markdown aceito...                        │
│                                            │
├────────────────────────────────────────────┤
│  1.234 / 10.000 caracteres                 │
│                     [Resetar]  [Salvar]    │
└────────────────────────────────────────────┘
```

**Indicadores:**
- Sem alterações: botão "Salvar" com `opacity-50 cursor-not-allowed`
- Com alterações: botão "Salvar" primário + badge amarelo "• Não salvo" no título
- Salvando: botão com spinner inline

---

### ConversationList + ConversationDetail

Layout de master-detail para o histórico de conversas.

**ConversationList — item:**
```
┌─────────────────────────────────────────┐
│ [Avatar]  João Silva          Ativo  →  │
│           "Qual o prazo de entrega?"    │
│           há 2 horas                    │
└─────────────────────────────────────────┘
```

- Avatar: círculo 40px com iniciais, `bg-teal-100 text-teal-700`
- Badge status: `active` = verde, `closed` = cinza
- Item selecionado: `bg-teal-50 border-l-4 border-teal-500`

**ConversationDetail — balões:**

```
← [Msg do cliente — cinza, alinhado à esquerda]
                [Msg do agente — teal, alinhado à direita] →

← [🎵 Áudio 0:40] "Transcrição: quero saber..."
                  [🎵 Resposta em áudio] →
```

Estilo dos balões:
- Cliente: `bg-gray-100 text-gray-900 rounded-lg rounded-tl-none px-4 py-2 max-w-[75%]`
- Agente: `bg-teal-600 text-white rounded-lg rounded-tr-none px-4 py-2 max-w-[75%]`

---

### MetricCard (agente)

Variação do card de métricas existente, adaptado para métricas do agente.

```
┌──────────────────────────┐
│  💬  Total de Conversas  │
│                          │
│       45                 │
│  últimos 7 dias          │
└──────────────────────────┘
```

Ícones por métrica:
- Conversas: `MessageSquare` (teal)
- Mensagens: `Mail` (blue)
- Áudios: `Mic` (purple)
- Tempo de resposta: `Zap` (amber)

---

## Padrões de Interação

**Toasts (notificações temporárias):**
- Sucesso: verde, 3 segundos, canto inferior direito
- Erro: vermelho, 5 segundos, com botão fechar
- Usar componente `toast()` do shadcn/ui (já instalado)

**Modais de confirmação:**
- Para ações destrutivas (suspender tenant, resetar Napkin)
- Título descritivo + mensagem de consequência + botões "Cancelar" / "Confirmar"
- Usar `AlertDialog` do shadcn/ui

**Loading states:**
- Sempre usar `Skeleton` do shadcn/ui durante carregamento
- Nunca deixar tela em branco — sempre mostrar estado de loading

**Estados vazios:**
- Ícone ilustrativo + título + descrição + CTA quando relevante
- Padrão existente no dashboard (ver tela de Agendamentos)

---

## Acessibilidade

Seguir padrões existentes do sistema:
- Contraste mínimo WCAG AA (4.5:1 para texto normal)
- Todos os inputs com labels associados
- Botões com `aria-label` quando apenas ícone
- Focus ring visível: `focus:ring-2 focus:ring-teal-500`

---

## Ícones

Biblioteca: `lucide-react` (já instalada no projeto)

Ícones específicos do módulo:
- Status ativo: `CheckCircle2`
- Status inativo: `WifiOff`
- Status conectando: `Loader2` (com spin)
- Status suspenso: `XCircle`
- WhatsApp: usar SVG customizado ou `MessageCircle`
- Napkin/memória: `Brain`
- Configurações: `Settings2`
- QR Code: `QrCode`
- Áudio: `Mic` (recebido) / `Volume2` (enviado)
- Agente: `Bot`
