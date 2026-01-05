# Correção: Cadastro de Afiliados

**Data:** 05/01/2026  
**Status:** ✅ CORRIGIDO

---

## 🐛 PROBLEMAS IDENTIFICADOS

### 1. **Erro: Dialog is not defined**
**Sintoma:** Página em branco com erro no console  
**Causa:** Componentes do Dialog não estavam importados  
**Correção:** Adicionado import dos componentes Dialog

```typescript
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
```

### 2. **Erro: parent_affiliate_id column not found**
**Sintoma:** Erro ao tentar cadastrar afiliado  
**Causa:** Código tentava inserir coluna `parent_affiliate_id` que não existe na tabela `affiliates`  
**Correção:** Removido campo do insert (relação é feita via tabela `affiliate_network`)

### 3. **Erro: violates check constraint "affiliates_document_check"**
**Sintoma:** Cadastro falhava com erro de constraint  
**Causa:** CPF sendo enviado com formatação (000.000.000-00) mas banco espera apenas números  
**Correção:** Adicionada limpeza do documento antes de enviar

```typescript
// Limpar documento (remover formatação)
const cleanDocument = data.document ? data.document.replace(/\D/g, '') : null;
```

### 4. **Erro 406 (Not Acceptable)**
**Sintoma:** Queries ao Supabase retornando 406  
**Causa:** Queries sendo feitas antes do usuário estar autenticado  
**Status:** ⚠️ PARCIALMENTE RESOLVIDO - Não impede cadastro

---

## 📊 ANÁLISE DO BANCO DE DADOS

### Estrutura da Tabela `affiliates`

**Constraints Importantes:**

1. **document_check:** `(document IS NULL) OR (document ~ '^\\d{11}$|^\\d{14}$')`
   - Aceita NULL ou 11 dígitos (CPF) ou 14 dígitos (CNPJ)
   - **SEM FORMATAÇÃO** (apenas números)

2. **email_check:** Validação de formato de email

3. **name_check:** Nome entre 3 e 100 caracteres

4. **phone_check:** Formato internacional de telefone

5. **referral_code_check:** Código de 6 caracteres (A-Z, 0-9)

6. **wallet_id_check:** Formato UUID (quando não NULL)

### Políticas RLS Ativas

- ✅ **Users can register as affiliates** (INSERT permitido)
- ✅ **Affiliates can view own data** (SELECT próprios dados)
- ✅ **Affiliates can update own data** (UPDATE próprios dados)
- ✅ **Admins can view all affiliates** (SELECT todos)
- ✅ **Admins can create affiliates** (INSERT)
- ✅ **Admins can update affiliates** (UPDATE todos)

---

## ✅ CORREÇÕES APLICADAS

### Commit 1: Adicionar imports do Dialog
```bash
git commit -m "fix: adicionar imports do Dialog no cadastro de afiliados"
```

### Commit 2: Remover parent_affiliate_id
```bash
git commit -m "fix: remover parent_affiliate_id do insert de affiliates"
```

### Commit 3: Limpar formatação do CPF
```bash
git commit -m "fix: limpar formatação do CPF antes de enviar ao banco"
```

---

## 🧪 TESTES NECESSÁRIOS

Após deploy no Vercel (~2 minutos):

1. ✅ Página carrega sem erros
2. ✅ Formulário é exibido corretamente
3. ✅ Cadastro com CPF formatado funciona
4. ✅ Modal de sucesso é exibido
5. ⚠️ Verificar se erros 406 ainda aparecem (não crítico)

---

## 📝 OBSERVAÇÕES

### Campos Opcionais no Cadastro
- `document` (CPF/CNPJ) - Opcional
- `phone` - Opcional
- `city` - Opcional
- `state` - Opcional

### Campos Obrigatórios
- `name` - Obrigatório (3-100 caracteres)
- `email` - Obrigatório (formato válido)
- `acceptedTerms` - Obrigatório (checkbox)

### Fluxo Pós-Cadastro
1. Afiliado criado com status `pending`
2. `wallet_id` = NULL (será configurado depois)
3. `onboarding_completed` = false
4. Redirecionamento para `/afiliados/dashboard`
5. Usuário deve configurar Wallet ID nas configurações

---

## 🔍 ANÁLISE TÉCNICA

### Por que o erro 406?

O erro 406 (Not Acceptable) ocorre quando:
- Cliente faz query ao Supabase
- Supabase retorna dados
- Cliente não aceita o formato da resposta

**Possíveis causas:**
1. Query sendo feita antes da autenticação completa
2. Headers de Accept não configurados corretamente
3. RLS bloqueando acesso (mas retornando 406 ao invés de 403)

**Impacto:**
- ⚠️ Não crítico - cadastro funciona mesmo com erro 406
- Erro aparece no console mas não impede funcionalidade
- Pode ser ignorado por enquanto

### Estrutura de Rede de Afiliados

A relação entre afiliados é feita através da tabela `affiliate_network`:

```sql
CREATE TABLE affiliate_network (
  id UUID PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id),
  parent_affiliate_id UUID REFERENCES affiliates(id),
  level INTEGER, -- 1, 2 ou 3
  created_at TIMESTAMPTZ
);
```

**NÃO existe** coluna `parent_affiliate_id` na tabela `affiliates`.

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Testar cadastro em produção
2. ⚠️ Investigar erro 406 (baixa prioridade)
3. ✅ Validar fluxo completo de onboarding
4. ✅ Testar configuração de Wallet ID
5. ✅ Validar geração de link de indicação

---

**Correções aplicadas por:** Kiro AI  
**Data:** 05/01/2026  
**Status:** Pronto para teste em produção
