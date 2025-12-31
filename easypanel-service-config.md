# 🚀 CONFIGURAÇÃO DO SERVICE SLIM-AGENT NO EASYPANEL

## ⚠️ INSTRUÇÕES PARA CONFIGURAÇÃO MANUAL

Como o registry automático não está acessível, você precisará fazer o deploy usando uma das opções abaixo:

---

## 🎯 OPÇÃO 1: USAR IMAGEM LOCAL (RECOMENDADO)

### 1. Upload da Imagem via Easypanel

1. **Acesse seu projeto slimquality no Easypanel**
2. **Vá em "Services" → "+" → "App"**
3. **Configure:**

```yaml
Nome do Service: slim-agent
Tipo: App
Source: Docker Image
Imagem: slim-agent:latest
```

### 2. Configuração do Service

```yaml
# CONFIGURAÇÃO BÁSICA
Nome: slim-agent
Porta: 8000
Domínio: api.slimquality.com.br

# RECURSOS
CPU: 1 vCPU
RAM: 1 GB
Storage: 5 GB

# HEALTH CHECK
Health Check Path: /health
Health Check Port: 8000
```

### 3. Environment Variables (COPIE E COLE)

```bash
# Supabase
SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0

# Claude AI (SUBSTITUA PELA SUA CHAVE)
CLAUDE_API_KEY=sk-ant-api03-[COLE_SUA_CHAVE_AQUI]

# Evolution API (AJUSTE PARA SUA INSTÂNCIA)
EVOLUTION_URL=https://evolution-api.wpjtfd.easypanel.host
EVOLUTION_API_KEY=[COLE_SUA_CHAVE_EVOLUTION]

# Redis (conectar ao service redis existente)
REDIS_URL=redis://redis:6379

# Sistema
ENVIRONMENT=production
LOG_LEVEL=INFO
PYTHONPATH=/app
PYTHONUNBUFFERED=1
PORT=8000
```

---

## 🎯 OPÇÃO 2: USAR DOCKER HUB

### 1. Push para Docker Hub

Execute no seu terminal:

```bash
# Login no Docker Hub
docker login

# Tag para Docker Hub
docker tag slim-agent:latest [SEU_USERNAME]/slim-agent:latest

# Push para Docker Hub
docker push [SEU_USERNAME]/slim-agent:latest
```

### 2. Configurar no Easypanel

```yaml
Imagem: [SEU_USERNAME]/slim-agent:latest
```

---

## 🎯 OPÇÃO 3: USAR GITHUB CONTAINER REGISTRY

### 1. Push para GitHub

```bash
# Login no GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u [SEU_USERNAME] --password-stdin

# Tag para GitHub
docker tag slim-agent:latest ghcr.io/[SEU_USERNAME]/slim-agent:latest

# Push para GitHub
docker push ghcr.io/[SEU_USERNAME]/slim-agent:latest
```

### 2. Configurar no Easypanel

```yaml
Imagem: ghcr.io/[SEU_USERNAME]/slim-agent:latest
```

---

## 📋 PASSO A PASSO DETALHADO NO EASYPANEL

### 1. Criar o Service

1. **Acesse:** https://panel.easypanel.host
2. **Selecione:** Projeto "slimquality"
3. **Clique:** "+" → "App"
4. **Preencha:**
   - Nome: `slim-agent`
   - Imagem: `slim-agent:latest` (ou a que você escolheu)

### 2. Configurar Networking

```yaml
# PORTAS
Container Port: 8000
Public Port: 80/443 (automático)

# DOMÍNIO
Domain: api.slimquality.com.br
SSL: Automático (Let's Encrypt)
```

### 3. Configurar Resources

```yaml
# RECURSOS MÍNIMOS
CPU: 0.5 vCPU
RAM: 512 MB

# RECURSOS RECOMENDADOS
CPU: 1 vCPU
RAM: 1 GB
Storage: 2 GB
```

### 4. Configurar Health Check

```yaml
Health Check: Enabled
Path: /health
Port: 8000
Interval: 30s
Timeout: 10s
Retries: 3
```

### 5. Environment Variables

**Cole todas as variáveis da seção acima no campo "Environment Variables"**

### 6. Deploy

1. **Clique:** "Create Service"
2. **Aguarde:** Deploy (2-5 minutos)
3. **Verifique:** Logs para erros
4. **Teste:** https://api.slimquality.com.br/health

---

## 🔍 TROUBLESHOOTING

### Se o Deploy Falhar:

1. **Verificar Logs:**
   - Easypanel → Services → slim-agent → Logs
   - Procurar por erros de startup

2. **Problemas Comuns:**
   ```bash
   # Erro de porta
   Port 8000 already in use → Verificar conflitos
   
   # Erro de imagem
   Image not found → Verificar nome da imagem
   
   # Erro de variáveis
   Missing environment variable → Verificar ENV vars
   ```

3. **Validação de Conectividade:**
   ```bash
   # Testar health check
   curl https://api.slimquality.com.br/health
   
   # Verificar SSL
   curl -I https://api.slimquality.com.br
   ```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após o deploy, verificar:

- [ ] Service está rodando (status: Running)
- [ ] Logs não mostram erros críticos
- [ ] Health check retorna 200 OK
- [ ] Domínio api.slimquality.com.br responde
- [ ] SSL está funcionando (HTTPS)
- [ ] Webhook metrics acessível: `/webhooks/metrics`
- [ ] Documentação acessível: `/docs`

---

## 🚀 PRÓXIMOS PASSOS

Após configurar o service:

1. **Testar Integração:**
   ```bash
   # Executar testes automatizados
   cd tests/production
   python smoke_tests.py https://api.slimquality.com.br
   ```

2. **Configurar Webhook Evolution:**
   - URL: `https://api.slimquality.com.br/webhooks/evolution`
   - Eventos: MESSAGES_UPSERT, CONNECTION_UPDATE

3. **Monitorar Sistema:**
   - Verificar métricas: `/webhooks/metrics`
   - Acompanhar logs no Easypanel

---

**🎯 QUAL OPÇÃO VOCÊ PREFERE USAR?**

1. **Imagem Local** (mais simples, se Easypanel suportar)
2. **Docker Hub** (público, fácil)
3. **GitHub Container Registry** (privado, mais seguro)

**Informe qual opção e eu te ajudo com os comandos específicos!**