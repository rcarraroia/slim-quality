# Implementation Plan - Sprint 3: Sistema de Vendas

## ⚠️ IMPORTANTE - Atualizado com Documentação Oficial Asaas

Este plano foi atualizado baseado na análise completa da documentação oficial do Asaas. Principais mudanças:




1. **Split de Pagamentos:** Configurado NA CRIAÇÃO da cobrança (não depois) e executado automaticamente
2. **Webhooks:** Validação via authToken (header: asaas-access-token) + idempotência obrigatória
3. **Campos Corretos:** cpfCnpj, postalCode, mobilePhone (não customer_cpf, postal_code)
4. **remoteIp:** Obrigatório para pagamentos com cartão
5. **SplitService:** Removido (não é necessário - split é automático)

Consulte `.kiro/specs/sprint-3-vendas/AJUSTES_ASAAS_API.md` para detalhes completos.


---

## Task List

- [x] 1. Criar estrutura de banco de dados de vendas


  - Criar migration para tabela orders com campos preparatórios para afiliados + remote_ip

  - Criar migration para tabela order_items
  - Criar migration para tabela order_status_history
  - Criar migration para tabela payments (status: pending, confirmed, received, overdue, refunded, cancelled, authorized)
  - Criar migration para tabela shipping_addresses
  - Criar função generate_order_number() para gerar números únicos
  - Criar trigger para gerar order_number automaticamente
  - Criar políticas RLS para orders e payments
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3_

- [x] 2. Criar estrutura de integração Asaas
  - [x] 2.1 Criar tabelas de integração
    - Criar migration para tabela asaas_transactions
    - Criar migration para tabela asaas_splits (OPCIONAL - apenas auditoria)
    - Criar migration para tabela asaas_webhook_logs com asaas_event_id UNIQUE (idempotência)
    - Criar índices para performance
    - _Requirements: 2.1, 2.2, 6.1, 6.2, 13.1, 13.2_
  
  - [x] 2.2 Configurar variáveis de ambiente


    - Adicionar ASAAS_API_KEY no .env
    - Adicionar ASAAS_WALLET_RENUM no .env (não incluir fábrica - ela recebe o restante)
    - Adicionar ASAAS_WALLET_JB no .env
    - Adicionar ASAAS_WEBHOOK_TOKEN no .env (authToken para validação)
    - Adicionar ASAAS_ENVIRONMENT (sandbox/production) no .env
    - _Requirements: Configuração_




- [ ] 3. Implementar schemas de validação Zod
  - [ ] 3.1 Criar schemas de pedido
    - CreateOrderSchema (items, shipping_address, customer_cpf)


    - UpdateOrderStatusSchema (status, notes)
    - _Requirements: 11.1, 11.2, 11.3_
  



  - [ ] 3.2 Criar schemas de pagamento
    - CreatePixPaymentSchema
    - CreateCreditCardPaymentSchema (card data, installments até 21x, remote_ip obrigatório)
    - _Requirements: 3.1, 3.2, 4.1, 4.2_



  
  - [ ] 3.3 Criar tipos TypeScript
    - Interface Order, OrderItem, Payment
    - Interface ShippingAddress, OrderStatusHistory
    - Interface AsaasTransaction, AsaasSplit
    - Enums OrderStatus, PaymentMethod, PaymentStatus
    - _Requirements: Tipos gerais_

- [x] 4. Implementar serviços de vendas

  - [x] 4.1 Criar OrderService
    - Método createOrder() para criar pedido
    - Método getOrderById() para buscar pedido
    - Método getMyOrders() para listar pedidos do usuário
    - Método updateOrderStatus() para atualizar status
    - Método cancelOrder() para cancelar pedido
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 9.1, 9.2_
  
  - [x] 4.2 Criar AsaasService


    - Método getOrCreateCustomer() com campos corretos (cpfCnpj, postalCode, mobilePhone)
    - Método calculateSplits() para calcular array de splits (afiliados + gestores)
    - Método createPixPayment() para gerar cobrança PIX COM splits configurados
    - Método createCreditCardPayment() para processar cartão COM splits + remoteIp obrigatório
    - Método getPaymentStatus() para consultar status
    - Método validateWebhookToken() para validar authToken
    - Implementar retry com backoff exponencial
    - Implementar tratamento de erros Asaas
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1, 6.1, 6.2, 12.1, 14.1, 14.2_
  
  - [x] 4.3 Criar WebhookService


    - Método processWebhook() para processar webhooks com validação de authToken
    - Implementar idempotência usando asaas_event_id UNIQUE
    - Método handlePaymentConfirmed() para pagamento confirmado (SEM preparar split)
    - Método handlePaymentReceived() para pagamento recebido
    - Método handlePaymentOverdue() para pagamento vencido
    - Processar eventos de forma assíncrona
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1, 12.2, 12.3_

- [ ] 5. Implementar controllers públicos
  - [x] 5.1 Criar controller de criação de pedido


    - POST /api/orders
    - Validar dados com CreateOrderSchema
    - Validar produtos existem e estão ativos
    - Calcular total no backend
    - Criar pedido, items e shipping_address
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1_
  
  - [x] 5.2 Criar controller de geração de pagamento

    - POST /api/orders/:id/payment
    - Validar pedido pertence ao usuário
    - Validar pedido está em status 'pending'
    - Criar/buscar customer no Asaas
    - Gerar cobrança PIX ou Cartão
    - Salvar payment no banco
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2_
  
  - [x] 5.3 Criar controller de consulta de pedidos

    - GET /api/orders/my-orders (listar pedidos do usuário)
    - GET /api/orders/:id (detalhes do pedido)
    - GET /api/orders/:id/status (status e histórico)
    - Validar ownership
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 6. Implementar controllers administrativos
  - [x] 6.1 Criar controller de listagem de pedidos (admin)


    - GET /api/admin/orders
    - Suportar filtros (status, email, data)
    - Paginar resultados
    - Incluir informações completas
    - _Requirements: 10.1, 10.5_
  

  - [ ] 6.2 Criar controller de detalhes de pedido (admin)
    - GET /api/admin/orders/:id
    - Incluir dados sensíveis
    - Incluir histórico completo
    - _Requirements: 10.2, 10.5_
  

  - [ ] 6.3 Criar controller de atualização de status (admin)
    - PUT /api/admin/orders/:id/status
    - Validar transição de status
    - Registrar em history
    - Executar ações (atualizar estoque, etc)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.3, 10.5_
  

  - [ ] 6.4 Criar controller de estatísticas (admin)
    - GET /api/admin/orders/stats
    - Total de pedidos
    - Receita total
    - Pedidos por status
    - Receita por mês
    - _Requirements: 10.4, 10.5_

- [ ] 7. Implementar webhook handler
  - [x] 7.1 Criar endpoint de webhook


    - POST /webhooks/asaas
    - Validar authToken do header 'asaas-access-token'
    - Implementar idempotência (asaas_event_id UNIQUE)
    - Registrar em webhook_logs
    - Processar evento de forma assíncrona
    - Retornar 200 rapidamente
    - _Requirements: 5.1, 5.5, 12.1, 12.2, 12.3, 12.4_
  

  - [ ] 7.2 Implementar processamento de eventos
    - Handler para PAYMENT_CONFIRMED
    - Handler para PAYMENT_RECEIVED
    - Handler para PAYMENT_OVERDUE
    - Atualizar status de payment e order
    - Reduzir estoque quando confirmado
    - NÃO preparar split (já foi configurado na criação da cobrança)
    - _Requirements: 5.2, 5.3, 5.4, 8.1, 8.2_

- [ ] 8. Configurar rotas da API
  - [x] 8.1 Criar rotas públicas de pedidos


    - POST /api/orders (criar pedido)
    - POST /api/orders/:id/payment (gerar pagamento)
    - GET /api/orders/my-orders (meus pedidos)
    - GET /api/orders/:id (detalhes)
    - GET /api/orders/:id/status (status)
    - Requer autenticação
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 8.2 Criar rotas administrativas de pedidos


    - GET /api/admin/orders (listar todos)
    - GET /api/admin/orders/:id (detalhes)
    - PUT /api/admin/orders/:id/status (atualizar status)
    - GET /api/admin/orders/stats (estatísticas)
    - Requer autenticação + role admin
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 8.3 Criar rota de webhook


    - POST /webhooks/asaas
    - Sem autenticação JWT (usa authToken do Asaas)
    - Middleware para validar authToken
    - Rate limiting específico
    - _Requirements: 5.1, 12.1, 12.2_
  
  - [x] 8.4 Integrar rotas no servidor Express



    - Importar e registrar rotas públicas
    - Importar e registrar rotas administrativas
    - Importar e registrar rota de webhook
    - Aplicar middlewares apropriados
    - _Requirements: Integração geral_

- [x] 9. Implementar integração com estoque

  - [x] 9.1 Criar método de redução de estoque


    - Reduzir estoque quando pedido é confirmado
    - Registrar em inventory_logs com reference_type='order'
    - Incluir order_id na movimentação
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 9.2 Criar método de devolução de estoque

    - Devolver estoque quando pedido é cancelado
    - Registrar em inventory_logs com type='devolucao'
    - _Requirements: 8.2, 8.4_

- [x] 10. Aplicar migrations e validar banco

  - [x] 10.1 Executar migrations no Supabase


    - Aplicar migration de orders
    - Aplicar migration de order_items
    - Aplicar migration de payments
    - Aplicar migration de shipping_addresses
    - Aplicar migration de asaas_transactions
    - Aplicar migration de asaas_splits
    - Aplicar migration de asaas_webhook_logs
    - Aplicar migration de order_status_history
    - Verificar que não há erros
    - _Requirements: Todas as tabelas_
  

  - [x] 10.2 Validar estrutura do banco
    - Verificar que tabelas foram criadas corretamente
    - Verificar que índices existem
    - Verificar que constraints estão ativos
    - Verificar que triggers funcionam
    - Verificar que políticas RLS estão ativas
    - _Requirements: Validação geral_

- [ ] 11. Testar integração Asaas (Sandbox)
  - [ ] 11.1 Testar criação de customer
    - Criar customer no Asaas Sandbox
    - Verificar que customer_id é retornado
    - Verificar que dados estão corretos
    - _Requirements: 2.1, 2.2_
  
  - [ ] 11.2 Testar cobrança PIX
    - Criar cobrança PIX no Sandbox
    - Verificar que QR Code é gerado
    - Verificar que copia-e-cola funciona
    - Simular pagamento no Sandbox
    - Verificar que webhook é recebido
    - _Requirements: 3.1, 3.2, 3.3, 5.2_
  
  - [ ] 11.3 Testar cobrança Cartão
    - Criar cobrança de cartão no Sandbox
    - Usar cartão de teste do Asaas
    - Verificar aprovação
    - Verificar que webhook é recebido
    - _Requirements: 4.1, 4.2, 4.3, 5.2_
  
  - [ ] 11.4 Testar webhooks
    - Configurar URL de webhook no Asaas
    - Simular eventos no Sandbox
    - Verificar que assinatura é validada
    - Verificar que eventos são processados
    - Verificar que logs são criados
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1, 12.2_

- [ ] 12. Validar funcionalidades end-to-end
  - [ ] 12.1 Testar fluxo completo PIX
    - Criar pedido via API
    - Gerar pagamento PIX
    - Simular webhook de confirmação
    - Verificar que status foi atualizado
    - Verificar que estoque foi reduzido
    - Verificar que split foi preparado
    - _Requirements: Fluxo completo PIX_
  
  - [ ] 12.2 Testar fluxo completo Cartão
    - Criar pedido via API
    - Processar pagamento com cartão
    - Verificar aprovação imediata
    - Verificar que status foi atualizado
    - Verificar que estoque foi reduzido
    - Verificar que split foi preparado
    - _Requirements: Fluxo completo Cartão_
  
  - [ ] 12.3 Testar cancelamento de pedido
    - Criar pedido
    - Cancelar pedido
    - Verificar que estoque foi devolvido
    - Verificar que status foi atualizado
    - _Requirements: 7.1, 7.2, 8.2_
  
  - [ ] 12.4 Testar APIs administrativas
    - Listar todos os pedidos (admin)
    - Atualizar status de pedido (admin)
    - Consultar estatísticas (admin)
    - Verificar que requer role admin
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 12.5 Testar validações
    - Tentar criar pedido com produto inválido (deve falhar)
    - Tentar criar pedido com quantidade inválida (deve falhar)
    - Tentar gerar pagamento para pedido de outro usuário (deve falhar)
    - Tentar acessar rota admin sem permissão (deve falhar)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_



- [ ] 13. Integrar frontend com sistema de vendas
  - [ ] 13.1 Criar serviços frontend
    - Criar order-frontend.service.ts
    - Método createOrder() para criar pedido
    - Método getMyOrders() para listar pedidos
    - Método getOrderById() para detalhes
    - Método createPayment() para gerar pagamento
    - Método getOrderStatus() para consultar status
    - _Requirements: 1.1, 3.1, 4.1, 9.1, 9.2, 9.3_
  
  - [ ] 13.2 Criar página de checkout
    - Criar src/pages/Checkout.tsx
    - Formulário de dados do cliente
    - Formulário de endereço de entrega
    - Seleção de produto e quantidade
    - Cálculo de total
    - Botão para finalizar pedido
    - _Requirements: 1.1, 1.5_
  
  - [ ] 13.3 Criar página de seleção de pagamento
    - Criar src/pages/Payment.tsx
    - Opção PIX com QR Code
    - Opção Cartão com formulário
    - Seleção de parcelas (1-12x)
    - Polling para verificar pagamento PIX
    - _Requirements: 3.1, 3.2, 4.1, 4.2_
  
  - [ ] 13.4 Criar componentes de pagamento
    - Componente PixPayment (QR Code + copia-e-cola)
    - Componente CreditCardForm (dados do cartão)
    - Componente OrderSummary (resumo do pedido)
    - Componente ShippingAddressForm (endereço)
    - _Requirements: 3.1, 3.2, 4.1_
  
  - [ ] 13.5 Criar página de confirmação
    - Criar src/pages/OrderConfirmation.tsx
    - Exibir número do pedido
    - Exibir status do pagamento
    - Exibir próximos passos
    - Link para acompanhar pedido
    - _Requirements: 9.2_
  
  - [ ] 13.6 Criar página de meus pedidos
    - Criar src/pages/MyOrders.tsx
    - Listar pedidos do usuário
    - Filtrar por status
    - Exibir resumo de cada pedido
    - Link para detalhes
    - _Requirements: 9.1, 9.2_
  
  - [ ] 13.7 Criar página de detalhes do pedido
    - Criar src/pages/OrderDetail.tsx
    - Exibir informações completas
    - Exibir histórico de status
    - Exibir dados de pagamento
    - Exibir endereço de entrega
    - Botão para cancelar (se permitido)
    - _Requirements: 9.2, 9.3_
  
  - [ ] 13.8 Criar dashboard de pedidos (admin)
    - Atualizar src/pages/dashboard/Pedidos.tsx
    - Listar todos os pedidos
    - Filtros avançados
    - Atualizar status de pedidos
    - Visualizar estatísticas
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 13.9 Testar integração completa end-to-end
    - Testar fluxo de checkout completo
    - Testar pagamento PIX (sandbox)
    - Testar pagamento Cartão (sandbox)
    - Testar consulta de pedidos
    - Testar cancelamento
    - Testar dashboard admin
    - Validar UX e fluxos
    - _Requirements: Todos_

- [x] 14. Documentar APIs e preparar para próximo sprint


  - [x] 14.1 Criar documentação de endpoints


    - Documentar APIs de pedidos com exemplos
    - Documentar APIs de pagamento com exemplos
    - Documentar webhook com exemplos
    - Incluir exemplos de uso com curl
    - _Requirements: Documentação geral_
  
  - [x] 14.2 Atualizar README do projeto


    - Adicionar seção de vendas
    - Explicar integração Asaas
    - Guia de configuração de webhooks
    - Guia de testes no Sandbox
    - _Requirements: Documentação geral_
  

  - [x] 14.3 Criar arquivo de testes HTTP

    - Criar arquivo .http com todos os endpoints
    - Incluir exemplos de criação de pedido
    - Incluir exemplos de pagamento PIX e Cartão
    - Incluir exemplos de webhooks
    - _Requirements: Documentação geral_
  
  - [x] 14.4 Validar preparação para Sprint 4


    - Confirmar que estrutura de split está completa
    - Confirmar que campos de afiliados estão em orders
    - Confirmar que webhook processa corretamente
    - Documentar o que será usado em comissões
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

## Notas de Implementação

### Ordem de Execução Recomendada

1. **Tasks 1-2:** Estrutura de banco e configuração - Base sólida
2. **Task 3:** Validações e tipos - Segurança de dados
3. **Task 4:** Serviços - Lógica de negócio e integração Asaas
4. **Tasks 5-6:** Controllers - Endpoints da API
5. **Task 7:** Webhook handler - Processamento de eventos
6. **Task 8:** Rotas - Exposição da API
7. **Task 9:** Integração com estoque - Atualização automática
8. **Task 10:** Aplicação e validação de banco
9. **Task 11:** Testes Asaas Sandbox
10. **Task 12:** Validação end-to-end
11. **Task 13:** Integração frontend
12. **Task 14:** Documentação e preparação

### Dependências Críticas

- Task 1 deve estar completa antes de Task 10
- Task 2 deve estar completa antes de Task 4.2 (AsaasService)
- Task 3 deve estar completa antes de Tasks 5-6
- Task 4 deve estar completa antes de Tasks 5-7
- Task 8 deve estar completa antes de Task 12
- Task 10 deve estar completa antes de Task 11
- Task 11 deve estar completa antes de Task 12
- Task 12 deve estar completa antes de Task 13

### Configuração Asaas Sandbox

**Antes de começar Task 11:**
1. Criar conta no Asaas Sandbox
2. Obter API Key do Sandbox
3. Configurar Wallet IDs de teste
4. Configurar URL de webhook (usar ngrok ou similar)
5. Obter cartões de teste da documentação

**Cartões de Teste Asaas:**
- Aprovado: 5162306219378829
- Rejeitado: 5162306219378837

### Validações Obrigatórias

- ✅ Todas as migrations aplicadas sem erro
- ✅ Integração Asaas funcionando no Sandbox
- ✅ Webhooks sendo recebidos e processados
- ✅ Estoque sendo atualizado corretamente
- ✅ Splits sendo preparados
- ✅ APIs públicas e administrativas funcionando
- ✅ Frontend integrado e testado

### Pontos de Atenção

- **Segurança:** Validar authToken de webhooks SEMPRE (header: asaas-access-token)
- **Idempotência:** Implementar usando asaas_event_id UNIQUE (webhooks podem ser enviados mais de uma vez)
- **Estoque:** Atualizar apenas quando pagamento confirmado
- **Split:** Configurar NA CRIAÇÃO da cobrança (não depois) - executado automaticamente pelo Asaas
- **Campos Asaas:** Usar cpfCnpj, postalCode, mobilePhone (não customer_cpf, postal_code)
- **remoteIp:** OBRIGATÓRIO para pagamentos com cartão
- **Logs:** Registrar TODAS as transações Asaas
- **Erros:** Tratar graciosamente, não deixar pedido inconsistente
- **Performance:** Processar webhooks de forma assíncrona

### Critérios de Aceite do Sprint

#### Funcionalidades
- [ ] Cliente pode criar pedido
- [ ] Cliente pode pagar via PIX (com split configurado automaticamente)
- [ ] Cliente pode pagar via Cartão (com split configurado automaticamente + remoteIp)
- [ ] Cliente pode consultar seus pedidos
- [ ] Admin pode gerenciar todos os pedidos
- [ ] Admin pode atualizar status
- [ ] Admin pode ver estatísticas
- [ ] Webhooks são processados automaticamente com idempotência
- [ ] Estoque é atualizado automaticamente
- [ ] Splits são configurados na criação e executados automaticamente pelo Asaas

#### Técnico
- [ ] Todas as migrations aplicadas sem erro
- [ ] Integração Asaas funcionando com campos corretos
- [ ] Webhooks validados (authToken) e processados com idempotência
- [ ] Todos os endpoints respondendo
- [ ] Validações Zod impedindo dados inválidos
- [ ] Performance < 3s para checkout
- [ ] Split configurado na criação da cobrança (array splits)

#### Segurança
- [ ] authToken de webhooks validado
- [ ] Idempotência implementada (asaas_event_id UNIQUE)
- [ ] Dados de cartão não armazenados (apenas últimos 4 dígitos)
- [ ] RLS protegendo pedidos
- [ ] APIs administrativas protegidas
- [ ] Logs completos para auditoria
- [ ] Filtro de IPs do Asaas (opcional)

#### Preparação Sprint 4
- [ ] Campos de afiliados em orders (affiliate_n1_id, affiliate_n2_id, affiliate_n3_id)
- [ ] Split funcionando automaticamente (30% comissões, 70% fábrica)
- [ ] Webhook processando corretamente
- [ ] Wallet IDs configurados (Renum, JB)
- [ ] Sistema pronto para adicionar lógica de cálculo de comissões com redistribuição

