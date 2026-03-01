# Requirements Document - Agente BIA Multi-Tenant

## Introduction

Este documento especifica os requisitos para adaptação do Agente BIA (atualmente single-tenant) para operar em modo multi-tenant, onde cada afiliado lojista terá sua própria instância isolada do agente, atendendo leads via WhatsApp através de um número dedicado.

**Contexto Crítico:** A infraestrutura de banco de dados multi-tenant já existe e está 98% pronta. O trabalho consiste em conectar o motor (agente BIA atual) ao chassi (tabelas multi_agent_* e sicc_*) — não construir do zero.

**Escopo do MVP:** Este documento cobre apenas funcionalidades do MVP. Funcionalidades pós-MVP (handoff humano, skills customizadas, sub-agentes, funis por tenant, automações por tenant, plano Pro) estão explicitamente FORA do escopo.

## Glossary

- **Tenant**: Afiliado lojista que possui uma instância isolada do agente BIA
- **Tenant_ID**: Identificador único do tenant na tabela multi_agent_tenants
- **Affiliate_ID**: Identificador do afiliado na tabela affiliates
- **Instance_Name**: Nome da instância na Evolution API (formato: "lojista_{affiliate_id}")
- **Evolution_API**: Servidor WhatsApp multi-device (versão v2.3.7)
- **BIA**: Bot de Inteligência Artificial (agente de vendas consultivo)
- **Thread_ID**: Identificador único de contexto no checkpointer (formato: "tenant_{tenant_id}_conv_{conversation_id}")
- **Conversation_ID**: Identificador único de conversa em multi_agent_conversations
- **Lead**: Cliente potencial que interage com o agente via WhatsApp
- **Personality**: Texto de instrução do sistema que define comportamento do agente
- **Fallback_Personality**: Personalidade padrão usada quando personality é NULL
- **Bundle**: Pacote de serviços (vitrine + agente) ativado na mesma assinatura
- **RLS**: Row Level Security (segurança em nível de linha no PostgreSQL)
- **Checkpointer**: Sistema de persistência de estado do LangGraph
- **Context_Window**: Janela de contexto de mensagens anteriores injetada no prompt
- **QR_Code**: Código QR para autenticação do WhatsApp Business
- **Connection_Status**: Estado da conexão WhatsApp (awaiting_qr, active, disconnected, error)
- **FromMe**: Campo do webhook Evolution que indica se mensagem foi enviada pelo agente
- **Webhook_Evolution**: Endpoint que recebe eventos da Evolution API
- **Webhook_Asaas**: Endpoint que recebe eventos de pagamento do Asaas
- **Service_Type**: Tipo de serviço em affiliate_services (vitrine ou agente)
- **Order_Items**: Registros de itens de pedido para analytics (split 50/50 vitrine/agente)


## Requirements

### Requirement 1: Identificação e Isolamento de Tenant

**User Story:** Como desenvolvedor do sistema, eu quero que cada tenant seja identificado unicamente e seus dados isolados, para que nenhum tenant acesse dados de outro tenant.

#### Acceptance Criteria

1. WHEN o webhook Evolution recebe uma mensagem, THE System SHALL extrair o affiliate_id do campo instanceName usando o padrão "lojista_{affiliate_id}"
2. THE System SHALL buscar o tenant_id correspondente na tabela multi_agent_tenants WHERE affiliate_id = {affiliate_id} AND status = 'active'
3. IF o tenant não for encontrado ou status != 'active', THEN THE System SHALL rejeitar a mensagem e registrar log de erro
4. THE System SHALL adicionar tenant_id em TODAS as queries de leitura e escrita nas tabelas multi-tenant
5. THE System SHALL usar RLS (Row Level Security) para garantir isolamento em nível de banco de dados
6. FOR ALL operações de banco de dados, THE System SHALL validar que tenant_id não é NULL antes de executar
7. THE System SHALL usar thread_id no formato "tenant_{tenant_id}_conv_{conversation_id}" para isolamento de checkpointer
8. WHEN executando queries em sicc_memory_chunks, THE System SHALL filtrar por tenant_id AND conversation_id
9. THE System SHALL registrar tenant_id em TODOS os logs de auditoria e métricas
10. FOR ALL testes de isolamento, validar que tenant A nunca acessa dados do tenant B (round-trip property)

### Requirement 2: Migração de Tabelas Legadas para Multi-Tenant

**User Story:** Como desenvolvedor do sistema, eu quero usar as tabelas multi-tenant corretas, para que o sistema opere com isolamento adequado e não use tabelas legadas.

#### Acceptance Criteria

1. THE System SHALL usar multi_agent_conversations ao invés de conversations
2. THE System SHALL usar multi_agent_messages ao invés de messages
3. THE System SHALL usar sicc_memory_chunks ao invés de memory_chunks
4. THE System SHALL usar sicc_behavior_patterns ao invés de behavior_patterns
5. THE System SHALL usar sicc_learning_logs ao invés de learning_logs
6. THE System SHALL usar sicc_metrics ao invés de agent_performance_metrics
7. THE System SHALL usar multi_agent_tenants ao invés de agent_config ou sicc_config
8. WHEN salvando checkpoint, THE System SHALL usar multi_agent_conversations.metadata ao invés de tabela separada
9. THE System SHALL manter tabelas legadas intactas por 30 dias após deploy (rollback safety)
10. FOR ALL queries, validar que nenhuma tabela legada é referenciada no código novo


### Requirement 3: Personalidade Dinâmica do Agente

**User Story:** Como lojista, eu quero que meu agente use uma personalidade configurável, para que eu possa personalizar o atendimento no futuro (pós-MVP usa fallback padrão).

#### Acceptance Criteria

1. WHEN o agente inicia processamento de mensagem, THE System SHALL carregar personality de multi_agent_tenants WHERE tenant_id = {tenant_id}
2. IF personality IS NULL, THEN THE System SHALL usar o texto de fallback padrão definido no código
3. THE Fallback_Personality SHALL conter: missão da BIA, produtos com preços, tecnologias, abordagem consultiva, e restrições
4. THE System SHALL injetar a personality (ou fallback) no system prompt do LangGraph
5. THE System SHALL NUNCA usar personalidade hardcoded no código quando personality existe no banco
6. WHEN personality é atualizada no banco, THE System SHALL usar a nova versão na próxima mensagem (sem restart)
7. THE System SHALL registrar em logs qual personality foi usada (custom ou fallback)
8. FOR ALL tenants novos, personality SHALL ser NULL por padrão (usa fallback até configuração futura)

### Requirement 4: Provisionamento Automático de Instância Evolution

**User Story:** Como sistema de backend, eu quero provisionar automaticamente instâncias Evolution quando assinatura é confirmada, para que lojistas possam conectar WhatsApp sem intervenção manual.

#### Acceptance Criteria

1. WHEN webhook Asaas confirma pagamento de assinatura (PAYMENT_CONFIRMED), THE System SHALL chamar POST /instance/create na Evolution API
2. THE System SHALL usar instanceName no formato "lojista_{affiliate_id}"
3. THE System SHALL configurar webhook da instância apontando para https://api.slimquality.com.br/webhooks/evolution
4. THE System SHALL configurar eventos: MESSAGES_UPSERT, MESSAGES_UPDATE, CONNECTION_UPDATE, QRCODE_UPDATED
5. THE System SHALL salvar evolution_instance_name em multi_agent_tenants
6. THE System SHALL salvar qr_code_base64 retornado pela Evolution em multi_agent_tenants
7. THE System SHALL definir connection_status = 'awaiting_qr' após criação da instância
8. THE System SHALL configurar rejectCall = true e msgCall com mensagem de texto
9. THE System SHALL configurar groupsIgnore = true (ignorar grupos)
10. THE System SHALL configurar readMessages = true e syncFullHistory = false
11. IF Evolution API retornar erro, THEN THE System SHALL registrar em logs e definir connection_status = 'error'
12. THE System SHALL usar EVOLUTION_API_KEY global (variável de ambiente) para autenticação


### Requirement 5: Fluxo de Conexão WhatsApp

**User Story:** Como lojista, eu quero escanear um QR code para conectar meu WhatsApp Business, para que o agente possa atender meus leads.

#### Acceptance Criteria

1. WHEN instância Evolution é criada, THE System SHALL exibir qr_code_base64 no painel do lojista
2. WHEN lojista escaneia QR code, THE Evolution_API SHALL disparar webhook CONNECTION_UPDATE com status = "open"
3. WHEN webhook CONNECTION_UPDATE é recebido, THE System SHALL atualizar connection_status = 'active' em multi_agent_tenants
4. WHEN connection_status = 'active', THE System SHALL permitir processamento de mensagens do tenant
5. IF connection_status != 'active', THEN THE System SHALL rejeitar mensagens e retornar erro 403
6. WHEN conexão é perdida, THE Evolution_API SHALL disparar CONNECTION_UPDATE com status = "close"
7. WHEN status = "close" é recebido, THE System SHALL atualizar connection_status = 'disconnected'
8. THE System SHALL registrar timestamp de última conexão em multi_agent_tenants.last_connection_at
9. THE System SHALL exibir status de conexão no painel do lojista (ativo, aguardando QR, desconectado, erro)

### Requirement 6: Processamento de Mensagens Multi-Tenant

**User Story:** Como sistema de agente, eu quero processar mensagens isoladas por tenant, para que cada lojista tenha conversas independentes.

#### Acceptance Criteria

1. WHEN webhook Evolution recebe mensagem, THE System SHALL validar que data.key.fromMe === false (ignorar mensagens enviadas)
2. THE System SHALL extrair lead_phone de data.key.remoteJid
3. THE System SHALL buscar ou criar conversation_id em multi_agent_conversations usando tenant_id + lead_phone como chave única
4. THE System SHALL carregar histórico de mensagens de multi_agent_messages WHERE tenant_id = {tenant_id} AND conversation_id = {conversation_id}
5. THE System SHALL carregar memórias de sicc_memory_chunks WHERE tenant_id = {tenant_id} AND conversation_id = {conversation_id}
6. THE System SHALL carregar base de conhecimento global de multi_agent_knowledge (sem filtro de tenant)
7. THE System SHALL construir thread_id = "tenant_{tenant_id}_conv_{conversation_id}"
8. THE System SHALL passar tenant_id e conversation_id para AgentState
9. THE System SHALL salvar mensagem recebida em multi_agent_messages com tenant_id
10. THE System SHALL salvar resposta gerada em multi_agent_messages com tenant_id
11. THE System SHALL atualizar checkpoint em multi_agent_conversations.metadata
12. THE System SHALL registrar métricas em sicc_metrics com tenant_id
13. THE System SHALL enviar resposta via Evolution API usando evolution_instance_name do tenant


### Requirement 7: Bundle de Serviços (Vitrine + Agente)

**User Story:** Como sistema de cobrança, eu quero ativar vitrine E agente quando assinatura é confirmada, para que lojista tenha acesso aos dois serviços simultaneamente.

#### Acceptance Criteria

1. WHEN webhook Asaas confirma pagamento (PAYMENT_CONFIRMED), THE System SHALL ativar tenant do agente (multi_agent_tenants.status = 'active')
2. WHEN webhook Asaas confirma pagamento (PAYMENT_CONFIRMED), THE System SHALL ativar vitrine (store_profiles.is_visible_in_showcase = true)
3. THE System SHALL registrar serviço vitrine em affiliate_services (service_type = 'vitrine', status = 'active')
4. THE System SHALL registrar serviço agente em affiliate_services (service_type = 'agente', status = 'active')
5. THE System SHALL criar order_items com split 50/50 do valor entre vitrine e agente (para analytics)
6. WHEN pagamento está vencido (PAYMENT_OVERDUE), THE System SHALL desativar ambos os serviços
7. WHEN pagamento é regularizado (PAYMENT_CONFIRMED após overdue), THE System SHALL reativar ambos os serviços
8. THE System SHALL registrar timestamps de ativação/desativação em affiliate_services
9. THE System SHALL manter histórico de mudanças de status em affiliate_services

### Requirement 8: Segurança e Isolamento de Dados

**User Story:** Como administrador do sistema, eu quero garantir que nenhum tenant acesse dados de outro, para que a privacidade e segurança sejam mantidas.

#### Acceptance Criteria

1. THE System SHALL aplicar RLS (Row Level Security) em TODAS as tabelas multi-tenant
2. THE System SHALL validar tenant_id em TODAS as queries antes de executar
3. THE System SHALL usar funções RPC com filtro de tenant_id para operações críticas
4. THE System SHALL rejeitar queries sem tenant_id com erro 400
5. THE System SHALL registrar tentativas de acesso não autorizado em logs de auditoria
6. FOR ALL testes de isolamento, validar que SELECT de tenant A não retorna dados de tenant B
7. FOR ALL testes de isolamento, validar que UPDATE de tenant A não modifica dados de tenant B
8. FOR ALL testes de isolamento, validar que DELETE de tenant A não remove dados de tenant B
9. THE System SHALL usar prepared statements para prevenir SQL injection
10. THE System SHALL validar e sanitizar TODOS os inputs do webhook Evolution


### Requirement 9: Performance e Otimização

**User Story:** Como sistema de agente, eu quero processar mensagens rapidamente, para que leads tenham resposta em tempo aceitável.

#### Acceptance Criteria

1. THE System SHALL responder mensagens em menos de 5 segundos (95th percentile)
2. THE System SHALL usar índices em tenant_id + conversation_id para queries de histórico
3. THE System SHALL limitar context_window a últimas 20 mensagens por conversa
4. THE System SHALL usar cache de personality por tenant (TTL 5 minutos)
5. THE System SHALL usar connection pooling para banco de dados
6. THE System SHALL processar webhooks de forma assíncrona (não bloquear resposta HTTP)
7. THE System SHALL usar batch insert para salvar múltiplas mensagens
8. THE System SHALL comprimir checkpoints antes de salvar em metadata
9. THE System SHALL usar índices em evolution_instance_name para lookup rápido de tenant
10. THE System SHALL monitorar tempo de resposta em sicc_metrics

### Requirement 10: Tratamento de Erros e Fallbacks

**User Story:** Como sistema de agente, eu quero tratar erros graciosamente, para que falhas não interrompam o serviço.

#### Acceptance Criteria

1. IF Evolution API retornar erro 500, THEN THE System SHALL tentar novamente após 2 segundos (máximo 3 tentativas)
2. IF tenant não for encontrado, THEN THE System SHALL retornar erro 404 e registrar em logs
3. IF connection_status != 'active', THEN THE System SHALL retornar erro 403 e registrar em logs
4. IF personality é NULL, THEN THE System SHALL usar fallback_personality (nunca falhar por falta de personality)
5. IF LangGraph falhar, THEN THE System SHALL usar resposta de fallback: "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes."
6. IF banco de dados estiver indisponível, THEN THE System SHALL retornar erro 503 e registrar em logs
7. IF webhook Evolution tiver payload inválido, THEN THE System SHALL retornar erro 400 e registrar payload em logs
8. THE System SHALL registrar TODOS os erros em tabela de logs com tenant_id, timestamp, e stack trace
9. THE System SHALL enviar alertas para administradores quando taxa de erro > 5%
10. THE System SHALL manter SLA de 99.5% de uptime


### Requirement 11: Monitoramento e Métricas

**User Story:** Como administrador do sistema, eu quero monitorar performance de cada tenant, para que eu possa identificar problemas e otimizar o sistema.

#### Acceptance Criteria

1. THE System SHALL registrar métricas em sicc_metrics com tenant_id para TODAS as conversas
2. THE System SHALL registrar: response_time, tokens_used, model_used, success/failure
3. THE System SHALL calcular taxa de conversão por tenant (leads → vendas)
4. THE System SHALL calcular tempo médio de resposta por tenant
5. THE System SHALL calcular taxa de erro por tenant
6. THE System SHALL registrar eventos de conexão/desconexão em logs
7. THE System SHALL expor endpoint /metrics para Prometheus (agregado, sem dados sensíveis)
8. THE System SHALL gerar relatórios diários de uso por tenant
9. THE System SHALL alertar quando tenant exceder 1000 mensagens/dia (possível abuso)
10. THE System SHALL registrar custos de API (OpenAI, Whisper, TTS) por tenant

### Requirement 12: Compatibilidade com Sistema Existente

**User Story:** Como desenvolvedor do sistema, eu quero manter compatibilidade com funcionalidades existentes, para que nada quebre durante a migração.

#### Acceptance Criteria

1. THE System SHALL manter lógica de vendas e objeções inalterada (conteúdo do prompt)
2. THE System SHALL manter processamento de áudio (Whisper + TTS) inalterado
3. THE System SHALL manter integração Evolution API (envio/recebimento) inalterada
4. THE System SHALL manter AI Service (geração de resposta, fallback de modelos) inalterado
5. THE System SHALL manter cálculo de comissões inalterado
6. THE System SHALL manter tabelas legadas intactas por 30 dias (rollback safety)
7. THE System SHALL permitir rollback para versão single-tenant em caso de falha crítica
8. THE System SHALL manter variáveis de ambiente existentes (adicionar novas sem remover antigas)
9. THE System SHALL manter endpoints existentes funcionando (adicionar novos sem quebrar antigos)
10. THE System SHALL validar que NENHUMA funcionalidade existente foi quebrada antes de deploy


### Requirement 13: Validação Pré-Implementação

**User Story:** Como desenvolvedor do sistema, eu quero validar pré-requisitos antes de implementar, para que não haja surpresas durante a implementação.

#### Acceptance Criteria

1. THE System SHALL validar que funções RPC com filtro de tenant_id existem no banco antes de Fase 1
2. THE System SHALL validar que RLS está ativo em TODAS as tabelas multi-tenant antes de Fase 1
3. THE System SHALL validar que personality dos 2 tenants existentes está populada antes de Fase 5
4. THE System SHALL validar que Evolution API v2.3.7 está rodando no EasyPanel antes de Fase 8
5. THE System SHALL validar que EVOLUTION_API_KEY está disponível como variável de ambiente antes de Fase 8
6. THE System SHALL validar que ambiente de teste está configurado separado de produção antes de Fase 9
7. THE System SHALL validar que plano de rollback está documentado antes de Fase 10
8. THE System SHALL executar testes de isolamento (tenant A vs tenant B) antes de Fase 10
9. THE System SHALL validar que NENHUMA tabela legada é referenciada no código novo antes de Fase 10
10. THE System SHALL validar que documentação está atualizada antes de Fase 10

## Requisitos NÃO Incluídos no MVP (Pós-MVP)

Os seguintes requisitos estão explicitamente FORA do escopo do MVP e serão implementados em versões futuras:

### Pós-MVP 1: Handoff para Humano (Chatwoot)
- Transferência de conversa para atendente humano
- Integração com Chatwoot
- Tabela multi_agent_handoffs (existe mas vazia)
- Critérios de escalação automática

### Pós-MVP 2: Skills Customizadas por Tenant
- Skills específicas por lojista
- Tabela tenant_skills (existe mas vazia)
- Configuração de skills no painel do lojista

### Pós-MVP 3: Sub-Agentes Especializados
- Sub-agentes para tarefas específicas (vendas, suporte, agendamento)
- Tabela sicc_sub_agents (existe mas vazia)
- Roteamento inteligente entre sub-agentes

### Pós-MVP 4: Funis CRM por Tenant
- Funis de vendas customizados por lojista
- Atualmente funil global compartilhado
- Adicionar tenant_id nas tabelas de funil

### Pós-MVP 5: Automações por Tenant
- Automações customizadas por lojista
- Adicionar tenant_id nas tabelas de automação
- Triggers e ações específicas por tenant

### Pós-MVP 6: Plano Pro (R$249/mês)
- Funcionalidades avançadas (analytics, A/B testing, integrações)
- MVP só tem plano básico (R$149/mês)
- Tabela de planos e features

### Pós-MVP 7: Personalização Avançada de Personality
- Interface no painel do lojista para editar personality
- Templates de personality pré-configurados
- Validação de personality antes de salvar
- MVP usa apenas fallback padrão

### Pós-MVP 8: Multi-Idioma
- Suporte a múltiplos idiomas por tenant
- Detecção automática de idioma do lead
- Tradução de personality
- MVP apenas português brasileiro


## Requisitos de Segurança

### Segurança 1: Autenticação e Autorização

1. THE System SHALL validar EVOLUTION_API_KEY em TODOS os requests para Evolution API
2. THE System SHALL validar x-api-secret em TODOS os webhooks recebidos da Evolution
3. THE System SHALL usar HTTPS para TODAS as comunicações externas
4. THE System SHALL validar JWT token do Supabase em endpoints protegidos
5. THE System SHALL usar variáveis de ambiente para TODAS as credenciais (nunca hardcoded)

### Segurança 2: Proteção de Dados Sensíveis

1. THE System SHALL NUNCA logar mensagens completas de leads (apenas metadata)
2. THE System SHALL NUNCA expor tenant_id de outros tenants em APIs públicas
3. THE System SHALL NUNCA expor qr_code_base64 em logs
4. THE System SHALL criptografar dados sensíveis em repouso (se aplicável)
5. THE System SHALL sanitizar TODOS os inputs antes de processar

### Segurança 3: Rate Limiting e Proteção contra Abuso

1. THE System SHALL limitar webhooks Evolution a 100 requests/minuto por tenant
2. THE System SHALL limitar mensagens a 1000/dia por tenant (alertar se exceder)
3. THE System SHALL bloquear tenant se detectar padrão de abuso
4. THE System SHALL validar tamanho de payload (máximo 1MB)
5. THE System SHALL validar formato de phone number antes de processar

## Requisitos de Performance

### Performance 1: Tempo de Resposta

1. THE System SHALL responder webhooks Evolution em menos de 200ms (acknowledge)
2. THE System SHALL processar mensagens em menos de 5 segundos (95th percentile)
3. THE System SHALL carregar personality em menos de 100ms (com cache)
4. THE System SHALL carregar histórico de conversa em menos de 500ms
5. THE System SHALL salvar checkpoint em menos de 200ms

### Performance 2: Escalabilidade

1. THE System SHALL suportar 100 tenants simultâneos sem degradação
2. THE System SHALL suportar 1000 mensagens/minuto agregadas
3. THE System SHALL usar connection pooling com mínimo 10 conexões
4. THE System SHALL usar cache Redis para personality (se disponível)
5. THE System SHALL processar webhooks de forma assíncrona (não bloquear)

### Performance 3: Otimização de Recursos

1. THE System SHALL limitar context_window a 20 mensagens (reduzir tokens)
2. THE System SHALL comprimir checkpoints antes de salvar (reduzir storage)
3. THE System SHALL usar índices em TODAS as queries de lookup
4. THE System SHALL fazer cleanup de conversas inativas após 90 dias
5. THE System SHALL monitorar uso de memória e CPU por tenant


## Requisitos de Qualidade

### Qualidade 1: Testabilidade

1. THE System SHALL ter cobertura de testes > 70% para código novo
2. THE System SHALL ter testes de isolamento para TODAS as operações multi-tenant
3. THE System SHALL ter testes de integração para fluxo completo (webhook → resposta)
4. THE System SHALL ter testes de carga para validar performance
5. THE System SHALL ter testes de rollback para validar reversão

### Qualidade 2: Manutenibilidade

1. THE System SHALL ter documentação atualizada de TODAS as mudanças
2. THE System SHALL ter comentários em código complexo (especialmente isolamento de tenant)
3. THE System SHALL seguir padrões de código existentes no projeto
4. THE System SHALL ter logs estruturados com tenant_id em TODAS as operações
5. THE System SHALL ter diagramas de fluxo atualizados

### Qualidade 3: Observabilidade

1. THE System SHALL expor métricas Prometheus para monitoramento
2. THE System SHALL ter logs centralizados com tenant_id
3. THE System SHALL ter alertas para erros críticos (taxa > 5%)
4. THE System SHALL ter dashboard de métricas por tenant
5. THE System SHALL ter rastreamento de requests (tracing) com tenant_id

## Requisitos de Compatibilidade

### Compatibilidade 1: Versões de Dependências

1. THE System SHALL usar Evolution API v2.3.7 (versão instalada)
2. THE System SHALL usar Python 3.11+ (versão atual do agente)
3. THE System SHALL usar LangGraph versão atual (não atualizar durante migração)
4. THE System SHALL usar Supabase client versão atual
5. THE System SHALL manter TODAS as dependências atuais (não atualizar durante migração)

### Compatibilidade 2: Retrocompatibilidade

1. THE System SHALL manter endpoints existentes funcionando
2. THE System SHALL manter variáveis de ambiente existentes
3. THE System SHALL manter estrutura de logs existente (adicionar tenant_id)
4. THE System SHALL manter formato de resposta da Evolution API
5. THE System SHALL permitir rollback para versão single-tenant

### Compatibilidade 3: Integrações Externas

1. THE System SHALL manter integração com Asaas inalterada
2. THE System SHALL manter integração com OpenAI inalterada
3. THE System SHALL manter integração com Whisper inalterada
4. THE System SHALL manter integração com TTS inalterada
5. THE System SHALL adicionar integração com Evolution API (nova)


## Requisitos de Deploy e Rollback

### Deploy 1: Estratégia de Deploy

1. THE System SHALL fazer deploy em ambiente de staging antes de produção
2. THE System SHALL validar TODOS os testes antes de deploy
3. THE System SHALL fazer backup do banco antes de deploy
4. THE System SHALL fazer deploy em horário de baixo tráfego (madrugada)
5. THE System SHALL ter plano de rollback documentado e testado

### Deploy 2: Validação Pós-Deploy

1. THE System SHALL validar que TODOS os tenants existentes continuam funcionando
2. THE System SHALL validar que isolamento de dados está funcionando
3. THE System SHALL validar que performance não degradou
4. THE System SHALL validar que NENHUM erro crítico foi introduzido
5. THE System SHALL monitorar logs por 24h após deploy

### Deploy 3: Rollback

1. THE System SHALL manter tabelas legadas intactas por 30 dias
2. THE System SHALL ter script de rollback testado
3. THE System SHALL poder reverter para versão anterior em menos de 10 minutos
4. THE System SHALL notificar administradores se rollback for necessário
5. THE System SHALL documentar motivo do rollback se ocorrer

## Requisitos de Documentação

### Documentação 1: Documentação Técnica

1. THE System SHALL ter README atualizado com instruções de setup multi-tenant
2. THE System SHALL ter diagramas de arquitetura atualizados
3. THE System SHALL ter diagramas de fluxo de dados atualizados
4. THE System SHALL ter documentação de APIs atualizadas
5. THE System SHALL ter guia de troubleshooting para problemas comuns

### Documentação 2: Documentação de Operação

1. THE System SHALL ter runbook para operações comuns (criar tenant, resetar conexão)
2. THE System SHALL ter guia de monitoramento (métricas, alertas)
3. THE System SHALL ter guia de backup e restore
4. THE System SHALL ter guia de rollback
5. THE System SHALL ter FAQ para problemas comuns

### Documentação 3: Documentação para Lojistas

1. THE System SHALL ter guia de como conectar WhatsApp (escanear QR code)
2. THE System SHALL ter guia de como monitorar conversas
3. THE System SHALL ter guia de troubleshooting (conexão perdida, QR code expirado)
4. THE System SHALL ter FAQ para lojistas
5. THE System SHALL ter vídeo tutorial de setup (pós-MVP)


## Validação de Requisitos

### Checklist de Validação Pré-Implementação

Antes de iniciar a Fase 1 de implementação, validar:

- [ ] Funções RPC com filtro de tenant_id existem no banco
- [ ] RLS está ativo em TODAS as tabelas multi-tenant
- [ ] Testes de RLS confirmam isolamento (tenant A não acessa dados de tenant B)
- [ ] Personality dos 2 tenants existentes está populada com texto de fallback
- [ ] Evolution API v2.3.7 está rodando no EasyPanel
- [ ] EVOLUTION_API_KEY está disponível como variável de ambiente
- [ ] EVOLUTION_WEBHOOK_SECRET está disponível como variável de ambiente
- [ ] Ambiente de teste está configurado separado de produção
- [ ] Plano de rollback está documentado
- [ ] Backup do banco de dados foi realizado

### Checklist de Validação Pós-Implementação

Antes de marcar a feature como concluída, validar:

- [ ] TODOS os testes de isolamento passam (tenant A vs tenant B)
- [ ] TODOS os testes de integração passam (webhook → resposta)
- [ ] TODOS os testes de performance passam (< 5s resposta)
- [ ] NENHUMA tabela legada é referenciada no código novo
- [ ] Cobertura de testes > 70% para código novo
- [ ] Documentação técnica está atualizada
- [ ] Guia de operação está atualizado
- [ ] Guia para lojistas está atualizado
- [ ] Deploy em staging foi bem-sucedido
- [ ] Validação em staging confirmou isolamento e performance

### Critérios de Aceitação da Feature Completa

A feature será considerada completa quando:

1. ✅ TODOS os 13 requisitos principais estão implementados
2. ✅ TODOS os requisitos de segurança estão implementados
3. ✅ TODOS os requisitos de performance estão implementados
4. ✅ TODOS os requisitos de qualidade estão implementados
5. ✅ TODOS os testes passam (isolamento, integração, performance)
6. ✅ Deploy em staging foi bem-sucedido
7. ✅ Validação em staging confirmou funcionamento
8. ✅ Documentação está completa e atualizada
9. ✅ Plano de rollback está testado
10. ✅ Aprovação do cliente (Renato) foi obtida

## Referências

### Documentos de Referência Obrigatórios

- `GAP_ANALYSIS_MULTI_TENANT.md` — Mapeamento completo do que adaptar
- `BRIEFING_KIRO_MULTI_TENANT.md` — Decisões arquiteturais e fluxo completo
- `EVOLUTION_API_MAPA_TECNICO.md` — Endpoints e payload da Evolution API
- `VERIFICACAO_BUNDLE_ASSINATURAS.md` — Adaptações no webhook de cobrança

### Arquivos do Agente BIA a Adaptar

| Arquivo | O que muda |
|---|---|
| `agent/src/api/webhooks.py` | Extrair tenant do instanceName; rotear para contexto do tenant |
| `agent/src/graph/state.py` | Adicionar tenant_id e conversation_id ao AgentState |
| `agent/src/graph/checkpointer.py` | Novo formato de thread_id; trocar tabela para multi_agent_conversations |
| `agent/src/services/sicc/memory_service.py` | Trocar memory_chunks → sicc_memory_chunks; adicionar filtro tenant_id |
| `agent/src/services/sicc/sicc_service.py` | Carregar personality do banco; adicionar tenant_id em todas as queries |
| `api/webhook-assinaturas.js` | Adicionar ativação de vitrine e registro em affiliate_services |
| `api/subscriptions/create-payment.js` | Adicionar order_items com bundle 50/50 |

### Arquivos que NÃO Mudam (Reaproveitar 100%)

- Lógica de vendas e objeções (conteúdo do prompt)
- Processamento de áudio (Whisper + TTS)
- Integração Evolution API (envio/recebimento)
- AI Service (geração de resposta, fallback de modelos)
- Cálculo de comissões

---

**Documento criado:** 03/03/2026  
**Status:** Aguardando revisão do usuário  
**Próximo passo:** Criar design.md após aprovação dos requirements

