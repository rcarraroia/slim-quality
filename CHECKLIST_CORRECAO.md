# ✅ CHECKLIST DE CORREÇÃO - SISTEMA DE AFILIADOS

**Data de Início:** 10/01/2026  
**Prazo:** 11/01/2026  
**Status:** 🔴 EM ANDAMENTO

---

## 🚨 CORREÇÕES URGENTES (Hoje - 30 min)

### 1. Segurança
- [ ] Ativar RLS em `commissions`
- [ ] Criar política para afiliados
- [ ] Criar política para admins
- [ ] Testar acesso com usuário teste
- [ ] Verificar logs de acesso

**Comando:**
```sql
-- Ver SCRIPTS_CORRECAO_URGENTE.sql - Seção 1
```

---

### 2. Códigos de Referência
- [ ] Gerar códigos para afiliados existentes
- [ ] Inserir em `referral_codes`
- [ ] Criar função `generate_unique_referral_code()`
- [ ] Criar trigger para novos afiliados
- [ ] Verificar códigos gerados

**Validação:**
```sql
SELECT name, referral_code FROM affiliates;
-- Todos devem ter código
```

---

### 3. Webhook Asaas
- [ ] Acessar painel Asaas
- [ ] Ir em Configurações > Webhooks
- [ ] Adicionar URL: `https://api.slimquality.com.br/webhooks/asaas`
- [ ] Selecionar eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED
- [ ] Ativar webhook
- [ ] Fazer pagamento de teste
- [ ] Verificar recebimento

**Validação:**
```sql
SELECT * FROM asaas_webhook_logs ORDER BY created_at DESC LIMIT 1;
-- Deve ter registro
```

---

### 4. Wallet ID Faltante
- [ ] Enviar email para Maria Edurda (renusdev@gmail.com)
- [ ] Enviar WhatsApp (se disponível)
- [ ] Aguardar resposta (1 dia)
- [ ] Receber wallet_id
- [ ] Validar via Edge Function
- [ ] Atualizar registro

**Template enviado:**
```
□ Email enviado
□ WhatsApp enviado
□ Resposta recebida
□ Wallet validada
□ Registro atualizado
```

---

## 🔧 IMPLEMENTAÇÕES (Amanhã - 4h)

### 5. Tracking de Origem
- [ ] Criar `src/utils/tracking.ts`
- [ ] Implementar `captureReferralCode()`
- [ ] Implementar `getReferralCode()`
- [ ] Implementar `registerClick()`
- [ ] Adicionar em `src/pages/Home.tsx`
- [ ] Testar com URL: `?ref=ABC123`
- [ ] Verificar localStorage
- [ ] Verificar registro em `referral_clicks`

**Arquivos:**
```
□ src/utils/tracking.ts (novo)
□ src/pages/Home.tsx (modificar)
□ src/App.tsx (modificar)
```

---

### 6. Vincular Pedidos a Afiliados
- [ ] Modificar `src/services/checkout.service.ts`
- [ ] Adicionar `referral_code` ao pedido
- [ ] Implementar `linkOrderToAffiliate()`
- [ ] Buscar N1, N2, N3
- [ ] Atualizar `affiliate_n1_id`, `affiliate_n2_id`, `affiliate_n3_id`
- [ ] Registrar em `referral_conversions`
- [ ] Testar criação de pedido
- [ ] Verificar vinculação

**Validação:**
```sql
SELECT 
  order_number,
  referral_code,
  affiliate_n1_id,
  affiliate_n2_id,
  affiliate_n3_id
FROM orders
WHERE referral_code IS NOT NULL;
-- Deve ter afiliados vinculados
```

---

## 🧪 TESTES (Amanhã - 2h)

### 7. Teste End-to-End Completo

#### Preparação
- [ ] Afiliado de teste: Beatriz (código conhecido)
- [ ] Produto de teste: Colchão Padrão
- [ ] Ambiente: Sandbox Asaas

#### Passo 1: Acesso com Referência
- [ ] Acessar: `https://slimquality.com.br?ref=[CODIGO_BEATRIZ]`
- [ ] Verificar localStorage
- [ ] Verificar click em `referral_clicks`

#### Passo 2: Criar Pedido
- [ ] Adicionar produto ao carrinho
- [ ] Preencher dados do cliente
- [ ] Finalizar compra
- [ ] Verificar pedido criado
- [ ] Verificar `referral_code` preenchido
- [ ] Verificar `affiliate_n1_id` = Beatriz
- [ ] Verificar conversão em `referral_conversions`

#### Passo 3: Pagamento
- [ ] Escolher método: PIX ou Cartão
- [ ] Realizar pagamento (sandbox)
- [ ] Aguardar confirmação (1-2 min)
- [ ] Verificar webhook recebido
- [ ] Verificar status = `paid`

#### Passo 4: Comissões
- [ ] Aguardar processamento (automático)
- [ ] Verificar comissões em `commissions`
- [ ] Verificar valores:
  - [ ] N1 = 15% (R$ 493,50 para R$ 3.290)
  - [ ] Renum = 7,5% (redistribuição)
  - [ ] JB = 7,5% (redistribuição)
  - [ ] Total = 30%
- [ ] Verificar split em `commission_splits`

#### Passo 5: Split Asaas
- [ ] Aguardar execução (automático)
- [ ] Verificar `asaas_split_id` preenchido
- [ ] Verificar status = `sent` ou `confirmed`
- [ ] Verificar logs em `commission_logs`
- [ ] Verificar saldo no Asaas (sandbox)

---

## 📊 VALIDAÇÕES FINAIS

### 8. Verificações de Integridade

#### Banco de Dados
- [ ] RLS ativo em todas tabelas críticas
- [ ] Todos afiliados com `referral_code`
- [ ] Todos afiliados com `wallet_id` válida
- [ ] Códigos únicos (sem duplicatas)
- [ ] Índices criados

**Query de Validação:**
```sql
-- Verificar RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('affiliates', 'commissions', 'orders');

-- Verificar códigos
SELECT COUNT(*) as total, COUNT(DISTINCT referral_code) as unicos
FROM affiliates;

-- Verificar wallets
SELECT COUNT(*) as total, COUNT(wallet_id) as com_wallet
FROM affiliates;
```

#### Código
- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Build sem erros
- [ ] Lint sem warnings
- [ ] TypeScript sem erros

**Comandos:**
```bash
npm run test
npm run build
npm run lint
```

#### Integrações
- [ ] Asaas API respondendo
- [ ] Webhook funcionando
- [ ] Edge Functions deployed
- [ ] Supabase conectado

---

## 📈 MÉTRICAS DE SUCESSO

### Mínimo Aceitável
- [ ] 0 afiliados sem código
- [ ] 0 afiliados sem wallet
- [ ] 1+ pedido com comissão gerada
- [ ] 1+ split executado com sucesso
- [ ] 0 erros críticos

### Ideal
- [ ] 5+ pedidos com comissões
- [ ] 3+ splits executados
- [ ] Taxa de sucesso > 95%
- [ ] Tempo de processamento < 5 min
- [ ] Dashboard funcionando

---

## 🎯 STATUS GERAL

### Progresso
```
Correções Urgentes:  [░░░░░░░░░░] 0/4  (0%)
Implementações:      [░░░░░░░░░░] 0/2  (0%)
Testes:              [░░░░░░░░░░] 0/1  (0%)
Validações:          [░░░░░░░░░░] 0/1  (0%)

TOTAL:               [░░░░░░░░░░] 0/8  (0%)
```

### Tempo Estimado
- ⏱️ Restante: 6-8 horas
- 📅 Conclusão: 11/01/2026

---

## 📝 NOTAS E OBSERVAÇÕES

### Problemas Encontrados
```
[Espaço para anotar problemas durante execução]

Data: ___/___/___
Problema: _________________________________
Solução: __________________________________
Status: [ ] Resolvido [ ] Pendente
```

### Decisões Tomadas
```
[Espaço para documentar decisões importantes]

Data: ___/___/___
Decisão: __________________________________
Motivo: ___________________________________
Aprovado por: _____________________________
```

---

## ✅ ASSINATURA DE CONCLUSÃO

Ao completar todos os itens acima, assinar abaixo:

**Desenvolvedor:**
- Nome: _______________________
- Data: ___/___/___
- Assinatura: _________________

**Revisor:**
- Nome: _______________________
- Data: ___/___/___
- Assinatura: _________________

**Aprovação Final:**
- Nome: Renato Carraro
- Data: ___/___/___
- Assinatura: _________________

---

**Sistema:** Slim Quality - Afiliados Multinível  
**Versão:** 1.0  
**Última Atualização:** 10/01/2026
