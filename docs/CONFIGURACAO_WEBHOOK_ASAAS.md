# Configuração de Webhook no Painel Asaas - Slim Quality

**Data:** 06/01/2026  
**Autor:** Kiro AI  
**Status:** Guia de Configuração Baseado no Painel Real  

---

## 🎯 OBJETIVO

Configurar webhook no painel Asaas para monitorar todos os eventos críticos do sistema de vendas e afiliados da Slim Quality, baseado nos eventos **reais** disponíveis no painel.

---

## 📋 CONFIGURAÇÃO RECOMENDADA

### URL do Webhook
```
https://api.slimquality.com.br/api/webhooks/asaas
```

### Método de Autenticação
- **Tipo:** HMAC SHA-256
- **Secret:** Configurar no painel e adicionar em `.env` como `ASAAS_WEBHOOK_SECRET`

---

## ✅ EVENTOS DISPONÍVEIS NO PAINEL (Baseado na imagem fornecida)

### 🔴 CRÍTICOS (Obrigatórios para o sistema de afiliados)

#### 1. **PAYMENT_RECEIVED** ✅
- **Quando:** Pagamento recebido (PIX confirmado, boleto pago)
- **Por que:** Confirmar pagamento e disparar cálculo de comissões
- **Prioridade:** 🔴 CRÍTICA
- **Status no código:** ✅ Implementado
- **Checkbox no painel:** ✅ MARCAR

#### 2. **PAYMENT_CONFIRMED** ✅
- **Quando:** Pagamento confirmado (cartão aprovado)
- **Por que:** Confirmar pagamento de cartão e processar comissões
- **Prioridade:** 🔴 CRÍTICA
- **Status no código:** ✅ Implementado
- **Checkbox no painel:** ✅ MARCAR

#### 3. **PAYMENT_DELETED** ✅
- **Quando:** Cobrança cancelada/deletada
- **Por que:** Reverter comissões se já foram calculadas
- **Prioridade:** 🔴 CRÍTICA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

#### 4. **PAYMENT_REFUNDED** ✅
- **Quando:** Pagamento estornado
- **Por que:** Reverter comissões e ajustar saldos dos afiliados
- **Prioridade:** 🔴 CRÍTICA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

#### 5. **PAYMENT_CHARGEBACK_REQUESTED** ✅
- **Quando:** Cliente solicita chargeback
- **Por que:** Alertar sobre possível perda e pausar comissões
- **Prioridade:** 🔴 CRÍTICA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

---

### 🟡 IMPORTANTES (Recomendados)

#### 6. **PAYMENT_OVERDUE** ✅
- **Quando:** Pagamento vencido (boleto não pago)
- **Por que:** Notificar cliente e pausar processamento de comissões
- **Prioridade:** 🟡 ALTA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

#### 7. **PAYMENT_AWAITING_RISK_ANALYSIS** ✅
- **Quando:** Pagamento em análise de risco (cartão)
- **Por que:** Aguardar aprovação antes de processar comissões
- **Prioridade:** 🟡 ALTA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

#### 8. **PAYMENT_APPROVED_BY_RISK_ANALYSIS** ✅
- **Quando:** Pagamento aprovado pela análise de risco
- **Por que:** Liberar processamento de comissões
- **Prioridade:** 🟡 ALTA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

#### 9. **PAYMENT_REPROVED_BY_RISK_ANALYSIS** ✅
- **Quando:** Pagamento reprovado pela análise de risco
- **Por que:** Cancelar pedido e não processar comissões
- **Prioridade:** 🟡 ALTA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

---

### 🟢 ÚTEIS (Opcionais mas recomendados)

#### 10. **PAYMENT_CREATED** ✅
- **Quando:** Cobrança criada
- **Por que:** Registrar criação da cobrança para auditoria
- **Prioridade:** 🟢 MÉDIA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

#### 11. **PAYMENT_UPDATED** ✅
- **Quando:** Dados da cobrança atualizados
- **Por que:** Manter dados sincronizados
- **Prioridade:** 🟢 MÉDIA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

#### 12. **PAYMENT_RESTORED** ✅
- **Quando:** Cobrança restaurada após ser deletada
- **Por que:** Reprocessar comissões se necessário
- **Prioridade:** 🟢 MÉDIA
- **Status no código:** ❌ Precisa implementar
- **Checkbox no painel:** ✅ MARCAR

---

### ❌ EVENTOS QUE NÃO PRECISAM SER ATIVADOS (Visíveis no painel)

#### **PAYMENT_BANK_SLIP_VIEWED**
- **Por que:** Não relevante para o negócio (apenas visualização)
- **Checkbox no painel:** ❌ NÃO MARCAR

#### **PAYMENT_CHECKOUT_VIEWED**
- **Por que:** Não relevante para o negócio (apenas visualização)
- **Checkbox no painel:** ❌ NÃO MARCAR

#### **PAYMENT_ANTICIPATED**
- **Por que:** Não usamos antecipação no modelo de negócio
- **Checkbox no painel:** ❌ NÃO MARCAR

#### **PAYMENT_CREDIT_CARD_CAPTURE_REFUSED**
- **Por que:** Já tratado por PAYMENT_REPROVED_BY_RISK_ANALYSIS
- **Checkbox no painel:** ❌ NÃO MARCAR

---

### � OuBSERVAÇÃO IMPORTANTE SOBRE SPLITS

**Baseado na análise da imagem do painel:** Não identifiquei eventos específicos de split (como PAYMENT_SPLIT_CREATED, PAYMENT_SPLIT_CONFIRMED, etc.) na lista de eventos disponíveis. 

**Isso significa que:**
- Os eventos de split podem não estar disponíveis nesta versão do painel Asaas
- Ou podem estar em uma seção separada não visível na imagem
- Ou podem ter nomenclatura diferente

**Recomendação:** Verificar se há uma seção específica para "Splits" ou "Transferências" no painel, ou se esses eventos aparecem com nomes diferentes.

---

## 🔧 PASSO A PASSO DA CONFIGURAÇÃO

### 1. Acessar Painel Asaas
- Login em: https://www.asaas.com
- Ir em: **Configurações** → **Webhooks**

### 2. Criar Novo Webhook
- Clicar em **"Novo Webhook"** ou **"Adicionar"**

### 3. Configurar URL
```
URL: https://api.slimquality.com.br/api/webhooks/asaas
Método: POST
```

### 4. Configurar Autenticação
- **Tipo:** HMAC SHA-256
- **Gerar Secret** (copiar e guardar)
- Adicionar no `.env`:
```bash
ASAAS_WEBHOOK_SECRET=seu_secret_aqui
```

### 5. Selecionar Eventos

**Marcar os seguintes checkboxes:**

#### Pagamentos (Obrigatórios):
- ✅ PAYMENT_CREATED
- ✅ PAYMENT_UPDATED
- ✅ PAYMENT_CONFIRMED
- ✅ PAYMENT_RECEIVED
- ✅ PAYMENT_OVERDUE
- ✅ PAYMENT_DELETED
- ✅ PAYMENT_REFUNDED
- ✅ PAYMENT_RESTORED
- ✅ PAYMENT_AWAITING_RISK_ANALYSIS
- ✅ PAYMENT_APPROVED_BY_RISK_ANALYSIS
- ✅ PAYMENT_REPROVED_BY_RISK_ANALYSIS
- ✅ PAYMENT_CHARGEBACK_REQUESTED
- ✅ PAYMENT_CHARGEBACK_DISPUTE
- ✅ PAYMENT_DUNNING_RECEIVED

#### Splits (Se disponível):
- ✅ PAYMENT_SPLIT_CREATED
- ✅ PAYMENT_SPLIT_CONFIRMED
- ✅ PAYMENT_SPLIT_FAILED

#### NÃO marcar:
- ❌ PAYMENT_BANK_SLIP_VIEWED
- ❌ PAYMENT_CHECKOUT_VIEWED
- ❌ PAYMENT_ANTICIPATED
- ❌ Outros eventos não listados acima

### 6. Testar Webhook
- Usar botão **"Testar Webhook"** no painel
- Verificar logs em: `https://api.slimquality.com.br/api/health`
- Verificar tabela `webhook_logs` no Supabase

### 7. Ativar Webhook
- Marcar como **"Ativo"**
- Salvar configuração

---

## 🔒 SEGURANÇA

### Validação HMAC
O webhook secret será usado para validar que os eventos vêm realmente do Asaas:

```typescript
// Código já implementado em asaas-webhook.ts
function verifyAsaasSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### Variáveis de Ambiente
Adicionar no `.env` e `.env.production`:

```bash
# Webhook Asaas
ASAAS_WEBHOOK_SECRET=seu_secret_gerado_no_painel
ASAAS_WEBHOOK_URL=https://api.slimquality.com.br/api/webhooks/asaas
```

---

## 📊 MONITORAMENTO

### Logs de Webhook
Todos os eventos serão registrados em:
- Tabela: `webhook_logs`
- Campos importantes:
  - `provider`: 'asaas'
  - `event_type`: tipo do evento
  - `payment_id`: ID do pagamento
  - `status`: 'success', 'error', 'ignored'
  - `payload`: dados completos do webhook

### Consultar Logs
```sql
-- Últimos 100 webhooks recebidos
SELECT 
  event_type,
  payment_id,
  status,
  processed_at
FROM webhook_logs
WHERE provider = 'asaas'
ORDER BY processed_at DESC
LIMIT 100;

-- Webhooks com erro
SELECT 
  event_type,
  payment_id,
  error_message,
  processed_at
FROM webhook_logs
WHERE provider = 'asaas' 
  AND status = 'error'
ORDER BY processed_at DESC;

-- Eventos por tipo (últimas 24h)
SELECT 
  event_type,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
FROM webhook_logs
WHERE provider = 'asaas'
  AND processed_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY total DESC;
```

---

## 🧪 TESTE DO WEBHOOK

### Teste Manual via Painel Asaas
1. No painel, clicar em **"Testar Webhook"**
2. Selecionar evento: **PAYMENT_RECEIVED**
3. Enviar teste
4. Verificar resposta: deve retornar `200 OK`

### Teste via cURL
```bash
# Simular webhook do Asaas
curl -X POST https://api.slimquality.com.br/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "x-asaas-signature: test-signature" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test_123",
      "status": "RECEIVED",
      "value": 3290.00,
      "netValue": 3290.00,
      "customer": "cus_test_123",
      "dateCreated": "2026-01-06T10:00:00.000Z",
      "dueDate": "2026-01-13T10:00:00.000Z",
      "paymentDate": "2026-01-06T10:00:00.000Z"
    }
  }'
```

### Verificar Logs
```bash
# Ver logs do webhook
curl https://api.slimquality.com.br/api/webhooks/asaas/logs

# Ver últimos eventos processados
# (Acessar Supabase e consultar tabela webhook_logs)
```

---

## 🚨 TROUBLESHOOTING

### Webhook não está recebendo eventos
1. ✅ Verificar se URL está correta
2. ✅ Verificar se webhook está ativo no painel
3. ✅ Verificar se eventos estão marcados
4. ✅ Verificar logs do servidor
5. ✅ Testar manualmente via painel

### Webhook retorna erro 401
1. ✅ Verificar se `ASAAS_WEBHOOK_SECRET` está configurado
2. ✅ Verificar se secret no `.env` é o mesmo do painel
3. ✅ Verificar se validação HMAC está funcionando

### Webhook retorna erro 500
1. ✅ Verificar logs do servidor
2. ✅ Verificar se banco de dados está acessível
3. ✅ Verificar se todas as dependências estão instaladas

### Eventos sendo ignorados
1. ✅ Verificar se evento está na lista de eventos tratados
2. ✅ Verificar logs em `webhook_logs` com `status = 'ignored'`
3. ✅ Adicionar handler para o evento se necessário

---

## 📝 CHECKLIST DE CONFIGURAÇÃO

### Antes de Configurar
- [ ] Backend deployado e funcionando
- [ ] URL `https://api.slimquality.com.br/api/webhooks/asaas` acessível
- [ ] Endpoint retorna 200 OK para requisições POST
- [ ] Tabela `webhook_logs` criada no banco

### Durante Configuração
- [ ] Webhook criado no painel Asaas
- [ ] URL configurada corretamente
- [ ] Secret gerado e copiado
- [ ] Eventos críticos marcados (mínimo: PAYMENT_RECEIVED, PAYMENT_CONFIRMED)
- [ ] Webhook ativado

### Após Configuração
- [ ] Secret adicionado no `.env` como `ASAAS_WEBHOOK_SECRET`
- [ ] Backend reiniciado (se necessário)
- [ ] Teste manual executado via painel
- [ ] Logs verificados (deve aparecer evento de teste)
- [ ] Teste real com pagamento (PIX ou cartão)
- [ ] Comissões calculadas automaticamente

---

## 🎯 RESUMO EXECUTIVO

### Eventos Mínimos (Para começar)
Se quiser começar com o mínimo e expandir depois:

**Obrigatórios:**
1. ✅ PAYMENT_RECEIVED
2. ✅ PAYMENT_CONFIRMED
3. ✅ PAYMENT_DELETED
4. ✅ PAYMENT_REFUNDED

**Total:** 4 eventos

### Eventos Recomendados (Produção)
Para sistema completo e robusto:

**Críticos:** 6 eventos
**Importantes:** 4 eventos
**Úteis:** 4 eventos
**Splits:** 3 eventos (se disponível)

**Total:** 14-17 eventos

### Prioridade de Implementação no Código

**Fase 1 (Imediato):**
- ✅ PAYMENT_RECEIVED (já implementado)
- ✅ PAYMENT_CONFIRMED (já implementado)
- ❌ PAYMENT_DELETED (implementar)
- ❌ PAYMENT_REFUNDED (implementar)

**Fase 2 (Curto prazo):**
- ❌ PAYMENT_OVERDUE
- ❌ PAYMENT_CHARGEBACK_REQUESTED
- ❌ PAYMENT_SPLIT_CONFIRMED

**Fase 3 (Médio prazo):**
- ❌ Demais eventos

---

## 📞 SUPORTE

### Documentação Asaas
- Webhooks: https://docs.asaas.com/reference/webhooks
- Eventos: https://docs.asaas.com/reference/eventos-de-webhook

### Logs do Sistema
- Webhook logs: Tabela `webhook_logs` no Supabase
- API logs: Logs do servidor no EasyPanel

---

**Configuração criada em:** 06/01/2026  
**Última atualização:** 06/01/2026  
**Status:** Pronto para configurar no painel Asaas
