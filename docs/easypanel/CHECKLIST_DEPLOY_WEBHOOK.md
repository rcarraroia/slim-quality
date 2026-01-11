# ✅ CHECKLIST RÁPIDO - DEPLOY WEBHOOK ASAAS

## 📋 PASSO A PASSO SIMPLIFICADO

### 1️⃣ EASYPANEL - CONFIGURAR SERVICE (10 min)

**Acessar:** https://easypanel.slimquality.com.br

**Criar/Atualizar Service `slim-agent`:**

```yaml
Source:
  ✅ Type: Git
  ✅ Repository: https://github.com/rcarraroia/slim-quality.git
  ✅ Branch: main
  ✅ Build Context: agent/
  ✅ Dockerfile: agent/Dockerfile
  ✅ Auto Deploy: Enabled

Domain:
  ✅ Domain: api.slimquality.com.br
  ✅ Port: 8000
  ✅ SSL: Automatic
  ✅ HTTPS Redirect: Enabled

Environment Variables (COPIAR E COLAR):
  ✅ SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
  ✅ SUPABASE_SERVICE_KEY=[sua chave]
  ✅ ASAAS_WEBHOOK_TOKEN=[token do Asaas]
  ✅ ASAAS_API_KEY=[sua API key]
  ✅ ENVIRONMENT=production
  ✅ LOG_LEVEL=info

Health Check:
  ✅ Path: /health
  ✅ Port: 8000
  ✅ Interval: 30s

Resources:
  ✅ Memory: 1GB
  ✅ CPU: 0.5 cores
```

**Click em:** Deploy (botão verde)

---

### 2️⃣ AGUARDAR BUILD (3-5 min)

**Monitorar na aba Logs:**
```
Building image... ✅
Successfully built ✅
Container started ✅
Status: Running (verde) ✅
```

---

### 3️⃣ TESTAR ENDPOINTS (2 min)

```bash
# Teste 1: Health geral
curl https://api.slimquality.com.br/health
# Esperado: {"status":"healthy"}

# Teste 2: Health webhook
curl https://api.slimquality.com.br/api/webhooks/asaas/health
# Esperado: {"status":"ok","supported_events":[...]}
```

**✅ Ambos retornam 200 OK? → Prosseguir**

---

### 4️⃣ CONFIGURAR WEBHOOK NO ASAAS (5 min)

**Acessar:** https://www.asaas.com/

**Navegar:** Configurações > Integrações > Webhooks

**Adicionar Webhook:**
```yaml
Nome: Webhook Slim Quality - Produção
URL: https://api.slimquality.com.br/api/webhooks/asaas
Método: POST
Status: Ativo

Eventos:
  ✅ PAYMENT_RECEIVED
  ✅ PAYMENT_CONFIRMED
  ✅ PAYMENT_OVERDUE
  ✅ PAYMENT_REFUNDED
  ✅ PAYMENT_SPLIT_CANCELLED
  ✅ PAYMENT_SPLIT_DIVERGENCE_BLOCK
```

**Gerar Token:**
1. Copiar token gerado
2. Voltar ao Easypanel
3. Adicionar como `ASAAS_WEBHOOK_TOKEN`
4. Redeploy service

---

### 5️⃣ TESTAR WEBHOOK (2 min)

**No painel Asaas:**
1. Click em "Testar Webhook"
2. Selecionar evento: PAYMENT_CONFIRMED
3. Enviar teste

**No Easypanel (aba Logs):**
```
Deve aparecer:
✅ Recebido webhook Asaas event=PAYMENT_CONFIRMED
```

---

### 6️⃣ VALIDAÇÃO FINAL (5 min)

**Verificar no Supabase:**

```sql
-- Webhook foi registrado?
SELECT * FROM webhook_logs
WHERE provider = 'asaas'
ORDER BY processed_at DESC
LIMIT 1;
```

**✅ Se registro existe → DEPLOY COMPLETO!**

---

## 🎉 PRONTO!

**Tempo total:** ~25 minutos

**Deploy automático configurado:**
- Cada `git push` → Deploy automático
- Webhook Asaas → Funcionando
- Comissões → Calculadas automaticamente

---

## 🆘 PROBLEMAS?

**Build falha:**
- Verificar logs de build no Easypanel
- Verificar se `agent/Dockerfile` existe

**Webhook 404:**
- Verificar DNS: `api.slimquality.com.br`
- Testar: `curl https://api.slimquality.com.br/health`

**Webhook não processa:**
- Verificar `SUPABASE_SERVICE_KEY` configurada
- Verificar logs de erro no Easypanel

---

**Documento:** Checklist Rápido  
**Tempo:** 25 minutos  
**Dificuldade:** ⭐⭐ (Fácil)
