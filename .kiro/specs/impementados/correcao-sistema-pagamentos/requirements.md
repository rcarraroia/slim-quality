# Requirements Document

## Introduction

Sistema de correção crítica para o módulo de pagamentos e afiliados da Slim Quality. O sistema atual está completamente implementado mas nunca foi ativado devido a integrações incorretas com a API do Asaas, webhooks incompletos e rastreamento de afiliados inexistente. Esta correção é crítica pois cada venda sem afiliado resulta em perda de R$ 150 para a fábrica, e afiliados não estão recebendo suas comissões devidas.

## Glossary

- **Sistema_Pagamentos**: Módulo responsável por processar pagamentos via Asaas
- **Sistema_Afiliados**: Módulo responsável por gerenciar rede de afiliados e comissões
- **Asaas_API**: Gateway de pagamento e split automático
- **Split_Automático**: Divisão automática do valor da venda entre participantes
- **Webhook_Handler**: Serviço que processa notificações do Asaas
- **ReferralTracker**: Sistema de rastreamento de códigos de indicação
- **OrderProcessor**: Processador de pedidos com cálculo de comissões
- **CommissionCalculator**: Calculadora de comissões multinível
- **Wallet_ID**: Identificador único da carteira no Asaas (formato: wal_xxxxx)
- **Rede_Genealógica**: Estrutura hierárquica de afiliados (N1, N2, N3)

## Requirements

### Requirement 1: Correção da Integração Asaas Split

**User Story:** Como sistema de pagamentos, eu quero integrar corretamente com a API do Asaas para split automático, para que as comissões sejam distribuídas automaticamente no momento do pagamento.

#### Acceptance Criteria

1. WHEN um pagamento é criado no Asaas, THE Sistema_Pagamentos SHALL incluir o split na mesma requisição de criação
2. WHEN o split é calculado, THE Sistema_Pagamentos SHALL usar apenas 30% do valor total para distribuição
3. WHEN não há afiliados, THE Sistema_Pagamentos SHALL distribuir 15% para cada gestor (Renum e JB)
4. WHEN há afiliado N1, THE Sistema_Pagamentos SHALL distribuir 15% para N1 e 7.5% para cada gestor
5. WHEN há rede N1+N2, THE Sistema_Pagamentos SHALL distribuir 15% para N1, 3% para N2 e 6% para cada gestor
6. WHEN há rede completa N1+N2+N3, THE Sistema_Pagamentos SHALL distribuir 15% para N1, 3% para N2, 2% para N3 e 5% para cada gestor
7. THE Sistema_Pagamentos SHALL validar todas as Wallet IDs antes de enviar o split
8. THE Sistema_Pagamentos SHALL usar formato correto de Wallet ID (wal_xxxxx) ao invés de UUIDs

### Requirement 2: Implementação do Webhook Handler

**User Story:** Como sistema de pagamentos, eu quero processar webhooks do Asaas automaticamente, para que as comissões sejam calculadas e registradas quando o pagamento for confirmado.

#### Acceptance Criteria

1. WHEN um webhook do Asaas é recebido, THE Webhook_Handler SHALL validar o token de autenticação
2. WHEN o evento é PAYMENT_RECEIVED, THE Webhook_Handler SHALL iniciar o cálculo de comissões
3. WHEN o evento é PAYMENT_CONFIRMED, THE Webhook_Handler SHALL confirmar as comissões no banco
4. WHEN o evento é PAYMENT_SPLIT_CANCELLED, THE Webhook_Handler SHALL registrar erro e notificar administradores
5. WHEN o evento é PAYMENT_SPLIT_DIVERGENCE_BLOCK, THE Webhook_Handler SHALL investigar e corrigir divergências
6. THE Webhook_Handler SHALL registrar logs detalhados de todos os eventos processados
7. THE Webhook_Handler SHALL implementar retry automático para falhas temporárias
8. THE Webhook_Handler SHALL notificar afiliados sobre comissões recebidas

### Requirement 3: Sistema de Rastreamento de Afiliados

**User Story:** Como visitante do site, eu quero que meu código de indicação seja rastreado automaticamente, para que o afiliado que me indicou receba a comissão devida.

#### Acceptance Criteria

1. WHEN um visitante acessa uma URL com parâmetro ?ref=CODIGO, THE ReferralTracker SHALL capturar e armazenar o código
2. WHEN o código é capturado, THE ReferralTracker SHALL armazenar no localStorage com TTL de 30 dias
3. WHEN o visitante finaliza uma compra, THE ReferralTracker SHALL recuperar o código armazenado
4. WHEN o código é recuperado no checkout, THE Sistema_Pagamentos SHALL associar o pedido ao afiliado correspondente
5. WHEN a compra é confirmada, THE ReferralTracker SHALL limpar o código do localStorage
6. THE ReferralTracker SHALL registrar todos os cliques em referral_clicks
7. THE ReferralTracker SHALL registrar todas as conversões em referral_conversions
8. THE ReferralTracker SHALL funcionar mesmo com cookies desabilitados

### Requirement 4: Ativação do Sistema de Comissões

**User Story:** Como OrderProcessor, eu quero processar automaticamente as comissões quando um pagamento for confirmado, para que os afiliados recebam suas comissões sem intervenção manual.

#### Acceptance Criteria

1. WHEN um webhook de pagamento confirmado é recebido, THE OrderProcessor SHALL identificar se há afiliado associado
2. WHEN há afiliado associado, THE OrderProcessor SHALL buscar a rede genealógica completa
3. WHEN a rede é identificada, THE CommissionCalculator SHALL calcular os valores corretos para cada nível
4. WHEN as comissões são calculadas, THE Sistema_Afiliados SHALL criar registros na tabela commissions
5. WHEN as comissões são registradas, THE Sistema_Afiliados SHALL atualizar métricas dos afiliados
6. THE OrderProcessor SHALL processar apenas uma vez cada pagamento (evitar duplicação)
7. THE OrderProcessor SHALL registrar logs detalhados para auditoria
8. THE OrderProcessor SHALL notificar afiliados sobre comissões recebidas

### Requirement 5: Validação e Correção de Wallet IDs

**User Story:** Como sistema de afiliados, eu quero validar todas as Wallet IDs antes de processar splits, para que não haja falhas de pagamento por IDs inválidas.

#### Acceptance Criteria

1. WHEN um afiliado é cadastrado, THE Sistema_Afiliados SHALL validar a Wallet ID via API do Asaas
2. WHEN uma Wallet ID é inválida, THE Sistema_Afiliados SHALL rejeitar o cadastro com mensagem específica
3. WHEN um split é processado, THE Sistema_Pagamentos SHALL revalidar todas as Wallet IDs envolvidas
4. WHEN uma Wallet ID se torna inválida, THE Sistema_Afiliados SHALL notificar o afiliado para atualização
5. THE Sistema_Afiliados SHALL manter histórico de validações de Wallet IDs
6. THE Sistema_Afiliados SHALL corrigir Wallet IDs existentes no formato UUID para formato Asaas
7. THE Sistema_Afiliados SHALL ativar afiliados com Wallet IDs válidas
8. THE Sistema_Afiliados SHALL implementar processo de revalidação periódica

### Requirement 6: Configuração Completa de Webhooks

**User Story:** Como sistema de integração, eu quero configurar todos os webhooks necessários no Asaas, para que todos os eventos relevantes sejam processados automaticamente.

#### Acceptance Criteria

1. THE Sistema_Pagamentos SHALL configurar webhook para evento PAYMENT_RECEIVED
2. THE Sistema_Pagamentos SHALL configurar webhook para evento PAYMENT_CONFIRMED  
3. THE Sistema_Pagamentos SHALL configurar webhook para evento PAYMENT_SPLIT_CANCELLED
4. THE Sistema_Pagamentos SHALL configurar webhook para evento PAYMENT_SPLIT_DIVERGENCE_BLOCK
5. THE Sistema_Pagamentos SHALL configurar webhook para evento PAYMENT_OVERDUE
6. THE Sistema_Pagamentos SHALL configurar webhook para evento PAYMENT_REFUNDED
7. WHEN webhooks são configurados, THE Sistema_Pagamentos SHALL usar token de autenticação seguro
8. THE Sistema_Pagamentos SHALL validar que todos os webhooks estão ativos e funcionais

### Requirement 7: Logs e Auditoria Completa

**User Story:** Como administrador do sistema, eu quero logs detalhados de todos os processos de pagamento e comissões, para que possa auditar e resolver problemas rapidamente.

#### Acceptance Criteria

1. WHEN um split é processado, THE Sistema_Pagamentos SHALL registrar log detalhado com todos os valores
2. WHEN uma comissão é calculada, THE CommissionCalculator SHALL registrar log com a lógica aplicada
3. WHEN um webhook é processado, THE Webhook_Handler SHALL registrar log com payload completo
4. WHEN um erro ocorre, THE Sistema_Pagamentos SHALL registrar log com stack trace e contexto
5. THE Sistema_Pagamentos SHALL manter logs por no mínimo 12 meses
6. THE Sistema_Pagamentos SHALL permitir busca de logs por pedido, afiliado ou período
7. THE Sistema_Pagamentos SHALL gerar relatórios de auditoria automáticos
8. THE Sistema_Pagamentos SHALL alertar administradores sobre erros críticos

### Requirement 8: Dashboard de Afiliados Real

**User Story:** Como afiliado, eu quero visualizar minhas comissões reais e rede genealógica, para que possa acompanhar meu desempenho e ganhos.

#### Acceptance Criteria

1. WHEN um afiliado acessa o dashboard, THE Sistema_Afiliados SHALL exibir comissões reais do banco de dados
2. WHEN comissões são exibidas, THE Sistema_Afiliados SHALL mostrar valores, datas e status de cada comissão
3. WHEN a rede é visualizada, THE Sistema_Afiliados SHALL exibir árvore genealógica real com N1, N2, N3
4. WHEN métricas são mostradas, THE Sistema_Afiliados SHALL calcular valores reais de vendas e comissões
5. THE Sistema_Afiliados SHALL permitir filtros por período e status
6. THE Sistema_Afiliados SHALL exibir histórico de pagamentos recebidos
7. THE Sistema_Afiliados SHALL mostrar links de indicação ativos
8. THE Sistema_Afiliados SHALL exibir métricas de conversão (cliques → vendas)

### Requirement 9: Processamento Automático Completo

**User Story:** Como sistema automatizado, eu quero processar todo o fluxo de venda → comissão → split sem intervenção manual, para que o sistema funcione de forma autônoma e confiável.

#### Acceptance Criteria

1. WHEN um visitante clica em link de afiliado, THE Sistema_Pagamentos SHALL rastrear automaticamente
2. WHEN uma compra é finalizada, THE Sistema_Pagamentos SHALL associar automaticamente ao afiliado
3. WHEN um pagamento é criado, THE Sistema_Pagamentos SHALL incluir split automaticamente
4. WHEN um pagamento é confirmado, THE Sistema_Pagamentos SHALL calcular comissões automaticamente
5. WHEN comissões são calculadas, THE Sistema_Pagamentos SHALL registrar no banco automaticamente
6. WHEN split é processado, THE Sistema_Pagamentos SHALL notificar afiliados automaticamente
7. THE Sistema_Pagamentos SHALL funcionar 24/7 sem intervenção manual
8. THE Sistema_Pagamentos SHALL ter taxa de sucesso > 99% no processamento automático

### Requirement 10: Validações de Segurança e Integridade

**User Story:** Como sistema financeiro, eu quero validações rigorosas em todos os processos de pagamento, para que não haja perdas financeiras ou fraudes.

#### Acceptance Criteria

1. WHEN um split é calculado, THE Sistema_Pagamentos SHALL validar que a soma total = 30%
2. WHEN Wallet IDs são usadas, THE Sistema_Pagamentos SHALL validar formato e existência
3. WHEN comissões são processadas, THE Sistema_Pagamentos SHALL evitar processamento duplicado
4. WHEN webhooks são recebidos, THE Webhook_Handler SHALL validar origem e autenticidade
5. THE Sistema_Pagamentos SHALL implementar rate limiting para webhooks
6. THE Sistema_Pagamentos SHALL criptografar dados sensíveis em logs
7. THE Sistema_Pagamentos SHALL implementar rollback automático para falhas críticas
8. THE Sistema_Pagamentos SHALL alertar sobre tentativas de fraude ou manipulação