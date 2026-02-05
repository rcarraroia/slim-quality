# Requirements Document - Sprint 3: Sistema de Vendas

## Introduction

Este documento define os requisitos para o Sprint 3 do projeto Slim Quality Backend. O objetivo é implementar um sistema completo de vendas com integração ao gateway de pagamento Asaas, suportando pagamentos via PIX e Cartão de Crédito. Este sprint estabelece a base para o sistema de comissões de afiliados (Sprint 4).

**Contexto:** O sistema de produtos (Sprint 2) está completo. Agora precisamos permitir que clientes façam pedidos e paguem pelos produtos. A integração com Asaas é crítica para processar pagamentos e preparar o split de comissões.

## Glossary

- **Sistema**: Slim Quality Backend
- **Order**: Pedido realizado por um cliente
- **Order Item**: Item individual dentro de um pedido
- **Payment**: Pagamento associado a um pedido
- **Asaas**: Gateway de pagamento brasileiro
- **PIX**: Sistema de pagamento instantâneo brasileiro
- **Split**: Divisão automática do valor recebido entre múltiplas contas
- **Webhook**: Notificação HTTP enviada pelo Asaas quando eventos ocorrem
- **Charge**: Cobrança criada no Asaas
- **Customer**: Cliente cadastrado no Asaas
- **Wallet ID**: Identificador único da carteira no Asaas
- **Soft Delete**: Exclusão lógica mantendo registro no banco com deleted_at

## Requirements

### Requirement 1: Criação de Pedidos

**User Story:** Como cliente, eu quero criar um pedido com produtos selecionados, para que eu possa efetuar a compra.

#### Acceptance Criteria

1. WHEN um cliente cria um pedido, THE Sistema SHALL validar que todos os produtos existem e estão ativos
2. WHEN um pedido é criado, THE Sistema SHALL calcular o valor total baseado nos preços atuais dos produtos
3. WHEN um pedido é criado, THE Sistema SHALL gerar um número único de pedido
4. WHEN um pedido é criado, THE Sistema SHALL inicializar o status como 'pending'
5. WHEN um pedido é criado, THE Sistema SHALL registrar o endereço de entrega fornecido

### Requirement 2: Integração com Asaas - Clientes

**User Story:** Como sistema, eu quero cadastrar clientes no Asaas, para que eu possa criar cobranças para eles.

#### Acceptance Criteria

1. WHEN um pedido é criado, THE Sistema SHALL verificar se o cliente já existe no Asaas
2. IF cliente não existe no Asaas, THEN THE Sistema SHALL criar um novo customer no Asaas
3. WHEN cliente é criado no Asaas, THE Sistema SHALL armazenar o customer_id retornado
4. WHEN cliente é criado no Asaas, THE Sistema SHALL validar CPF/CNPJ se fornecido
5. THE Sistema SHALL sincronizar dados do cliente entre banco local e Asaas

### Requirement 3: Geração de Pagamento PIX

**User Story:** Como cliente, eu quero pagar via PIX, para que eu possa finalizar minha compra instantaneamente.

#### Acceptance Criteria

1. WHEN cliente escolhe PIX, THE Sistema SHALL criar uma cobrança PIX no Asaas
2. WHEN cobrança PIX é criada, THE Sistema SHALL retornar QR Code e código copia-e-cola
3. WHEN cobrança PIX é criada, THE Sistema SHALL definir vencimento de 30 minutos
4. WHEN cobrança PIX é criada, THE Sistema SHALL registrar transação no banco local
5. THE Sistema SHALL permitir consultar status da cobrança PIX

### Requirement 4: Geração de Pagamento Cartão

**User Story:** Como cliente, eu quero pagar com cartão de crédito, para que eu possa parcelar minha compra.

#### Acceptance Criteria

1. WHEN cliente escolhe cartão, THE Sistema SHALL criar uma cobrança de cartão no Asaas
2. WHEN cobrança de cartão é criada, THE Sistema SHALL suportar parcelamento em até 12x
3. WHEN cobrança de cartão é criada, THE Sistema SHALL validar dados do cartão via Asaas
4. WHEN cobrança de cartão é criada, THE Sistema SHALL registrar transação no banco local
5. THE Sistema SHALL retornar status de aprovação/rejeição imediatamente

### Requirement 5: Webhook de Confirmação

**User Story:** Como sistema, eu quero receber notificações do Asaas, para que eu possa atualizar status dos pedidos automaticamente.

#### Acceptance Criteria

1. WHEN Asaas envia webhook, THE Sistema SHALL validar assinatura do webhook
2. WHEN webhook de PAYMENT_CONFIRMED é recebido, THE Sistema SHALL atualizar status do pedido para 'paid'
3. WHEN webhook de PAYMENT_RECEIVED é recebido, THE Sistema SHALL confirmar recebimento do valor
4. WHEN webhook de PAYMENT_OVERDUE é recebido, THE Sistema SHALL marcar pagamento como vencido
5. THE Sistema SHALL registrar todos os webhooks recebidos em logs para auditoria

### Requirement 6: Preparação de Split de Comissões

**User Story:** Como sistema, eu quero preparar a estrutura de split, para que no Sprint 4 eu possa distribuir comissões automaticamente.

#### Acceptance Criteria

1. WHEN pagamento é confirmado, THE Sistema SHALL calcular 70% para fábrica e 30% para comissões
2. WHEN split é preparado, THE Sistema SHALL registrar em tabela asaas_splits
3. WHEN split é preparado, THE Sistema SHALL incluir Wallet ID da fábrica
4. WHEN split é preparado, THE Sistema SHALL reservar 30% para distribuição futura de comissões
5. THE Sistema SHALL permitir consultar splits preparados para auditoria

### Requirement 7: Gestão de Status de Pedidos

**User Story:** Como sistema, eu quero gerenciar o ciclo de vida dos pedidos, para que eu possa rastrear o progresso de cada venda.

#### Acceptance Criteria

1. THE Sistema SHALL suportar os status: pending, paid, processing, shipped, delivered, cancelled
2. WHEN status de pedido muda, THE Sistema SHALL registrar em order_status_history
3. WHEN status de pedido muda, THE Sistema SHALL registrar timestamp e usuário responsável
4. THE Sistema SHALL validar transições de status permitidas
5. THE Sistema SHALL permitir consultar histórico completo de mudanças de status

### Requirement 8: Atualização de Estoque

**User Story:** Como sistema, eu quero atualizar o estoque automaticamente, para que eu mantenha controle preciso da disponibilidade.

#### Acceptance Criteria

1. WHEN pedido é confirmado (paid), THE Sistema SHALL reduzir estoque dos produtos
2. WHEN pedido é cancelado, THE Sistema SHALL devolver estoque dos produtos
3. WHEN estoque é atualizado, THE Sistema SHALL registrar movimentação em inventory_logs
4. WHEN estoque fica negativo, THE Sistema SHALL permitir mas registrar alerta
5. THE Sistema SHALL referenciar order_id nas movimentações de estoque

### Requirement 9: APIs Públicas de Pedidos

**User Story:** Como cliente, eu quero consultar meus pedidos, para que eu possa acompanhar o status das minhas compras.

#### Acceptance Criteria

1. WHEN cliente acessa GET /api/orders/my-orders, THE Sistema SHALL retornar apenas pedidos do usuário autenticado
2. WHEN cliente acessa GET /api/orders/:id, THE Sistema SHALL retornar detalhes completos do pedido
3. WHEN cliente acessa GET /api/orders/:id/status, THE Sistema SHALL retornar status atual e histórico
4. THE Sistema SHALL exigir autenticação para todas as rotas de pedidos
5. THE Sistema SHALL retornar erro 404 se pedido não pertencer ao usuário

### Requirement 10: APIs Administrativas de Pedidos

**User Story:** Como administrador, eu quero gerenciar todos os pedidos, para que eu possa dar suporte aos clientes.

#### Acceptance Criteria

1. WHEN admin acessa GET /api/admin/orders, THE Sistema SHALL retornar todos os pedidos com paginação
2. WHEN admin acessa GET /api/admin/orders/:id, THE Sistema SHALL retornar detalhes completos incluindo dados sensíveis
3. WHEN admin atualiza status via PUT /api/admin/orders/:id/status, THE Sistema SHALL validar permissões
4. WHEN admin consulta GET /api/admin/orders/stats, THE Sistema SHALL retornar estatísticas de vendas
5. THE Sistema SHALL exigir role 'admin' para todas as rotas administrativas

### Requirement 11: Validação de Dados

**User Story:** Como desenvolvedor, eu quero validação robusta de pedidos, para que dados inválidos sejam rejeitados.

#### Acceptance Criteria

1. WHEN dados de pedido são recebidos, THE Sistema SHALL validar usando schemas Zod
2. WHEN endereço é inválido, THE Sistema SHALL retornar erro HTTP 400
3. WHEN produto não existe, THE Sistema SHALL retornar erro HTTP 404
4. WHEN quantidade é inválida (zero ou negativa), THE Sistema SHALL retornar erro HTTP 400
5. THE Sistema SHALL sanitizar entrada para prevenir SQL injection e XSS

### Requirement 12: Segurança de Webhooks

**User Story:** Como sistema, eu quero garantir que webhooks são autênticos, para que eu não processe notificações falsas.

#### Acceptance Criteria

1. WHEN webhook é recebido, THE Sistema SHALL validar assinatura usando secret do Asaas
2. WHEN assinatura é inválida, THE Sistema SHALL rejeitar webhook com HTTP 401
3. WHEN webhook é duplicado, THE Sistema SHALL detectar e ignorar
4. THE Sistema SHALL registrar tentativas de webhook inválido para segurança
5. THE Sistema SHALL usar HTTPS para endpoint de webhook em produção

### Requirement 13: Logs e Auditoria

**User Story:** Como desenvolvedor, eu quero logs completos de transações, para que eu possa debugar problemas e auditar vendas.

#### Acceptance Criteria

1. WHEN transação Asaas é criada, THE Sistema SHALL registrar em asaas_transactions
2. WHEN webhook é recebido, THE Sistema SHALL registrar em asaas_webhook_logs
3. WHEN erro ocorre na integração Asaas, THE Sistema SHALL registrar detalhes do erro
4. THE Sistema SHALL incluir timestamps precisos em todos os logs
5. THE Sistema SHALL permitir consultar logs por pedido, cliente ou data

### Requirement 14: Tratamento de Erros

**User Story:** Como sistema, eu quero tratar erros da API Asaas graciosamente, para que eu não deixe pedidos em estado inconsistente.

#### Acceptance Criteria

1. WHEN API Asaas retorna erro, THE Sistema SHALL registrar erro e retornar mensagem amigável
2. WHEN timeout ocorre, THE Sistema SHALL implementar retry com backoff exponencial
3. WHEN erro é irrecuperável, THE Sistema SHALL marcar pedido como 'error' e notificar admin
4. THE Sistema SHALL manter pedido em estado consistente mesmo com falhas
5. THE Sistema SHALL permitir reprocessar pedidos com erro manualmente

### Requirement 15: Performance e Otimização

**User Story:** Como usuário, eu quero que o checkout seja rápido, para que eu tenha boa experiência de compra.

#### Acceptance Criteria

1. WHEN pedido é criado, THE Sistema SHALL responder em menos de 2 segundos
2. WHEN pagamento é gerado, THE Sistema SHALL responder em menos de 3 segundos
3. THE Sistema SHALL usar índices de banco para queries de pedidos
4. THE Sistema SHALL cachear dados de produtos durante criação de pedido
5. THE Sistema SHALL processar webhooks de forma assíncrona quando possível
