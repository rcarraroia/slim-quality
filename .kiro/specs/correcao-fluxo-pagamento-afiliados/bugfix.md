# 🐛 BUGFIX: QR Code PIX Não Aparece no Cadastro de Afiliados

**Data:** 11/03/2026  
**Tipo:** Bugfix Crítico  
**Prioridade:** Alta  
**Status:** Documentado - Aguardando Implementação

---

## 📋 RESUMO EXECUTIVO

O fluxo de pagamento de adesão de afiliados está quebrado: após o usuário escolher PIX e clicar em "Continuar", o sistema mostra a tela "Aguardando Confirmação" ANTES de exibir o QR Code do PIX, impedindo que o afiliado complete o pagamento e ative sua conta.

**Impacto:** Sistema de cadastro de afiliados completamente parado. Nenhum novo afiliado consegue se cadastrar.

**Causa Raiz:** Diferença na arquitetura de resposta da API entre produtos digitais (funcionando) e adesão de afiliados (quebrado).

**Solução Escolhida:** Padronizar fluxo de adesão de afiliados para seguir o mesmo padrão de produtos digitais (API retorna `payment_url`, frontend redireciona para Asaas).

---

## 🔍 CONDIÇÃO DO BUG C(X)

### Definição Formal

**C(X):** Sistema exibe tela "Aguardando Confirmação" ANTES de mostrar QR Code do PIX quando:
- Usuário está no fluxo de cadastro de afiliado
- Usuário escolhe método de pagamento PIX
- Usuário clica em "Continuar"
- API retorna `{ success: true, payment: { qr_code, qr_code_image } }`
- Frontend recebe resposta e inicia polling após 5 segundos
- Estado `polling = true` muda UI para "Aguardando Confirmação"
- QR Code fica visualmente "escondido" pela UI de polling

### Entrada X

```typescript
// Dados de entrada que ativam o bug
{
  session_token: "token_valido",
  payment_method: "PIX",
  has_subscription: boolean
}
```

### Saída Esperada (Correta)

```
1. Usuário clica em "Continuar"
2. API cria cobrança no Asaas
3. API retorna payment_url
4. Frontend redireciona para Asaas
5. Asaas exibe QR Code (página externa)
6. Usuário paga
7. Webhook confirma pagamento
8. Sistema ativa conta do afiliado
```

### Saída Atual (Incorreta)

```
1. Usuário clica em "Continuar"
2. API cria cobrança no Asaas
3. API retorna qr_code e qr_code_image
4. Frontend recebe dados
5. ❌ Frontend inicia polling após 5 segundos
6. ❌ Estado polling = true muda UI
7. ❌ Tela mostra "Aguardando Confirmação"
8. ❌ QR Code não aparece (escondido pela UI)
9. ❌ Usuário não consegue pagar
10. ❌ Conta não é ativada
```

---

## 🎯 REQUISITOS DE CORREÇÃO

### R1: API Deve Retornar payment_url

**Descrição:** API `/api/create-payment?action=create-affiliate-membership` deve retornar `payment_url` do Asaas ao invés de `qr_code` e `qr_code_image`.

**Critérios de Aceitação:**
- [ ] API retorna `{ success: true, payment_url: "https://www.asaas.com/i/..." }`
- [ ] Campo `payment_url` contém URL válida do Asaas
- [ ] Campos `qr_code` e `qr_code_image` NÃO são mais retornados
- [ ] Resposta segue mesmo padrão de `/api/checkout` (produtos digitais)

**Arquivo Afetado:** `api/create-payment.js` (função `handleCreateAffiliateMembership`)

---

### R2: Frontend Deve Redirecionar para Asaas

**Descrição:** Componente `PaywallCadastro.tsx` deve redirecionar usuário para `payment_url` ao invés de tentar exibir QR Code.

**Critérios de Aceitação:**
- [ ] Frontend recebe `payment_url` da API
- [ ] Frontend executa `window.location.href = payment_url` após 2 segundos
- [ ] Toast de sucesso é exibido: "Redirecionando para pagamento..."
- [ ] Lógica de polling é REMOVIDA
- [ ] Estado `polling` é REMOVIDO
- [ ] Renderização de QR Code é REMOVIDA

**Arquivo Afetado:** `src/components/PaywallCadastro.tsx`

---

### R3: Remover Lógica de Polling

**Descrição:** Toda lógica de polling (verificação automática de pagamento) deve ser removida do componente.

**Critérios de Aceitação:**
- [ ] Função `startPolling()` é REMOVIDA
- [ ] Estado `polling` é REMOVIDO
- [ ] Estado `pollingAttempts` é REMOVIDO
- [ ] Estado `timeoutProgress` é REMOVIDO
- [ ] Estado `timeRemaining` é REMOVIDO
- [ ] Componente `Progress` é REMOVIDO
- [ ] Função `formatTime()` é REMOVIDA
- [ ] Lógica de timeout (15 minutos) é REMOVIDA

**Arquivo Afetado:** `src/components/PaywallCadastro.tsx`

---

### R4: Remover Renderização de QR Code

**Descrição:** Toda lógica de renderização de QR Code no frontend deve ser removida.

**Critérios de Aceitação:**
- [ ] Bloco de renderização de QR Code PIX é REMOVIDO
- [ ] Bloco de código "Copia e Cola" é REMOVIDO
- [ ] Função `handleCopyPix()` é REMOVIDA
- [ ] Imagem do QR Code não é mais exibida
- [ ] Asaas gerencia toda a UI de pagamento

**Arquivo Afetado:** `src/components/PaywallCadastro.tsx`

---

### R5: Manter Compatibilidade com Webhook

**Descrição:** Webhook Asaas deve continuar funcionando normalmente para confirmar pagamentos.

**Critérios de Aceitação:**
- [ ] Webhook recebe evento `PAYMENT_CONFIRMED`
- [ ] Webhook identifica pagamento pelo `externalReference` (`affiliate_pre_${session_token}`)
- [ ] Webhook cria conta do afiliado no Supabase Auth
- [ ] Webhook ativa conta do afiliado
- [ ] Webhook cria registro em `affiliate_payments`
- [ ] Webhook calcula e salva comissões

**Arquivo Afetado:** `api/webhook-assinaturas.js` (NÃO precisa modificar - já funciona)

---

## 🔬 TESTES DE VALIDAÇÃO

### Teste 1: Fluxo Completo PIX

**Objetivo:** Validar que fluxo completo funciona do início ao fim.

**Passos:**
1. Acessar `/afiliados/cadastro`
2. Preencher formulário de cadastro
3. Escolher tipo de afiliado (Individual ou Logista)
4. Clicar em "Continuar"
5. Escolher método de pagamento PIX
6. Clicar em "Continuar"
7. Aguardar redirecionamento (2 segundos)
8. Verificar que foi redirecionado para Asaas
9. Verificar que QR Code aparece na página do Asaas
10. Pagar via PIX
11. Aguardar confirmação do webhook
12. Verificar que conta foi criada e ativada

**Resultado Esperado:**
- ✅ Redirecionamento para Asaas funciona
- ✅ QR Code aparece na página do Asaas
- ✅ Pagamento é confirmado
- ✅ Conta é criada e ativada automaticamente

---

### Teste 2: Fluxo Completo Cartão

**Objetivo:** Validar que fluxo de cartão também funciona.

**Passos:**
1. Acessar `/afiliados/cadastro`
2. Preencher formulário de cadastro
3. Escolher tipo de afiliado (Individual ou Logista)
4. Clicar em "Continuar"
5. Escolher método de pagamento Cartão
6. Clicar em "Continuar"
7. Aguardar redirecionamento (2 segundos)
8. Verificar que foi redirecionado para Asaas
9. Preencher dados do cartão na página do Asaas
10. Confirmar pagamento
11. Aguardar confirmação do webhook
12. Verificar que conta foi criada e ativada

**Resultado Esperado:**
- ✅ Redirecionamento para Asaas funciona
- ✅ Formulário de cartão aparece na página do Asaas
- ✅ Pagamento é processado
- ✅ Conta é criada e ativada automaticamente

---

### Teste 3: Validar Que Polling Foi Removido

**Objetivo:** Garantir que lógica de polling não existe mais.

**Passos:**
1. Inspecionar código de `PaywallCadastro.tsx`
2. Buscar por `startPolling`
3. Buscar por `polling`
4. Buscar por `pollingAttempts`
5. Buscar por `timeoutProgress`

**Resultado Esperado:**
- ✅ Nenhuma referência a `startPolling` encontrada
- ✅ Nenhuma referência a `polling` encontrada
- ✅ Nenhuma referência a `pollingAttempts` encontrada
- ✅ Nenhuma referência a `timeoutProgress` encontrada

---

### Teste 4: Validar Que QR Code Foi Removido

**Objetivo:** Garantir que renderização de QR Code não existe mais.

**Passos:**
1. Inspecionar código de `PaywallCadastro.tsx`
2. Buscar por `qr_code_image`
3. Buscar por `handleCopyPix`
4. Buscar por `<img src={paymentData.qr_code_image}`

**Resultado Esperado:**
- ✅ Nenhuma referência a `qr_code_image` encontrada
- ✅ Nenhuma referência a `handleCopyPix` encontrada
- ✅ Nenhum elemento `<img>` renderizando QR Code

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### ANTES (Quebrado)

**API Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pay_xxx",
    "payment_method": "PIX",
    "amount": 97.00,
    "qr_code": "00020126580014...",
    "qr_code_image": "data:image/png;base64,...",
    "invoice_url": "https://...",
    "status": "pending"
  }
}
```

**Frontend Behavior:**
```typescript
if (result.success) {
  setPaymentData(result.payment);
  setTimeout(() => startPolling(), 5000); // ❌ Inicia polling
}
```

**Resultado:** QR Code não aparece, usuário vê "Aguardando Confirmação"

---

### DEPOIS (Corrigido)

**API Response:**
```json
{
  "success": true,
  "payment_url": "https://www.asaas.com/i/763360843"
}
```

**Frontend Behavior:**
```typescript
if (result.success && result.payment_url) {
  toast({ title: "Redirecionando para pagamento..." });
  setTimeout(() => {
    window.location.href = result.payment_url;
  }, 2000);
}
```

**Resultado:** Usuário é redirecionado para Asaas, QR Code aparece, pagamento funciona

---

## 🎯 CRITÉRIOS DE SUCESSO

### Critério 1: Fluxo Funciona End-to-End

- [ ] Usuário consegue se cadastrar como afiliado
- [ ] Usuário consegue escolher método de pagamento
- [ ] Usuário é redirecionado para Asaas
- [ ] QR Code aparece na página do Asaas
- [ ] Usuário consegue pagar
- [ ] Webhook confirma pagamento
- [ ] Conta é criada e ativada automaticamente

### Critério 2: Código Limpo

- [ ] Lógica de polling removida
- [ ] Renderização de QR Code removida
- [ ] Estados desnecessários removidos
- [ ] Código segue padrão de produtos digitais
- [ ] getDiagnostics: 0 erros

### Critério 3: Consistência

- [ ] Fluxo de adesão de afiliados = Fluxo de produtos digitais
- [ ] Mesma estrutura de resposta da API
- [ ] Mesmo comportamento do frontend
- [ ] Mesma experiência do usuário

---

## 📝 NOTAS IMPORTANTES

### Por Que Esta Solução?

1. **Já funciona perfeitamente em produtos digitais** - Não estamos inventando nada novo
2. **Código mais simples** - Menos estados, menos lógica, menos bugs
3. **Asaas gerencia UI** - Não precisamos nos preocupar com QR Code, timeout, etc.
4. **Menos pontos de falha** - Redirecionamento é mais robusto que polling
5. **Melhor UX** - Usuário vê QR Code imediatamente (no Asaas)

### Alternativas Consideradas

**Alternativa 1:** Corrigir lógica de polling (não iniciar automaticamente)
- ❌ Mais complexo
- ❌ Mais estados para gerenciar
- ❌ Mais pontos de falha

**Alternativa 2:** Separar estados de UI (QR Code sempre visível)
- ❌ Ainda mais complexo
- ❌ Ainda precisa gerenciar polling
- ❌ Código menos manutenível

**Solução Escolhida:** Seguir padrão de produtos digitais
- ✅ Simples
- ✅ Robusto
- ✅ Já funciona
- ✅ Fácil de manter

---

## 🔗 REFERÊNCIAS

- Análise completa: `.kiro/ANALISE_COMPARATIVA_FLUXOS_PAGAMENTO.md`
- Fluxo funcionando: `src/components/checkout/AffiliateAwareCheckout.tsx`
- Fluxo quebrado: `src/components/PaywallCadastro.tsx`
- API funcionando: `api/checkout.js`
- API quebrada: `api/create-payment.js`

---

**AGUARDANDO AUTORIZAÇÃO PARA IMPLEMENTAR CORREÇÕES**
