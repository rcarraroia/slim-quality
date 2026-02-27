# RESUMO EXECUTIVO - Gerenciamento de Chave API Asaas

**Status:** 🟡 Pendente  
**Prioridade:** Alta  
**Implementar após:** Conclusão da spec atual (etapa-3-show-row)

---

## 🎯 PROBLEMA

Asaas desativa chaves de API automaticamente após ~10-14 dias de inatividade, causando:
- Sistema de pagamentos fora do ar
- Impossibilidade de processar vendas
- Sistema de afiliados parado

**Último incidente:** 18/02/2026 (chave criada em 02/02, último uso em 07/02)

---

## ✅ SOLUÇÃO RECOMENDADA

### Curto Prazo (Hoje)
**Trocar chave de API**
- Gerar nova chave no Asaas
- Atualizar na Vercel
- Fazer redeploy
- **Tempo:** 15 minutos

### Médio Prazo (Após spec atual)
**Implementar Keep-Alive Semanal** ⭐ **RECOMENDADO**
- Criar endpoint `/api/cron/asaas-keep-alive`
- Configurar Vercel Cron (todo domingo)
- Implementar health check (a cada 6h)
- Alertas automáticos por email
- **Tempo:** 4 horas

### Longo Prazo (Opcional)
**Expiração Manual de 1 Ano**
- Criar chave via API com `expirationDate`
- Desativa expiração por inatividade
- Renovar manualmente a cada ano
- **Tempo:** 1 hora

---

## 📊 BENEFÍCIOS

### Keep-Alive Semanal
✅ Totalmente automático  
✅ Zero manutenção  
✅ Detecta falhas em até 6 horas  
✅ Alertas automáticos  
✅ Solução definitiva  

### Expiração Manual
✅ Desativa expiração por inatividade  
⚠️ Requer renovação manual anual  
⚠️ Risco de esquecer de renovar  

---

## 🔧 IMPLEMENTAÇÃO

### Arquivos a Criar

1. **`api/cron/asaas-keep-alive.js`**
   - Faz ping semanal no Asaas
   - Mantém chave ativa

2. **`api/cron/check-asaas-key-health.js`**
   - Verifica saúde da chave a cada 6h
   - Envia alertas se chave inválida

3. **`vercel.json`** (atualizar)
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/asaas-keep-alive",
         "schedule": "0 0 * * 0"
       },
       {
         "path": "/api/cron/check-asaas-key-health",
         "schedule": "0 */6 * * *"
       }
     ]
   }
   ```

### Variáveis de Ambiente

Já configuradas:
- ✅ `ASAAS_API_KEY`
- ✅ `RESEND_API_KEY` (para alertas)

---

## 📅 CRONOGRAMA

| Fase | Quando | Duração | Responsável |
|------|--------|---------|-------------|
| Fase 1: Trocar chave | Hoje | 15 min | Renato |
| Fase 2: Keep-alive | Após spec atual | 4 horas | Kiro AI |
| Fase 3: Documentação | Após Fase 2 | 1 hora | Kiro AI |

---

## 📈 MÉTRICAS DE SUCESSO

- **Uptime:** > 99.9%
- **Detecção de falha:** < 6 horas
- **Incidentes:** 0 por mês
- **Alertas funcionando:** 100%

---

## 📚 DOCUMENTAÇÃO COMPLETA

Ver: `.kiro/specs/asaas-api-key-management/SPEC.md`

---

**Criado em:** 25/02/2026  
**Próxima ação:** Aguardar conclusão da spec atual
