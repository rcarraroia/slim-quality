# Requirements Document - Modelo de 3 Planos com Vitrine e Agente IA

## Introduction

Este documento especifica os requisitos para implementação do novo modelo de 3 planos no sistema Slim Quality, permitindo que afiliados individuais optem por ter vitrine pública e agente IA mediante pagamento de mensalidade recorrente.

**Contexto do Sistema:**
- Plataforma multi-tenant de afiliados com vitrine pública e agente IA
- Sistema atual: Individuais pagam apenas adesão, Logistas pagam adesão + mensalidade

**Novo Modelo de 3 Planos:**
1. **Individual SEM Mensalidade** (atual): Apenas adesão, sem vitrine, sem agente IA, programa de afiliados normal
2. **Individual COM Mensalidade** (NOVO): Adesão + mensalidade → Vitrine + Agente IA (sem Show Room)
3. **Logista** (inalterado): Adesão + mensalidade → Vitrine + Agente IA + Show Room (exclusivo)

**Decisão Estratégica:**
- Agente IA INCLUSO em planos com mensalidade (não upgrade opcional)
- Show Room continua sendo o diferencial exclusivo dos logistas
- Individuais existentes podem fazer upgrade para plano COM mensalidade
- Checkbox simples no cadastro para escolher plano COM mensalidade
- Mensalidades geram comissão: 10% Slim + 90% Renum/JB (quando sem rede N1/N2/N3)

**Decisão Técnica:**
- Campo `has_subscription` (booleano) indica se afiliado paga mensalidade
- Campo `payment_status` indica status do pagamento (quando aplicável)
- Individuais existentes (25) ficam com `has_subscription = false` (correto)

## Glossary

- **Afiliado_Individual_Basico**: Afiliado do tipo 'individual' com `has_subscription = false` (paga apenas adesão)
- **Afiliado_Individual_Premium**: Afiliado do tipo 'individual' com `has_subscription = true` (paga adesão + mensalidade)
- **Afiliado_Logista**: Afiliado do tipo 'logista' com `has_subscription = true` (paga adesão + mensalidade)
- **Has_Subscription**: Campo booleano que indica se afiliado paga mensalidade recorrente
- **Vitrine**: Perfil público de loja acessível em `/lojas/:slug` com informações, produtos e contatos
- **Agente_IA**: Sistema de atendimento automatizado via WhatsApp (Agente Bia)
- **Show_Room**: Catálogo exclusivo de produtos para logistas comprarem com regras especiais
- **Bundle**: Conjunto de serviços (vitrine + agente IA) ativados simultaneamente
- **Store_Profile**: Registro na tabela `store_profiles` contendo dados da vitrine
- **Multi_Agent_Tenant**: Registro na tabela `multi_agent_tenants` contendo configuração do agente IA
- **RLS_Policy**: Row Level Security Policy do Supabase que controla acesso aos dados
- **Payment_Status**: Status de pagamento do afiliado ('active', 'pending', 'overdue', 'suspended')
- **Webhook_Asaas**: Endpoint que recebe notificações de eventos de pagamento do Asaas
- **Edge_Function**: Função serverless do Supabase que processa webhooks de forma assíncrona
- **Upgrade**: Processo de migrar de Individual Básico para Individual Premium

## Requirements

### Requirement 1: Campo has_subscription no Banco

**User Story:** Como sistema, quero ter um campo que indique se afiliado paga mensalidade, para que eu possa controlar acesso à vitrine e agente IA.

#### Acceptance Criteria

1. THE tabela affiliates SHALL ter campo has_subscription BOOLEAN DEFAULT false
2. WHEN afiliado é criado sem mensalidade, THE has_subscription SHALL ser false
3. WHEN afiliado é criado com mensalidade, THE has_subscription SHALL ser true
4. WHEN afiliado faz upgrade para mensalidade, THE has_subscription SHALL ser atualizado para true
5. THE índice idx_affiliates_has_subscription SHALL existir para performance
6. FOR ALL afiliados logistas existentes, has_subscription SHALL ser true
7. FOR ALL afiliados individuais existentes, has_subscription SHALL ser false (padrão correto)

---

### Requirement 2: Checkbox de Mensalidade no Cadastro

**User Story:** Como novo afiliado individual, quero escolher se desejo pagar mensalidade para ter vitrine e agente IA, para que eu possa optar pelo plano que melhor me atende.

#### Acceptance Criteria

1. WHEN usuário acessa formulário de cadastro de afiliado individual, THE Sistema SHALL exibir checkbox "Incluir Vitrine + Agente IA (mensalidade)"
2. THE checkbox SHALL estar desmarcado por padrão (plano básico)
3. WHEN checkbox é marcado, THE Sistema SHALL exibir valor da mensalidade
4. WHEN checkbox é marcado, THE Sistema SHALL buscar produto com category = 'adesao_afiliado' AND eligible_affiliate_type = 'individual' AND is_subscription = true
5. WHEN checkbox é desmarcado, THE Sistema SHALL buscar produto com category = 'adesao_afiliado' AND eligible_affiliate_type = 'individual' AND is_subscription = false
6. WHEN cadastro é concluído com checkbox marcado, THE has_subscription SHALL ser true
7. WHEN cadastro é concluído com checkbox desmarcado, THE has_subscription SHALL ser false

---

### Requirement 3: Acesso ao Módulo de Vitrine

**User Story:** Como afiliado individual premium, quero ter acesso ao módulo de configuração de vitrine no painel, para que eu possa criar e gerenciar minha loja pública.

#### Acceptance Criteria

1. WHEN um Afiliado_Individual_Premium (has_subscription = true) acessa o painel, THE Sistema SHALL exibir o menu "Loja" na navegação lateral
2. WHEN um Afiliado_Individual_Basico (has_subscription = false) acessa o painel, THE Sistema SHALL NOT exibir o menu "Loja"
3. WHEN um Afiliado_Individual_Premium clica no menu "Loja", THE Sistema SHALL carregar a página de configuração de vitrine sem erros
4. THE RLS_Policy de SELECT em store_profiles SHALL permitir acesso para has_subscription = true
5. THE RLS_Policy de INSERT em store_profiles SHALL permitir criação para has_subscription = true
6. THE RLS_Policy de UPDATE em store_profiles SHALL permitir edição para has_subscription = true
7. WHEN um Afiliado_Logista acessa o painel, THE Sistema SHALL continuar exibindo o menu "Show Room" (exclusivo)
8. WHEN um Afiliado_Individual acessa o painel, THE Sistema SHALL NOT exibir o menu "Show Room"

---

### Requirement 4: Ativação de Vitrine com Mensalidade

**User Story:** Como afiliado individual premium, quero ativar minha vitrine mediante pagamento de mensalidade recorrente, para que minha loja fique visível publicamente.

#### Acceptance Criteria

1. WHEN um Afiliado_Individual_Premium tenta ativar a vitrine, THE Sistema SHALL verificar se possui has_subscription = true AND payment_status = 'active'
2. IF has_subscription = false, THEN THE Sistema SHALL exibir mensagem informando que precisa fazer upgrade
3. IF has_subscription = true AND payment_status !== 'active', THEN THE Sistema SHALL exibir modal de confirmação para criar assinatura
4. WHEN o Afiliado_Individual_Premium confirma criação de assinatura, THE Sistema SHALL buscar produto com category = 'adesao_afiliado' AND eligible_affiliate_type = 'individual' AND is_subscription = true
5. THE Sistema SHALL criar pagamento recorrente via API Asaas com valor configurado no produto
6. WHEN pagamento é confirmado pelo Asaas, THE Webhook_Asaas SHALL ativar Store_Profile (is_visible_in_showcase = true)
7. WHEN pagamento é confirmado pelo Asaas, THE Webhook_Asaas SHALL criar Multi_Agent_Tenant (status = 'active')
8. THE Sistema SHALL registrar ativação em affiliate_services com service_type IN ('vitrine', 'agente')
9. FOR ALL afiliados com has_subscription = true AND payment_status = 'active', ativação de vitrine SHALL ativar Bundle completo (vitrine + agente)

---

### Requirement 5: Página de Upgrade para Individuais Básicos

**User Story:** Como afiliado individual básico, quero fazer upgrade para o plano premium, para que eu possa ter acesso à vitrine e agente IA.

#### Acceptance Criteria

1. WHEN Afiliado_Individual_Basico acessa painel, THE Sistema SHALL exibir banner/card de upgrade
2. THE banner SHALL exibir benefícios do plano premium (vitrine + agente IA)
3. THE banner SHALL exibir valor da mensalidade
4. WHEN Afiliado_Individual_Basico clica em "Fazer Upgrade", THE Sistema SHALL exibir modal de confirmação
5. THE modal SHALL buscar produto com category = 'adesao_afiliado' AND eligible_affiliate_type = 'individual' AND is_subscription = true
6. WHEN usuário confirma upgrade, THE Sistema SHALL criar assinatura via API Asaas
7. WHEN pagamento é confirmado, THE Webhook_Asaas SHALL atualizar has_subscription = true
8. WHEN pagamento é confirmado, THE Sistema SHALL ativar Bundle (vitrine + agente)
9. THE Sistema SHALL criar notificação informando upgrade bem-sucedido

---

### Requirement 6: Bloqueio por Inadimplência

**User Story:** Como sistema, quero bloquear automaticamente a vitrine e agente IA de afiliados inadimplentes, para que apenas afiliados com pagamento em dia tenham acesso aos serviços.

#### Acceptance Criteria

1. WHEN Webhook_Asaas recebe evento PAYMENT_OVERDUE, THE Edge_Function SHALL verificar has_subscription do afiliado
2. IF has_subscription = true AND payment_status = 'overdue', THEN THE Edge_Function SHALL atualizar Store_Profile (is_visible_in_showcase = false)
3. IF has_subscription = true AND payment_status = 'overdue', THEN THE Edge_Function SHALL atualizar Multi_Agent_Tenant (status = 'inactive')
4. THE Edge_Function SHALL aplicar bloqueio para affiliate_type IN ('individual', 'logista')
5. WHEN Webhook_Asaas recebe evento PAYMENT_CONFIRMED após inadimplência, THE Edge_Function SHALL reativar Store_Profile (is_visible_in_showcase = true)
6. WHEN Webhook_Asaas recebe evento PAYMENT_CONFIRMED após inadimplência, THE Edge_Function SHALL reativar Multi_Agent_Tenant (status = 'active')
7. THE Sistema SHALL criar notificação informando bloqueio/desbloqueio da vitrine

---

### Requirement 7: Correção de Campo no Webhook

**User Story:** Como desenvolvedor, quero corrigir o campo usado para ativar vitrine no webhook, para que a ativação funcione corretamente com o schema do banco.

#### Acceptance Criteria

1. THE função activateTenantAndVitrine() SHALL usar campo is_visible_in_showcase (não is_visible)
2. THE função activateTenantAndVitrine() SHALL atualizar updated_at com timestamp atual
3. WHEN ativação de vitrine falha, THE Sistema SHALL registrar erro em logs sem bloquear fluxo
4. THE função activateTenantAndVitrine() SHALL ser renomeada para activateBundle() para refletir ativação de múltiplos serviços
5. THE função detectBundlePayment() SHALL verificar has_subscription = true AND payment_status = 'active'

---

### Requirement 8: Diferenciação Visual de Tipos de Afiliado

**User Story:** Como afiliado, quero visualizar claramente meu tipo de conta no painel, para que eu entenda quais recursos tenho acesso.

#### Acceptance Criteria

1. WHEN um Afiliado_Individual_Basico acessa painel, THE Sistema SHALL exibir badge "Plano Básico"
2. WHEN um Afiliado_Individual_Premium acessa página "Loja", THE Sistema SHALL exibir badge "Plano Premium"
3. WHEN um Afiliado_Logista acessa página "Loja", THE Sistema SHALL exibir badge "Logista"
4. THE badge SHALL usar cores semânticas (muted para básico, secondary para premium, default para logista)
5. WHEN um Afiliado_Individual_Basico visualiza produtos, THE Sistema SHALL NOT exibir produtos com category = 'show_room'
6. WHEN um Afiliado_Logista visualiza produtos, THE Sistema SHALL exibir produtos com category = 'show_room'

---

### Requirement 9: Configuração de Produtos de Adesão

**User Story:** Como administrador, quero configurar produtos de adesão para os 3 planos via painel admin, para que eu possa ajustar preços sem alterar código.

#### Acceptance Criteria

1. THE Sistema SHALL ter produto com category = 'adesao_afiliado' AND eligible_affiliate_type = 'individual' AND is_subscription = false (plano básico)
2. THE Sistema SHALL ter produto com category = 'adesao_afiliado' AND eligible_affiliate_type = 'individual' AND is_subscription = true (plano premium)
3. THE Sistema SHALL ter produto com category = 'adesao_afiliado' AND eligible_affiliate_type = 'logista' AND is_subscription = true (plano logista)
4. THE produtos SHALL ter monthly_fee_cents configurável via painel admin
5. THE Sistema SHALL buscar produto correto baseado em eligible_affiliate_type e is_subscription
6. WHEN produto não existe, THE Sistema SHALL exibir mensagem de erro clara
7. THE Sistema SHALL NOT ter valores de mensalidade hardcoded no código

---

### Requirement 10: Preservação de Funcionalidades de Logistas

**User Story:** Como logista existente, quero que minhas funcionalidades continuem funcionando exatamente como antes, para que não haja impacto negativo na minha operação.

#### Acceptance Criteria

1. FOR ALL Afiliado_Logista existentes, acesso à vitrine SHALL continuar funcionando sem alterações
2. FOR ALL Afiliado_Logista existentes, acesso ao Show_Room SHALL continuar exclusivo
3. FOR ALL Afiliado_Logista existentes, ativação de Bundle SHALL continuar funcionando
4. FOR ALL Afiliado_Logista existentes, bloqueio por inadimplência SHALL continuar funcionando
5. THE Sistema SHALL NOT alterar dados existentes de logistas durante implementação
6. THE Sistema SHALL NOT alterar lógica de comissionamento de logistas
7. THE Sistema SHALL NOT alterar lógica de produtos Show Room

---

### Requirement 11: Vitrine Pública Acessível

**User Story:** Como visitante público, quero visualizar lojas de afiliados individuais premium na vitrine pública, para que eu possa conhecer e comprar produtos deles.

#### Acceptance Criteria

1. WHEN Store_Profile tem is_visible_in_showcase = true, THE Sistema SHALL exibir loja em `/lojas`
2. THE Sistema SHALL exibir lojas de affiliate_type IN ('individual', 'logista') sem distinção visual
3. WHEN visitante acessa `/lojas/:slug`, THE Sistema SHALL carregar dados da loja via API pública
4. THE API pública SHALL fazer JOIN com tabela affiliates para retornar referral_code
5. WHEN visitante clica em "Comprar Agora", THE Sistema SHALL usar referral_code do dono da loja
6. THE Sistema SHALL aplicar mesma lógica de comissionamento para individuais premium e logistas

---

### Requirement 12: Agente IA Multi-Tenant

**User Story:** Como afiliado individual premium com vitrine ativa, quero ter um agente IA configurado automaticamente, para que eu possa atender clientes via WhatsApp 24/7.

#### Acceptance Criteria

1. WHEN Bundle é ativado para Afiliado_Individual_Premium, THE Sistema SHALL criar Multi_Agent_Tenant com tenant_id único
2. THE Multi_Agent_Tenant SHALL ter status = 'active' após ativação
3. THE Multi_Agent_Tenant SHALL ter whatsapp_status = 'inactive' até conexão do WhatsApp
4. WHEN Afiliado_Individual_Premium conecta WhatsApp, THE Sistema SHALL atualizar whatsapp_status = 'active'
5. THE Agente_IA SHALL carregar personality customizada do tenant (se existir)
6. IF personality customizada não existe, THEN THE Agente_IA SHALL usar personality padrão
7. THE Agente_IA SHALL processar mensagens com contexto isolado do tenant

---

### Requirement 13: Comissionamento de Mensalidades

**User Story:** Como sistema, quero gerar comissões para mensalidades de individuais premium, para que a rede seja remunerada corretamente.

#### Acceptance Criteria

1. WHEN mensalidade de Individual_Premium é confirmada, THE Sistema SHALL calcular comissões
2. THE comissão SHALL seguir modelo: 10% Slim + N1(15%) + N2(3%) + N3(2%) + restante Renum/JB (50/50)
3. IF afiliado não tem rede (N1/N2/N3), THEN 90% SHALL ser dividido entre Renum e JB (45% cada)
4. THE Sistema SHALL verificar payment_status = 'active' de cada afiliado da rede
5. IF afiliado da rede está inativo, THEN sua parte SHALL ser redistribuída para Renum/JB
6. THE Sistema SHALL salvar comissões na tabela commissions
7. THE Sistema SHALL criar registros apenas para afiliados ativos

---

### Requirement 14: Testes de Regressão

**User Story:** Como desenvolvedor, quero garantir que alterações não quebrem funcionalidades existentes, para que o sistema continue estável após deploy.

#### Acceptance Criteria

1. THE Sistema SHALL passar em todos os testes existentes de vitrine
2. THE Sistema SHALL passar em todos os testes existentes de webhook
3. THE Sistema SHALL passar em todos os testes existentes de comissionamento
4. WHEN afiliado logista ativa vitrine, THE Sistema SHALL continuar funcionando como antes
5. WHEN afiliado logista fica inadimplente, THE Sistema SHALL continuar bloqueando corretamente
6. WHEN afiliado logista regulariza pagamento, THE Sistema SHALL continuar desbloqueando corretamente
7. THE Sistema SHALL ter cobertura de testes > 70% para novos componentes
8. WHEN afiliado individual básico acessa painel, THE Sistema SHALL NOT exibir menu "Loja"
9. WHEN afiliado individual premium acessa painel, THE Sistema SHALL exibir menu "Loja"
10. WHEN afiliado individual básico tenta fazer upgrade, THE Sistema SHALL criar assinatura corretamente
