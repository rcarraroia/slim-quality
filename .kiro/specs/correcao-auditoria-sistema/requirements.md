# REQUIREMENTS - CORREÇÃO DOS 33 PROBLEMAS DA AUDITORIA

## 📋 VISÃO GERAL

Esta especificação aborda a correção completa dos 33 problemas identificados na auditoria técnica do sistema Slim Quality + Agente Multi-Tenant, organizados por severidade e priorizados em 5 fases de implementação.

---

## 🚨 PROBLEMAS CRÍTICOS (6)

### **C1. Endpoint de Geração de Tokens em Produção**
- **Arquivo:** `agente-multi-tenant/backend/app/api/v1/auth.py`
- **Linhas:** 282-365
- **Estado Atual:** Endpoint `GET /api/v1/auth/debug/generate-test-token` acessível sem autenticação, gera JWT válido para usuária Beatriz
- **Impacto:** Qualquer pessoa pode impersonar a usuária Beatriz com acesso total ao sistema
- **Requisito:** Remover completamente este endpoint e todos os endpoints `/debug/*`

### **C2. Endpoints de Debug Sem Proteção**
- **Arquivo:** `agente-multi-tenant/backend/app/api/v1/auth.py`
- **Linhas:** 86-280
- **Estado Atual:** Múltiplos endpoints expostos sem autenticação:
  - `GET /api/v1/auth/token/info` - Token como query parameter
  - `GET /api/v1/auth/security/info` - Expõe configuração de segurança
  - `GET /api/v1/auth/security/generate-secret` - Gera secrets
  - `GET /api/v1/auth/debug/token` - Decodifica tokens sem verificação
- **Impacto:** Divulgação de informações sensíveis, tokens em logs
- **Requisito:** Remover todos os endpoints de debug sem autenticação

### **C3. CORS Middleware Duplicado e Conflitante**
- **Arquivo:** `agente-multi-tenant/backend/cors_fix.py`
- **Linhas:** 36-77
- **Estado Atual:** CORS configurado duas vezes - CORSMiddleware (36-43) + middleware HTTP manual (48-77)
- **Impacto:** Headers CORS duplicados fazem browsers rejeitar requisições
- **Requisito:** Manter apenas CORSMiddleware, remover middleware HTTP manual

### **C4. Bug AuditLogger Causa AttributeError**
- **Arquivo:** `agente-multi-tenant/backend/app/middleware/logging_middleware.py`
- **Linhas:** 22, 327-369
- **Estado Atual:** Importa AuditLogger (linha 22) mas redefine classe local incompatível (327-369)
- **Impacto:** Crash do middleware em runtime com AttributeError
- **Requisito:** Remover redefinição local, usar apenas classe importada

### **C5. Token do AgentService Nunca Encontrado**
- **Arquivo:** `agente-multi-tenant/frontend/src/services/agent.service.ts`
- **Linhas:** 112-116
- **Estado Atual:** Busca token via `localStorage.getItem('auth_token')` que nunca é setado
- **Impacto:** Todas as requisições do AgentService resultam em 401 Unauthorized
- **Requisito:** Corrigir obtenção de token para usar axios configurado ou Supabase

### **C6. ACCESS_TOKEN_EXPIRE_MINUTES = 8 Dias**
- **Arquivo:** `agente-multi-tenant/backend/app/config.py`
- **Linha:** 22
- **Estado Atual:** `ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8` (11.520 minutos)
- **Impacto:** Token comprometido dá 8 dias de acesso ao atacante
- **Requisito:** Reduzir para 60 minutos (1 hora)

---

## 🔥 PROBLEMAS DE SEVERIDADE ALTA (9)

### **A1. Event Loop Criado a Cada Requisição Protegida**
- **Arquivo:** `agente-multi-tenant/backend/app/api/deps.py`
- **Linhas:** 128-138
- **Estado Atual:** `check_affiliate_subscription()` cria/destrói event loop a cada chamada
- **Impacto:** Performance severa, memory leaks, timeouts em produção
- **Requisito:** Converter para função async nativa

### **A2. Bare Except Sem Tipo**
- **Arquivo:** `agente-multi-tenant/backend/app/api/deps.py`
- **Linha:** 243
- **Estado Atual:** `except:` sem tipo captura SystemExit, KeyboardInterrupt
- **Impacto:** Suprime exceções críticas do sistema silenciosamente
- **Requisito:** Substituir por `except Exception:`

### **A3. Fallback para Chatwoot account_id = 1**
- **Arquivo:** `agente-multi-tenant/backend/app/api/v1/whatsapp.py`
- **Linha:** 42
- **Estado Atual:** `"account_id": tenant.chatwoot_account_id or 1`
- **Impacto:** Escalação de privilégio - operações podem afetar conta admin
- **Requisito:** Remover fallback, validar obrigatoriamente chatwoot_account_id

### **A4. Nenhum Tratamento de Erro 401/403 no Frontend**
- **Arquivo:** `agente-multi-tenant/frontend/src/services/api.ts`
- **Estado Atual:** Axios instance sem response interceptor para 401/403
- **Impacto:** Usuário vê erro genérico ao invés de redirect para login
- **Requisito:** Implementar response interceptor com redirect automático

### **A5. URLs Hardcoded no ProtectedRoute**
- **Arquivo:** `agente-multi-tenant/frontend/src/components/ProtectedRoute.tsx`
- **Linhas:** 8, 27, 33
- **Estado Atual:** URLs `https://slimquality.com.br/*` hardcoded
- **Impacto:** Redirecionamento falha em ambientes não-produção
- **Requisito:** Mover URLs para variáveis de ambiente

### **A6. Sincronização de Assinatura Incompleta**
- **Arquivo:** `agente-multi-tenant/backend/app/services/subscription_synchronizer.py`
- **Linhas:** 582-585
- **Estado Atual:** `_update_subscription_from_service()` é stub com log "não implementado"
- **Impacto:** Conflitos entre affiliate_services e multi_agent_subscriptions nunca resolvidos
- **Requisito:** Implementar lógica completa de sincronização

### **A7. Health Check Básico Desabilitado**
- **Arquivo:** `agente-multi-tenant/backend/app/api/v1/health.py`
- **Linhas:** 61-68
- **Estado Atual:** Retorna hardcoded "Services check disabled for stability"
- **Impacto:** Impossível monitorar saúde real dos serviços
- **Requisito:** Implementar verificação real de Supabase, Evolution API, Chatwoot

### **A8. N+1 Queries no Batch de Sincronização**
- **Arquivo:** `agente-multi-tenant/backend/app/services/subscription_synchronizer.py`
- **Linhas:** 90-115
- **Estado Atual:** Para cada afiliado faz 3 queries separadas (300 queries para 100 afiliados)
- **Impacto:** Performance degrada linearmente com número de afiliados
- **Requisito:** Implementar queries em batch usando IN clauses

### **A9. Classe TenantContextFilter Duplicada**
- **Arquivo:** `agente-multi-tenant/backend/app/core/logging.py`
- **Linhas:** 190-238
- **Estado Atual:** Classe definida duas vezes consecutivamente (copy-paste)
- **Impacto:** Segunda definição sobrescreve primeira, confusão na manutenção
- **Requisito:** Remover uma das definições duplicadas

---

## ⚠️ PROBLEMAS DE SEVERIDADE MÉDIA (12)

### **M1. Print Statements em Produção**
- **Arquivo:** `agente-multi-tenant/backend/cors_fix.py`
- **Linhas:** 14, 31, 33, 45, 79
- **Estado Atual:** `print()` ao invés de `logger.info()` para mensagens CORS
- **Impacto:** Logs stdout desorganizados, não seguem formato estruturado
- **Requisito:** Substituir todos os `print()` por `logger.info()`

### **M2. Importação Relativa do cors_fix**
- **Arquivo:** `agente-multi-tenant/backend/app/main.py`
- **Linha:** 12
- **Estado Atual:** `from cors_fix import setup_cors` assume working directory `/backend`
- **Impacto:** Falha se app iniciar de outro diretório
- **Requisito:** Usar importação absoluta ou relativa adequada

### **M3. datetime.utcnow() Deprecated**
- **Arquivo:** `agente-multi-tenant/backend/app/core/security.py`
- **Linhas:** 109, 117, 149, 154, 230
- **Estado Atual:** Usa `datetime.utcnow()` deprecated desde Python 3.12
- **Impacto:** Warnings no Python 3.12+, bugs com timezone-aware comparisons
- **Requisito:** Substituir por `datetime.now(UTC)`

### **M4. SUPABASE_JWT_SECRET Opcional**
- **Arquivo:** `agente-multi-tenant/backend/app/config.py`
- **Linha:** 34
- **Estado Atual:** `SUPABASE_JWT_SECRET: Optional[str] = None`
- **Impacto:** App inicia sem capacidade de validar tokens Supabase
- **Requisito:** Tornar obrigatório quando `ENVIRONMENT=production`

### **M5. Sem Mecanismo de Logout no Agente**
- **Arquivo:** `agente-multi-tenant/frontend/src/contexts/AuthContext.tsx`
- **Estado Atual:** Nenhuma função de logout (`supabase.auth.signOut()`) exposta
- **Impacto:** Tokens ficam no localStorage indefinidamente
- **Requisito:** Implementar função logout completa

### **M6. WhatsApp Endpoints Sem Logging**
- **Arquivo:** `agente-multi-tenant/backend/app/api/v1/whatsapp.py`
- **Estado Atual:** Operações críticas (criar/deletar instância, conectar) sem logging
- **Impacto:** Impossível auditar quem fez o quê
- **Requisito:** Adicionar logging detalhado em todas as operações

### **M7. Erro Genérico Exposto ao Cliente**
- **Arquivo:** `agente-multi-tenant/backend/app/api/v1/tenants.py`
- **Linhas:** 27-28, 62
- **Estado Atual:** `raise HTTPException(status_code=500, detail=str(e))` expõe erro interno
- **Impacto:** Information disclosure via mensagens de erro detalhadas
- **Requisito:** Sanitizar mensagens de erro para cliente

### **M8. Sem Caching no tenant_resolver**
- **Arquivo:** `agente-multi-tenant/backend/app/core/tenant_resolver.py`
- **Estado Atual:** Queries de banco para resolver tenant a cada requisição
- **Impacto:** Carga desnecessária no Supabase
- **Requisito:** Implementar cache Redis com TTL 5 minutos

### **M9. Métricas em Memória Perdidas no Restart**
- **Arquivo:** `agente-multi-tenant/backend/app/api/v1/monitoring.py`
- **Estado Atual:** `_metrics_store` é dict em memória
- **Impacto:** Reiniciar container perde todas as métricas
- **Requisito:** Migrar métricas para Redis ou storage persistente

### **M10. Sem Transações no tenant_service**
- **Arquivo:** `agente-multi-tenant/backend/app/services/tenant_service.py`
- **Estado Atual:** Criação de tenant e funil default são operações separadas
- **Impacto:** Tenant pode ser criado sem funil se segunda operação falhar
- **Requisito:** Implementar transações para operações relacionadas

### **M11. Vercel.json com Env Vars Sensíveis**
- **Arquivo:** `agente-multi-tenant/frontend/vercel.json`
- **Estado Atual:** `VITE_SUPABASE_ANON_KEY` incluído diretamente no vercel.json
- **Impacto:** Chave pública exposta no repositório (má prática)
- **Requisito:** Mover para variáveis de ambiente do Vercel

### **M12. Tenant Slug Extraction Frágil**
- **Arquivo:** `agente-multi-tenant/frontend/src/lib/tenant.ts`
- **Linhas:** 26-28
- **Estado Atual:** Assume domínios `.com.br` com 3 partes fixas
- **Impacto:** Lógica quebra se domínio mudar (ex: `.com`)
- **Requisito:** Implementar extração de slug mais robusta

---

## 🔧 PROBLEMAS DE SEVERIDADE BAIXA (6)

### **B1. Import Não Utilizado**
- **Arquivo:** `agente-multi-tenant/backend/app/core/config_manager.py`
- **Linha:** 19
- **Estado Atual:** `EntityNotFoundException` importado mas nunca usado
- **Impacto:** Code quality, imports desnecessários
- **Requisito:** Remover import não utilizado

### **B2. SUPABASE_ANON_KEY Definido Mas Não Usado**
- **Arquivo:** `agente-multi-tenant/backend/app/config.py`
- **Linha:** 17
- **Estado Atual:** Configurado mas nenhum código do backend utiliza
- **Impacto:** Configuração desnecessária
- **Requisito:** Remover se não utilizado ou documentar uso futuro

### **B3. Token Info Endpoint Decode Sem Verificação**
- **Arquivo:** `agente-multi-tenant/backend/app/core/security.py`
- **Linhas:** 300-323
- **Estado Atual:** `get_token_info()` decodifica JWT sem verificar assinatura
- **Impacto:** Informações de token podem ser falsificadas
- **Requisito:** Adicionar verificação de assinatura ou documentar limitação

### **B4. Placeholder UUIDs nos Logs de Erro**
- **Arquivo:** `agente-multi-tenant/backend/app/api/deps.py`
- **Linhas:** 251-252, 292
- **Estado Atual:** UUIDs zerados (`00000000-0000-0000-0000-000000000000`)
- **Impacto:** Dificultam análise de logs
- **Requisito:** Usar UUIDs reais ou valores mais descritivos

### **B5. Commented-out Code em Middleware**
- **Arquivo:** `agente-multi-tenant/backend/app/middleware/logging_middleware.py`
- **Linhas:** 113-120, 159-166
- **Estado Atual:** Código de métricas comentado (import circular removido)
- **Impacto:** Code quality, código morto
- **Requisito:** Remover código comentado ou implementar corretamente

### **B6. Circuit Breaker com Valores Hardcoded**
- **Arquivo:** `agente-multi-tenant/backend/app/services/external_service_validator.py`
- **Linhas:** 133-137
- **Estado Atual:** Thresholds e timeouts não configuráveis por ambiente
- **Impacto:** Não adaptável a diferentes ambientes
- **Requisito:** Tornar configurável via environment variables

---

## 🎯 ORGANIZAÇÃO POR FASES

### **FASE 1 - EMERGÊNCIA (4 problemas)**
- C1: Remover endpoint geração de tokens
- C2: Remover endpoints debug sem proteção  
- C4: Corrigir bug AuditLogger
- C6: Reduzir tempo expiração token

### **FASE 2 - CRÍTICO (5 problemas)**
- C5: Corrigir AgentService token
- C3: Corrigir CORS duplicado
- A1: Converter check_affiliate_subscription async
- A4: Implementar interceptor 401/403
- A5: Tornar URLs configuráveis

### **FASE 3 - IMPORTANTE (8 problemas)**
- A2: Corrigir bare except
- A3: Corrigir fallback Chatwoot
- A6: Completar sincronização assinatura
- A7: Habilitar health check real
- A9: Remover TenantContextFilter duplicado
- M4: Tornar SUPABASE_JWT_SECRET obrigatório
- M10: Implementar transações
- M1: Substituir print por logger

### **FASE 4 - OTIMIZAÇÃO (10 problemas)**
- A8: Otimizar N+1 queries
- M8: Implementar cache tenant resolution
- M5: Implementar logout
- M6: Adicionar logging WhatsApp
- M7: Sanitizar erros cliente
- M9: Migrar métricas para Redis
- M2: Corrigir importação cors_fix
- M3: Migrar datetime.utcnow()
- M11: Mover env vars Vercel
- M12: Corrigir tenant slug extraction

### **FASE 5 - MELHORIAS (6 problemas)**
- B1: Remover import não utilizado
- B2: Remover SUPABASE_ANON_KEY não usado
- B3: Adicionar verificação token info
- B4: Corrigir placeholder UUIDs
- B5: Remover código comentado
- B6: Tornar circuit breaker configurável

---

## 📊 CRITÉRIOS DE VALIDAÇÃO GERAL

### **Validação de Segurança**
- Nenhum endpoint de debug acessível em produção
- Todos os tokens com tempo de expiração adequado
- Nenhuma informação sensível exposta em logs ou erros

### **Validação de Funcionalidade**
- Autenticação funcionando (sem erros 401)
- CORS funcionando (sem headers duplicados)
- Sincronização de dados funcionando
- Health checks retornando status real

### **Validação de Performance**
- Sem criação desnecessária de event loops
- Queries otimizadas (sem N+1)
- Cache implementado onde necessário
- Métricas persistentes

### **Validação de Code Quality**
- Sem código comentado ou imports não utilizados
- Logging estruturado e consistente
- Tratamento de erro adequado
- Configuração centralizada

---

## 🔄 DEPENDÊNCIAS ENTRE CORREÇÕES

### **Dependências Críticas**
- C4 (AuditLogger) deve ser corrigido antes de qualquer deploy
- C5 (AgentService token) é pré-requisito para A4 (interceptor 401)
- C3 (CORS) deve ser corrigido antes de testes de integração

### **Dependências de Performance**
- A1 (async conversion) deve preceder A8 (query optimization)
- M8 (cache) deve ser implementado após A1 (async)

### **Dependências de Configuração**
- M4 (JWT secret obrigatório) deve preceder validações de token
- A5 (URLs configuráveis) deve preceder testes multi-ambiente

---

**TOTAL: 33 problemas organizados em 5 fases com dependências mapeadas e critérios de validação específicos.**