# 📋 PLANO DE AÇÃO - INVERSÃO PARA PAYMENT FIRST

**Data:** 27/02/2026  
**Responsável:** Kiro AI  
**Aprovador:** Renato  
**Prazo:** 4 dias úteis

---

## 🎯 OBJETIVO

Inverter o fluxo de cadastro de afiliados para seguir o padrão Payment First, eliminando riscos de contas zumbis e perda de receita.

---

## 📅 CRONOGRAMA

### Fase 1: Preparação (Dia 1 - Manhã)
**Duração:** 4 horas

#### Tarefas:
- [ ] Criar branch `feature/payment-first-affiliates`
- [ ] Configurar ambiente de desenvolvimento
- [ ] Ativar produtos de adesão no banco
- [ ] Validar wallet IDs dos gestores (Renum e JB)
- [ ] Criar estrutura de testes (TDD)

#### Entregáveis:
- Branch criada e protegida
- Produtos ativos: Individual (R$ 50) e Logista (R$ 100)
- Testes unitários escritos (sem implementação)

---

### Fase 2: Backend (Dia 1 - Tarde + Dia 2)
**Duração:** 12 horas

#### Task 2.1: Modificar `api/affiliates.js` (6 horas)
**Complexidade:** 🔴 ALTA

**Mudanças:**
1. Remover lógica de criação de conta em `handleRegister`
2. Criar novo handler `handlePaymentFirstRegister`
3. Manter handlers existentes para compatibilidade

**Código:**
```javascript
// NOVO HANDLER
async function handlePaymentFirstRegister(req, res, supabase) {
  // 1. Validar dados do formulário
  // 2. Retornar dados para criar pagamento
  // 3. NÃO criar conta Supabase
  // 4. NÃO criar registro em affiliates
}
```

**Checklist:**
- [ ] Handler criado e testado
- [ ] Validações de CPF/CNPJ mantidas
- [ ] Validação de duplicatas mantida
- [ ] Testes unitários passando

#### Task 2.2: Modificar `api/subscriptions/create-payment.js` (3 horas)
**Complexidade:** 🟡 MÉDIA

**Mudanças:**
1. Adicionar action `create-affiliate-payment-first`
2. Implementar sequência: Customer → Payment → Poll
3. Reutilizar lógica de split existente

**Código:**
```javascript
async function handleCreateAffiliatePaymentFirst(req, res, supabase) {
  // 1. Criar customer no Asaas
  // 2. Criar payment com split
  // 3. Retornar dados para polling
}
```

**Checklist:**
- [ ] Action criada e testada
- [ ] Split calculado corretamente
- [ ] Polling implementado
- [ ] Testes unitários passando

#### Task 2.3: Modificar `api/webhook-assinaturas.js` (1 hora)
**Complexidade:** 🟢 BAIXA

**Mudanças:**
1. Adicionar handler para `PAYMENT_CONFIRMED` de afiliados
2. Criar conta Supabase após confirmação
3. Atualizar status para active

**Código:**
```javascript
if (externalReference.startsWith('affiliate_')) {
  // 1. Criar conta Supabase Auth
  // 2. Criar registro em affiliates
  // 3. Gerar referral_code
  // 4. Enviar email de boas-vindas
}
```

**Checklist:**
- [ ] Handler criado e testado
- [ ] Conta criada corretamente
- [ ] Referral code gerado
- [ ] Email enviado

#### Task 2.4: Modificar Edge Function (2 horas)
**Complexidade:** 🟢 BAIXA

**Mudanças:**
1. Adicionar lógica de criação de conta
2. Gerar referral_code após confirmação
3. Enviar email de boas-vindas

**Checklist:**
- [ ] Edge Function deployada
- [ ] Logs estruturados
- [ ] Testes de integração passando

---

### Fase 3: Frontend (Dia 3)
**Duração:** 7 horas

#### Task 3.1: Modificar `AfiliadosCadastro.tsx` (4 horas)
**Complexidade:** 🔴 ALTA

**Mudanças:**
1. Remover criação de conta Supabase Auth
2. Remover criação de registro em affiliates
3. Manter apenas coleta de dados
4. Enviar dados para novo endpoint Payment First

**Código:**
```typescript
const handleSubmit = async (e) => {
  // 1. Validar formulário
  // 2. Chamar /api/affiliates?action=payment-first-register
  // 3. Receber dados de pagamento
  // 4. Exibir PaywallCadastro
}
```

**Checklist:**
- [ ] Formulário validado
- [ ] Endpoint chamado corretamente
- [ ] Paywall exibido
- [ ] Testes E2E passando

#### Task 3.2: Modificar `PaywallCadastro.tsx` (2 horas)
**Complexidade:** 🟡 MÉDIA

**Mudanças:**
1. Manter lógica de polling
2. Adicionar callback para criar conta após confirmação
3. Atualizar mensagens de feedback

**Código:**
```typescript
const handlePaymentConfirmed = async () => {
  // 1. Aguardar webhook criar conta
  // 2. Fazer login automático
  // 3. Redirecionar para dashboard
}
```

**Checklist:**
- [ ] Polling funcionando
- [ ] Callback implementado
- [ ] Mensagens atualizadas
- [ ] Testes E2E passando

#### Task 3.3: Modificar `affiliate.service.ts` (1 hora)
**Complexidade:** 🟢 BAIXA

**Mudanças:**
1. Adicionar método `registerWithPaymentFirst()`
2. Manter métodos existentes para compatibilidade

**Código:**
```typescript
async registerWithPaymentFirst(data: AffiliateRegistrationData) {
  const response = await fetch('/api/affiliates?action=payment-first-register', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
}
```

**Checklist:**
- [ ] Método criado
- [ ] Tipagem correta
- [ ] Testes unitários passando

---

### Fase 4: Testes e Validação (Dia 4 - Manhã)
**Duração:** 6 horas

#### Task 4.1: Testes Unitários (2 horas)
- [ ] Split calculator (3 cenários)
- [ ] Payment first service (5 cenários)
- [ ] Webhook handler (4 cenários)
- [ ] Cobertura mínima: 80%

#### Task 4.2: Testes de Integração (2 horas)
- [ ] Fluxo completo Individual
- [ ] Fluxo completo Logista
- [ ] Fluxo com falha de pagamento
- [ ] Fluxo com timeout

#### Task 4.3: Testes E2E (2 horas)
- [ ] Cadastro → Pagamento → Confirmação → Dashboard
- [ ] Validar split no Asaas (sandbox)
- [ ] Validar webhook recebido
- [ ] Validar email enviado

---

### Fase 5: Migração e Deploy (Dia 4 - Tarde)
**Duração:** 2 horas

#### Task 5.1: Migração de Dados (1 hora)
**Script:** `.kiro/scripts/migrate-affiliates-payment-first.sql`

**Ações:**
1. Migrar 26 afiliados ativos
   - Criar customers no Asaas
   - Criar registros em affiliate_payments
   - Atualizar asaas_customer_id

2. Deletar 28 afiliados pending
   - Soft delete (deleted_at)
   - Manter histórico para auditoria

**Checklist:**
- [ ] Script criado e testado
- [ ] Backup do banco realizado
- [ ] Migração executada
- [ ] Validação de dados OK

#### Task 5.2: Deploy em Produção (1 hora)
1. Merge para `main`
2. Deploy automático Vercel
3. Deploy Edge Function Supabase
4. Validar variáveis de ambiente
5. Monitorar logs por 1 hora

**Checklist:**
- [ ] Merge aprovado
- [ ] Deploy realizado
- [ ] Variáveis validadas
- [ ] Logs monitorados
- [ ] Nenhum erro crítico

---

## ✅ CRITÉRIOS DE ACEITAÇÃO

### Funcionalidade
- [ ] Cadastro cria conta APENAS após pagamento confirmado
- [ ] Referral code gerado APENAS após pagamento
- [ ] Split calculado corretamente (validar no Asaas)
- [ ] Webhook processa confirmação corretamente
- [ ] Email de boas-vindas enviado

### Qualidade
- [ ] Cobertura de testes ≥ 80%
- [ ] Zero erros de lint
- [ ] Zero erros de TypeScript
- [ ] Logs estruturados implementados
- [ ] Documentação atualizada

### Dados
- [ ] 26 afiliados ativos migrados
- [ ] 28 afiliados pending deletados
- [ ] Nenhuma inconsistência no banco
- [ ] Produtos de adesão ativos

### Performance
- [ ] Tempo de cadastro < 20 segundos
- [ ] Polling timeout = 15 segundos
- [ ] Webhook processado < 5 segundos
- [ ] Nenhum gargalo identificado

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Falha na Migração de Dados
**Probabilidade:** 🟡 MÉDIA  
**Impacto:** 🔴 ALTO  
**Mitigação:**
- Backup completo do banco antes de migrar
- Testar script em ambiente de desenvolvimento
- Rollback automático em caso de falha

### Risco 2: Webhook Não Recebido
**Probabilidade:** 🟢 BAIXA  
**Impacto:** 🔴 ALTO  
**Mitigação:**
- Polling como backup (15s timeout)
- Retry automático do webhook (3 tentativas)
- Logs estruturados para debug

### Risco 3: Split Calculado Incorretamente
**Probabilidade:** 🟢 BAIXA  
**Impacto:** 🔴 ALTO  
**Mitigação:**
- Testes unitários com 3 cenários
- Validação matemática (soma = 90%)
- Teste em sandbox do Asaas

### Risco 4: Timeout de Polling
**Probabilidade:** 🟡 MÉDIA  
**Impacto:** 🟡 MÉDIO  
**Mitigação:**
- Webhook como backup
- Mensagem clara para usuário
- Opção de tentar novamente

---

## 📊 MÉTRICAS DE SUCESSO

### Semana 1 (Pós-Deploy)
- [ ] Taxa de conversão (cadastro → pagamento) > 70%
- [ ] Tempo médio de confirmação < 10 segundos
- [ ] Zero contas zumbis criadas
- [ ] Zero erros críticos em produção

### Mês 1 (Pós-Deploy)
- [ ] 100% dos novos cadastros via Payment First
- [ ] Zero inconsistências de dados
- [ ] Taxa de abandono < 20%
- [ ] Satisfação dos afiliados > 80%

---

## 📞 COMUNICAÇÃO

### Stakeholders
- **Renato:** Aprovação e acompanhamento diário
- **Afiliados Ativos:** Email explicando mudança
- **Suporte:** Treinamento sobre novo fluxo

### Canais
- **Slack:** Updates diários no canal #dev
- **Email:** Comunicado oficial para afiliados
- **Documentação:** README atualizado

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. **Aguardar aprovação de Renato**
2. **Criar branch `feature/payment-first-affiliates`**
3. **Iniciar Fase 1 (Preparação)**

---

**📅 Data:** 27/02/2026  
**👤 Responsável:** Kiro AI  
**✅ Status:** Aguardando aprovação para início
