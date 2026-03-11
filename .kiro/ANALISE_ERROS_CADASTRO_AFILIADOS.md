# 🔍 ANÁLISE DE ERROS NO CADASTRO DE AFILIADOS

**Data:** 11/03/2026  
**Status:** ANÁLISE APENAS - AGUARDANDO AUTORIZAÇÃO PARA CORREÇÕES

---

## 📋 ERROS IDENTIFICADOS NO CONSOLE

### 1. ❌ ERRO 406 - Supabase Customers Table

**URL:** `vtynmmtuvxreiwcxxlma.supabase.co/rest/v1/customers?select=...&user_id=eq.e8bb906b...`

**Status:** `406 Not Acceptable`

**Causa Provável:**
- Query com `select` de colunas que não existem na tabela
- Ou problema de permissão RLS

**Arquivo Afetado:** `src/services/customer-auth.service.ts`

**Linha:** 392 (já corrigida anteriormente)

**Status da Correção Anterior:**
- ✅ Correção aplicada em 10/03/2026 (commit `7d9b5ca`)
- ✅ Lista explícita de colunas implementada
- ⚠️ **ERRO PERSISTE** - Pode ser problema de RLS ou cache

**Análise Adicional Necessária:**
- Verificar se RLS policies da tabela `customers` estão corretas
- Verificar se há cache no navegador
- Testar em aba anônima

---

### 2. ❌ ERRO 404 - API create-payment

**URL:** `/api/create-payment?action=create-affiliate-membership`

**Status:** `404 Not Found`

**Causa Identificada:**
O arquivo `api/create-payment.js` **TEM** a action `create-affiliate-membership` implementada (linha 64), mas o erro 404 indica que:

1. **Possibilidade 1:** Rota não está sendo encontrada pelo Vercel
2. **Possibilidade 2:** Deploy não incluiu a action nova
3. **Possibilidade 3:** Cache do Vercel

**Código Existente em `api/create-payment.js`:**
```javascript
case 'create-affiliate-membership':
  return handleCreateAffiliateMembership(req, res, supabase);
```

**Função Implementada:** Linhas 800+ (arquivo truncado, mas existe)

**Status:**
- ✅ Código existe no repositório
- ❌ Vercel não está encontrando a rota
- ⚠️ Pode ser problema de deploy ou cache

---

### 3. ⚠️ WebSocket Connection Failed

**URL:** `ws://localhost:8081/`

**Causa:**
- Vite HMR (Hot Module Reload) tentando conectar em desenvolvimento
- **NÃO É UM ERRO REAL** - apenas warning de desenvolvimento
- Não afeta funcionalidade em produção

**Ação:** Ignorar

---

## 🔍 ANÁLISE DETALHADA DO FLUXO DE CADASTRO

### Fluxo Esperado:

1. **Frontend:** Usuário preenche formulário em `/afiliados/cadastro`
2. **Validação:** Frontend valida dados localmente
3. **API 1:** `POST /api/affiliates?action=payment-first-validate`
   - Valida dados
   - Cria sessão temporária em `payment_sessions`
   - Retorna `session_token`
4. **API 2:** `POST /api/create-payment?action=create-affiliate-membership`
   - Usa `session_token`
   - Cria customer no Asaas
   - Cria pagamento de adesão
   - Retorna dados de pagamento (PIX QR Code)
5. **Frontend:** Exibe QR Code para pagamento
6. **Webhook:** Asaas notifica pagamento confirmado
7. **Backend:** Cria afiliado definitivo

### Onde o Fluxo Está Quebrando:

#### ✅ ETAPA 1-3: Funcionando
- Frontend valida dados
- API `payment-first-validate` é chamada
- Sessão temporária é criada

#### ❌ ETAPA 4: FALHANDO
- API `create-affiliate-membership` retorna 404
- Pagamento não é criado
- Fluxo é interrompido

---

## 🎯 CAUSA RAIZ PROVÁVEL

### Problema Principal: Deploy Incompleto ou Cache

**Evidências:**
1. ✅ Código existe em `api/create-payment.js`
2. ✅ Action `create-affiliate-membership` está implementada
3. ❌ Vercel retorna 404 para a rota
4. ⚠️ Última atualização da chave Asaas foi hoje (11/03)

**Hipóteses:**

#### Hipótese 1: Cache do Vercel (MAIS PROVÁVEL)
- Deploy foi feito mas Vercel está servindo versão antiga
- Cache de edge não foi invalidado
- Solução: Forçar redeploy ou limpar cache

#### Hipótese 2: Arquivo Não Foi Deployado
- Git push não incluiu `api/create-payment.js`
- Ou arquivo foi excluído acidentalmente
- Solução: Verificar se arquivo existe no repositório remoto

#### Hipótese 3: Erro de Sintaxe Impedindo Deploy
- Arquivo tem erro de sintaxe
- Vercel não conseguiu fazer build
- Solução: Verificar logs de build no Vercel

---

## 🔧 SOLUÇÕES PROPOSTAS (AGUARDANDO AUTORIZAÇÃO)

### Solução 1: Verificar Logs do Vercel ⚠️ URGENTE

**Ação:**
1. Acessar Vercel Dashboard
2. Ir em Deployments → Último deploy
3. Ver logs de build
4. Verificar se há erros em `api/create-payment.js`

**Resultado Esperado:**
- Identificar se arquivo foi deployado
- Ver se há erros de sintaxe
- Confirmar se action está disponível

---

### Solução 2: Forçar Redeploy

**Ação:**
1. Vercel Dashboard → Deployments
2. Último deploy → Redeploy
3. Aguardar conclusão (~1-2 min)
4. Testar novamente

**Resultado Esperado:**
- Cache limpo
- Nova versão deployada
- Rota funcionando

---

### Solução 3: Verificar Arquivo no Repositório

**Ação:**
1. Verificar se `api/create-payment.js` existe no GitHub
2. Verificar se action `create-affiliate-membership` está presente
3. Verificar último commit que modificou o arquivo

**Resultado Esperado:**
- Confirmar que código está no repositório
- Identificar se houve alguma exclusão acidental

---

### Solução 4: Adicionar Logs de Debug (SE NECESSÁRIO)

**Ação:**
1. Adicionar logs no início de `handleCreateAffiliateMembership()`
2. Fazer commit e push
3. Aguardar deploy
4. Testar e verificar logs no Vercel

**Código Sugerido:**
```javascript
async function handleCreateAffiliateMembership(req, res, supabase) {
  console.log('[CreateAffiliateMembership] Função chamada');
  console.log('[CreateAffiliateMembership] Method:', req.method);
  console.log('[CreateAffiliateMembership] Body:', req.body);
  
  // ... resto do código
}
```

---

## 📊 ANÁLISE DO ERRO 406 (Customers Table)

### Problema:
Query Supabase retornando 406 mesmo após correção anterior.

### Possíveis Causas:

#### Causa 1: RLS Policy Bloqueando
- Policy pode estar rejeitando SELECT com lista de colunas
- Ou policy está mal configurada

**Verificação Necessária:**
```sql
-- Ver policies da tabela customers
SELECT * FROM pg_policies WHERE tablename = 'customers';
```

#### Causa 2: Cache do Navegador
- Navegador pode estar usando versão antiga do código
- Service Worker pode estar cacheando

**Solução:**
- Testar em aba anônima
- Limpar cache do navegador
- Desabilitar service worker

#### Causa 3: Coluna Não Existe
- Alguma coluna na lista pode não existir
- Ou foi renomeada/deletada

**Verificação Necessária:**
```sql
-- Ver colunas reais da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers';
```

---

## 🎯 PRÓXIMOS PASSOS RECOMENDADOS

### Passo 1: Verificar Logs do Vercel (IMEDIATO)
- Acessar Vercel Dashboard
- Ver logs do último deploy
- Identificar se há erros

### Passo 2: Forçar Redeploy (SE LOGS OK)
- Fazer redeploy manual
- Aguardar conclusão
- Testar cadastro novamente

### Passo 3: Testar em Aba Anônima (ERRO 406)
- Abrir aba anônima
- Tentar cadastrar afiliado
- Ver se erro 406 persiste

### Passo 4: Verificar RLS Policies (SE ERRO 406 PERSISTIR)
- Usar Supabase Power
- Consultar policies da tabela customers
- Verificar se há bloqueio

### Passo 5: Adicionar Logs (SE NECESSÁRIO)
- Adicionar logs em `handleCreateAffiliateMembership()`
- Fazer commit e push
- Verificar logs no Vercel

---

## 📝 RESUMO EXECUTIVO

### Problema Principal:
Cadastro de afiliados falhando com erro 404 na API `create-affiliate-membership`.

### Causa Mais Provável:
Cache do Vercel ou deploy incompleto.

### Solução Mais Rápida:
Forçar redeploy no Vercel Dashboard.

### Problema Secundário:
Erro 406 na query de customers (pode ser cache do navegador).

### Solução Secundária:
Testar em aba anônima ou limpar cache.

---

## ⚠️ IMPORTANTE

**NENHUMA CORREÇÃO FOI APLICADA NESTE DOCUMENTO.**

Este é apenas uma análise dos erros identificados. Aguardando autorização do usuário para:

1. ✅ Verificar logs do Vercel
2. ✅ Forçar redeploy
3. ✅ Adicionar logs de debug
4. ✅ Verificar RLS policies
5. ✅ Testar em aba anônima

---

**Análise realizada por:** Kiro AI  
**Data:** 11/03/2026  
**Status:** AGUARDANDO AUTORIZAÇÃO PARA CORREÇÕES
