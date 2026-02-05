# Requisitos: Sistema de Handoff Humano com Chatwoot

## ⚠️ ATENÇÃO - DOCUMENTO EM PORTUGUÊS-BR

---

## 📋 Informações do Projeto

**Data de Criação:** 16/01/2026  
**Feature:** Sistema de Handoff Humano (IA → Humano → IA)  
**Módulo:** `/dashboard/conversas`  
**Tecnologia:** Chatwoot + MCP Server  

---

## 🎯 Introdução

### Contexto

Atualmente, o módulo de conversas funciona apenas como um **espelho** do chat/WhatsApp. Quando o admin envia mensagens, ele está conversando **COM** o agente IA, não **SUBSTITUINDO** ele. Isso causa conflitos onde tanto o admin quanto a IA respondem ao mesmo tempo.

### Problema Identificado

- ❌ Admin não pode assumir o atendimento no lugar da IA
- ❌ IA continua respondendo mesmo quando admin está atendendo
- ❌ Não há controle de quem está atendendo (IA vs Humano)
- ❌ Cliente não é notificado sobre transferências
- ❌ Não há como devolver o atendimento para a IA

### Solução Proposta

Integrar o sistema com **Chatwoot**, uma plataforma open-source de atendimento ao cliente que possui sistema nativo de handoff entre bots e humanos, utilizando o **MCP Server Chatwoot** para simplificar a integração.

---

## 📚 Glossário

- **Handoff:** Transferência de atendimento entre IA e humano (ou vice-versa)
- **Chatwoot:** Plataforma open-source de atendimento ao cliente
- **MCP Server:** Model Context Protocol Server - servidor que fornece ferramentas para integração
- **AgentBot:** Bot configurado no Chatwoot que recebe webhooks e responde automaticamente
- **Inbox:** Caixa de entrada no Chatwoot (ex: WhatsApp, Site)
- **Conversation Status:** Status da conversa (bot, open, pending, resolved, snoozed)
- **BIA:** Nome da assistente IA do sistema Slim Quality

---

## 📋 Requisitos Funcionais

### Requisito 1: Integração com Chatwoot

**User Story:** Como desenvolvedor, quero integrar o sistema com Chatwoot, para que possamos gerenciar conversas de forma profissional com handoff nativo.

#### Acceptance Criteria

1. WHEN o sistema é configurado, THE Chatwoot SHALL estar instalado e rodando via Docker
2. WHEN um inbox é criado no Chatwoot, THE Sistema SHALL receber webhooks de eventos de conversas
3. WHEN uma conversa é criada, THE Chatwoot SHALL atribuir status inicial 'bot'
4. WHEN o AgentBot é configurado, THE Sistema SHALL receber eventos de message_created e conversation_status_changed
5. THE Sistema SHALL manter sincronização entre banco Supabase e Chatwoot

---

### Requisito 2: Configuração do MCP Server

**User Story:** Como desenvolvedor, quero configurar o MCP Server Chatwoot, para que possamos usar ferramentas prontas de integração via Kiro Powers.

#### Acceptance Criteria

1. WHEN o MCP Server é configurado, THE Sistema SHALL ter acesso às ferramentas chatwoot_setup, chatwoot_list_inboxes, chatwoot_list_conversations, chatwoot_send_message, chatwoot_update_conversation
2. WHEN uma ferramenta MCP é chamada, THE Sistema SHALL autenticar automaticamente usando API key configurada
3. WHEN ocorre erro na ferramenta MCP, THE Sistema SHALL retornar mensagem de erro clara
4. THE MCP Server SHALL estar configurado no arquivo .kiro/settings/mcp.json

---

### Requisito 3: Webhook do Agente IA

**User Story:** Como agente IA (BIA), quero receber webhooks do Chatwoot, para que eu possa responder apenas quando o status da conversa for 'bot'.

#### Acceptance Criteria

1. WHEN uma mensagem é criada no Chatwoot, THE Agente IA SHALL receber webhook com evento message_created
2. WHEN o status da conversa é 'bot', THE Agente IA SHALL processar a mensagem e gerar resposta
3. WHEN o status da conversa NÃO é 'bot', THE Agente IA SHALL ignorar a mensagem e NÃO responder
4. WHEN a IA gera uma resposta, THE Sistema SHALL enviar via API Chatwoot
5. WHEN ocorre erro no webhook, THE Sistema SHALL registrar log detalhado

---

### Requisito 4: Assumir Atendimento (Handoff IA → Humano)

**User Story:** Como admin, quero assumir o atendimento de uma conversa, para que eu possa atender o cliente manualmente e a IA pare de responder.

#### Acceptance Criteria

1. WHEN o admin visualiza uma conversa com status 'bot', THE Interface SHALL exibir botão "🤖 Assumir Atendimento"
2. WHEN o admin clica em "Assumir Atendimento", THE Sistema SHALL atualizar status da conversa para 'open' no Chatwoot
3. WHEN o status muda para 'open', THE Sistema SHALL atribuir a conversa ao admin (assignee_id)
4. WHEN o handoff é realizado, THE Sistema SHALL enviar mensagem automática ao cliente: "🤝 Você foi transferido para um atendente humano. Aguarde um momento!"
5. WHEN o status é 'open', THE Agente IA SHALL ignorar novas mensagens dessa conversa
6. WHEN o admin está atendendo, THE Interface SHALL exibir badge "👤 Você está atendendo"

---

### Requisito 5: Devolver para IA (Handoff Humano → IA)

**User Story:** Como admin, quero devolver o atendimento para a IA, para que ela volte a responder automaticamente quando eu terminar de atender.

#### Acceptance Criteria

1. WHEN o admin está atendendo (status 'open'), THE Interface SHALL exibir botão "Devolver para BIA"
2. WHEN o admin clica em "Devolver para BIA", THE Sistema SHALL atualizar status da conversa para 'bot' no Chatwoot
3. WHEN o status muda para 'bot', THE Sistema SHALL remover atribuição (assignee_id = null)
4. WHEN o handoff é realizado, THE Sistema SHALL enviar mensagem automática ao cliente: "🤖 Você foi transferido de volta para a assistente BIA. Como posso ajudar?"
5. WHEN o status volta para 'bot', THE Agente IA SHALL voltar a responder automaticamente

---

### Requisito 6: Indicação Visual de Status

**User Story:** Como admin, quero ver claramente quem está atendendo cada conversa, para que eu saiba se posso assumir ou se já está sendo atendida.

#### Acceptance Criteria

1. WHEN uma conversa tem status 'bot', THE Interface SHALL exibir badge "🤖 BIA (IA)"
2. WHEN uma conversa tem status 'open', THE Interface SHALL exibir badge "👤 [Nome do Atendente]"
3. WHEN o admin visualiza lista de conversas, THE Interface SHALL mostrar status de cada conversa
4. WHEN o status muda, THE Interface SHALL atualizar em tempo real via Realtime Supabase
5. THE Interface SHALL usar cores diferentes para status 'bot' (secundário) e 'open' (primário)

---

### Requisito 7: Envio de Mensagens pelo Admin

**User Story:** Como admin, quero enviar mensagens para o cliente, para que eu possa atender manualmente quando assumir o atendimento.

#### Acceptance Criteria

1. WHEN o admin digita uma mensagem, THE Sistema SHALL enviar via MCP Server (chatwoot_send_message)
2. WHEN a mensagem é enviada, THE Sistema SHALL salvar no banco Supabase com sender_type='human'
3. WHEN a mensagem é enviada, THE Sistema SHALL usar sender_id do admin logado
4. WHEN o canal é WhatsApp, THE Sistema SHALL enviar via Evolution API integrada ao Chatwoot
5. WHEN ocorre erro no envio, THE Interface SHALL exibir mensagem de erro clara

---

### Requisito 8: Sincronização de Dados

**User Story:** Como sistema, quero manter sincronização entre Supabase e Chatwoot, para que os dados estejam consistentes em ambas as plataformas.

#### Acceptance Criteria

1. WHEN uma conversa é criada no Chatwoot, THE Sistema SHALL criar registro correspondente no Supabase
2. WHEN o status muda no Chatwoot, THE Sistema SHALL atualizar no Supabase
3. WHEN uma mensagem é enviada, THE Sistema SHALL salvar em ambos (Chatwoot e Supabase)
4. THE Sistema SHALL armazenar chatwoot_conversation_id no banco Supabase
5. THE Sistema SHALL manter campos: handoff_status, assigned_to, handoff_at, handoff_reason

---

### Requisito 9: Notificações de Handoff

**User Story:** Como cliente, quero ser notificado quando for transferido entre IA e humano, para que eu saiba com quem estou conversando.

#### Acceptance Criteria

1. WHEN ocorre handoff IA → Humano, THE Sistema SHALL enviar mensagem: "🤝 Você foi transferido para um atendente humano. Aguarde um momento!"
2. WHEN ocorre handoff Humano → IA, THE Sistema SHALL enviar mensagem: "🤖 Você foi transferido de volta para a assistente BIA. Como posso ajudar?"
3. WHEN o canal é WhatsApp, THE Notificação SHALL ser enviada via WhatsApp
4. WHEN o canal é Site, THE Notificação SHALL ser enviada via chat do site
5. THE Mensagens de notificação SHALL ser enviadas automaticamente pelo sistema

---

### Requisito 10: Listagem de Conversas

**User Story:** Como admin, quero visualizar todas as conversas do Chatwoot no dashboard, para que eu possa gerenciar atendimentos de forma centralizada.

#### Acceptance Criteria

1. WHEN o admin acessa /dashboard/conversas, THE Sistema SHALL listar conversas do Chatwoot via MCP Server
2. WHEN há filtro de status, THE Sistema SHALL filtrar conversas por status (bot, open, pending, resolved)
3. WHEN há filtro de canal, THE Sistema SHALL filtrar conversas por canal (whatsapp, site)
4. WHEN uma conversa é atualizada no Chatwoot, THE Interface SHALL atualizar em tempo real
5. THE Sistema SHALL exibir: nome do cliente, último mensagem, status, canal, atendente (se houver)

---

## 🔒 Requisitos Não-Funcionais

### Performance

1. **Tempo de Resposta do Webhook:** < 500ms para processar evento e decidir se responde
2. **Tempo de Handoff:** < 2 segundos para atualizar status no Chatwoot
3. **Sincronização:** Dados devem sincronizar entre Supabase e Chatwoot em < 3 segundos

### Segurança

1. **Autenticação:** Todas as chamadas à API Chatwoot devem usar API key segura
2. **Webhook:** Validar assinatura dos webhooks recebidos do Chatwoot
3. **Permissões:** Apenas admins podem assumir atendimentos
4. **Logs:** Registrar todas as ações de handoff para auditoria

### Disponibilidade

1. **Uptime Chatwoot:** 99.5% (self-hosted)
2. **Fallback:** Se Chatwoot estiver offline, sistema deve continuar funcionando em modo degradado
3. **Retry:** Implementar retry automático para chamadas à API Chatwoot (máximo 3 tentativas)

### Escalabilidade

1. **Múltiplos Atendentes:** Sistema deve suportar múltiplos admins atendendo simultaneamente
2. **Múltiplos Canais:** Sistema deve suportar WhatsApp, Site, Email, Chat, Telefone
3. **Volume:** Sistema deve suportar até 1000 conversas simultâneas

---

## 🚫 Fora do Escopo

Os seguintes itens **NÃO** fazem parte desta implementação:

- ❌ Migração de conversas antigas para Chatwoot
- ❌ Integração com outros sistemas de atendimento (Zendesk, Intercom, etc.)
- ❌ Sistema de filas de atendimento
- ❌ Métricas e relatórios avançados
- ❌ Chatbot com IA dentro do Chatwoot (usaremos AgentBot externo)
- ❌ Integração com CRM externo

---

## 📊 Critérios de Aceitação Geral

Para considerar esta feature **COMPLETA**, todos os seguintes critérios devem ser atendidos:

1. ✅ Chatwoot instalado e configurado via Docker
2. ✅ MCP Server Chatwoot configurado e funcional
3. ✅ Webhook do Agente IA recebendo eventos e respondendo corretamente
4. ✅ Admin consegue assumir atendimento (handoff IA → Humano)
5. ✅ Admin consegue devolver para IA (handoff Humano → IA)
6. ✅ Cliente recebe notificações de handoff
7. ✅ Interface exibe status visual correto
8. ✅ Sincronização entre Supabase e Chatwoot funcionando
9. ✅ Testes manuais realizados em todos os fluxos
10. ✅ Documentação completa criada

---

## 🔗 Dependências

### Externas

- **Chatwoot:** Versão latest (Docker)
- **MCP Server Chatwoot:** `StackLab-Digital/chatwoot_mcp`
- **Evolution API:** Para envio de mensagens WhatsApp

### Internas

- **Supabase:** Banco de dados e Realtime
- **Agente IA (BIA):** Backend Python/FastAPI
- **Dashboard:** Frontend React/TypeScript

---

## 📅 Estimativa de Tempo

| Fase | Tempo Estimado |
|------|----------------|
| Setup Chatwoot + MCP | 2-3 horas |
| Integração Backend | 2-3 horas |
| Integração Frontend | 2-3 horas |
| Testes e Ajustes | 1-2 horas |
| **TOTAL** | **7-11 horas** |

---

## 📝 Notas Adicionais

### Vantagens da Solução com Chatwoot

1. ✅ Sistema de handoff nativo e robusto
2. ✅ Interface profissional de atendimento
3. ✅ Suporte a múltiplos canais
4. ✅ Self-hosted (controle total dos dados)
5. ✅ Open-source (sem custos de licença)
6. ✅ Comunidade ativa

### Alternativas Consideradas

- **Solução Custom:** 40-60 horas de desenvolvimento
- **Chatwoot sem MCP:** 10-15 horas de desenvolvimento
- **Chatwoot com MCP:** 7-11 horas de desenvolvimento ⭐ (escolhida)

---

**Documento criado em:** 16/01/2026  
**Última atualização:** 16/01/2026  
**Status:** ✅ APROVADO PARA IMPLEMENTAÇÃO
