# TASKS — BIA v2
**Data:** 14/03/2026  
**Projeto:** Slim Quality - Sistema de Afiliados  
**Objetivo:** Checklist de implementação do BIA v2

---

## FASE 1: INFRAESTRUTURA

### [ ] TASK-001: Criar serviço bia-redis no EasyPanel
- Criar novo serviço Redis no EasyPanel
- Nome: `bia-redis`
- Imagem: `redis:7-alpine`
- Comando: `redis-server --appendonly yes`
- Volume: `/data` (persistência AOF)
- Rede: interna Docker
- URL: `redis://bia-redis:6379`
- Restart policy: `unless-stopped`

---

## FASE 2: BANCO DE DADOS ✅ CONCLUÍDA (14/03/2026)

### [x] TASK-002: Criar tabela bia_agent_config ✅
- ✅ Tabela já existe no banco real
- ✅ Campos: id, tenant_id, agent_name, agent_personality, tone, knowledge_enabled, tts_enabled, created_at, updated_at
- ✅ Campo `tone` com default 'amigavel'
- ✅ Campo `tts_enabled` (boolean) com default true
- ✅ RLS habilitado
- ✅ Policy `tenant_isolation_bia_agent_config` criada
- ✅ Índices: bia_agent_config_pkey, bia_agent_config_tenant_id_key, idx_bia_agent_config_tenant_id
- ✅ Estrutura validada no banco real via Supabase Power

### [x] TASK-003: Criar tabela bia_napkin ✅
- ✅ Tabela já existe no banco real
- ✅ Campos: id, tenant_id, content, last_updated_by, created_at
- ✅ Campo `last_updated_by` com default 'agent'
- ✅ RLS habilitado
- ✅ Índice `idx_napkin_tenant_created` criado
- ✅ Policy `tenant_isolation_bia_napkin` criada
- ✅ Estrutura validada no banco real via Supabase Power

### [x] TASK-004: Criar tabela bia_conversations ✅
- ✅ Tabela já existe no banco real
- ✅ Campos: id, tenant_id, contact_phone, contact_name, status, last_message_at, created_at
- ✅ RLS habilitado
- ✅ Índices `idx_conv_tenant_phone` e `idx_conv_last_message` criados
- ✅ Policy `tenant_isolation_bia_conversations` criada
- ✅ Estrutura validada no banco real via Supabase Power

### [x] TASK-005: Criar tabela bia_messages ✅
- ✅ Tabela já existe no banco real
- ✅ Campos: id, conversation_id, direction, content, message_type, sent_at, created_at
- ✅ RLS habilitado
- ✅ Índice `idx_msg_conversation` criado
- ✅ Policy `tenant_isolation_bia_messages` criada
- ✅ Estrutura validada no banco real via Supabase Power

### [x] TASK-006: Criar tabela bia_metrics ✅
- ✅ Tabela já existe no banco real
- ✅ Campos: id, tenant_id, period_start, period_end, total_messages_received, total_messages_sent, total_conversations, active_conversations, failed_messages, avg_response_time_ms, created_at, updated_at
- ✅ RLS habilitado
- ✅ Constraint UNIQUE(tenant_id, period_start) criado
- ✅ Policy `tenant_isolation_bia_metrics` criada
- ✅ Estrutura validada no banco real via Supabase Power

---

## FASE 3: BACKEND (agent_v2/) ✅ CONCLUÍDA (14/03/2026)

### [x] TASK-007: Criar estrutura de pastas agent_v2/ ✅
- ✅ Pasta `agent_v2/` criada na raiz
- ✅ Subpastas criadas: `src/`, `src/api/`, `src/core/`, `src/services/`, `src/skills/`, `src/subagents/`
- ✅ `requirements.txt` criado com todas as dependências
- ✅ `.env.example` criado
- ✅ `Dockerfile` criado
- ✅ `docker-compose.yml` criado

### [x] TASK-008: Implementar core/config.py ✅
- ✅ Carregamento de variáveis de ambiente com pydantic-settings
- ✅ Validação de variáveis obrigatórias
- ✅ Exportação de configurações via instância global

### [x] TASK-009: Implementar core/database.py ✅
- ✅ Cliente Supabase com service role key
- ✅ Funções helper: get_tenant_by_affiliate_id, get_agent_config, get_napkin, add_napkin, delete_napkin
- ✅ Funções de histórico: get_conversation_history, save_message

### [x] TASK-010: Implementar core/redis.py ✅
- ✅ Cliente Redis assíncrono
- ✅ Funções helper: get, set, delete, enqueue, dequeue
- ✅ Suporte a cache e fila

### [x] TASK-011: Implementar core/openai_client.py ✅
- ✅ Cliente OpenAI assíncrono
- ✅ Função chat_completion para gpt-4o-mini
- ✅ Função transcribe_audio para Whisper
- ✅ Função generate_speech para TTS

### [x] TASK-012: Implementar services/evolution_service.py ✅
- ✅ Criar instância Evolution API
- ✅ Gerar QR Code
- ✅ Enviar mensagens (texto e áudio)
- ✅ Desconectar instância
- ✅ Buscar status da instância

### [x] TASK-013: Implementar services/audio_service.py ✅
- ✅ Transcrever áudio com Whisper (em memória)
- ✅ Gerar áudio com TTS (em memória)
- ✅ Sem Supabase Storage (tudo em memória)

### [x] TASK-014: Implementar services/napkin_service.py ✅
- ✅ Listar aprendizados (últimos 50)
- ✅ Adicionar aprendizado
- ✅ Deletar aprendizado
- ✅ Limitar a 100 (FIFO automático)

### [x] TASK-015: Implementar services/agent_service.py ✅
- ✅ Processar mensagem recebida
- ✅ Carregar configuração, napkin, histórico
- ✅ Montar prompt do sistema
- ✅ Chamar OpenAI gpt-4o-mini
- ✅ Registrar resposta no banco
- ✅ Suporte a diferentes tons de voz

### [x] TASK-016: Implementar skills/commissions.py ✅
- ✅ Skill para buscar comissões do afiliado
- ✅ Query Supabase (últimas 10)
- ✅ Formatar resposta legível

### [x] TASK-017: Implementar skills/network.py ✅
- ✅ Skill para buscar rede do afiliado
- ✅ Query Supabase (N1 e N2)
- ✅ Formatar resposta com contadores

### [x] TASK-018: Implementar skills/sales.py ✅
- ✅ Skill para buscar vendas do afiliado
- ✅ Query Supabase (últimas 10)
- ✅ Formatar resposta com totais

### [x] TASK-019: Implementar subagents/sales_specialist.py ✅
- ✅ Sub-agent especialista em vendas
- ✅ Prompt específico para vendas
- ✅ Chamar OpenAI gpt-4o-mini

### [x] TASK-020: Implementar subagents/support_specialist.py ✅
- ✅ Sub-agent especialista em suporte
- ✅ Prompt específico para suporte técnico
- ✅ Chamar OpenAI gpt-4o-mini

### [x] TASK-021: Implementar api/routes/agent.py ✅
- ✅ POST /agent/activate - Ativa agente e gera QR Code
- ✅ GET /agent/status - Busca status da conexão
- ✅ POST /agent/qr-code - Regenera QR Code
- ✅ POST /agent/disconnect - Desconecta agente
- ✅ GET /agent/config - Busca configuração
- ✅ PUT /agent/config - Atualiza configuração
- ✅ GET /agent/napkin - Lista aprendizados
- ✅ DELETE /agent/napkin/{id} - Deleta aprendizado
- ✅ GET /agent/metrics - Busca métricas

### [x] TASK-022: Implementar api/routes/webhook.py ✅
- ✅ POST /webhook/evolution - Recebe webhook
- ✅ Validar token de segurança
- ✅ Processar mensagem (texto e áudio)
- ✅ Enfileirar para processamento assíncrono

### [x] TASK-023: Implementar api/middleware/auth.py ✅
- ✅ Validar JWT Supabase
- ✅ Extrair user_id do token
- ✅ Verificar has_subscription via tenant

### [x] TASK-024: Implementar api/middleware/cors.py ✅
- ✅ Configurar CORS para frontend Vercel
- ✅ Permitir https://slimquality.com.br
- ✅ Permitir localhost para desenvolvimento

### [x] TASK-025: Implementar api/main.py ✅
- ✅ FastAPI app principal
- ✅ Registrar rotas (agent e webhook)
- ✅ Registrar middlewares (CORS)
- ✅ Health check endpoint (/ e /health)
- ✅ Logging estruturado com JSON
- ✅ Handler global de exceções

### [ ] TASK-026: Criar Dockerfile
- Base image: python:3.11-slim
- Instalar dependências
- Copiar código
- Expor porta 8000
- CMD: uvicorn

### [ ] TASK-027: Testar backend localmente
- Subir bia-redis local
- Configurar .env local
- Rodar FastAPI
- Testar endpoints com Postman/curl

---

## FASE 4: FRONTEND ✅ CONCLUÍDA (14/03/2026)

### [x] TASK-028: Criar página MeuAgente.tsx ✅
- ✅ Rota: `/afiliados/dashboard/meu-agente`
- ✅ Layout: AffiliateDashboardLayout
- ✅ Componentes shadcn/ui (Card, Tabs, Button)
- ✅ Variáveis CSS (sem cores hardcoded)
- ✅ 4 tabs: Status, Configuração, Aprendizados, Métricas

### [x] TASK-029: Criar componente AgentStatus ✅
- ✅ Exibir status conexão (conectado/desconectado/conectando)
- ✅ Exibir QR Code (se desconectado)
- ✅ Botão "Regenerar QR Code"
- ✅ Botão "Desconectar"
- ✅ Badges de status com cores apropriadas

### [x] TASK-030: Criar componente AgentConfig ✅
- ✅ Formulário de configuração completo
- ✅ Campos: agent_name, agent_personality, tone, knowledge_enabled, tts_enabled
- ✅ Validação frontend
- ✅ Salvar via API
- ✅ Select para tom de voz (amigavel, formal, casual, tecnico)
- ✅ Switches para opções booleanas

### [x] TASK-031: Criar componente AgentNapkin ✅
- ✅ Listar últimos 50 aprendizados
- ✅ Botão "Deletar" por aprendizado
- ✅ Confirmação com AlertDialog
- ✅ Indicador de origem (agent/affiliate)
- ✅ Contador de aprendizados (X/100)

### [x] TASK-032: Criar componente AgentMetrics ✅
- ✅ Exibir métricas básicas em cards
- ✅ Cards com números grandes e ícones
- ✅ 4 métricas: mensagens recebidas, enviadas, conversas totais, conversas ativas
- ✅ Ícones lucide-react

### [x] TASK-033: Criar serviço agent.service.ts ✅
- ✅ Funções para chamar API FastAPI
- ✅ Base URL: https://api.slimquality.com.br/v2/
- ✅ Autenticação JWT Supabase automática
- ✅ Tratamento de erros
- ✅ 9 métodos: activate, getStatus, regenerateQRCode, disconnect, getConfig, updateConfig, getNapkin, deleteNapkin, getMetrics

### [x] TASK-034: Adicionar menu "Meu Agente" no sidebar ✅
- ✅ Editado AffiliateDashboardLayout.tsx
- ✅ Item condicional (has_subscription=true)
- ✅ Ícone: Bot (lucide-react)
- ✅ Path: /afiliados/dashboard/meu-agente

### [x] TASK-035: Criar rota no App.tsx ✅
- ✅ Rota adicionada: path="meu-agente" element={<MeuAgente />}
- ✅ Import adicionado
- ✅ Rota protegida (dentro de AffiliateDashboardLayout)

### [ ] TASK-036: Testar frontend localmente
- npm run dev
- Acessar página "Meu Agente"
- Testar todos os componentes
- Validar responsividade

---

## FASE 5: DEPLOY

### [ ] TASK-037: Deploy bia-redis no EasyPanel
- Criar serviço via painel EasyPanel
- Configurar volume persistente
- Validar conectividade interna

### [ ] TASK-038: Deploy agent_v2 no EasyPanel
- Build imagem Docker
- Push para registry
- Criar serviço no EasyPanel
- Configurar variáveis de ambiente
- Expor porta 8001 → 8000
- Configurar domínio: api.slimquality.com.br/v2/

### [ ] TASK-039: Configurar proxy reverso
- Nginx ou Traefik no EasyPanel
- Rota /v2/ → agent_v2:8000
- SSL/TLS habilitado

### [ ] TASK-040: Testar integração completa
- Frontend → FastAPI → Supabase
- Frontend → FastAPI → Evolution API
- Webhook Evolution API → FastAPI
- Validar fluxo end-to-end

### [ ] TASK-041: Monitoramento e logs
- Configurar logs estruturados (JSON)
- Configurar alertas (se disponível)
- Validar métricas no dashboard

---

## FASE 6: VALIDAÇÃO

### [ ] TASK-042: Teste de ativação
- Afiliado ativa agente
- QR Code gerado
- Conexão WhatsApp bem-sucedida
- Status atualizado

### [ ] TASK-043: Teste de mensagem texto
- Cliente envia texto
- Agente processa e responde
- Mensagem registrada no banco

### [ ] TASK-044: Teste de mensagem áudio
- Cliente envia áudio
- Whisper transcreve
- Agente processa e responde
- Áudio descartado (não armazenado)

### [ ] TASK-045: Teste de configuração
- Afiliado edita personalidade
- Configuração salva
- Nova conversa usa nova personalidade

### [ ] TASK-046: Teste de napkin
- Agente aprende com conversa
- Aprendizado registrado
- Afiliado visualiza napkin
- Afiliado deleta aprendizado

### [ ] TASK-047: Teste de skills
- Cliente pergunta sobre comissões
- Agente usa skill e responde
- Dados corretos retornados

### [ ] TASK-048: Teste de desconexão
- Afiliado desconecta agente
- Status atualizado
- QR Code limpo
- Pode reconectar

---

**Documento gerado por:** Kiro AI  
**Data:** 14/03/2026  
**Versão:** 1.0  
**Status:** Aguardando Revisão
