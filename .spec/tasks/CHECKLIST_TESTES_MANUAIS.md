# ✅ CHECKLIST DE TESTES MANUAIS - SISTEMA DE ASSINATURAS

**Data:** 03/03/2026  
**Versão:** 1.0  
**Responsável:** Renato Carraro

---

## 📋 ÍNDICE

1. [Modelo de 3 Planos - Vitrine + Agente IA](#1-modelo-de-3-planos---vitrine--agente-ia)
2. [Gerenciamento de Assinaturas](#2-gerenciamento-de-assinaturas)
3. [Testes de Regressão](#3-testes-de-regressão)
4. [Validações de Segurança](#4-validações-de-segurança)

---

## 1. MODELO DE 3 PLANOS - VITRINE + AGENTE IA

### 1.1. Cadastro de Novos Afiliados

#### 🔹 Afiliado Individual BÁSICO (sem mensalidade)

**Cenário:** Cadastro de afiliado individual que NÃO quer pagar mensalidade

**Passos:**
1. [ ] Acessar página de cadastro `/cadastro`
2. [ ] Preencher dados pessoais
3. [ ] Selecionar tipo: "Individual"
4. [ ] **NÃO marcar** checkbox "Quero ter vitrine e agente IA (R$ 69/mês)"
5. [ ] Selecionar produto de adesão: "Adesão Individual - Renum" (R$ 500,00)
6. [ ] Finalizar cadastro

**Validações:**
- [ ] Checkbox de assinatura visível e desmarcada por padrão
- [ ] Produto "Adesão Individual - Renum" (R$ 500,00) selecionável
- [ ] Pagamento criado com valor correto (R$ 500,00)
- [ ] Após pagamento confirmado:
  - [ ] Campo `has_subscription` = `false` no banco
  - [ ] Campo `payment_status` = `active` no banco
  - [ ] Menu "Loja" NÃO aparece no painel
  - [ ] Menu "Show Room" NÃO aparece no painel
  - [ ] Menu "Assinatura" aparece (se produtos ativos)

---

#### 🔹 Afiliado Individual PREMIUM (com mensalidade)

**Cenário:** Cadastro de afiliado individual que QUER pagar mensalidade

**Passos:**
1. [ ] Acessar página de cadastro `/cadastro`
2. [ ] Preencher dados pessoais
3. [ ] Selecionar tipo: "Individual"
4. [ ] **MARCAR** checkbox "Quero ter vitrine e agente IA (R$ 69/mês)"
5. [ ] Selecionar produto de adesão: "Adesão Individual Premium - Renum" (R$ 500,00 + R$ 69/mês)
6. [ ] Finalizar cadastro

**Validações:**
- [ ] Checkbox de assinatura visível e marcável
- [ ] Produto "Adesão Individual Premium - Renum" selecionável
- [ ] Pagamento criado com valor correto (R$ 500,00 + R$ 69/mês)
- [ ] Após pagamento confirmado:
  - [ ] Campo `has_subscription` = `true` no banco
  - [ ] Campo `payment_status` = `active` no banco
  - [ ] Menu "Loja" APARECE no painel ✅
  - [ ] Menu "Show Room" NÃO aparece no painel
  - [ ] Menu "Assinatura" aparece (se produtos ativos)
  - [ ] Vitrine criada em `store_profiles` com `is_visible_in_showcase` = `true`
  - [ ] Tenant criado em `multi_agent_tenants` com `status` = `active`
  - [ ] 2 registros em `affiliate_services` (vitrine + agente)

---

#### 🔹 Afiliado Logista (sempre com mensalidade)

**Cenário:** Cadastro de afiliado logista (CNPJ obrigatório)

**Passos:**
1. [ ] Acessar página de cadastro `/cadastro`
2. [ ] Preencher dados pessoais
3. [ ] Selecionar tipo: "Logista"
4. [ ] Preencher CNPJ válido
5. [ ] Selecionar produto de adesão: "Adesão Logista - Renum" (R$ 500,00 + R$ 69/mês)
6. [ ] Finalizar cadastro

**Validações:**
- [ ] Checkbox de assinatura NÃO aparece (logista sempre tem)
- [ ] Campo CNPJ obrigatório e validado
- [ ] Produto "Adesão Logista - Renum" selecionável
- [ ] Pagamento criado com valor correto (R$ 500,00 + R$ 69/mês)
- [ ] Após pagamento confirmado:
  - [ ] Campo `has_subscription` = `true` no banco
  - [ ] Campo `payment_status` = `active` no banco
  - [ ] Menu "Loja" APARECE no painel ✅
  - [ ] Menu "Show Room" APARECE no painel ✅
  - [ ] Menu "Assinatura" aparece (se produtos ativos)
  - [ ] Vitrine criada em `store_profiles` com `is_visible_in_showcase` = `true`
  - [ ] Tenant criado em `multi_agent_tenants` com `status` = `active`
  - [ ] 2 registros em `affiliate_services` (vitrine + agente)

---

### 1.2. Validação de Menus no Painel

#### 🔹 Menu "Loja" (Vitrine)

**Regra:** Aparece para afiliados com `has_subscription = true` (individuais premium + logistas)

**Testes:**
1. [ ] **Individual Básico:** Menu "Loja" NÃO aparece
2. [ ] **Individual Premium:** Menu "Loja" APARECE
3. [ ] **Logista:** Menu "Loja" APARECE
4. [ ] Clicar no menu "Loja" abre página de configuração da vitrine
5. [ ] Badge correto exibido:
   - [ ] "Afiliado Individual" (variant secondary) para individuais
   - [ ] "Logista" (variant default) para logistas

---

#### 🔹 Menu "Show Room"

**Regra:** Aparece APENAS para logistas (independente de `has_subscription`)

**Testes:**
1. [ ] **Individual Básico:** Menu "Show Room" NÃO aparece
2. [ ] **Individual Premium:** Menu "Show Room" NÃO aparece
3. [ ] **Logista:** Menu "Show Room" APARECE
4. [ ] Clicar no menu "Show Room" abre página de produtos Show Room

---

#### 🔹 Menu "Assinatura"

**Regra:** Aparece para TODOS os afiliados quando produtos de assinatura estão ativos

**Testes:**
1. [ ] **Individual Básico:** Menu "Assinatura" APARECE (se produtos ativos)
2. [ ] **Individual Premium:** Menu "Assinatura" APARECE (se produtos ativos)
3. [ ] **Logista:** Menu "Assinatura" APARECE (se produtos ativos)
4. [ ] Clicar no menu "Assinatura" abre página de gerenciamento
5. [ ] Ícone Sparkles exibido corretamente

---

### 1.3. Validação de Produtos no Painel "Loja"

**Regra:** Query filtra produtos por `eligible_affiliate_type`

**Testes:**

#### 🔹 Individual Premium (has_subscription = true)
1. [ ] Acessar painel "Loja"
2. [ ] Produtos exibidos:
   - [ ] Produtos com `eligible_affiliate_type = 'individual'`
   - [ ] Produtos com `eligible_affiliate_type = 'both'`
   - [ ] Produtos com `eligible_affiliate_type = 'logista'` NÃO aparecem

#### 🔹 Logista (has_subscription = true)
1. [ ] Acessar painel "Loja"
2. [ ] Produtos exibidos:
   - [ ] Produtos com `eligible_affiliate_type = 'logista'`
   - [ ] Produtos com `eligible_affiliate_type = 'both'`
   - [ ] Produtos com `eligible_affiliate_type = 'individual'` NÃO aparecem

---

### 1.4. Validação de Inadimplência (Webhook)

**Cenário:** Mensalidade vence e não é paga

**Passos:**
1. [ ] Simular vencimento de mensalidade (via Asaas Sandbox ou banco)
2. [ ] Webhook recebe evento `PAYMENT_OVERDUE`
3. [ ] Edge function `process-affiliate-webhooks` processa evento

**Validações:**
- [ ] Campo `payment_status` atualizado para `overdue` no banco
- [ ] Vitrine desativada: `is_visible_in_showcase` = `false`
- [ ] Agente IA desativado: `status` = `inactive` em `multi_agent_tenants`
- [ ] Notificação criada em `notifications` (tipo: overdue)
- [ ] Email enviado ao afiliado (se configurado)
- [ ] Menu "Loja" continua visível (mas vitrine desativada)
- [ ] Banner de inadimplência aparece no painel

---

### 1.5. Validação de Regularização (Webhook)

**Cenário:** Afiliado inadimplente paga mensalidade atrasada

**Passos:**
1. [ ] Afiliado com `payment_status = 'overdue'`
2. [ ] Simular pagamento da mensalidade atrasada
3. [ ] Webhook recebe evento `PAYMENT_CONFIRMED`
4. [ ] Edge function `process-affiliate-webhooks` processa evento

**Validações:**
- [ ] Campo `payment_status` atualizado para `active` no banco
- [ ] Vitrine reativada: `is_visible_in_showcase` = `true`
- [ ] Agente IA reativado: `status` = `active` em `multi_agent_tenants`
- [ ] Notificação criada em `notifications` (tipo: regularized)
- [ ] Email enviado ao afiliado (se configurado)
- [ ] Banner de inadimplência desaparece do painel

---

## 2. GERENCIAMENTO DE ASSINATURAS

### 2.1. Página de Gerenciamento - Visão Geral

**Acesso:** `/afiliados/dashboard/assinatura`

**Validações Gerais:**
1. [ ] Página carrega sem erros
2. [ ] Loading state exibido durante carregamento
3. [ ] Dados do afiliado carregados corretamente
4. [ ] Produto de assinatura carregado corretamente (por tipo de afiliado)

---

### 2.2. Card de Status da Assinatura

#### 🔹 Afiliado Individual BÁSICO (sem assinatura)

**Validações:**
1. [ ] Badge "Plano Básico" exibido
2. [ ] Ícone XCircle (cinza) exibido
3. [ ] Seção de benefícios NÃO aparece
4. [ ] Seção de mensalidade NÃO aparece
5. [ ] Card de upgrade APARECE (próxima seção)

---

#### 🔹 Afiliado Individual PREMIUM (com assinatura ativa)

**Validações:**
1. [ ] Badge "Plano Premium Ativo" exibido
2. [ ] Ícone CheckCircle (verde) exibido
3. [ ] Badge de status correto:
   - [ ] "Em dia" (verde) se `payment_status = 'active'`
   - [ ] "Pendente" (amarelo) se `payment_status = 'pending'`
   - [ ] "Vencido" (vermelho) se `payment_status = 'overdue'`
   - [ ] "Suspenso" (vermelho) se `payment_status = 'suspended'`
4. [ ] Seção de benefícios APARECE:
   - [ ] ✅ Vitrine Pública
   - [ ] ✅ Agente IA (Bia)
5. [ ] Seção de mensalidade APARECE:
   - [ ] Valor correto: R$ 69,00
   - [ ] Botão "Ver Histórico" funciona

---

#### 🔹 Afiliado Logista (com assinatura ativa)

**Validações:**
1. [ ] Badge "Plano Premium Ativo" exibido
2. [ ] Ícone CheckCircle (verde) exibido
3. [ ] Badge de status correto (mesma lógica acima)
4. [ ] Seção de benefícios APARECE:
   - [ ] ✅ Vitrine Pública
   - [ ] ✅ Agente IA (Bia)
   - [ ] ✅ Show Room
5. [ ] Seção de mensalidade APARECE:
   - [ ] Valor correto: R$ 69,00
   - [ ] Botão "Ver Histórico" funciona

---

### 2.3. Card de Upgrade (Individual Básico)

**Regra:** Só aparece para individuais SEM assinatura

**Validações:**
1. [ ] Card APARECE para individual básico
2. [ ] Card NÃO aparece para individual premium
3. [ ] Card NÃO aparece para logista
4. [ ] Badge "Novo" exibido
5. [ ] Benefícios listados:
   - [ ] Vitrine Pública (com descrição)
   - [ ] Agente IA (com descrição)
6. [ ] Valor da mensalidade correto: R$ 69,00
7. [ ] Botão "Fazer Upgrade Agora" funciona
8. [ ] Clicar no botão abre modal de upgrade

---

### 2.4. Modal de Upgrade

**Cenário:** Individual básico clica em "Fazer Upgrade Agora"

**Validações:**
1. [ ] Modal abre corretamente
2. [ ] Título: "Upgrade para Plano Premium"
3. [ ] Descrição: "Tenha acesso à vitrine pública e agente IA"
4. [ ] Benefícios listados com ícones Check (verde):
   - [ ] Vitrine Pública (com descrição)
   - [ ] Agente IA (com descrição)
   - [ ] Comissionamento (com descrição)
5. [ ] Alert com valor da mensalidade:
   - [ ] Valor correto: R$ 69,00
   - [ ] Texto: "Cobrado mensalmente via Asaas"
6. [ ] Botão "Cancelar" fecha modal
7. [ ] Botão "Confirmar Upgrade" funciona
8. [ ] Loading state durante processamento
9. [ ] Após confirmar:
   - [ ] Redirecionamento para URL de pagamento Asaas
   - [ ] URL contém `externalReference` com prefixo `affiliate_`

---

### 2.5. Fluxo de Upgrade Completo

**Cenário:** Individual básico faz upgrade para premium

**Passos:**
1. [ ] Individual básico acessa página de assinatura
2. [ ] Clica em "Fazer Upgrade Agora"
3. [ ] Confirma no modal
4. [ ] Redireciona para Asaas
5. [ ] Paga mensalidade no Asaas
6. [ ] Webhook recebe `PAYMENT_CONFIRMED`
7. [ ] Função `handleUpgradePayment()` processa

**Validações no Banco:**
- [ ] Campo `has_subscription` atualizado para `true`
- [ ] Campo `payment_status` atualizado para `active`
- [ ] Vitrine criada/ativada: `is_visible_in_showcase` = `true`
- [ ] Tenant criado/ativado: `status` = `active`
- [ ] 2 registros em `affiliate_services` (vitrine + agente)
- [ ] Notificação criada (tipo: upgrade)

**Validações no Painel:**
- [ ] Menu "Loja" APARECE após upgrade
- [ ] Card de upgrade DESAPARECE
- [ ] Card de gerenciamento APARECE
- [ ] Badge "Plano Premium Ativo" exibido

---

### 2.6. Card de Gerenciamento (Com Assinatura)

**Regra:** Aparece para afiliados COM assinatura (individuais premium + logistas)

**Validações:**
1. [ ] Card APARECE para individual premium
2. [ ] Card APARECE para logista
3. [ ] Card NÃO aparece para individual básico
4. [ ] Próxima cobrança exibida:
   - [ ] Data correta (formato: dd/MM/yyyy)
   - [ ] Valor correto: R$ 69,00
5. [ ] Botão "Ver Histórico de Pagamentos" funciona
6. [ ] Botão "Cancelar Assinatura" funciona
7. [ ] Aviso de cancelamento exibido:
   - [ ] Texto: "Ao cancelar, você perderá acesso à vitrine e agente IA..."

---

### 2.7. Modal de Cancelamento

**Cenário:** Afiliado com assinatura clica em "Cancelar Assinatura"

**Validações:**
1. [ ] Modal abre corretamente
2. [ ] Título: "Cancelar Assinatura" (vermelho)
3. [ ] Ícone AlertTriangle (vermelho)
4. [ ] Descrição: "Tem certeza que deseja cancelar sua assinatura?"
5. [ ] Alert vermelho com consequências:
   - [ ] "Você perderá acesso a:"
   - [ ] Vitrine pública
   - [ ] Agente IA (Bia)
   - [ ] Comissionamento de mensalidades
6. [ ] Alert informativo:
   - [ ] "O que acontece após o cancelamento:"
   - [ ] Dados serão mantidos
   - [ ] Pode reativar a qualquer momento
   - [ ] Não haverá mais cobranças
7. [ ] Botão "Manter Assinatura" fecha modal
8. [ ] Botão "Confirmar Cancelamento" (vermelho) funciona
9. [ ] Loading state durante processamento

---

### 2.8. Fluxo de Cancelamento Completo

**Cenário:** Afiliado cancela assinatura

**Passos:**
1. [ ] Afiliado com assinatura acessa página de assinatura
2. [ ] Clica em "Cancelar Assinatura"
3. [ ] Confirma no modal
4. [ ] API processa cancelamento
5. [ ] Webhook recebe `SUBSCRIPTION_CANCELLED`
6. [ ] Função `handleSubscriptionCancelled()` processa

**Validações no Banco:**
- [ ] Campo `has_subscription` atualizado para `false`
- [ ] Campo `payment_status` atualizado para `cancelled`
- [ ] Vitrine desativada: `is_visible_in_showcase` = `false`
- [ ] Tenant desativado: `status` = `inactive`
- [ ] Registros em `affiliate_services` atualizados (status: inactive)
- [ ] Notificação criada (tipo: cancelled)

**Validações no Painel:**
- [ ] Menu "Loja" DESAPARECE após cancelamento
- [ ] Card de gerenciamento DESAPARECE
- [ ] Card de upgrade APARECE (se individual)
- [ ] Badge "Plano Básico" exibido
- [ ] Toast de sucesso exibido: "Assinatura cancelada com sucesso"

---

## 3. TESTES DE REGRESSÃO

### 3.1. Afiliados Existentes (25 individuais)

**Objetivo:** Garantir zero impacto em afiliados existentes

**Validações:**
1. [ ] Todos os 25 individuais existentes têm `has_subscription = false`
2. [ ] Menu "Loja" NÃO aparece para nenhum deles
3. [ ] Menu "Assinatura" APARECE para todos (se produtos ativos)
4. [ ] Podem fazer upgrade via página de assinatura
5. [ ] Nenhum dado foi alterado sem autorização

---

### 3.2. Logistas Existentes (1 logista)

**Objetivo:** Garantir zero impacto em logista existente

**Validações:**
1. [ ] Logista existente tem `has_subscription = true`
2. [ ] Menu "Loja" APARECE
3. [ ] Menu "Show Room" APARECE
4. [ ] Menu "Assinatura" APARECE (se produtos ativos)
5. [ ] Vitrine continua funcionando
6. [ ] Agente IA continua funcionando
7. [ ] Nenhum dado foi alterado sem autorização

---

### 3.3. Produtos Normais (Não Show Room)

**Objetivo:** Garantir que produtos normais não foram afetados

**Validações:**
1. [ ] Checkout de produtos normais funciona
2. [ ] Comissionamento normal funciona (N1, N2, N3)
3. [ ] Frete calculado normalmente
4. [ ] Card de indicação aparece normalmente
5. [ ] Nenhuma regra de Show Room aplicada

---

### 3.4. Produtos Show Room

**Objetivo:** Garantir que regras especiais continuam funcionando

**Validações:**
1. [ ] Logista pode comprar 1 unidade por produto
2. [ ] Badge "Já adquirido" aparece após compra
3. [ ] Botão desabilitado após compra
4. [ ] Frete grátis aplicado
5. [ ] Comissionamento diferenciado (90% Fábrica + 5% Renum + 5% JB)
6. [ ] Card de indicação oculto
7. [ ] Alert laranja explicativo exibido

---

## 4. VALIDAÇÕES DE SEGURANÇA

### 4.1. RLS Policies (Row Level Security)

**Objetivo:** Garantir que políticas de segurança estão corretas

**Validações:**

#### 🔹 Tabela `store_profiles`
1. [ ] Individual básico NÃO consegue criar vitrine
2. [ ] Individual premium CONSEGUE criar vitrine
3. [ ] Logista CONSEGUE criar vitrine
4. [ ] Afiliado só vê/edita sua própria vitrine
5. [ ] Admin vê todas as vitrines

#### 🔹 Tabela `multi_agent_tenants`
1. [ ] Individual básico NÃO consegue criar tenant
2. [ ] Individual premium CONSEGUE criar tenant
3. [ ] Logista CONSEGUE criar tenant
4. [ ] Afiliado só vê/edita seu próprio tenant
5. [ ] Admin vê todos os tenants

#### 🔹 Tabela `affiliate_services`
1. [ ] Afiliado só vê seus próprios serviços
2. [ ] Admin vê todos os serviços
3. [ ] Registros criados automaticamente pelo webhook

---

### 4.2. Autenticação e Autorização

**Validações:**
1. [ ] Página de assinatura requer autenticação
2. [ ] API de upgrade requer token válido
3. [ ] API de cancelamento requer token válido
4. [ ] Webhook valida assinatura Asaas
5. [ ] Edge function valida permissões

---

### 4.3. Validação de Dados

**Validações:**
1. [ ] CNPJ validado para logistas
2. [ ] Email validado no cadastro
3. [ ] Telefone validado no cadastro
4. [ ] Produto de assinatura existe e está ativo
5. [ ] Afiliado existe antes de processar webhook

---

## 5. MONITORAMENTO E LOGS

### 5.1. Logs do Webhook

**Validações:**
1. [ ] Logs de upgrade registrados
2. [ ] Logs de cancelamento registrados
3. [ ] Logs de inadimplência registrados
4. [ ] Logs de regularização registrados
5. [ ] Erros registrados com stack trace

---

### 5.2. Notificações

**Validações:**
1. [ ] Notificação de upgrade criada
2. [ ] Notificação de cancelamento criada
3. [ ] Notificação de inadimplência criada
4. [ ] Notificação de regularização criada
5. [ ] Notificações aparecem no painel
6. [ ] Badge de contador funciona

---

### 5.3. Emails (Se Configurado)

**Validações:**
1. [ ] Email de upgrade enviado
2. [ ] Email de cancelamento enviado
3. [ ] Email de inadimplência enviado
4. [ ] Email de regularização enviado
5. [ ] Templates corretos usados

---

## 6. PERFORMANCE E UX

### 6.1. Performance

**Validações:**
1. [ ] Página de assinatura carrega em < 2 segundos
2. [ ] Modal de upgrade abre instantaneamente
3. [ ] Modal de cancelamento abre instantaneamente
4. [ ] Redirecionamento para Asaas é rápido
5. [ ] Webhook processa em < 5 segundos

---

### 6.2. UX e Acessibilidade

**Validações:**
1. [ ] Todos os botões têm estados hover
2. [ ] Todos os botões têm estados disabled
3. [ ] Loading states claros durante processamento
4. [ ] Toasts informativos exibidos
5. [ ] Cores semânticas corretas (verde = sucesso, vermelho = erro)
6. [ ] Ícones corretos e intuitivos
7. [ ] Textos claros e objetivos
8. [ ] Responsividade em mobile

---

## 7. CHECKLIST FINAL

### 7.1. Antes de Marcar Como Concluído

**Validações Obrigatórias:**
- [ ] Todos os testes de cadastro passaram
- [ ] Todos os testes de menus passaram
- [ ] Todos os testes de upgrade passaram
- [ ] Todos os testes de cancelamento passaram
- [ ] Todos os testes de inadimplência passaram
- [ ] Todos os testes de regressão passaram
- [ ] Todas as validações de segurança passaram
- [ ] Zero impacto em afiliados existentes
- [ ] Zero impacto em logistas existentes
- [ ] Documentação atualizada
- [ ] Commits realizados com mensagens claras

---

### 7.2. Critérios de Aceitação Final

**Sistema está pronto quando:**
1. ✅ Afiliados individuais podem fazer upgrade via painel
2. ✅ Afiliados podem cancelar assinatura via painel
3. ✅ Menu "Assinatura" aparece para todos os afiliados
4. ✅ Menu "Loja" aparece apenas para quem tem assinatura
5. ✅ Webhook processa upgrade e cancelamento corretamente
6. ✅ Notificações criadas automaticamente
7. ✅ Zero impacto em funcionalidades existentes
8. ✅ Zero erros de TypeScript/ESLint
9. ✅ Build production passa sem erros
10. ✅ Deploy realizado com sucesso

---

## 📊 RESUMO DE EXECUÇÃO

**Data de Início:** ___/___/______  
**Data de Conclusão:** ___/___/______  
**Responsável:** _______________________  
**Status:** [ ] Em Andamento [ ] Concluído [ ] Bloqueado

**Testes Executados:** _____ / _____  
**Testes Passaram:** _____ / _____  
**Testes Falharam:** _____ / _____  

**Bugs Encontrados:** _____  
**Bugs Críticos:** _____  
**Bugs Resolvidos:** _____  

**Observações:**
```
[Espaço para anotações durante os testes]
```

---

**Documento criado em:** 03/03/2026  
**Última atualização:** 03/03/2026  
**Versão:** 1.0
