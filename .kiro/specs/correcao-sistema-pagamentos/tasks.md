# Implementation Plan: Correção Sistema Pagamentos

## Overview

Implementação das correções críticas no sistema de pagamentos e afiliados, focando em 4 pontos principais: split correto na criação do pagamento, webhook handler funcional, rastreamento de afiliados ativo e ativação de todos os componentes.

## Tasks

- [ ] 1. Implementar ReferralTracker Frontend
  - Criar `src/utils/referral-tracker.ts` com captura de códigos ?ref=
  - Implementar localStorage com TTL de 30 dias
  - Adicionar métodos de captura, recuperação e limpeza
  - Integrar captura automática no carregamento das páginas
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 1.1 Escrever testes de propriedade para ReferralTracker
  - **Property 7: Referral Code Capture**
  - **Property 8: Referral Code Persistence** 
  - **Property 9: Referral Code Cleanup**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

- [ ] 2. Corrigir CheckoutService com Split Integrado
  - Modificar `src/services/checkout.service.ts`
  - Implementar `calculateSplit()` com lógica de redistribuição correta
  - Remover split de 70% para fábrica (automático via API Key)
  - Incluir split na criação do pagamento (não separadamente)
  - Adicionar validação de Wallet IDs formato wal_xxxxx
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 2.1 Escrever testes de propriedade para CheckoutService
  - **Property 1: Split Total Consistency**
  - **Property 2: Split Creation Integration**
  - **Property 3: Factory Split Exclusion**
  - **Property 4: Wallet ID Format Validation**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 4.5**

- [ ] 2.2 Escrever testes unitários para cenários de redistribuição
  - Testar cenário sem afiliado (15% + 15%)
  - Testar cenário apenas N1 (15% + 7.5% + 7.5%)
  - Testar cenário N1+N2 (15% + 3% + 6% + 6%)
  - Testar cenário rede completa (15% + 3% + 2% + 5% + 5%)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3. Implementar WebhookHandler Completo
  - Criar `src/api/webhook/asaas.ts`
  - Implementar validação de assinatura de webhook
  - Adicionar handlers para todos os eventos necessários
  - Implementar retry automático para falhas
  - Integrar com OrderAffiliateProcessor
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.7_

- [ ] 3.1 Escrever testes de propriedade para WebhookHandler
  - **Property 5: Webhook Authentication**
  - **Property 6: Webhook Retry Mechanism**
  - **Property 17: Webhook Security Configuration**
  - **Validates: Requirements 2.1, 2.6, 7.7**

- [ ] 3.2 Escrever testes unitários para eventos de webhook
  - Testar PAYMENT_RECEIVED → identificar pedido
  - Testar PAYMENT_CONFIRMED → disparar comissões
  - Testar PAYMENT_SPLIT_CANCELLED → registrar erro
  - Testar PAYMENT_SPLIT_DIVERGENCE_BLOCK → investigar
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ] 4. Conectar OrderAffiliateProcessor
  - Modificar `src/services/sales/order-affiliate-processor.ts`
  - Integrar chamada pelo webhook handler
  - Corrigir integração com CommissionCalculatorService
  - Implementar logs detalhados de auditoria
  - Adicionar tratamento robusto de erros
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 4.1 Escrever testes de propriedade para OrderAffiliateProcessor
  - **Property 13: Order Processing Chain**
  - **Property 14: Commission Calculation Logging**
  - **Property 15: Error Handling Consistency**
  - **Property 16: Status Update Consistency**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 5. Checkpoint - Testar Fluxo Básico
  - Testar captura de referral code no frontend
  - Testar checkout com split correto
  - Testar processamento de webhook
  - Verificar cálculo de comissões
  - Garantir que todos os testes passam

- [ ] 6. Ativar Afiliados Existentes no Banco
  - Conectar ao banco via Supabase Power
  - Alterar status de "pending" para "active" nos 2 afiliados
  - Corrigir wallet_id de formato UUID para wal_xxxxx
  - Validar Wallet IDs via API Asaas antes de ativar
  - Enviar notificações de boas-vindas
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6.1 Escrever testes de propriedade para ativação de afiliados
  - **Property 10: Affiliate Status Activation**
  - **Property 11: Wallet ID Format Conversion**
  - **Property 12: External Wallet Validation**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**

- [ ] 7. Configurar Webhooks Completos no Asaas
  - Configurar webhook para PAYMENT_RECEIVED
  - Configurar webhook para PAYMENT_CONFIRMED
  - Configurar webhook para PAYMENT_SPLIT_CANCELLED
  - Configurar webhook para PAYMENT_SPLIT_DIVERGENCE_BLOCK
  - Configurar webhook para PAYMENT_OVERDUE
  - Configurar webhook para PAYMENT_REFUNDED
  - Usar token de autenticação seguro
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 7.1 Escrever testes unitários para configuração de webhooks
  - Testar configuração de cada evento específico
  - Testar token de autenticação seguro
  - Validar URL de webhook correta
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 8. Implementar Validações de Segurança
  - Adicionar validação rigorosa de formato Wallet ID
  - Implementar verificação de status "active" de afiliados
  - Adicionar detecção de loops na rede genealógica
  - Implementar rejeição de transações inválidas com logs
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 8.1 Escrever testes de propriedade para validações
  - **Property 18: Affiliate Status Verification**
  - **Property 19: Network Loop Prevention**
  - **Validates: Requirements 8.3, 8.4, 8.5**

- [ ] 9. Remover Dados Mock do Dashboard
  - Modificar páginas em `src/pages/admin/agente/`
  - Conectar AgenteIA.tsx com APIs reais
  - Conectar AgenteConfiguracao.tsx com backend real
  - Remover dados mock de AgenteMcp.tsx
  - Implementar estados de loading e erro adequados
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Implementar Sistema de Logs e Auditoria
  - Adicionar logs detalhados para processamento de splits
  - Implementar auditoria completa de cálculos de comissão
  - Registrar contexto completo de erros
  - Adicionar confirmação de depósitos de splits
  - Implementar métricas de performance
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10.1 Escrever testes de propriedade para logging
  - **Property 20: Split Execution Confirmation**
  - **Property 21: Error Context Logging**
  - **Validates: Requirements 10.3, 10.4**

- [ ] 11. Checkpoint Final - Teste Completo do Sistema
  - Testar fluxo completo: link afiliado → compra → webhook → comissão
  - Validar split automático no Asaas (sandbox)
  - Confirmar comissões calculadas e salvas
  - Verificar notificações de afiliados
  - Testar cenários de erro e recuperação
  - Garantir que todos os testes passam

- [ ] 12. Preparar Deploy em Produção
  - Validar todas as variáveis de ambiente
  - Confirmar Wallet IDs reais dos gestores
  - Testar configuração de webhooks em produção
  - Implementar monitoramento ativo
  - Criar documentação de troubleshooting

## Notes

- Tasks de teste são obrigatórias para garantir qualidade e correção completa
- Cada task referencia requirements específicos para rastreabilidade
- Checkpoints garantem validação incremental do sistema
- Property tests validam propriedades universais de correção
- Unit tests validam exemplos específicos e casos edge
- Foco na correção dos 4 problemas críticos identificados no relatório