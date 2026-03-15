# REQUIREMENTS — BIA v2
**Data:** 14/03/2026  
**Projeto:** Slim Quality - Sistema de Afiliados  
**Objetivo:** Especificar funcionalidades do BIA v2 (agente IA multi-tenant para afiliados)

---

## 1. VISÃO GERAL

### 1.1 Proposta de Valor

O BIA v2 é um agente de IA conversacional via WhatsApp que permite afiliados:
- Responder dúvidas de clientes automaticamente
- Qualificar leads e coletar informações
- Agendar atendimentos humanos
- Consultar informações do sistema (comissões, rede, vendas)
- Personalizar comportamento e conhecimento do agente

### 1.2 Público-Alvo

- **Afiliados Individuais Premium:** Plano com assinatura mensal
- **Afiliados Logistas:** Plano com assinatura mensal (obrigatória)

### 1.3 Escopo MVP

**Incluído:**
- Conexão WhatsApp via Evolution API
- Conversação com gpt-4o-mini (OpenAI)
- Áudio: transcrição (Whisper) e síntese (TTS)
- Napkin: memória persistente de aprendizados
- Skills: consulta de dados do sistema
- Sub-agents: especialização por contexto
- Painel de configuração no dashboard do afiliado

**Excluído do MVP:**
- Integração com Chatwoot
- Múltiplos números WhatsApp por tenant
- Agendamento automático via Google Calendar
- Análise de sentimento
- Relatórios de conversas

---

## 2. REQUISITOS FUNCIONAIS

### RF-001: Ativação do Agente

**Descrição:** Afiliado com plano elegível pode ativar seu agente IA.

**Critérios de Aceite:**
- Sistema verifica se afiliado tem `has_subscription=true`
- Sistema cria registro em `multi_agent_tenants` com `status='pending'`
- Sistema exibe QR Code para pareamento WhatsApp
- QR Code é armazenado em `qr_code_base64` (campo existente)
- QR Code expira após 2 minutos (Evolution API)
- Sistema permite regenerar QR Code se expirar

**Regras de Negócio:**
- Apenas afiliados com `affiliate_type='individual'` e `has_subscription=true` OU `affiliate_type='logista'` podem ativar
- Um afiliado pode ter apenas 1 tenant ativo
- Tenant inicia com `whatsapp_status='disconnected'`


### RF-002: Conexão WhatsApp

**Descrição:** Afiliado conecta seu número WhatsApp ao agente via QR Code.

**Critérios de Aceite:**
- Sistema provisiona instância na Evolution API (endpoint: `POST /instance/create`)
- Sistema gera QR Code via Evolution API (endpoint: `GET /instance/connect/{instance}`)
- Frontend exibe QR Code em tempo real
- Sistema recebe webhook de conexão bem-sucedida
- Sistema atualiza `whatsapp_status='connected'` e `status='active'`
- Sistema armazena `whatsapp_number` e `evolution_instance_id`

**Regras de Negócio:**
- Instância Evolution API usa nome único: `bia_{affiliate_id}`
- Webhook Evolution API valida token de segurança
- Se conexão falhar após 5 minutos, status volta para `pending`

**Mapeamento Webhook → Tenant:**
- Webhook recebe `instance_name` da Evolution API
- Backend faz lookup em `multi_agent_tenants` pelo campo `evolution_instance_id`
- O nome da instância segue o padrão `bia_{affiliate_id}`
- Não é necessário criar tabela adicional - os campos `evolution_instance_id` e `whatsapp_number` já existem em `multi_agent_tenants`

### RF-003: Recebimento de Mensagens

**Descrição:** Agente recebe mensagens de texto e áudio via WhatsApp.

**Critérios de Aceite:**
- Sistema recebe webhook da Evolution API com mensagem
- Sistema valida que mensagem é de contato externo (não do próprio afiliado)
- Sistema registra mensagem em `bia_messages` com `direction='incoming'`
- Sistema processa áudio: baixa bytes, transcreve com Whisper, descarta arquivo
- Sistema identifica ou cria conversa em `bia_conversations`
- Sistema enfileira mensagem para processamento pelo agente

**Regras de Negócio:**
- Áudio processado em memória (sem Supabase Storage)
- Transcrição Whisper usa modelo `whisper-1`
- Mensagens do próprio afiliado são ignoradas
- Timeout de processamento: 30 segundos


### RF-004: Processamento de Mensagens

**Descrição:** Agente processa mensagem e gera resposta contextualizada.

**Critérios de Aceite:**
- Sistema carrega configuração do tenant (`bia_agent_config`)
- Sistema carrega napkin (últimos 50 aprendizados)
- Sistema carrega histórico da conversa (últimas 10 mensagens)
- Sistema monta prompt com: personalidade + napkin + histórico + mensagem
- Sistema chama OpenAI gpt-4o-mini (temperatura 0.7, max_tokens 500)
- Sistema registra resposta em `bia_messages` com `direction='outgoing'`
- Sistema atualiza métricas em `bia_metrics`

**Regras de Negócio:**
- OpenAI API Key centralizada (variável de ambiente)
- Custo estimado: ~R$21,50/tenant/mês
- Timeout de resposta: 15 segundos
- Se erro, envia mensagem padrão: "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes."

### RF-005: Envio de Respostas

**Descrição:** Agente envia resposta via WhatsApp (texto ou áudio).

**Critérios de Aceite:**
- Sistema verifica tipo da mensagem recebida e configuração `tts_enabled`
- **Se mensagem recebida foi ÁUDIO E `tts_enabled=true`:** gera resposta em áudio
  - Gera mp3 com OpenAI TTS (voz `nova`, modelo `tts-1`)
  - Envia via Evolution API (endpoint: `POST /message/sendMedia`)
  - Descarta arquivo da memória
- **Se mensagem recebida foi TEXTO:** sempre responde em texto
  - Envia via Evolution API (endpoint: `POST /message/sendText`)
- Sistema marca mensagem como `sent_at` com timestamp
- Sistema trata erros de envio e registra em logs

**Regras de Negócio:**
- Áudio gerado em memória (sem Supabase Storage)
- TTS usa voz `nova` (português brasileiro)
- Resposta em áudio APENAS se mensagem recebida foi áudio E `tts_enabled=true`
- Mensagens de texto SEMPRE recebem resposta em texto
- Timeout de envio: 10 segundos
- Se erro, registra em `bia_metrics` como `failed_messages`


### RF-006: Napkin (Memória Persistente)

**Descrição:** Agente aprende com conversas e armazena aprendizados.

**Critérios de Aceite:**
- Sistema identifica aprendizados relevantes em conversas
- Sistema registra aprendizado em `bia_napkin` com `tenant_id` e `content`
- Sistema limita a 100 aprendizados por tenant (FIFO)
- Sistema carrega últimos 50 aprendizados no contexto do agente
- Afiliado pode visualizar napkin no dashboard
- Afiliado pode deletar aprendizados específicos

**Regras de Negócio:**
- Aprendizado é texto livre (max 500 caracteres)
- Aprendizados mais antigos são deletados automaticamente
- Napkin é específico por tenant (não compartilhado)

### RF-007: Skills (Consulta de Dados)

**Descrição:** Agente consulta dados do sistema via skills.

**Critérios de Aceite:**
- Sistema disponibiliza skills: `get_commissions`, `get_network`, `get_sales`
- Agente decide quando usar skill baseado na pergunta do usuário
- Sistema executa skill e retorna dados formatados
- Sistema inclui resultado no contexto da resposta

**Skills Disponíveis:**
- `get_commissions`: Retorna comissões do afiliado (últimas 10)
- `get_network`: Retorna rede do afiliado (N1 e N2)
- `get_sales`: Retorna vendas do afiliado (últimas 10)

**Regras de Negócio:**
- Skills acessam banco via Supabase (service role key)
- Timeout de skill: 5 segundos
- Se erro, agente informa que não conseguiu buscar dados


### RF-008: Sub-agents (Especialização)

**Descrição:** Agente delega tarefas complexas para sub-agents especializados.

**Critérios de Aceite:**
- Sistema disponibiliza sub-agents: `sales_specialist`, `support_specialist`
- Agente decide quando delegar baseado no contexto
- Sistema executa sub-agent e retorna resposta especializada
- Sistema inclui resultado no contexto da resposta

**Sub-agents Disponíveis:**
- `sales_specialist`: Especialista em vendas e conversão
- `support_specialist`: Especialista em suporte técnico

**Regras de Negócio:**
- Sub-agents usam mesma API OpenAI (gpt-4o-mini)
- Timeout de sub-agent: 10 segundos
- Se erro, agente continua sem delegação

### RF-009: Configuração do Agente

**Descrição:** Afiliado configura personalidade e comportamento do agente.

**Critérios de Aceite:**
- Sistema exibe formulário de configuração no dashboard
- Afiliado pode editar: `agent_name`, `agent_personality`, `tone`, `knowledge_enabled`, `tts_enabled`
- Sistema salva configuração em `bia_agent_config`
- Sistema aplica configuração imediatamente (sem restart)
- Sistema valida campos obrigatórios

**Campos Configuráveis:**
- `agent_name`: Nome do agente (padrão: "BIA")
- `agent_personality`: Descrição da personalidade (max 500 caracteres)
- `tone`: Tom de voz (padrão: "amigavel") - Valores: 'amigavel', 'formal', 'casual', 'tecnico'
- `knowledge_enabled`: Habilitar/desabilitar napkin (boolean, padrão: true)
- `tts_enabled`: Habilitar/desabilitar respostas em áudio (boolean, padrão: true)

**Regras de Negócio:**
- Configuração é específica por tenant
- Mudanças aplicam-se apenas a novas conversas
- Conversas em andamento mantêm configuração anterior
- Tom de voz influencia o estilo das respostas do agente


### RF-010: Dashboard do Agente

**Descrição:** Afiliado visualiza e gerencia seu agente no dashboard.

**Critérios de Aceite:**
- Sistema exibe menu "Meu Agente" no sidebar (condicional: `has_subscription=true`)
- Sistema exibe página `/afiliados/dashboard/meu-agente` com:
  - Status da conexão WhatsApp (conectado/desconectado)
  - QR Code para conexão (se desconectado)
  - Botão "Regenerar QR Code"
  - Formulário de configuração (nome, personalidade, knowledge)
  - Visualização do napkin (últimos 50 aprendizados)
  - Métricas básicas (mensagens recebidas, enviadas, conversas ativas)
- Sistema usa componentes shadcn/ui e variáveis CSS

**Regras de Negócio:**
- Menu só aparece para afiliados com `has_subscription=true`
- Página requer autenticação JWT Supabase
- Dados carregados via FastAPI (não Serverless Functions)

### RF-011: Desconexão do Agente

**Descrição:** Afiliado pode desconectar seu agente do WhatsApp.

**Critérios de Aceite:**
- Sistema exibe botão "Desconectar" na página do agente
- Sistema confirma ação com modal
- Sistema chama Evolution API para logout (endpoint: `DELETE /instance/logout/{instance}`)
- Sistema atualiza `whatsapp_status='disconnected'` e `status='inactive'`
- Sistema limpa `qr_code_base64`

**Regras de Negócio:**
- Desconexão não deleta histórico de conversas
- Desconexão não deleta napkin
- Afiliado pode reconectar a qualquer momento


### RF-012: Métricas e Monitoramento

**Descrição:** Sistema registra métricas de uso do agente.

**Critérios de Aceite:**
- Sistema registra em `bia_metrics`:
  - `total_messages_received`: Total de mensagens recebidas
  - `total_messages_sent`: Total de mensagens enviadas
  - `total_conversations`: Total de conversas únicas
  - `active_conversations`: Conversas ativas (última mensagem < 24h)
  - `failed_messages`: Mensagens que falharam ao enviar
  - `avg_response_time_ms`: Tempo médio de resposta
- Sistema atualiza métricas em tempo real
- Sistema exibe métricas no dashboard do afiliado

**Regras de Negócio:**
- Métricas são específicas por tenant
- Métricas são resetadas mensalmente
- Histórico de métricas mantido por 12 meses

---

## 3. REQUISITOS NÃO FUNCIONAIS

### RNF-001: Performance

- Tempo de resposta do agente: máximo 15 segundos
- Processamento de áudio: máximo 10 segundos
- Geração de TTS: máximo 5 segundos
- Timeout de webhook: 30 segundos
- Capacidade: 100 mensagens/minuto por tenant

### RNF-002: Segurança

- Autenticação JWT Supabase obrigatória no frontend
- Webhook Evolution API valida token de segurança
- OpenAI API Key centralizada (não exposta ao frontend)
- Dados de conversas isolados por tenant (RLS)
- Logs não contêm informações sensíveis

### RNF-003: Disponibilidade

- Uptime: 99% (excluindo manutenções programadas)
- Backup automático do banco de dados (Supabase)
- Redis persistente (AOF habilitado)
- Restart automático em caso de falha (Docker)


### RNF-004: Escalabilidade

- Arquitetura multi-tenant (1 instância FastAPI para todos os tenants)
- Redis para cache e rate limiting
- Processamento assíncrono de mensagens (fila)
- Limite de 1000 tenants ativos simultâneos

### RNF-005: Manutenibilidade

- Código Python 3.11 com type hints
- Logs estruturados (JSON)
- Variáveis de ambiente para configuração
- Zero hardcoded secrets
- Documentação inline (docstrings)

---

## 4. REGRAS DE NEGÓCIO

### RN-001: Elegibilidade

- Apenas afiliados com `has_subscription=true` podem ativar agente
- Afiliados `logista` sempre têm `has_subscription=true`
- Afiliados `individual` precisam comprar plano Premium

### RN-002: Custos

- Slim Quality banca custos OpenAI (~R$21,50/tenant/mês)
- Sem cobrança separada para afiliados
- Custo incluído no plano de assinatura

### RN-003: Limites

- 1 tenant por afiliado
- 1 número WhatsApp por tenant
- 100 aprendizados no napkin (FIFO)
- 10 mensagens de histórico no contexto
- 500 tokens máximo por resposta

### RN-004: Privacidade

- Conversas são privadas por tenant
- Napkin é privado por tenant
- Slim Quality não acessa conversas (exceto para suporte técnico)
- Dados não são compartilhados entre tenants


---

## 5. CASOS DE USO

### UC-001: Ativar Agente pela Primeira Vez

**Ator:** Afiliado Individual Premium ou Logista

**Pré-condições:**
- Afiliado autenticado no dashboard
- Afiliado tem `has_subscription=true`
- Afiliado não tem tenant ativo

**Fluxo Principal:**
1. Afiliado acessa menu "Meu Agente"
2. Sistema exibe página de ativação
3. Afiliado clica em "Ativar Agente"
4. Sistema cria tenant com `status='pending'`
5. Sistema provisiona instância na Evolution API
6. Sistema gera e exibe QR Code
7. Afiliado escaneia QR Code com WhatsApp
8. Sistema recebe webhook de conexão
9. Sistema atualiza `status='active'` e `whatsapp_status='connected'`
10. Sistema exibe mensagem de sucesso

**Fluxo Alternativo 1: QR Code Expira**
- 6a. QR Code expira após 2 minutos
- 6b. Sistema exibe botão "Regenerar QR Code"
- 6c. Afiliado clica em "Regenerar"
- 6d. Retorna ao passo 6

**Fluxo Alternativo 2: Conexão Falha**
- 8a. Webhook não é recebido após 5 minutos
- 8b. Sistema atualiza `status='pending'`
- 8c. Sistema exibe mensagem de erro
- 8d. Afiliado pode tentar novamente


### UC-002: Cliente Envia Mensagem de Texto

**Ator:** Cliente (contato externo via WhatsApp)

**Pré-condições:**
- Tenant ativo com `whatsapp_status='connected'`
- Cliente tem número do afiliado salvo

**Fluxo Principal:**
1. Cliente envia mensagem de texto via WhatsApp
2. Evolution API recebe mensagem e envia webhook
3. Sistema valida webhook (token de segurança)
4. Sistema identifica tenant pelo `evolution_instance_id`
5. Sistema registra mensagem em `bia_messages`
6. Sistema identifica ou cria conversa em `bia_conversations`
7. Sistema carrega configuração, napkin e histórico
8. Sistema monta prompt e chama OpenAI gpt-4o-mini
9. Sistema registra resposta em `bia_messages`
10. Sistema envia resposta via Evolution API
11. Sistema atualiza métricas

**Fluxo Alternativo 1: Erro na OpenAI**
- 8a. OpenAI retorna erro ou timeout
- 8b. Sistema envia mensagem padrão de erro
- 8c. Sistema registra falha em `bia_metrics`

**Fluxo Alternativo 2: Erro no Envio**
- 10a. Evolution API retorna erro
- 10b. Sistema registra falha em `bia_metrics`
- 10c. Sistema tenta reenviar após 5 segundos (máx 3 tentativas)

### UC-003: Cliente Envia Áudio

**Ator:** Cliente (contato externo via WhatsApp)

**Pré-condições:**
- Tenant ativo com `whatsapp_status='connected'`
- Cliente tem número do afiliado salvo

**Fluxo Principal:**
1. Cliente envia áudio via WhatsApp
2. Evolution API recebe áudio e envia webhook com URL
3. Sistema baixa bytes do áudio (em memória)
4. Sistema transcreve com Whisper (modelo `whisper-1`)
5. Sistema descarta bytes do áudio
6. Sistema processa transcrição como mensagem de texto (UC-002, passo 5 em diante)

**Fluxo Alternativo 1: Erro na Transcrição**
- 4a. Whisper retorna erro ou timeout
- 4b. Sistema envia mensagem: "Desculpe, não consegui entender o áudio. Pode enviar texto?"
- 4c. Sistema registra falha em `bia_metrics`


### UC-004: Afiliado Configura Personalidade

**Ator:** Afiliado

**Pré-condições:**
- Afiliado autenticado no dashboard
- Tenant ativo

**Fluxo Principal:**
1. Afiliado acessa "Meu Agente" > "Configurações"
2. Sistema exibe formulário com campos atuais
3. Afiliado edita `agent_name` e/ou `agent_personality`
4. Afiliado clica em "Salvar"
5. Sistema valida campos (obrigatórios, tamanho)
6. Sistema salva em `bia_agent_config`
7. Sistema exibe mensagem de sucesso
8. Sistema aplica configuração em novas conversas

**Fluxo Alternativo 1: Validação Falha**
- 5a. Campo obrigatório vazio ou excede limite
- 5b. Sistema exibe mensagem de erro
- 5c. Afiliado corrige e tenta novamente

### UC-005: Afiliado Visualiza Napkin

**Ator:** Afiliado

**Pré-condições:**
- Afiliado autenticado no dashboard
- Tenant ativo

**Fluxo Principal:**
1. Afiliado acessa "Meu Agente" > "Aprendizados"
2. Sistema carrega últimos 50 aprendizados de `bia_napkin`
3. Sistema exibe lista ordenada por data (mais recente primeiro)
4. Afiliado visualiza conteúdo dos aprendizados

**Fluxo Alternativo 1: Deletar Aprendizado**
- 4a. Afiliado clica em "Deletar" em um aprendizado
- 4b. Sistema confirma ação com modal
- 4c. Afiliado confirma
- 4d. Sistema deleta aprendizado de `bia_napkin`
- 4e. Sistema atualiza lista

---

## 6. VALIDAÇÕES

### Validação de Campos

**agent_name:**
- Obrigatório
- Mínimo 2 caracteres
- Máximo 50 caracteres
- Apenas letras, números e espaços

**agent_personality:**
- Opcional
- Máximo 500 caracteres
- Texto livre

**whatsapp_number:**
- Formato: +55XXXXXXXXXXX
- Validação via regex


---

## 7. MENSAGENS DO SISTEMA

### Mensagens de Sucesso

- "Agente ativado com sucesso! Escaneie o QR Code para conectar."
- "Configuração salva com sucesso!"
- "Agente desconectado com sucesso."
- "Aprendizado deletado com sucesso."

### Mensagens de Erro

- "Erro ao ativar agente. Tente novamente."
- "QR Code expirado. Clique em 'Regenerar QR Code'."
- "Erro ao salvar configuração. Verifique os campos."
- "Erro ao desconectar agente. Tente novamente."
- "Você não tem permissão para acessar esta funcionalidade." (sem assinatura)

### Mensagens do Agente (Padrão)

- "Olá! Sou a BIA, assistente virtual. Como posso ajudar?"
- "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes."
- "Desculpe, não consegui entender o áudio. Pode enviar texto?"
- "Não consegui buscar essas informações no momento. Tente novamente mais tarde."

---

## 8. GLOSSÁRIO

- **Tenant:** Instância do agente IA para um afiliado específico
- **Napkin:** Memória persistente de aprendizados do agente
- **Skill:** Função que permite ao agente consultar dados do sistema
- **Sub-agent:** Agente especializado que processa tarefas específicas
- **Evolution API:** Serviço de integração WhatsApp
- **QR Code:** Código para pareamento WhatsApp
- **Webhook:** Notificação HTTP enviada pela Evolution API
- **gpt-4o-mini:** Modelo de linguagem da OpenAI
- **Whisper:** Modelo de transcrição de áudio da OpenAI
- **TTS:** Text-to-Speech (síntese de voz)

---

**Documento gerado por:** Kiro AI  
**Data:** 14/03/2026  
**Versão:** 1.0  
**Status:** Aguardando Revisão
