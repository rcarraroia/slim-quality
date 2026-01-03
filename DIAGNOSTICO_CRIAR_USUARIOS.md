# 🔍 DIAGNÓSTICO COMPLETO - Problema de Criação de Usuários

**Data:** 03/01/2026
**Projeto:** Slim Quality (vtynmmtuvxreiwcxxlma)
**Branch:** claude/debug-auth-feature-flags-ako94
**Status:** ❌ CRÍTICO - Criação de usuários não funciona

---

## 📌 RESUMO EXECUTIVO

O painel admin (`/dashboard/configuracoes`) **NÃO consegue criar novos usuários**. A Edge Function `admin-create-user` está **dando timeout de 30+ segundos**, e o mecanismo de fallback implementado está **quebrado** (tenta criar perfil sem usuário auth).

**Impacto:** Impossível adicionar novos membros à equipe via painel admin.

---

## ❌ PROBLEMA OBSERVADO NO CONSOLE

```javascript
🚀 Chamando Edge Function admin-create-user...
📧 Email: jbmkt01@gmail.com
👤 UserData: {full_name: 'Joao Bosco', email: 'jbmkt01@gmail.com', role: 'admin', ...}
⏳ Aguardando resposta da Edge Function...
💥 Erro capturado: Error: Timeout: Edge Function demorou mais de 30 segundos
📊 Resposta da Edge Function:
✅ Data: null
❌ Error: Error: Timeout: Edge Function demorou mais de 30 segundos
🔄 Edge Function falhou, tentando fallback direto no banco...
```

---

## 🔍 ANÁLISE TÉCNICA DETALHADA

### 1. Edge Function com Timeout (CRÍTICO)

**Arquivo:** `supabase/functions/admin-create-user/index.ts`

**Sintoma:**
- Timeout de 30 segundos configurado no frontend
- Edge Function não retorna resposta

**Código do Frontend:**
```typescript
// src/components/admin/UserManagementModal.tsx:174-199
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout: Edge Function demorou mais de 30 segundos')), 30000);
});

const functionPromise = supabase.functions.invoke('admin-create-user', {
  body: { email: formData.email, password: password, userData: {...} }
});

const { data: functionData, error: functionError } = await Promise.race([
  functionPromise,
  timeoutPromise
]).catch(error => ({ data: null, error: error }));
```

**Possíveis Causas:**
1. ❌ Edge Function **NÃO está deployada** no Supabase
2. ❌ Edge Function deployada mas com **secrets incorretos** (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
3. ❌ Edge Function travando na chamada `supabaseAdmin.auth.admin.createUser()`
4. ❌ Problema de permissões no Supabase Auth

---

### 2. Fallback Quebrado (CRÍTICO)

**Arquivo:** `src/components/admin/UserManagementModal.tsx:213-256`

**Problema:**
O fallback tenta criar um perfil diretamente na tabela `profiles` **SEM criar o usuário correspondente em `auth.users`**.

**Código Problemático:**
```typescript
// Linha 215: Gera UUID aleatório (não vinculado ao auth.users!)
const userId = crypto.randomUUID();

// Linha 218: Tenta inserir perfil SEM usuário auth
const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: userId,  // ❌ Este ID não existe em auth.users!
    full_name: formData.full_name,
    email: formData.email,
    role: formData.role,
    // ...
  });
```

**Por que isso NÃO funciona:**

1. **Constraint de Foreign Key:** A tabela `profiles` tem uma constraint:
   ```sql
   -- supabase/migrations/20250123000000_auth_system.sql:26
   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
   ```
   Como o ID gerado não existe em `auth.users`, o INSERT **falha**.

2. **Sem Credenciais:** Mesmo que o INSERT passasse, o usuário não teria senha para fazer login.

3. **RLS:** As políticas RLS exigem `auth.uid()`, que será NULL para este usuário fantasma.

---

### 3. Políticas RLS Duplicadas (GRAVE)

**Problema:**
Existem **DUAS migrations** criando políticas RLS para `profiles`:

**Migration 1:** `20250123000000_auth_system.sql` (linhas 144-184)
```sql
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT ...
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE ...
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT ...
```

**Migration 2:** `20260103010036_add_rls_policies_profiles.sql` (linhas 16-61)
```sql
-- DUPLICATA!
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT ...
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE ...
CREATE POLICY "Super admins can view all profiles" ON profiles FOR SELECT ...
```

**Consequência:**
- Se ambas as migrations foram aplicadas, houve **erro de conflito de nomes**
- Ou as políticas antigas foram sobrescritas
- Comportamento RLS pode estar imprevisível

---

### 4. Schema da Tabela Profiles

**Migration Original:** `20250123000000_auth_system.sql`
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  wallet_id TEXT,
  is_affiliate BOOLEAN DEFAULT FALSE NOT NULL,
  affiliate_status TEXT,
  -- ❌ NÃO tem role nem status!
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);
```

**Migration Posterior:** `20260103005225_add_role_status_to_profiles.sql`
```sql
ALTER TABLE profiles
ADD COLUMN role TEXT DEFAULT 'vendedor'
  CHECK (role IN ('super_admin', 'admin', 'vendedor', 'suporte', 'financeiro', 'personalizado'));

ALTER TABLE profiles
ADD COLUMN status TEXT DEFAULT 'ativo'
  CHECK (status IN ('ativo', 'inativo', 'bloqueado'));
```

**Verificar se essa migration foi aplicada no banco de produção!**

---

## 🛠️ COMANDOS DE DIAGNÓSTICO

Execute estes comandos **na sua máquina local** para diagnosticar o problema:

### 1. Verificar Edge Functions Deployadas

```bash
# Fazer login no Supabase
supabase login

# Linkar ao projeto
supabase link --project-ref vtynmmtuvxreiwcxxlma

# Listar Edge Functions
supabase functions list

# Verificar logs da Edge Function (últimas 100 linhas)
supabase functions logs admin-create-user --limit 100
```

**Resultado Esperado:**
```
┌──────────────────────┬─────────────────────┬─────────┬────────────┐
│ NAME                 │ CREATED AT          │ VERSION │ STATUS     │
├──────────────────────┼─────────────────────┼─────────┼────────────┤
│ admin-create-user    │ 2026-01-01 10:00:00 │ v1      │ ACTIVE     │
└──────────────────────┴─────────────────────┴─────────┴────────────┘
```

**Se não aparecer:** Edge Function NÃO está deployada! (confirmando o problema)

---

### 2. Verificar Secrets Configurados

```bash
# Listar secrets configurados na Edge Function
supabase secrets list
```

**Deve retornar:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

**Se não aparecer:** Secrets não configurados! (confirmando problema)

---

### 3. Verificar Schema do Banco

```bash
# Ver estrutura da tabela profiles
supabase db execute "
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'profiles'
  ORDER BY ordinal_position;
"
```

**Deve incluir:**
- ✅ `role` (text)
- ✅ `status` (text)

**Se não aparecer:** Migration não foi aplicada!

---

### 4. Verificar Políticas RLS

```bash
# Ver políticas RLS ativas
supabase db execute "
  SELECT policyname, cmd, qual
  FROM pg_policies
  WHERE tablename = 'profiles';
"
```

**Verificar se há duplicatas** (ex: duas políticas com mesmo nome)

---

### 5. Contar Usuários Existentes

```bash
# Ver quantos usuários existem
supabase db execute "SELECT COUNT(*) FROM profiles;"

# Ver usuários com role super_admin
supabase db execute "SELECT email, role, status FROM profiles WHERE role = 'super_admin';"
```

---

### 6. Testar Edge Function Localmente

```bash
# Iniciar Edge Function local
supabase functions serve admin-create-user

# Em outro terminal, testar com curl:
curl -X POST http://localhost:54321/functions/v1/admin-create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGci..." \
  -d '{
    "email": "teste@exemplo.com",
    "password": "teste123",
    "userData": {
      "full_name": "Teste Local",
      "email": "teste@exemplo.com",
      "role": "vendedor",
      "status": "ativo",
      "is_affiliate": false
    }
  }'
```

---

## ✅ SOLUÇÕES RECOMENDADAS

### SOLUÇÃO 1: Deployar e Configurar Edge Function (PRIORITÁRIO)

```bash
# 1. Deployar Edge Function
cd /home/user/slim-quality
supabase functions deploy admin-create-user

# 2. Configurar secrets
supabase secrets set SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0

# 3. Verificar deploy
supabase functions list

# 4. Testar
python3 test_edge_function.py
```

---

### SOLUÇÃO 2: Remover Fallback Quebrado

**Arquivo:** `src/components/admin/UserManagementModal.tsx`

```typescript
// REMOVER linhas 210-256 (todo o bloco de fallback)

// Substituir por:
if (functionError || !functionData) {
  throw new Error(
    'Edge Function não está respondendo. Verifique se a função está deployada e configurada.'
  );
}
```

**Commit:**
```bash
git add src/components/admin/UserManagementModal.tsx
git commit -m "fix: remover fallback quebrado de criação de usuário"
```

---

### SOLUÇÃO 3: Resolver Conflitos de RLS

**Criar nova migration:**
```bash
supabase migration new fix_duplicate_rls_policies
```

**Conteúdo da migration:**
```sql
-- Remover políticas duplicadas da migration antiga
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

-- Manter apenas as políticas mais recentes (da migration 20260103010036)
-- Recriar se necessário (executar apenas se não existirem)
-- ...
```

**Aplicar:**
```bash
supabase db push
```

---

### SOLUÇÃO 4: Melhorar Logs e Tratamento de Erros

**Adicionar logs na Edge Function:**
```typescript
// supabase/functions/admin-create-user/index.ts
serve(async (req) => {
  console.log('🚀 [START] Edge Function admin-create-user');
  console.log('📧 Email:', email);
  console.log('🔑 Creating user via Auth Admin API...');

  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: userData.full_name, role: userData.role }
  });

  if (createError) {
    console.error('❌ [ERROR] Auth creation failed:', createError);
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('✅ [SUCCESS] User created:', authData.user.id);
  console.log('📝 Creating profile...');

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: authData.user.id,
    full_name: userData.full_name,
    email: userData.email,
    role: userData.role,
    status: userData.status || 'ativo',
    phone: userData.phone,
    wallet_id: userData.wallet_id,
    is_affiliate: userData.is_affiliate || false,
    affiliate_status: userData.affiliate_status
  });

  if (profileError) {
    console.error('⚠️  [WARNING] Profile creation failed:', profileError);
  } else {
    console.log('✅ [SUCCESS] Profile created');
  }

  console.log('✅ [COMPLETE] Edge Function finished successfully');

  return new Response(
    JSON.stringify({ data: authData, message: 'User created successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Execute este checklist **na ordem** para diagnosticar o problema:

- [ ] 1. Supabase CLI está instalado? (`supabase --version`)
- [ ] 2. Está linkado ao projeto? (`supabase projects list`)
- [ ] 3. Edge Function está deployada? (`supabase functions list`)
- [ ] 4. Secrets estão configurados? (`supabase secrets list`)
- [ ] 5. Migration `20260103005225` foi aplicada? (verificar se profiles tem campo `role`)
- [ ] 6. Há políticas RLS duplicadas? (`SELECT policyname FROM pg_policies WHERE tablename = 'profiles'`)
- [ ] 7. Logs da Edge Function mostram algum erro? (`supabase functions logs admin-create-user`)
- [ ] 8. Edge Function funciona localmente? (`supabase functions serve admin-create-user`)

---

## 🎯 PRÓXIMOS PASSOS

### Etapa 1: Diagnóstico (30 min)
1. Executar todos os comandos de diagnóstico acima
2. Documentar os resultados
3. Identificar qual das 4 possíveis causas é o problema real

### Etapa 2: Correção (1-2 horas)
1. Deployar Edge Function (se não estiver deployada)
2. Configurar secrets (se não estiverem configurados)
3. Remover fallback quebrado
4. Testar criação de usuário

### Etapa 3: Validação (30 min)
1. Criar usuário de teste via painel admin
2. Verificar se usuário foi criado corretamente
3. Testar login com o novo usuário
4. Documentar resultado

---

## 📊 HISTÓRICO DE TENTATIVAS ANTERIORES

Análise dos commits mostra **6 tentativas de correção** nos últimos dias:

```
bf31ea2 - fix: corrigir lógica do fallback para executar corretamente após timeout
ebea62e - fix: implementar fallback para criação de usuário quando Edge Function trava
a88fa08 - fix: adicionar timeout e logs detalhados para debug do modal de usuário
df39576 - debug: adicionar logs detalhados no modal de criação de usuário
832ad1e - fix: corrigir Edge Function - usar campos reais da tabela profiles
2ed94eb - fix: simplificar Edge Function admin-create-user - remover validações
```

**Observação:** Todas as tentativas focaram em **adicionar workarounds** (fallback, logs, simplificações), mas **nenhuma verificou se a Edge Function está deployada**. Essa é provavelmente a causa raiz.

---

## ⚠️ ALERTAS IMPORTANTES

### 🔒 Segurança
- ❌ **NUNCA** expor `SUPABASE_SERVICE_ROLE_KEY` no frontend
- ❌ **NUNCA** fazer operações de admin usando anon_key no frontend
- ✅ **SEMPRE** usar Edge Functions para operações privilegiadas
- ⚠️  O fallback atual (se funcionasse) seria uma **falha de segurança grave**

### 🏗️ Arquitetura
- A abordagem de usar Edge Function está **correta**
- O problema está na **implementação/deploy**, não no design
- Fallback deveria ser **removido**, não "consertado"

---

## 🎓 LIÇÕES APRENDIDAS

1. **Sempre verificar deploy antes de debugar código**
   - Gastou-se tempo debugando código quando o problema era deploy

2. **Logs são essenciais**
   - Sem logs da Edge Function, impossível diagnosticar remotamente

3. **Fallbacks precisam ser bem pensados**
   - Criar fallback "na pressa" resultou em código quebrado

4. **Migrations precisam ser testadas**
   - Políticas RLS duplicadas indicam falta de validação

---

## 📞 SUPORTE

Se após executar todas as soluções o problema persistir:

1. Verificar status do Supabase: https://status.supabase.com/
2. Verificar billing/limites do projeto
3. Contatar suporte do Supabase com os logs coletados

---

**Relatório gerado em:** 03/01/2026
**Autor:** Kiro AI
**Versão:** 2.0 (com análise aprofundada)
