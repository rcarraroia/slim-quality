# 🧹 LIMPEZA DE DADOS MOCKADOS - RESUMO

## ✅ JÁ LIMPOS

1. **Vendas** (`src/pages/dashboard/Vendas.tsx`) - Conectado com `orders` table
2. **Produtos** (`src/pages/dashboard/Produtos.tsx`) - Conectado com `products` + Upload de imagens

## 🔄 PENDENTES DE LIMPEZA

### 3. Saques/Solicitações
**Arquivo:** `src/pages/afiliados/dashboard/Saques.tsx`
**Dados mockados:** Array `mockSaques`
**Conectar com:** `withdrawals` table

### 4. Lista de Afiliados (Admin)
**Arquivo:** `src/pages/dashboard/Affiliates.tsx`
**Verificar:** Se tem dados mockados
**Conectar com:** `affiliates` table

### 5. Comissões (Afiliados)
**Arquivo:** `src/pages/afiliados/dashboard/Comissoes.tsx`
**Verificar:** Se tem dados mockados
**Conectar com:** `commissions` table

### 6. Clientes
**Arquivo:** `src/pages/dashboard/Clientes.tsx`
**Status:** JÁ CONECTADO com banco (verificar se tem mock residual)

### 7. Agendamentos
**Arquivo:** `src/pages/dashboard/Agendamentos.tsx`
**Verificar:** Se tem dados mockados
**Conectar com:** `appointments` table

### 8. Analytics/Dashboard
**Arquivo:** `src/pages/dashboard/Dashboard.tsx`
**Verificar:** Stats mockados
**Conectar com:** Queries agregadas

## ❌ NÃO MEXER (conforme solicitado)

- Conversas
- Automações
- Configurações

---

## 📝 PRÓXIMOS PASSOS

Devido ao limite de tokens, recomendo:

1. **Fazer commit do que já foi feito:**
   - Vendas limpo ✅
   - Produtos limpo + Upload ✅

2. **Continuar limpeza em próxima sessão:**
   - Saques
   - Comissões
   - Agendamentos
   - Analytics

---

## 🎯 PRIORIDADE

**MAIS IMPORTANTE:**
1. Produtos (✅ FEITO - com upload de imagens)
2. Vendas (✅ FEITO)
3. Dashboard/Analytics (stats mockados)

**PODE FAZER DEPOIS:**
- Saques
- Comissões
- Agendamentos

---

**Status:** 2/8 concluídos
