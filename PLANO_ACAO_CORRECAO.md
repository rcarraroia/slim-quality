# 📋 PLANO DE AÇÃO - CORREÇÃO DO SISTEMA DE AFILIADOS

**Data:** 10 de Janeiro de 2026  
**Responsável:** Renato Carraro + Kiro AI  
**Prazo:** 2 dias úteis  
**Status:** 🔴 URGENTE

---

## 🎯 OBJETIVO

Tornar o sistema de afiliados 100% funcional, permitindo que:
1. Afiliados recebam códigos de referência únicos
2. Vendas sejam rastreadas e vinculadas a afiliados
3. Comissões sejam calculadas automaticamente
4. Splits sejam executados no Asaas
5. Afiliados recebam pagamentos automaticamente

---

## 📊 SITUAÇÃO ATUAL

### ✅ O que está funcionando:
- Banco de dados estruturado (50 tabelas)
- Código de comissões implementado e testado
- Validação de wallets Asaas funcionando
- Frontend com interface completa
- 3 afiliados cadastrados (2 com wallet válida)

### ❌ O que NÃO está funcionando:
- Códigos de referência não gerados
- Tracking de origem não funcional
- Nenhum pedido vinculado a afiliados
- Nenhuma comissão calculada
- Nenhum split executado
- 1 afiliado sem wallet_id

---

## 🚀 PLANO DE EXECUÇÃO

### FASE 1: CORREÇÕES URGENTES (2 horas)

#### ✅ TAREFA 1.1: Ativar RLS em Commissions
**Tempo:** 5 minutos  
**Responsável:** Kiro AI  
**Prioridade:** 🔴 CRÍTICA (Segurança)

**Passos:**
1. Conectar ao Supabase via Power
2. Executar script SQL:
```sql
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates view own commissions"
  ON commissions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM affiliates WHERE id = affiliate_id
    )
  );
```
3. Verificar políticas criadas
4. Testar acesso com usuário afiliado

**Validação:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'commissions';
-- Deve retornar: rowsecurity = true
```

---

#### ✅ TAREFA 1.2: Gerar Códigos de Referência
**Tempo:** 15 minutos  
**Responsável:** Kiro AI  
**Prioridade:** 🔴 CRÍTICA

**Passos:**
1. Executar script de geração de códigos:
```sql
-- Gerar códigos únicos
UPDATE affiliates 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 6))
WHERE referral_code IS NULL;

-- Inserir em referral_codes
INSERT INTO referral_codes (affiliate_id, code, is_active)
SELECT id, referral_code, true
FROM affiliates
WHERE referral_code IS NOT NULL;
```

2. Criar função de geração automática
3. Criar trigger para novos afiliados
4. Verificar códigos gerados

**Validação:**
```sql
SELECT 
  a.name,
  a.referral_code,
  rc.code,
  rc.is_active
FROM affiliates a
LEFT JOIN referral_codes rc ON a.id = rc.affiliate_id;
-- Todos devem ter código
```

---

#### ✅ TAREFA 1.3: Solicitar Wallet ID Faltante
**Tempo:** 1 dia (aguardar resposta)  
**Responsável:** Renato Carraro  
**Prioridade:** 🔴 CRÍTICA

**Passos:**
1. Enviar email/WhatsApp para Maria Edurda Carraro (renusdev@gmail.com)
2. Solicitar Wallet ID do Asaas
3. Instruir como obter (painel Asaas > Configurações > Wallet ID)
4. Aguardar resposta

**Template de Mensagem:**
```
Olá Maria Edurda!

Para você receber suas comissões automaticamente, precisamos do seu Wallet ID do Asaas.

Como obter:
1. Acesse: https://www.asaas.com
2. Faça login na sua conta
3. Vá em: Configurações > Dados da Conta
4. Copie o "Wallet ID" (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
5. Envie para nós

Qualquer dúvida, estamos à disposição!

Att,
Equipe Slim Quality
```

**Após receber:**
```sql
-- Atualizar wallet_id
UPDATE affiliates
SET 
  wallet_id = '[WALLET_ID_RECEBIDA]',
  wallet_configured_at = NOW(),
  updated_at = NOW()
WHERE email = 'renusdev@gmail.com';

-- Validar wallet
-- (usar Edge Function validate-asaas-wallet)
```

---

#### ✅ TAREFA 1.4: Cadastrar Webhook no Asaas
**Tempo:** 15 minutos  
**Responsável:** Renato Carraro  
**Prioridade:** 🔴 CRÍTICA

**Passos:**
1. Acessar painel Asaas: https://www.asaas.com
2. Ir em: Configurações > Webhooks
3. Adicionar novo webhook:
   - **URL:** `https://api.slimquality.com.br/webhooks/asaas`
   - **Eventos:**
     - ✅ PAYMENT_CONFIRMED
     - ✅ PAYMENT_RECEIVED
     - ✅ PAYMENT_OVERDUE
     - ✅ PAYMENT_REFUNDED
4. Salvar e ativar
5. Testar com pagamento de teste

**Validação:**
- Fazer pagamento de teste (R$ 1,00)
- Verificar se webhook foi recebido:
```sql
SELECT * FROM asaas_webhook_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

---

### FASE 2: IMPLEMENTAR TRACKING (4 horas)

#### ✅ TAREFA 2.1: Implementar Tracking de Origem
**Tempo:** 2 horas  
**Responsável:** Kiro AI  
**Prioridade:** 🟡 ALTA

**Arquivos a modificar:**
1. `src/pages/Home.tsx` - Capturar ?ref= da URL
2. `src/utils/tracking.ts` - Salvar em localStorage
3. `src/services/checkout.service.ts` - Enviar ref no checkout

**Implementação:**

```typescript
// src/utils/tracking.ts
export class TrackingService {
  private static STORAGE_KEY = 'slim_ref_code';
  
  static captureReferralCode(): void {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    
    if (refCode) {
      localStorage.setItem(this.STORAGE_KEY, refCode);
      this.registerClick(refCode);
    }
  }
  
  static getReferralCode(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }
  
  static clearReferralCode(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
  
  private static async registerClick(refCode: string): Promise<void> {
    // Registrar click em referral_clicks
    await supabase.from('referral_clicks').insert({
      referral_code: refCode,
      affiliate_id: await this.getAffiliateIdByCode(refCode),
      ip_address: await this.getClientIP(),
      user_agent: navigator.userAgent,
      referer: document.referrer,
      clicked_at: new Date().toISOString()
    });
  }
}
```

**Validação:**
1. Acessar: `https://slimquality.com.br?ref=ABC123`
2. Verificar localStorage
3. Verificar registro em `referral_clicks`

---

#### ✅ TAREFA 2.2: Vincular Pedidos a Afiliados
**Tempo:** 2 horas  
**Responsável:** Kiro AI  
**Prioridade:** 🟡 ALTA

**Arquivos a modificar:**
1. `src/services/checkout.service.ts` - Incluir ref no pedido
2. `server/index.js` - Processar ref no backend

**Implementação:**

```typescript
// src/services/checkout.service.ts
async createOrder(orderData: OrderData): Promise<Order> {
  const refCode = TrackingService.getReferralCode();
  
  const order = await supabase.from('orders').insert({
    ...orderData,
    referral_code: refCode, // ⭐ ADICIONAR
    created_at: new Date().toISOString()
  }).select().single();
  
  // Se tem ref, buscar afiliado e vincular
  if (refCode) {
    await this.linkOrderToAffiliate(order.id, refCode);
  }
  
  return order;
}

private async linkOrderToAffiliate(orderId: string, refCode: string): Promise<void> {
  // Buscar afiliado pelo código
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, referred_by')
    .eq('referral_code', refCode)
    .single();
  
  if (!affiliate) return;
  
  // Buscar N2 e N3
  const n2 = affiliate.referred_by;
  let n3 = null;
  
  if (n2) {
    const { data: n2Data } = await supabase
      .from('affiliates')
      .select('referred_by')
      .eq('id', n2)
      .single();
    n3 = n2Data?.referred_by;
  }
  
  // Atualizar pedido
  await supabase.from('orders').update({
    affiliate_n1_id: affiliate.id,
    affiliate_n2_id: n2,
    affiliate_n3_id: n3,
    updated_at: new Date().toISOString()
  }).eq('id', orderId);
  
  // Registrar conversão
  await supabase.from('referral_conversions').insert({
    order_id: orderId,
    affiliate_id: affiliate.id,
    referral_code: refCode,
    order_value_cents: orderData.total_cents,
    status: 'pending',
    created_at: new Date().toISOString()
  });
}
```

**Validação:**
1. Criar pedido com ref code
2. Verificar `orders.affiliate_n1_id` preenchido
3. Verificar registro em `referral_conversions`

---

### FASE 3: TESTAR FLUXO COMPLETO (2 horas)

#### ✅ TAREFA 3.1: Teste End-to-End
**Tempo:** 2 horas  
**Responsável:** Renato + Kiro  
**Prioridade:** 🟡 ALTA

**Cenário de Teste:**

1. **Preparação:**
   - Afiliado: Beatriz (código: ABC123)
   - Produto: Colchão Padrão (R$ 3.290,00)

2. **Passo 1: Acesso com Referência**
   ```
   URL: https://slimquality.com.br?ref=ABC123
   Validar: localStorage tem ref code
   Validar: Click registrado em referral_clicks
   ```

3. **Passo 2: Criar Pedido**
   ```
   Ação: Adicionar produto ao carrinho
   Ação: Finalizar compra
   Validar: Pedido criado com referral_code
   Validar: affiliate_n1_id = Beatriz
   Validar: Conversão registrada
   ```

4. **Passo 3: Pagamento (Sandbox Asaas)**
   ```
   Ação: Pagar com PIX/Cartão de teste
   Aguardar: Webhook de confirmação
   Validar: Webhook recebido
   Validar: Status do pedido = paid
   ```

5. **Passo 4: Cálculo de Comissões**
   ```
   Aguardar: Processamento automático
   Validar: Comissões criadas em commissions
   Validar: Split criado em commission_splits
   Validar: Valores corretos (15% N1, 5% Renum, 5% JB)
   ```

6. **Passo 5: Split no Asaas**
   ```
   Aguardar: Execução do split
   Validar: asaas_split_id preenchido
   Validar: Status = sent/confirmed
   Validar: Logs em commission_logs
   ```

**Checklist de Validação:**
```
□ Click registrado
□ Pedido vinculado a afiliado
□ Conversão registrada
□ Webhook recebido
□ Comissões calculadas
□ Split executado
□ Valores corretos
□ Logs completos
```

---

### FASE 4: MONITORAMENTO E AJUSTES (1 dia)

#### ✅ TAREFA 4.1: Criar Dashboard de Monitoramento
**Tempo:** 4 horas  
**Responsável:** Kiro AI  
**Prioridade:** 🟢 MÉDIA

**Implementar:**
1. Página de admin com métricas
2. Alertas para erros
3. Relatório de comissões pendentes

**Métricas a monitorar:**
- Pedidos sem afiliado (deve ser 0)
- Comissões pendentes
- Splits falhados
- Webhooks não processados
- Afiliados sem wallet

---

## 📅 CRONOGRAMA

### Dia 1 (10/01/2026)
- ✅ 09:00 - 09:30: Tarefa 1.1 (RLS)
- ✅ 09:30 - 10:00: Tarefa 1.2 (Códigos)
- ✅ 10:00 - 10:15: Tarefa 1.4 (Webhook)
- ✅ 10:15 - 10:30: Tarefa 1.3 (Solicitar wallet)
- ⏳ 14:00 - 16:00: Tarefa 2.1 (Tracking)
- ⏳ 16:00 - 18:00: Tarefa 2.2 (Vincular pedidos)

### Dia 2 (11/01/2026)
- ⏳ 09:00 - 11:00: Tarefa 3.1 (Teste E2E)
- ⏳ 14:00 - 18:00: Tarefa 4.1 (Dashboard)
- ⏳ 18:00 - 19:00: Documentação final

---

## ✅ CRITÉRIOS DE SUCESSO

### Mínimo Aceitável:
- ✅ RLS ativo em commissions
- ✅ Todos afiliados com código de referência
- ✅ Todos afiliados com wallet_id válida
- ✅ Webhook Asaas funcionando
- ✅ 1 pedido completo com comissão gerada

### Ideal:
- ✅ Tracking funcionando 100%
- ✅ 5+ pedidos com comissões
- ✅ 3+ splits executados com sucesso
- ✅ Dashboard de monitoramento ativo
- ✅ Documentação atualizada

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Afiliado não responder com wallet_id
**Probabilidade:** Média  
**Impacto:** Alto  
**Mitigação:** 
- Enviar múltiplos lembretes
- Oferecer suporte para criar conta Asaas
- Temporariamente desativar afiliado

### Risco 2: Webhook Asaas não funcionar
**Probabilidade:** Baixa  
**Impacto:** Crítico  
**Mitigação:**
- Testar em sandbox primeiro
- Verificar logs do servidor
- Implementar retry automático

### Risco 3: Split falhar no Asaas
**Probabilidade:** Média  
**Impacto:** Alto  
**Mitigação:**
- Validar todas wallets antes
- Implementar tratamento de erro
- Criar fila de retry

---

## 📞 CONTATOS

**Suporte Técnico:**
- Kiro AI: Desenvolvimento e correções
- Renato Carraro: Gestão e testes

**Suporte Asaas:**
- Email: suporte@asaas.com
- Telefone: (11) 4950-2819
- Documentação: https://docs.asaas.com

---

## 📝 NOTAS FINAIS

Este plano de ação foi criado com base na auditoria completa realizada em 10/01/2026.

**Arquivos relacionados:**
- `RELATORIO_AUDITORIA_2026-01-10.md` - Relatório completo
- `SCRIPTS_CORRECAO_URGENTE.sql` - Scripts SQL
- Este arquivo - Plano de ação

**Próxima revisão:** 11/01/2026 após testes E2E

---

**Status:** 🔴 EM EXECUÇÃO  
**Última atualização:** 10/01/2026 23:00
