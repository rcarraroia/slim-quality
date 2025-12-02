# 🔍 ANÁLISE - PÁGINAS DE AFILIADOS (ADMIN)

**Data:** 01/12/2025  
**Objetivo:** Verificar se as páginas de gestão de afiliados têm dados mockados

---

## 📊 RESULTADO DA ANÁLISE

### ❌ TODAS AS 3 PÁGINAS TÊM DADOS MOCKADOS

| Página | Status | Dados Mockados | Conectado ao Banco |
|--------|--------|----------------|-------------------|
| **Lista de Afiliados** | 🔴 MOCKADO | ✅ Sim | ❌ Não |
| **Gestão de Comissões** | 🔴 MOCKADO | ✅ Sim | ❌ Não |
| **Solicitações (Saques)** | 🔴 MOCKADO | ✅ Sim | ❌ Não |

---

## 1️⃣ LISTA DE AFILIADOS 🔴

**Arquivo:** `src/pages/dashboard/afiliados/ListaAfiliados.tsx`

### Dados Mockados Encontrados:

```typescript
const mockAfiliadosAdmin = [
  {
    id: "A001",
    nome: "Carlos Mendes",
    email: "carlos.mendes@email.com",
    telefone: "(31) 99999-8888",
    cidade: "Belo Horizonte - MG",
    dataCadastro: "15/Ago/25",
    status: "ativo",
    nivel: 3,
    totalIndicados: 12,
    vendasGeradas: 8,
    comissoesTotais: 12450.00,
    saldoDisponivel: 3200.00,
    pixChave: "carlos.mendes@email.com",
  },
  // ... mais 5 afiliados mockados
];
```

### Uso dos Dados Mockados:

```typescript
const filteredAfiliados = mockAfiliadosAdmin.filter(afiliado => {
  // filtros aplicados em dados mockados
});

// Métricas calculadas de dados mockados
mockAfiliadosAdmin.length
mockAfiliadosAdmin.filter(a => a.status === "ativo").length
mockAfiliadosAdmin.reduce((acc, a) => acc + a.comissoesTotais, 0)
mockAfiliadosAdmin.reduce((acc, a) => acc + a.vendasGeradas, 0)
```

### O que precisa ser feito:

✅ **Conectar com tabela `affiliates`**
- Buscar lista de afiliados do banco
- Calcular métricas em tempo real:
  - Total de afiliados
  - Afiliados ativos
  - Comissões pagas (sum de commissions)
  - Vendas geradas (count de orders)

✅ **Queries necessárias:**
```typescript
// Lista de afiliados
supabase.from('affiliates')
  .select('*')
  .order('created_at', { ascending: false })

// Comissões por afiliado
supabase.from('commissions')
  .select('affiliate_id, amount')
  .eq('status', 'paid')

// Vendas por afiliado
supabase.from('orders')
  .select('affiliate_id')
  .not('affiliate_id', 'is', null)
```

---

## 2️⃣ GESTÃO DE COMISSÕES 🔴

**Arquivo:** `src/pages/dashboard/afiliados/GestaoComissoes.tsx`

### Dados Mockados Encontrados:

```typescript
const mockComissoesAdmin = [
  {
    id: "C001",
    afiliadoId: "A001",
    afiliadoNome: "Carlos Mendes",
    vendaId: "#1047",
    cliente: "Maria Silva",
    produto: "Slim Quality Queen",
    valorVenda: 3490.00,
    nivel: 1,
    percentual: 15,
    valorComissao: 523.50,
    status: "paga",
    dataCriacao: "12/Out/25",
    dataPagamento: "15/Out/25",
  },
  // ... mais 6 comissões mockadas
];
```

### Uso dos Dados Mockados:

```typescript
const filteredComissoes = mockComissoesAdmin.filter(comissao => {
  // filtros aplicados em dados mockados
});

// Métricas calculadas de dados mockados
mockComissoesAdmin.length
mockComissoesAdmin.filter(c => c.status === "pendente").length
filteredComissoes.filter(c => c.status === "pendente").reduce((acc, c) => acc + c.valorComissao, 0)
filteredComissoes.filter(c => c.status === "paga").reduce((acc, c) => acc + c.valorComissao, 0)
```

### O que precisa ser feito:

✅ **Conectar com tabela `commissions`**
- Buscar comissões do banco
- Calcular métricas em tempo real:
  - Total de comissões
  - Pendentes de aprovação
  - Valor pendente
  - Total pago

✅ **Queries necessárias:**
```typescript
// Lista de comissões com JOINs
supabase.from('commissions')
  .select(`
    *,
    affiliate:affiliates(id, name),
    order:orders(
      id,
      total_amount,
      customer:customers(name),
      order_items(product:products(name))
    )
  `)
  .order('created_at', { ascending: false })

// Filtros por status e nível
.eq('status', statusFilter)
.eq('level', nivelFilter)
```

✅ **Funcionalidades a implementar:**
- Aprovar comissão (update status para 'approved')
- Rejeitar comissão (update status para 'rejected')
- Marcar como paga (update status para 'paid' + data de pagamento)

---

## 3️⃣ SOLICITAÇÕES DE SAQUES 🔴

**Arquivo:** `src/pages/dashboard/afiliados/Solicitacoes.tsx`

### Dados Mockados Encontrados:

```typescript
const mockSaquesAdmin = [
  {
    id: "S001",
    afiliadoId: "A001",
    afiliadoNome: "Carlos Mendes",
    valor: 3200.00,
    pixChave: "carlos.mendes@email.com",
    tipoChave: "Email",
    status: "pendente",
    dataSolicitacao: "14/Out/25",
    dataProcessamento: null,
    comprovante: null,
  },
  // ... mais 5 saques mockados
];
```

### Uso dos Dados Mockados:

```typescript
const filteredSaques = mockSaquesAdmin.filter(saque => {
  // filtros aplicados em dados mockados
});

// Métricas calculadas de dados mockados
mockSaquesAdmin.length
mockSaquesAdmin.filter(s => s.status === "pendente").length
filteredSaques.filter(s => s.status === "pendente").reduce((acc, s) => acc + s.valor, 0)
filteredSaques.filter(s => s.status === "aprovado").reduce((acc, s) => acc + s.valor, 0)
```

### O que precisa ser feito:

✅ **Conectar com tabela `withdrawals`**
- Buscar solicitações de saque do banco
- Calcular métricas em tempo real:
  - Total de solicitações
  - Aguardando aprovação
  - Valor pendente
  - Total processado

✅ **Queries necessárias:**
```typescript
// Lista de saques com JOIN
supabase.from('withdrawals')
  .select(`
    *,
    affiliate:affiliates(id, name, pix_key)
  `)
  .order('created_at', { ascending: false })

// Filtros por status
.eq('status', statusFilter)
```

✅ **Funcionalidades a implementar:**
- Aprovar saque (update status para 'approved' + data de processamento)
- Rejeitar saque (update status para 'rejected' + motivo)
- Upload de comprovante (Supabase Storage)

---

## 📊 RESUMO EXECUTIVO

### Situação Atual:

**3 páginas de afiliados (admin) com dados 100% mockados:**

1. 🔴 **Lista de Afiliados** - 6 afiliados fictícios
2. 🔴 **Gestão de Comissões** - 7 comissões fictícias
3. 🔴 **Solicitações de Saques** - 6 saques fictícios

### Impacto:

❌ **Admin não consegue:**
- Ver afiliados reais cadastrados
- Gerenciar comissões reais
- Aprovar/rejeitar saques reais
- Ter visão real do programa de afiliados

### Tabelas do Banco Necessárias:

✅ Já existem (verificado nas migrations):
- `affiliates` - Cadastro de afiliados
- `commissions` - Comissões geradas
- `withdrawals` - Solicitações de saque
- `orders` - Vendas (para calcular comissões)

---

## 🎯 RECOMENDAÇÃO

### Prioridade: 🔴 ALTA

Estas páginas são **críticas** para a operação do programa de afiliados:

1. **Lista de Afiliados** - Admin precisa ver e gerenciar afiliados reais
2. **Gestão de Comissões** - Admin precisa aprovar/pagar comissões
3. **Solicitações** - Admin precisa processar saques

### Esforço Estimado:

- **Lista de Afiliados:** ~30 minutos
- **Gestão de Comissões:** ~40 minutos (mais complexo, tem JOINs)
- **Solicitações:** ~35 minutos

**Total:** ~2 horas para limpar as 3 páginas

---

## ✅ PRÓXIMOS PASSOS

Se você autorizar, posso:

1. ✅ Limpar **Lista de Afiliados** e conectar ao banco
2. ✅ Limpar **Gestão de Comissões** e conectar ao banco
3. ✅ Limpar **Solicitações** e conectar ao banco

Todas as 3 páginas ficarão 100% funcionais com dados reais.

---

**Aguardando sua autorização para prosseguir!** 🚀
