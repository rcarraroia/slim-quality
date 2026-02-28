# 🧪 VALIDAÇÃO MANUAL - REGRAS ESPECIAIS SHOW ROOM

**Data de Criação:** 28/02/2026  
**Fase:** 4 - Testes e Validação  
**Status:** READY TO TEST  

---

## 📋 INSTRUÇÕES GERAIS

Este documento contém os cenários de teste que devem ser executados **MANUALMENTE** para validar a implementação completa das Regras Especiais Show Room.

### Pré-requisitos:
- ✅ Fase 0, 1, 2 e 3 implementadas
- ✅ Produtos Show Room cadastrados no banco
- ✅ Logista de teste criado
- ✅ Acesso ao painel de afiliados
- ✅ Acesso ao Supabase para validar banco

---

## 🎯 CENÁRIO 1: PRIMEIRA COMPRA SHOW ROOM

### Objetivo:
Validar que logista consegue comprar produto Show Room pela primeira vez com frete grátis.

### Passos:

1. **Login como Logista**
   - [ ] Acessar `/entrar`
   - [ ] Fazer login com conta de logista de teste
   - [ ] Confirmar redirecionamento para `/afiliados/dashboard`

2. **Acessar Show Room**
   - [ ] Clicar em "Show Room" no menu
   - [ ] Verificar que produtos Show Room são exibidos
   - [ ] Verificar que botão "Comprar" está habilitado

3. **Adicionar ao Carrinho**
   - [ ] Clicar em "Comprar" no Colchão King Size
   - [ ] Verificar redirecionamento para checkout
   - [ ] Confirmar que produto está no carrinho

4. **Validar Checkout**
   - [ ] Verificar que **card de indicação NÃO aparece**
   - [ ] Verificar que **alert laranja** aparece explicando regras Show Room
   - [ ] Verificar que **frete está como "Grátis"**
   - [ ] Verificar que **badge "Show Room"** aparece no resumo

5. **Preencher Dados**
   - [ ] Preencher nome, email, telefone, CPF
   - [ ] Selecionar método de pagamento (PIX ou Cartão)
   - [ ] Preencher dados de endereço (se cartão)

6. **Finalizar Compra**
   - [ ] Clicar em "Finalizar Compra"
   - [ ] Verificar que pedido foi criado com sucesso
   - [ ] Anotar ID do pedido: `_______________`

7. **Validar no Banco (Supabase)**
   - [ ] Abrir Supabase Table Editor
   - [ ] Verificar tabela `orders`:
     - [ ] Pedido existe com ID anotado
     - [ ] Status: `pending` ou `paid`
   - [ ] Verificar tabela `show_room_purchases`:
     - [ ] Registro criado com `affiliate_id` e `product_id`
     - [ ] `purchased_at` preenchido
   - [ ] Verificar tabela `commissions`:
     - [ ] **Apenas 2 registros** (Renum e JB)
     - [ ] Valores: 5% cada
     - [ ] Metadata: `is_show_room: true`
     - [ ] **N1/N2/N3 NÃO têm registros**

### ✅ Critério de Sucesso:
- Compra realizada com sucesso
- Frete grátis aplicado
- Card de indicação oculto
- Apenas gestores receberam comissão
- Registro em `show_room_purchases` criado

---

## 🚫 CENÁRIO 2: TENTATIVA DE COMPRA DUPLICADA

### Objetivo:
Validar que logista NÃO consegue comprar o mesmo modelo duas vezes.

### Passos:

1. **Acessar Show Room Novamente**
   - [ ] Voltar para `/afiliados/dashboard/show-room`
   - [ ] Localizar o Colchão King Size (já comprado)

2. **Validar Frontend**
   - [ ] Verificar que botão "Comprar" está **DESABILITADO**
   - [ ] Verificar que **badge "Já adquirido"** aparece (verde com CheckCircle)
   - [ ] Passar mouse sobre o botão
   - [ ] Verificar que **tooltip explicativo** aparece

3. **Tentar Burlar via API (Teste de Segurança)**
   - [ ] Abrir DevTools (F12)
   - [ ] Ir para aba Network
   - [ ] Tentar fazer requisição POST para `/api/checkout`
   - [ ] Payload: mesmo produto Show Room
   - [ ] Verificar resposta: **400 Bad Request**
   - [ ] Verificar mensagem de erro: "Você já comprou o modelo..."

4. **Validar no Banco**
   - [ ] Verificar tabela `show_room_purchases`
   - [ ] Confirmar que **apenas 1 registro** existe para este produto + logista
   - [ ] Verificar constraint `unique_affiliate_product` está ativo

### ✅ Critério de Sucesso:
- Botão desabilitado no frontend
- Badge "Já adquirido" visível
- API retorna erro 400
- Impossível comprar duplicado

---

## 🛒 CENÁRIO 3: COMPRA DE MÚLTIPLOS MODELOS

### Objetivo:
Validar que logista pode comprar 1 unidade de CADA modelo Show Room.

### Passos:

1. **Comprar Colchão Queen**
   - [ ] Acessar Show Room
   - [ ] Clicar em "Comprar" no Colchão Queen
   - [ ] Finalizar compra
   - [ ] Anotar ID do pedido: `_______________`

2. **Comprar Colchão Padrão**
   - [ ] Acessar Show Room
   - [ ] Clicar em "Comprar" no Colchão Padrão
   - [ ] Finalizar compra
   - [ ] Anotar ID do pedido: `_______________`

3. **Comprar Colchão Solteiro**
   - [ ] Acessar Show Room
   - [ ] Clicar em "Comprar" no Colchão Solteiro
   - [ ] Finalizar compra
   - [ ] Anotar ID do pedido: `_______________`

4. **Validar no Banco**
   - [ ] Verificar tabela `show_room_purchases`
   - [ ] Confirmar **4 registros** (King + Queen + Padrão + Solteiro)
   - [ ] Todos com mesmo `affiliate_id`
   - [ ] Cada um com `product_id` diferente
   - [ ] Verificar tabela `commissions`
   - [ ] Confirmar **8 registros** (2 por pedido: Renum + JB)
   - [ ] Todos com `is_show_room: true`

5. **Validar Show Room**
   - [ ] Voltar para `/afiliados/dashboard/show-room`
   - [ ] Verificar que **todos os 4 produtos** têm badge "Já adquirido"
   - [ ] Verificar que **todos os 4 botões** estão desabilitados

### ✅ Critério de Sucesso:
- 4 compras realizadas com sucesso
- 4 registros em `show_room_purchases`
- 8 comissões criadas (apenas gestores)
- Todos os produtos marcados como "Já adquirido"

---

## 💰 CENÁRIO 4: VALIDAÇÃO DE COMISSÕES

### Objetivo:
Validar que comissões Show Room são calculadas corretamente (apenas gestores).

### Passos:

1. **Buscar Pedido Show Room**
   - [ ] Abrir Supabase Table Editor
   - [ ] Tabela `orders`
   - [ ] Filtrar por ID do pedido anotado no Cenário 1
   - [ ] Anotar `total_cents`: `_______________`

2. **Calcular Valores Esperados**
   - [ ] Total do pedido: R$ `_______________`
   - [ ] 5% Renum: R$ `_______________`
   - [ ] 5% JB: R$ `_______________`
   - [ ] Total comissões: R$ `_______________` (10% do total)

3. **Validar Tabela `commissions`**
   - [ ] Filtrar por `order_id` do pedido
   - [ ] Verificar **exatamente 2 registros**
   - [ ] Registro 1:
     - [ ] `affiliate_id`: Renum
     - [ ] `amount_cents`: valor calculado acima
     - [ ] `percentage`: 5
     - [ ] `metadata.is_show_room`: true
   - [ ] Registro 2:
     - [ ] `affiliate_id`: JB
     - [ ] `amount_cents`: valor calculado acima
     - [ ] `percentage`: 5
     - [ ] `metadata.is_show_room`: true

4. **Validar Ausência de N1/N2/N3**
   - [ ] Buscar na tabela `commissions`
   - [ ] Filtrar por `order_id`
   - [ ] Confirmar que **NÃO existem** registros para N1/N2/N3
   - [ ] Apenas Renum e JB

### ✅ Critério de Sucesso:
- Apenas 2 comissões criadas
- Valores corretos (5% cada)
- Metadata `is_show_room: true`
- N1/N2/N3 não receberam nada

---

## 🔄 CENÁRIO 5: TESTES DE REGRESSÃO (PRODUTOS NORMAIS)

### Objetivo:
Validar que produtos normais NÃO foram afetados pelas mudanças.

### Passos:

1. **Criar Pedido de Produto Normal**
   - [ ] Logout do painel de afiliados
   - [ ] Acessar site público
   - [ ] Adicionar Colchão Padrão (produto normal) ao carrinho
   - [ ] Usar código de indicação de afiliado de teste
   - [ ] Finalizar compra
   - [ ] Anotar ID do pedido: `_______________`

2. **Validar Checkout de Produto Normal**
   - [ ] Verificar que **card de indicação APARECE**
   - [ ] Verificar que **frete é calculado normalmente** (não grátis)
   - [ ] Verificar que **badge "Show Room" NÃO aparece**
   - [ ] Verificar que **alert laranja NÃO aparece**

3. **Validar Comissões de Produto Normal**
   - [ ] Abrir Supabase Table Editor
   - [ ] Tabela `commissions`
   - [ ] Filtrar por `order_id` do pedido normal
   - [ ] Verificar que **comissões normais** foram criadas:
     - [ ] N1: 15%
     - [ ] N2: 3% (se houver)
     - [ ] N3: 2% (se houver)
     - [ ] Renum: 5% (ou redistribuição)
     - [ ] JB: 5% (ou redistribuição)
   - [ ] Verificar que `metadata.is_show_room` **NÃO existe** ou é `false`

4. **Validar Tabela `show_room_purchases`**
   - [ ] Buscar por `order_id` do pedido normal
   - [ ] Confirmar que **NÃO existe registro**
   - [ ] Apenas pedidos Show Room devem estar nesta tabela

### ✅ Critério de Sucesso:
- Produtos normais funcionam como antes
- Comissões normais (30% split)
- Card de indicação visível
- Frete calculado normalmente
- N1/N2/N3 recebem comissões

---

## 📊 RESUMO DE VALIDAÇÃO

### Checklist Final:

**Funcionalidades Show Room:**
- [ ] Logista pode comprar 1 unidade de cada modelo
- [ ] Logista não pode comprar o mesmo modelo duas vezes
- [ ] Frete grátis aplicado automaticamente
- [ ] Card de indicação oculto
- [ ] Badge "Show Room" visível
- [ ] Alert laranja explicativo presente

**Comissões Show Room:**
- [ ] Apenas Renum e JB recebem (5% cada)
- [ ] N1/N2/N3 não recebem nada
- [ ] Metadata `is_show_room: true`
- [ ] Total de comissões = 10% (não 30%)

**Segurança:**
- [ ] Constraint UNIQUE impede duplicação
- [ ] Validação frontend (botão desabilitado)
- [ ] Validação backend (erro 400)
- [ ] RLS funcionando corretamente

**Regressão:**
- [ ] Produtos normais não afetados
- [ ] Comissões normais funcionando
- [ ] Card de indicação visível para normais
- [ ] Frete calculado para normais

---

## 🐛 PROBLEMAS ENCONTRADOS

**Registre aqui qualquer problema encontrado durante os testes:**

### Problema 1:
- **Descrição:** 
- **Cenário:** 
- **Severidade:** (Crítico/Alto/Médio/Baixo)
- **Status:** (Aberto/Resolvido)

### Problema 2:
- **Descrição:** 
- **Cenário:** 
- **Severidade:** 
- **Status:** 

---

## ✅ APROVAÇÃO FINAL

**Testado por:** _______________  
**Data:** _______________  
**Status:** [ ] APROVADO [ ] REPROVADO  

**Observações:**
_____________________________________________
_____________________________________________
_____________________________________________

---

**Documento criado em:** 28/02/2026  
**Última atualização:** 28/02/2026  
**Status:** READY TO TEST
