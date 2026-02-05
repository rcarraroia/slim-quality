# Requirements Document

## Introduction

O Subscription Payment Flow é um sistema robusto para processar pagamentos de assinaturas seguindo o padrão "Payment First", onde a primeira mensalidade é processada como pagamento avulso antes de criar a assinatura recorrente. Esta abordagem resolve problemas críticos de arquitetura identificados no sistema atual e implementa as melhores práticas baseadas no sistema Comademig.

## Glossary

- **Payment_First_Flow**: Fluxo onde primeira mensalidade é processada como PAYMENT avulso antes da assinatura
- **Edge_Function**: Função serverless executada no edge da Supabase
- **Polling_Service**: Serviço que verifica periodicamente o status de pagamentos
- **Webhook_Handler**: Serviço que processa notificações do Asaas de forma idempotente
- **Payment_Orchestrator**: Serviço central que coordena todo o fluxo de pagamento
- **Asaas_API**: Gateway de pagamento utilizado para processar transações
- **Order_Items**: Lista de produtos/serviços sendo adquiridos na transação
- **Subscription_Manager**: Componente responsável por gerenciar assinaturas recorrentes
- **User_Activator**: Serviço que ativa usuários após confirmação de pagamento

## Requirements

### Requirement 1: Arquitetura Robusta de Payment First

**User Story:** Como desenvolvedor do sistema, eu quero uma arquitetura robusta baseada em Edge Functions separadas, para que o processamento de pagamentos seja confiável e escalável.

#### Acceptance Criteria

1. WHEN o sistema processa um pagamento THEN THE Payment_Orchestrator SHALL coordenar todas as operações através de Edge Functions separadas
2. WHEN uma Edge Function falha THEN THE System SHALL registrar logs estruturados e permitir retry independente
3. WHEN múltiplas operações são executadas THEN THE System SHALL manter isolamento entre Edge Functions para evitar falhas em cascata
4. THE Payment_Orchestrator SHALL gerenciar o estado do fluxo de pagamento de forma centralizada
5. WHEN o sistema escala THEN THE Edge_Functions SHALL processar requisições de forma independente e paralela

### Requirement 2: Processamento Correto da Primeira Mensalidade

**User Story:** Como usuário comprando uma assinatura, eu quero que minha primeira mensalidade seja processada corretamente como pagamento avulso, para que eu tenha acesso imediato ao serviço após a confirmação.

#### Acceptance Criteria

1. WHEN um usuário inicia uma compra de assinatura THEN THE System SHALL processar a primeira mensalidade usando /v3/payments (não /v3/subscriptions)
2. WHEN o pagamento é criado THEN THE System SHALL incluir todos os Order_Items para detecção correta do produto IA
3. WHEN o pagamento é processado THEN THE Polling_Service SHALL aguardar confirmação por até 15 segundos
4. IF o pagamento é confirmado THEN THE System SHALL criar a assinatura recorrente automaticamente
5. IF o pagamento falha ou expira THEN THE System SHALL notificar o usuário e cancelar o processo

### Requirement 3: Polling de Confirmação com Timeout

**User Story:** Como sistema de pagamento, eu quero aguardar a confirmação do pagamento de forma eficiente, para que eu possa processar a assinatura apenas após confirmação real.

#### Acceptance Criteria

1. WHEN um pagamento é criado THEN THE Polling_Service SHALL verificar o status a cada 1 segundo
2. WHEN o status é PAYMENT_CONFIRMED THEN THE Polling_Service SHALL interromper o polling e prosseguir com a criação da assinatura
3. WHEN 15 segundos se passam sem confirmação THEN THE Polling_Service SHALL interromper o polling e reportar timeout
4. WHEN o polling está ativo THEN THE System SHALL fornecer feedback visual de progresso ao usuário
5. THE Polling_Service SHALL registrar cada tentativa de verificação para auditoria

### Requirement 4: Webhook Idempotente com Retry

**User Story:** Como sistema de integração, eu quero processar webhooks do Asaas de forma idempotente, para que notificações duplicadas não causem problemas no sistema.

#### Acceptance Criteria

1. WHEN um webhook é recebido THEN THE Webhook_Handler SHALL verificar se o asaas_event_id já foi processado
2. IF o evento já foi processado THEN THE System SHALL retornar sucesso sem reprocessar
3. WHEN o processamento do webhook falha THEN THE System SHALL permitir retry automático do Asaas
4. WHEN um webhook é processado com sucesso THEN THE System SHALL registrar o asaas_event_id para evitar duplicação
5. THE Webhook_Handler SHALL validar a assinatura do webhook antes de processar

### Requirement 5: Criação de Assinatura Recorrente

**User Story:** Como usuário que confirmou o pagamento da primeira mensalidade, eu quero que minha assinatura recorrente seja criada automaticamente, para que eu não precise me preocupar com pagamentos futuros.

#### Acceptance Criteria

1. WHEN a primeira mensalidade é confirmada THEN THE Subscription_Manager SHALL criar assinatura recorrente usando /v3/subscriptions
2. WHEN a assinatura é criada THEN THE System SHALL configurar cobrança mensal automática
3. WHEN a assinatura é ativada THEN THE System SHALL notificar o usuário sobre a criação
4. THE Subscription_Manager SHALL associar a assinatura ao usuário no banco de dados
5. IF a criação da assinatura falha THEN THE System SHALL registrar o erro e permitir retry manual

### Requirement 6: Ativação Automática do Usuário

**User Story:** Como usuário que completou o pagamento, eu quero ser ativado automaticamente no sistema, para que eu tenha acesso imediato aos serviços contratados.

#### Acceptance Criteria

1. WHEN o pagamento é confirmado THEN THE User_Activator SHALL ativar o usuário no sistema
2. WHEN o usuário é ativado THEN THE System SHALL conceder acesso aos recursos da assinatura
3. WHEN a ativação é concluída THEN THE System SHALL enviar notificação de boas-vindas
4. THE User_Activator SHALL atualizar o status do usuário no banco de dados
5. IF a ativação falha THEN THE System SHALL registrar o erro e permitir retry manual

### Requirement 7: Logs Estruturados para Debug

**User Story:** Como desenvolvedor mantendo o sistema, eu quero logs estruturados e detalhados, para que eu possa debugar problemas e monitorar o desempenho do fluxo de pagamento.

#### Acceptance Criteria

1. WHEN qualquer operação é executada THEN THE System SHALL registrar logs estruturados com timestamp, nível e contexto
2. WHEN um erro ocorre THEN THE System SHALL registrar stack trace completo e dados de contexto
3. WHEN o fluxo é completado THEN THE System SHALL registrar métricas de performance e sucesso
4. THE System SHALL usar níveis de log apropriados (DEBUG, INFO, WARN, ERROR)
5. THE System SHALL incluir correlation IDs para rastrear requisições através de múltiplos serviços

### Requirement 8: Integração Frontend Transparente

**User Story:** Como usuário final, eu quero que o novo fluxo de pagamento seja transparente, para que eu não perceba mudanças na experiência de uso.

#### Acceptance Criteria

1. WHEN o usuário inicia um pagamento THEN THE Frontend SHALL manter a mesma interface atual
2. WHEN o polling está ativo THEN THE Frontend SHALL exibir loading states apropriados
3. WHEN erros ocorrem THEN THE Frontend SHALL exibir mensagens de erro amigáveis
4. WHEN o pagamento é confirmado THEN THE Frontend SHALL exibir feedback de sucesso
5. THE Frontend SHALL fornecer indicadores visuais de progresso durante o processamento

### Requirement 9: Tratamento de Erros Robusto

**User Story:** Como sistema de pagamento, eu quero tratar todos os tipos de erro de forma robusta, para que falhas não deixem o sistema em estado inconsistente.

#### Acceptance Criteria

1. WHEN a API do Asaas está indisponível THEN THE System SHALL implementar retry com backoff exponencial
2. WHEN dados inválidos são fornecidos THEN THE System SHALL validar e retornar erros específicos
3. WHEN timeouts ocorrem THEN THE System SHALL cancelar operações pendentes e notificar o usuário
4. WHEN falhas de rede acontecem THEN THE System SHALL tentar reconectar automaticamente
5. THE System SHALL manter estado consistente mesmo em caso de falhas parciais

### Requirement 10: Detecção Correta de Produto IA

**User Story:** Como sistema de IA, eu quero receber informações corretas sobre os produtos sendo adquiridos, para que eu possa processar adequadamente as funcionalidades de IA.

#### Acceptance Criteria

1. WHEN um pagamento é criado THEN THE System SHALL incluir Order_Items completos na requisição
2. WHEN Order_Items são enviados THEN THE System SHALL incluir ID, nome, quantidade e valor de cada item
3. WHEN o produto tem funcionalidades IA THEN THE System SHALL marcar adequadamente nos metadados
4. THE System SHALL validar que Order_Items não estão vazios antes de enviar para Asaas
5. WHEN a detecção falha THEN THE System SHALL registrar erro específico e interromper o processo

### Requirement 11: Orquestrador Central (PaymentFirstFlowService)

**User Story:** Como sistema de pagamento, eu quero um orquestrador central que coordene todo o fluxo de Payment First, para que a execução seja controlada e rastreável.

#### Acceptance Criteria

1. THE PaymentFirstFlowService SHALL ser o único ponto de entrada para processamento de assinaturas
2. WHEN uma requisição de assinatura é recebida THEN THE PaymentFirstFlowService SHALL coordenar a sequência exata de Edge Functions
3. THE PaymentFirstFlowService SHALL manter estado do fluxo durante toda a execução
4. WHEN uma etapa falha THEN THE PaymentFirstFlowService SHALL implementar rollback apropriado
5. THE PaymentFirstFlowService SHALL registrar cada transição de estado para auditoria

### Requirement 12: Sequência de Execução Obrigatória

**User Story:** Como desenvolvedor do sistema, eu quero uma sequência de execução bem definida e obrigatória, para que o fluxo seja previsível e confiável.

#### Acceptance Criteria

1. THE System SHALL seguir a sequência: Create Payment → Poll Status → Create Subscription → Activate User
2. WHEN uma etapa é completada THEN THE System SHALL validar pré-condições da próxima etapa
3. THE System SHALL definir estados intermediários permitidos (PENDING, PROCESSING, CONFIRMED, FAILED)
4. WHEN timeout ou falha ocorre THEN THE System SHALL implementar rollback para estado consistente
5. THE System SHALL impedir execução fora de ordem das etapas

### Requirement 13: Adapter Pattern para Conversão de Dados

**User Story:** Como sistema integrado, eu quero conversores de dados padronizados, para que transformações entre sistemas sejam consistentes e validadas.

#### Acceptance Criteria

1. THE System SHALL implementar adapters para conversão entre formatos internos e Asaas API
2. WHEN dados são enviados para Asaas THEN THE Adapter SHALL validar formato e campos obrigatórios
3. WHEN dados são recebidos do Asaas THEN THE Adapter SHALL transformar para formato interno
4. THE Adapters SHALL implementar validação de schema em ambas as direções
5. WHEN conversão falha THEN THE Adapter SHALL registrar erro específico e interromper processo

### Requirement 14: Preservação do Sistema de Pagamento Existente

**User Story:** Como sistema em produção, eu quero que o novo fluxo de assinaturas não interfira no sistema de pagamento de produtos físicos existente, para que as vendas atuais continuem funcionando sem interrupção.

#### Acceptance Criteria

1. WHEN o novo fluxo é implementado THEN THE System SHALL manter total isolamento do sistema de pagamento de produtos físicos
2. WHEN APIs são modificadas THEN THE System SHALL preservar todas as rotas e funcionalidades existentes para produtos físicos
3. WHEN novos serviços são criados THEN THE System SHALL usar namespaces e identificadores únicos para evitar conflitos
4. WHEN o banco de dados é alterado THEN THE System SHALL adicionar apenas novas tabelas/campos sem modificar estruturas existentes
5. THE System SHALL implementar feature flags para permitir rollback imediato se necessário
6. WHEN testes são executados THEN THE System SHALL validar que funcionalidades de produtos físicos permanecem intactas
7. THE System SHALL usar diferentes endpoints/rotas para assinaturas vs produtos físicos
8. WHEN configurações do Asaas são alteradas THEN THE System SHALL manter compatibilidade com integrações existentes

### Requirement 15: Arquitetura Baseada no Sistema Comademig

**User Story:** Como desenvolvedor do sistema, eu quero implementar a arquitetura comprovada do sistema Comademig, para que o fluxo de pagamento seja robusto e confiável como o sistema de referência.

#### Acceptance Criteria

1. THE System SHALL implementar arquitetura baseada no Comademig com Edge Functions separadas para cada responsabilidade
2. THE PaymentFirstFlowService SHALL coordenar todas as Edge Functions na sequência obrigatória definida no Comademig
3. WHEN processando primeira mensalidade THEN THE System SHALL usar /v3/payments endpoint (nunca /v3/subscriptions)
4. THE Polling_Service SHALL respeitar timeout de 15 segundos e interval de 1 segundo com logs de auditoria
5. THE Webhook_Handler SHALL ser idempotente com validação de assinatura como no Comademig
6. THE System SHALL validar Order_Items rigorosamente antes de envio para Asaas (nunca vazio)
7. THE System SHALL criar assinatura recorrente apenas após confirmação de pagamento
8. THE Adapters SHALL converter dados corretamente entre formatos internos e Asaas API

### Requirement 16: Isolamento Total do Sistema Existente

**User Story:** Como sistema em produção, eu quero isolamento total entre o novo sistema de assinaturas e o sistema de produtos físicos, para que não haja interferência entre os dois fluxos.

#### Acceptance Criteria

1. THE System SHALL manter isolamento total do sistema de produtos físicos existente
2. THE Database SHALL usar namespace 'subscription_' para todas as novas tabelas
3. THE APIs SHALL usar rotas '/api/subscriptions/' separadas das rotas existentes
4. THE Edge_Functions SHALL ficar em pasta 'supabase/functions/subscriptions/' isolada

### Requirement 17: Logs Estruturados e Auditoria Completa

**User Story:** Como desenvolvedor mantendo o sistema, eu quero logs estruturados completos com auditoria, para que eu possa debugar problemas e rastrear todas as operações.

#### Acceptance Criteria

1. THE System SHALL implementar logs estruturados com correlation IDs únicos para cada fluxo
2. THE Polling_Service SHALL criar logs de auditoria para cada tentativa de verificação
3. THE Webhook_Handler SHALL registrar todos os eventos processados com payloads completos
4. THE System SHALL implementar retry automático com backoff exponencial para falhas temporárias

### Requirement 18: Sistema de Comissões Baseado em Order Items

**User Story:** Como sistema de afiliados, eu quero que as comissões sejam calculadas corretamente baseado nos Order Items, para que os afiliados recebam as comissões adequadas.

#### Acceptance Criteria

1. THE System SHALL validar Wallet IDs antes de processar splits de comissão
2. THE Commissions SHALL ser calculadas corretamente baseado em Order Items enviados
3. THE System SHALL processar splits automaticamente após confirmação de pagamento

### Requirement 19: Feature Flags e Monitoramento

**User Story:** Como administrador do sistema, eu quero feature flags e monitoramento completo, para que eu possa controlar o fluxo e detectar problemas rapidamente.

#### Acceptance Criteria

1. THE System SHALL implementar feature flags para controle de fluxo de assinaturas
2. THE System SHALL ter fallback para processamento manual em caso de falhas críticas
3. THE System SHALL implementar monitoramento e alertas para todas as operações críticas