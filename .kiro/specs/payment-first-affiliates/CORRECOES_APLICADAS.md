# Correções Aplicadas - Payment First + Afiliados Existentes

**Data:** 27/02/2026  
**Spec:** payment-first-affiliates  
**Status:** ✅ Correções aplicadas com sucesso

---

## Resumo das Correções

Foram aplicadas 3 correções solicitadas pelo usuário no arquivo `design.md`:

### ✅ Correção 1: Senha no Webhook

**Problema identificado:**
- Webhook estava usando lógica de senha temporária + email de redefinição
- Não seguia o padrão do sistema Comademig (subscription-payment-flow)

**Correção aplicada:**
- Webhook agora recupera `password_hash` diretamente da tabela `payment_sessions`
- Usa `supabase.auth.admin.createUser()` com `email_confirm: true`
- NÃO envia senha temporária nem email de redefinição
- Padrão idêntico ao implementado em `.kiro/specs/subscription-payment-flow/`

**Localização no código:**
```javascript
// api/webhook-assinaturas.js - função handlePreRegistrationPayment()
const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  email: session.email,
  password: session.password_hash, // Hash recuperado da tabela payment_sessions
  email_confirm: true, // Confirmar email automaticamente (sem envio de email)
  user_metadata: {
    name: session.name,
    phone: session.phone
  }
});
```

---

### ✅ Correção 2: Escopo da Tabela

**Problema identificado:**
- Tabela `payment_sessions` estava na Phase A3 (Frente A - Afiliados Existentes)
- Deveria estar na Phase B1 (Frente B - Payment First)

**Correção aplicada:**
- Tabela movida de "A3. Sistema de Notificações Automáticas" para "B1. Database - Tabela de Sessões Temporárias"
- Seções B1, B2, B3, B4, B5, B6 renumeradas para B2, B3, B4, B5, B6, B7

**Estrutura atualizada:**
- **FRENTE A:**
  - A1. Deleção de Afiliados de Teste
  - A2. Liberar Acesso Total
  - A3. Sistema de Notificações Automáticas (apenas Scheduled Jobs)
  
- **FRENTE B:**
  - B1. Database - Tabela de Sessões Temporárias ← NOVA POSIÇÃO
  - B2. Backend - Validação Prévia
  - B3. Backend - Criação de Pagamento
  - B4. Backend - Webhook Handler
  - B5. Frontend - Atualização do Cadastro
  - B6. Frontend - Componente Paywall
  - B7. Services - Frontend

---

### ✅ Correção 3: Estrutura da Tabela

**Problema identificado:**
- Faltava campo `referral_code TEXT`
- Tinha campo desnecessário `product_id UUID`

**Correção aplicada:**
- ✅ Adicionado campo `referral_code TEXT` (código de indicação fornecido no cadastro)
- ✅ Removido campo `product_id UUID` (não é necessário para sessão temporária)
- ✅ Adicionado campo `document_type VARCHAR(10)` para distinguir CPF/CNPJ
- ✅ Adicionado campo `referred_by UUID` (ID do afiliado que indicou, resolvido a partir do referral_code)

**Estrutura final da tabela:**
```sql
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  document TEXT NOT NULL,
  document_type VARCHAR(10) NOT NULL CHECK (document_type IN ('CPF', 'CNPJ')),
  password_hash TEXT NOT NULL, -- senha criptografada (bcrypt)
  affiliate_type VARCHAR(20) NOT NULL CHECK (affiliate_type IN ('individual', 'logista')),
  referred_by UUID REFERENCES affiliates(id), -- ID do afiliado que indicou (se houver)
  referral_code TEXT, -- ADICIONADO: código de indicação fornecido no cadastro
  -- product_id UUID REMOVIDO: não é necessário para sessão temporária
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Arquivos Modificados

1. **`.kiro/specs/payment-first-affiliates/design.md`**
   - ✅ Correção 1 aplicada na seção B4 (webhook)
   - ✅ Correção 2 aplicada (tabela movida de A3 para B1)
   - ✅ Correção 3 aplicada (estrutura da tabela atualizada)
   - ✅ Seções renumeradas (B1→B2, B2→B3, etc.)

2. **`.kiro/specs/payment-first-affiliates/migrations/20260227000000_create_payment_sessions.sql`**
   - ✅ Migration criada com estrutura correta
   - ✅ Inclui comentários explicativos
   - ✅ Inclui índices e triggers
   - ✅ Inclui função de cleanup de sessões expiradas

---

## Próximos Passos

Conforme definido pelo usuário:

1. ✅ **Aplicar as 3 correções no design.md** ← CONCLUÍDO
2. ✅ **Criar migration com estrutura correta** ← CONCLUÍDO
3. ⏳ **Iniciar Frente A (tasks A1 → A2 → A3)**
4. ⏳ **Entregar relatório de conclusão da Frente A**
5. ⏳ **Aguardar autorização antes de tocar Frente B**

---

## Validação

### Checklist de Correções

- [x] Correção 1: Webhook usa `password_hash` diretamente (sem senha temporária)
- [x] Correção 2: Tabela `payment_sessions` movida para Phase B1
- [x] Correção 3: Campo `referral_code` adicionado, campo `product_id` removido
- [x] Migration SQL criada com estrutura correta
- [x] Seções do design.md renumeradas corretamente
- [x] Comentários explicativos adicionados no código

### Referências Validadas

- ✅ Padrão de webhook baseado em `.kiro/specs/subscription-payment-flow/design.md`
- ✅ Uso de `supabase.auth.admin.createUser()` com `email_confirm: true`
- ✅ Estrutura de tabela alinhada com requisitos do Payment First
- ✅ Isolamento total entre Frente A e Frente B

---

**Status:** Pronto para iniciar implementação da Frente A
