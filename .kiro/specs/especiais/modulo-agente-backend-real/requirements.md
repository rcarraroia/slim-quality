# REQUISITOS - Integração Dashboard Agente

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 📋 RESUMO EXECUTIVO

**Objetivo:** Implementar funcionalidade REAL completa para módulo agente  
**Princípio:** FUNCIONALIDADE SOBRE TESTES - sem fallbacks mock  
**Escopo:** 15 APIs backend + 6 páginas frontend conectadas  

---

## 1. REQUISITOS FUNCIONAIS

### RF01 - Exibir Status do Agente Real
- Dashboard deve consumir GET /api/agent/status
- Exibir: status online/offline, modelo LLM atual, uptime em segundos
- Exibir: status SICC ativo/inativo, última atividade, versão
- Atualizar automaticamente a cada 30 segundos

### RF02 - Gerenciar Configurações do Agente
- Dashboard deve consumir GET /api/agent/config para carregar configurações
- Exibir: modelo, temperatura, max_tokens, system_prompt, response_time_limit
- Permitir edição e salvamento via POST /api/agent/config
- Validar configurações antes de salvar

### RF03 - Testar Prompts em Tempo Real
- Dashboard deve permitir teste de prompts via POST /api/agent/test-prompt
- Exibir: resposta gerada, tokens utilizados, modelo usado
- Permitir configuração de temperatura e max_tokens para teste
- Exibir tempo de resposta do teste

### RF04 - Exibir Conversas Recentes
- Dashboard deve consumir GET /api/agent/conversations
- Exibir: últimas 10 conversas processadas pelo agente
- Mostrar: ID da conversa, contagem de mensagens, data de atualização
- Ordenar por data de atualização (mais recente primeiro)

### RF05 - Exibir Status das Integrações MCP
- Dashboard deve consumir GET /api/mcp/status
- Exibir status de 4 integrações: Evolution API, Supabase, Redis, OpenAI
- Mostrar: nome, tipo, status (connected/disconnected), última verificação
- Permitir teste individual via POST /api/mcp/test/{integration_id}

### RF06 - Gerenciar Configurações SICC
- Dashboard deve consumir GET /api/sicc/config para carregar configurações
- Exibir: SICC ativo/inativo, threshold auto-aprovação, modelo embedding, quota memória
- Permitir edição e salvamento via POST /api/sicc/config
- Validar threshold entre 0-100%

### RF07 - Exibir Métricas SICC
- Dashboard deve consumir GET /api/sicc/metrics
- Exibir: total memórias, quota máxima, último aprendizado
- Exibir: taxa auto-aprovação, memórias esta semana, precisão média
- Atualizar métricas automaticamente a cada 60 segundos

### RF08 - Exibir Alertas do Sistema SICC
- Dashboard deve consumir GET /api/sicc/alerts
- Exibir alertas ativos do sistema (quota, aprendizados pendentes)
- Mostrar: tipo do alerta, mensagem, nível de severidade
- Permitir dismissal de alertas não críticos

### RF09 - Gerenciar Aprendizados SICC
- Dashboard deve consumir GET /api/sicc/learnings
- Exibir fila de aprendizados pendentes e aprovados
- Permitir aprovação via POST /api/sicc/learnings/{id}/approve
- Permitir rejeição via POST /api/sicc/learnings/{id}/reject
- Permitir edição de respostas via PUT /api/sicc/learnings/{id}

### RF10 - Exibir Métricas de Performance
- Dashboard deve consumir GET /api/agent/metrics
- Exibir: uptime percentage, latência média, taxa de acurácia
- Exibir: tokens consumidos, respostas geradas
- Mostrar gráficos: latência por hora, uso por modelo, tipos de pergunta

---

## 2. REQUISITOS NÃO-FUNCIONAIS

### RNF01 - Performance
- Endpoints devem responder em < 500ms para operações de leitura
- Endpoints devem responder em < 2s para operações de escrita
- Dashboard deve carregar dados iniciais em < 3s
- Gráficos e métricas devem renderizar em < 1s

### RNF02 - Disponibilidade
- APIs devem ter uptime > 99%
- Sistema deve funcionar mesmo com algumas integrações offline
- Implementar circuit breaker para integrações externas
- Timeout de 30s para operações longas

### RNF03 - Segurança
- Todas as APIs devem validar entrada com Pydantic schemas
- Implementar rate limiting (100 req/min por IP)
- Logs de auditoria para alterações de configuração
- Sanitização de dados de entrada

### RNF04 - Usabilidade
- Loading states para todas as operações assíncronas
- Error states com mensagens amigáveis
- Success feedback para ações do usuário
- Empty states quando não há dados

### RNF05 - Manutenibilidade
- Código seguindo padrões Python/TypeScript estabelecidos
- Documentação inline para todas as APIs
- Logs estruturados para debugging
- Separação clara entre camadas (API, Service, Data)

### RNF06 - Observabilidade
- Logs estruturados em formato JSON para todas as operações
- Métricas Prometheus exportadas para monitoramento
- Tracing de requisições críticas (configurações, aprendizados)
- Alertas automáticos para falhas de integrações externas
- Dashboard de saúde do sistema com uptime e latência
- Correlação de logs por request_id para debugging
- Retenção de logs por 30 dias para auditoria

---

## 3. REGRAS DE NEGÓCIO

### RN01 - Validação de Configurações do Agente
- Temperature deve estar entre 0.0 e 2.0
- Max_tokens deve estar entre 1 e 4000
- System_prompt não pode estar vazio
- Response_time_limit deve estar entre 5 e 300 segundos

### RN02 - Validação de Configurações SICC
- Threshold auto-aprovação deve estar entre 0 e 100
- Memory quota deve estar entre 100 e 1000
- Embedding model deve ser um dos modelos suportados
- SICC só pode ser desativado se não houver aprendizados pendentes

### RN03 - Gestão de Aprendizados
- Aprendizados aprovados não podem ser editados
- Aprendizados rejeitados podem ser resubmetidos
- Máximo 50 aprendizados pendentes por vez
- Respostas editadas devem manter contexto original

### RN04 - Integrações MCP
- Timeout de 5s para verificação de status
- Retry automático 3x em caso de falha
- Cache de status por 30s para evitar spam
- Alertas automáticos se integração crítica falhar

### RN05 - Métricas e Monitoramento
- Métricas são calculadas em tempo real
- Histórico mantido por 30 dias
- Agregações por hora/dia/semana
- Alertas automáticos para anomalias

---

## 4. CRITÉRIOS DE ACEITE

### CA01 - Status do Agente
- [ ] Dashboard exibe dados reais do backend (não mock)
- [ ] Status online/offline reflete estado real do container
- [ ] Uptime é calculado desde início do container
- [ ] Modelo LLM exibido é o configurado atualmente
- [ ] Atualização automática funciona a cada 30s

### CA02 - Configurações do Agente
- [ ] Formulário carrega valores atuais do backend
- [ ] Validações impedem valores inválidos
- [ ] Salvamento persiste no backend
- [ ] Feedback visual confirma salvamento
- [ ] Configurações aplicadas imediatamente no agente

### CA03 - Teste de Prompts
- [ ] Campo de prompt aceita texto livre
- [ ] Configurações de teste são aplicadas
- [ ] Resposta é gerada pelo modelo real
- [ ] Tokens utilizados são contabilizados
- [ ] Tempo de resposta é medido e exibido

### CA04 - Integrações MCP
- [ ] Status real de cada integração é verificado
- [ ] Testes individuais funcionam corretamente
- [ ] Falhas são reportadas com detalhes
- [ ] Cache evita verificações excessivas
- [ ] Alertas são gerados para falhas críticas

### CA05 - Sistema SICC
- [ ] Configurações são carregadas do backend real
- [ ] Métricas refletem dados reais do banco
- [ ] Alertas são baseados em condições reais
- [ ] Alterações de configuração são persistidas
- [ ] Validações impedem configurações inválidas

### CA06 - Aprendizados SICC
- [ ] Lista carrega aprendizados reais do banco
- [ ] Ações (aprovar/rejeitar/editar) funcionam
- [ ] Estados são atualizados em tempo real
- [ ] Filtros por status funcionam corretamente
- [ ] Edições são validadas e persistidas

### CA07 - Métricas de Performance
- [ ] Dados são calculados em tempo real
- [ ] Gráficos renderizam corretamente
- [ ] Filtros de período funcionam
- [ ] Export de dados funciona
- [ ] Atualização automática funciona

### CA08 - Estados de Interface
- [ ] Loading states aparecem durante carregamento
- [ ] Error states mostram mensagens claras
- [ ] Success feedback confirma ações
- [ ] Empty states aparecem quando apropriado
- [ ] Transições são suaves e responsivas

---

## 5. DEPENDÊNCIAS

### Dependências Técnicas
- **Backend:** Python 3.9+, FastAPI, Pydantic
- **Banco de Dados:** Supabase/PostgreSQL
- **Integrações:** Evolution API, OpenAI API, Redis (opcional)
- **Frontend:** React, TypeScript, Vite

### Dependências de Serviços
- **SICC Service:** Para métricas e aprendizados
- **AI Service:** Para testes de prompt e configurações
- **Metrics Service:** Para dados de performance
- **Supabase Client:** Para dados de conversas

### Dependências de Configuração
- **Variáveis de Ambiente:** URLs das integrações, chaves de API
- **Banco de Dados:** Tabelas para configurações e métricas
- **Container:** Variável CONTAINER_START_TIME para uptime

---

## 6. CASOS DE USO

### UC01 - Monitorar Status do Sistema
**Ator:** Administrador  
**Fluxo Principal:**
1. Administrador acessa dashboard do agente
2. Sistema carrega status atual do agente
3. Sistema exibe métricas em tempo real
4. Sistema atualiza dados automaticamente
5. Administrador monitora saúde do sistema

### UC02 - Configurar Agente
**Ator:** Administrador  
**Fluxo Principal:**
1. Administrador acessa configurações do agente
2. Sistema carrega configurações atuais
3. Administrador modifica parâmetros desejados
4. Sistema valida configurações
5. Sistema salva e aplica configurações
6. Sistema confirma alterações

### UC03 - Testar Configurações
**Ator:** Administrador  
**Fluxo Principal:**
1. Administrador acessa teste de prompts
2. Administrador insere prompt de teste
3. Sistema processa prompt com configurações atuais
4. Sistema exibe resposta e métricas
5. Administrador valida comportamento

### UC04 - Gerenciar Aprendizados
**Ator:** Administrador  
**Fluxo Principal:**
1. Administrador acessa fila de aprendizados
2. Sistema exibe aprendizados pendentes
3. Administrador revisa aprendizado
4. Administrador aprova/rejeita/edita
5. Sistema atualiza status do aprendizado
6. Sistema aplica aprendizado aprovado

### UC05 - Diagnosticar Problemas
**Ator:** Administrador  
**Fluxo Principal:**
1. Administrador identifica problema no sistema
2. Administrador verifica status das integrações
3. Sistema testa conectividade individual
4. Sistema reporta falhas específicas
5. Administrador toma ações corretivas

---

## 7. EXCLUSÕES

### Fora do Escopo Atual
- ❌ Automações completas do sistema
- ❌ Configurações gerais da aplicação
- ❌ Gerenciamento de sub-agentes
- ❌ Relatórios avançados e analytics
- ❌ Integração com sistemas externos além dos especificados
- ❌ Interface mobile dedicada
- ❌ Autenticação e autorização (assumido como implementado)

### Para Fases Posteriores
- 📅 Dashboard executivo com KPIs
- 📅 Alertas por email/SMS
- 📅 Backup e restore de configurações
- 📅 Versionamento de configurações
- 📅 Auditoria completa de ações
- 📅 API pública para integrações externas

---

**Documento criado:** 03/01/2026  
**Versão:** 1.0  
**Status:** Aprovado para implementação