# Configuração do MCP Server Chatwoot

## ⚠️ ATENÇÃO - DOCUMENTO EM PORTUGUÊS-BR

---

## 📋 Informações

**Data de Criação:** 16/01/2026  
**MCP Server:** Chatwoot MCP Server  
**Repositório:** https://github.com/StackLab-Digital/chatwoot_mcp  
**Versão:** Latest  

---

## 🎯 Visão Geral

O **Chatwoot MCP Server** é um servidor Model Context Protocol que fornece ferramentas para interagir com a API do Chatwoot de forma simplificada. Ele abstrai a complexidade da API REST e fornece ferramentas prontas para uso via Kiro Powers.

### Ferramentas Disponíveis

1. **chatwoot_setup** - Configura a conexão inicial com Chatwoot
2. **chatwoot_list_inboxes** - Lista todas as caixas de entrada
3. **chatwoot_list_conversations** - Lista conversas (com filtros opcionais)
4. **chatwoot_send_message** - Envia mensagem em uma conversa
5. **chatwoot_update_conversation** - Atualiza status/assignee de uma conversa

---

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn instalado
- Chatwoot instalado e rodando
- API Access Token do Chatwoot

### Passo 1: Clonar Repositório

```bash
# Navegar para pasta de MCP servers (criar se não existir)
mkdir -p ~/mcp-servers
cd ~/mcp-servers

# Clonar repositório
git clone https://github.com/StackLab-Digital/chatwoot_mcp.git
cd chatwoot_mcp
```

### Passo 2: Instalar Dependências

```bash
# Instalar dependências
npm install

# Ou usando yarn
yarn install
```

### Passo 3: Build

```bash
# Compilar TypeScript para JavaScript
npm run build

# Ou usando yarn
yarn build
```

### Passo 4: Testar Localmente

```bash
# Testar se o servidor inicia corretamente
node dist/index.js

# Deve exibir algo como:
# MCP Server Chatwoot iniciado
# Aguardando conexões...
```

---

## ⚙️ Configuração no Kiro

### Passo 1: Obter API Access Token do Chatwoot

1. Acessar Chatwoot: `https://chatwoot.slimquality.com.br`
2. Login como admin
3. Ir em **Settings → Profile Settings**
4. Rolar até **Access Token**
5. Copiar o token (formato: `abc123...`)

### Passo 2: Obter Account ID do Chatwoot

1. Ainda em Settings
2. Ir em **Account Settings**
3. Na URL, o número após `/accounts/` é o Account ID
4. Exemplo: `https://chatwoot.slimquality.com.br/app/accounts/1` → Account ID = `1`

### Passo 3: Criar Arquivo de Configuração MCP

Criar ou editar arquivo `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "chatwoot": {
      "command": "node",
      "args": [
        "C:/Users/SEU_USUARIO/mcp-servers/chatwoot_mcp/dist/index.js"
      ],
      "env": {
        "CHATWOOT_URL": "https://chatwoot.slimquality.com.br",
        "CHATWOOT_API_KEY": "SUA_API_KEY_AQUI",
        "CHATWOOT_ACCOUNT_ID": "1"
      },
      "disabled": false,
      "autoApprove": [
        "chatwoot_list_conversations",
        "chatwoot_send_message"
      ]
    }
  }
}
```

**⚠️ IMPORTANTE:**
- Substituir `C:/Users/SEU_USUARIO/` pelo caminho real
- Substituir `SUA_API_KEY_AQUI` pelo token copiado
- Substituir `1` pelo Account ID correto
- No Windows, usar barras `/` ou barras duplas `\\`

### Passo 4: Configurar Variáveis de Ambiente (Alternativa)

Se preferir não colocar credenciais no arquivo JSON, criar arquivo `.env`:

```bash
# .env na raiz do projeto
CHATWOOT_URL=https://chatwoot.slimquality.com.br
CHATWOOT_API_KEY=sua_api_key_aqui
CHATWOOT_ACCOUNT_ID=1
```

E no `mcp.json`:

```json
{
  "mcpServers": {
    "chatwoot": {
      "command": "node",
      "args": [
        "C:/Users/SEU_USUARIO/mcp-servers/chatwoot_mcp/dist/index.js"
      ],
      "env": {
        "CHATWOOT_URL": "${CHATWOOT_URL}",
        "CHATWOOT_API_KEY": "${CHATWOOT_API_KEY}",
        "CHATWOOT_ACCOUNT_ID": "${CHATWOOT_ACCOUNT_ID}"
      },
      "disabled": false,
      "autoApprove": [
        "chatwoot_list_conversations",
        "chatwoot_send_message"
      ]
    }
  }
}
```

---

## 🧪 Testando a Configuração

### Teste 1: Verificar se MCP Server está Ativo

1. Abrir Kiro
2. Abrir painel de MCP Servers (View → MCP Servers)
3. Verificar se "chatwoot" aparece na lista
4. Status deve ser "Connected" (verde)

### Teste 2: Testar Ferramenta chatwoot_setup

```typescript
// No console do Kiro ou em um arquivo de teste
import { kiroPowers } from '@/lib/kiro-powers';

const result = await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_setup',
  arguments: {}
});

console.log('Setup result:', result);
// Deve retornar: { success: true, message: 'Chatwoot configurado com sucesso' }
```

### Teste 3: Testar Listagem de Inboxes

```typescript
const inboxes = await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_list_inboxes',
  arguments: {}
});

console.log('Inboxes:', inboxes);
// Deve retornar lista de inboxes configurados
```

### Teste 4: Testar Listagem de Conversas

```typescript
const conversations = await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_list_conversations',
  arguments: {
    status: 'bot'
  }
});

console.log('Conversas:', conversations);
// Deve retornar lista de conversas com status 'bot'
```

---

## 🔧 Uso das Ferramentas

### 1. chatwoot_setup

**Descrição:** Configura a conexão inicial com Chatwoot.

**Argumentos:** Nenhum

**Retorno:**
```json
{
  "success": true,
  "message": "Chatwoot configurado com sucesso"
}
```

**Exemplo:**
```typescript
await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_setup',
  arguments: {}
});
```

---

### 2. chatwoot_list_inboxes

**Descrição:** Lista todas as caixas de entrada configuradas.

**Argumentos:** Nenhum

**Retorno:**
```json
{
  "inboxes": [
    {
      "id": 1,
      "name": "WhatsApp Slim Quality",
      "channel_type": "api",
      "webhook_url": "https://api.slimquality.com.br/chatwoot/webhook"
    },
    {
      "id": 2,
      "name": "Site Slim Quality",
      "channel_type": "api",
      "webhook_url": "https://api.slimquality.com.br/chatwoot/webhook"
    }
  ]
}
```

**Exemplo:**
```typescript
const result = await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_list_inboxes',
  arguments: {}
});

console.log('Inboxes:', result.inboxes);
```

---

### 3. chatwoot_list_conversations

**Descrição:** Lista conversas com filtros opcionais.

**Argumentos:**
- `status` (opcional): 'bot', 'open', 'pending', 'resolved', 'all'
- `assignee_id` (opcional): ID do atendente
- `inbox_id` (opcional): ID da inbox

**Retorno:**
```json
{
  "conversations": [
    {
      "id": 123,
      "status": "bot",
      "inbox_id": 1,
      "contact": {
        "id": 456,
        "name": "João Silva",
        "phone": "+5511999999999"
      },
      "messages": [
        {
          "id": 789,
          "content": "Olá, preciso de ajuda",
          "created_at": "2026-01-16T10:00:00Z"
        }
      ]
    }
  ]
}
```

**Exemplo:**
```typescript
// Listar todas as conversas com status 'bot'
const result = await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_list_conversations',
  arguments: {
    status: 'bot'
  }
});

// Listar conversas atribuídas a um atendente específico
const result2 = await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_list_conversations',
  arguments: {
    status: 'open',
    assignee_id: 5
  }
});
```

---

### 4. chatwoot_send_message

**Descrição:** Envia mensagem em uma conversa.

**Argumentos:**
- `conversation_id` (obrigatório): ID da conversa
- `content` (obrigatório): Conteúdo da mensagem
- `private` (opcional): true/false (padrão: false)
- `message_type` (opcional): 'outgoing', 'incoming' (padrão: 'outgoing')

**Retorno:**
```json
{
  "success": true,
  "message": {
    "id": 890,
    "content": "Olá! Como posso ajudar?",
    "created_at": "2026-01-16T10:05:00Z"
  }
}
```

**Exemplo:**
```typescript
// Enviar mensagem pública
await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_send_message',
  arguments: {
    conversation_id: 123,
    content: 'Olá! Como posso ajudar?',
    private: false
  }
});

// Enviar nota privada (apenas para atendentes)
await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_send_message',
  arguments: {
    conversation_id: 123,
    content: 'Nota interna: Cliente parece insatisfeito',
    private: true
  }
});
```

---

### 5. chatwoot_update_conversation

**Descrição:** Atualiza status e/ou assignee de uma conversa.

**Argumentos:**
- `conversation_id` (obrigatório): ID da conversa
- `status` (opcional): 'bot', 'open', 'pending', 'resolved', 'snoozed'
- `assignee_id` (opcional): ID do atendente (null para remover)

**Retorno:**
```json
{
  "success": true,
  "conversation": {
    "id": 123,
    "status": "open",
    "assignee_id": 5
  }
}
```

**Exemplo:**
```typescript
// Assumir atendimento (handoff IA → Humano)
await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_update_conversation',
  arguments: {
    conversation_id: 123,
    status: 'open',
    assignee_id: 5
  }
});

// Devolver para IA (handoff Humano → IA)
await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_update_conversation',
  arguments: {
    conversation_id: 123,
    status: 'bot',
    assignee_id: null
  }
});
```

---

## 🐛 Troubleshooting

### Problema: MCP Server não aparece na lista

**Solução:**
1. Verificar se o caminho no `mcp.json` está correto
2. Verificar se o build foi feito: `npm run build`
3. Reiniciar Kiro
4. Verificar logs do MCP Server

### Problema: Erro "Authentication failed"

**Solução:**
1. Verificar se `CHATWOOT_API_KEY` está correto
2. Verificar se o token não expirou
3. Gerar novo token no Chatwoot
4. Atualizar `mcp.json` com novo token

### Problema: Erro "Account not found"

**Solução:**
1. Verificar se `CHATWOOT_ACCOUNT_ID` está correto
2. Verificar na URL do Chatwoot qual é o Account ID
3. Atualizar `mcp.json` com ID correto

### Problema: Timeout ao chamar ferramentas

**Solução:**
1. Verificar se Chatwoot está acessível
2. Verificar se `CHATWOOT_URL` está correto
3. Verificar firewall/proxy
4. Aumentar timeout no MCP Server (se necessário)

### Problema: Ferramentas não aparecem no Kiro

**Solução:**
1. Verificar se MCP Server está "Connected"
2. Reiniciar MCP Server
3. Verificar logs de erro
4. Recarregar Kiro

---

## 📝 Logs e Debug

### Habilitar Logs Detalhados

Adicionar ao `mcp.json`:

```json
{
  "mcpServers": {
    "chatwoot": {
      "command": "node",
      "args": ["..."],
      "env": {
        "CHATWOOT_URL": "...",
        "CHATWOOT_API_KEY": "...",
        "CHATWOOT_ACCOUNT_ID": "...",
        "DEBUG": "true",
        "LOG_LEVEL": "debug"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Visualizar Logs

**Windows:**
```powershell
# Logs do MCP Server
Get-Content -Path "$env:USERPROFILE\.kiro\logs\mcp-chatwoot.log" -Tail 50 -Wait
```

**Linux/Mac:**
```bash
# Logs do MCP Server
tail -f ~/.kiro/logs/mcp-chatwoot.log
```

---

## 🔒 Segurança

### Boas Práticas

1. ✅ **Nunca commitar** `mcp.json` com credenciais
2. ✅ **Usar variáveis de ambiente** para credenciais sensíveis
3. ✅ **Rotacionar tokens** periodicamente
4. ✅ **Limitar permissões** do token (se possível)
5. ✅ **Usar HTTPS** sempre para Chatwoot

### Arquivo .gitignore

Adicionar ao `.gitignore`:

```
# MCP Configuration (contém credenciais)
.kiro/settings/mcp.json

# Environment variables
.env
.env.local
```

---

## 📚 Referências

- **Chatwoot API Docs:** https://developers.chatwoot.com/api-reference/introduction
- **MCP Protocol:** https://modelcontextprotocol.io/
- **Repositório MCP Server:** https://github.com/StackLab-Digital/chatwoot_mcp

---

**Documento criado em:** 16/01/2026  
**Última atualização:** 16/01/2026  
**Status:** ✅ COMPLETO E PRONTO PARA USO
