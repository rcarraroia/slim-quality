# Requirements Document

## Introduction

Este documento especifica os requisitos para correção crítica do sistema de pagamentos e afiliados da Slim Quality. O sistema atual está implementado mas não funcional devido a problemas na integração com Asaas, webhooks incompletos e rastreamento de afiliados inexistente.

## Glossary

- **Asaas**: Gateway de pagamento utilizado para processar transações e splits
- **Split**: Divisão automática do valor do pagamento entre múltiplas carteiras
- **Wallet_ID**: Identificador único da carteira no Asaas (formato: wal_xxxxx)
- **Afiliado_N1**: Afiliado direto que fez a venda
- **Afiliado_N2**: Afiliado que indicou o N1
- **Afiliado_N3**: Afiliado que indicou o N2
- **Referral_Code**: Código único de indicação do afiliado
- **Webhook**: Notificação automática enviada pelo Asaas sobre eventos de pagamento
- **Commission_Calculator**: Serviço responsável por calcular comissões multinível
- **Order_Affiliate_Processor**: Serviço que processa pedidos com afiliados
- **Referral_Tracker**: Utilitário para rastrear códigos de indicação

## Requirements

### Requirement 1: Correção da Integração Asaas Split

**User Story:** Como desenvolvedor, eu quero corrigir a integração com Asaas para que o split seja enviado junto com a criação do pagamento, para que as comissões sejam processadas automaticamente.

#### Acceptance Criteria

1. WHEN um pagamento é criado, THE System SHALL incluir o split na mesma requisição de criação
2. WHEN calculando split, THE System SHALL remover o percentual de 70% da fábrica (automático via API Key)
3. WHEN enviando split, THE System SHALL garantir que a soma dos percentuais seja exatamente 30%
4. WHEN validando Wallet IDs, THE System SHALL verificar o formato wal_xxxxx antes de enviar
5. IF uma Wallet ID for inválida, THEN THE System SHALL rejeitar a transação e registrar erro

### Requirement 2: Implementação do Webhook Handler

**User Story:** Como sistema, eu quero processar webhooks do Asaas automaticamente, para que as comissões sejam calculadas quando os pagamentos forem confirmados.

#### Acceptance Criteria

1. WHEN um webhook é recebido, THE System SHALL validar o token de autenticação
2. WHEN o evento for PAYMENT_RECEIVED, THE System SHALL identificar o pedido associado
3. WHEN o evento for PAYMENT_CONFIRMED, THE System SHALL disparar o cálculo de comissões
4. WHEN o evento for PAYMENT_SPLIT_CANCELLED, THE System SHALL registrar erro e notificar administradores
5. WHEN o evento for PAYMENT_SPLIT_DIVERGENCE_BLOCK, THE System SHALL investigar e corrigir divergências
6. IF o webhook falhar no processamento, THEN THE System SHALL implementar retry automático

### Requirement 3: Rastreamento de Afiliados

**User Story:** Como afiliado, eu quero que meus links de indicação sejam rastreados corretamente, para que eu receba comissões pelas vendas geradas.

#### Acceptance Criteria

1. WHEN um visitante acessa um link com ?ref=CODIGO, THE System SHALL capturar o código de referência
2. WHEN capturando código, THE System SHALL salvar em localStorage com TTL de 30 dias
3. WHEN o visitante fizer uma compra, THE System SHALL recuperar o código salvo
4. WHEN associando pedido, THE System SHALL vincular o referral_code ao pedido
5. WHEN a conversão for confirmada, THE System SHALL limpar o código do localStorage

### Requirement 4: Lógica de Redistribuição de Comissões

**User Story:** Como gestor, eu quero que as comissões sejam redistribuídas corretamente quando não há rede completa de afiliados, para que os percentuais não utilizados sejam direcionados aos gestores.

#### Acceptance Criteria

1. WHEN não há afiliado N1, THE System SHALL distribuir 15% para cada gestor (Renum e JB)
2. WHEN há apenas N1, THE System SHALL distribuir 15% para N1 e 7.5% para cada gestor
3. WHEN há N1 e N2, THE System SHALL distribuir 15% para N1, 3% para N2 e 6% para cada gestor
4. WHEN há rede completa (N1+N2+N3), THE System SHALL distribuir 15%, 3%, 2% e 5% para cada gestor
5. THE System SHALL sempre garantir que o total de split seja exatamente 30%

### Requirement 5: Ativação de Afiliados Existentes

**User Story:** Como administrador, eu quero ativar os afiliados que estão com status "pending", para que eles possam começar a receber comissões.

#### Acceptance Criteria

1. WHEN ativando afiliado, THE System SHALL alterar status de "pending" para "active"
2. WHEN corrigindo Wallet ID, THE System SHALL converter formato UUID para wal_xxxxx
3. WHEN validando Wallet, THE System SHALL verificar via API Asaas se a carteira existe
4. IF a Wallet ID for inválida, THEN THE System SHALL manter status "pending" e notificar erro
5. WHEN afiliado for ativado, THE System SHALL enviar notificação de boas-vindas

### Requirement 6: Processamento Automático de Pedidos

**User Story:** Como sistema, eu quero que o OrderAffiliateProcessor seja executado automaticamente, para que as comissões sejam calculadas sem intervenção manual.

#### Acceptance Criteria

1. WHEN um webhook de pagamento confirmado for recebido, THE System SHALL chamar OrderAffiliateProcessor
2. WHEN processando pedido, THE System SHALL executar CommissionCalculatorService
3. WHEN calculando comissões, THE System SHALL registrar logs detalhados para auditoria
4. WHEN ocorrer erro no processamento, THE System SHALL implementar tratamento adequado
5. WHEN processamento for concluído, THE System SHALL atualizar status das comissões

### Requirement 7: Configuração Completa de Webhooks

**User Story:** Como desenvolvedor, eu quero configurar todos os eventos necessários no Asaas, para que o sistema receba notificações completas sobre pagamentos e splits.

#### Acceptance Criteria

1. THE System SHALL configurar webhook para evento PAYMENT_RECEIVED
2. THE System SHALL configurar webhook para evento PAYMENT_CONFIRMED  
3. THE System SHALL configurar webhook para evento PAYMENT_SPLIT_CANCELLED
4. THE System SHALL configurar webhook para evento PAYMENT_SPLIT_DIVERGENCE_BLOCK
5. THE System SHALL configurar webhook para evento PAYMENT_OVERDUE
6. THE System SHALL configurar webhook para evento PAYMENT_REFUNDED
7. WHEN configurando webhook, THE System SHALL usar token de autenticação seguro

### Requirement 8: Validações de Segurança

**User Story:** Como sistema, eu quero implementar validações rigorosas, para que apenas transações válidas sejam processadas.

#### Acceptance Criteria

1. WHEN validando Wallet ID, THE System SHALL verificar formato wal_[a-zA-Z0-9]{20}
2. WHEN calculando split, THE System SHALL garantir que soma seja exatamente 30%
3. WHEN verificando afiliado, THE System SHALL confirmar status "active"
4. WHEN construindo rede genealógica, THE System SHALL verificar ausência de loops
5. IF qualquer validação falhar, THEN THE System SHALL rejeitar transação e registrar erro

### Requirement 9: Dashboard de Afiliados Real

**User Story:** Como administrador, eu quero visualizar dados reais dos afiliados no dashboard, para que possa acompanhar o desempenho do programa.

#### Acceptance Criteria

1. WHEN exibindo dashboard, THE System SHALL remover todos os dados mock
2. WHEN conectando APIs, THE System SHALL usar endpoints reais do backend
3. WHEN mostrando comissões, THE System SHALL exibir valores calculados reais
4. WHEN exibindo rede genealógica, THE System SHALL mostrar estrutura real dos afiliados
5. WHEN carregando dados, THE System SHALL implementar estados de loading e erro

### Requirement 10: Logs e Auditoria

**User Story:** Como administrador, eu quero logs detalhados de todas as operações, para que possa auditar e resolver problemas no sistema.

#### Acceptance Criteria

1. WHEN processando split, THE System SHALL registrar logs detalhados da operação
2. WHEN calculando comissões, THE System SHALL manter auditoria completa dos cálculos
3. WHEN ocorrer erro, THE System SHALL registrar contexto completo do problema
4. WHEN split for executado, THE System SHALL registrar confirmação de depósitos
5. THE System SHALL implementar métricas de performance para monitoramento