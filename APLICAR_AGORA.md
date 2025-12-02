# 🚀 SCRIPT CORRIGIDO - APLICAR AGORA

## ✅ O QUE FOI CORRIGIDO

O erro era porque algumas tabelas **NÃO TÊM** a coluna `deleted_at`:

| Tabela | Tem deleted_at? |
|--------|-----------------|
| `conversations` | ❌ NÃO |
| `messages` | ❌ NÃO |
| `customer_timeline` | ❌ NÃO |
| `appointments` | ✅ SIM |
| `customers` | ✅ SIM |
| `customer_tags` | ✅ SIM |
| `customer_tag_assignments` | ✅ SIM |

---

## 📝 COMO APLICAR O SCRIPT

### **PASSO 1:** Acesse o Supabase

```
https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma
```

### **PASSO 2:** Vá no SQL Editor

```
Menu lateral > SQL Editor > New Query
```

### **PASSO 3:** Cole o script

Abra o arquivo: **`apply_rls_fix.sql`** (na raiz do projeto)

Copie TODO o conteúdo e cole no SQL Editor

### **PASSO 4:** Execute

Clique em **Run** (ou pressione `Ctrl+Enter`)

### **PASSO 5:** Verifique o resultado

Deve aparecer:
```
Success. No rows returned
```

---

## 🧪 TESTAR APÓS APLICAR

1. **Faça login** no sistema
2. **Acesse Conversas** - Deve carregar sem erro 403
3. **Acesse Clientes** - Deve carregar sem erro 403
4. **Clique em Sair** - Deve deslogar completamente

---

## ❓ SE DER ERRO

**Copie a mensagem de erro completa e me envie!**

Possíveis erros:
- `policy already exists` - Ignore, é normal
- `table does not exist` - Alguma migration não foi aplicada
- `column does not exist` - Me avise qual coluna

---

## 📞 PRONTO PARA APLICAR!

**O script está corrigido e pronto para uso.** ✅

Execute agora e me avise o resultado! 🚀
