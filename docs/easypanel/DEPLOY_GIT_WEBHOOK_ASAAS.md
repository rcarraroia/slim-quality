# 🚀 DEPLOY WEBHOOK ASAAS - MÉTODO GIT (SEM DOCKER)

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

**Data:** 11/01/2026  
**Objetivo:** Configurar deploy automático do webhook Asaas via Git no Easypanel  
**Método:** Git-based (SEM necessidade de Docker Desktop local)

---

## 📋 PRÉ-REQUISITOS

### Verificar antes de começar:
- [ ] Acesso ao painel Easypanel: https://easypanel.slimquality.com.br
- [ ] Repositório GitHub atualizado com código do webhook Python
- [ ] Credenciais de acesso ao GitHub configuradas no Easypanel

---

## 🎯 PASSO 1: ACESSAR EASYPANEL

### 1.1 Login no Painel
```
URL: https://easypanel.slimquality.com.br
Usuário: [seu usuário]
Senha: [sua senha]
```

### 1.2 Verificar Projeto Existente
- Navegar para: **Projects** > **slim-quality**
- Verificar se projeto existe
- Se não existir, criar novo projeto: **Create Project** > Nome: `slim-quality`

---

## 🎯 PASSO 2: CONFIGURAR SERVICE SLIM-AGENT

### 2.1 Criar ou Atualizar Service

**Se service NÃO existe:**
1. Click em **Create Service**
2. Selecionar **App**
3. Nome: `slim-agent`

**Se service JÁ existe:**
1. Selecionar service `slim-agent`
2. Click em **Settings**

### 2.2 Configurar Source (Git)

**Aba: Source**

```yaml
Source Type: Git
Repository: https://github.com/rcarraroia/slim-quality.git
Branch: main
Build Context: agent/
Dockerfile Path: agent/Dockerfile
```

**Configurações importantes:**
- ✅ **Auto Deploy:** Enabled (deploy automático a cada push)
- ✅ **Build Context:** `agent/` (pasta onde está o código Python)
- ✅ **Dockerfile:** `agent/Dockerfile` (caminho relativo ao repositório)

### 2.3 Configurar Domains

**Aba: Domains**

```yaml
Domain: api.slimquality.com.br
Port: 8000
SSL: Automatic (Let's Encrypt)
HTTPS Redirect: Enabled
```

### 2.4 Configurar Environment Variables

**Aba: Environment**

**Variáveis CRÍTICAS para o webhook:**

```bash
# Supabase
SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs... (sua chave)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs... (sua chave)

# Asaas Webhook
ASAAS_WEBHOOK_TOKEN=seu_token_webhook_asaas
ASAAS_WEBHOOK_SECRET=seu_token_webhook_asaas
ASAAS_API_KEY=sua_api_key_asaas

# Wallets Gestores (para cálculo de split)
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx

# App Config
ENVIRONMENT=production
LOG_LEVEL=info
DEBUG=false
TZ=America/Sao_Paulo

# Redis (se usar)
REDIS_URL=redis://redis:6379

# Evolution API (WhatsApp)
EVOLUTION_URL=https://slimquality-evolution-api.wpjtfd.easypanel.host
EVOLUTION_INSTANCE=SlimQualit
EVOLUTION_API_KEY=9A390AED6A45-4610-93B2-245591E39FDE

# OpenAI (para SICC)
OPENAI_API_KEY=sk-proj-xxx (se usar)
```

**⚠️ IMPORTANTE:** Substituir valores `xxx` pelas chaves reais!

### 2.5 Configurar Resources

**Aba: Resources**

```yaml
Memory: 1GB
CPU: 0.5 cores
Restart Policy: always
```

### 2.6 Configurar Health Check

**Aba: Health Check**

```yaml
Path: /health
Port: 8000
Interval: 30s
Timeout: 10s
Retries: 3
Start Period: 60s
```

---

## 🎯 PASSO 3: DEPLOY INICIAL

### 3.1 Iniciar Deploy

1. Revisar todas as configurações
2. Click em **Deploy** (botão verde no topo)
3. Aguardar build e deploy

**Tempo estimado:** 3-5 minutos

### 3.2 Monitorar Build

**Aba: Logs**

Acompanhar logs de build:
```
Building image...
Step 1/10 : FROM python:3.11-slim
Step 2/10 : WORKDIR /app
...
Successfully built xxx
Successfully tagged xxx
Deploying container...
Container started successfully
```

**Status esperado:** ✅ Running (verde)

### 3.3 Verificar Health Check

Após deploy, verificar:

```bash
# 1. Health check geral
curl https://api.slimquality.com.br/health

# Resposta esperada:
{
  "status": "healthy",
  "container": "ok"
}

# 2. Health check webhook Asaas
curl https://api.slimquality.com.br/api/webhooks/asaas/health

# Resposta esperada:
{
  "status": "ok",
  "timestamp": "2026-01-11T...",
  "supported_events": [
    "PAYMENT_RECEIVED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_OVERDUE",
    "PAYMENT_REFUNDED",
    "PAYMENT_SPLIT_CANCELLED",
    "PAYMENT_SPLIT_DIVERGENCE_BLOCK"
  ]
}
```

**✅ Se ambos retornarem 200 OK → Deploy bem-sucedido!**

---

## 🎯 PASSO 4: CONFIGURAR WEBHOOK NO ASAAS

### 4.1 Acessar Painel Asaas

```
URL: https://www.asaas.com/
Login: [suas credenciais]
```

### 4.2 Configurar Webhook

**Navegar para:**
1. **Configurações** > **Integrações** > **Webhooks**
2. Click em **Adicionar Webhook**

**Configuração:**

```yaml
Nome: Webhook Slim Quality - Produção
URL: https://api.slimquality.com.br/api/webhooks/asaas
Método: POST
Status: Ativo
```

**Eventos a selecionar:**
- ✅ PAYMENT_RECEIVED (Pagamento recebido)
- ✅ PAYMENT_CONFIRMED (Pagamento confirmado)
- ✅ PAYMENT_OVERDUE (Pagamento vencido)
- ✅ PAYMENT_REFUNDED (Pagamento estornado)
- ✅ PAYMENT_SPLIT_CANCELLED (Split cancelado)
- ✅ PAYMENT_SPLIT_DIVERGENCE_BLOCK (Erro de split)

**Token de Autenticação:**
- Gerar novo token no Asaas
- Copiar token gerado
- **IMPORTANTE:** Adicionar este token como `ASAAS_WEBHOOK_TOKEN` no Easypanel (Passo 2.4)

### 4.3 Testar Webhook

**No painel Asaas:**
1. Click em **Testar Webhook**
2. Selecionar evento: `PAYMENT_CONFIRMED`
3. Click em **Enviar Teste**

**Verificar no Easypanel:**
- Aba: **Logs** do service `slim-agent`
- Deve aparecer: `Recebido webhook Asaas event=PAYMENT_CONFIRMED`

**✅ Se log aparecer → Webhook configurado corretamente!**

---

## 🎯 PASSO 5: VALIDAÇÃO COMPLETA

### 5.1 Teste End-to-End

**Simular pagamento real:**

```bash
# 1. Criar cobrança teste no Asaas
# (via painel ou API)

# 2. Marcar como paga

# 3. Verificar logs no Easypanel
# Deve aparecer:
# - Webhook recebido
# - Pedido atualizado para 'paid'
# - RPC calculate_commission_split chamada
# - Comissões calculadas
```

### 5.2 Verificar Banco de Dados

**No Supabase SQL Editor:**

```sql
-- 1. Verificar webhook_logs
SELECT * FROM webhook_logs
WHERE provider = 'asaas'
ORDER BY processed_at DESC
LIMIT 5;

-- 2. Verificar commission_splits criados
SELECT * FROM commission_splits
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar commission_logs
SELECT * FROM commission_logs
WHERE action = 'COMMISSION_CALCULATED'
ORDER BY created_at DESC
LIMIT 5;
```

**✅ Se registros aparecerem → Sistema funcionando end-to-end!**

---

## 🎯 PASSO 6: DEPLOY AUTOMÁTICO (CI/CD)

### 6.1 Como Funciona

Com **Auto Deploy** habilitado:

1. Você faz alterações no código
2. Commit e push para GitHub:
   ```bash
   git add .
   git commit -m "fix: correção no webhook"
   git push origin main
   ```
3. Easypanel detecta push automaticamente
4. Inicia build e deploy automático
5. Service é atualizado sem downtime

### 6.2 Monitorar Deploy Automático

**No Easypanel:**
- Aba: **Deployments**
- Ver histórico de deploys
- Status de cada deploy
- Logs de build

---

## 🔧 TROUBLESHOOTING

### Problema: Build falha

**Sintomas:**
- Status: Failed
- Logs mostram erro de build

**Soluções:**
1. Verificar se `agent/Dockerfile` existe
2. Verificar se `agent/requirements.txt` está correto
3. Verificar logs de build para erro específico
4. Testar build localmente (se tiver Docker):
   ```bash
   cd agent/
   docker build -t test .
   ```

### Problema: Container não inicia

**Sintomas:**
- Status: Restarting
- Health check falha

**Soluções:**
1. Verificar logs do container
2. Verificar environment variables
3. Verificar se porta 8000 está exposta
4. Verificar conectividade Supabase

### Problema: Webhook retorna 404

**Sintomas:**
- Asaas reporta erro 404
- Logs não mostram webhook recebido

**Soluções:**
1. Verificar URL: `https://api.slimquality.com.br/api/webhooks/asaas`
2. Verificar DNS apontando para Easypanel
3. Verificar SSL funcionando
4. Testar manualmente:
   ```bash
   curl -X POST https://api.slimquality.com.br/api/webhooks/asaas \
     -H "Content-Type: application/json" \
     -d '{"event":"PAYMENT_CONFIRMED","payment":{"id":"test"}}'
   ```

### Problema: Webhook recebe mas não processa

**Sintomas:**
- Logs mostram webhook recebido
- Mas pedido não é atualizado

**Soluções:**
1. Verificar `SUPABASE_SERVICE_KEY` configurada
2. Verificar se RPC `calculate_commission_split` existe
3. Verificar logs de erro específicos
4. Verificar se pedido existe no banco

---

## 📊 CHECKLIST FINAL

### Deploy Configurado
- [ ] Service `slim-agent` criado no Easypanel
- [ ] Source configurado (Git)
- [ ] Domain `api.slimquality.com.br` configurado
- [ ] Environment variables configuradas
- [ ] Health check configurado
- [ ] Auto Deploy habilitado

### Webhook Funcionando
- [ ] Endpoint `/api/webhooks/asaas/health` retorna 200 OK
- [ ] Webhook configurado no painel Asaas
- [ ] Token de autenticação configurado
- [ ] Teste de webhook bem-sucedido
- [ ] Logs mostram webhooks recebidos

### Integração Completa
- [ ] Pedido atualizado para 'paid' após webhook
- [ ] RPC `calculate_commission_split` executada
- [ ] Comissões criadas em `commission_splits`
- [ ] Logs salvos em `webhook_logs`
- [ ] Sem erros nos logs do Easypanel

### Monitoramento
- [ ] Alertas configurados (CPU, Memory, Health)
- [ ] Logs sendo monitorados
- [ ] Métricas normais (< 50% CPU, < 800MB RAM)

---

## 🎉 CONCLUSÃO

**Deploy via Git configurado com sucesso!**

**Benefícios:**
- ✅ Deploy automático a cada push
- ✅ Sem necessidade de Docker local
- ✅ Build gerenciado pelo Easypanel
- ✅ Rollback fácil (histórico de deploys)
- ✅ Zero downtime em atualizações

**Próximos passos:**
1. Monitorar logs por 24-48h
2. Validar com pagamentos reais
3. Ajustar recursos se necessário
4. Configurar alertas adicionais

---

**Documento criado:** 11/01/2026  
**Status:** Pronto para execução  
**Tempo estimado:** 30-45 minutos
