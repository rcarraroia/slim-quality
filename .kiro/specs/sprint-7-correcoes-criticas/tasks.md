# Implementation Plan - Sprint 7: Correções Críticas

## Overview

Este plano implementa as correções críticas identificadas na análise do sistema, focando em remover dados mockados, implementar backend ausente e corrigir fluxos quebrados.

**Abordagem:** Incremental e testável, priorizando funcionalidades críticas.

**Duração Estimada:** 10 dias

---

## Tasks

- [ ] 1. Setup e Preparação do Ambiente
  - Criar estrutura de pastas para novos controllers e services
  - Configurar variáveis de ambiente necessárias
  - Validar acesso ao Supabase e Asaas API
  - _Requirements: Todos_

- [ ] 1.1 Criar estrutura de diretórios backend
  - Criar `src/api/controllers/affiliate.controller.ts`
  - Criar `src/api/controllers/admin-affiliate.controller.ts`
  - Criar `src/api/controllers/commission.controller.ts`
  - Criar `src/api/controllers/withdrawal.controller.ts`
  - Criar `src/services/affiliates/affiliate.service.ts`
  - Criar `src/services/affiliates/commission.service.ts`
  - Criar `src/services/affiliates/withdrawal.service.ts`
  - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1_

- [ ]* 1.2 Configurar testes unitários
  - Configurar Vitest para novos services
  - Criar arquivos de teste base
  - _Requirements: 18.1, 18.2_

- [ ] 2. Implementar Backend de Afiliados - Cadastro
  - Implementar endpoint POST /api/affiliates
  - Validar dados com Zod
  - Integrar validação de Wallet ID com Asaas
  - Gerar código de indicação único
  - Vincular na árvore genealógica
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 2.1 Criar Affiliate Service - Cadastro
  - Implementar `register(data)` method
  - Implementar `validateWalletId(walletId)` method
  - Implementar `generateReferralCode()` method
  - Implementar `linkToNetwork(affiliateId, referralCode)` method
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 2.2 Escrever testes para Property 2: API Validation Completeness
  - **Property 2: API Validation Completeness**
  - **Validates: Requirements 3.1**

- [ ]* 2.3 Escrever testes para Property 3: Wallet Validation Integration
  - **Property 3: Wallet Validation Integration**
  - **Validates: Requirements 3.2**

- [ ]* 2.4 Escrever testes para Property 4: Referral Code Linking
  - **Property 4: Referral Code Linking**
  - **Validates: Requirements 3.3**

- [ ]* 2.5 Escrever testes para Property 5: Referral Code Generation
  - **Property 5: Referral Code Generation**
  - **Validates: Requirements 3.4**

- [ ]* 2.6 Escrever testes para Property 6: Database Consistency on Registration
  - **Property 6: Database Consistency on Registration**
  - **Validates: Requirements 3.5**



- [ ] 2.7 Criar Affiliate Controller - Cadastro
  - Implementar `register(req, res)` endpoint
  - Implementar `validateWallet(req, res)` endpoint
  - Implementar `validateReferralCode(req, res)` endpoint
  - Adicionar validação Zod para todos os inputs
  - Implementar tratamento de erros consistente
  - _Requirements: 3.1, 3.2, 3.3, 14.1, 14.2, 14.3, 14.4, 16.1, 16.2_

- [ ]* 2.8 Escrever testes para Property 23-26: Validações de Formato
  - **Property 23: Wallet ID Format Validation**
  - **Property 24: Email Format Validation**
  - **Property 25: Phone Format Validation**
  - **Property 26: CPF/CNPJ Validation**
  - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**

- [ ] 2.9 Criar rotas de cadastro
  - Adicionar POST /api/affiliates
  - Adicionar POST /api/affiliates/validate-wallet
  - Adicionar GET /api/affiliates/validate-referral/:code
  - Configurar middlewares de autenticação
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Implementar Backend de Afiliados - Consultas
  - Implementar endpoints para afiliado autenticado
  - Implementar RLS policies
  - Implementar queries otimizadas
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3.1 Criar Affiliate Service - Consultas
  - Implementar `getById(id)` method
  - Implementar `getByUserId(userId)` method
  - Implementar `getStats(affiliateId)` method
  - Implementar `getNetwork(affiliateId)` method
  - Implementar `getClicks(affiliateId, filters)` method
  - Implementar `getConversions(affiliateId, filters)` method
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 3.2 Escrever testes para Property 7: Affiliate Data Isolation (RLS)
  - **Property 7: Affiliate Data Isolation (RLS)**
  - **Validates: Requirements 4.5**

- [ ] 3.3 Criar Affiliate Controller - Consultas
  - Implementar `getMyDashboard(req, res)` endpoint
  - Implementar `getMyNetwork(req, res)` endpoint
  - Implementar `getMyCommissions(req, res)` endpoint
  - Implementar `getMyReferralLink(req, res)` endpoint
  - Implementar `getMyClicks(req, res)` endpoint
  - Implementar `getMyConversions(req, res)` endpoint
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3.4 Criar rotas de consulta para afiliados
  - Adicionar GET /api/affiliate/dashboard
  - Adicionar GET /api/affiliate/network
  - Adicionar GET /api/affiliate/commissions
  - Adicionar GET /api/affiliate/referral-link
  - Adicionar GET /api/affiliate/clicks
  - Adicionar GET /api/affiliate/conversions
  - Configurar middleware de autenticação
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4. Implementar Backend Admin - Afiliados
  - Implementar endpoints administrativos
  - Validar permissões de admin
  - Implementar filtros e paginação
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4.1 Criar Admin Affiliate Service
  - Implementar `getAllAffiliates(filters)` method
  - Implementar `getAffiliateById(id)` method
  - Implementar `updateAffiliateStatus(id, status)` method
  - Implementar `getAffiliateNetwork(id)` method
  - Implementar `getAffiliateStats()` method
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 4.2 Escrever testes para Property 8: Admin-Only Access
  - **Property 8: Admin-Only Access**
  - **Validates: Requirements 5.5**

- [ ] 4.3 Criar Admin Affiliate Controller
  - Implementar `getAllAffiliates(req, res)` endpoint
  - Implementar `getAffiliateById(req, res)` endpoint
  - Implementar `updateAffiliateStatus(req, res)` endpoint
  - Implementar `getAffiliateNetwork(req, res)` endpoint
  - Implementar `getAffiliateStats(req, res)` endpoint
  - Adicionar validação de role admin
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4.4 Criar rotas administrativas de afiliados
  - Adicionar GET /api/admin/affiliates
  - Adicionar GET /api/admin/affiliates/:id
  - Adicionar PUT /api/admin/affiliates/:id/status
  - Adicionar GET /api/admin/affiliates/:id/network
  - Adicionar GET /api/admin/affiliates/stats
  - Configurar middleware de autorização admin
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5. Checkpoint - Validar Backend de Afiliados
  - Ensure all tests pass, ask the user if questions arise.



- [ ] 6. Implementar Backend de Comissões
  - Implementar endpoints de consulta de comissões
  - Validar estrutura de dados
  - Implementar filtros e estatísticas
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.1 Criar Commission Service
  - Implementar `getByAffiliateId(affiliateId, filters)` method
  - Implementar `getById(id)` method
  - Implementar `getStats(filters)` method
  - Implementar `getAllCommissions(filters)` method
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 6.2 Escrever testes para Property 9: Commission Split Completeness
  - **Property 9: Commission Split Completeness**
  - **Validates: Requirements 6.4**

- [ ]* 6.3 Escrever testes para Property 10: Commission Status Presence
  - **Property 10: Commission Status Presence**
  - **Validates: Requirements 6.5**

- [ ] 6.4 Criar Commission Controller
  - Implementar `getAllCommissions(req, res)` endpoint
  - Implementar `getCommissionById(req, res)` endpoint
  - Implementar `getCommissionStats(req, res)` endpoint
  - Adicionar validação de permissões
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6.5 Criar rotas de comissões
  - Adicionar GET /api/admin/commissions
  - Adicionar GET /api/admin/commissions/:id
  - Adicionar GET /api/admin/commissions/stats
  - Configurar middleware de autorização
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 7. Implementar Backend de Saques
  - Criar tabela withdrawals no banco
  - Implementar endpoints de gestão de saques
  - Validar saldo disponível
  - Implementar logs de auditoria
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7.1 Criar migration para tabela withdrawals
  - Criar arquivo de migration SQL
  - Definir estrutura da tabela
  - Adicionar foreign keys e constraints
  - Criar índices necessários
  - Executar migration no Supabase
  - _Requirements: 7.1_

- [ ] 7.2 Criar Withdrawal Service
  - Implementar `getAll(filters)` method
  - Implementar `getById(id)` method
  - Implementar `getByAffiliateId(affiliateId)` method
  - Implementar `create(affiliateId, amount)` method
  - Implementar `approve(id, adminId)` method
  - Implementar `reject(id, adminId, reason)` method
  - Implementar `validateBalance(affiliateId, amount)` method
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 7.3 Escrever testes para Property 11: Withdrawal Balance Validation
  - **Property 11: Withdrawal Balance Validation**
  - **Validates: Requirements 7.4**

- [ ]* 7.4 Escrever testes para Property 12: Withdrawal Audit Logging
  - **Property 12: Withdrawal Audit Logging**
  - **Validates: Requirements 7.5**

- [ ] 7.5 Criar Withdrawal Controller
  - Implementar `getAllWithdrawals(req, res)` endpoint
  - Implementar `approveWithdrawal(req, res)` endpoint
  - Implementar `rejectWithdrawal(req, res)` endpoint
  - Implementar `getWithdrawalStats(req, res)` endpoint
  - Adicionar validação de saldo
  - Adicionar logs de auditoria
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7.6 Criar rotas de saques
  - Adicionar GET /api/admin/withdrawals
  - Adicionar POST /api/admin/withdrawals/:id/approve
  - Adicionar POST /api/admin/withdrawals/:id/reject
  - Adicionar GET /api/admin/withdrawals/stats
  - Configurar middleware de autorização admin
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 8. Checkpoint - Validar Backend Completo
  - Ensure all tests pass, ask the user if questions arise.



- [ ] 9. Remover Dados Mockados - Admin Dashboard
  - Remover imports de mockData.ts
  - Integrar com APIs reais
  - Implementar estados de loading e erro
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 9.1 Atualizar ListaAfiliados.tsx
  - Remover import de `mockAfiliadosAdmin`
  - Criar hook `useAdminAffiliates()`
  - Integrar com `affiliateService.getAllAffiliates()`
  - Implementar loading state
  - Implementar error state
  - Implementar empty state
  - _Requirements: 1.1, 2.5_

- [ ]* 9.2 Escrever testes para Property 1: Empty State Display
  - **Property 1: Empty State Display**
  - **Validates: Requirements 2.5**

- [ ] 9.3 Atualizar GestaoComissoes.tsx
  - Remover import de `mockComissoesAdmin`
  - Criar hook `useAdminCommissions()`
  - Integrar com commission service
  - Implementar loading state
  - Implementar error state
  - Implementar empty state
  - _Requirements: 1.2, 2.5_

- [ ] 9.4 Atualizar GestaoSaques.tsx
  - Remover dados mockados de saques
  - Criar hook `useAdminWithdrawals()`
  - Integrar com withdrawal service
  - Implementar loading state
  - Implementar error state
  - Implementar empty state
  - _Requirements: 1.3, 2.5_

- [ ] 9.5 Atualizar Dashboard.tsx (Admin)
  - Remover `mockConversas` e `mockVendas`
  - Integrar com APIs reais de conversas
  - Integrar com APIs reais de vendas
  - Implementar loading states
  - Implementar error handling
  - _Requirements: 1.4_

- [ ] 10. Remover Dados Mockados - Affiliate Dashboard
  - Remover imports de mockData.ts
  - Integrar com APIs reais
  - Implementar estados de UI
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 10.1 Atualizar Comissoes.tsx (Afiliado)
  - Remover import de `mockComissoes`
  - Criar hook `useMyCommissions()`
  - Integrar com `affiliateService.getMyCommissions()`
  - Implementar loading state
  - Implementar error state
  - Implementar empty state
  - _Requirements: 2.1, 2.5_

- [ ] 10.2 Atualizar MinhaRede.tsx
  - Criar hook `useMyNetwork()`
  - Integrar com `affiliateService.getMyNetwork()`
  - Implementar loading state
  - Implementar error state
  - Implementar empty state (sem indicados)
  - _Requirements: 2.2, 2.5_

- [ ] 10.3 Atualizar Dashboard (Afiliado)
  - Criar hook `useMyStats()`
  - Integrar com `affiliateService.getMyDashboard()`
  - Implementar loading states
  - Implementar error handling
  - Exibir métricas reais
  - _Requirements: 2.3_

- [ ] 10.4 Deletar arquivo mockData.ts
  - Verificar que não há mais imports
  - Deletar `src/data/mockData.ts`
  - _Requirements: 1.5, 2.4_

- [ ]* 10.5 Escrever testes para Property 28-30: UI States
  - **Property 28: Loading State Display**
  - **Property 29: Error Message Display**
  - **Property 30: Success Feedback**
  - **Validates: Requirements 13.1, 13.2, 13.3**

- [ ] 11. Checkpoint - Validar Remoção de Mocks
  - Ensure all tests pass, ask the user if questions arise.



- [ ] 12. Corrigir Redirecionamento Pós-Login
  - Atualizar lógica de redirecionamento
  - Testar todos os cenários de role
  - Validar navegação correta
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12.1 Atualizar AuthContext.tsx
  - Melhorar função `login()` para retornar role
  - Adicionar lógica de redirecionamento baseada em role
  - Usar `getDashboardByRole()` utility
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12.2 Atualizar AuthRedirect.tsx
  - Implementar redirecionamento correto por role
  - Testar com diferentes roles
  - Adicionar fallback para roles desconhecidos
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12.3 Atualizar Login.tsx
  - Integrar com nova lógica de redirecionamento
  - Adicionar feedback visual durante login
  - Tratar erros de autenticação
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 12.4 Escrever testes de redirecionamento
  - Testar redirect para admin → /dashboard
  - Testar redirect para vendedor → /dashboard
  - Testar redirect para afiliado → /afiliados/dashboard
  - Testar redirect para cliente → /minha-conta
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 13. Validar e Corrigir Estrutura do CRM
  - Executar script de validação
  - Corrigir inconsistências encontradas
  - Validar relacionamentos
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 13.1 Executar script de validação do CRM
  - Rodar `check_policies.py` ou script equivalente
  - Verificar estrutura de tabelas
  - Validar foreign keys
  - Verificar índices
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 13.2 Corrigir problemas identificados
  - Executar `fix_crm_tables.sql` se necessário
  - Validar correções aplicadas
  - Testar queries do CRM
  - _Requirements: 9.5_

- [ ] 13.3 Validar funcionalidade do CRM
  - Testar queries de customers
  - Testar queries de conversations
  - Testar queries de messages
  - Verificar performance
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 14. Implementar e Validar RLS Policies
  - Criar policies ausentes
  - Validar policies existentes
  - Testar isolamento de dados
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 14.1 Validar RLS em affiliates
  - Verificar policy "Affiliates view own data"
  - Testar que afiliado vê apenas próprios dados
  - Testar que admin vê todos os dados
  - _Requirements: 10.1, 10.4_

- [ ]* 14.2 Escrever testes para Property 13: RLS Policy Enforcement - Affiliates
  - **Property 13: RLS Policy Enforcement - Affiliates**
  - **Validates: Requirements 10.1**

- [ ] 14.3 Validar RLS em commissions
  - Verificar policy "Affiliates view own commissions"
  - Testar isolamento de comissões
  - Testar acesso admin
  - _Requirements: 10.2, 10.4_

- [ ]* 14.4 Escrever testes para Property 14: RLS Policy Enforcement - Commissions
  - **Property 14: RLS Policy Enforcement - Commissions**
  - **Validates: Requirements 10.2**

- [ ] 14.5 Validar RLS em customers
  - Verificar policy para vendedores
  - Testar que vendedor vê apenas clientes atribuídos
  - Testar acesso admin
  - _Requirements: 10.3, 10.4_

- [ ]* 14.6 Escrever testes para Property 15: RLS Policy Enforcement - Customers
  - **Property 15: RLS Policy Enforcement - Customers**
  - **Validates: Requirements 10.3**

- [ ]* 14.7 Escrever testes para Property 16: Admin Full Access
  - **Property 16: Admin Full Access**
  - **Validates: Requirements 10.4**

- [ ] 14.8 Criar RLS policy para withdrawals
  - Criar policy para afiliados verem apenas próprios saques
  - Criar policy para admins verem todos os saques
  - Testar policies
  - _Requirements: 10.1, 10.4_

- [ ] 15. Checkpoint - Validar Segurança e RLS
  - Ensure all tests pass, ask the user if questions arise.



- [ ] 16. Implementar Tratamento de Erros Consistente
  - Padronizar formato de erros
  - Implementar códigos HTTP corretos
  - Adicionar logs de erro
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 16.1 Criar utility de formatação de erros
  - Criar `src/utils/error-formatter.ts`
  - Implementar função `formatError(error)`
  - Implementar função `createErrorResponse(status, message, details)`
  - _Requirements: 16.1_

- [ ]* 16.2 Escrever testes para Property 17-21: Error Handling
  - **Property 17: Error Handling Consistency**
  - **Property 18: HTTP Status Codes - Validation**
  - **Property 19: HTTP Status Codes - Not Found**
  - **Property 20: HTTP Status Codes - Forbidden**
  - **Property 21: HTTP Status Codes - Internal Error**
  - **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

- [ ] 16.3 Criar middleware de tratamento de erros
  - Criar `src/api/middlewares/error-handler.middleware.ts`
  - Implementar captura de erros
  - Implementar logging de erros
  - Implementar resposta padronizada
  - _Requirements: 16.1, 16.5_

- [ ] 16.4 Atualizar controllers para usar tratamento consistente
  - Atualizar affiliate controllers
  - Atualizar commission controllers
  - Atualizar withdrawal controllers
  - Garantir códigos HTTP corretos
  - _Requirements: 16.2, 16.3, 16.4_

- [ ] 17. Implementar Validações e Logs de Auditoria
  - Criar schemas Zod
  - Implementar validações
  - Adicionar logs de auditoria
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 17.1 Criar schemas Zod de validação
  - Criar `src/api/validators/affiliate.validator.ts`
  - Criar schema para registro de afiliado
  - Criar schema para atualização de status
  - Criar schema para saque
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 17.2 Implementar middleware de validação
  - Criar `src/api/middlewares/validation.middleware.ts`
  - Implementar validação de request body
  - Implementar validação de query params
  - Implementar validação de path params
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 17.3 Criar serviço de auditoria
  - Criar `src/services/audit/audit.service.ts`
  - Implementar `logAffiliateRegistration()`
  - Implementar `logCommissionCalculation()`
  - Implementar `logWithdrawalOperation()`
  - Implementar `queryLogs(filters)`
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 17.4 Escrever testes para Property 27: Audit Log Completeness
  - **Property 27: Audit Log Completeness**
  - **Validates: Requirements 15.4**

- [ ] 17.5 Integrar logs de auditoria nos controllers
  - Adicionar log em affiliate registration
  - Adicionar log em commission calculation
  - Adicionar log em withdrawal operations
  - _Requirements: 15.1, 15.2, 15.3_

- [ ] 18. Otimizar Performance e Queries
  - Criar índices necessários
  - Implementar paginação
  - Otimizar queries
  - _Requirements: 17.1, 17.2, 17.3_

- [ ] 18.1 Criar índices no banco de dados
  - Criar índice em `affiliates.referral_code`
  - Criar índice em `affiliates.user_id`
  - Criar índice em `commissions.affiliate_id`
  - Criar índice em `commissions.order_id`
  - Criar índice em `withdrawals.affiliate_id`
  - _Requirements: 17.1_

- [ ] 18.2 Implementar paginação em todos os endpoints de listagem
  - Adicionar paginação em GET /api/admin/affiliates
  - Adicionar paginação em GET /api/admin/commissions
  - Adicionar paginação em GET /api/admin/withdrawals
  - Adicionar paginação em GET /api/affiliate/commissions
  - _Requirements: 17.2, 17.3_

- [ ]* 18.3 Escrever testes para Property 22: Pagination Consistency
  - **Property 22: Pagination Consistency**
  - **Validates: Requirements 17.3**

- [ ] 18.4 Otimizar queries do Supabase
  - Usar SELECT específico ao invés de SELECT *
  - Adicionar filtros WHERE apropriados
  - Usar joins eficientes
  - _Requirements: 17.1, 17.2_

- [ ] 19. Checkpoint - Validar Qualidade e Performance
  - Ensure all tests pass, ask the user if questions arise.



- [ ] 20. Criar Hooks Customizados Frontend
  - Criar hooks para integração com APIs
  - Implementar cache e otimizações
  - Adicionar tratamento de erros
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 20.1 Criar useAdminAffiliates hook
  - Criar `src/hooks/useAdminAffiliates.ts`
  - Integrar com React Query
  - Implementar filtros e paginação
  - Adicionar cache
  - _Requirements: 12.1_

- [ ] 20.2 Criar useAdminCommissions hook
  - Criar `src/hooks/useAdminCommissions.ts`
  - Integrar com React Query
  - Implementar filtros
  - _Requirements: 12.2_

- [ ] 20.3 Criar useAdminWithdrawals hook
  - Criar `src/hooks/useAdminWithdrawals.ts`
  - Integrar com React Query
  - Implementar filtros
  - _Requirements: 12.3_

- [ ] 20.4 Criar useMyCommissions hook
  - Criar `src/hooks/useMyCommissions.ts`
  - Integrar com React Query
  - Adicionar cache
  - _Requirements: 11.1_

- [ ] 20.5 Criar useMyNetwork hook
  - Criar `src/hooks/useMyNetwork.ts`
  - Integrar com React Query
  - Adicionar cache
  - _Requirements: 11.1_

- [ ] 20.6 Criar useMyStats hook
  - Criar `src/hooks/useMyStats.ts`
  - Integrar com React Query
  - Adicionar cache
  - _Requirements: 11.1_

- [ ] 21. Implementar Estados de UI Consistentes
  - Criar componentes de loading
  - Criar componentes de erro
  - Criar componentes de empty state
  - _Requirements: 11.2, 11.3, 11.4, 13.1, 13.2, 13.3, 13.4_

- [ ] 21.1 Criar componente LoadingState
  - Criar `src/components/shared/LoadingState.tsx`
  - Implementar skeleton loaders
  - Implementar spinners
  - _Requirements: 13.1_

- [ ] 21.2 Criar componente ErrorState
  - Criar `src/components/shared/ErrorState.tsx`
  - Implementar mensagens de erro amigáveis
  - Adicionar botão de retry
  - _Requirements: 13.2_

- [ ] 21.3 Criar componente EmptyState
  - Criar `src/components/shared/EmptyState.tsx`
  - Implementar mensagens contextuais
  - Adicionar ações sugeridas
  - _Requirements: 13.4_

- [ ] 21.4 Criar componente SuccessToast
  - Integrar com sistema de toast existente
  - Padronizar mensagens de sucesso
  - _Requirements: 13.3_

- [ ] 21.5 Implementar retry automático para erros de rede
  - Configurar React Query com retry
  - Implementar backoff exponencial
  - _Requirements: 13.5_

- [ ] 22. Documentar APIs Implementadas
  - Atualizar docs/API.md
  - Documentar todos os endpoints
  - Adicionar exemplos
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 22.1 Documentar endpoints de afiliados
  - Documentar POST /api/affiliates
  - Documentar GET /api/affiliate/*
  - Documentar GET /api/admin/affiliates/*
  - Incluir exemplos de request/response
  - _Requirements: 19.1, 19.2, 19.3_

- [ ] 22.2 Documentar endpoints de comissões
  - Documentar GET /api/admin/commissions/*
  - Incluir exemplos de filtros
  - Documentar estrutura de dados
  - _Requirements: 19.1, 19.2, 19.3_

- [ ] 22.3 Documentar endpoints de saques
  - Documentar GET /api/admin/withdrawals
  - Documentar POST /api/admin/withdrawals/:id/approve
  - Documentar POST /api/admin/withdrawals/:id/reject
  - Incluir exemplos
  - _Requirements: 19.1, 19.2, 19.3_

- [ ] 22.4 Documentar códigos de erro
  - Listar todos os códigos de erro possíveis
  - Documentar formato de erro
  - Adicionar exemplos de erros
  - _Requirements: 19.4_

- [ ] 23. Checkpoint Final - Testes Completos
  - Ensure all tests pass, ask the user if questions arise.



- [ ] 24. Testes de Integração End-to-End
  - Testar fluxos completos
  - Validar integração frontend-backend
  - Testar em ambiente de staging
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 24.1 Testar fluxo de cadastro de afiliado
  - Preencher formulário de cadastro
  - Validar Wallet ID
  - Verificar criação no banco
  - Validar redirecionamento
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 24.2 Testar fluxo de login e redirecionamento
  - Login como admin → verificar redirect para /dashboard
  - Login como vendedor → verificar redirect para /dashboard
  - Login como afiliado → verificar redirect para /afiliados/dashboard
  - Login como cliente → verificar redirect para /minha-conta
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 24.3 Testar dashboard admin com dados reais
  - Acessar /dashboard/lista-afiliados
  - Verificar que dados são reais (não mock)
  - Acessar /dashboard/gestao-comissoes
  - Verificar que comissões são reais
  - Acessar /dashboard/gestao-saques
  - Verificar que saques são reais
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 24.4 Testar dashboard afiliado com dados reais
  - Acessar /afiliados/dashboard
  - Verificar métricas reais
  - Acessar /afiliados/dashboard/comissoes
  - Verificar comissões reais
  - Acessar /afiliados/dashboard/minha-rede
  - Verificar rede real
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 24.5 Testar aprovação de saque
  - Admin acessa gestão de saques
  - Seleciona saque pendente
  - Aprova saque
  - Verifica log de auditoria
  - _Requirements: 7.2, 7.4, 7.5_

- [ ] 24.6 Testar isolamento de dados (RLS)
  - Login como afiliado A
  - Tentar acessar dados de afiliado B (deve falhar)
  - Login como admin
  - Verificar acesso a todos os dados
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 25. Preparação para Deploy
  - Configurar variáveis de ambiente
  - Executar migrations
  - Validar configurações
  - _Requirements: Todos_

- [ ] 25.1 Configurar variáveis de ambiente de produção
  - Verificar SUPABASE_URL
  - Verificar SUPABASE_ANON_KEY
  - Verificar SUPABASE_SERVICE_KEY
  - Verificar ASAAS_API_KEY
  - Verificar ASAAS_WALLET_* (fábrica, gestores)
  - _Requirements: Todos_

- [ ] 25.2 Executar migrations no banco de produção
  - Backup do banco atual
  - Executar migration de withdrawals
  - Validar estrutura
  - Testar rollback se necessário
  - _Requirements: 7.1_

- [ ] 25.3 Validar RLS policies em produção
  - Verificar policies de affiliates
  - Verificar policies de commissions
  - Verificar policies de customers
  - Verificar policies de withdrawals
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 25.4 Criar script de smoke tests
  - Criar `scripts/smoke-tests.ts`
  - Testar endpoints críticos
  - Testar autenticação
  - Testar RLS
  - _Requirements: 20.1, 20.2_

- [ ] 26. Deploy e Validação em Produção
  - Deploy para produção
  - Executar smoke tests
  - Monitorar erros
  - Validar funcionalidades
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 26.1 Deploy para produção
  - Build do projeto
  - Deploy via Vercel
  - Verificar logs de deploy
  - _Requirements: Todos_

- [ ] 26.2 Executar smoke tests pós-deploy
  - Rodar script de smoke tests
  - Verificar que todos passam
  - Alertar equipe se falhas
  - _Requirements: 20.1, 20.2_

- [ ] 26.3 Validar remoção de dados mockados
  - Acessar todas as páginas admin
  - Verificar que não há dados mock
  - Acessar páginas de afiliado
  - Verificar que não há dados mock
  - _Requirements: 20.3_

- [ ] 26.4 Validar redirecionamento em produção
  - Testar login com cada tipo de role
  - Verificar redirecionamento correto
  - _Requirements: 20.4_

- [ ] 26.5 Validar acesso de afiliados
  - Login como afiliado
  - Acessar dashboard
  - Verificar dados reais
  - Testar todas as funcionalidades
  - _Requirements: 20.5_

- [ ] 26.6 Configurar monitoramento
  - Configurar alertas de erro
  - Configurar métricas de performance
  - Configurar logs de auditoria
  - _Requirements: Todos_

- [ ] 27. Checkpoint Final - Sistema em Produção
  - Ensure all tests pass, ask the user if questions arise.

---

## Summary

Este plano de implementação cobre todas as correções críticas identificadas:

**Principais Entregas:**
1. ✅ Backend completo de afiliados (cadastro, consultas, admin)
2. ✅ Backend de comissões e saques
3. ✅ Remoção total de dados mockados
4. ✅ Redirecionamento pós-login corrigido
5. ✅ Estrutura do CRM validada
6. ✅ RLS policies implementadas e testadas
7. ✅ Tratamento de erros consistente
8. ✅ Validações e logs de auditoria
9. ✅ Performance otimizada
10. ✅ Documentação completa
11. ✅ Testes abrangentes
12. ✅ Deploy e validação em produção

**Total de Tasks:** 27 tasks principais com 100+ sub-tasks
**Duração Estimada:** 10 dias
**Checkpoints:** 6 pontos de validação

**Prioridade:** MÁXIMA - Sistema não funcional sem estas correções
