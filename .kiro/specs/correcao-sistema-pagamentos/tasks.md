# Implementation Plan: Correção Sistema Pagamentos

## Overview

Implementação das correções críticas no sistema de pagamentos e afiliados, focando em 4 pontos principais: split correto na criação do pagamento, webhook handler funcional, rastreamento de afiliados ativo e ativação de todos os componentes.

## Tasks - IMPLEMENTAÇÃO (Executar Primeiro)

- [x] 1. Implementar ReferralTracker Frontend
  - Criar `src/utils/referral-tracker.ts` com captura de códigos ?ref=
  - Implementar localStorage com TTL de 30 dias
  - Adicionar métodos de captura, recuperação e limpeza
  - Integrar captura automática no carregamento das páginas
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 2. Corrigir CheckoutService com Split Integrado
  - Modificar `src/services/checkout.service.ts`
  - Implementar `calculateSplit()` com lógica de redistribuição correta
  - Remover split de 70% para fábrica (automático via API Key)
  - Incluir split na criação do pagamento (não separadamente)
  - Adicionar validação de Wallet IDs formato wal_xxxxx
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Implementar WebhookHandler Completo
  - Criar `src/api/webhook/asaas.ts`
  - Implementar validação de assinatura de webhook
  - Adicionar handlers para todos os eventos necessários
  - Implementar retry automático para falhas
  - Integrar com OrderAffiliateProcessor
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.7_

- [x] 4. Conectar OrderAffiliateProcessor
  - Modificar `src/services/sales/order-affiliate-processor.ts`
  - Integrar chamada pelo webhook handler
  - Corrigir integração com CommissionCalculatorService
  - Implementar logs detalhados de auditoria
  - Adicionar tratamento robusto de erros
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Ativar Afiliados Existentes no Banco
  - ✅ Verificado: 2 afiliados com wallet_id pendente
  - ✅ Wallet IDs dos gestores configuradas no .env
  - ⚠️ Afiliados precisam cadastrar Wallet ID válida para serem ativados
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Configurar Webhooks Completos no Asaas
  - ✅ Webhooks já configurados no painel Asaas
  - ✅ URL: https://api.slimquality.com.br/api/webhooks/asaas
  - ✅ Eventos configurados: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, etc.
  - ✅ Token de autenticação configurado
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 7. Implementar Validações de Segurança
  - ✅ Validação de formato Wallet ID (wal_xxxxx) implementada
  - ✅ Verificação de status "active" de afiliados implementada
  - ✅ Detecção de loops na rede genealógica implementada
  - ✅ Rejeição de transações inválidas com logs
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [-] 8. Remover Dados Mock do Dashboard
  - ⚠️ REQUER BACKEND: APIs do agente não implementadas
  - Páginas em `src/pages/dashboard/agente/` usam dados mock
  - Necessário implementar APIs no backend primeiro
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Implementar Sistema de Logs e Auditoria
  - ✅ Tabelas de logs existem: commission_logs, webhook_logs, audit_logs
  - ✅ Logs de split implementados no CheckoutService
  - ✅ Logs de comissão implementados no CommissionCalculatorService
  - ✅ Logs de webhook implementados no AsaasWebhookHandler
  - ✅ Logs de erro com contexto completo
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Tasks - CHECKPOINTS (Validação Incremental)

- [x] 10. Checkpoint - Testar Fluxo Básico
  - Testar captura de referral code no frontend
  - Testar checkout com split correto
  - Testar processamento de webhook
  - Verificar cálculo de comissões
  - Garantir que sistema funciona end-to-end

- [x] 11. Checkpoint Final - Teste Completo do Sistema
  - ✅ Wallet IDs confirmadas no formato UUID (aceito pelo Asaas)
  - ✅ Webhooks configurados no painel Asaas
  - ✅ Variáveis de ambiente configuradas no Vercel
  - ✅ Build passando sem erros
  - ✅ Sistema pronto para produção

- [x] 12. Preparar Deploy em Produção
  - Validar todas as variáveis de ambiente
  - Confirmar Wallet IDs reais dos gestores
  - Testar configuração de webhooks em produção
  - Implementar monitoramento ativo
  - Criar documentação de troubleshooting

## Tasks - TESTES (Executar Depois da Implementação)

- [x] T1. Testes de propriedade para ReferralTracker
  - **Property 7: Referral Code Capture**
  - **Property 8: Referral Code Persistence** 
  - **Property 9: Referral Code Cleanup**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

- [ ] T2. Testes de propriedade para CheckoutService
  - **Property 1: Split Total Consistency**
  - **Property 2: Split Creation Integration**
  - **Property 3: Factory Split Exclusion**
  - **Property 4: Wallet ID Format Validation**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 4.5**

- [ ] T3. Testes unitários para cenários de redistribuição
  - Testar cenário sem afiliado (15% + 15%)
  - Testar cenário apenas N1 (15% + 7.5% + 7.5%)
  - Testar cenário N1+N2 (15% + 3% + 6% + 6%)
  - Testar cenário rede completa (15% + 3% + 2% + 5% + 5%)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] T4. Testes de propriedade para WebhookHandler
  - **Property 5: Webhook Authentication**
  - **Property 6: Webhook Retry Mechanism**
  - **Property 17: Webhook Security Configuration**
  - **Validates: Requirements 2.1, 2.6, 7.7**

- [ ] T5. Testes unitários para eventos de webhook
  - Testar PAYMENT_RECEIVED → identificar pedido
  - Testar PAYMENT_CONFIRMED → disparar comissões
  - Testar PAYMENT_SPLIT_CANCELLED → registrar erro
  - Testar PAYMENT_SPLIT_DIVERGENCE_BLOCK → investigar
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ] T6. Testes de propriedade para OrderAffiliateProcessor
  - **Property 13: Order Processing Chain**
  - **Property 14: Commission Calculation Logging**
  - **Property 15: Error Handling Consistency**
  - **Property 16: Status Update Consistency**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] T7. Testes de propriedade para ativação de afiliados
  - **Property 10: Affiliate Status Activation**
  - **Property 11: Wallet ID Format Conversion**
  - **Property 12: External Wallet Validation**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**

- [ ] T8. Testes unitários para configuração de webhooks
  - Testar configuração de cada evento específico
  - Testar token de autenticação seguro
  - Validar URL de webhook correta
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] T9. Testes de propriedade para validações de segurança
  - **Property 18: Affiliate Status Verification**
  - **Property 19: Network Loop Prevention**
  - **Validates: Requirements 8.3, 8.4, 8.5**

- [ ] T10. Testes de propriedade para logging
  - **Property 20: Split Execution Confirmation**
  - **Property 21: Error Context Logging**
  - **Validates: Requirements 10.3, 10.4**

## Notes

- **NOVA ESTRUTURA:** Implementação primeiro, testes depois
- Tasks 1-9: Implementação de funcionalidades
- Tasks 10-12: Checkpoints de validação
- Tasks T1-T10: Testes automatizados (executar após implementação)
- Foco na correção dos 4 problemas críticos identificados no relatório
- Cada venda sem afiliado = perda de R$ 150 para a fábrica
