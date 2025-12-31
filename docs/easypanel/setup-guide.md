# Setup Guide - Easypanel Deploy

## Overview

Guia passo-a-passo para configurar e fazer deploy do backend Slim Quality no Easypanel.

## Pré-requisitos

### 1. Verificar Infraestrutura

```bash
# Verificar se Easypanel está operacional
curl -I https://easypanel.slimquality.com.br
# Status: 200 OK

# Verificar Evolution API existente
curl -I https://slimquality-evolution-api.wpjtfd.easypanel.host
# Status: 200 OK

# Verificar Supabase
curl -I https://vtynmmtuvxreiwcxxlma.supabase.co
# Status: 200 OK
```

### 2. Credenciais Necessárias

- ✅ **CLAUDE_API_KEY**: sk-ant-api03-xxx
- ✅ **SUPABASE_SERVICE_KEY**: eyJhbGciOiJIUzI1NiIs...
- ✅ **EVOLUTION_API_KEY**: Obtido do painel Evolution
- ✅ **Acesso Easypanel**: Login e senha

## FASE 1: Preparação das Imagens

### Passo 1.1: Build da Imagem

```bash
# No diretório raiz do projeto
cd agent/

# Executar script de build
chmod +x ../scripts/build.sh
../scripts/build.sh

# Verificar imagem criada
docker images | grep slim-agent
# Deve mostrar: slim-agent:latest e slim-agent:YYYYMMDD-HHMMSS
```

### Passo 1.2: Push para Registry

```bash
# Executar script de push
chmod +x ../scripts/push.sh
../scripts/push.sh

# Verificar no registry Easypanel
# Painel > Registry > Images
# Deve aparecer: slim-agent:latest
```

### Passo 1.3: Teste Local (Opcional)

```bash
# Testar com docker-compose
docker-compose up -d

# Verificar services
docker-compose ps
# Deve mostrar: agent e redis running

# Teste health check
curl http://localhost:8000/health
# Status: 200 OK

# Parar teste
docker-compose down
```

## FASE 2: Configuração Services Easypanel

### Passo 2.1: Criar Service Redis

1. **Acessar Easypanel**:
   - URL: https://easypanel.slimquality.com.br
   - Login com credenciais

2. **Criar Service**:
   - Services > Create Service
   - Type: Database
   - Name: `redis`
   - Image: `redis:7-alpine`

3. **Configurar Básico**:
   ```yaml
   Container Port: 6379
   External Access: Disabled
   Internal Network: Enabled
   ```

4. **Configurar Persistência**:
   - Volumes > Add Volume
   - Name: `redis-data`
   - Mount Path: `/data`
   - Size: `1GB`

5. **Configurar Command**:
   ```bash
   redis-server --appendonly yes --save 60 1000
   ```

6. **Configurar Resources**:
   ```yaml
   Memory: 256MB
   CPU: 0.2 cores
   Restart Policy: always
   ```

7. **Deploy**:
   - Click "Deploy"
   - Aguardar status "Running"
   - Verificar logs sem erros

### Passo 2.2: Criar Service Slim-Agent

1. **Criar Service**:
   - Services > Create Service
   - Type: Application
   - Name: `slim-agent`
   - Image: `registry.easypanel.host/slim-agent:latest`

2. **Configurar Port**:
   ```yaml
   Container Port: 8000
   Public Access: Enabled
   ```

3. **Configurar Domain**:
   - Domains > Add Domain
   - Domain: `api.slimquality.com.br`
   - SSL: Automatic (Let's Encrypt)
   - HTTPS Redirect: Enabled

4. **Configurar Environment Variables**:
   ```bash
   # Anthropic
   CLAUDE_API_KEY=sk-ant-api03-xxx
   
   # Supabase
   SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   
   # Evolution API
   EVOLUTION_URL=https://slimquality-evolution-api.wpjtfd.easypanel.host
   EVOLUTION_API_KEY=xxx
   
   # Redis
   REDIS_URL=redis://redis:6379
   
   # App Config
   ENVIRONMENT=production
   LOG_LEVEL=info
   DEBUG=false
   TZ=America/Sao_Paulo
   
   # Security
   SECRET_KEY=xxx
   WEBHOOK_SECRET=xxx
   ```

5. **Configurar Health Check**:
   ```yaml
   Path: /health
   Interval: 30s
   Timeout: 10s
   Retries: 3
   Start Period: 60s
   ```

6. **Configurar Resources**:
   ```yaml
   Memory: 1GB
   CPU: 0.5 cores
   Restart Policy: always
   ```

7. **Deploy**:
   - Click "Deploy"
   - Aguardar status "Running"
   - Verificar logs de inicialização

## FASE 3: Configuração DNS

### Passo 3.1: Configurar DNS Record

1. **Acessar Provedor DNS** (ex: Cloudflare):
   - Login no painel DNS
   - Selecionar domínio `slimquality.com.br`

2. **Criar Record A**:
   ```
   Type: A
   Name: api
   Value: [IP_DO_VPS_EASYPANEL]
   TTL: Auto
   Proxy: Disabled (importante!)
   ```

3. **Verificar Propagação**:
   ```bash
   # Verificar DNS
   nslookup api.slimquality.com.br
   # Deve retornar IP do VPS
   
   # Teste de conectividade
   curl -I http://api.slimquality.com.br
   # Deve redirecionar para HTTPS
   ```

### Passo 3.2: Verificar SSL

```bash
# Aguardar certificado SSL (pode levar alguns minutos)
curl -I https://api.slimquality.com.br/health
# Status: 200 OK

# Verificar certificado
openssl s_client -connect api.slimquality.com.br:443 -servername api.slimquality.com.br
# Verify return code: 0 (ok)
```

## FASE 4: Configuração Webhooks

### Passo 4.1: Configurar Webhook Evolution

1. **Acessar Evolution API**:
   - URL: https://slimquality-evolution-api.wpjtfd.easypanel.host
   - Login com credenciais

2. **Configurar Webhook**:
   ```json
   {
     "webhook": {
       "url": "https://api.slimquality.com.br/webhooks/evolution",
       "events": [
         "messages.upsert",
         "messages.update",
         "connection.update"
       ]
     }
   }
   ```

3. **Testar Webhook**:
   ```bash
   # Enviar mensagem teste via WhatsApp
   # Verificar logs no Easypanel > slim-agent > Logs
   # Deve aparecer: "Webhook received from Evolution"
   ```

## FASE 5: Validação Completa

### Passo 5.1: Health Checks

```bash
# 1. Backend Health
curl https://api.slimquality.com.br/health
# Resposta esperada:
{
  "status": "healthy",
  "timestamp": "2025-12-30T...",
  "services": {
    "supabase": {"status": "up"},
    "redis": {"status": "up"},
    "sicc": {"status": "up"}
  }
}

# 2. API Documentation
curl https://api.slimquality.com.br/docs
# Status: 200 OK (Swagger UI)

# 3. Redis Connectivity
# No painel Easypanel > redis > Console
redis-cli ping
# Resposta: PONG
```

### Passo 5.2: Teste Integração WhatsApp

1. **Enviar Mensagem**:
   - Enviar mensagem para número WhatsApp configurado
   - Mensagem: "Olá, teste de produção"

2. **Verificar Logs**:
   ```bash
   # Painel Easypanel > slim-agent > Logs
   # Deve aparecer:
   [INFO] Webhook received from Evolution
   [INFO] Processing message: Olá, teste de produção
   [INFO] SICC processing message
   [INFO] Response sent to WhatsApp
   ```

3. **Verificar Resposta**:
   - WhatsApp deve receber resposta automática
   - Resposta deve ser contextual e inteligente

### Passo 5.3: Teste Performance

```bash
# 1. Response Time
curl -w "@curl-format.txt" -o /dev/null -s https://api.slimquality.com.br/health
# Total time deve ser < 200ms

# 2. Load Test Básico
for i in {1..10}; do
  curl -s https://api.slimquality.com.br/health > /dev/null &
done
wait
# Todos devem retornar 200 OK
```

## FASE 6: Monitoramento

### Passo 6.1: Configurar Alertas

1. **Painel Easypanel**:
   - Services > slim-agent > Monitoring
   - Enable alerts para:
     - CPU > 80%
     - Memory > 900MB
     - Health check failures
     - Container restarts

2. **Logs Monitoring**:
   - Configurar filtros para ERROR e WARNING
   - Monitorar padrões de erro
   - Alertas para exceções não tratadas

### Passo 6.2: Métricas Importantes

```bash
# Verificar métricas no painel
# Services > slim-agent > Metrics

# CPU Usage: < 50% normal
# Memory Usage: < 800MB normal
# Response Time: < 200ms normal
# Error Rate: < 1% normal
# Uptime: > 99% esperado
```

## Troubleshooting

### Problema: Container não inicia

**Sintomas**:
- Status: Failed ou Restarting
- Logs mostram erros de inicialização

**Soluções**:
1. Verificar environment variables
2. Verificar se imagem existe no registry
3. Verificar logs detalhados
4. Verificar resource limits

### Problema: Health check falha

**Sintomas**:
- Health check retorna 500 ou timeout
- Service marcado como unhealthy

**Soluções**:
1. Verificar conectividade Redis
2. Verificar conectividade Supabase
3. Verificar logs de erro
4. Testar endpoints manualmente

### Problema: Webhook não funciona

**Sintomas**:
- Mensagens WhatsApp não são processadas
- Logs não mostram webhooks recebidos

**Soluções**:
1. Verificar URL webhook na Evolution
2. Verificar conectividade entre services
3. Verificar logs de ambos os services
4. Testar webhook manualmente

### Problema: SSL não funciona

**Sintomas**:
- HTTPS retorna erro de certificado
- Certificado não é gerado

**Soluções**:
1. Verificar DNS apontando corretamente
2. Verificar se domínio não está proxied
3. Aguardar propagação DNS
4. Verificar logs Traefik

## Backup e Recovery

### Backup

```bash
# 1. Backup configuração services
# Painel Easypanel > Services > Export Configuration

# 2. Backup environment variables
# Documentar todas as vars em local seguro

# 3. Backup Redis data
# Painel Easypanel > Volumes > redis-data > Backup
```

### Recovery

```bash
# 1. Restaurar services
# Painel Easypanel > Services > Import Configuration

# 2. Reconfigurar environment variables
# Inserir manualmente (por segurança)

# 3. Restaurar Redis data
# Painel Easypanel > Volumes > redis-data > Restore

# 4. Verificar funcionamento
curl https://api.slimquality.com.br/health
```

## Manutenção

### Updates Regulares

1. **Atualizar Imagem**:
   ```bash
   # Build nova versão
   ./scripts/build.sh
   ./scripts/push.sh
   
   # Update service no Easypanel
   # Services > slim-agent > Update Image
   ```

2. **Monitorar Performance**:
   - Verificar métricas semanalmente
   - Analisar logs de erro
   - Otimizar queries lentas

3. **Security Updates**:
   - Atualizar base images mensalmente
   - Rotacionar API keys trimestralmente
   - Revisar logs de segurança

### Limpeza

```bash
# 1. Limpar imagens antigas
# Painel Easypanel > Registry > Cleanup

# 2. Limpar logs antigos
# Configurar log rotation

# 3. Monitorar uso de disco
# Painel Easypanel > System > Storage
```

---

## ✅ Checklist Final

### Deploy Completo
- [ ] Imagem slim-agent buildada e no registry
- [ ] Service redis criado e rodando
- [ ] Service slim-agent criado e rodando
- [ ] DNS api.slimquality.com.br configurado
- [ ] SSL certificado válido
- [ ] Environment variables configuradas
- [ ] Health checks passando

### Integração Funcional
- [ ] Webhook Evolution configurado
- [ ] Mensagem WhatsApp → Backend funcionando
- [ ] Backend → WhatsApp resposta funcionando
- [ ] SICC carregando memórias
- [ ] Logs estruturados visíveis

### Performance e Monitoramento
- [ ] Response time < 200ms
- [ ] CPU usage < 50%
- [ ] Memory usage < 800MB
- [ ] Error rate < 1%
- [ ] Uptime > 99%
- [ ] Alertas configurados

**Deploy concluído com sucesso! 🚀**