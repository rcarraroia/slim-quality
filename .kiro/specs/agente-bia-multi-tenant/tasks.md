# Plano de Implementação: Agente BIA Multi-Tenant

## ⚠️ PROTOCOLO OBRIGATÓRIO

**ANTES DE INICIAR QUALQUER TASK, CONSULTAR:**
- `.kiro/steering/AGENTS.md` - Regras de análise preventiva, funcionalidade sobre testes, limites de tempo
- `.context/docs/design-system.md` - Para qualquer implementação de UI
- Supabase Power - Para validação de banco de dados real

**PRINCÍPIO FUNDAMENTAL:**
Conectar o motor (agente BIA atual) ao chassi (tabelas multi_agent_* e sicc_*) — não construir do zero.

**ARQUITETURA:**
- Backend: Python/FastAPI em `agent/` (deploy manual via Docker Hub)
- Frontend: React/Vite em `src/` (deploy automático Vercel)
- Serverless: JavaScript/ESM em `api/` (deploy automático Vercel)
- Banco: Supabase PostgreSQL (infraestrutura 98% pronta)

---

## Visão Geral

Este plano implementa o sistema multi-tenant para o Agente BIA, permitindo que múltiplos logistas tenham suas próprias instâncias personalizadas do agente de vendas.

**Contexto:**
- Infraestrutura de banco multi-tenant já existe (tabelas multi_agent_*, sicc_*)
- Agente BIA atual funciona perfeitamente (vendas, objeções, áudio)
- Objetivo: Adaptar agente existente para suportar múltiplos tenants isolados

**Fases de Implementação:**
1. Core Multi-Tenant Infrastructure (Prioridade Máxima)
2. Personality and Context Loading
3. Webhook Evolution Adaptation
4. Bundle Activation (Webhook Asaas)
5. Evolution Instance Provisioning
6. Error Handling and Fallbacks
7. Testing and Validation
8. Documentation and Deployment
9. Production Deployment
10. Post-MVP Preparation

---

## Phase 1: Core Multi-Tenant Infrastructure (PRIORIDADE MÁXIMA)

### Objetivo
Adaptar o núcleo do agente (state, checkpointer) para suportar múltiplos tenants com isolamento garantido.

---

- [x] 1.1 Adaptar AgentState para Multi-Tenant
  - Adicionar campos: `tenant_id: int`, `conversation_id: int`, `personality: dict`
  - Manter campos existentes (messages, audio_buffer, etc.)
  - Validar que tenant_id é obrigatório
  - **Arquivo:** `agent/src/graph/state.py`
  - **Requisitos:** 1.1, 2.1
  - **Critério de Aceitação:** AgentState instancia com tenant_id e conversation_id válidos

- [x] 1.2 Criar MultiTenantCheckpointer
  - Implementar classe que herda de BaseCheckpointSaver
  - Método `put()`: salvar em multi_agent_checkpoints com tenant_id
  - Método `get()`: buscar com filtro tenant_id + thread_id
  - Método `list()`: listar apenas checkpoints do tenant
  - Thread ID format: "tenant_{tenant_id}_conv_{conversation_id}"
  - **Arquivo:** `agent/src/graph/checkpointer.py` (reescrever)
  - **Requisitos:** 1.1, 1.2
  - **Critério de Aceitação:** Checkpointer salva/recupera estado isolado por tenant

- [x] 1.3 Validar RLS nas Tabelas Multi-Tenant
  - Usar Supabase Power para verificar políticas RLS
  - Confirmar que multi_agent_checkpoints tem RLS ativo
  - Confirmar que sicc_memory_chunks tem RLS ativo
  - Confirmar que multi_agent_conversations tem RLS ativo
  - Documentar políticas encontradas
  - **Requisitos:** 1.2, 8.1
  - **Critério de Aceitação:** Todas as tabelas multi-tenant têm RLS ativo

- [x]* 1.4 Testes de Isolamento de Tenant
  - Criar 2 tenants de teste (tenant_1, tenant_2)
  - Salvar checkpoint para tenant_1
  - Tentar recuperar com tenant_2 (deve falhar)
  - Validar que list() retorna apenas checkpoints do tenant correto
  - **Property Test:** Isolamento garantido entre tenants
  - **Requisitos:** 1.2, 8.1
  - **Critério de Aceitação:** Tenant A nunca acessa dados de tenant B

- [x] 1.5 Checkpoint - Validar Infraestrutura Core
  - Executar testes de isolamento
  - Confirmar zero erros de TypeScript/Python
  - Validar que agente existente ainda funciona (não quebrar)
  - Perguntar ao usuário se há dúvidas antes de prosseguir

---

## Phase 2: Personality and Context Loading

### Objetivo
Implementar carregamento de personality customizada por tenant com fallback para personality padrão.

---

- [x] 2.1 Criar Módulo de Personality com Fallback
  - Criar `agent/src/config/personality.py`
  - Definir FALLBACK_PERSONALITY (personality da Slim Quality atual)
  - Função `load_personality(tenant_id: int) -> dict`
  - Buscar em multi_agent_tenants WHERE id = tenant_id
  - Se personality IS NULL → retornar FALLBACK_PERSONALITY
  - Se personality IS NOT NULL → retornar personality customizada
  - **Arquivo:** `agent/src/config/personality.py` (criar novo)
  - **Requisitos:** 2.1, 2.2
  - **Critério de Aceitação:** load_personality retorna fallback quando NULL

- [x] 2.2 Implementar Cache de Personality
  - Usar TTL cache (5 minutos)
  - Evitar query ao banco a cada mensagem
  - Invalidar cache quando personality for atualizada
  - **Arquivo:** `agent/src/config/personality.py`
  - **Requisitos:** 2.1, 7.1
  - **Critério de Aceitação:** Personality carregada 1x a cada 5 minutos

- [x] 2.3 Adaptar MemoryService para Multi-Tenant
  - Trocar tabela: `memory_chunks` → `sicc_memory_chunks`
  - Adicionar filtro `tenant_id` em todas as queries
  - Método `store()`: incluir tenant_id
  - Método `search()`: filtrar por tenant_id
  - Método `get_recent()`: filtrar por tenant_id
  - **Arquivo:** `agent/src/services/sicc/memory_service.py`
  - **Requisitos:** 1.1, 3.1
  - **Critério de Aceitação:** Memórias isoladas por tenant

- [x] 2.4 Adaptar SICCService para Multi-Tenant
  - Carregar personality via `load_personality(tenant_id)`
  - Adicionar tenant_id em contexto de análise
  - Manter lógica de análise existente (não reescrever)
  - **Arquivo:** `agent/src/services/sicc/sicc_service.py`
  - **Requisitos:** 2.1, 3.1
  - **Critério de Aceitação:** SICC usa personality correta por tenant

- [x]* 2.5 Testes de Personality Loading
  - Tenant com personality NULL → retorna fallback
  - Tenant com personality customizada → retorna customizada
  - Cache funciona (não recarrega a cada chamada)
  - **Requisitos:** 2.1, 2.2
  - **Critério de Aceitação:** Personality carregada corretamente em todos os cenários

- [x] 2.6 Checkpoint - Validar Personality e Contexto
  - Executar testes de personality
  - Confirmar zero erros
  - Validar que memórias estão isoladas por tenant
  - Perguntar ao usuário se há dúvidas antes de prosseguir

---

## Phase 3: Webhook Evolution Adaptation

### Objetivo
Adaptar webhook Evolution para extrair tenant_id, validar conexão ativa e rotear para contexto correto.

---

- [ ] 3.1 Extrair tenant_id do instanceName
  - Webhook recebe `instanceName` (ex: "lojista_123")
  - Extrair affiliate_id: `instanceName.split('_')[1]`
  - Buscar tenant: `SELECT id FROM multi_agent_tenants WHERE affiliate_id = ?`
  - Se não encontrado → retornar erro 404 "Tenant não encontrado"
  - **Arquivo:** `agent/src/api/webhooks.py`
  - **Requisitos:** 1.1, 4.1
  - **Critério de Aceitação:** tenant_id extraído corretamente de instanceName

- [ ] 3.2 Validar connection_status Ativa
  - Buscar em multi_agent_tenants WHERE tenant_id = ?
  - Verificar `connection_status = 'active'`
  - Se não ativa → retornar erro 503 "Conexão não ativa"
  - Logar tentativa de uso com conexão inativa
  - **Arquivo:** `agent/src/api/webhooks.py`
  - **Requisitos:** 4.1, 6.1
  - **Critério de Aceitação:** Webhook rejeita mensagens se conexão não ativa

- [ ] 3.3 Buscar ou Criar Conversation
  - Buscar em multi_agent_conversations WHERE tenant_id = ? AND customer_phone = ?
  - Se não existe → criar nova conversation
  - Atualizar `last_message_at = NOW()`
  - Retornar conversation_id
  - **Arquivo:** `agent/src/api/webhooks.py`
  - **Requisitos:** 1.1, 5.1
  - **Critério de Aceitação:** Conversation criada/recuperada corretamente

- [ ] 3.4 Processar Mensagem Multi-Tenant
  - Criar AgentState com tenant_id, conversation_id, personality
  - Carregar personality via `load_personality(tenant_id)`
  - Criar thread_id: "tenant_{tenant_id}_conv_{conversation_id}"
  - Invocar LangGraph com MultiTenantCheckpointer
  - Manter lógica de processamento existente (áudio, texto, objeções)
  - **Arquivo:** `agent/src/api/webhooks.py`
  - **Requisitos:** 1.1, 2.1, 3.1
  - **Critério de Aceitação:** Mensagem processada com contexto correto do tenant

- [ ] 3.5 Salvar Mensagem em multi_agent_messages
  - Salvar mensagem do cliente (role: user)
  - Salvar resposta do agente (role: assistant)
  - Incluir tenant_id, conversation_id, metadata
  - **Arquivo:** `agent/src/api/webhooks.py`
  - **Requisitos:** 5.1
  - **Critério de Aceitação:** Mensagens salvas corretamente no banco

- [ ]* 3.6 Testes de Webhook Evolution
  - Tenant válido + conexão ativa → processa mensagem
  - Tenant inválido → retorna 404
  - Conexão inativa → retorna 503
  - Conversation criada na primeira mensagem
  - Conversation reutilizada em mensagens subsequentes
  - **Requisitos:** 1.1, 4.1, 5.1
  - **Critério de Aceitação:** Webhook funciona corretamente em todos os cenários

- [ ] 3.7 Checkpoint - Validar Webhook Evolution
  - Executar testes de webhook
  - Confirmar zero erros
  - Validar que agente responde corretamente
  - Perguntar ao usuário se há dúvidas antes de prosseguir

---

## Phase 4: Bundle Activation (Webhook Asaas)

### Objetivo
Implementar ativação do bundle (vitrine + agente) no webhook Asaas quando logista pagar mensalidade.

---

- [ ] 4.1 Detectar Pagamento de Bundle no Webhook
  - Webhook Asaas recebe evento PAYMENT_CONFIRMED
  - Verificar se `externalReference` começa com "affiliate_"
  - Buscar payment_session para identificar produto
  - Se produto tem `bundle_includes` com "agent" → ativar bundle
  - **Arquivo:** `api/webhook-assinaturas.js`
  - **Requisitos:** 4.2, 9.1
  - **Critério de Aceitação:** Webhook identifica pagamento de bundle

- [ ] 4.2 Ativar Tenant e Vitrine
  - Buscar affiliate_id do payment_session
  - Criar/atualizar registro em multi_agent_tenants:
    - `affiliate_id`, `status = 'active'`, `activated_at = NOW()`
    - `personality = NULL` (usar fallback)
  - Ativar vitrine: `UPDATE store_profiles SET is_visible = true`
  - **Arquivo:** `api/webhook-assinaturas.js`
  - **Requisitos:** 4.2, 9.1
  - **Critério de Aceitação:** Tenant criado e vitrine ativada

- [ ] 4.3 Registrar em affiliate_services
  - Inserir registro: `(affiliate_id, service_type = 'agent', status = 'active')`
  - Incluir metadata: `{ bundle: true, activated_via: 'payment' }`
  - **Arquivo:** `api/webhook-assinaturas.js`
  - **Requisitos:** 9.1
  - **Critério de Aceitação:** Serviço registrado corretamente

- [ ] 4.4 Criar order_items com Split 50/50
  - Buscar order_id do payment
  - Criar 2 order_items:
    - Item 1: `product_id = vitrine`, `quantity = 1`, `price_cents = total/2`
    - Item 2: `product_id = agente`, `quantity = 1`, `price_cents = total/2`
  - Metadata: `{ bundle: true, split_type: '50/50' }`
  - **Arquivo:** `api/subscriptions/create-payment.js`
  - **Requisitos:** 9.1
  - **Critério de Aceitação:** Order items criados para analytics

- [ ] 4.5 Provisionar Instância Evolution (Async)
  - Enfileirar job para provisionar instância
  - Não bloquear webhook (processar async)
  - Job chama Evolution API para criar instância
  - **Arquivo:** `api/webhook-assinaturas.js`
  - **Requisitos:** 4.1, 4.2
  - **Critério de Aceitação:** Job enfileirado, webhook não bloqueia

- [ ]* 4.6 Testes de Bundle Activation
  - Pagamento confirmado → tenant criado
  - Vitrine ativada automaticamente
  - affiliate_services registrado
  - order_items criados com split 50/50
  - Job de provisioning enfileirado
  - **Requisitos:** 4.2, 9.1
  - **Critério de Aceitação:** Bundle ativado corretamente

- [ ] 4.7 Checkpoint - Validar Bundle Activation
  - Executar testes de bundle
  - Confirmar zero erros
  - Validar que vitrine e agente ativam juntos
  - Perguntar ao usuário se há dúvidas antes de prosseguir

---

## Phase 5: Evolution Instance Provisioning

### Objetivo
Implementar provisionamento de instância Evolution API para cada tenant, incluindo QR code e webhook.

---

- [ ] 5.1 Criar Webhook Evolution no Backend
  - Criar `api/webhooks/evolution.js`
  - Rota: POST /api/webhooks/evolution
  - Validar token de autenticação
  - Rotear eventos: CONNECTION_UPDATE, MESSAGES_UPSERT
  - **Arquivo:** `api/webhooks/evolution.js` (criar novo)
  - **Requisitos:** 4.1
  - **Critério de Aceitação:** Webhook recebe eventos da Evolution API

- [ ] 5.2 Implementar POST /instance/create
  - Função `provisionEvolutionInstance(tenant_id, affiliate_id)`
  - Chamar Evolution API: POST /instance/create
  - Body: `{ instanceName: "lojista_{affiliate_id}", token: EVOLUTION_API_KEY }`
  - Webhook URL: `https://slimquality.com.br/api/webhooks/evolution`
  - **Arquivo:** `agent/src/services/evolution/provisioning.py` (criar novo)
  - **Requisitos:** 4.1, 4.2
  - **Critério de Aceitação:** Instância criada na Evolution API

- [ ] 5.3 Salvar qr_code_base64 no Banco
  - Evolution API retorna `qr_code_base64`
  - Salvar em multi_agent_tenants:
    - `evolution_instance_name`, `qr_code_base64`
    - `connection_status = 'awaiting_qr'`, `last_qr_generated_at = NOW()`
  - **Arquivo:** `agent/src/services/evolution/provisioning.py`
  - **Requisitos:** 4.2
  - **Critério de Aceitação:** QR code salvo no banco

- [ ] 5.4 Tratar Evento CONNECTION_UPDATE
  - Webhook recebe CONNECTION_UPDATE com status "open"
  - Atualizar multi_agent_tenants:
    - `connection_status = 'active'`, `last_connection_at = NOW()`
  - Limpar qr_code_base64 (não precisa mais)
  - **Arquivo:** `api/webhooks/evolution.js`
  - **Requisitos:** 4.1
  - **Critério de Aceitação:** Status atualizado quando WhatsApp conecta

- [ ] 5.5 Exibir QR Code no Painel do Logista
  - Criar componente `QRCodeDisplay.tsx`
  - Buscar qr_code_base64 via API
  - Exibir imagem: `<img src={data:image/png;base64,${qr_code}} />`
  - Polling a cada 5 segundos para verificar status
  - Quando status = 'active' → exibir "Conectado ✅"
  - **Arquivo:** `src/components/affiliates/QRCodeDisplay.tsx` (criar novo)
  - **Requisitos:** 4.2
  - **Critério de Aceitação:** Logista vê QR code e status de conexão

- [ ] 5.6 Criar API para Buscar QR Code
  - Rota: GET /api/evolution/qr-code?tenant_id={id}
  - Buscar em multi_agent_tenants WHERE tenant_id = ?
  - Retornar: `{ qr_code_base64, connection_status }`
  - **Arquivo:** `api/evolution.js` (criar novo)
  - **Requisitos:** 4.2
  - **Critério de Aceitação:** API retorna QR code e status

- [ ]* 5.7 Testes de Provisioning
  - Instância criada na Evolution API
  - QR code salvo no banco
  - Webhook recebe CONNECTION_UPDATE
  - Status atualizado para 'active'
  - Painel exibe QR code corretamente
  - **Requisitos:** 4.1, 4.2
  - **Critério de Aceitação:** Provisioning funciona end-to-end

- [ ] 5.8 Checkpoint - Validar Provisioning
  - Executar testes de provisioning
  - Confirmar zero erros
  - Validar que QR code aparece no painel
  - Perguntar ao usuário se há dúvidas antes de prosseguir

---

## Phase 6: Error Handling and Fallbacks

### Objetivo
Implementar tratamento robusto de erros e fallbacks para garantir resiliência do sistema.

---

- [ ] 6.1 Tratar Tenant Não Encontrado
  - Webhook recebe instanceName inválido
  - Retornar HTTP 404 com mensagem clara
  - Logar tentativa de acesso com tenant inválido
  - Não processar mensagem
  - **Arquivo:** `agent/src/api/webhooks.py`
  - **Requisitos:** 6.1
  - **Critério de Aceitação:** Erro 404 retornado com mensagem clara

- [ ] 6.2 Tratar Conexão Não Ativa
  - Webhook recebe mensagem mas connection_status != 'open'
  - Retornar HTTP 503 "Conexão não ativa"
  - Logar tentativa de uso com conexão inativa
  - Não processar mensagem
  - **Arquivo:** `agent/src/api/webhooks.py`
  - **Requisitos:** 6.1
  - **Critério de Aceitação:** Erro 503 retornado quando conexão inativa

- [ ] 6.3 Implementar Retry na Evolution API
  - Chamadas à Evolution API podem falhar temporariamente
  - Implementar retry com backoff exponencial (3 tentativas)
  - Delays: 1s, 2s, 4s
  - Se falhar após 3 tentativas → logar erro e retornar 500
  - **Arquivo:** `agent/src/services/evolution/api_client.py`
  - **Requisitos:** 6.2
  - **Critério de Aceitação:** Retry funciona em falhas temporárias

- [ ] 6.4 Implementar Fallback Response no LangGraph
  - Se LangGraph falhar ao gerar resposta
  - Retornar mensagem padrão: "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes."
  - Logar erro detalhado para debugging
  - Não deixar cliente sem resposta
  - **Arquivo:** `agent/src/graph/graph.py`
  - **Requisitos:** 6.2
  - **Critério de Aceitação:** Cliente sempre recebe resposta, mesmo em erro

- [ ] 6.5 Implementar Circuit Breaker para Banco
  - Se banco falhar 5 vezes consecutivas → abrir circuit breaker
  - Retornar erro 503 "Serviço temporariamente indisponível"
  - Após 30 segundos → tentar fechar circuit breaker
  - **Arquivo:** `agent/src/database/circuit_breaker.py` (criar novo)
  - **Requisitos:** 6.2
  - **Critério de Aceitação:** Circuit breaker protege contra falhas em cascata

- [ ] 6.6 Implementar Logging Estruturado
  - Usar formato JSON para logs
  - Incluir: timestamp, level, tenant_id, conversation_id, message
  - Logar eventos importantes: tenant_not_found, connection_inactive, api_error
  - **Arquivo:** `agent/src/utils/logger.py`
  - **Requisitos:** 6.3
  - **Critério de Aceitação:** Logs estruturados facilitam debugging

- [ ]* 6.7 Testes de Error Handling
  - Tenant inválido → 404
  - Conexão inativa → 503
  - Evolution API falha → retry funciona
  - LangGraph falha → fallback response
  - Banco falha 5x → circuit breaker abre
  - **Requisitos:** 6.1, 6.2
  - **Critério de Aceitação:** Todos os cenários de erro tratados corretamente

- [ ] 6.8 Checkpoint - Validar Error Handling
  - Executar testes de erro
  - Confirmar zero erros não tratados
  - Validar que sistema é resiliente
  - Perguntar ao usuário se há dúvidas antes de prosseguir

---

## Phase 7: Testing and Validation

### Objetivo
Garantir qualidade através de testes abrangentes (unitários, integração, isolamento, performance).

---

- [ ]* 7.1 Testes Unitários - MultiTenantCheckpointer
  - Testar put() salva com tenant_id correto
  - Testar get() recupera apenas do tenant correto
  - Testar list() filtra por tenant
  - Testar thread_id format correto
  - **Arquivo:** `agent/tests/unit/test_checkpointer.py`
  - **Requisitos:** 1.1, 1.2
  - **Critério de Aceitação:** Cobertura > 90% do checkpointer

- [ ]* 7.2 Testes Unitários - Personality Loading
  - Testar load_personality com NULL → retorna fallback
  - Testar load_personality com customizada → retorna customizada
  - Testar cache funciona (não recarrega)
  - **Arquivo:** `agent/tests/unit/test_personality.py`
  - **Requisitos:** 2.1, 2.2
  - **Critério de Aceitação:** Cobertura > 90% do personality module

- [ ]* 7.3 Testes de Integração - Webhook Evolution
  - Testar fluxo completo: mensagem → processamento → resposta
  - Testar tenant válido + conexão ativa
  - Testar tenant inválido → 404
  - Testar conexão inativa → 503
  - **Arquivo:** `agent/tests/integration/test_webhook_evolution.py`
  - **Requisitos:** 1.1, 4.1, 5.1
  - **Critério de Aceitação:** Fluxo end-to-end funciona

- [ ]* 7.4 Testes de Integração - Bundle Activation
  - Testar pagamento confirmado → tenant criado
  - Testar vitrine ativada
  - Testar affiliate_services registrado
  - Testar order_items criados
  - Testar provisioning enfileirado
  - **Arquivo:** `agent/tests/integration/test_bundle_activation.py`
  - **Requisitos:** 4.2, 9.1
  - **Critério de Aceitação:** Bundle ativado corretamente

- [ ]* 7.5 Property-Based Tests - Isolamento de Tenant
  - **Property:** Tenant A nunca acessa dados de tenant B
  - Gerar 100 pares de tenants aleatórios
  - Para cada par: salvar checkpoint A, tentar recuperar com B
  - Validar que recuperação falha ou retorna vazio
  - **Arquivo:** `agent/tests/property/test_tenant_isolation.py`
  - **Requisitos:** 1.2, 8.1
  - **Critério de Aceitação:** 100% dos testes passam

- [ ]* 7.6 Testes de Performance - Response Time
  - Testar 100 mensagens consecutivas
  - Medir response time (p50, p95, p99)
  - Validar p95 < 5 segundos
  - Identificar gargalos se necessário
  - **Arquivo:** `agent/tests/performance/test_response_time.py`
  - **Requisitos:** 7.1
  - **Critério de Aceitação:** p95 < 5 segundos

- [ ]* 7.7 Testes de Carga - Múltiplos Tenants
  - Simular 10 tenants enviando mensagens simultaneamente
  - 10 mensagens por tenant (100 mensagens totais)
  - Validar que não há race conditions
  - Validar que isolamento é mantido sob carga
  - **Arquivo:** `agent/tests/load/test_multi_tenant_load.py`
  - **Requisitos:** 7.1, 8.1
  - **Critério de Aceitação:** Sistema estável sob carga

- [ ]* 7.8 Validar Cobertura de Testes
  - Executar pytest com coverage
  - Validar cobertura > 70%
  - Identificar áreas sem cobertura
  - Adicionar testes se necessário
  - **Requisitos:** 7.2
  - **Critério de Aceitação:** Cobertura > 70%

- [ ] 7.9 Checkpoint - Validar Qualidade
  - Executar todos os testes
  - Confirmar cobertura > 70%
  - Confirmar p95 < 5 segundos
  - Confirmar isolamento garantido
  - Perguntar ao usuário se há dúvidas antes de prosseguir

---

## Phase 8: Documentation and Deployment

### Objetivo
Documentar sistema, criar guias operacionais e preparar para deploy em staging.

---

- [ ] 8.1 Atualizar README do Agente
  - Documentar arquitetura multi-tenant
  - Explicar identificação de tenant (instanceName)
  - Documentar thread_id format
  - Listar variáveis de ambiente necessárias
  - Incluir exemplos de uso
  - **Arquivo:** `agent/README.md`
  - **Requisitos:** 10.1
  - **Critério de Aceitação:** README completo e atualizado

- [ ] 8.2 Criar Guia de Troubleshooting
  - Documentar erros comuns e soluções
  - Tenant não encontrado → verificar affiliate_id
  - Conexão inativa → verificar Evolution API
  - Response time alto → verificar cache
  - **Arquivo:** `agent/docs/TROUBLESHOOTING.md`
  - **Requisitos:** 10.1
  - **Critério de Aceitação:** Guia cobre cenários comuns

- [ ] 8.3 Criar Runbook de Operações
  - Como provisionar novo tenant
  - Como desativar tenant
  - Como resetar conexão Evolution
  - Como investigar problemas de isolamento
  - Como fazer rollback
  - **Arquivo:** `agent/docs/RUNBOOK.md`
  - **Requisitos:** 10.1
  - **Critério de Aceitação:** Runbook cobre operações críticas

- [ ] 8.4 Documentar Variáveis de Ambiente
  - Listar todas as variáveis necessárias
  - EVOLUTION_API_KEY, EVOLUTION_API_URL
  - SUPABASE_URL, SUPABASE_SERVICE_KEY
  - Documentar valores para staging e produção
  - **Arquivo:** `agent/.env.example`
  - **Requisitos:** 10.1
  - **Critério de Aceitação:** .env.example completo

- [ ] 8.5 Preparar Deploy para Staging
  - Criar branch `staging`
  - Atualizar Dockerfile se necessário
  - Configurar variáveis de ambiente no EasyPanel (staging)
  - Validar que build funciona
  - **Requisitos:** 10.2
  - **Critério de Aceitação:** Build staging pronto

- [ ] 8.6 Deploy em Staging
  - Build Docker image: `docker build -t renumvscode/slim-agent:staging .`
  - Push para Docker Hub: `docker push renumvscode/slim-agent:staging`
  - Rebuild no EasyPanel (staging)
  - Aguardar deploy completar
  - **Requisitos:** 10.2
  - **Critério de Aceitação:** Deploy staging concluído

- [ ] 8.7 Validar Deploy em Staging
  - Testar webhook Evolution em staging
  - Criar tenant de teste
  - Provisionar instância Evolution
  - Enviar mensagem de teste
  - Validar resposta correta
  - **Requisitos:** 10.2
  - **Critério de Aceitação:** Sistema funciona em staging

- [ ] 8.8 Checkpoint - Validar Documentação e Staging
  - Confirmar README atualizado
  - Confirmar guias criados
  - Confirmar staging funcionando
  - Perguntar ao usuário se há dúvidas antes de prosseguir

---

## Phase 9: Production Deployment

### Objetivo
Deploy seguro em produção com validação de tenants existentes e monitoramento.

---

- [ ] 9.1 Backup do Banco de Dados
  - Usar Supabase Power para criar backup
  - Validar que backup foi criado com sucesso
  - Documentar como restaurar se necessário
  - **Requisitos:** 10.3
  - **Critério de Aceitação:** Backup criado e validado

- [ ] 9.2 Validar Tenants Existentes
  - Usar Supabase Power para listar tenants
  - Confirmar que tenants de teste estão corretos
  - Validar que personality está NULL ou válida
  - Validar que affiliate_id está correto
  - **Requisitos:** 10.3
  - **Critério de Aceitação:** Tenants validados antes do deploy

- [ ] 9.3 Preparar Deploy para Produção
  - Criar tag de versão: `v1.0.0-multi-tenant`
  - Atualizar CHANGELOG.md
  - Configurar variáveis de ambiente no EasyPanel (produção)
  - Validar que build funciona
  - **Requisitos:** 10.3
  - **Critério de Aceitação:** Build produção pronto

- [ ] 9.4 Deploy em Produção
  - Build Docker image: `docker build -t renumvscode/slim-agent:latest .`
  - Push para Docker Hub: `docker push renumvscode/slim-agent:latest`
  - Rebuild no EasyPanel (produção)
  - Aguardar deploy completar
  - **Requisitos:** 10.3
  - **Critério de Aceitação:** Deploy produção concluído

- [ ] 9.5 Validar Tenants Existentes Pós-Deploy
  - Testar tenant 1 (Slim Quality)
  - Testar tenant 2 (Lojista teste)
  - Enviar mensagem de teste para cada tenant
  - Validar que respostas estão corretas
  - Validar que isolamento está funcionando
  - **Requisitos:** 10.3
  - **Critério de Aceitação:** Tenants existentes funcionam

- [ ] 9.6 Monitorar Sistema por 24 Horas
  - Monitorar logs de erro
  - Monitorar response time
  - Monitorar taxa de sucesso de mensagens
  - Identificar problemas se houver
  - **Requisitos:** 10.3
  - **Critério de Aceitação:** Sistema estável por 24h

- [ ] 9.7 Validar Compatibilidade com Sistema Existente
  - Confirmar que vendas continuam funcionando
  - Confirmar que comissões continuam sendo calculadas
  - Confirmar que webhook Asaas continua funcionando
  - Confirmar que nenhuma funcionalidade foi quebrada
  - **Requisitos:** 8.2
  - **Critério de Aceitação:** Sistema existente não foi afetado

- [ ] 9.8 Checkpoint - Validar Produção
  - Confirmar deploy bem-sucedido
  - Confirmar tenants funcionando
  - Confirmar sistema estável
  - Confirmar compatibilidade mantida
  - Perguntar ao usuário se há dúvidas antes de prosseguir

---

## Phase 10: Post-MVP Preparation

### Objetivo
Documentar roadmap pós-MVP e preparar para features futuras (handoff, skills, sub-agentes).

---

- [ ] 10.1 Documentar Roadmap Pós-MVP
  - Listar features fora do MVP:
    - Handoff para humano (Chatwoot)
    - Skills customizadas por tenant
    - Sub-agentes especializados
    - Funis CRM por tenant
    - Automações por tenant
    - Plano Pro (R$249/mês)
  - Priorizar features por impacto
  - Estimar complexidade de cada feature
  - **Arquivo:** `agent/docs/POST_MVP_ROADMAP.md`
  - **Requisitos:** 10.4
  - **Critério de Aceitação:** Roadmap documentado

- [ ] 10.2 Criar Issues para Features Pós-MVP
  - Criar issue: "Implementar Handoff para Chatwoot"
  - Criar issue: "Implementar Skills Customizadas"
  - Criar issue: "Implementar Sub-Agentes Especializados"
  - Criar issue: "Implementar Funis CRM por Tenant"
  - Criar issue: "Implementar Automações por Tenant"
  - Incluir requisitos e critérios de aceitação
  - **Requisitos:** 10.4
  - **Critério de Aceitação:** Issues criadas no GitHub

- [ ] 10.3 Validar Tabelas Pós-MVP
  - Usar Supabase Power para verificar tabelas:
    - multi_agent_skills (existe?)
    - multi_agent_sub_agents (existe?)
    - multi_agent_funnels (existe?)
    - multi_agent_automations (existe?)
  - Documentar quais tabelas precisam ser criadas
  - **Requisitos:** 10.4
  - **Critério de Aceitação:** Tabelas pós-MVP documentadas

- [ ] 10.4 Criar Template de Personality Customizada
  - Documentar estrutura JSON de personality
  - Incluir campos: name, role, tone, goals, constraints
  - Criar exemplos de personalities:
    - Vendedor agressivo
    - Consultor educativo
    - Atendente formal
  - **Arquivo:** `agent/docs/PERSONALITY_TEMPLATE.md`
  - **Requisitos:** 2.2
  - **Critério de Aceitação:** Template documentado com exemplos

- [ ] 10.5 Documentar Arquitetura de Skills
  - Explicar como skills serão implementadas
  - Skill = função Python que o agente pode chamar
  - Exemplos: consultar_estoque, calcular_frete, agendar_visita
  - Documentar interface de skill
  - **Arquivo:** `agent/docs/SKILLS_ARCHITECTURE.md`
  - **Requisitos:** 10.4
  - **Critério de Aceitação:** Arquitetura de skills documentada

- [ ] 10.6 Documentar Arquitetura de Sub-Agentes
  - Explicar como sub-agentes serão implementados
  - Sub-agente = agente especializado (vendas, suporte, agendamento)
  - Documentar como rotear para sub-agente correto
  - Documentar como sub-agentes compartilham contexto
  - **Arquivo:** `agent/docs/SUB_AGENTS_ARCHITECTURE.md`
  - **Requisitos:** 10.4
  - **Critério de Aceitação:** Arquitetura de sub-agentes documentada

- [ ] 10.7 Checkpoint Final - Validar Preparação Pós-MVP
  - Confirmar roadmap documentado
  - Confirmar issues criadas
  - Confirmar tabelas validadas
  - Confirmar templates criados
  - Confirmar arquiteturas documentadas
  - Perguntar ao usuário se há dúvidas

---

## Notas Importantes

### Arquivos que NÃO Mudam (Reaproveitar 100%)
- Lógica de vendas e objeções (`agent/src/services/sales/`)
- Processamento de áudio (`agent/src/services/audio/`)
- Integração Evolution API envio/recebimento (`agent/src/services/evolution/api_client.py`)
- AI Service geração de resposta (`agent/src/services/ai/`)
- Cálculo de comissões (`api/subscriptions/create-payment.js`)

### Decisões Arquiteturais Críticas (NÃO Renegociar)
1. **Identificação de Tenant:** instanceName = "lojista_{affiliate_id}"
2. **Thread ID Format:** "tenant_{tenant_id}_conv_{conversation_id}"
3. **Tabelas Multi-Tenant:** multi_agent_*, sicc_* (não tabelas legadas)
4. **Personality Fallback:** Usar FALLBACK_PERSONALITY quando NULL
5. **Bundle:** Ativar vitrine E agente no mesmo webhook
6. **Evolution API:** Chave global compartilhada (EVOLUTION_API_KEY)
7. **RLS + Application-Level:** Defesa em profundidade
8. **Cache Personality:** TTL 5 minutos
9. **Async Processing:** Webhooks não bloqueiam
10. **Order Items Split:** 50/50 vitrine/agente para analytics

### Funcionalidades Fora do MVP (NÃO Implementar)
- Handoff para humano (Chatwoot)
- Skills customizadas por tenant
- Sub-agentes especializados
- Funis CRM por tenant
- Automações por tenant
- Plano Pro (R$249/mês)
- Personalização avançada de personality
- Multi-idioma

### Requisitos de Qualidade
- Cobertura de testes > 70%
- Response time < 5 segundos (95th percentile)
- Isolamento garantido (tenant A nunca acessa dados de tenant B)
- Compatibilidade com sistema existente (não quebrar funcionalidades)

### Validação Pré-Implementação
- [ ] Funções RPC com filtro de tenant_id existem
- [ ] RLS ativo em todas as tabelas multi-tenant
- [ ] Personality dos 2 tenants existentes populada
- [ ] Evolution API v2.3.7 rodando no EasyPanel
- [ ] EVOLUTION_API_KEY disponível
- [ ] Ambiente de teste separado de produção
- [ ] Plano de rollback documentado
- [ ] Backup do banco realizado

---

## Resumo de Entregas

### Backend (Python/FastAPI)
- `agent/src/graph/state.py` - AgentState adaptado
- `agent/src/graph/checkpointer.py` - MultiTenantCheckpointer
- `agent/src/config/personality.py` - Personality loading com fallback
- `agent/src/services/sicc/memory_service.py` - MemoryService multi-tenant
- `agent/src/services/sicc/sicc_service.py` - SICCService multi-tenant
- `agent/src/api/webhooks.py` - Webhook Evolution adaptado
- `agent/src/services/evolution/provisioning.py` - Provisioning Evolution
- `agent/src/services/evolution/api_client.py` - Retry logic
- `agent/src/database/circuit_breaker.py` - Circuit breaker
- `agent/src/utils/logger.py` - Logging estruturado

### Serverless Functions (JavaScript/ESM)
- `api/webhook-assinaturas.js` - Bundle activation
- `api/subscriptions/create-payment.js` - Order items split
- `api/webhooks/evolution.js` - Webhook Evolution
- `api/evolution.js` - API QR code

### Frontend (React/TypeScript)
- `src/components/affiliates/QRCodeDisplay.tsx` - Exibir QR code
- `src/services/frontend/evolution.service.ts` - Service Evolution

### Documentação
- `agent/README.md` - README atualizado
- `agent/docs/TROUBLESHOOTING.md` - Guia troubleshooting
- `agent/docs/RUNBOOK.md` - Runbook operações
- `agent/docs/POST_MVP_ROADMAP.md` - Roadmap pós-MVP
- `agent/docs/PERSONALITY_TEMPLATE.md` - Template personality
- `agent/docs/SKILLS_ARCHITECTURE.md` - Arquitetura skills
- `agent/docs/SUB_AGENTS_ARCHITECTURE.md` - Arquitetura sub-agentes

### Testes
- `agent/tests/unit/test_checkpointer.py`
- `agent/tests/unit/test_personality.py`
- `agent/tests/integration/test_webhook_evolution.py`
- `agent/tests/integration/test_bundle_activation.py`
- `agent/tests/property/test_tenant_isolation.py`
- `agent/tests/performance/test_response_time.py`
- `agent/tests/load/test_multi_tenant_load.py`

---

**Total de Tasks:** 73 tasks (53 implementação + 20 testes opcionais)

**Estimativa de Complexidade:**
- Phase 1-3: Alta complexidade (core do sistema)
- Phase 4-5: Média complexidade (integrações)
- Phase 6-7: Média complexidade (qualidade)
- Phase 8-10: Baixa complexidade (documentação)

**Prioridade de Execução:**
1. Phase 1 (Core) - CRÍTICO
2. Phase 2 (Personality) - CRÍTICO
3. Phase 3 (Webhook) - CRÍTICO
4. Phase 4 (Bundle) - ALTO
5. Phase 5 (Provisioning) - ALTO
6. Phase 6 (Error Handling) - MÉDIO
7. Phase 7 (Testing) - MÉDIO
8. Phase 8 (Documentation) - BAIXO
9. Phase 9 (Production) - CRÍTICO
10. Phase 10 (Post-MVP) - BAIXO

---

**Documento criado:** 03/03/2026  
**Baseado em:** requirements.md (aprovado) + design.md (criado)  
**Status:** Pronto para execução  
**Próximo passo:** Aprovação do usuário + início da Phase 1
