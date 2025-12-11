# Como Configurar Variáveis de Ambiente no Vercel

## 📋 Passo a Passo

### 1. Acesse o Dashboard do Vercel
- Vá para: https://vercel.com/seu-usuario/slim-quality
- Clique em **Settings** (Configurações)
- Clique em **Environment Variables** (Variáveis de Ambiente)

### 2. Adicione TODAS as Variáveis Abaixo

**IMPORTANTE**: Copie e cole EXATAMENTE como está, incluindo os valores.

---

## Frontend (Vite)

```
VITE_SUPABASE_URL
https://vtynmmtuvxreiwcxxlma.supabase.co
```

```
VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8
```

```
VITE_API_URL
(deixar vazio)
```

---

## Backend (Supabase)

```
SUPABASE_URL
https://vtynmmtuvxreiwcxxlma.supabase.co
```

```
SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8
```

```
SUPABASE_SERVICE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0
```


---

## Backend (Asaas)

```
ASAAS_API_KEY
$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjI3MTA3OTE1LTE3ZjEtNDBhYi1hNjQ5LWQwZjAwYjc0Zjc1Zjo6JGFhY2hfZDZiYTVjMjAtNjY1Yy00MDgxLWEyNjEtMDMwZDA5MTczMjNj
```

```
ASAAS_ENVIRONMENT
production
```

```
ASAAS_API_URL
https://api.asaas.com/v3
```

```
ASAAS_WALLET_JB
7c06e9d9-dbae-4a85-82f4-36716775bcb2
```

```
ASAAS_WALLET_RENUM
f9c7d1dd-9e52-4e81-8194-8b666f276405
```

```
ASAAS_WEBHOOK_TOKEN
1013e1fa-12d3-4b89-bc23-704068796447
```

---

## App

```
NODE_ENV
production
```

```
FRONTEND_URL
https://slim-quality.vercel.app
```

---

## 3. Configurar Ambientes

Para cada variável, selecione os ambientes:
- ✅ **Production**
- ✅ **Preview** (opcional)
- ⬜ Development (não necessário)

---

## 4. Salvar e Fazer Redeploy

1. Clique em **Save** para cada variável
2. Após adicionar todas, vá em **Deployments**
3. Clique nos 3 pontinhos do último deploy
4. Clique em **Redeploy**
5. Aguarde o build completar

---

## ✅ Verificação

Após o deploy, teste:
1. Acesse: https://slim-quality.vercel.app
2. O site deve carregar normalmente
3. Teste o login (se aplicável)
4. Verifique o console do navegador (F12) - não deve ter erros

---

**Última atualização**: 11/11/2025
