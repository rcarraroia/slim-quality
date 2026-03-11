# 📋 TASKS: Correção do Fluxo de Pagamento de Afiliados

**Data:** 11/03/2026  
**Tipo:** Bugfix Implementation  
**Estimativa Total:** 3-4 horas

---

## 📊 RESUMO DE TASKS

**Total:** 8 tasks  
**Concluídas:** 0/8  
**Em Progresso:** 0/8  
**Pendentes:** 8/8

---

## PHASE 1: BACKEND (API)

### Task 1.1: Modificar Resposta da API

**Objetivo:** Alterar `api/create-payment.js` para retornar apenas `payment_url`

**Arquivo:** `api/create-payment.js`  
**Função:** `handleCreateAffiliateMembership()`  
**Linhas:** 940-975

**Mudanças:**

**ANTES:**
```javascript
return res.status(200).json({
  success: true,
  payment: {
    id: paymentData.id,
    payment_method: payment_method,
    amount: amount,
    qr_code: payment_method === 'PIX' ? paymentData.payload : null,
    qr_code_image: payment_method === 'PIX' ? paymentData.encodedImage : null,
    invoice_url: paymentData.invoiceUrl,
    // ... outros campos
  }
});
```

**DEPOIS:**
```javascript
return res.status(200).json({
  success: true,
  payment_url: paymentData.invoiceUrl
});
```

**Checklist:**
- [ ] Localizar função `handleCreateAffiliateMembership()`
- [ ] Modificar resposta para retornar apenas `payment_url`
- [ ] Remover campos `qr_code`, `qr_code_image`, etc.
- [ ] Testar resposta da API via Postman/Insomnia
- [ ] Validar que `payment_url` é uma URL válida do Asaas

**Tempo Estimado:** 15 minutos

---

### Task 1.2: Validar API com getDiagnostics

**Objetivo:** Garantir que não há erros de sintaxe ou linting

**Checklist:**
- [ ] Executar `getDiagnostics` em `api/create-payment.js`
- [ ] Confirmar 0 erros
- [ ] Confirmar 0 warnings críticos

**Tempo Estimado:** 5 minutos

---

## PHASE 2: FRONTEND (COMPONENTE)

### Task 2.1: Remover Estados Desnecessários

**Objetivo:** Limpar estados que não são mais necessários

**Arquivo:** `src/components/PaywallCadastro.tsx`  
**Linhas:** 30-40

**Estados a Remover:**
```typescript
const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
const [polling, setPolling] = useState(false);
const [pollingAttempts, setPollingAttempts] = useState(0);
const [timeoutProgress, setTimeoutProgress] = useState(0);
const [timeRemaining, setTimeRemaining] = useState(900);
```

**Checklist:**
- [ ] Remover declaração de `paymentData`
- [ ] Remover declaração de `polling`
- [ ] Remover declaração de `pollingAttempts`
- [ ] Remover declaração de `timeoutProgress`
- [ ] Remover declaração de `timeRemaining`
- [ ] Remover interface `PaymentData` (se não for usada em outro lugar)

**Tempo Estimado:** 10 minutos

---

### Task 2.2: Remover Funções Desnecessárias

**Objetivo:** Limpar funções que não são mais necessárias

**Arquivo:** `src/components/PaywallCadastro.tsx`

**Funções a Remover:**
- `startPolling()` (linhas ~120-180)
- `handleCopyPix()` (linhas ~190-200)
- `formatTime()` (linhas ~210-215)

**Checklist:**
- [ ] Remover função `startPolling()`
- [ ] Remover função `handleCopyPix()`
- [ ] Remover função `formatTime()`
- [ ] Verificar que não há referências a essas funções

**Tempo Estimado:** 10 minutos

---

### Task 2.3: Modificar Lógica de handleCreatePayment

**Objetivo:** Alterar para redirecionar ao invés de exibir QR Code

**Arquivo:** `src/components/PaywallCadastro.tsx`  
**Função:** `handleCreatePayment()`  
**Linhas:** 100-115

**ANTES:**
```typescript
if (result.success) {
  setPaymentData(result.payment);
  setTimeout(() => {
    startPolling();
  }, 5000);
}
```

**DEPOIS:**
```typescript
if (result.success && result.payment_url) {
  toast({
    title: 'Pagamento gerado!',
    description: 'Redirecionando para pagamento seguro...'
  });
  
  setTimeout(() => {
    window.location.href = result.payment_url;
  }, 2000);
}
```

**Checklist:**
- [ ] Modificar lógica de sucesso
- [ ] Adicionar toast de sucesso
- [ ] Adicionar redirecionamento para `payment_url`
- [ ] Remover chamada para `startPolling()`
- [ ] Remover `setPaymentData()`

**Tempo Estimado:** 15 minutos

---

### Task 2.4: Remover Renderização de QR Code

**Objetivo:** Remover todo o bloco de renderização de QR Code

**Arquivo:** `src/components/PaywallCadastro.tsx`  
**Linhas:** 300-350

**Bloco a Remover:**
```typescript
{/* QR Code PIX */}
{paymentMethod === 'pix' && paymentData.qr_code_image && (
  <div className="space-y-4">
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <img src={paymentData.qr_code_image} ... />
      </div>
      ...
    </div>
    {/* Código Copia e Cola */}
    ...
  </div>
)}
```

**Checklist:**
- [ ] Remover bloco de renderização de QR Code
- [ ] Remover bloco de código "Copia e Cola"
- [ ] Remover import de ícone `Copy` (se não for usado em outro lugar)

**Tempo Estimado:** 10 minutos

---

### Task 2.5: Remover Renderização de Polling

**Objetivo:** Remover todo o bloco de renderização de status de polling

**Arquivo:** `src/components/PaywallCadastro.tsx`  
**Linhas:** 380-400

**Bloco a Remover:**
```typescript
{/* Status de polling */}
{polling && (
  <div className="space-y-3 pt-4 border-t">
    <div className="flex items-center justify-between text-sm">
      <Clock className="h-4 w-4 animate-pulse" />
      ...
    </div>
    <Progress value={timeoutProgress} className="h-2" />
    ...
  </div>
)}
```

**Checklist:**
- [ ] Remover bloco de renderização de polling
- [ ] Remover import de `Progress` (se não for usado em outro lugar)
- [ ] Remover import de ícone `Clock` (se não for usado em outro lugar)

**Tempo Estimado:** 10 minutos

---

### Task 2.6: Validar Frontend com getDiagnostics

**Objetivo:** Garantir que não há erros de TypeScript ou linting

**Checklist:**
- [ ] Executar `getDiagnostics` em `src/components/PaywallCadastro.tsx`
- [ ] Confirmar 0 erros
- [ ] Confirmar 0 warnings críticos
- [ ] Verificar que imports não utilizados foram removidos

**Tempo Estimado:** 5 minutos

---

## PHASE 3: TESTES E VALIDAÇÃO

### Task 3.1: Testar Fluxo Completo PIX

**Objetivo:** Validar que fluxo PIX funciona end-to-end

**Passos:**
1. Acessar `/afiliados/cadastro`
2. Preencher formulário de cadastro
3. Escolher tipo "Individual"
4. Marcar checkbox "Incluir Vitrine + Agente IA"
5. Clicar em "Continuar"
6. Escolher método de pagamento "PIX"
7. Clicar em "Continuar"
8. Verificar toast "Redirecionando para pagamento..."
9. Aguardar redirecionamento (2 segundos)
10. Verificar que foi redirecionado para Asaas
11. Verificar que QR Code aparece na página do Asaas
12. Copiar código PIX
13. Pagar via PIX (sandbox ou produção)
14. Aguardar confirmação do webhook
15. Verificar que conta foi criada no Supabase Auth
16. Verificar que afiliado foi criado na tabela `affiliates`
17. Verificar que pagamento foi registrado em `affiliate_payments`
18. Tentar fazer login com email e senha

**Checklist:**
- [ ] Redirecionamento funciona
- [ ] QR Code aparece no Asaas
- [ ] Pagamento é confirmado
- [ ] Conta é criada automaticamente
- [ ] Afiliado é ativado
- [ ] Login funciona

**Tempo Estimado:** 30 minutos

---

### Task 3.2: Testar Fluxo Completo Cartão

**Objetivo:** Validar que fluxo de cartão também funciona

**Passos:**
1. Acessar `/afiliados/cadastro`
2. Preencher formulário de cadastro
3. Escolher tipo "Logista"
4. Clicar em "Continuar"
5. Escolher método de pagamento "Cartão"
6. Clicar em "Continuar"
7. Verificar toast "Redirecionando para pagamento..."
8. Aguardar redirecionamento (2 segundos)
9. Verificar que foi redirecionado para Asaas
10. Preencher dados do cartão na página do Asaas
11. Confirmar pagamento
12. Aguardar confirmação
13. Verificar que conta foi criada e ativada

**Checklist:**
- [ ] Redirecionamento funciona
- [ ] Formulário de cartão aparece no Asaas
- [ ] Pagamento é processado
- [ ] Conta é criada automaticamente
- [ ] Afiliado é ativado
- [ ] Login funciona

**Tempo Estimado:** 30 minutos

---

## 📊 RESUMO DE TEMPO

| Phase | Tasks | Tempo Estimado |
|-------|-------|----------------|
| Phase 1: Backend | 2 | 20 minutos |
| Phase 2: Frontend | 5 | 70 minutos |
| Phase 3: Testes | 2 | 60 minutos |
| **TOTAL** | **8** | **2h 30min** |

---

## ✅ CRITÉRIOS DE CONCLUSÃO

### Backend
- [ ] API retorna apenas `payment_url`
- [ ] getDiagnostics: 0 erros

### Frontend
- [ ] Estados desnecessários removidos
- [ ] Funções desnecessárias removidas
- [ ] Lógica de redirecionamento implementada
- [ ] Renderização de QR Code removida
- [ ] Renderização de polling removida
- [ ] getDiagnostics: 0 erros

### Testes
- [ ] Fluxo PIX funciona end-to-end
- [ ] Fluxo Cartão funciona end-to-end
- [ ] Conta é criada e ativada automaticamente
- [ ] Login funciona após ativação

---

## 🎯 RESULTADO ESPERADO

Após conclusão de todas as tasks:

1. ✅ Sistema de cadastro de afiliados funcionando 100%
2. ✅ QR Code aparece corretamente (no Asaas)
3. ✅ Pagamentos são confirmados automaticamente
4. ✅ Contas são criadas e ativadas automaticamente
5. ✅ Código mais simples e manutenível
6. ✅ Consistência com fluxo de produtos digitais

**Status:** Pronto para implementação após autorização do usuário.
