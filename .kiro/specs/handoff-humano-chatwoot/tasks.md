# Tasks: Sistema de Handoff Humano com Chatwoot

## ⚠️ ATENÇÃO - DOCUMENTO EM PORTUGUÊS-BR

---

## 📋 Informações do Projeto

**Data de Criação:** 16/01/2026  
**Feature:** Sistema de Handoff Humano (IA → Humano → IA)  
**Estimativa Total:** 7-11 horas  

---

## 🚨 REGRAS OBRIGATÓRIAS

**ANTES DE INICIAR QUALQUER TAREFA, CONSULTAR:**

1. **Análise Preventiva Obrigatória**
   - Arquivo: `.kiro/steering/analise-preventiva-obrigatoria.md`
   - Regra: SEMPRE fazer análise de 5-10 minutos antes de implementar
   - Limite: Máximo 55 minutos por tarefa

2. **Compromisso de Honestidade**
   - Arquivo: `.kiro/steering/compromisso-honestidade.md`
   - Regra: Testar TUDO antes de reportar como concluído
   - Regra: Nunca reportar funcionalidade como pronta sem validação

3. **Funcionalidade Sobre Testes**
   - Arquivo: `.kiro/steering/funcionalidade-sobre-testes.md`
   - Regra: Funcionalidade completa > Testes passando
   - Regra: Nunca simplificar código apenas para passar em testes

4. **Verificação do Banco Real**
   - Arquivo: `.kiro/steering/verificacao-banco-real.md`
   - Regra: SEMPRE usar Power Supabase para verificar banco
   - Regra: Nunca emitir parecer baseado apenas em migrations

---

## 📊 Visão Geral das Fases

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| 1 | Setup Chatwoot + MCP Server | 2-3 horas |
| 2 | Integração Backend (Webhook) | 2-3 horas |
| 3 | Integração Frontend (Dashboard) | 2-3 horas |
| 4 | Testes e Validação | 1-2 horas |

---

## 📝 Lista de Tarefas

### FASE 1: Setup Chatwoot + MCP Server (2-3h)

- [ ] 1.1 Instalar e configurar Chatwoot via Docker
  - Criar arquivo `docker-compose.yml` na raiz do projeto
  - Configurar PostgreSQL e Redis
  - Configurar variáveis de ambiente
  - Iniciar containers: `docker-compose up -d`
  - Acessar Chatwoot em `http://localhost:3000`
  - Criar conta admin inicial
  - _Requisitos: 1.1, 1.2_
  - _Tempo estimado: 30-45 min_

- [ ] 1.2 Configurar domínio e SSL para Chatwoot
  - Configurar DNS: `chatwoot.slimquality.com.br`
  - Configurar proxy reverso (Nginx/Caddy)
  - Configurar SSL com Let's Encrypt
  - Testar acesso via HTTPS
  - _Requisitos: 1.1_
  - _Tempo estimado: 20-30 min_

- [ ] 1.3 Criar Inboxes no Chatwoot
  - Criar inbox "WhatsApp Slim Quality" (tipo: API)
  - Criar inbox "Site Slim Quality" (tipo: API)
  - Configurar webhook URL: `https://api.slimquality.com.br/chatwoot/webhook`
  - Anotar IDs dos inboxes criados
  - _Requisitos: 1.1, 1.4_
  - _Tempo estimado: 15-20 min_

- [ ] 1.4 Criar AgentBot no Chatwoot
  - Acessar Settings → Bots
  - Criar bot "BIA - Assistente IA"
  - Configurar webhook URL: `https://api.slimquality.com.br/chatwoot/webhook`
  - Conectar bot aos inboxes criados
  - Testar recebimento de webhook (usar RequestBin temporariamente)
  - _Requisitos: 1.4_
  - _Tempo estimado: 15-20 min_

- [ ] 1.5 Instalar MCP Server Chatwoot
  - Clonar repositório: `git clone https://github.com/StackLab-Digital/chatwoot_mcp`
  - Instalar dependências: `npm install`
  - Build: `npm run build`
  - Testar localmente: `node dist/index.js`
  - _Requisitos: 2.1_
  - _Tempo estimado: 15-20 min_

- [ ] 1.6 Configurar MCP Server no Kiro
  - Criar/atualizar arquivo `.kiro/settings/mcp.json`
  - Adicionar configuração do servidor Chatwoot
  - Configurar variáveis de ambiente (CHATWOOT_URL, CHATWOOT_API_KEY)
  - Testar conexão: usar ferramenta `chatwoot_setup`
  - Validar que todas as ferramentas estão disponíveis
  - _Requisitos: 2.1, 2.2_
  - _Tempo estimado: 20-30 min_

- [ ] 1.7 Checkpoint - Validar Setup Completo
  - Chatwoot acessível via HTTPS ✅
  - Inboxes criados e configurados ✅
  - AgentBot criado e conectado ✅
  - MCP Server instalado e funcional ✅
  - Todas as ferramentas MCP testadas ✅
  - _Perguntar ao usuário se há dúvidas ou problemas_

---

### FASE 2: Integração Backend (Webhook) (2-3h)

- [ ] 2.1 Criar endpoint de webhook no Agente IA
  - Arquivo: `agent/src/api/main.py`
  - Criar rota POST `/chatwoot/webhook`
  - Implementar validação de assinatura do webhook
  - Implementar parsing do payload
  - Registrar logs de todos os eventos recebidos
  - _Requisitos: 3.1, 3.5_
  - _Tempo estimado: 20-30 min_

- [ ] 2.2 Implementar lógica de verificação de status
  - Extrair `conversation['status']` do payload
  - Implementar regra: se status != 'bot', ignorar mensagem
  - Implementar regra: se status == 'bot', processar mensagem
  - Registrar decisão em log
  - Retornar resposta apropriada ao Chatwoot
  - _Requisitos: 3.2, 3.3_
  - _Tempo estimado: 15-20 min_

- [ ] 2.3 Implementar geração de resposta da IA
  - Reutilizar função existente `generate_ai_response()`
  - Passar contexto da conversa (histórico, cliente, etc.)
  - Gerar resposta usando LLM
  - Validar que resposta foi gerada com sucesso
  - _Requisitos: 3.2_
  - _Tempo estimado: 15-20 min_

- [ ] 2.4 Implementar envio de resposta via API Chatwoot
  - Criar função `send_chatwoot_message(conversation_id, content)`
  - Usar httpx.AsyncClient para chamada HTTP
  - Endpoint: POST `/api/v1/accounts/{id}/conversations/{id}/messages`
  - Headers: `api_access_token`, `Content-Type: application/json`
  - Body: `{ content, message_type: 'outgoing', private: false }`
  - Implementar retry (máximo 3 tentativas)
  - Registrar sucesso/erro em log
  - _Requisitos: 3.4_
  - _Tempo estimado: 25-35 min_

- [ ] 2.5 Implementar tratamento de erros
  - Try/catch em todas as operações assíncronas
  - Registrar erros detalhados em log
  - Retornar status 500 com mensagem de erro
  - Implementar fallback para erros de API
  - _Requisitos: 3.5_
  - _Tempo estimado: 15-20 min_

- [ ] 2.6 Testar webhook com eventos reais
  - Enviar mensagem de teste via Chatwoot
  - Verificar que webhook foi recebido
  - Verificar que IA gerou resposta
  - Verificar que resposta foi enviada ao cliente
  - Verificar logs de todas as etapas
  - _Requisitos: 3.1, 3.2, 3.3, 3.4_
  - _Tempo estimado: 20-30 min_

- [ ] 2.7 Checkpoint - Validar Integração Backend
  - Webhook recebe eventos do Chatwoot ✅
  - IA verifica status antes de responder ✅
  - IA responde quando status = 'bot' ✅
  - IA ignora quando status != 'bot' ✅
  - Respostas chegam ao cliente ✅
  - _Perguntar ao usuário se há dúvidas ou problemas_

---

### FASE 3: Integração Frontend (Dashboard) (2-3h)

- [ ] 3.1 Criar service MCP Chatwoot
  - Arquivo: `src/services/chatwoot-mcp.service.ts`
  - Criar classe `ChatwootMCPService`
  - Implementar método `listConversations(status?: string)`
  - Implementar método `takeOverConversation(conversationId, agentId)`
  - Implementar método `returnToBot(conversationId)`
  - Implementar método `sendMessage(conversationId, message)`
  - Usar `kiroPowers.use()` para chamar ferramentas MCP
  - Implementar tratamento de erros
  - _Requisitos: 4.1, 5.1, 7.1, 10.1_
  - _Tempo estimado: 30-40 min_

- [ ] 3.2 Atualizar hook useRealtimeConversations
  - Arquivo: `src/hooks/useRealtimeConversations.ts`
  - Adicionar campo `chatwoot_conversation_id` ao tipo Conversation
  - Adicionar campo `handoff_status` ao tipo Conversation
  - Manter sincronização com Supabase
  - _Requisitos: 8.1, 8.2_
  - _Tempo estimado: 15-20 min_

- [ ] 3.3 Atualizar página Conversas.tsx
  - Arquivo: `src/pages/dashboard/Conversas.tsx`
  - Adicionar badge de status (bot vs humano)
  - Usar cores diferentes para cada status
  - Exibir nome do atendente quando status = 'open'
  - Atualizar em tempo real via Realtime
  - _Requisitos: 6.1, 6.2, 6.3, 6.4_
  - _Tempo estimado: 20-30 min_

- [ ] 3.4 Atualizar página ConversaDetalhes.tsx - Botões de Handoff
  - Arquivo: `src/pages/dashboard/ConversaDetalhes.tsx`
  - Adicionar botão "🤖 Assumir Atendimento" (quando status = 'bot')
  - Adicionar badge "👤 Você está atendendo" (quando status = 'open')
  - Adicionar botão "Devolver para BIA" (quando status = 'open')
  - Implementar handler `handleTakeOver()`
  - Implementar handler `handleReturnToBot()`
  - Desabilitar botões durante operação
  - Exibir feedback visual (loading, sucesso, erro)
  - _Requisitos: 4.1, 4.2, 4.6, 5.1, 5.2, 6.5_
  - _Tempo estimado: 30-40 min_

- [ ] 3.5 Implementar lógica de assumir atendimento
  - Chamar `chatwootMCP.takeOverConversation()`
  - Atualizar estado local da conversa
  - Exibir mensagem de sucesso
  - Atualizar badge para "👤 Você está atendendo"
  - Tratar erros e exibir mensagem apropriada
  - _Requisitos: 4.2, 4.3, 4.4, 4.5_
  - _Tempo estimado: 20-25 min_

- [ ] 3.6 Implementar lógica de devolver para IA
  - Chamar `chatwootMCP.returnToBot()`
  - Atualizar estado local da conversa
  - Exibir mensagem de sucesso
  - Atualizar badge para "🤖 BIA (IA)"
  - Tratar erros e exibir mensagem apropriada
  - _Requisitos: 5.2, 5.3, 5.4, 5.5_
  - _Tempo estimado: 20-25 min_

- [ ] 3.7 Atualizar envio de mensagens pelo admin
  - Modificar função `sendMessage()` em ConversaDetalhes.tsx
  - Usar `chatwootMCP.sendMessage()` ao invés de Supabase direto
  - Salvar também no Supabase com sender_type='human'
  - Usar sender_id do admin logado
  - Manter integração com Evolution API para WhatsApp
  - _Requisitos: 7.1, 7.2, 7.3, 7.4_
  - _Tempo estimado: 25-30 min_

- [ ] 3.8 Checkpoint - Validar Integração Frontend
  - Dashboard lista conversas do Chatwoot ✅
  - Badge de status exibido corretamente ✅
  - Botão "Assumir Atendimento" funciona ✅
  - Botão "Devolver para BIA" funciona ✅
  - Mensagens enviadas pelo admin funcionam ✅
  - UI atualiza em tempo real ✅
  - _Perguntar ao usuário se há dúvidas ou problemas_

---

### FASE 4: Testes e Validação (1-2h)

- [ ] 4.1 Testar fluxo completo: IA → Humano → IA
  - Cliente inicia conversa via WhatsApp
  - IA responde automaticamente
  - Admin assume atendimento
  - IA para de responder
  - Admin envia mensagens
  - Cliente recebe mensagens do admin
  - Admin devolve para IA
  - IA volta a responder automaticamente
  - _Requisitos: TODOS_
  - _Tempo estimado: 20-30 min_

- [ ] 4.2 Testar múltiplos canais
  - Testar com WhatsApp
  - Testar com Site Chat
  - Verificar que handoff funciona em ambos
  - _Requisitos: 1.3, 10.2_
  - _Tempo estimado: 15-20 min_

- [ ] 4.3 Testar múltiplos atendentes simultâneos
  - Criar 2 contas de admin
  - Ambos assumem conversas diferentes
  - Verificar que não há conflitos
  - Verificar que cada um vê apenas suas conversas
  - _Requisitos: 10.1_
  - _Tempo estimado: 15-20 min_

- [ ] 4.4 Testar notificações de handoff
  - Verificar mensagem "🤝 Você foi transferido para um atendente humano..."
  - Verificar mensagem "🤖 Você foi transferido de volta para a assistente BIA..."
  - Verificar que mensagens chegam ao cliente
  - _Requisitos: 4.4, 5.4, 9.1, 9.2, 9.3, 9.4_
  - _Tempo estimado: 10-15 min_

- [ ] 4.5 Testar sincronização Supabase ↔ Chatwoot
  - Verificar que chatwoot_conversation_id é salvo
  - Verificar que handoff_status é atualizado
  - Verificar que assigned_to é atualizado
  - Verificar que handoff_at é registrado
  - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5_
  - _Tempo estimado: 15-20 min_

- [ ] 4.6 Testar tratamento de erros
  - Simular erro na API Chatwoot
  - Verificar que retry funciona
  - Verificar que mensagem de erro é exibida
  - Simular erro no MCP Server
  - Verificar que fallback funciona
  - _Requisitos: 2.3, 7.5_
  - _Tempo estimado: 15-20 min_

- [ ] 4.7 Validação final com usuário
  - Demonstrar fluxo completo ao usuário
  - Coletar feedback
  - Ajustar conforme necessário
  - Obter aprovação final
  - _Tempo estimado: 15-30 min_

---

## 📊 Checklist de Conclusão

Para considerar a feature **100% COMPLETA**, todos os itens abaixo devem estar ✅:

### Setup e Configuração
- [ ] Chatwoot instalado e acessível via HTTPS
- [ ] Inboxes criados (WhatsApp e Site)
- [ ] AgentBot criado e conectado
- [ ] MCP Server instalado e configurado
- [ ] Todas as ferramentas MCP testadas

### Backend
- [ ] Endpoint `/chatwoot/webhook` criado
- [ ] Lógica de verificação de status implementada
- [ ] IA responde quando status = 'bot'
- [ ] IA ignora quando status != 'bot'
- [ ] Envio de mensagens via API Chatwoot funciona
- [ ] Logs detalhados implementados

### Frontend
- [ ] Service MCP criado e funcional
- [ ] Lista de conversas exibe status correto
- [ ] Botão "Assumir Atendimento" funciona
- [ ] Botão "Devolver para BIA" funciona
- [ ] Badge de status exibido corretamente
- [ ] Envio de mensagens pelo admin funciona
- [ ] UI atualiza em tempo real

### Testes
- [ ] Fluxo completo testado (IA → Humano → IA)
- [ ] Múltiplos canais testados
- [ ] Múltiplos atendentes testados
- [ ] Notificações de handoff testadas
- [ ] Sincronização Supabase ↔ Chatwoot testada
- [ ] Tratamento de erros testado

### Documentação
- [ ] Guia de configuração do MCP criado
- [ ] Guia de implementação completo criado
- [ ] Documentação de uso para admins criada

---

## ⚠️ IMPORTANTE

**ANTES DE MARCAR QUALQUER TAREFA COMO CONCLUÍDA:**

1. ✅ Testar MANUALMENTE a funcionalidade
2. ✅ Verificar que não há erros no console
3. ✅ Verificar que logs estão sendo registrados
4. ✅ Verificar que dados estão sendo salvos corretamente
5. ✅ Demonstrar funcionamento ao usuário (se solicitado)

**NUNCA:**
- ❌ Marcar como concluído sem testar
- ❌ Assumir que funciona sem validar
- ❌ Reportar sucesso baseado apenas em código escrito

---

**Documento criado em:** 16/01/2026  
**Última atualização:** 16/01/2026  
**Status:** ✅ PRONTO PARA EXECUÇÃO
