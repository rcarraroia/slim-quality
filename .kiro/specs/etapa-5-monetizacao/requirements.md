# Requirements Document - ETAPA 5: Monetização (Adesão e Mensalidade)

## Introduction

Este documento especifica os requisitos para a ETAPA 5 do sistema de diferenciação de perfis de afiliados do Slim Quality. O objetivo é implementar cobrança de taxa de adesão para Individuais e taxa de adesão + mensalidade recorrente para Logistas, com controle de inadimplência que suspende automaticamente a visibilidade na vitrine.

**⚠️ DEPENDÊNCIAS:**

Esta etapa depende de:
- ETAPA 1 concluída (campo `affiliate_type` existente com valores 'individual' e 'logista')
- ETAPA 3 concluída (campo `show_row` e diferenciação de perfil)
- ETAPA 4 concluída (vitrine pública de logistas funcionando)
- Integração com Asaas API para cobranças e webhooks
- Campo `document` na tabela `affiliates` com validação de CPF/CNPJ

**⚠️ MODELO DE COBRANÇA:**

- **Individual:** Taxa de adesão única (valor configurado no produto), sem mensalidade, sem vitrine
- **Logista:** Taxa de adesão (entrada) + mensalidade recorrente (valores configurados no produto)

## Glossary

- **Taxa de Adesão**: Cobrança única no momento do cadastro (Individual e Logista)
- **Mensalidade Recorrente**: Cobrança mensal para Logistas (benefício da vitrine)
- **Individual**: Afiliado sem vitrine, paga apenas taxa de adesão única
- **Logista**: Afiliado com vitrine, paga taxa de adesão + mensalidade recorrente
- **Inadimplência**: Estado de pagamento em atraso
- **Webhook**: Notificação automática da API Asaas sobre eventos de pagamento
- **Suspensão Automática**: Desativação da vitrine quando inadimplente
- **Regularização**: Pagamento de débitos pendentes
- **Comissionamento**: Distribuição de comissões sobre taxas e mensalidades (10% Slim Quality, 90% rede + gestores)
- **Painel Admin**: Interface para gerenciar produtos de adesão
- **Paywall**: Tela de pagamento obrigatória antes de concluir cadastro
- **Subconta Asaas**: Conta criada no Asaas para receber comissões (sempre com CPF)
- **CNPJ Obrigatório**: Logistas devem fornecer CNPJ válido no cadastro

## Requirements

### Requirement 1: Taxa de Adesão Universal

**User Story:** Como sistema, eu quero cobrar taxa de adesão de todos os afiliados no momento do cadastro, para que o programa de afiliados seja sustentável financeiramente.

#### Acceptance Criteria

1. THE Sistema SHALL cobrar taxa de adesão de TODOS os afiliados (Individual e Logista)
2. THE Cobrança SHALL ocorrer no momento do cadastro (paywall)
3. THE Valor SHALL vir do produto cadastrado com categoria `adesao_afiliado`
4. THE Sistema SHALL integrar com Asaas API para gerar cobrança
5. WHEN pagamento não confirmado, THEN cadastro não é concluído
6. THE Sistema SHALL permitir pagamento via PIX ou Cartão
7. THE Sistema SHALL exibir QR Code PIX ou formulário de cartão
8. THE Sistema SHALL aguardar confirmação de pagamento (webhook)
9. THE Sistema SHALL registrar pagamento na tabela `affiliate_payments`
10. THE Sistema SHALL liberar acesso ao painel após confirmação
11. THE Sistema SHALL criar customer no Asaas usando CPF do afiliado
12. THE Subconta Asaas SHALL ser criada sempre com CPF (nunca CNPJ)

### Requirement 2: Mensalidade Recorrente para Logistas

**User Story:** Como sistema, eu quero cobrar mensalidade recorrente apenas de Logistas, para que o benefício da vitrine pública seja monetizado.

#### Acceptance Criteria

1. THE Sistema SHALL cobrar mensalidade APENAS de Logistas
2. THE Mensalidade SHALL ser referente ao benefício da vitrine pública
3. THE Valor SHALL vir do produto cadastrado com categoria `adesao_afiliado` e `eligible_affiliate_type='logista'`
4. THE Cobrança SHALL ser automática via Asaas (assinatura recorrente)
5. THE Sistema SHALL criar customer no Asaas (POST /v3/customers) antes de criar assinatura
6. THE Sistema SHALL criar assinatura no Asaas após pagamento da taxa de adesão
7. THE Primeira cobrança SHALL ocorrer imediatamente após adesão (sem carência)
8. THE Sistema SHALL enviar notificação 7 dias antes do vencimento
9. THE Sistema SHALL registrar pagamentos na tabela `affiliate_payments`
10. THE Sistema SHALL permitir Logista visualizar histórico de pagamentos
11. WHEN Logista inadimplente, THEN vitrine é bloqueada automaticamente
12. THE Sistema SHALL permitir regularização via pagamento

### Requirement 3: Módulo de Produtos - Categoria de Adesão

**User Story:** Como administrador, eu quero gerenciar produtos de adesão através do módulo de produtos existente, para que eu possa configurar valores e regras sem alterar código.

#### Acceptance Criteria

1. THE Sistema SHALL adicionar categoria `adesao_afiliado` ao ENUM `product_category`
2. THE Sistema SHALL corrigir inconsistências existentes no ENUM:
   - Adicionar `pillow` e `accessory` (existem no frontend mas não no banco)
   - Adicionar `servico_digital` e `show_row` ao Select do formulário (existem no banco mas não no frontend)
3. THE Tabela `products` SHALL ter novos campos:
   - `entry_fee_cents INTEGER` - valor da taxa de adesão
   - `monthly_fee_cents INTEGER` - valor da mensalidade recorrente
   - `has_entry_fee BOOLEAN DEFAULT FALSE` - se cobra taxa de entrada
   - `billing_cycle VARCHAR DEFAULT 'monthly'` - ciclo de recorrência
   - `eligible_affiliate_type VARCHAR` - tipo de afiliado elegível (individual, logista, ambos)
4. THE Formulário de produtos SHALL ter lógica condicional para categoria `adesao_afiliado`:
   - Ocultar campos físicos (dimensões, peso, etc.)
   - Exibir campos específicos de assinatura
   - Seguir padrão da lógica `isDigital` já implementada
5. THE Sistema SHALL permitir criar produto "Taxa de Adesão Individual"
6. THE Sistema SHALL permitir criar produto "Adesão + Mensalidade Logista"
7. THE Valores SHALL ser gerenciados via módulo de produtos (não via system_settings)
8. THE Sistema SHALL validar que valores são positivos
9. THE Sistema SHALL permitir apenas um produto ativo por tipo de afiliado
10. THE Sistema SHALL exibir produtos de adesão no painel admin

### Requirement 4: Webhook Asaas para Pagamentos

**User Story:** Como sistema, eu quero receber notificações automáticas da API Asaas sobre pagamentos, para que eu possa atualizar status em tempo real.

#### Acceptance Criteria

1. THE Sistema SHALL criar endpoint `/api/webhooks/asaas`
2. THE Endpoint SHALL validar assinatura do webhook
3. THE Endpoint SHALL processar eventos: `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_RECEIVED`
4. WHEN `PAYMENT_CONFIRMED`, THEN atualizar status do pagamento
5. WHEN `PAYMENT_OVERDUE`, THEN marcar como inadimplente
6. WHEN `PAYMENT_RECEIVED`, THEN regularizar inadimplência
7. THE Sistema SHALL ter retry automático (máximo 3 tentativas)
8. THE Sistema SHALL registrar logs detalhados de webhooks
9. THE Sistema SHALL enviar alerta se webhook falhar consistentemente
10. THE Sistema SHALL ter fallback para verificação manual

### Requirement 5: Controle de Inadimplência

**User Story:** Como sistema, eu quero controlar inadimplência de Logistas e suspender vitrine automaticamente, para que apenas Logistas adimplentes apareçam na vitrine.

#### Acceptance Criteria

1. WHEN Logista fica inadimplente, THEN vitrine é bloqueada automaticamente
2. WHEN vitrine bloqueada por inadimplência, THEN Logista desaparece da vitrine pública
3. THE Acesso ao painel SHALL ser mantido (Logista pode regularizar)
4. THE Sistema SHALL exibir banner de inadimplência no painel
5. THE Banner SHALL ter link para regularizar pagamento
6. WHEN Logista regulariza, THEN vitrine é desbloqueada automaticamente
7. THE Sistema SHALL enviar email de inadimplência
8. THE Sistema SHALL enviar email de regularização
9. THE Sistema SHALL registrar histórico de inadimplências
10. THE Sistema SHALL ter campo `payment_status` na tabela `affiliates`
11. THE Sistema SHALL ter campo `financial_status` para controlar acesso a recursos
12. THE Link de indicação SHALL ser bloqueado até ativar wallet Asaas
13. THE Vitrine SHALL ser bloqueada até completar cadastro da loja
14. THE Menu ShowRoom SHALL ser visível apenas para `affiliate_type='logista'` COM CNPJ cadastrado

### Requirement 6: Notificações de Pagamento

**User Story:** Como afiliado, eu quero receber notificações sobre cobranças e pagamentos, para que eu esteja sempre informado sobre meu status financeiro.

#### Acceptance Criteria

1. THE Sistema SHALL enviar email 7 dias antes do vencimento da mensalidade
2. THE Sistema SHALL enviar email no dia do vencimento
3. THE Sistema SHALL enviar email de confirmação de pagamento
4. THE Sistema SHALL enviar email de inadimplência (3 dias após vencimento)
5. THE Sistema SHALL enviar email de regularização
6. THE Emails SHALL ter link direto para painel de pagamentos
7. THE Sistema SHALL exibir notificações no painel
8. THE Notificações SHALL ser persistentes até serem lidas
9. THE Sistema SHALL ter badge de notificações não lidas
10. THE Sistema SHALL permitir afiliado desativar notificações por email

### Requirement 7: Histórico de Pagamentos

**User Story:** Como afiliado, eu quero visualizar histórico completo de pagamentos, para que eu possa acompanhar minhas cobranças.

#### Acceptance Criteria

1. THE Painel SHALL ter seção "Histórico de Pagamentos"
2. THE Seção SHALL exibir lista de todos os pagamentos
3. THE Lista SHALL mostrar: data, tipo (adesão/mensalidade), valor, status
4. THE Lista SHALL permitir filtrar por tipo e status
5. THE Lista SHALL permitir ordenar por data
6. THE Sistema SHALL exibir status: pendente, pago, vencido, cancelado
7. THE Sistema SHALL permitir baixar comprovante de pagamento
8. THE Sistema SHALL exibir próxima cobrança (se houver)
9. THE Sistema SHALL exibir total pago no período
10. THE Sistema SHALL ser responsivo (mobile, tablet, desktop)

### Requirement 8: Comissionamento de Taxas

**User Story:** Como sistema, eu quero que taxas de adesão e mensalidades sejam receitas comissionáveis, para que afiliados sejam incentivados a indicar novos afiliados.

#### Acceptance Criteria

1. THE Taxa de adesão SHALL ser receita comissionável
2. THE Mensalidades SHALL ser receitas comissionáveis
3. THE Comissionamento SHALL seguir regra fixa:
   - 10% fixo Slim Quality
   - N1 = 15%, N2 = 3%, N3 = 2% (se existirem na rede)
   - Restante dos 90% após pagar rede → Renum e JB 50/50
4. THE Sistema SHALL reaproveitar lógica de redistribuição de `commission-calculator.service.ts`
5. WHEN afiliado inadimplente/suspenso, THEN comissão redistribuída para Renum e JB
6. THE Sistema SHALL integrar com sistema de comissões existente
7. THE Sistema SHALL registrar origem da indicação
8. THE Sistema SHALL calcular comissões conforme regras definidas
9. THE Sistema SHALL aplicar split automático via Asaas
10. THE Sistema SHALL registrar comissões na tabela `commissions`
11. THE Sistema SHALL exibir comissões no painel do afiliado
12. THE Sistema SHALL ter logs de cálculo de comissões

### Requirement 9: Segurança e Validações

**User Story:** Como sistema, eu quero garantir segurança nas transações financeiras, para que não haja fraudes ou erros.

#### Acceptance Criteria

1. THE Sistema SHALL validar assinatura de webhooks Asaas
2. THE Sistema SHALL usar HTTPS para todas as transações
3. THE Sistema SHALL validar valores antes de processar
4. THE Sistema SHALL impedir alteração manual de status de pagamento
5. THE Sistema SHALL registrar logs de todas as transações
6. THE Sistema SHALL ter auditoria de alterações de valores
7. THE Sistema SHALL validar que apenas admin pode alterar produtos
8. THE Sistema SHALL ter rate limiting no endpoint de webhook
9. THE Sistema SHALL sanitizar inputs de pagamento
10. THE Sistema SHALL ter backup de dados financeiros
11. THE Sistema SHALL validar CPF matematicamente antes de criar subconta
12. THE Sistema SHALL validar CNPJ matematicamente para Logistas
13. THE Sistema SHALL adicionar constraint UNIQUE no campo `document`
14. THE Sistema SHALL substituir índice HASH por índice UNIQUE no campo `document`
15. THE CNPJ SHALL ser obrigatório no fluxo de cadastro de Logista

### Requirement 10: Consistência com Design System

**User Story:** Como sistema, eu quero que interfaces de pagamento sigam o design system, para que a experiência seja consistente.

#### Acceptance Criteria

1. THE Interfaces SHALL usar componentes shadcn/ui
2. THE Interfaces SHALL usar variáveis CSS
3. THE Interfaces SHALL seguir padrões de espaçamento
4. THE Interfaces SHALL ser responsivas
5. THE Interfaces SHALL ter feedback visual (loading, success, error)
6. THE Interfaces SHALL usar ícones lucide-react
7. THE Interfaces SHALL ter acessibilidade básica
8. THE Interfaces SHALL seguir padrões de tipografia
9. THE Interfaces SHALL ter transições suaves
10. THE Interfaces SHALL ser testadas em mobile, tablet e desktop

## Notas de Implementação

### Ordem de Implementação Recomendada

1. **Primeiro**: Criar migrations de banco (payments, products, document constraint)
2. **Segundo**: Atualizar módulo de produtos (categoria, campos, formulário)
3. **Terceiro**: Criar endpoint `/api/subscriptions/create-payment`
4. **Quarto**: Implementar paywall no cadastro
5. **Quinto**: Implementar webhook Asaas
6. **Sexto**: Implementar controle de inadimplência
7. **Sétimo**: Implementar notificações
8. **Oitavo**: Implementar histórico de pagamentos
9. **Nono**: Implementar comissionamento
10. **Décimo**: Validar segurança e testes

### Dependências Externas

- ETAPA 1 completa (campo `affiliate_type`)
- ETAPA 3 completa (campo `show_row`)
- ETAPA 4 completa (vitrine pública)
- Asaas API (cobranças e webhooks)
- Sistema de comissões existente (`commission-calculator.service.ts`)
- Serviço de email (notificações)
- Validação de CPF/CNPJ já implementada (`document-utils.ts`)

### Arquivos Principais a Criar/Modificar

**Frontend:**
- `src/pages/afiliados/dashboard/Pagamentos.tsx` - Histórico
- `src/pages/dashboard/Produtos.tsx` - Atualizar formulário
- `src/components/PaymentBanner.tsx` - Banner de inadimplência
- `src/services/payments.service.ts` - Serviço de pagamentos

**Backend:**
- `api/subscriptions/create-payment.js` - Nova Serverless Function
- `api/webhook-assinaturas.js` - Reaproveitar webhook existente
- `supabase/migrations/YYYYMMDDHHMMSS_add_product_subscription_fields.sql` - Migration produtos
- `supabase/migrations/YYYYMMDDHHMMSS_create_payments_tables.sql` - Migration payments
- `supabase/migrations/YYYYMMDDHHMMSS_add_document_unique_constraint.sql` - Migration document

### Testes Críticos

1. **Taxa de Adesão**: Verificar cobrança no cadastro (paywall)
2. **Mensalidade**: Verificar criação de assinatura após adesão
3. **Webhook**: Verificar processamento de eventos
4. **Inadimplência**: Verificar bloqueio automático de vitrine
5. **Regularização**: Verificar desbloqueio de vitrine
6. **Comissionamento**: Verificar cálculo e split (10% + rede + gestores)
7. **CNPJ**: Verificar obrigatoriedade para Logistas
8. **Subconta**: Verificar criação sempre com CPF

### Riscos e Mitigações

**Risco 1: Webhook Asaas falhando**
- Mitigação: Retry automático + verificação periódica manual
- Mitigação: Logs detalhados + alertas

**Risco 2: Inadimplência não detectada**
- Mitigação: Verificação batch diária
- Mitigação: Alertas para admin

**Risco 3: Comissionamento incorreto**
- Mitigação: Logs detalhados de cálculo
- Mitigação: Validação manual antes de aplicar split
- Mitigação: Reaproveitar lógica testada de `commission-calculator.service.ts`

**Risco 4: Duplicação de CPF/CNPJ**
- Mitigação: Constraint UNIQUE no banco
- Mitigação: Índice UNIQUE ao invés de HASH

## Critérios de Conclusão da ETAPA 5

A ETAPA 5 estará completa quando:

- ✅ Todos os 10 requirements implementados
- ✅ Categoria `adesao_afiliado` adicionada ao ENUM
- ✅ Inconsistências do ENUM corrigidas (pillow, accessory, servico_digital, show_row)
- ✅ Campos de assinatura adicionados na tabela `products`
- ✅ Formulário de produtos atualizado com lógica condicional
- ✅ Constraint UNIQUE adicionado no campo `document`
- ✅ Índice UNIQUE substituindo índice HASH no campo `document`
- ✅ Taxa de adesão funcionando (paywall)
- ✅ Mensalidade recorrente funcionando
- ✅ Endpoint `/api/subscriptions/create-payment` criado
- ✅ Webhook Asaas processando
- ✅ Inadimplência bloqueando vitrine
- ✅ Notificações funcionando
- ✅ Histórico de pagamentos funcionando
- ✅ Comissionamento integrado (10% + rede + gestores)
- ✅ CNPJ obrigatório para Logistas
- ✅ Subcontas Asaas criadas com CPF
- ✅ Zero erros de TypeScript/ESLint
- ✅ Testes de integração passando
- ✅ Documentação atualizada

## Próximas Etapas (Fora do Escopo)

Esta especificação NÃO inclui:

- ❌ Relatórios financeiros avançados
- ❌ Integração com outros gateways de pagamento
- ❌ Sistema de cupons de desconto
- ❌ Parcelamento de taxas
- ❌ Programa de fidelidade
- ❌ Painel admin de configuração de valores (valores vêm do módulo de produtos)

Estas funcionalidades serão implementadas em sprints futuros.
