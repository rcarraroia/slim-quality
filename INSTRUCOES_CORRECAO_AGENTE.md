# 🚨 INSTRUÇÕES PARA CORREÇÃO DO AGENTE - URGENTE

## ✅ DOCKER IMAGE ATUALIZADA
- **Image:** `renumvscode/slim-agent:latest`
- **Status:** Enviada para Docker Hub com correções
- **Digest:** `sha256:45ce0a2b39e0bf2b5bba3b354a0c8ef2f31432621c75f63a8299cde1d33ce143`

---

## 🔧 CORREÇÕES APLICADAS NO CÓDIGO

### 1. **CORS CORRIGIDO**
- Alterado para `allow_origins=["*"]` temporariamente
- Removido `allow_credentials=True` (conflita com wildcard)
- Deve resolver erro de CORS no site

### 2. **FUNÇÃO WHATSAPP CORRIGIDA**
- URL Evolution API corrigida
- Payload simplificado (sem `@s.whatsapp.net` duplicado)
- Headers com API Key fixa
- Logs melhorados para debug
- Timeout aumentado para 15 segundos

### 3. **LOGS MELHORADOS**
- Mensagens mais claras com emojis
- Traceback completo em erros
- Status de cada etapa do processo

---

## 🚨 AÇÕES OBRIGATÓRIAS NO EASYPANEL

### PASSO 1: REBUILD MANUAL
1. Acesse o Easypanel
2. Vá no serviço `slim-agent`
3. Clique em **"Rebuild"** ou **"Redeploy"**
4. Aguarde o download da nova imagem

### PASSO 2: CONFIGURAR VARIÁVEL OPENAI_API_KEY
**CRÍTICO:** O agente não funciona sem esta variável!

1. No Easypanel, vá em **Environment Variables**
2. Adicione ou edite:
   ```
   OPENAI_API_KEY=sk-proj-SUA_CHAVE_REAL_AQUI
   ```
3. **IMPORTANTE:** Use sua chave real da OpenAI, não a placeholder

### PASSO 3: VERIFICAR OUTRAS VARIÁVEIS
Confirme que estas variáveis estão configuradas:
```
SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0
EVOLUTION_URL=https://slimquality-evolution-api.wpjtfd.easypanel.host
EVOLUTION_INSTANCE=SlimQualit
EVOLUTION_API_KEY=9A390AED6A45-4610-93B2-245591E39FDE
ENVIRONMENT=production
PYTHONUNBUFFERED=1
```

---

## 🧪 TESTES APÓS REBUILD

### TESTE 1: WhatsApp
1. Envie mensagem para o número do WhatsApp
2. Verifique nos logs se aparece:
   ```
   📱 MENSAGEM RECEBIDA de 5533XXXXXXXX: sua mensagem
   🤖 PROCESSANDO mensagem de 5533XXXXXXXX: sua mensagem
   🧠 SICC respondeu: resposta do agente
   📤 Resposta Evolution: 200
   ✅ Mensagem enviada com sucesso para 5533XXXXXXXX
   ```

### TESTE 2: Site Chat
1. Acesse https://slimquality.com.br
2. Clique no chat widget
3. Envie uma mensagem
4. Verifique se recebe resposta (não deve mais dar erro CORS)

### TESTE 3: Logs de Debug
Monitore os logs para ver:
- ✅ Webhooks chegando
- ✅ SICC processando
- ✅ Mensagens sendo enviadas
- ❌ Erros específicos (se houver)

---

## 🚨 PROBLEMAS POSSÍVEIS E SOLUÇÕES

### PROBLEMA: "OpenAI Key presente: Não"
**SOLUÇÃO:** Configurar `OPENAI_API_KEY` no Easypanel

### PROBLEMA: "❌ Erro ao enviar mensagem: 401"
**SOLUÇÃO:** Verificar `EVOLUTION_API_KEY` no Easypanel

### PROBLEMA: "❌ ERRO CRÍTICO no SICC"
**SOLUÇÃO:** Verificar todas as variáveis Supabase

### PROBLEMA: CORS ainda bloqueando
**SOLUÇÃO:** Aguardar propagação do rebuild (pode levar 2-3 minutos)

---

## 📞 PRÓXIMOS PASSOS

1. **IMEDIATO:** Fazer rebuild no Easypanel
2. **CRÍTICO:** Configurar OPENAI_API_KEY
3. **TESTE:** Enviar mensagem WhatsApp
4. **TESTE:** Testar chat do site
5. **MONITORAR:** Logs por 10 minutos

---

## 🎯 RESULTADO ESPERADO

Após essas correções:
- ✅ WhatsApp deve responder normalmente
- ✅ Site chat deve funcionar sem erro CORS
- ✅ Dashboard deve receber conversas em tempo real
- ✅ Logs devem mostrar fluxo completo funcionando

---

**TEMPO ESTIMADO:** 5-10 minutos para aplicar correções
**PRIORIDADE:** MÁXIMA - Sistema crítico fora do ar