# 🔧 GUIA DE CONFIGURAÇÃO - MCP SENTRY E GITHUB

## 📋 RESUMO

Adicionei configuração para 2 novos MCPs que vão melhorar muito a experiência de desenvolvimento:

1. **GitHub MCP** - Gestão de issues, PRs, commits
2. **Sentry MCP** - Monitoramento de erros em produção

---

## 🚀 PASSO A PASSO DE CONFIGURAÇÃO

### 1. CRIAR TOKEN DO GITHUB

#### 1.1. Acessar GitHub
1. Vá para: https://github.com/settings/tokens
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**

#### 1.2. Configurar Permissões
Marque as seguintes permissões:
- ✅ `repo` (Full control of private repositories)
  - ✅ `repo:status`
  - ✅ `repo_deployment`
  - ✅ `public_repo`
  - ✅ `repo:invite`
- ✅ `read:org` (Read org and team membership)
- ✅ `read:user` (Read user profile data)
- ✅ `user:email` (Access user email addresses)

#### 1.3. Gerar Token
1. Dê um nome: `Kiro AI - Slim Quality`
2. Expiration: `No expiration` (ou 90 days se preferir)
3. Clique em **"Generate token"**
4. **COPIE O TOKEN** (você só verá uma vez!)

---

### 2. CRIAR TOKEN DO SENTRY

#### 2.1. Criar Conta no Sentry (se não tiver)
1. Vá para: https://sentry.io/signup/
2. Crie conta gratuita
3. Crie uma organização: `slim-quality`

#### 2.2. Criar Projeto
1. No dashboard do Sentry, clique em **"Create Project"**
2. Plataforma: **React**
3. Nome do projeto: `slim-quality-frontend`
4. Clique em **"Create Project"**

#### 2.3. Gerar Auth Token
1. Vá para: https://sentry.io/settings/account/api/auth-tokens/
2. Clique em **"Create New Token"**
3. Nome: `Kiro AI MCP`
4. Scopes necessários:
   - ✅ `project:read`
   - ✅ `project:write`
   - ✅ `event:read`
   - ✅ `event:write`
   - ✅ `org:read`
5. Clique em **"Create Token"**
6. **COPIE O TOKEN**

---

### 3. ATUALIZAR CONFIGURAÇÃO DO MCP

#### 3.1. Abrir arquivo de configuração
```bash
notepad "C:\Users\Rennum\.kiro\settings\mcp.json"
```

#### 3.2. Substituir tokens
No arquivo `mcp-config-updated.json` que criei, substitua:

**GitHub:**
```json
"GITHUB_PERSONAL_ACCESS_TOKEN": "SEU_TOKEN_GITHUB_AQUI"
```
Por:
```json
"GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxxx"
```

**Sentry:**
```json
"SENTRY_AUTH_TOKEN": "SEU_TOKEN_SENTRY_AQUI"
```
Por:
```json
"SENTRY_AUTH_TOKEN": "sntrys_xxxxxxxxxxxxxxxxxxxxx"
```

#### 3.3. Copiar configuração atualizada
```bash
# Backup do arquivo atual (já fiz)
# Agora copie o conteúdo de mcp-config-updated.json para mcp.json
```

---

### 4. REINICIAR KIRO

1. Feche o Kiro completamente
2. Abra novamente
3. Os MCPs serão carregados automaticamente

---

## 🎯 BENEFÍCIOS DE CADA MCP

### GitHub MCP
**O que você ganha:**
- ✅ Criar issues automaticamente quando encontrar bugs
- ✅ Listar e gerenciar PRs
- ✅ Ver histórico de commits
- ✅ Buscar código no repositório
- ✅ Criar branches e tags
- ✅ Gerenciar milestones

**Exemplos de uso:**
```
"Crie uma issue no GitHub para o bug de RLS em affiliate_network"
"Liste os últimos 10 commits do repositório"
"Busque no código onde usamos calculateAffiliateSplit"
"Crie um PR para a branch fix/affiliate-network"
```

### Sentry MCP
**O que você ganha:**
- ✅ Monitorar erros em produção em tempo real
- ✅ Ver stack traces completos
- ✅ Identificar erros mais frequentes
- ✅ Rastrear performance
- ✅ Alertas de novos erros
- ✅ Análise de impacto de bugs

**Exemplos de uso:**
```
"Quais são os 5 erros mais frequentes no Sentry?"
"Mostre detalhes do erro #12345"
"Quantos usuários foram afetados pelo erro de RLS?"
"Liste erros das últimas 24 horas"
```

---

## 🔍 INTEGRAÇÃO COM SENTRY NO CÓDIGO

### 4.1. Instalar SDK do Sentry
```bash
npm install @sentry/react @sentry/vite-plugin
```

### 4.2. Configurar no código
Crie arquivo `src/config/sentry.ts`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://xxxxx@xxxxx.ingest.sentry.io/xxxxx", // Você pega isso no dashboard do Sentry
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});
```

### 4.3. Adicionar no main.tsx
```typescript
import './config/sentry';
```

### 4.4. Configurar Vite Plugin
Em `vite.config.ts`:
```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "slim-quality",
      project: "slim-quality-frontend",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

---

## 📊 DASHBOARD RECOMENDADO

Com os MCPs configurados, você terá:

### Visão de Desenvolvimento
- **GitHub:** Issues, PRs, Commits
- **Vercel:** Deploys, Logs
- **Supabase:** Banco de dados, Migrations

### Visão de Produção
- **Sentry:** Erros, Performance
- **Vercel:** Status de deploy
- **Supabase:** Logs do banco

---

## 🚨 TROUBLESHOOTING

### Erro: "GitHub token invalid"
- Verifique se copiou o token completo
- Verifique se as permissões estão corretas
- Gere um novo token se necessário

### Erro: "Sentry organization not found"
- Verifique se o slug da organização está correto
- Deve ser exatamente como aparece na URL do Sentry

### MCP não carrega
- Verifique se o JSON está válido (sem vírgulas extras)
- Reinicie o Kiro completamente
- Verifique logs em: `C:\Users\Rennum\.kiro\logs`

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Configurar tokens (GitHub + Sentry)
2. ✅ Atualizar mcp.json
3. ✅ Reiniciar Kiro
4. ✅ Testar comandos básicos
5. ✅ Integrar Sentry no código
6. ✅ Fazer deploy e verificar erros no Sentry

---

## 🎯 COMANDOS ÚTEIS PARA TESTAR

### GitHub
```
"Liste os repositórios da organização"
"Mostre as issues abertas do slim-quality"
"Crie uma issue: Bug no sistema de afiliados"
```

### Sentry
```
"Liste os projetos no Sentry"
"Mostre os erros mais recentes"
"Quantos erros tivemos hoje?"
```

---

**Configuração criada em:** 09/01/2026  
**Backup do arquivo original:** `mcp.json.backup`  
**Arquivo com nova configuração:** `mcp-config-updated.json`
