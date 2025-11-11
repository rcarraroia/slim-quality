# 🚀 PASSO A PASSO - COMMIT E DEPLOY

## ✅ SISTEMA PRONTO PARA DEPLOY

Todas as correções foram aplicadas e o banco está 100% funcional!

---

## 📝 PASSO 1: COMMIT E PUSH

### 1.1 Verificar Status
```bash
git status
```

### 1.2 Adicionar Todos os Arquivos
```bash
git add .
```

### 1.3 Fazer Commit
```bash
git commit -m "feat: Sistema completo - Banco 100% funcional

- ✅ Sprint 1: Auth (3 tabelas)
- ✅ Sprint 2: Produtos (5 tabelas)
- ✅ Sprint 3: Vendas (8 tabelas)
- ✅ Sprint 4: Afiliados (10 tabelas)
- ✅ Sprint 5: CRM (7 tabelas)

Correções aplicadas:
- Migration duplicada renomeada
- Policies corrigidas (profiles.role → user_roles.role)
- Índices otimizados
- Triggers de proteção adicionados
- Total: 33 tabelas criadas com sucesso"
```

### 1.4 Push para Repositório
```bash
git push origin main
```

**✅ Pronto! Código está no repositório.**

---

## 🔐 PASSO 2: OBTER VARIÁVEIS DO SUPABASE

### 2.1 Acessar Dashboard
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: `vtynmmtuvxreiwcxxlma`
3. Vá em: Settings → API

### 2.2 Copiar Variáveis
```bash
# Project URL
VITE_SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co

# anon public (Chave Pública)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# service_role (Chave Privada)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**✅ Anote essas 3 variáveis!**

---

## 💳 PASSO 3: OBTER VARIÁVEIS DO ASAAS

### 3.1 Criar Conta (se ainda não tem)
1. Acesse: https://sandbox.asaas.com/cadastro
2. Preencha os dados
3. Confirme email

### 3.2 Obter API Key
1. Faça login em: https://sandbox.asaas.com
2. Vá em: Integrações → API
3. Copie a API Key

```bash
ASAAS_API_KEY=$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNzI1Mjk6OiRhYWNoXzRlNTkxZGY3LTBmNWYtNGRmYS04YTBiLTZlMjQwMWM3NTI3OA==
```

### 3.3 Obter Wallet IDs

**Opção A: Via Dashboard**
1. Após login, vá em: Perfil → Dados da Conta
2. Copie o Wallet ID (formato: `wal_` + 20 caracteres)

**Opção B: Via API**
```bash
curl -X GET 'https://api-sandbox.asaas.com/v3/wallets' \
  -H 'access_token: SUA_API_KEY'
```

**⚠️ IMPORTANTE:**
- Renum precisa criar conta e fornecer Wallet ID
- JB precisa criar conta e fornecer Wallet ID

```bash
ASAAS_WALLET_RENUM=wal_xxxxxxxxxxxxxxxxxxxxx
ASAAS_WALLET_JB=wal_xxxxxxxxxxxxxxxxxxxxx
```

### 3.4 Gerar Webhook Token
1. Acesse: https://www.uuidgenerator.net/
2. Copie um UUID v4

```bash
ASAAS_WEBHOOK_TOKEN=xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

### 3.5 Configurar Ambiente
```bash
ASAAS_ENVIRONMENT=sandbox
```

**✅ Anote essas 5 variáveis!**

---

## 🚀 PASSO 4: DEPLOY NO VERCEL

### 4.1 Acessar Vercel
1. Acesse: https://vercel.com
2. Faça login (ou crie conta)

### 4.2 Importar Projeto
1. Clique em: "Add New..." → "Project"
2. Clique em: "Import Git Repository"
3. Selecione seu repositório
4. Clique em: "Import"

### 4.3 Configurar Build
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Root Directory: ./
```

### 4.4 Adicionar Variáveis de Ambiente

**⚠️ ANTES DE CLICAR EM DEPLOY!**

Clique em "Environment Variables" e adicione:

```bash
# SUPABASE (3 variáveis)
VITE_SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_KEY=sua-service-key-aqui

# ASAAS (5 variáveis)
ASAAS_API_KEY=sua-api-key-aqui
ASAAS_ENVIRONMENT=sandbox
ASAAS_WALLET_RENUM=wal_xxxxxxxxxxxxxxxxxxxxx
ASAAS_WALLET_JB=wal_xxxxxxxxxxxxxxxxxxxxx
ASAAS_WEBHOOK_TOKEN=seu-uuid-v4-aqui

# API URL (deixe vazio por enquanto)
VITE_API_URL=
```

### 4.5 Deploy
1. Clique em: "Deploy"
2. Aguarde 2-5 minutos
3. ✅ Deploy concluído!

### 4.6 Copiar URL
1. Após deploy, copie a URL: `https://seu-app.vercel.app`
2. Volte em: Settings → Environment Variables
3. Edite `VITE_API_URL` e cole a URL
4. Clique em: "Deployments" → "..." → "Redeploy"

**✅ Sistema deployado!**

---

## 🔗 PASSO 5: CONFIGURAR WEBHOOK NO ASAAS

### 5.1 Acessar Webhooks
1. Acesse: https://sandbox.asaas.com
2. Vá em: Integrações → Webhooks
3. Clique em: "Adicionar Webhook"

### 5.2 Configurar
```
URL: https://seu-app.vercel.app/api/webhooks/asaas
Token: (mesmo valor de ASAAS_WEBHOOK_TOKEN)

Eventos:
✅ PAYMENT_CONFIRMED
✅ PAYMENT_RECEIVED
✅ PAYMENT_OVERDUE
✅ PAYMENT_REFUNDED
✅ PAYMENT_CANCELLED
```

### 5.3 Salvar e Testar
1. Clique em: "Salvar"
2. Clique em: "Testar Webhook"
3. Verifique se retorna sucesso

**✅ Webhook configurado!**

---

## 🧪 PASSO 6: TESTAR SISTEMA

### 6.1 Acessar Aplicação
```
https://seu-app.vercel.app
```

### 6.2 Testar Login
1. Vá em: `/login`
2. Tente fazer login
3. ✅ Deve funcionar

### 6.3 Testar Produtos
1. Vá em: `/produtos`
2. Verifique se produtos aparecem
3. ✅ Deve carregar

### 6.4 Testar Afiliados
1. Vá em: `/afiliados/cadastro`
2. Cadastre um afiliado de teste
3. ✅ Deve gerar código

### 6.5 Testar CRM
1. Vá em: `/dashboard/clientes`
2. Adicione um cliente
3. ✅ Deve salvar

**✅ Sistema funcionando!**

---

## 📊 PASSO 7: VERIFICAR LOGS

### 7.1 Logs do Vercel
1. Acesse: https://vercel.com/seu-projeto
2. Vá em: "Logs"
3. Verifique se não há erros

### 7.2 Logs do Supabase
1. Acesse: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma
2. Vá em: "Logs"
3. Verifique queries executadas

**✅ Tudo funcionando!**

---

## ✅ CHECKLIST FINAL

Antes de considerar concluído:

- [ ] Código commitado e pushed
- [ ] Variáveis do Supabase copiadas (3)
- [ ] Variáveis do Asaas copiadas (5)
- [ ] Projeto importado no Vercel
- [ ] Variáveis configuradas no Vercel (9)
- [ ] Deploy realizado com sucesso
- [ ] URL copiada e atualizada
- [ ] Webhook configurado no Asaas
- [ ] Login testado e funcionando
- [ ] Produtos carregando
- [ ] Afiliados funcionando
- [ ] CRM acessível
- [ ] Logs sem erros

**Se todos os itens estão marcados: PARABÉNS! 🎉**

**Seu sistema está 100% funcional em produção!**

---

## 🆘 PROBLEMAS?

### Erro: "Supabase connection failed"
- Verifique variáveis VITE_SUPABASE_*
- Confirme que têm prefixo VITE_
- Faça redeploy

### Erro: "Unauthorized"
- Verifique RLS no Supabase
- Confirme que usuário está logado
- Verifique policies

### Erro: "Webhook não funciona"
- Verifique URL no Asaas
- Confirme token correto
- Teste manualmente

### Build Failed
- Verifique logs do Vercel
- Teste `npm run build` localmente
- Verifique package.json

---

## 📚 DOCUMENTAÇÃO COMPLETA

- **Guia Completo:** `docs/GUIA_DEPLOY_COMPLETO.md`
- **Variáveis:** `docs/VARIAVEIS_AMBIENTE.md`
- **Correções:** `docs/CORRECAO_CONCLUIDA.md`

---

## 🎯 PRÓXIMOS PASSOS

1. **Testar Fluxo Completo:**
   - Cadastrar afiliado
   - Fazer venda com indicação
   - Verificar comissões

2. **Monitorar:**
   - Logs do Vercel
   - Logs do Supabase
   - Webhooks do Asaas

3. **Preparar Produção:**
   - Criar conta Asaas Production
   - Configurar domínio próprio
   - Atualizar variáveis

**Boas vendas! 🚀**
