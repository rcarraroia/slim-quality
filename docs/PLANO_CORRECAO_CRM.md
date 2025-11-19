# 📋 PLANO DE CORREÇÃO - TABELAS CRM

**Data:** 2025-11-18  
**Status:** Aguardando Autorização

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. Tabela Faltante
- ❌ **tags** - Não existe no banco

### 2. RLS Desabilitado
- ⚠️ Todas as tabelas CRM estão sem RLS
- ⚠️ Nenhuma política de segurança configurada
- ✅ `profiles` e `user_roles` mantidos desabilitados (para login funcionar)

### 3. Dados
- ✅ Tabelas existem mas estão vazias (normal)
- ✅ `customer_tags` tem 7 registros

---

## ✅ SOLUÇÃO PROPOSTA

### 1. Criar Tabela `tags`
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE,
  color VARCHAR(7),
  description TEXT,
  category VARCHAR(50),
  auto_apply_rules JSONB,
  created_at, updated_at, deleted_at
);
```

**Tags padrão a inserir:**
- Cliente Ativo (verde)
- Lead Qualificado (azul)
- VIP (laranja)
- Indicação (roxo)
- Primeira Compra (rosa)
- Urgente (vermelho)
- Resolvido (verde)

### 2. Configurar RLS nas Tabelas CRM

**IMPORTANTE:** Mantém `profiles` e `user_roles` SEM RLS (para login funcionar)

#### Tags
- ✅ Todos podem VER tags ativas
- ✅ Apenas ADMINS podem criar/editar/deletar

#### Customers
- ✅ Vendedores veem clientes atribuídos a eles
- ✅ Admins veem todos os clientes
- ✅ Vendedores podem criar clientes
- ✅ Vendedores podem editar seus clientes

#### Customer Tags
- ✅ Seguem permissões do cliente relacionado

#### Customer Timeline
- ✅ Seguem permissões do cliente relacionado

#### Conversations
- ✅ Atendentes veem conversas atribuídas a eles
- ✅ Admins veem todas as conversas

#### Messages
- ✅ Seguem permissões da conversa relacionada

#### Appointments
- ✅ Vendedores veem seus agendamentos
- ✅ Admins veem todos os agendamentos

---

## 🎯 RESULTADO ESPERADO

### Após Execução:

**Tabelas:**
- ✅ 7/7 tabelas CRM existentes (incluindo `tags`)

**RLS:**
- ❌ `profiles` - DESABILITADO (para login)
- ❌ `user_roles` - DESABILITADO (para login)
- ✅ `tags` - ATIVO com 2 políticas
- ✅ `customers` - ATIVO com 3 políticas
- ✅ `customer_tags` - ATIVO com 1 política
- ✅ `customer_timeline` - ATIVO com 1 política
- ✅ `conversations` - ATIVO com 1 política
- ✅ `messages` - ATIVO com 1 política
- ✅ `appointments` - ATIVO com 1 política

**Dados:**
- ✅ 7 tags padrão inseridas
- ✅ Dados existentes preservados

---

## 📝 COMO EXECUTAR

### Opção 1: SQL Editor do Supabase (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/sql/new
2. Cole o conteúdo de `scripts/fix_crm_tables.sql`
3. Clique em "Run"
4. Verifique os resultados no final

### Opção 2: Via Python

```bash
python scripts/apply_crm_fix.py
```

---

## ⚠️ IMPACTOS

### Positivos ✅
- Sistema CRM terá segurança adequada
- Vendedores só verão seus clientes
- Admins terão acesso total
- Login continuará funcionando

### Riscos ⚠️
- **NENHUM** - Script é idempotente (pode executar múltiplas vezes)
- Usa `IF NOT EXISTS` e `ON CONFLICT DO NOTHING`
- Não deleta dados existentes

---

## 🔄 ROLLBACK

Se algo der errado, execute:

```sql
-- Desabilitar RLS novamente
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_timeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
```

---

## ✅ CHECKLIST DE EXECUÇÃO

- [ ] Backup do banco feito (opcional, mas recomendado)
- [ ] Arquivo `scripts/fix_crm_tables.sql` revisado
- [ ] SQL executado no Supabase SQL Editor
- [ ] Verificação executada: `python scripts/verify_database_crm.py`
- [ ] Login testado (deve continuar funcionando)
- [ ] Dashboard CRM testado

---

**Aguardando sua autorização para executar! 🚀**
