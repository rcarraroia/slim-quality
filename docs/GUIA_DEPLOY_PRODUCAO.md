# 🚀 GUIA DE DEPLOY EM PRODUÇÃO - SLIM QUALITY

**Data:** 01/12/2025  
**Versão:** 1.0  
**Status:** Pronto para Deploy

---

## 📋 VISÃO GERAL

### Arquitetura de Deploy

O sistema Slim Quality utiliza uma arquitetura **híbrida**:

```
┌─────────────────────────────────────────────────────────┐
│                    SLIM QUALITY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend + API Backend  →  Vercel (Serverless)        │
│  Banco de Dados         →  Supabase (PostgreSQL)       │
│  Edge Functions         →  Supabase (Deno Runtime)     │
│  Storage                →  Supabase (S3-compatible)    │
│  Auth                   →  Supabase (JWT)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Componentes

1. **Vercel** - Frontend React + API Backend (Serverless Functions)
2. **Supabase** - Banco de dados, Auth, Storage, Edge Functions
3. **Asaas** - Gateway de pagamento (integração externa)

---

## 🎯 ESTRATÉGIA DE DEPLOY

### Opção Escolhida: Vercel + Supabase

**Por quê?**
- ✅ Frontend e Backend no mesmo lugar (Vercel)
- ✅ Serverless = sem gerenciamento de servidor
- ✅ Deploy automático via Git
- ✅ Escalabilidade automática
- ✅ CDN global incluído
- ✅ HTTPS automático
- ✅ Custo-benefício excelente

**Não é necessário:**
- ❌ Servidor VPS/Dedicado
- ❌ Docker/Kubernetes
- ❌ Nginx/Apache
- ❌ Gerenciamento de infraestrutura

---

## 📦 PRÉ-REQUISITOS

### 1. Contas Necessárias

- ✅ Conta Vercel (https://vercel.com)
- ✅ Conta Supabase (já existe - projeto ativo)
- ✅ Conta Asaas (para pagamentos)
- ✅ Repositório Git (GitHub/GitLab)

### 2. Variáveis de Ambiente

Preparar arquivo `.env.production`:

```bash
# Supabase (OBRIGATÓRIO)
VITE_SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Asaas (CRÍTICO)
ASAAS_API_KEY=sua-chave-asaas-producao
ASAAS_ENVIRONMENT=production
ASAAS_WEBHOOK_TOKEN=seu-token-webhook-secreto

# Wallets Asaas (OBRIGATÓRIO)
ASAAS_WALLET_FABRICA=wal_fabrica_id_real
ASAAS_WALLET_RENUM=wal_renum_id_real
ASAAS_WALLET_JB=wal_jb_id_real

# Frontend
VITE_FRONTEND_URL=https://slimquality.com.br
VITE_API_URL=https://slimquality.com.br/api

# Notificações (OPCIONAL)
NOTIFICATION_FROM_EMAIL=noreply@slimquality.com.br
NOTIFICATION_FROM_NAME=Slim Quality
```

---

## 🗄️ PASSO 1: DEPLOY DO BANCO DE DADOS (SUPABASE)

### 1.1 Verificar Projeto Supabase

```bash
# Conectar ao projeto
supabase login
supabase link --project-ref vtynmmtuvxreiwcxxlma

# Verificar status
supabase projects list
```

### 1.2 Aplicar Migrations (se necessário)

```bash
# Verificar migrations pendentes
supabase migration list

# Aplicar todas as migrations
supabase db push

# Verificar tabelas criadas
supabase db execute "
  SELECT COUNT(*) as total_tables
  FROM pg_tables 
  WHERE schemaname = 'public'
"
# Deve retornar: 33 tabelas
```

### 1.3 Configurar Edge Functions (Opcional)

```bash
# Deploy das Edge Functions (se existirem)
supabase functions deploy calculate-commissions
supabase functions deploy validate-wallet
supabase functions deploy process-split

# Configurar secrets
supabase secrets set ASAAS_API_KEY=sua-chave
supabase secrets set ASAAS_ENVIRONMENT=production
```

### 1.4 Configurar Webhooks Asaas

**No painel Asaas:**
1. Acessar: Configurações → Webhooks
2. Adicionar novo webhook:
   - URL: `https://slimquality.com.br/api/webhooks/asaas`
   - Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`
   - Token: Gerar token secreto e salvar em `.env`

---

## 🚀 PASSO 2: DEPLOY NO VERCEL

### 2.1 Preparar Repositório

```bash
# Garantir que está na branch main
git checkout main

# Commit de todas as alterações
git add .
git commit -m "chore: preparar para deploy em produção"
git push origin main
```

### 2.2 Criar Projeto no Vercel

**Via Dashboard:**
1. Acessar: https://vercel.com/new
2. Importar repositório Git
3. Configurar projeto:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

**Via CLI (alternativa):**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

### 2.3 Configurar Variáveis de Ambiente no Vercel

**No Dashboard Vercel:**
1. Ir em: Project Settings → Environment Variables
2. Adicionar TODAS as variáveis do `.env.production`
3. Selecionar: Production, Preview, Development
4. Salvar

**Via CLI:**
```bash
# Adicionar variáveis uma por uma
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add ASAAS_API_KEY production
# ... continuar para todas
```

### 2.4 Configurar Domínio Customizado

**No Dashboard Vercel:**
1. Ir em: Project Settings → Domains
2. Adicionar domínio: `slimquality.com.br`
3. Configurar DNS:
   ```
   Tipo: A
   Nome: @
   Valor: 76.76.21.21 (IP do Vercel)
   
   Tipo: CNAME
   Nome: www
   Valor: cname.vercel-dns.com
   ```
4. Aguardar propagação (até 48h)

### 2.5 Verificar Deploy

```bash
# Acessar URL de produção
https://slimquality.com.br

# Verificar API
https://slimquality.com.br/api/health

# Verificar logs
vercel logs
```

---

## ✅ PASSO 3: VALIDAÇÃO PÓS-DEPLOY

### 3.1 Checklist de Validação

- [ ] Site carrega corretamente
- [ ] Login funciona
- [ ] Redirecionamento por role funciona
- [ ] API responde (testar `/api/health`)
- [ ] Banco de dados conectado
- [ ] Imagens carregam (Supabase Storage)
- [ ] Formulários funcionam
- [ ] Webhooks Asaas configurados

### 3.2 Testes Funcionais

```bash
# 1. Testar API de saúde
curl https://slimquality.com.br/api/health

# 2. Testar validação de wallet
curl -X POST https://slimquality.com.br/api/affiliates/validate-wallet \
  -H 'Content-Type: application/json' \
  -d '{"walletId": "wal_12345678901234567890"}'

# 3. Testar webhook Asaas (simular)
curl -X POST https://slimquality.com.br/api/webhooks/asaas \
  -H 'Content-Type: application/json' \
  -H 'asaas-access-token: seu-webhook-token' \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_123",
      "value": 3290.00,
      "status": "CONFIRMED"
    }
  }'
```

### 3.3 Monitoramento

**Vercel Dashboard:**
- Analytics → Ver tráfego e performance
- Logs → Monitorar erros em tempo real
- Deployments → Histórico de deploys

**Supabase Dashboard:**
- Database → Verificar dados
- Logs → Monitorar queries
- API → Verificar uso

---

## 🔄 PROCESSO DE ATUALIZAÇÃO

### Deploy Automático (Recomendado)

```bash
# 1. Fazer alterações no código
git add .
git commit -m "feat: nova funcionalidade"

# 2. Push para main
git push origin main

# 3. Vercel detecta e faz deploy automático
# Aguardar ~2 minutos
```

### Deploy Manual (se necessário)

```bash
# Via CLI
vercel --prod

# Ou via Dashboard
# Deployments → Redeploy
```

### Rollback (em caso de erro)

```bash
# Via Dashboard
# Deployments → Selecionar deploy anterior → Promote to Production

# Via CLI
vercel rollback
```

---

## 📊 MONITORAMENTO E LOGS

### Logs do Vercel

```bash
# Ver logs em tempo real
vercel logs --follow

# Ver logs de um deploy específico
vercel logs [deployment-url]

# Filtrar por função
vercel logs --filter=api
```

### Logs do Supabase

```bash
# Ver logs das Edge Functions
supabase functions logs calculate-commissions --tail

# Ver logs do banco
# Acessar: Dashboard → Logs → Database
```

### Métricas Importantes

**Monitorar diariamente:**
- Taxa de erro (deve ser < 1%)
- Tempo de resposta (deve ser < 2s)
- Uso de recursos (Vercel + Supabase)
- Integridade financeira (splits = 100%)

---

## 🚨 TROUBLESHOOTING

### Problema: Deploy falha no Vercel

**Solução:**
```bash
# 1. Verificar logs
vercel logs

# 2. Verificar build local
npm run build

# 3. Verificar variáveis de ambiente
vercel env ls
```

### Problema: API retorna 500

**Solução:**
```bash
# 1. Verificar logs da função
vercel logs --filter=api

# 2. Verificar conexão com Supabase
# Testar credenciais no .env

# 3. Verificar se banco está ativo
supabase projects list
```

### Problema: Webhook Asaas não funciona

**Solução:**
1. Verificar URL do webhook no painel Asaas
2. Verificar token de autenticação
3. Testar endpoint manualmente com curl
4. Verificar logs: `vercel logs --filter=webhooks`

---

## 💰 CUSTOS ESTIMADOS

### Vercel (Frontend + API)
- **Hobby (Grátis):** 100GB bandwidth, 100 builds/mês
- **Pro ($20/mês):** 1TB bandwidth, builds ilimitados
- **Recomendado:** Começar com Hobby, migrar para Pro quando necessário

### Supabase (Banco + Auth + Storage)
- **Free:** 500MB database, 1GB storage, 50k usuários
- **Pro ($25/mês):** 8GB database, 100GB storage, 100k usuários
- **Recomendado:** Pro (já está ativo)

### Asaas (Gateway de Pagamento)
- **Taxa por transação:** 2.99% + R$ 0,49
- **Sem mensalidade**

**Total estimado:** R$ 150-200/mês (Supabase Pro + Vercel Pro)

---

## 📋 CHECKLIST FINAL DE DEPLOY

### Antes do Deploy
- [ ] Código testado localmente
- [ ] Testes automatizados passando
- [ ] Variáveis de ambiente preparadas
- [ ] Domínio configurado
- [ ] Backup do banco realizado

### Durante o Deploy
- [ ] Deploy no Vercel concluído
- [ ] Migrations aplicadas no Supabase
- [ ] Variáveis de ambiente configuradas
- [ ] Domínio apontando corretamente
- [ ] HTTPS ativo

### Após o Deploy
- [ ] Site acessível
- [ ] Login funcionando
- [ ] API respondendo
- [ ] Webhooks configurados
- [ ] Monitoramento ativo
- [ ] Equipe notificada

---

## 🎯 CONCLUSÃO

### Sistema Pronto para Produção

O Slim Quality está configurado para deploy em **Vercel + Supabase**, uma arquitetura moderna, escalável e de fácil manutenção.

**Vantagens:**
- ✅ Deploy automático via Git
- ✅ Escalabilidade automática
- ✅ Sem gerenciamento de servidor
- ✅ HTTPS e CDN incluídos
- ✅ Custo-benefício excelente

**Próximos Passos:**
1. Executar deploy no Vercel
2. Configurar domínio customizado
3. Validar funcionalidades
4. Monitorar por 24-48h
5. Liberar para produção

---

**Documentação:** Completa  
**Status:** ✅ Pronto para Deploy  
**Suporte:** Equipe de Arquitetura
