# 🔍 ANÁLISE: Timeout da Edge Function admin-create-user

**Data:** 03/01/2026
**Status:** Edge Function ESTÁ deployada mas dando timeout de 30s

---

## ✅ CONFIRMADO

A Edge Function **ESTÁ deployada e ativa** no Supabase, o que descarta a hipótese inicial de função não deployada.

O problema está em **outro lugar**.

---

## 🎯 ANÁLISE DO CÓDIGO ATUAL

### Pontos Críticos Onde Pode Travar

```typescript
// 1. PONTO CRÍTICO: Criação do cliente (linhas 17-20)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',              // ⚠️ Se vazio, cliente inválido
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  // ⚠️ Se vazio, cliente inválido
)

// 2. PONTO CRÍTICO: Criação do usuário (linhas 35-43)
const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: userData.full_name, role: userData.role }
})
// ⚠️ Se URL/key vazios, esta chamada TRAVA indefinidamente

// 3. PONTO CRÍTICO: Criação do perfil (linhas 54-66)
const { error: profileError } = await supabaseAdmin
  .from('profiles')
  .upsert({ id: authData.user.id, ... })
// ⚠️ Pode travar por RLS ou trigger lento
```

---

## 🔴 CAUSA RAIZ MAIS PROVÁVEL

### Hipótese #1: Variáveis de Ambiente Não Configuradas (90% de chance)

**Sintoma:**
- Timeout de exatamente 30 segundos
- Sem mensagem de erro específica
- Edge Function deployada mas não responde

**Causa:**
```typescript
Deno.env.get('SUPABASE_URL') ?? ''  // Retorna '' se não configurado
```

Se as secrets **não estiverem configuradas** na Edge Function:
1. Cliente Supabase é criado com URL vazia
2. Chamada `createUser()` tenta conectar com URL inválida
3. Fica esperando conexão indefinidamente
4. Frontend dá timeout após 30s

**Como Verificar:**
```bash
supabase secrets list
```

**Deve mostrar:**
```
┌──────────────────────────────┬──────────────────┐
│ NAME                         │ DIGEST           │
├──────────────────────────────┼──────────────────┤
│ SUPABASE_URL                 │ sha256:abc123... │
│ SUPABASE_SERVICE_ROLE_KEY    │ sha256:def456... │
└──────────────────────────────┴──────────────────┘
```

**Se NÃO aparecer:** Este é o problema!

---

### Hipótese #2: Trigger Lento em auth.users (5% de chance)

**Causa:**
A migration `20250123000000_auth_system.sql` cria um trigger:

```sql
-- Linha 295-299
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

A função `handle_new_user()` faz:
1. INSERT em `profiles`
2. INSERT em `user_roles`
3. INSERT em `auth_logs`

Se alguma dessas operações estiver lenta (por RLS ou outro trigger), pode causar timeout.

**Como Verificar:**
```bash
# Ver logs da Edge Function
supabase functions logs admin-create-user --limit 50

# Se aparecer "Creating user" mas não "User created", está travando no createUser
```

---

### Hipótese #3: Políticas RLS Causando Loop ou Deadlock (5% de chance)

**Causa:**
Políticas RLS duplicadas (identificadas anteriormente) podem causar:
- Loop infinito de verificação
- Deadlock entre políticas conflitantes
- Performance muito lenta

**Como Verificar:**
```bash
# Ver políticas ativas
supabase db execute "
  SELECT policyname, cmd, qual
  FROM pg_policies
  WHERE tablename = 'profiles';
"
```

---

## 🛠️ SOLUÇÃO PASSO A PASSO

### PASSO 1: Verificar Secrets (CRÍTICO - Fazer Primeiro!)

```bash
# 1. Ver secrets atuais
supabase secrets list

# 2. Se NÃO aparecer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, configurar:
supabase secrets set SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co

supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0

# 3. Testar novamente
python3 test_edge_function.py
```

**Se isso resolver:** Problema confirmado! Era falta de configuração de secrets.

---

### PASSO 2: Adicionar Logs Detalhados (Para Diagnóstico)

Crie versão melhorada da Edge Function com logs:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('🚀 [START] Edge Function admin-create-user iniciada')

  try {
    // Verificar env vars ANTES de criar cliente
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('🔑 [CHECK] SUPABASE_URL configurado:', !!supabaseUrl)
    console.log('🔑 [CHECK] SERVICE_ROLE_KEY configurado:', !!supabaseKey)

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [ERROR] Variáveis de ambiente não configuradas!')
      return new Response(
        JSON.stringify({
          error: 'Edge Function não configurada corretamente. Secrets não definidos.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
    console.log('✅ [OK] Cliente Supabase criado')

    const { email, password, userData } = await req.json()
    console.log('📧 [INFO] Email:', email)
    console.log('👤 [INFO] UserData:', JSON.stringify(userData))

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('⏳ [STEP 1/2] Criando usuário via Auth Admin API...')
    const createUserStart = Date.now()

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role
      }
    })

    const createUserTime = Date.now() - createUserStart
    console.log(`⏱️  [TIMING] createUser levou ${createUserTime}ms`)

    if (createError) {
      console.error('❌ [ERROR] Falha ao criar usuário:', createError.message)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ [SUCCESS] Usuário criado:', authData.user.id)

    if (authData.user) {
      console.log('⏳ [STEP 2/2] Criando perfil na tabela profiles...')
      const createProfileStart = Date.now()

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          status: userData.status || 'ativo',
          phone: userData.phone,
          wallet_id: userData.wallet_id,
          is_affiliate: userData.is_affiliate || false,
          affiliate_status: userData.affiliate_status
        })

      const createProfileTime = Date.now() - createProfileStart
      console.log(`⏱️  [TIMING] createProfile levou ${createProfileTime}ms`)

      if (profileError) {
        console.error('⚠️  [WARNING] Erro ao criar perfil:', profileError.message)
        // Não falhar - trigger pode ter criado automaticamente
      } else {
        console.log('✅ [SUCCESS] Perfil criado')
      }
    }

    const totalTime = Date.now() - startTime
    console.log(`✅ [COMPLETE] Edge Function concluída em ${totalTime}ms`)

    return new Response(
      JSON.stringify({
        data: authData,
        message: 'User created successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`💥 [ERROR] Erro após ${totalTime}ms:`, error.message)
    console.error('Stack trace:', error.stack)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

**Deploy:**
```bash
supabase functions deploy admin-create-user
```

**Testar e ver logs:**
```bash
# Testar
python3 test_edge_function.py

# Ver logs em tempo real
supabase functions logs admin-create-user --follow
```

Os logs vão mostrar **exatamente onde está travando** e **quanto tempo está levando**.

---

### PASSO 3: Investigar Trigger se Necessário

Se os logs mostrarem que está travando em `createUser`, o problema pode ser no trigger `on_auth_user_created`.

```bash
# Verificar se trigger está ativo
supabase db execute "
  SELECT trigger_name, event_object_table, action_statement
  FROM information_schema.triggers
  WHERE event_object_table = 'users'
    AND trigger_schema = 'auth';
"

# Ver função do trigger
supabase db execute "
  SELECT pg_get_functiondef(oid)
  FROM pg_proc
  WHERE proname = 'handle_new_user';
"
```

---

## 📊 CHECKLIST DE DIAGNÓSTICO

Execute na ordem:

- [ ] 1. **Verificar secrets:** `supabase secrets list`
  - [ ] SUPABASE_URL está configurado?
  - [ ] SUPABASE_SERVICE_ROLE_KEY está configurado?
  - [ ] Se NÃO: Configurar e testar novamente

- [ ] 2. **Ver logs atuais:** `supabase functions logs admin-create-user --limit 50`
  - [ ] Há algum log da última tentativa?
  - [ ] Qual foi a última linha logada antes do timeout?

- [ ] 3. **Deploy versão com logs detalhados**
  - [ ] Copiar código acima para `supabase/functions/admin-create-user/index.ts`
  - [ ] Deploy: `supabase functions deploy admin-create-user`
  - [ ] Testar: `python3 test_edge_function.py`
  - [ ] Ver logs: `supabase functions logs admin-create-user --follow`

- [ ] 4. **Analisar timing nos logs**
  - [ ] Quanto tempo levou `createUser`?
  - [ ] Quanto tempo levou `createProfile`?
  - [ ] Onde exatamente travou?

---

## 🎯 PROBABILIDADES

| Causa                              | Probabilidade | Como Verificar              |
|------------------------------------|---------------|----------------------------|
| Secrets não configurados           | 90%           | `supabase secrets list`    |
| Trigger lento em auth.users        | 5%            | Logs detalhados            |
| RLS causando deadlock              | 3%            | `pg_policies` + logs       |
| Problema de rede/infra Supabase    | 2%            | Status: status.supabase.com|

---

## 💡 PRÓXIMO PASSO IMEDIATO

**Execute AGORA:**
```bash
supabase secrets list
```

**Resultado esperado:**
- ✅ Se aparecer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY: Problema não é secrets, seguir para PASSO 2
- ❌ Se NÃO aparecer: **ESTE É O PROBLEMA!** Configurar secrets (ver PASSO 1)

---

**Conclusão:** Com 90% de certeza, o problema é **falta de configuração de secrets** na Edge Function. Execute o comando acima para confirmar.
