# 🚨 SISTEMA DE MONITORAMENTO E ALERTAS - SLIM QUALITY

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 📋 INFORMAÇÕES DO PROJETO

**Data de Criação:** 16 de janeiro de 2026  
**Agente Responsável:** Kiro AI  
**Cliente:** Renato Carraro  
**Status:** AGUARDANDO AUTORIZAÇÃO PARA EXECUÇÃO

---

## 🎯 OBJETIVO

Implementar sistema de monitoramento e alertas para notificar o administrador via WhatsApp sobre problemas críticos e de performance no sistema Slim Quality.

---

## 📊 ESCOPO DEFINIDO PELO CLIENTE

### ✅ **ALERTAS INCLUÍDOS:**
- 🔴 **Erros Técnicos Críticos:** API down, banco offline
- 🟡 **Performance:** Sistema lento (> 5s)
- ⚠️ **Frequência:** Imediato para críticos, resumo diário para avisos
- 📱 **Canal:** Apenas WhatsApp (Evolution API)

### ❌ **ALERTAS EXCLUÍDOS:**
- Problemas de negócio (vendas paradas, comissões não processadas)
- Alertas por email
- Monitoramento complexo de métricas de negócio

---

## 🏗️ ARQUITETURA DA SOLUÇÃO

### **COMPONENTE 1: Sistema Interno (Python/FastAPI)**
```
AlertService → Evolution API → WhatsApp Admin
     ↑
HealthMonitor (verifica saúde do sistema)
ErrorTracker (captura erros críticos)
```

### **COMPONENTE 2: Uptime Robot (Externo)**
```
Uptime Robot → Webhook → AlertService → WhatsApp
```

---

## ⚠️ REGRAS OBRIGATÓRIAS A SEGUIR

**TODAS as tarefas devem seguir rigorosamente:**

1. 📋 **Análise Preventiva Obrigatória**
   - Arquivo: `.kiro/steering/analise-preventiva-obrigatoria.md`
   - Tempo máximo: 10 minutos por tarefa
   - Planejar ANTES de implementar

2. ✅ **Compromisso de Honestidade**
   - Arquivo: `.kiro/steering/compromisso-honestidade.md`
   - Testar TUDO antes de reportar sucesso
   - Reportar status REAL, não assumido

3. 🎯 **Funcionalidade Sobre Testes**
   - Arquivo: `.kiro/steering/funcionalidade-sobre-testes.md`
   - Sistema funcionando > Testes passando
   - Nunca remover funcionalidade para passar teste


4. 🔍 **Verificação do Banco Real**
   - Arquivo: `.kiro/steering/verificacao-banco-real.md`
   - Usar Power Supabase para verificar dados
   - SEMPRE verificar banco antes de alterações

---

## 📁 ESTRUTURA DE ARQUIVOS A CRIAR

```
agent/
├── src/
│   ├── services/
│   │   ├── alert_service.py          # 🆕 Serviço de alertas
│   │   ├── health_monitor.py         # 🆕 Monitor de saúde
│   │   └── error_tracker.py          # 🆕 Rastreador de erros
│   │
│   └── api/
│       └── monitoring.py              # 🆕 Endpoints de monitoramento
│
├── tests/
│   └── monitoring/
│       ├── test_alert_service.py     # 🆕 Testes de alertas
│       └── test_health_monitor.py    # 🆕 Testes de saúde
│
└── .env                               # Adicionar ADMIN_PHONE
```

---

## 🔧 TAREFAS DE IMPLEMENTAÇÃO

### 📦 **FASE 1: PREPARAÇÃO E CONFIGURAÇÃO**

#### **TAREFA 1.1: Configurar Variáveis de Ambiente**

**Prioridade:** 🚨 CRÍTICA  
**Tempo Estimado:** 5 minutos  
**Dependências:** Nenhuma

**Descrição:**
Adicionar variável de ambiente para número do administrador.

**Arquivos a Modificar:**
- `.env.example`
- `.env`

**Ações Específicas:**
1. Adicionar `ADMIN_PHONE=5511999999999` ao `.env.example`
2. Adicionar valor real ao `.env` (não commitar)
3. Documentar formato esperado (DDI + DDD + número)

**Critérios de Aceitação:**
- [ ] Variável `ADMIN_PHONE` adicionada ao `.env.example`
- [ ] Valor real configurado no `.env` local
- [ ] Formato documentado (ex: 5511999999999)

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Verificar padrão de outras variáveis de ambiente
- ✅ **Compromisso Honestidade:** Testar se variável é lida corretamente
- ✅ **Funcionalidade Sobre Testes:** Variável deve funcionar, não apenas existir

---

#### **TAREFA 1.2: Criar AlertService Base**

**Prioridade:** 🚨 CRÍTICA  
**Tempo Estimado:** 30 minutos  
**Dependências:** Tarefa 1.1

**Descrição:**
Criar serviço base para envio de alertas via Evolution API.

**Arquivos a Criar:**
- `agent/src/services/alert_service.py`

**Ações Específicas:**
1. Criar classe `AlertService` com singleton pattern
2. Implementar método `send_critical_alert(title, message)`
3. Implementar método `send_warning_alert(title, message)`
4. Usar função `send_whatsapp_message()` já existente em `main.py`
5. Formatar mensagens com emojis e timestamp
6. Adicionar rate limiting (máximo 1 alerta crítico a cada 5 minutos)

**Critérios de Aceitação:**
- [ ] Classe `AlertService` criada com singleton
- [ ] Método `send_critical_alert()` funcional
- [ ] Método `send_warning_alert()` funcional
- [ ] Rate limiting implementado
- [ ] Mensagens formatadas corretamente
- [ ] Integração com Evolution API funcionando

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Estudar `send_whatsapp_message()` em `main.py`
- ✅ **Compromisso Honestidade:** Testar envio real de mensagem
- ✅ **Funcionalidade Sobre Testes:** Mensagem deve chegar no WhatsApp
- ✅ **Verificação Banco Real:** N/A (não usa banco)

---

### 📦 **FASE 2: MONITORAMENTO DE SAÚDE**

#### **TAREFA 2.1: Implementar HealthMonitor**

**Prioridade:** 🔥 ALTA  
**Tempo Estimado:** 45 minutos  
**Dependências:** Tarefa 1.2

**Descrição:**
Criar monitor de saúde que verifica status de serviços críticos.

**Arquivos a Criar:**
- `agent/src/services/health_monitor.py`

**Ações Específicas:**
1. Criar classe `HealthMonitor`
2. Implementar `check_supabase_health()` - testa conexão com banco
3. Implementar `check_api_health()` - testa endpoints críticos
4. Implementar `check_evolution_health()` - testa Evolution API
5. Implementar `check_system_resources()` - CPU, memória, disco
6. Método `run_health_check()` que executa todas as verificações
7. Enviar alerta se algum serviço estiver down

**Critérios de Aceitação:**
- [ ] Classe `HealthMonitor` criada
- [ ] Verificação de Supabase funcional
- [ ] Verificação de API funcional
- [ ] Verificação de Evolution API funcional
- [ ] Verificação de recursos do sistema funcional
- [ ] Alertas enviados quando serviço está down
- [ ] Logs estruturados de todas as verificações

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Estudar `SystemHealthService` existente
- ✅ **Compromisso Honestidade:** Testar com serviços realmente offline
- ✅ **Funcionalidade Sobre Testes:** Deve detectar problemas reais
- ✅ **Verificação Banco Real:** Testar conexão real com Supabase


---

#### **TAREFA 2.2: Implementar ErrorTracker**

**Prioridade:** 🔥 ALTA  
**Tempo Estimado:** 30 minutos  
**Dependências:** Tarefa 1.2

**Descrição:**
Criar rastreador de erros que captura exceções críticas e envia alertas.

**Arquivos a Criar:**
- `agent/src/services/error_tracker.py`

**Ações Específicas:**
1. Criar classe `ErrorTracker`
2. Implementar decorator `@track_errors` para funções críticas
3. Implementar `log_error(exception, context)` - registra erro
4. Implementar `should_alert(exception)` - decide se deve alertar
5. Enviar alerta apenas para erros críticos (não todos)
6. Incluir stack trace resumido no alerta
7. Rate limiting: máximo 3 alertas de erro por hora

**Critérios de Aceitação:**
- [ ] Classe `ErrorTracker` criada
- [ ] Decorator `@track_errors` funcional
- [ ] Método `log_error()` registra erros
- [ ] Método `should_alert()` filtra erros críticos
- [ ] Alertas enviados apenas para erros críticos
- [ ] Stack trace incluído no alerta
- [ ] Rate limiting implementado

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Estudar padrão de error handling do projeto
- ✅ **Compromisso Honestidade:** Testar com erros reais
- ✅ **Funcionalidade Sobre Testes:** Deve capturar exceções reais
- ✅ **Verificação Banco Real:** N/A (não usa banco)

---

### 📦 **FASE 3: MONITORAMENTO DE PERFORMANCE**

#### **TAREFA 3.1: Implementar Performance Monitor**

**Prioridade:** 🟡 MÉDIA  
**Tempo Estimado:** 30 minutos  
**Dependências:** Tarefa 1.2

**Descrição:**
Monitorar tempo de resposta de endpoints críticos.

**Arquivos a Modificar:**
- `agent/src/services/health_monitor.py` (adicionar método)

**Ações Específicas:**
1. Adicionar método `check_api_performance()` ao `HealthMonitor`
2. Testar tempo de resposta de endpoints críticos:
   - `/health`
   - `/api/agent/metrics`
   - `/api/sicc/config`
3. Enviar alerta se tempo > 5 segundos
4. Incluir endpoint e tempo no alerta
5. Rate limiting: máximo 1 alerta de performance por hora

**Critérios de Aceitação:**
- [ ] Método `check_api_performance()` implementado
- [ ] Testa endpoints críticos
- [ ] Alerta enviado se tempo > 5s
- [ ] Endpoint e tempo incluídos no alerta
- [ ] Rate limiting implementado

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Verificar endpoints críticos do sistema
- ✅ **Compromisso Honestidade:** Testar com API realmente lenta
- ✅ **Funcionalidade Sobre Testes:** Deve detectar lentidão real
- ✅ **Verificação Banco Real:** Testar com queries reais

---

### 📦 **FASE 4: SCHEDULER E AUTOMAÇÃO**

#### **TAREFA 4.1: Implementar Scheduler de Monitoramento**

**Prioridade:** 🔥 ALTA  
**Tempo Estimado:** 30 minutos  
**Dependências:** Tarefas 2.1, 2.2, 3.1

**Descrição:**
Criar scheduler que executa verificações periodicamente.

**Arquivos a Criar:**
- `agent/src/services/monitoring_scheduler.py`

**Ações Específicas:**
1. Criar classe `MonitoringScheduler`
2. Usar `APScheduler` para agendar tarefas
3. Agendar `HealthMonitor.run_health_check()` a cada 5 minutos
4. Agendar `check_api_performance()` a cada 10 minutos
5. Agendar resumo diário às 9h da manhã
6. Iniciar scheduler automaticamente com a aplicação
7. Adicionar graceful shutdown

**Critérios de Aceitação:**
- [ ] Classe `MonitoringScheduler` criada
- [ ] APScheduler configurado
- [ ] Health check executado a cada 5 minutos
- [ ] Performance check executado a cada 10 minutos
- [ ] Resumo diário enviado às 9h
- [ ] Scheduler inicia com aplicação
- [ ] Graceful shutdown implementado

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Estudar padrão de schedulers no projeto
- ✅ **Compromisso Honestidade:** Testar execução periódica real
- ✅ **Funcionalidade Sobre Testes:** Scheduler deve executar tarefas
- ✅ **Verificação Banco Real:** N/A (não usa banco)

---

#### **TAREFA 4.2: Implementar Resumo Diário**

**Prioridade:** 🟢 BAIXA  
**Tempo Estimado:** 20 minutos  
**Dependências:** Tarefa 4.1

**Descrição:**
Criar resumo diário com estatísticas do sistema.

**Arquivos a Modificar:**
- `agent/src/services/health_monitor.py` (adicionar método)

**Ações Específicas:**
1. Adicionar método `generate_daily_summary()` ao `HealthMonitor`
2. Coletar estatísticas das últimas 24 horas:
   - Uptime do sistema
   - Número de erros
   - Tempo médio de resposta
   - Alertas enviados
3. Formatar mensagem de resumo
4. Enviar via `AlertService.send_info_alert()`

**Critérios de Aceitação:**
- [ ] Método `generate_daily_summary()` implementado
- [ ] Estatísticas coletadas corretamente
- [ ] Mensagem formatada de forma legível
- [ ] Resumo enviado às 9h via scheduler
- [ ] Inclui uptime, erros, performance e alertas

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Definir quais métricas são relevantes
- ✅ **Compromisso Honestidade:** Testar com dados reais de 24h
- ✅ **Funcionalidade Sobre Testes:** Resumo deve ter dados reais
- ✅ **Verificação Banco Real:** Buscar dados reais de logs


---

### 📦 **FASE 5: API E INTEGRAÇÃO**

#### **TAREFA 5.1: Criar Endpoints de Monitoramento**

**Prioridade:** 🟡 MÉDIA  
**Tempo Estimado:** 25 minutos  
**Dependências:** Tarefas 2.1, 2.2

**Descrição:**
Criar endpoints REST para consultar status do monitoramento.

**Arquivos a Criar:**
- `agent/src/api/monitoring.py`

**Ações Específicas:**
1. Criar router `/api/monitoring`
2. Endpoint `GET /api/monitoring/health` - status atual
3. Endpoint `GET /api/monitoring/alerts` - últimos alertas
4. Endpoint `POST /api/monitoring/test-alert` - testar alerta (admin only)
5. Endpoint `GET /api/monitoring/stats` - estatísticas
6. Registrar router no `main.py`

**Critérios de Aceitação:**
- [ ] Router `/api/monitoring` criado
- [ ] Endpoint `/health` retorna status atual
- [ ] Endpoint `/alerts` retorna últimos alertas
- [ ] Endpoint `/test-alert` envia alerta de teste
- [ ] Endpoint `/stats` retorna estatísticas
- [ ] Router registrado no `main.py`
- [ ] Todos os endpoints retornam 200 OK

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Estudar padrão de routers existentes
- ✅ **Compromisso Honestidade:** Testar TODOS os endpoints
- ✅ **Funcionalidade Sobre Testes:** Endpoints devem funcionar
- ✅ **Verificação Banco Real:** N/A (não usa banco diretamente)

---

#### **TAREFA 5.2: Integrar com Main Application**

**Prioridade:** 🚨 CRÍTICA  
**Tempo Estimado:** 20 minutos  
**Dependências:** Tarefas 4.1, 5.1

**Descrição:**
Integrar sistema de monitoramento com aplicação principal.

**Arquivos a Modificar:**
- `agent/src/api/main.py`

**Ações Específicas:**
1. Importar `MonitoringScheduler`
2. Iniciar scheduler no startup da aplicação
3. Parar scheduler no shutdown da aplicação
4. Registrar router de monitoramento
5. Adicionar error handler global que usa `ErrorTracker`
6. Testar que tudo inicia corretamente

**Critérios de Aceitação:**
- [ ] `MonitoringScheduler` importado
- [ ] Scheduler inicia no startup
- [ ] Scheduler para no shutdown
- [ ] Router de monitoramento registrado
- [ ] Error handler global implementado
- [ ] Aplicação inicia sem erros
- [ ] Verificações periódicas executando

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Estudar lifecycle da aplicação FastAPI
- ✅ **Compromisso Honestidade:** Testar startup/shutdown completo
- ✅ **Funcionalidade Sobre Testes:** Sistema deve iniciar e funcionar
- ✅ **Verificação Banco Real:** N/A (não usa banco)

---

### 📦 **FASE 6: UPTIME ROBOT (EXTERNO)**

#### **TAREFA 6.1: Configurar Uptime Robot**

**Prioridade:** 🟡 MÉDIA  
**Tempo Estimado:** 15 minutos  
**Dependências:** Nenhuma (externo)

**Descrição:**
Configurar Uptime Robot para monitorar disponibilidade externa.

**Ações Específicas:**
1. Criar conta em https://uptimerobot.com (gratuito)
2. Adicionar monitor para `https://api.slimquality.com.br/health`
3. Configurar intervalo de verificação: 5 minutos
4. Adicionar monitor para `https://slimquality.com.br`
5. Configurar alertas para email do administrador
6. Testar alertas simulando downtime

**Critérios de Aceitação:**
- [ ] Conta criada no Uptime Robot
- [ ] Monitor para API configurado
- [ ] Monitor para site configurado
- [ ] Intervalo de 5 minutos configurado
- [ ] Alertas por email configurados
- [ ] Teste de alerta realizado com sucesso

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Ler documentação do Uptime Robot
- ✅ **Compromisso Honestidade:** Testar alertas reais
- ✅ **Funcionalidade Sobre Testes:** Alertas devem chegar
- ✅ **Verificação Banco Real:** N/A (serviço externo)

---

#### **TAREFA 6.2: Criar Webhook para Uptime Robot**

**Prioridade:** 🟢 BAIXA  
**Tempo Estimado:** 20 minutos  
**Dependências:** Tarefas 1.2, 6.1

**Descrição:**
Criar webhook para receber alertas do Uptime Robot e reenviar para WhatsApp.

**Arquivos a Modificar:**
- `agent/src/api/monitoring.py`

**Ações Específicas:**
1. Adicionar endpoint `POST /api/monitoring/uptime-webhook`
2. Validar payload do Uptime Robot
3. Extrair informações do alerta (monitor, status, mensagem)
4. Enviar alerta via `AlertService`
5. Configurar webhook no Uptime Robot
6. Testar recebimento de webhook

**Critérios de Aceitação:**
- [ ] Endpoint `/uptime-webhook` criado
- [ ] Payload do Uptime Robot validado
- [ ] Informações extraídas corretamente
- [ ] Alerta enviado via WhatsApp
- [ ] Webhook configurado no Uptime Robot
- [ ] Teste de webhook bem-sucedido

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Estudar formato de webhook do Uptime Robot
- ✅ **Compromisso Honestidade:** Testar com webhook real
- ✅ **Funcionalidade Sobre Testes:** Webhook deve funcionar
- ✅ **Verificação Banco Real:** N/A (não usa banco)


---

### 📦 **FASE 7: TESTES E VALIDAÇÃO**

#### **TAREFA 7.1: Criar Testes Unitários**

**Prioridade:** 🟢 BAIXA  
**Tempo Estimado:** 30 minutos  
**Dependências:** Todas as tarefas anteriores

**Descrição:**
Criar testes unitários para serviços de monitoramento.

**Arquivos a Criar:**
- `agent/tests/monitoring/test_alert_service.py`
- `agent/tests/monitoring/test_health_monitor.py`
- `agent/tests/monitoring/test_error_tracker.py`

**Ações Específicas:**
1. Testar `AlertService.send_critical_alert()`
2. Testar `AlertService.send_warning_alert()`
3. Testar rate limiting de alertas
4. Testar `HealthMonitor.check_supabase_health()`
5. Testar `HealthMonitor.check_api_health()`
6. Testar `ErrorTracker.log_error()`
7. Testar `ErrorTracker.should_alert()`

**Critérios de Aceitação:**
- [ ] Testes de `AlertService` criados
- [ ] Testes de `HealthMonitor` criados
- [ ] Testes de `ErrorTracker` criados
- [ ] Todos os testes passam
- [ ] Cobertura > 70%

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Estudar padrão de testes do projeto
- ✅ **Compromisso Honestidade:** Testes devem validar funcionalidade real
- ✅ **Funcionalidade Sobre Testes:** Funcionalidade > Testes passando
- ✅ **Verificação Banco Real:** Usar mocks para testes unitários

---

#### **TAREFA 7.2: Testes de Integração End-to-End**

**Prioridade:** 🟡 MÉDIA  
**Tempo Estimado:** 25 minutos  
**Dependências:** Tarefa 7.1

**Descrição:**
Testar fluxo completo de monitoramento e alertas.

**Cenários de Teste:**
1. **Simular API Down:** Parar API e verificar alerta
2. **Simular Performance Ruim:** Endpoint lento e verificar alerta
3. **Simular Erro Crítico:** Lançar exceção e verificar alerta
4. **Testar Resumo Diário:** Executar manualmente e verificar mensagem
5. **Testar Uptime Robot Webhook:** Enviar payload e verificar alerta

**Critérios de Aceitação:**
- [ ] Teste de API down funciona
- [ ] Teste de performance ruim funciona
- [ ] Teste de erro crítico funciona
- [ ] Teste de resumo diário funciona
- [ ] Teste de webhook funciona
- [ ] Todos os alertas chegam no WhatsApp

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Planejar cenários de teste realistas
- ✅ **Compromisso Honestidade:** Testar com sistema REAL
- ✅ **Funcionalidade Sobre Testes:** Sistema deve funcionar na prática
- ✅ **Verificação Banco Real:** Usar banco real para testes

---

### 📦 **FASE 8: DOCUMENTAÇÃO E DEPLOY**

#### **TAREFA 8.1: Documentar Sistema de Monitoramento**

**Prioridade:** 🟡 MÉDIA  
**Tempo Estimado:** 20 minutos  
**Dependências:** Todas as tarefas anteriores

**Descrição:**
Criar documentação completa do sistema de monitoramento.

**Arquivos a Criar:**
- `docs/SISTEMA_MONITORAMENTO.md`

**Conteúdo da Documentação:**
1. Visão geral do sistema
2. Tipos de alertas e quando são enviados
3. Como configurar número do administrador
4. Como testar alertas manualmente
5. Como interpretar alertas recebidos
6. Troubleshooting comum
7. Como adicionar novos tipos de alerta

**Critérios de Aceitação:**
- [ ] Documento criado
- [ ] Visão geral clara
- [ ] Tipos de alertas documentados
- [ ] Configuração explicada
- [ ] Testes manuais documentados
- [ ] Troubleshooting incluído
- [ ] Guia de extensão incluído

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Revisar toda a implementação
- ✅ **Compromisso Honestidade:** Documentar o que realmente funciona
- ✅ **Funcionalidade Sobre Testes:** Documentar funcionalidades reais
- ✅ **Verificação Banco Real:** N/A (documentação)

---

#### **TAREFA 8.2: Deploy e Ativação**

**Prioridade:** 🚨 CRÍTICA  
**Tempo Estimado:** 30 minutos  
**Dependências:** Todas as tarefas anteriores

**Descrição:**
Fazer deploy do sistema de monitoramento em produção.

**Ações Específicas:**
1. Adicionar `ADMIN_PHONE` às variáveis de ambiente do EasyPanel
2. Adicionar `APScheduler` ao `requirements.txt`
3. Rebuild do container Docker
4. Push para Docker Hub
5. Rebuild no EasyPanel
6. Verificar que scheduler está executando
7. Enviar alerta de teste
8. Monitorar logs por 1 hora

**Critérios de Aceitação:**
- [ ] Variável `ADMIN_PHONE` configurada no EasyPanel
- [ ] `APScheduler` adicionado ao requirements.txt
- [ ] Container rebuilded
- [ ] Push para Docker Hub realizado
- [ ] Rebuild no EasyPanel concluído
- [ ] Scheduler executando corretamente
- [ ] Alerta de teste recebido no WhatsApp
- [ ] Logs monitorados sem erros

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Revisar procedimento de deploy
- ✅ **Compromisso Honestidade:** Testar TUDO em produção
- ✅ **Funcionalidade Sobre Testes:** Sistema deve funcionar em produção
- ✅ **Verificação Banco Real:** Verificar conexões reais


---

## 📊 CRONOGRAMA DE EXECUÇÃO

### **FASE 1: PREPARAÇÃO (35 minutos)**
- Tarefa 1.1: Configurar variáveis (5 min)
- Tarefa 1.2: AlertService base (30 min)

### **FASE 2: MONITORAMENTO (75 minutos)**
- Tarefa 2.1: HealthMonitor (45 min)
- Tarefa 2.2: ErrorTracker (30 min)

### **FASE 3: PERFORMANCE (30 minutos)**
- Tarefa 3.1: Performance Monitor (30 min)

### **FASE 4: AUTOMAÇÃO (50 minutos)**
- Tarefa 4.1: Scheduler (30 min)
- Tarefa 4.2: Resumo diário (20 min)

### **FASE 5: API (45 minutos)**
- Tarefa 5.1: Endpoints (25 min)
- Tarefa 5.2: Integração (20 min)

### **FASE 6: UPTIME ROBOT (35 minutos)**
- Tarefa 6.1: Configurar (15 min)
- Tarefa 6.2: Webhook (20 min)

### **FASE 7: TESTES (55 minutos)**
- Tarefa 7.1: Testes unitários (30 min)
- Tarefa 7.2: Testes E2E (25 min)

### **FASE 8: DEPLOY (50 minutos)**
- Tarefa 8.1: Documentação (20 min)
- Tarefa 8.2: Deploy (30 min)

**TEMPO TOTAL ESTIMADO:** 375 minutos (6h15min)

---

## 🎯 CRITÉRIOS DE SUCESSO FINAL

### **SISTEMA 100% FUNCIONAL QUANDO:**
- [ ] ✅ Alertas críticos chegam no WhatsApp do admin
- [ ] ✅ API down é detectada e alertada em < 5 minutos
- [ ] ✅ Performance ruim é detectada e alertada
- [ ] ✅ Erros críticos são capturados e alertados
- [ ] ✅ Resumo diário é enviado às 9h
- [ ] ✅ Uptime Robot monitora disponibilidade externa
- [ ] ✅ Rate limiting funciona (não spam de alertas)
- [ ] ✅ Sistema não impacta performance da aplicação
- [ ] ✅ Logs estruturados de todas as verificações
- [ ] ✅ Documentação completa disponível

---

## 📋 CHECKLIST DE VALIDAÇÃO POR FASE

### **ANTES DE CADA FASE:**
- [ ] Li TODAS as tarefas da fase
- [ ] Entendi dependências entre tarefas
- [ ] Identifiquei arquivos a criar/modificar
- [ ] Planejei ordem de implementação
- [ ] Identifiquei possíveis problemas

### **DURANTE CADA TAREFA:**
- [ ] Segui análise preventiva (máx 10 min)
- [ ] Implementei seguindo padrões existentes
- [ ] Adicionei tratamento de erros
- [ ] Testei funcionalidade (máx 15 min)
- [ ] Parei após 2 tentativas se não funcionou

### **APÓS CADA FASE:**
- [ ] Todas as tarefas da fase concluídas
- [ ] Funcionalidades testadas e funcionando
- [ ] Logs verificados sem erros
- [ ] Commit realizado com mensagem clara
- [ ] Documentei problemas encontrados

---

## 🚨 REGRAS CRÍTICAS DE EXECUÇÃO

### **SEMPRE:**
- ✅ Fazer análise preventiva ANTES de implementar
- ✅ Testar TUDO antes de reportar sucesso
- ✅ Usar padrões existentes do projeto
- ✅ Implementar tratamento de erros desde o início
- ✅ Verificar banco real quando necessário
- ✅ Reportar status REAL, não assumido

### **NUNCA:**
- ❌ Começar a implementar sem análise
- ❌ Reportar sucesso sem testar
- ❌ Remover funcionalidade para passar teste
- ❌ Gastar mais de 1 hora em uma tarefa
- ❌ Continuar após 2 tentativas falhadas
- ❌ Assumir que algo funciona sem verificar

### **SE ENCONTRAR PROBLEMAS:**
- ✅ Parar após 2 tentativas
- ✅ Reportar problema específico ao usuário
- ✅ Explicar o que foi tentado
- ✅ Pedir orientação
- ✅ Não continuar tentando sozinho

---

## 📝 TEMPLATE DE RELATÓRIO DE PROGRESSO

```markdown
## RELATÓRIO DE PROGRESSO - FASE X

### TAREFAS CONCLUÍDAS:
- [x] Tarefa X.Y - Descrição
  - Tempo gasto: XX minutos
  - Status: ✅ Funcionando / ⚠️ Parcial / ❌ Falhou
  - Observações: [detalhes]

### PROBLEMAS ENCONTRADOS:
- Problema 1: [descrição]
  - Tentativas: X
  - Solução: [como resolveu]
  
### TESTES REALIZADOS:
- Teste 1: [descrição] - ✅ Passou / ❌ Falhou
- Teste 2: [descrição] - ✅ Passou / ❌ Falhou

### PRÓXIMOS PASSOS:
- [ ] Tarefa X.Y+1
- [ ] Tarefa X.Y+2

### TEMPO TOTAL DA FASE: XX minutos
```

---

## ⚠️ IMPORTANTE

**ESTE DOCUMENTO É UM PLANO DE EXECUÇÃO DETALHADO.**

**NÃO INICIAR NENHUMA TAREFA SEM AUTORIZAÇÃO EXPLÍCITA DO USUÁRIO.**

**CADA TAREFA DEVE SER EXECUTADA INDIVIDUALMENTE E VALIDADA ANTES DE PROSSEGUIR.**

**SEGUIR RIGOROSAMENTE AS REGRAS DE:**
- 📋 Análise Preventiva Obrigatória
- ✅ Compromisso de Honestidade
- 🎯 Funcionalidade Sobre Testes
- 🔍 Verificação do Banco Real

---

**Status:** 📋 **AGUARDANDO AUTORIZAÇÃO PARA EXECUÇÃO**  
**Próximo Passo:** Aguardar comando do usuário para iniciar Fase 1

**Data de Criação:** 16/01/2026  
**Última Atualização:** 16/01/2026  
**Versão:** 1.0
