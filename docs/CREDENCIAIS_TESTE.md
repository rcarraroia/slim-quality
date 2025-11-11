# Credenciais de Teste

## Usuários Criados

### Admin
- **Email:** `admin@slimquality.com`
- **Senha:** `admin123456`
- **Roles:** `admin`, `cliente`
- **Acesso:** Dashboard Admin (`/dashboard`)

### Cliente de Teste (Sprint 1)
- **Email:** `teste@slimquality.com`
- **Senha:** `senha123456`
- **Roles:** `cliente`
- **Acesso:** Apenas rotas públicas

---

## Como Criar Novos Usuários

### Via API
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@email.com",
    "password": "senha123456",
    "full_name": "Nome Completo"
  }'
```

### Atribuir Role Admin
Execute o script:
```bash
npx tsx scripts/assign-admin-role.ts
```

Ou via SQL no Supabase:
```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM profiles
WHERE email = 'email@usuario.com';
```

---

## Endpoints de Teste

### Health Check
```bash
curl http://localhost:3000/health
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@slimquality.com",
    "password": "admin123456"
  }'
```

### Dados do Usuário (requer token)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## Frontend

### Acessar
- **URL:** http://localhost:8080
- **Login:** http://localhost:8080/login
- **Dashboard:** http://localhost:8080/dashboard (requer admin)

### Testar Fluxo
1. Acessar `/login`
2. Email: `admin@slimquality.com`
3. Senha: `admin123456`
4. Deve redirecionar para `/dashboard` ✅

---

**Última atualização:** 24/10/2025
