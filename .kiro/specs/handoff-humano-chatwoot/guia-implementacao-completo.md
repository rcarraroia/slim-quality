# Guia Completo: Implementação de Sistema de Handoff com Chatwoot

## ⚠️ ATENÇÃO - DOCUMENTO EM PORTUGUÊS-BR

---

## 📋 Informações do Guia

**Data de Criação:** 16/01/2026  
**Versão:** 1.0  
**Objetivo:** Guia reutilizável para implementar sistema de handoff (IA ↔ Humano) em qualquer projeto  
**Tecnologias:** Chatwoot, MCP Server, Supabase, React/TypeScript, Python/FastAPI  

---

## 🎯 Visão Geral

Este guia fornece um passo a passo completo para implementar um sistema de handoff (transferência de atendimento) entre IA e humano em qualquer sistema de atendimento ao cliente.

### O que é Handoff?

**Handoff** é a transferência de atendimento entre diferentes agentes:
- **IA → Humano:** Cliente está sendo atendido por IA e é transferido para atendente humano
- **Humano → IA:** Cliente está sendo atendido por humano e é devolvido para IA

### Por que usar Chatwoot?

- ✅ Sistema de handoff nativo e robusto
- ✅ Suporte a múltiplos canais (WhatsApp, Site, Email, etc.)
- ✅ Interface profissional de atendimento
- ✅ Open-source e self-hosted (controle total)
- ✅ API REST completa
- ✅ Sistema de webhooks para integração
- ✅ Comunidade ativa

---

## 📚 Pré-requisitos

### Conhecimentos Necessários

- Docker e Docker Compose
- API REST (conceitos básicos)
- Webhooks (conceitos básicos)
- TypeScript/JavaScript (para frontend)
- Python (para backend - opcional)
- Git

### Ferramentas Necessárias

- Docker Desktop instalado
- Node.js 18+ instalado
- Editor de código (VS Code recomendado)
- Terminal/PowerShell
- Navegador web

### Infraestrutura Necessária

- Servidor para hospedar Chatwoot (pode ser local para testes)
- Domínio (opcional, mas recomendado para produção)
- SSL/TLS (Let's Encrypt recomendado)
- Banco de dados PostgreSQL (incluído no Docker Compose)
- Redis (incluído no Docker Compose)

---

## 🏗️ Arquitetura da Solução

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (WhatsApp/Site)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                      CHATWOOT                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Inbox (Caixa de Entrada)                            │   │
│  │  - Recebe mensagens de todos os canais               │   │
│  │  - Gerencia status (bot/open/pending/resolved)       │   │
│  │  - Envia webhooks para AgentBot                      │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ↓                         ↓
┌───────────────────┐     ┌──────────────────────────┐
│   AGENTE IA       │     │  DASHBOARD (Frontend)    │
│                   │     │                          │
│ - Recebe webhook  │     │ - Usa MCP Server         │
│ - Verifica status │     │ - Lista conversas        │
│ - Se bot: responde│     │ - Assume atendimento     │
│ - Se open: ignora │     │ - Envia mensagens        │
│                   │     │ - Devolve para IA        │
└───────────────────┘     └──────────────────────────┘
                                   │
                                   ↓
                          ┌────────────────┐
                          │  BANCO DADOS   │
                          │  (Supabase)    │
                          └────────────────┘
```

### Fluxo de Dados

1. **Cliente envia mensagem** → Chatwoot recebe
2. **Chatwoot cria conversa** com status 'bot'
3. **Chatwoot envia webhook** → Agente IA
4. **Agente IA verifica status** → Se 'bot', responde
5. **Admin acessa dashboard** → Vê conversas
6. **Admin assume atendimento** → Status muda para 'open'
7. **Agente IA recebe webhook** → Verifica status → Ignora (não responde)
8. **Admin envia mensagens** → Cliente recebe
9. **Admin devolve para IA** → Status volta para 'bot'
10. **Agente IA volta a responder** automaticamente

---

## 📦 PARTE 1: Instalação do Chatwoot

### Passo 1.1: Criar Diretório do Projeto

```bash
# Criar diretório
mkdir chatwoot-setup
cd chatwoot-setup
```

### Passo 1.2: Criar docker-compose.yml

Criar arquivo `docker-compose.yml`:

```yaml
version: '3'

services:
  postgres:
    image: postgres:15
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=chatwoot
      - POSTGRES_USER=chatwoot
      - POSTGRES_PASSWORD=chatwoot_password_change_me
    networks:
      - chatwoot

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server
    volumes:
      - redis_data:/data
    networks:
      - chatwoot

  chatwoot:
    image: chatwoot/chatwoot:latest
    restart: always
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - RAILS_ENV=production
      - INSTALLATION_ENV=docker
      
      # Database
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DATABASE=chatwoot
      - POSTGRES_USERNAME=chatwoot
      - POSTGRES_PASSWORD=chatwoot_password_change_me
      
      # Redis
      - REDIS_URL=redis://redis:6379
      
      # Application
      - SECRET_KEY_BASE=replace_with_random_string_min_128_chars
      - FRONTEND_URL=http://localhost:3000
      
      # Email (opcional - configurar depois)
      # - SMTP_ADDRESS=smtp.gmail.com
      # - SMTP_PORT=587
      # - SMTP_USERNAME=your_email@gmail.com
      # - SMTP_PASSWORD=your_password
      
    networks:
      - chatwoot

volumes:
  postgres_data:
  redis_data:

networks:
  chatwoot:
    driver: bridge
```

**⚠️ IMPORTANTE:**
- Substituir `chatwoot_password_change_me` por senha forte
- Substituir `replace_with_random_string_min_128_chars` por string aleatória de 128+ caracteres

### Passo 1.3: Gerar SECRET_KEY_BASE

```bash
# Gerar string aleatória de 128 caracteres
openssl rand -hex 64

# Ou no PowerShell (Windows)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 128 | % {[char]$_})
```

Copiar o resultado e substituir no `docker-compose.yml`.

### Passo 1.4: Iniciar Chatwoot

```bash
# Iniciar containers
docker-compose up -d

# Verificar logs
docker-compose logs -f chatwoot

# Aguardar até ver: "Listening on http://0.0.0.0:3000"
```

### Passo 1.5: Acessar Chatwoot

1. Abrir navegador: `http://localhost:3000`
2. Criar conta admin (primeira vez)
3. Preencher dados da empresa
4. Pronto! Chatwoot está rodando

---

## 🔧 PARTE 2: Configuração do Chatwoot

### Passo 2.1: Criar Inbox (Caixa de Entrada)

1. Acessar Chatwoot
2. Ir em **Settings → Inboxes**
3. Clicar em **Add Inbox**
4. Selecionar **API**
5. Preencher:
   - **Name:** WhatsApp [Seu Projeto]
   - **Webhook URL:** `https://seu-dominio.com/chatwoot/webhook`
6. Clicar em **Create API Inbox**
7. **Anotar o Inbox ID** (aparece na URL)

Repetir para criar inbox do Site (se necessário).

### Passo 2.2: Criar AgentBot

1. Ir em **Settings → Bots**
2. Clicar em **Add Bot**
3. Preencher:
   - **Name:** BIA - Assistente IA (ou nome da sua IA)
   - **Description:** Assistente virtual inteligente
   - **Webhook URL:** `https://seu-dominio.com/chatwoot/webhook`
4. Fazer upload de avatar (opcional)
5. Clicar em **Create Bot**

### Passo 2.3: Conectar Bot ao Inbox

1. Ir em **Settings → Inboxes**
2. Clicar no inbox criado
3. Ir na aba **Configuration**
4. Em **Bot Configuration**, selecionar o bot criado
5. Clicar em **Save**

### Passo 2.4: Obter API Access Token

1. Ir em **Settings → Profile Settings**
2. Rolar até **Access Token**
3. Copiar o token (formato: `abc123...`)
4. **Guardar em local seguro** (será usado depois)

### Passo 2.5: Obter Account ID

1. Na URL do Chatwoot, identificar o Account ID
2. Exemplo: `http://localhost:3000/app/accounts/1` → Account ID = `1`
3. **Anotar o Account ID**

---

## 🔌 PARTE 3: Instalação do MCP Server

### Passo 3.1: Clonar Repositório

```bash
# Criar diretório para MCP servers
mkdir -p ~/mcp-servers
cd ~/mcp-servers

# Clonar repositório
git clone https://github.com/StackLab-Digital/chatwoot_mcp.git
cd chatwoot_mcp
```

### Passo 3.2: Instalar Dependências

```bash
# Instalar dependências
npm install

# Build
npm run build
```

### Passo 3.3: Testar Localmente

```bash
# Testar se funciona
node dist/index.js

# Deve exibir: "MCP Server Chatwoot iniciado"
# Ctrl+C para parar
```

### Passo 3.4: Configurar no Kiro

Criar/editar arquivo `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "chatwoot": {
      "command": "node",
      "args": [
        "/caminho/completo/para/mcp-servers/chatwoot_mcp/dist/index.js"
      ],
      "env": {
        "CHATWOOT_URL": "http://localhost:3000",
        "CHATWOOT_API_KEY": "SEU_TOKEN_AQUI",
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

**⚠️ Substituir:**
- `/caminho/completo/para/` pelo caminho real
- `SEU_TOKEN_AQUI` pelo token copiado
- `1` pelo Account ID correto

### Passo 3.5: Reiniciar Kiro

1. Fechar Kiro completamente
2. Abrir Kiro novamente
3. Verificar se MCP Server aparece conectado

---

## 💻 PARTE 4: Implementação Backend (Webhook)

### Passo 4.1: Estrutura do Endpoint

Criar endpoint que recebe webhooks do Chatwoot:

**Python/FastAPI:**
```python
# agent/src/api/main.py

from fastapi import FastAPI, Request
import httpx
import logging

app = FastAPI()
logger = logging.getLogger(__name__)

# Configurações
CHATWOOT_URL = "http://localhost:3000"
CHATWOOT_API_KEY = "seu_token_aqui"
CHATWOOT_ACCOUNT_ID = "1"

@app.post("/chatwoot/webhook")
async def chatwoot_webhook(request: Request):
    """
    Recebe webhooks do Chatwoot
    """
    try:
        payload = await request.json()
        
        event = payload.get('event')
        conversation = payload.get('conversation', {})
        message = payload.get('message', {})
        
        logger.info(f"Webhook recebido: {event} - Conversa {conversation.get('id')}")
        
        # REGRA CRÍTICA: Só responder se status == 'bot'
        if conversation.get('status') != 'bot':
            logger.info(f"Conversa em handoff humano - IA não responde")
            return {"status": "ignored", "reason": "human_handoff"}
        
        # Se status == 'bot', processar mensagem
        if event == 'message_created' and message.get('message_type') == 'incoming':
            # Gerar resposta da IA
            response = await generate_ai_response(message['content'])
            
            # Enviar via API Chatwoot
            await send_chatwoot_message(conversation['id'], response)
            
            return {"status": "processed"}
        
        return {"status": "ignored"}
        
    except Exception as e:
        logger.error(f"Erro no webhook: {str(e)}")
        return {"status": "error", "message": str(e)}
```

### Passo 4.2: Função de Envio de Mensagem

```python
async def send_chatwoot_message(conversation_id: int, content: str):
    """Envia mensagem via API Chatwoot"""
    
    url = f"{CHATWOOT_URL}/api/v1/accounts/{CHATWOOT_ACCOUNT_ID}/conversations/{conversation_id}/messages"
    
    headers = {
        "api_access_token": CHATWOOT_API_KEY,
        "Content-Type": "application/json"
    }
    
    data = {
        "content": content,
        "message_type": "outgoing",
        "private": False
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data)
        
        if response.status_code != 200:
            logger.error(f"Erro ao enviar mensagem: {response.text}")
            raise Exception("Falha ao enviar mensagem")
        
        logger.info(f"Mensagem enviada com sucesso: {conversation_id}")
        return response.json()
```

### Passo 4.3: Função de Geração de Resposta

```python
async def generate_ai_response(message_content: str) -> str:
    """
    Gera resposta da IA
    
    ADAPTAR PARA SEU SISTEMA:
    - Pode usar OpenAI, Anthropic, LangChain, etc.
    - Pode incluir contexto, histórico, etc.
    """
    
    # Exemplo simples (substituir por sua lógica)
    from openai import AsyncOpenAI
    
    client = AsyncOpenAI(api_key="sua_chave_openai")
    
    response = await client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Você é uma assistente virtual prestativa."},
            {"role": "user", "content": message_content}
        ]
    )
    
    return response.choices[0].message.content
```

---

## 🎨 PARTE 5: Implementação Frontend (Dashboard)

### Passo 5.1: Criar Service MCP

Criar arquivo `src/services/chatwoot-mcp.service.ts`:


```typescript
// src/services/chatwoot-mcp.service.ts

import { kiroPowers } from '@/lib/kiro-powers';

export class ChatwootMCPService {
  private powerName = 'chatwoot';
  private serverName = 'chatwoot-mcp';
  
  /**
   * Lista conversas do Chatwoot
   */
  async listConversations(status?: string) {
    const result = await kiroPowers.use({
      powerName: this.powerName,
      serverName: this.serverName,
      toolName: 'chatwoot_list_conversations',
      arguments: {
        status: status || 'all'
      }
    });
    
    return result.data;
  }
  
  /**
   * Assume atendimento (Handoff IA → Humano)
   */
  async takeOverConversation(conversationId: number, agentId: number) {
    // Atualizar status para 'open'
    await kiroPowers.use({
      powerName: this.powerName,
      serverName: this.serverName,
      toolName: 'chatwoot_update_conversation',
      arguments: {
        conversation_id: conversationId,
        status: 'open',
        assignee_id: agentId
      }
    });
    
    // Enviar mensagem de notificação
    await this.sendMessage(conversationId, {
      content: '🤝 Você foi transferido para um atendente humano. Aguarde um momento!',
      private: false
    });
  }
  
  /**
   * Devolve para IA (Handoff Humano → IA)
   */
  async returnToBot(conversationId: number) {
    // Atualizar status para 'bot'
    await kiroPowers.use({
      powerName: this.powerName,
      serverName: this.serverName,
      toolName: 'chatwoot_update_conversation',
      arguments: {
        conversation_id: conversationId,
        status: 'bot',
        assignee_id: null
      }
    });
    
    // Enviar mensagem de notificação
    await this.sendMessage(conversationId, {
      content: '🤖 Você foi transferido de volta para a assistente BIA. Como posso ajudar?',
      private: false
    });
  }
  
  /**
   * Envia mensagem
   */
  async sendMessage(conversationId: number, message: {
    content: string;
    private?: boolean;
  }) {
    await kiroPowers.use({
      powerName: this.powerName,
      serverName: this.serverName,
      toolName: 'chatwoot_send_message',
      arguments: {
        conversation_id: conversationId,
        content: message.content,
        private: message.private || false
      }
    });
  }
}

// Exportar instância singleton
export const chatwootMCP = new ChatwootMCPService();
```

### Passo 5.2: Atualizar Página de Conversas

Modificar `src/pages/dashboard/Conversas.tsx`:

```typescript
// Adicionar import
import { chatwootMCP } from '@/services/chatwoot-mcp.service';

// No componente, adicionar estado para conversas do Chatwoot
const [chatwootConversations, setChatwootConversations] = useState([]);

// Carregar conversas do Chatwoot
useEffect(() => {
  const loadChatwootConversations = async () => {
    try {
      const result = await chatwootMCP.listConversations('all');
      setChatwootConversations(result.conversations);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };
  
  loadChatwootConversations();
}, []);

// No render, adicionar badge de status
{conversa.status === 'bot' ? (
  <Badge variant="secondary">🤖 BIA (IA)</Badge>
) : (
  <Badge variant="default">👤 {conversa.assigned_user?.name || 'Atendente'}</Badge>
)}
```

### Passo 5.3: Atualizar Página de Detalhes

Modificar `src/pages/dashboard/ConversaDetalhes.tsx`:

```typescript
// Adicionar import
import { chatwootMCP } from '@/services/chatwoot-mcp.service';
import { useAuth } from '@/hooks/useAuth'; // Para pegar ID do admin

// No componente
const { user } = useAuth();
const [isHandoffing, setIsHandoffing] = useState(false);

// Handler para assumir atendimento
const handleTakeOver = async () => {
  if (!conversation || !user) return;
  
  setIsHandoffing(true);
  try {
    await chatwootMCP.takeOverConversation(
      conversation.chatwoot_conversation_id,
      user.id
    );
    
    // Atualizar estado local
    setConversation(prev => ({
      ...prev,
      status: 'open',
      assigned_to: user.id
    }));
    
    // Feedback visual
    toast.success('Atendimento assumido com sucesso!');
  } catch (error) {
    console.error('Erro ao assumir atendimento:', error);
    toast.error('Erro ao assumir atendimento');
  } finally {
    setIsHandoffing(false);
  }
};

// Handler para devolver para IA
const handleReturnToBot = async () => {
  if (!conversation) return;
  
  setIsHandoffing(true);
  try {
    await chatwootMCP.returnToBot(
      conversation.chatwoot_conversation_id
    );
    
    // Atualizar estado local
    setConversation(prev => ({
      ...prev,
      status: 'bot',
      assigned_to: null
    }));
    
    // Feedback visual
    toast.success('Conversa devolvida para BIA!');
  } catch (error) {
    console.error('Erro ao devolver para IA:', error);
    toast.error('Erro ao devolver para IA');
  } finally {
    setIsHandoffing(false);
  }
};

// No render, adicionar botões
<div className="flex gap-2 mb-4">
  {conversation.status === 'bot' ? (
    <Button 
      onClick={handleTakeOver}
      disabled={isHandoffing}
      variant="default"
    >
      {isHandoffing ? 'Assumindo...' : '🤖 Assumir Atendimento'}
    </Button>
  ) : (
    <>
      <Badge variant="default" className="px-4 py-2">
        👤 Você está atendendo
      </Badge>
      <Button 
        onClick={handleReturnToBot}
        disabled={isHandoffing}
        variant="outline"
      >
        {isHandoffing ? 'Devolvendo...' : 'Devolver para BIA'}
      </Button>
    </>
  )}
</div>
```

---

## 🧪 PARTE 6: Testes

### Teste 1: Fluxo Completo

1. **Cliente inicia conversa**
   - Enviar mensagem via WhatsApp ou Site
   - Verificar que conversa aparece no Chatwoot com status 'bot'

2. **IA responde automaticamente**
   - Verificar que webhook foi recebido
   - Verificar que IA gerou resposta
   - Verificar que cliente recebeu resposta

3. **Admin assume atendimento**
   - Acessar dashboard
   - Clicar em "Assumir Atendimento"
   - Verificar que status mudou para 'open'
   - Verificar que cliente recebeu notificação

4. **IA para de responder**
   - Cliente envia nova mensagem
   - Verificar que IA NÃO respondeu
   - Verificar logs: "Conversa em handoff humano"

5. **Admin envia mensagens**
   - Admin digita e envia mensagem
   - Verificar que cliente recebeu

6. **Admin devolve para IA**
   - Clicar em "Devolver para BIA"
   - Verificar que status voltou para 'bot'
   - Verificar que cliente recebeu notificação

7. **IA volta a responder**
   - Cliente envia nova mensagem
   - Verificar que IA respondeu automaticamente

### Teste 2: Múltiplos Canais

- Repetir Teste 1 com WhatsApp
- Repetir Teste 1 com Site Chat
- Verificar que funciona em ambos

### Teste 3: Múltiplos Atendentes

- Criar 2 contas de admin
- Ambos assumem conversas diferentes
- Verificar que não há conflitos

---

## 🐛 Troubleshooting

### Problema: IA não responde

**Possíveis causas:**
1. Webhook não está chegando
2. Status da conversa não é 'bot'
3. Erro na geração de resposta
4. Erro no envio via API

**Solução:**
```bash
# Verificar logs do backend
docker-compose logs -f chatwoot

# Verificar se webhook está configurado
# Ir em Settings → Bots → Verificar Webhook URL

# Testar webhook manualmente
curl -X POST http://localhost:8000/chatwoot/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"message_created","conversation":{"id":1,"status":"bot"},"message":{"content":"teste"}}'
```

### Problema: Admin não consegue assumir

**Possíveis causas:**
1. MCP Server não está conectado
2. Credenciais incorretas
3. Conversation ID inválido

**Solução:**
```typescript
// Verificar se MCP Server está ativo
// Abrir painel de MCP Servers no Kiro

// Testar ferramenta manualmente
const result = await kiroPowers.use({
  powerName: 'chatwoot',
  serverName: 'chatwoot-mcp',
  toolName: 'chatwoot_list_conversations',
  arguments: {}
});
console.log(result);
```

### Problema: Mensagens não chegam ao cliente

**Possíveis causas:**
1. Integração com canal (WhatsApp/Site) não configurada
2. Erro na API Chatwoot
3. Credenciais inválidas

**Solução:**
- Verificar configuração do inbox no Chatwoot
- Verificar logs do Chatwoot
- Testar envio manual via interface do Chatwoot

---

## 📊 Checklist de Implementação

### Setup Inicial
- [ ] Chatwoot instalado via Docker
- [ ] Domínio configurado (opcional)
- [ ] SSL configurado (opcional)
- [ ] Conta admin criada

### Configuração Chatwoot
- [ ] Inbox criado (WhatsApp/Site)
- [ ] AgentBot criado
- [ ] Bot conectado ao inbox
- [ ] API Access Token obtido
- [ ] Account ID anotado

### MCP Server
- [ ] Repositório clonado
- [ ] Dependências instaladas
- [ ] Build realizado
- [ ] Configurado no Kiro
- [ ] Testado e funcionando

### Backend
- [ ] Endpoint webhook criado
- [ ] Lógica de verificação de status implementada
- [ ] Função de geração de resposta implementada
- [ ] Função de envio via API implementada
- [ ] Logs implementados
- [ ] Testado com eventos reais

### Frontend
- [ ] Service MCP criado
- [ ] Página de conversas atualizada
- [ ] Página de detalhes atualizada
- [ ] Botões de handoff implementados
- [ ] Badges de status implementados
- [ ] Testado manualmente

### Testes
- [ ] Fluxo completo testado
- [ ] Múltiplos canais testados
- [ ] Múltiplos atendentes testados
- [ ] Notificações testadas
- [ ] Tratamento de erros testado

---

## 🎓 Boas Práticas

### Segurança

1. ✅ **Nunca expor credenciais** no código
2. ✅ **Usar variáveis de ambiente** para tokens
3. ✅ **Validar assinatura** dos webhooks
4. ✅ **Implementar rate limiting** no webhook
5. ✅ **Usar HTTPS** em produção

### Performance

1. ✅ **Implementar cache** para conversas frequentes
2. ✅ **Usar async/await** para operações I/O
3. ✅ **Implementar retry** com backoff exponencial
4. ✅ **Limitar tamanho** de payloads
5. ✅ **Monitorar latência** do webhook

### Manutenibilidade

1. ✅ **Documentar código** com comentários
2. ✅ **Usar TypeScript** para type safety
3. ✅ **Implementar logs detalhados**
4. ✅ **Criar testes automatizados**
5. ✅ **Versionar configurações**

---

## 📚 Recursos Adicionais

### Documentação Oficial

- **Chatwoot Docs:** https://www.chatwoot.com/docs
- **Chatwoot API:** https://developers.chatwoot.com/api-reference/introduction
- **Agent Bots:** https://www.chatwoot.com/docs/product/others/agent-bots
- **MCP Protocol:** https://modelcontextprotocol.io/

### Comunidade

- **Chatwoot Discord:** https://discord.gg/cJXdrwS
- **Chatwoot GitHub:** https://github.com/chatwoot/chatwoot
- **MCP Server GitHub:** https://github.com/StackLab-Digital/chatwoot_mcp

### Tutoriais

- **Chatwoot Installation:** https://www.chatwoot.com/docs/self-hosted/deployment/docker
- **Webhook Setup:** https://www.chatwoot.com/docs/product/others/webhooks
- **API Authentication:** https://developers.chatwoot.com/api-reference/introduction

---

## 🎯 Próximos Passos

Após implementar o sistema básico de handoff, considere adicionar:

1. **Sistema de Filas**
   - Distribuir conversas entre múltiplos atendentes
   - Priorização de conversas

2. **Métricas e Relatórios**
   - Tempo médio de atendimento
   - Taxa de handoff
   - Satisfação do cliente (CSAT)

3. **Automações Avançadas**
   - Handoff automático baseado em palavras-chave
   - Handoff automático após X tentativas da IA
   - Handoff automático para conversas complexas

4. **Integrações**
   - CRM (Salesforce, HubSpot)
   - Helpdesk (Zendesk, Freshdesk)
   - Analytics (Google Analytics, Mixpanel)

---

## ✅ Conclusão

Parabéns! Você implementou com sucesso um sistema completo de handoff entre IA e humano usando Chatwoot e MCP Server.

Este guia pode ser reutilizado em qualquer projeto que necessite de sistema de atendimento com handoff. Basta adaptar as partes específicas do seu sistema (geração de resposta da IA, banco de dados, etc.).

**Lembre-se:**
- Testar TUDO antes de colocar em produção
- Monitorar logs constantemente
- Coletar feedback dos atendentes
- Iterar e melhorar continuamente

---

**Guia criado em:** 16/01/2026  
**Versão:** 1.0  
**Status:** ✅ COMPLETO E PRONTO PARA USO

**Criado por:** Kiro AI  
**Para:** Equipe Slim Quality e comunidade
