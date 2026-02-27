# 🎯 TASK: IMPLEMENTAÇÃO DE REGRAS ESPECIAIS SHOW ROOM

**Data de Criação:** 27/02/2026  
**Prioridade:** ALTA  
**Status:** IN PROGRESS - Fase 0 Concluída ✅  
**Estimativa:** 8-10 horas  

**Documento de Análise:** `.kiro/analise-show-room-regras-especiais.md`

---

## 📋 RESUMO EXECUTIVO

Implementar regras especiais para produtos da categoria `show_row`:

1. **Controle de Compras:** Cada logista pode comprar apenas 1 unidade de CADA modelo (sem reposição)
2. **Comissionamento:** 90% Fábrica + 5% Renum + 5% JB (sem comissão para N1/N2/N3)
3. **Frete:** Grátis para todos os produtos Show Room
4. **UI/UX:** Ocultar card "Compra via indicação" no checkout

---

## 🎯 OBJETIVOS

### Objetivo Principal
Permitir que logistas comprem produtos Show Room com regras diferenciadas de estoque, comissionamento e frete.

### Objetivos Específicos
- ✅ Impedir compra duplicada do mesmo modelo por logista
- ✅ Calcular comissões diferenciadas (apenas gestores)
- ✅ Aplicar frete grátis automaticamente
- ✅ Melhorar UX ocultando informações irrelevantes

---

## 📊 CONTEXTO

### Situação Atual
- ✅ Categoria `show_row` já existe no ENUM `product_category`
- ✅ Sistema de estoque (`inventory_logs`) já funciona
- ✅ Sistema de comissões é extensível
- ✅ RLS já implementado (apenas logistas veem Show Room)
- ✅ Produtos Show Room já cadastrados com preços

### Problema
- ❌ Não há controle de compras por logista
- ❌ Comissionamento usa regras padrão (30% split)
- ❌ Frete é calculado normalmente
- ❌ Card de indicação aparece (confunde logista)

### Solução Proposta
Implementar 5 fases de desenvolvimento conforme análise detalhada.

---

## 🏗️ ARQUITETURA DA SOLUÇÃO

### Nova Tabela: `show_room_purchases`
```sql
CREATE TABLE show_room_purchases (
  id UUID PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id),
  product_id UUID REFERENCES products(id),
  order_id UUID REFERENCES orders(id),
  purchased_at TIMESTAMPTZ,
  UNIQUE(affiliate_id, product_id)
);
```

### Fluxo de Compra Show Room
```
1. Logista acessa Show Room
   └─ Verificar se já comprou cada produto
   └─ Desabilitar botão "Comprar" se já comprou

2. Logista adiciona ao carrinho
   └─ Validar no backend se já comprou
   └─ Limitar quantidade a 1

3. Checkout
   └─ Ocultar card "Compra via indicação"
   └─ Mostrar "Frete Grátis"
   └─ Zerar valor do frete

4. Pagamento confirmado (Webhook)
   └─ Registrar compra em show_room_purchases
   └─ Calcular comissões diferenciadas
   └─ Apenas Renum (5%) e JB (5%)
   └─ Fábrica recebe 90%
```

---

## 📋 TAREFAS DETALHADAS

### FASE 0: PREPARAÇÃO DO BANCO (30 min) ✅ CONCLUÍDA

#### Task 0.1: Criar Migration `show_room_purchases` ✅
**Arquivo:** `supabase/migrations/20260227120000_create_show_room_purchases.sql`

**Checklist:**
- [x] Criar tabela `show_room_purchases`
- [x] Adicionar constraint UNIQUE(affiliate_id, product_id)
- [x] Criar índices (affiliate_id, product_id)
- [x] Habilitar RLS
- [x] Criar política "Logistas can view own purchases"
- [x] Criar política "System can insert purchases"
- [x] Adicionar comentários na tabela

**Critério de Aceitação:**
- ✅ Tabela criada no Supabase
- ✅ Políticas RLS funcionando (4 políticas criadas)
- ✅ Índices criados (5 índices + 1 UNIQUE constraint)

**Validações Realizadas:**
- ✅ Tabela `show_room_purchases` existe
- ✅ Constraint `unique_affiliate_product` criado
- ✅ 7 índices criados (incluindo PK e UNIQUE)
- ✅ 4 políticas RLS ativas:
  - Logistas can view own purchases
  - Admins can view all purchases
  - System can insert purchases
  - Admins can delete purchases

**Arquivo de Referência:** `.kiro/analise-show-room-regras-especiais.md` (seção "Nova Migration Necessária")

---

### FASE 1: CONTROLE DE COMPRAS POR LOGISTA (3-4h)

#### Task 1.1: Validação no Frontend - ShowRow.tsx
**Arquivo:** `src/pages/afiliados/dashboard/ShowRow.tsx`

**Checklist:**
- [ ] Criar função `checkIfAlreadyPurchased(productId)`
- [ ] Buscar compras do logista em `show_room_purchases`
- [ ] Desabilitar botão "Comprar" se já comprou
- [ ] Adicionar badge "Já adquirido" se já comprou
- [ ] Adicionar tooltip explicativo
- [ ] Testar com produtos já comprados

**Critério de Aceitação:**
- Botão desabilitado se já comprou
- Badge "Já adquirido" visível
- Tooltip explicativo presente

**Código de Referência:**
```typescript
const checkIfAlreadyPurchased = async (productId: string) => {
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const { data: purchase } = await supabase
    .from('show_room_purchases')
    .select('id')
    .eq('affiliate_id', affiliate.id)
    .eq('product_id', productId)
    .single();

  return !!purchase;
};
```

#### Task 1.2: Validação no Backend - checkout.js
**Arquivo:** `api/checkout.js` (action: `create-order`)

**Checklist:**
- [ ] Detectar se produto é categoria `show_row`
- [ ] Buscar afiliado do usuário
- [ ] Verificar se já comprou em `show_room_purchases`
- [ ] Retornar erro 400 se já comprou
- [ ] Limitar quantidade a 1
- [ ] Adicionar logs de validação

**Critério de Aceitação:**
- Retorna erro 400 se já comprou
- Retorna erro 400 se quantidade > 1
- Logs registrados corretamente

**Código de Referência:**
```javascript
if (product.category === 'show_row') {
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', userId)
    .single();

  const { data: existingPurchase } = await supabase
    .from('show_room_purchases')
    .select('id')
    .eq('affiliate_id', affiliate.id)
    .eq('product_id', productId)
    .single();

  if (existingPurchase) {
    return res.status(400).json({ 
      error: 'Você já comprou este modelo Show Room' 
    });
  }

  if (quantity > 1) {
    return res.status(400).json({ 
      error: 'Apenas 1 unidade disponível por logista' 
    });
  }
}
```

#### Task 1.3: Registro de Compra no Webhook
**Arquivo:** `api/webhook-asaas.js`

**Checklist:**
- [ ] Detectar produtos Show Room no pedido
- [ ] Buscar afiliado do pedido
- [ ] Inserir registro em `show_room_purchases`
- [ ] Adicionar logs de registro
- [ ] Tratar erros de duplicação

**Critério de Aceitação:**
- Compra registrada quando pagamento confirmado
- Logs registrados corretamente
- Erros tratados adequadamente

**Código de Referência:**
```javascript
if (orderStatus === 'paid') {
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, products(category)')
    .eq('order_id', orderId);

  for (const item of orderItems) {
    if (item.products.category === 'show_row') {
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('id', orderId)
        .single();

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', order.customer_id)
        .single();

      await supabase
        .from('show_room_purchases')
        .insert({
          affiliate_id: affiliate.id,
          product_id: item.product_id,
          order_id: orderId
        });

      console.log(`✅ Compra Show Room registrada`);
    }
  }
}
```

---

### FASE 2: COMISSIONAMENTO DIFERENCIADO (3-4h)

#### Task 2.1: Atualizar Função `processCommissions()`
**Arquivo:** `api/webhook-asaas.js`

**Checklist:**
- [ ] Detectar produtos Show Room no pedido
- [ ] Adicionar flag `isShowRoom`
- [ ] Calcular 90% fábrica (não 70%)
- [ ] Calcular 5% Renum + 5% JB (não redistribuição)
- [ ] NÃO calcular comissões para N1/N2/N3
- [ ] Adicionar metadata `is_show_room: true`
- [ ] Inserir comissões apenas para gestores
- [ ] Inserir split consolidado
- [ ] Adicionar logs detalhados

**Critério de Aceitação:**
- Comissões calculadas corretamente (10% total)
- Apenas Renum e JB recebem
- N1/N2/N3 não recebem nada
- Fábrica recebe 90%
- Logs registrados

**Código de Referência:** Ver `.kiro/analise-show-room-regras-especiais.md` (seção "2.1 Atualizar Função processCommissions()")

#### Task 2.2: Atualizar Função SQL `calculate_commission_split()`
**Arquivo:** `supabase/migrations/[timestamp]_update_split_show_room.sql`

**Checklist:**
- [ ] Adicionar variável `v_is_show_room BOOLEAN`
- [ ] Detectar categoria `show_row`
- [ ] Adicionar bloco IF para Show Room
- [ ] Calcular 90% fábrica + 5% Renum + 5% JB
- [ ] Zerar valores de N1/N2/N3
- [ ] Adicionar metadata no split
- [ ] Testar função SQL

**Critério de Aceitação:**
- Função SQL atualizada
- Lógica Show Room funcionando
- Testes passando

**Código de Referência:** Ver `.kiro/analise-show-room-regras-especiais.md` (seção "2.2 Atualizar Função SQL")

---

### FASE 3: FRETE GRÁTIS E UI/UX (2h)

#### Task 3.1: Implementar Frete Grátis
**Arquivo:** `api/checkout.js` ou componente de cálculo de frete

**Checklist:**
- [ ] Detectar produtos Show Room no carrinho
- [ ] Zerar valor do frete se for Show Room
- [ ] Adicionar flag `free_shipping: true` no pedido
- [ ] Adicionar logs de frete grátis

**Critério de Aceitação:**
- Frete zerado para Show Room
- Flag registrada no pedido
- Logs registrados

#### Task 3.2: Ocultar Card "Compra via Indicação"
**Arquivo:** `src/components/checkout/AffiliateAwareCheckout.tsx` (ou similar)

**Checklist:**
- [ ] Detectar produtos Show Room no carrinho
- [ ] Criar flag `hasShowRoomProducts`
- [ ] Ocultar card se `hasShowRoomProducts === true`
- [ ] Adicionar nota explicativa
- [ ] Testar renderização condicional

**Critério de Aceitação:**
- Card oculto quando tem Show Room
- Nota explicativa visível
- Card visível quando não tem Show Room

**Código de Referência:**
```typescript
const hasShowRoomProducts = cartItems.some(item => 
  item.product?.category === 'show_row'
);

{!hasShowRoomProducts && referralCode && (
  <Card>
    {/* Card "Compra via indicação" */}
  </Card>
)}

{hasShowRoomProducts && (
  <div className="text-xs text-muted-foreground italic">
    * Produtos Show Room não geram comissão para rede de afiliados
  </div>
)}
```

#### Task 3.3: Adicionar Badges Visuais
**Arquivo:** Componentes de checkout e lista de produtos

**Checklist:**
- [ ] Badge "Frete Grátis" no checkout
- [ ] Badge "Já adquirido" na lista de produtos
- [ ] Ícones apropriados (Truck, CheckCircle)
- [ ] Cores consistentes com design system

**Critério de Aceitação:**
- Badges visíveis e estilizados
- Ícones corretos
- Cores do design system

---

### FASE 4: TESTES E VALIDAÇÃO (2h)

#### Task 4.1: Testes de Fluxo Completo

**Cenário 1: Primeira Compra Show Room**
- [ ] Logista acessa Show Room
- [ ] Vê produtos disponíveis
- [ ] Adiciona Colchão King ao carrinho
- [ ] Checkout mostra "Frete Grátis"
- [ ] Card de indicação está oculto
- [ ] Finaliza compra
- [ ] Pagamento confirmado
- [ ] Compra registrada em `show_room_purchases`
- [ ] Comissões calculadas (apenas Renum e JB)
- [ ] Fábrica recebeu 90%

**Cenário 2: Tentativa de Compra Duplicada**
- [ ] Logista tenta comprar King novamente
- [ ] Botão "Comprar" está desabilitado
- [ ] Badge "Já adquirido" visível
- [ ] Tooltip explicativo presente
- [ ] Tentativa via API retorna erro 400

**Cenário 3: Compra de Múltiplos Modelos**
- [ ] Logista compra King (sucesso)
- [ ] Logista compra Queen (sucesso)
- [ ] Logista compra Padrão (sucesso)
- [ ] Logista compra Solteiro (sucesso)
- [ ] Todas as compras registradas
- [ ] Comissões calculadas corretamente

**Cenário 4: Validação de Comissões**
- [ ] Verificar tabela `commissions`
- [ ] Apenas 2 registros (Renum e JB)
- [ ] Valores corretos (5% cada)
- [ ] N1/N2/N3 não têm registros
- [ ] Metadata `is_show_room: true`

#### Task 4.2: Testes de Regressão

**Validar que produtos normais não foram afetados:**
- [ ] Compra de colchão normal funciona
- [ ] Comissões normais (30% split)
- [ ] Frete calculado normalmente
- [ ] Card de indicação visível
- [ ] N1/N2/N3 recebem comissões

---

### FASE 5: DOCUMENTAÇÃO (30 min)

#### Task 5.1: Atualizar Documentação do Projeto

**Checklist:**
- [ ] Atualizar `.kiro/steering/product.md` com regras Show Room
- [ ] Documentar tabela `show_room_purchases` em `structure.md`
- [ ] Atualizar STATUS.md com implementação
- [ ] Adicionar exemplos de cálculo de comissões
- [ ] Documentar diferenças de frete

**Critério de Aceitação:**
- Documentação completa e atualizada
- Exemplos práticos incluídos
- Fácil de entender para novos desenvolvedores

---

## 🎯 CRITÉRIOS DE ACEITAÇÃO GERAIS

### Funcionalidades
- ✅ Logista pode comprar 1 unidade de cada modelo Show Room
- ✅ Logista não pode comprar o mesmo modelo duas vezes
- ✅ Comissões calculadas corretamente (90% + 5% + 5%)
- ✅ Frete grátis aplicado automaticamente
- ✅ Card de indicação oculto no checkout

### Qualidade
- ✅ Zero erros no getDiagnostics
- ✅ Código comentado e documentado
- ✅ Logs adequados para debugging
- ✅ Tratamento de erros robusto

### Performance
- ✅ Queries otimizadas (índices criados)
- ✅ Validações eficientes
- ✅ Sem impacto em produtos normais

### Segurança
- ✅ RLS configurado corretamente
- ✅ Validações no frontend E backend
- ✅ Impossível burlar limite de compras

---

## 📊 MÉTRICAS DE SUCESSO

### Técnicas
- Zero erros de TypeScript/ESLint
- Cobertura de testes > 80%
- Tempo de resposta < 500ms

### Negócio
- Logistas conseguem comprar Show Room
- Comissões calculadas corretamente
- Frete grátis aplicado
- UX clara e sem confusão

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Compra duplicada por race condition
**Probabilidade:** BAIXA  
**Impacto:** MÉDIO  
**Mitigação:** Constraint UNIQUE no banco + validação dupla (frontend + backend)

### Risco 2: Comissões calculadas erradas
**Probabilidade:** BAIXA  
**Impacto:** ALTO  
**Mitigação:** Testes extensivos + logs detalhados + validação manual

### Risco 3: Impacto em produtos normais
**Probabilidade:** BAIXA  
**Impacto:** ALTO  
**Mitigação:** Código isolado + testes de regressão

---

## 📝 NOTAS DE IMPLEMENTAÇÃO

### Ordem de Implementação Recomendada
1. Fase 0 (Banco) - Base para tudo
2. Fase 1 (Controle) - Funcionalidade core
3. Fase 2 (Comissões) - Regra de negócio
4. Fase 3 (UI/UX) - Melhorias visuais
5. Fase 4 (Testes) - Validação completa
6. Fase 5 (Docs) - Finalização

### Pontos de Atenção
- ⚠️ Testar com dados reais de logistas
- ⚠️ Validar cálculos de comissão manualmente
- ⚠️ Verificar que RLS está funcionando
- ⚠️ Confirmar que frete está zerado

### Dependências
- ✅ Categoria `show_row` já existe
- ✅ Sistema de estoque já funciona
- ✅ Sistema de comissões extensível
- ✅ RLS já implementado

---

## 🔗 REFERÊNCIAS

- **Análise Completa:** `.kiro/analise-show-room-regras-especiais.md`
- **Documentação de Produto:** `.kiro/steering/product.md`
- **Estrutura do Sistema:** `.kiro/steering/structure.md`
- **Webhook Asaas:** `api/webhook-asaas.js`
- **Migration de Produtos:** `supabase/migrations/20250124000000_products_system.sql`

---

## ✅ CHECKLIST FINAL

Antes de marcar como CONCLUÍDO:

- [ ] Todas as 5 fases implementadas
- [ ] Todos os testes passando
- [ ] getDiagnostics sem erros
- [ ] Documentação atualizada
- [ ] Aprovação do usuário (Renato)
- [ ] Deploy em produção
- [ ] Validação em produção

---

**STATUS:** READY TO START  
**PRÓXIMO PASSO:** Iniciar Fase 0 (Preparação do Banco)  
**RESPONSÁVEL:** Kiro AI  
**APROVADOR:** Renato Carraro
