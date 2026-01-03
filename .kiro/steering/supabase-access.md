# 🔐 GUIA DE ACESSO AO SUPABASE - SLIM QUALITY

## ⚠️ IMPORTANTE

Este documento explica como configurar e acessar o Supabase para o projeto Slim Quality.
PROBLEMA IDENTIFICADO E SOLUÇÃO DEFINITIVA
POR QUE SEMPRE ERRO COM exec_sql:
EU SEMPRE COMETO O MESMO ERRO - tentar usar supabase.rpc('exec_sql', ...) que NÃO EXISTE no Supabase.

FUNÇÕES QUE NÃO EXISTEM NO SUPABASE:
❌ exec_sql()
❌ execute_sql()
❌ run_sql()
❌ Qualquer função para executar SQL raw
SOLUÇÃO DEFINITIVA:
USAR APENAS OS MÉTODOS NATIVOS DO SUPABASE:

✅ supabase.table('nome').insert(dados)
✅ supabase.table('nome').update(dados)
✅ supabase.table('nome').select('*')
✅ supabase.table('nome').delete()
**ATENÇÃO:** As credenciais reais devem ser obtidas após criar o projeto no Supabase Dashboard.

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

---

## 🔑 CREDENCIAIS REAIS DO PROJETO

**As credenciais reais do projeto Slim Quality estão armazenadas em:**

📄 **`docs/SUPABASE_CREDENTIALS.md`** (arquivo local, NÃO commitado no Git)

**Este arquivo contém:**
- ✅ Project ID e URLs
- ✅ API Keys (anon e service_role)
- ✅ Access Token para CLI
- ✅ Links do Dashboard
- ✅ Comandos úteis
- ✅ Informações de conexão PostgreSQL

**⚠️ NUNCA COMMITAR O ARQUIVO `SUPABASE_CREDENTIALS.md` NO GIT!**

O arquivo já está protegido no `.gitignore`, mas sempre verifique antes de fazer commit.

---

## 📋 PRÉ-REQUISITOS

### O que você precisa ter:
- [ ] Conta no Supabase (https://supabase.com)
- [ ] Projeto criado no Supabase Dashboard
- [ ] Windows com PowerShell OU Linux/Mac com terminal
- [ ] Permissões de administrador (para instalar CLI)

---

## 🚀 PASSO 1: CRIAR PROJETO NO SUPABASE

### 1.1 Acessar Dashboard
1. Ir para: https://supabase.com/dashboard
2. Clicar em "New Project"
3. Preencher:
   - **Name:** slim-quality-backend
   - **Database Password:** [gerar senha forte]
   - **Region:** South America (São Paulo)
4. Clicar em "Create new project"
5. **Aguardar ~2 minutos** (setup do banco)

### 1.2 Obter Credenciais

Após criação, ir em **Project Settings > API**:

**Anotar:**
- **Project URL:** `https://[seu-project-ref].supabase.co`
- **Project Reference ID:** `[seu-project-ref]` (ex: `amkelczfwazutrciqtlk`)
- **anon/public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **service_role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ⚠️ SECRETA!

**⚠️ NUNCA COMMITAR SERVICE_ROLE KEY NO GIT!**

---

## 🛠️ PASSO 2: CONFIGURAR SUPABASE CLI

### 2.1 Instalar Scoop (Windows)
```powershell
# Permitir execução de scripts
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# Instalar Scoop
irm get.scoop.sh | iex
```

### 2.2 Instalar Supabase CLI
```powershell
# Adicionar repositório Supabase
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Instalar CLI
scoop install supabase

# Verificar instalação
supabase --version
```

**Deve retornar:** `2.51.0` (ou versão mais recente)

### 2.3 Obter Access Token

**⚠️ IMPORTANTE: Access Token ≠ API Keys do projeto**

1. Acessar: https://supabase.com/dashboard/account/tokens
2. Clicar em "Generate new token"
3. Nome: "Kiro CLI - Slim Quality"
4. Copiar token (formato: `sbp_xxxxx...`)

**Este token dá acesso a TODOS os seus projetos Supabase!**

### 2.4 Fazer Login
```powershell
# Método interativo (recomendado)
supabase login

# Método automático (para scripts)
echo "sbp_seu_token_aqui" | supabase login
```

**Resultado esperado:**
```
You are now logged in. Happy coding!
```

### 2.5 Linkar ao Projeto
```powershell
supabase link --project-ref seu-project-ref-aqui
```

**Resultado esperado:**
```
Initialising login role...
Connecting to remote database...
Finished supabase link.
```

### 2.6 Validar Configuração
```powershell
# Listar projetos
supabase projects list

# Testar query
supabase db execute "SELECT 1 as test"

# Ver estrutura do banco
supabase db dump --schema public
```

**Se todos retornarem dados: Configuração completa! ✅**