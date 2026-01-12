# 🔄 ATUALIZAÇÃO DO WEBHOOK ASAAS

**Data:** 12/01/2026  
**Status:** ✅ CONCLUÍDO  

---

## 📋 CONTEXTO

O webhook Asaas estava implementado no servidor Python (VPS Easypanel) que caiu por falta de pagamento, paralisando completamente o sistema de pagamentos.

**Decisão:** Migrar webhook para o backend Express (Docker Swarm) com alta disponibilidade.

---

## 🔍 DESCOBERTA CRÍTICA

Após análise da documentação oficial do Asaas, descobrimos que:

### ❌ **IMPLEMENTAÇÃO INCORRETA (antes):**
- Webhook tentava validar via HMAC SHA256
- Procurava header `X-Asaas-Signature` ou `x-asaas-signature`
- Usava `crypto.createHmac()` para validação

### ✅ **IMPLEMENTAÇÃO CORRETA (oficial):**
- Asaas envia header `asaas-access-token`
- Token é configurado no painel Asaas
- Validação é simples: comparar token recebido com esperado
- **Documentação:** https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook

---

## 🛠️ CORREÇÕES APLICADAS

### **1. Webhook Python (agent/src/api/webhooks_asaas.py)**

✅ **Commits aplicados:**
- `d64554a` - Validação via header `asaas-access-token`
- `dd60cfc` - Correção de conflito no logger

**Código correto:**
```python
asaas_access_token: Optional[str] = Header(None, alias="asaas-access-token")

expected_token = os.getenv('ASAAS_WEBHOOK_TOKEN')
if asaas_access_token != expected_token:
    raise HTTPException(status_code=401, detail="Unauthorized")
```

### **2. Webhook Express (src/api/routes/webhooks/asaas-webhook.ts)**

✅ **ATUALIZADO** - Mesma lógica do Python implementada

**Mudanças aplicadas:**
1. ✅ Removida função `verifyAsaasSignature()` com HMAC SHA256
2. ✅ Removido import `crypto` (não mais necessário)
3. ✅ Adicionada função `verifyAsaasToken()` simples
4. ✅ Validação via header `asaas-access-token`
5. ✅ Logs de debug melhorados
6. ✅ Resposta inclui `received: true` (padrão Asaas)
7. ✅ Toda lógica de comissões mantida intacta

**Código correto:**
```typescript
function verifyAsaasToken(receivedToken: string | undefined): boolean {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  
  if (!expectedToken) {
    console.error('[AsaasWebhook] ❌ ASAAS_WEBHOOK_TOKEN não configurado');
    return false;
  }

  if (!receivedToken) {
    console.error('[AsaasWebhook] ❌ Header asaas-access-token não fornecido');
    return false;
  }

  return receivedToken === expectedToken;
}

// No handler:
const receivedToken = req.headers['asaas-access-token'] as string;
if (!verifyAsaasToken(receivedToken)) {
  return res.status(401).json({ 
    success: false,
    error: 'Unauthorized - Token inválido' 
  });
}
```

---

## 📊 COMPARAÇÃO

| Aspecto | Python (VPS) | Express (Docker Swarm) |
|---------|--------------|------------------------|
| **Localização** | agent/src/api/webhooks_asaas.py | src/api/routes/webhooks/asaas-webhook.ts |
| **Servidor** | VPS Easypanel (instável) | Docker Swarm (HA) |
| **Autenticação** | ✅ Correta (asaas-access-token) | ✅ Correta (asaas-access-token) |
| **Status** | ✅ Funcionando | ✅ Atualizado e pronto |
| **Lógica Comissões** | ✅ Implementada | ✅ Implementada |
| **RPC calculate_commission_split** | ✅ Usa | ✅ Usa |
| **Build** | ✅ OK | ✅ OK (validado) |

---

## 🎯 PRÓXIMOS PASSOS

### **FASE 1: Atualizar Webhook Express** ✅
- [x] Remover validação HMAC SHA256
- [x] Adicionar validação via `asaas-access-token`
- [x] Validar build (passou sem erros)
- [ ] Deploy para Docker Swarm (Renato)

### **FASE 2: Configurar Painel Asaas** 🚧
- [ ] Adicionar URL do webhook Express no painel
- [ ] Configurar token: `1013e1fa-12d3-4b89-bc23-704068796447`
- [ ] Testar com pagamento real

### **FASE 3: Validação Paralela** 🚧
- [ ] Manter ambos webhooks ativos temporariamente
- [ ] Comparar processamento
- [ ] Validar comissões calculadas

### **FASE 4: Migração Final** ⏳
- [ ] Remover webhook Python do painel
- [ ] Manter apenas Express ativo
- [ ] Documentar mudança

---

## 🔐 CONFIGURAÇÃO

### **Variáveis de Ambiente:**
```bash
# Já configurado no .env
ASAAS_WEBHOOK_TOKEN=1013e1fa-12d3-4b89-bc23-704068796447
```

### **Header Enviado pelo Asaas:**
```
asaas-access-token: 1013e1fa-12d3-4b89-bc23-704068796447
```

### **Validação Correta (implementada):**
```typescript
const receivedToken = req.headers['asaas-access-token'];
const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

if (receivedToken !== expectedToken) {
  return res.status(401).json({ 
    success: false,
    error: 'Unauthorized - Token inválido' 
  });
}
```

### **URL do Webhook Express:**
```
https://api.slimquality.com.br/api/webhooks/asaas
```

---

## 📝 NOTAS IMPORTANTES

1. **Token é fixo:** Configurado no painel Asaas, não muda por requisição
2. **Sem assinatura:** Asaas NÃO calcula HMAC do payload
3. **Resposta rápida:** Webhook retorna `{received: true}` imediatamente
4. **Processamento assíncrono:** Cálculo de comissões via retry automático
5. **Logs detalhados:** Todos os eventos são registrados em `webhook_logs`
6. **Alta disponibilidade:** Docker Swarm garante uptime do webhook

---

## ✅ VALIDAÇÕES REALIZADAS

- [x] Código compila sem erros (`npm run build`)
- [x] Variável `ASAAS_WEBHOOK_TOKEN` está no `.env`
- [x] Lógica de comissões não foi alterada
- [x] RPC `calculate_commission_split` mantido
- [x] Logs de debug adicionados
- [x] Resposta padrão Asaas implementada
- [x] Tratamento de erros mantido

---

## 🚀 DEPLOY

**Próximo passo:** Renato deve fazer deploy do Express para Docker Swarm e configurar URL no painel Asaas.

**Comando para testar localmente:**
```bash
curl -X POST http://localhost:3000/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: 1013e1fa-12d3-4b89-bc23-704068796447" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test123",
      "value": 3290.00,
      "externalReference": "order_uuid_aqui"
    }
  }'
```

---

**Última atualização:** 12/01/2026 às 11:15  
**Responsável:** Kiro AI  
**Status:** ✅ Código atualizado e validado - Pronto para deploy
