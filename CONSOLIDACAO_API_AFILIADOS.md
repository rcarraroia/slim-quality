# 🔄 CONSOLIDAÇÃO DE APIs DE AFILIADOS

## 📋 PROBLEMA IDENTIFICADO

**Erro no Deploy Vercel:**
```
Error: No more than 12 Serverless Functions can be added to a Deployment 
on the Hobby plan.
```

**Causa:** Tínhamos 14 Serverless Functions, mas o plano Hobby limita a 12.

---

## ✅ SOLUÇÃO IMPLEMENTADA

### Consolidação de APIs

**ANTES:** 7 APIs separadas
- `api/affiliates/balance.js`
- `api/affiliates/export.js`
- `api/affiliates/referral-link.js`
- `api/affiliates/sales.js`
- `api/affiliates/stats.js`
- `api/affiliates/withdrawals.js`
- `api/affiliates/notifications/preferences.js`

**DEPOIS:** 1 API consolidada
- `api/affiliates.js` (com roteamento interno via `?action=`)

### Total de Serverless Functions

**ANTES:** 14 funções ❌
1. api/chat-proxy.js
2. api/checkout.js
3. api/health.js
4. api/webhook-asaas.js
5. api/affiliates/balance.js
6. api/affiliates/export.js
7. api/affiliates/referral-link.js
8. api/affiliates/sales.js
9. api/affiliates/stats.js
10. api/affiliates/withdrawals.js
11. api/affiliates/notifications/preferences.js
12. api/referral/track-click.js
13. api/referral/track-conversion.js
14. **TOTAL: 14** (2 acima do limite)

**DEPOIS:** 8 funções ✅
1. api/chat-proxy.js
2. api/checkout.js
3. api/health.js
4. api/webhook-asaas.js
5. api/affiliates.js (CONSOLIDADA)
6. api/referral/track-click.js
7. api/referral/track-conversion.js
8. **TOTAL: 8** (dentro do limite de 12)

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### API Consolidada (`api/affiliates.js`)

**Roteamento por Query Parameter:**
```javascript
// Exemplo de uso:
GET  /api/affiliates?action=balance
POST /api/affiliates?action=export
GET  /api/affiliates?action=referral-link
GET  /api/affiliates?action=sales
GET  /api/affiliates?action=stats
GET  /api/affiliates?action=withdrawals
POST /api/affiliates?action=withdrawals
GET  /api/affiliates?action=notifications
POST /api/affiliates?action=notifications
```

**Estrutura Interna:**
- Switch/case para rotear por `action`
- Funções handlers separadas para cada ação
- Helpers compartilhados (autenticação, processamento de dados, geração de CSV)
- Tratamento de erros centralizado

### Atualização do Frontend

**Arquivo:** `src/services/frontend/affiliate.service.ts`

**Mudanças nas URLs:**
```typescript
// ANTES
fetch(`${this.baseUrl}/balance`)
fetch(`${this.baseUrl}/export`)
fetch(`${this.baseUrl}/referral-link`)
// etc...

// DEPOIS
fetch(`${this.baseUrl}?action=balance`)
fetch(`${this.baseUrl}?action=export`)
fetch(`${this.baseUrl}?action=referral-link`)
// etc...
```

---

## 🧪 COMO TESTAR

### 1. Testar Localmente (Opcional)

```bash
# Build do projeto
npm run build

# Verificar se não há erros
# ✅ Build deve passar sem erros
```

### 2. Testar no Vercel (Deploy)

**Aguardar deploy automático no Vercel após o push.**

**Verificar:**
- ✅ Deploy deve completar sem erro de limite de funções
- ✅ Todas as páginas do painel de afiliados devem funcionar

### 3. Testar Funcionalidades no Painel

**Acessar:** https://slimquality.com.br/afiliados/dashboard

**Testar cada página:**

#### 📊 Página Inicial
- [ ] Cards de resumo carregam
- [ ] Comissões recentes aparecem
- [ ] Link de indicação funciona

#### 🌳 Minha Rede
- [ ] Árvore genealógica carrega
- [ ] Estatísticas da rede aparecem
- [ ] Exportação CSV funciona

#### 💰 Comissões
- [ ] Lista de comissões carrega
- [ ] Filtros funcionam
- [ ] Paginação funciona
- [ ] Exportação CSV funciona

#### 🛒 Vendas
- [ ] Lista de vendas carrega
- [ ] Filtros funcionam
- [ ] Modal de detalhes abre
- [ ] Exportação CSV funciona

#### 💳 Recebimentos
- [ ] Saldo carrega corretamente
- [ ] Histórico de saques aparece
- [ ] Solicitação de saque funciona

#### 📈 Estatísticas
- [ ] Cards de resumo carregam
- [ ] Gráfico de performance aparece
- [ ] Funil de conversão aparece
- [ ] Crescimento da rede aparece

#### ⚙️ Configurações
- [ ] Dados do perfil carregam
- [ ] Alteração de senha funciona
- [ ] Preferências de notificações salvam
- [ ] Slug personalizado funciona

---

## 🗑️ PRÓXIMOS PASSOS (APÓS VALIDAÇÃO)

### Se tudo funcionar corretamente:

**Deletar APIs antigas:**
```bash
rm api/affiliates/balance.js
rm api/affiliates/export.js
rm api/affiliates/referral-link.js
rm api/affiliates/sales.js
rm api/affiliates/stats.js
rm api/affiliates/withdrawals.js
rm api/affiliates/notifications/preferences.js
rmdir api/affiliates/notifications
```

**Commit da limpeza:**
```bash
git add -A
git commit -m "chore: remover APIs antigas de afiliados após validação"
git push origin main
```

---

## 🚨 ROLLBACK (SE NECESSÁRIO)

### Se algo não funcionar:

**1. Reverter para APIs antigas:**
```bash
# Reverter commit
git revert HEAD

# Ou resetar para commit anterior
git reset --hard 70358df

# Push forçado (cuidado!)
git push origin main --force
```

**2. Restaurar URLs antigas no service:**
```bash
# Editar src/services/frontend/affiliate.service.ts
# Trocar ?action= de volta para /endpoint
```

---

## 📊 RESUMO

**Problema:** 14 Serverless Functions (limite: 12)
**Solução:** Consolidar 7 APIs em 1
**Resultado:** 8 Serverless Functions ✅
**Status:** Implementado e aguardando validação
**Backup:** APIs antigas mantidas até validação

**Commit:** `cb4ac31`
**Branch:** `main`
**Deploy:** Automático no Vercel

---

**Data:** 14/01/2026
**Autor:** Kiro AI
**Status:** ⏳ Aguardando validação do usuário
