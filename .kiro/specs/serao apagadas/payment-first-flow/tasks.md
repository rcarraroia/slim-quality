# Implementation Plan: Inversão do Fluxo de Registro (Pagamento → Conta)

## Overview

Esta implementação refatora completamente o fluxo de registro do sistema COMADEMIG, invertendo a ordem para processar pagamento ANTES de criar contas de usuário. A implementação será feita em fases para garantir estabilidade e permitir rollback seguro.

## Tasks

- [-] 1. Preparar infraestrutura de banco de dados
  - [x] 1.1 Criar migração para novas tabelas de fallback
    - Criar tabelas: pending_subscriptions, pending_completions
    - Adicionar índices para performance
    - Configurar RLS policies para novas tabelas
    - _Requirements: 4.1, 4.2, 8.1_

  - [ ]* 1.2 Escrever testes de propriedade para estrutura de dados
    - **Property 1: Payment-First Invariant**
    - **Validates: Requirements 1.5, 3.5, 5.2**

  - [x] 1.3 Adicionar campos de auditoria às tabelas existentes
    - Adicionar payment_confirmed_at e registration_flow_version ao profiles
    - Adicionar asaas_payment_id e processing_context ao user_subscriptions
    - Manter compatibilidade com dados existentes
    - _Requirements: 8.1, 9.1_

- [x] 2. Implementar serviços core do novo fluxo
  - [x] 2.1 Criar PollingService para monitoramento de pagamentos
    - Implementar polling com exponential backoff
    - Configurar timeouts e intervalos otimizados
    - Adicionar tratamento de erros e retry logic
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 Escrever testes de propriedade para PollingService
    - **Property 6: Status Response Immediacy**
    - **Property 7: Timeout Consistency**
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [x] 2.3 Criar FallbackSystem para recuperação de falhas
    - Implementar armazenamento de pending subscriptions
    - Criar sistema de retry automático
    - Adicionar notificação para administradores
    - Implementar completamento manual
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 2.4 Escrever testes de propriedade para FallbackSystem
    - **Property 12: Failure Recovery Storage**
    - **Property 13: Automatic Retry Initiation**
    - **Property 14: Administrative Escalation**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 3. Checkpoint - Validar serviços base
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implementar PaymentFirstFlowService principal
  - [x] 4.1 Criar estrutura base do PaymentFirstFlowService
    - Definir interfaces e tipos TypeScript
    - Implementar validação de dados de entrada
    - Criar estrutura de processamento em etapas
    - _Requirements: 1.1, 1.2_

  - [ ]* 4.2 Escrever testes de propriedade para validação
    - **Property 3: Data Validation Priority**
    - **Validates: Requirements 1.1**

  - [x] 4.3 Implementar criação de cliente Asaas
    - Integrar com API do Asaas para criação de clientes
    - Adicionar tratamento de erros específicos
    - Implementar retry para falhas transientes
    - _Requirements: 1.2_

  - [x] 4.4 Implementar processamento de pagamento com split
    - Integrar SplitPaymentService
    - Processar pagamento inicial com comissões de afiliado
    - Validar configuração de splits
    - _Requirements: 1.3, 6.1, 6.4_

  - [ ]* 4.5 Escrever testes de propriedade para split payments
    - **Property 4: Split Payment Consistency**
    - **Validates: Requirements 1.3, 6.1**

- [x] 5. Implementar criação condicionada de contas
  - [x] 5.1 Criar lógica de criação de conta Supabase
    - Implementar criação apenas após confirmação de pagamento
    - Integrar com Supabase Auth API
    - Adicionar tratamento de erros de autenticação
    - _Requirements: 3.1_

  - [ ]* 5.2 Escrever testes de propriedade para criação condicionada
    - **Property 8: Conditional Account Creation**
    - **Validates: Requirements 3.1**

  - [x] 5.3 Implementar criação de perfil com status ativo
    - Criar perfil sempre com status 'ativo'
    - Adicionar campos de auditoria (payment_confirmed_at)
    - Integrar com dados de registro
    - _Requirements: 3.2_

  - [ ]* 5.4 Escrever testes de propriedade para perfis
    - **Property 9: Profile Status Consistency**
    - **Validates: Requirements 3.2**

  - [x] 5.5 Implementar criação de assinatura
    - Criar assinatura com split payment configurado
    - Vincular com pagamento confirmado
    - Adicionar contexto de processamento
    - _Requirements: 3.3_

  - [ ]* 5.6 Escrever testes de propriedade para assinaturas
    - **Property 10: Subscription Creation Chain**
    - **Validates: Requirements 3.3**

- [ ] 6. Checkpoint - Validar fluxo principal
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implementar Edge Functions
  - [x] 7.1 Criar Edge Function process-payment-first-registration
    - Implementar orquestrador principal do novo fluxo
    - Integrar todos os serviços criados
    - Adicionar logging detalhado e métricas
    - Configurar timeout de 25 segundos
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 7.2 Escrever testes de propriedade para fluxo principal
    - **Property 2: Processing Order Invariant**
    - **Validates: Requirements 1.2**

  - [x] 7.3 Criar Edge Function poll-payment-status
    - Implementar polling dedicado para status de pagamento
    - Configurar exponential backoff
    - Adicionar timeout de 20 segundos
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.4 Criar Edge Function process-pending-subscriptions
    - Implementar processamento de cron job para pendings
    - Configurar retry automático
    - Adicionar notificação de falhas críticas
    - _Requirements: 4.2, 4.3_

  - [x] 7.5 Criar Edge Function process-pending-completions
    - Implementar processamento de cron job para contas pendentes
    - Criar conta Supabase com dados salvos
    - Vincular com pagamento e assinatura existentes
    - Enviar email de boas-vindas após conclusão
    - _Requirements: 4.2, 4.3_

  - [ ]* 7.6 Escrever testes de integração para Edge Functions
    - Testar fluxo completo end-to-end
    - Validar integração entre functions
    - _Requirements: 8.4_

- [ ] 8. Integrar formulário de filiação com PaymentFirstFlow
  - [x] 8.1 Criar adapter de dados entre formulário atual e PaymentFirstFlow
    - Implementar `FiliacaoToPaymentFirstFlow` adapter
    - Mapear estruturas de dados incompatíveis (endereço, cartão)
    - Converter nomenclaturas diferentes (nome_completo → nome, endereco → logradouro)
    - Mapear tipos de membros (UnifiedMemberType → enum restrito)
    - Converter formatos de pagamento ('credit_card' → 'CREDIT_CARD')
    - _Requirements: 1.1, 3.1_

  - [x] 8.2 Refatorar useFiliacaoPayment para usar PaymentFirstFlowService
    - Manter interface atual do hook para compatibilidade
    - Integrar PaymentFirstFlowService internamente
    - Adaptar estados de loading e error para UI existente
    - Preservar validações Zod existentes
    - Adicionar fallback para fluxo antigo (flag de feature)
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 8.3 Atualizar validações do formulário
    - Sincronizar schema Zod com validações do PaymentFirstFlow
    - Manter validações de CPF, telefone, CEP existentes
    - Adicionar validações específicas do novo fluxo
    - Preservar mensagens de erro amigáveis
    - _Requirements: 1.1_

  - [x] 8.4 Implementar compatibilidade com sistema admin
    - Garantir que tipos customizados do admin funcionem
    - Adicionar mapeamento flexível entre nomes e enums
    - Validar planos associados aos tipos de membros
    - Manter funcionalidade de MemberTypeManagement
    - _Requirements: 3.2, 3.3_

  - [x] 8.5 Adicionar feature flag para migração gradual
    - Implementar toggle entre fluxo antigo e novo
    - Permitir rollback fácil em caso de problemas
    - Adicionar logging para comparação de performance
    - Configurar percentual de usuários no novo fluxo
    - _Requirements: 8.2, 8.3_

  - [x] 8.6 Testes de integração do formulário
    - Testar fluxo completo com dados reais
    - Validar compatibilidade com tipos/planos existentes
    - Testar edge cases (usuário logado, dados faltantes)
    - Verificar validações de formulário
    - Testar rollback entre fluxos
    - _Requirements: 8.4_

- [x] 9. Checkpoint - Validar integração completa
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implementar componentes frontend avançados
  - [x] 9.1 Refatorar FiliacaoForm para novo fluxo
    - Remover lógica de criação imediata de conta
    - Integrar com nova Edge Function
    - Adicionar estados de loading e progresso
    - _Requirements: 7.1_

  - [x] 9.2 Atualizar tela de aguardo (loading inline)
    - Exibir progresso durante polling de confirmação
    - Mostrar etapas: "Processando pagamento" → "Criando conta" → "Concluído"
    - Redirecionar automaticamente após conclusão
    - Não permitir cancelamento (pagamento já processado)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 9.3 Escrever testes de propriedade para UX
    - **Property 23: Progress Indication**
    - **Property 24: Real-time Status Updates**
    - **Property 25: Automatic Redirection**
    - **Property 26: Cancellation Control**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

  - [x] 9.4 Implementar tratamento de erros específicos
    - Criar componentes para erros de pagamento recusado
    - Implementar retry capability
    - Adicionar escalação para suporte
    - _Requirements: 5.1, 5.3, 5.4_

  - [ ]* 9.5 Escrever testes de propriedade para tratamento de erros
    - **Property 16: Refused Payment Feedback**
    - **Property 17: Retry Capability Preservation**
    - **Property 18: Escalation After Multiple Failures**
    - **Validates: Requirements 5.1, 5.3, 5.4_

- [x] 10. Checkpoint - Validar integração frontend avançada
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implementar sistema de monitoramento
  - [x] 11.1 Criar dashboard de monitoramento
    - Implementar métricas de sucesso de registro
    - Adicionar visualização de performance
    - Criar alertas para falhas críticas
    - _Requirements: 8.3, 8.4_

  - [x] 11.2 Implementar logging detalhado
    - Adicionar logs estruturados para auditoria
    - Implementar captura de contexto de erros
    - Integrar com sistema de monitoramento existente
    - _Requirements: 8.1, 8.2, 8.5_

  - [ ]* 11.3 Escrever testes de propriedade para monitoramento
    - **Property 27: Comprehensive Logging**
    - **Property 28: Error Context Capture**
    - **Property 29: Performance Metrics Collection**
    - **Property 30: Audit Trail Completeness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 12. Implementar migração e compatibilidade
  - [x] 12.1 Criar sistema de feature flag
    - Implementar toggle entre fluxo antigo e novo
    - Adicionar configuração por ambiente
    - Permitir rollback imediato se necessário
    - _Requirements: 9.5_

  - [x] 12.2 Implementar migração de dados pendentes
    - Identificar processos de filiação incompletos
    - Criar ferramenta de completamento manual
    - Migrar dados para novo formato
    - _Requirements: 9.3_

  - [x] 12.3 Simplificar políticas RLS
    - Remover verificação de status='ativo' das políticas SELECT/UPDATE
    - Justificativa: Contas só existem se pagamento confirmado
    - Manter verificação apenas para admins
    - _Requirements: 3.5, 9.1_

  - [ ]* 12.4 Escrever testes de propriedade para migração
    - **Property 31: Backward Compatibility**
    - **Property 32: Existing User Non-Regression**
    - **Property 33: Pending Process Completion**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 13. Testes de performance e carga
  - [x] 13.1 Implementar testes de performance
    - Validar tempo de processamento < 25 segundos
    - Testar comportamento sob carga
    - Otimizar chamadas de API
    - _Requirements: 10.1, 10.4, 10.5_

  - [ ]* 13.2 Escrever testes de propriedade para performance
    - **Property 36: Graceful Timeout Handling**
    - **Property 37: Load Responsiveness**
    - **Property 38: API Call Optimization**
    - **Validates: Requirements 10.3, 10.4, 10.5**

- [x] 14. Deploy e ativação gradual
  - [x] 14.1 Deploy em produção com feature flag DESABILITADA
    - Aplicar migrações de banco em horário de baixo tráfego
    - Deploy de Edge Functions sem ativação
    - Deploy de frontend com feature flag OFF
    - Validar que sistema antigo continua funcionando
    - _Requirements: 9.1, 9.5_

  - [x] 14.2 Ativação gradual em produção
    - Ativar para percentual pequeno de usuários (5%)
    - Monitorar métricas e erros
    - Aumentar gradualmente até 100%
    - _Requirements: 10.1, 10.4_

  - [x] 14.3 Limpeza pós-migração
    - Remover código do fluxo antigo
    - Limpar tabelas e campos não utilizados
    - Atualizar documentação
    - _Requirements: 9.4_

- [x] 15. Final checkpoint - Validação completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation follows TypeScript patterns established in the project
- Edge Functions use Supabase's Deno runtime
- Frontend components integrate with existing React/TypeScript architecture

## Arquivos Afetados na Integração do Formulário (Fase 8)

### Novos Arquivos a Criar:
- `src/lib/adapters/FiliacaoToPaymentFirstFlow.ts` - Adapter de dados
- `src/lib/adapters/PaymentFirstFlowToFiliacao.ts` - Adapter reverso (se necessário)
- `src/hooks/usePaymentFirstFlowIntegration.ts` - Hook de integração
- `src/utils/memberTypeMapping.ts` - Mapeamento de tipos de membros
- `src/__tests__/lib/adapters/FiliacaoToPaymentFirstFlow.test.ts` - Testes do adapter

### Arquivos Existentes a Modificar:
- `src/hooks/useFiliacaoPayment.ts` - Integrar PaymentFirstFlowService
- `src/components/payments/PaymentFormEnhanced.tsx` - Ajustes de validação (se necessário)
- `src/pages/Filiacao.tsx` - Feature flag e logging (se necessário)
- `src/hooks/useMemberTypeWithPlan.ts` - Compatibilidade com mapeamento

### Arquivos de Configuração:
- `.env` - Adicionar feature flags se necessário
- `src/lib/constants.ts` - Constantes de mapeamento de tipos

## Estratégia de Rollback

Em caso de problemas na integração:
1. **Feature Flag**: Desabilitar novo fluxo via variável de ambiente
2. **Hook Fallback**: `useFiliacaoPayment` mantém lógica antiga como fallback
3. **Dados**: Estruturas antigas permanecem funcionais
4. **UI**: Interface não muda, apenas processamento interno

## Critérios de Sucesso da Integração

- [ ] Formulário funciona com ambos os fluxos (antigo e novo)
- [ ] Validações mantêm mesmo comportamento para usuário
- [ ] Tipos de membros customizados do admin continuam funcionando
- [ ] Performance igual ou melhor que fluxo atual
- [ ] Zero downtime durante migração
- [ ] Rollback funcional em menos de 5 minutos