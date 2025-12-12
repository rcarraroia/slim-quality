# Implementation Plan - Sprint 4: Sistema de Afiliados Multinível

## Overview

Este plano de implementação converte o design do sistema de afiliados em tarefas específicas de código. Cada tarefa é incremental e testável, construindo o sistema mais crítico do projeto com máxima qualidade e segurança.

**Ordem de Execução:** As tarefas devem ser executadas sequencialmente, pois cada uma depende das anteriores.

**Foco:** Implementação-first development - implementar funcionalidade antes de testes correspondentes.

## Tasks

- [x] 1. Criar estrutura de banco de dados e migrations ✅ **CONCLUÍDO**
  - ✅ Criar todas as tabelas do sistema de afiliados
  - ✅ Implementar constraints, índices e triggers
  - ✅ Configurar Row Level Security (RLS)
  - ✅ Criar tipos ENUM necessários
  - ✅ **CORREÇÃO CRÍTICA:** Formato Wallet ID corrigido (UUID ao invés de wal_xxxxx)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 1.1 Criar tabela affiliates com validações ✅ **CONCLUÍDO**
  - ✅ Implementar estrutura completa da tabela affiliates
  - ✅ Adicionar constraints para wallet_id (UUID) e referral_code
  - ✅ Criar índices otimizados para consultas
  - ✅ Configurar trigger para updated_at
  - ✅ **CORREÇÃO:** Constraint wallet_id aceita UUID format
  - _Requirements: 1.1, 1.2, 1.5, 17.2_

- [x] 1.2 Criar tabela affiliate_network com prevenção de loops ✅ **CONCLUÍDO**
  - ✅ Implementar árvore genealógica self-referencing
  - ✅ Criar função check_network_loop() em PL/pgSQL
  - ✅ Adicionar trigger para prevenir loops automaticamente
  - ✅ Criar índices para queries de árvore hierárquica
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.3 Criar tabelas de rastreamento (referral_clicks, referral_conversions) ✅ **CONCLUÍDO**
  - ✅ Implementar tabela referral_clicks para analytics
  - ✅ Implementar tabela referral_conversions para vendas
  - ✅ Adicionar índices para consultas de performance
  - ✅ Configurar campos de geolocalização e UTM
  - _Requirements: 4.2, 4.3, 5.1, 5.2, 5.3_

- [x] 1.4 Criar tabelas de comissões (commissions, commission_splits) ✅ **CONCLUÍDO**
  - ✅ Implementar tabela commissions com todos os níveis
  - ✅ Implementar tabela commission_splits para auditoria
  - ✅ Adicionar constraint único para evitar duplicatas
  - ✅ Criar índices para consultas administrativas
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 1.5 Criar tabelas auxiliares (asaas_wallets, commission_logs) ✅ **CONCLUÍDO**
  - ✅ Implementar cache de validação de wallets
  - ✅ Implementar logs completos para auditoria
  - ✅ Configurar políticas RLS para segurança
  - ✅ Adicionar índices para consultas de logs
  - _Requirements: 2.1, 2.2, 2.3, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 1.6 Criar testes de migração e integridade
  - Escrever testes para validar estrutura do banco
  - Testar constraints e triggers
  - Validar políticas RLS
  - Testar prevenção de loops na árvore
  - _Requirements: 17.1, 17.2, 17.3_

- [x] 2. Implementar serviços core de validação ✅ **CONCLUÍDO**
  - ✅ Criar AsaasClient estendido para validação de wallets
  - ✅ Implementar cache de validações
  - ✅ Criar sistema de retry com backoff exponencial
  - ✅ Implementar logs estruturados
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.1 Estender AsaasClient para validação de wallets ✅ **CONCLUÍDO**
  - ✅ Adicionar método validateWallet() ao AsaasClient existente
  - ✅ Implementar getWalletInfo() com dados completos
  - ✅ Configurar timeout e retry policy
  - ✅ Adicionar tratamento de erros específicos da API Asaas
  - ✅ **IMPLEMENTADO:** WalletValidatorService com cache e retry logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.2 Implementar cache de validações de wallet ✅ **CONCLUÍDO**
  - ✅ Criar AffiliateCacheService com Redis (implementado in-memory)
  - ✅ Implementar TTL de 5 minutos para validações
  - ✅ Adicionar invalidação manual de cache
  - ✅ Criar métricas de hit/miss do cache
  - ✅ **IMPLEMENTADO:** Cache integrado no WalletValidatorService
  - _Requirements: 2.5, 15.3_

- [x] 2.3 Criar sistema de logs estruturados ✅ **CONCLUÍDO**
  - ✅ Estender Logger existente para contexto de afiliados
  - ✅ Implementar logs de validação e operações críticas
  - ✅ Adicionar correlationId para rastreamento
  - ✅ Configurar níveis de log apropriados
  - ✅ **IMPLEMENTADO:** Logs estruturados em todos os services
  - _Requirements: 12.4, 14.5_

- [ ]* 2.4 Escrever testes para validação de wallets
  - Testar validação com wallets válidas e inválidas
  - Testar comportamento de cache
  - Testar retry policy e timeouts
  - Mockar respostas da API Asaas
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Implementar AffiliateService e gestão de rede ✅ **CONCLUÍDO**
  - ✅ Criar service principal para gestão de afiliados
  - ✅ Implementar construção da árvore genealógica
  - ✅ Adicionar validações de integridade da rede
  - ✅ Implementar geração de códigos únicos
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.1 Criar AffiliateService base ✅ **CONCLUÍDO**
  - ✅ Implementar createAffiliate() com validações completas
  - ✅ Adicionar generateReferralCode() único
  - ✅ Implementar getAffiliateByCode() otimizado
  - ✅ Criar getAffiliateStats() com métricas
  - ✅ **IMPLEMENTADO:** AffiliateService completo com todas as funcionalidades
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 3.2 Implementar construção da árvore genealógica ✅ **CONCLUÍDO**
  - ✅ Criar buildNetwork() para vincular afiliados
  - ✅ Implementar getNetworkTree() com estrutura hierárquica
  - ✅ Adicionar validateNetworkIntegrity() para detectar loops
  - ✅ Implementar getMyNetwork() para dashboard
  - ✅ **IMPLEMENTADO:** Gestão completa da árvore genealógica
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.3 Implementar validações de segurança ✅ **CONCLUÍDO**
  - ✅ Adicionar validação de dados com Zod schemas
  - ✅ Implementar rate limiting para cadastros
  - ✅ Criar validação de loops na árvore
  - ✅ Adicionar logs de operações suspeitas
  - ✅ **IMPLEMENTADO:** Validações completas de segurança
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ]* 3.4 Escrever testes para AffiliateService
  - Testar criação de afiliados com e sem indicação
  - Testar construção da árvore genealógica
  - Testar detecção de loops
  - Testar geração de códigos únicos
  - _Requirements: 1.1, 3.1, 3.4_

- [ ] 4. Implementar sistema de rastreamento de links
  - Criar middleware para captura de códigos de referência
  - Implementar registro de cliques
  - Adicionar sistema de cookies/sessão
  - Implementar analytics básicas
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4.1 Criar middleware de rastreamento
  - Implementar captura de parâmetro ?ref= em todas as rotas
  - Adicionar sistema de cookies com TTL de 30 dias
  - Registrar cliques em referral_clicks
  - Implementar deduplicação por IP/sessão
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4.2 Implementar ReferralTracker service
  - Criar trackClick() para registrar cliques
  - Implementar trackConversion() para vendas
  - Adicionar getClickStats() para analytics
  - Implementar limpeza de dados antigos
  - _Requirements: 4.2, 4.3, 5.1, 5.2_

- [ ] 4.3 Integrar rastreamento com sistema de pedidos
  - Modificar criação de pedidos para capturar referência
  - Associar pedidos a afiliados automaticamente
  - Registrar conversões em referral_conversions
  - Implementar fallback para pedidos sem referência
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 4.4 Escrever testes para rastreamento
  - Testar captura de códigos de referência
  - Testar persistência de cookies
  - Testar registro de cliques e conversões
  - Testar deduplicação
  - _Requirements: 4.1, 4.2, 5.1_

- [x] 5. Implementar CommissionCalculator (núcleo crítico) ✅ **CONCLUÍDO**
  - ✅ Criar algoritmo de cálculo de comissões multinível
  - ✅ Implementar regras de redistribuição
  - ✅ Adicionar validações de integridade financeira
  - ✅ Implementar logs completos para auditoria
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5.1 Criar CommissionCalculator base ✅ **CONCLUÍDO**
  - ✅ Implementar calculateCommissions() principal
  - ✅ Adicionar getNetworkForOrder() para buscar árvore
  - ✅ Implementar cálculo de percentuais por nível (15%, 3%, 2%)
  - ✅ Criar validateCalculation() para integridade
  - ✅ **IMPLEMENTADO:** CommissionCalculatorService completo
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.1, 9.2, 9.3_

- [x] 5.2 Implementar regras de redistribuição ✅ **CONCLUÍDO**
  - ✅ Criar calculateRedistribution() para gestores
  - ✅ Implementar lógica para cenários: apenas N1, N1+N2, completo
  - ✅ Adicionar applyRedistribution() ao split final
  - ✅ Validar que soma sempre equals 30%
  - ✅ **IMPLEMENTADO:** Lógica completa de redistribuição
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5.3 Implementar validações críticas de integridade ✅ **CONCLUÍDO**
  - ✅ Adicionar validação que soma = 100% do valor
  - ✅ Implementar verificação de valores não-negativos
  - ✅ Criar validação de Wallet IDs antes do split
  - ✅ Adicionar rollback em caso de erro
  - ✅ **IMPLEMENTADO:** Validações completas de integridade
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5.4 Implementar logs de auditoria completos ✅ **CONCLUÍDO**
  - ✅ Registrar todos os cálculos em commission_logs
  - ✅ Adicionar detalhes de redistribuição
  - ✅ Implementar rastreamento de alterações
  - ✅ Criar logs estruturados para debugging
  - ✅ **IMPLEMENTADO:** Sistema completo de auditoria
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 5.5 Escrever testes extensivos para CommissionCalculator
  - Testar todos os cenários de rede (completa, N1+N2, apenas N1)
  - Testar cálculos de redistribuição
  - Testar validações de integridade
  - Testar casos de erro e rollback
  - _Requirements: 6.1, 7.1, 9.1_

- [ ] 6. Implementar integração com Asaas para split automático
  - Estender AsaasClient para operações de split
  - Implementar criação de splits com múltiplas wallets
  - Adicionar validações pré-split
  - Implementar idempotência e retry
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 6.1 Estender AsaasClient para splits
  - Adicionar createSplit() com validações
  - Implementar getSplitStatus() para monitoramento
  - Adicionar cancelSplit() para casos de erro
  - Implementar validateSplitIntegrity() pré-envio
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 6.2 Implementar SplitProcessor service
  - Criar processSplit() principal
  - Implementar preparação de payload para Asaas
  - Adicionar validação de todas as Wallet IDs
  - Implementar confirmação de split
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 6.3 Implementar idempotência e controle de erros
  - Adicionar verificação de split já processado
  - Implementar retry com backoff exponencial
  - Criar rollback para falhas críticas
  - Adicionar alertas para administradores
  - _Requirements: 8.5, 16.1, 16.2, 16.3_

- [ ]* 6.4 Escrever testes para integração Asaas
  - Testar criação de splits com dados válidos
  - Testar validações pré-split
  - Testar idempotência
  - Mockar respostas da API Asaas
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 7. Criar Edge Functions para processamento assíncrono
  - Implementar calculate-commissions function
  - Criar validate-wallet function
  - Implementar process-split function
  - Adicionar notify-affiliates function
  - _Requirements: 6.1, 2.1, 8.1, 13.1_

- [ ] 7.1 Implementar calculate-commissions Edge Function
  - Criar função principal para cálculo assíncrono
  - Integrar com CommissionCalculator
  - Implementar tratamento de erros robusto
  - Adicionar logs estruturados
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7.2 Implementar validate-wallet Edge Function
  - Criar validação rápida de Wallet IDs
  - Implementar cache com TTL
  - Adicionar rate limiting
  - Integrar com AsaasClient
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 7.3 Implementar process-split Edge Function
  - Criar processamento de splits assíncrono
  - Integrar com SplitProcessor
  - Implementar retry automático
  - Adicionar notificações de status
  - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [ ]* 7.4 Escrever testes para Edge Functions
  - Testar cada função isoladamente
  - Testar integração com services
  - Testar tratamento de erros
  - Validar performance e timeouts
  - _Requirements: 6.1, 2.1, 8.1_

- [x] 8. Implementar APIs REST para afiliados ✅ **CONCLUÍDO**
  - ✅ Criar rotas de cadastro e gestão
  - ✅ Implementar dashboard de afiliados
  - ✅ Adicionar APIs administrativas
  - ✅ Implementar autenticação e autorização
  - _Requirements: 1.1, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 8.1 Criar rotas de cadastro de afiliados ✅ **CONCLUÍDO**
  - ✅ Implementar POST /api/affiliates/register
  - ✅ Adicionar validação completa de dados
  - ✅ Integrar com validação de Wallet ID
  - ✅ Implementar rate limiting
  - ✅ **IMPLEMENTADO:** API completa de cadastro de afiliados
  - _Requirements: 1.1, 1.2, 1.3, 14.4_

- [x] 8.2 Implementar dashboard de afiliados ✅ **CONCLUÍDO**
  - ✅ Criar GET /api/affiliates/dashboard
  - ✅ Implementar GET /api/affiliates/referral-link
  - ✅ Adicionar GET /api/affiliates/network
  - ✅ Implementar métricas de performance
  - ✅ **IMPLEMENTADO:** APIs completas do dashboard
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8.3 Criar APIs de comissões ✅ **CONCLUÍDO**
  - ✅ Implementar GET /api/commissions/my-commissions
  - ✅ Adicionar GET /api/commissions/stats
  - ✅ Implementar paginação e filtros
  - ✅ Adicionar exportação de dados
  - ✅ **IMPLEMENTADO:** APIs completas de comissões
  - _Requirements: 10.3, 10.4_

- [x] 8.4 Implementar APIs administrativas ✅ **CONCLUÍDO**
  - ✅ Criar GET /api/admin/affiliates com paginação
  - ✅ Implementar PUT /api/admin/affiliates/:id/status
  - ✅ Adicionar GET /api/admin/affiliates/:id/network
  - ✅ Implementar GET /api/admin/commissions
  - ✅ **IMPLEMENTADO:** APIs administrativas completas
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 8.5 Escrever testes de integração para APIs
  - Testar todas as rotas com dados válidos e inválidos
  - Testar autenticação e autorização
  - Testar paginação e filtros
  - Validar rate limiting
  - _Requirements: 1.1, 10.1, 11.1_

- [x] 8.6 Implementar Frontend Service Integration ✅ **CONCLUÍDO**
  - ✅ Criar AffiliateFrontendService para integração com APIs
  - ✅ Implementar métodos para todas as operações de afiliados
  - ✅ Adicionar tratamento de erros e loading states
  - ✅ Implementar cache e otimizações de performance
  - ✅ **IMPLEMENTADO:** Serviço frontend completo para integração
  - _Requirements: Frontend Integration_

- [ ] 9. Implementar sistema de notificações
  - Criar NotificationService para emails e WhatsApp
  - Implementar templates de notificação
  - Adicionar configurações de preferência
  - Implementar fila de processamento
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 9.1 Criar NotificationService base
  - Implementar sendCommissionNotification()
  - Adicionar sendWelcomeEmail()
  - Criar sendStatusChangeNotification()
  - Implementar templates dinâmicos
  - _Requirements: 13.1, 13.2_

- [ ] 9.2 Integrar com WhatsApp Business API
  - Adicionar suporte a notificações WhatsApp
  - Implementar templates aprovados
  - Adicionar fallback para email
  - Implementar opt-out automático
  - _Requirements: 13.3_

- [ ] 9.3 Implementar sistema de preferências
  - Criar configurações por afiliado
  - Implementar opt-in/opt-out
  - Adicionar frequência de notificações
  - Criar dashboard de preferências
  - _Requirements: 13.4_

- [ ]* 9.4 Escrever testes para notificações
  - Testar envio de emails
  - Testar integração WhatsApp
  - Testar sistema de preferências
  - Mockar APIs externas
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 10. Implementar webhook handler para processamento automático
  - Estender webhook existente do Sprint 3
  - Adicionar detecção de vendas com afiliados
  - Implementar trigger automático de cálculos
  - Adicionar logs de processamento
  - _Requirements: 5.4, 6.1, 12.1_

- [ ] 10.1 Estender webhook handler do Asaas
  - Modificar handler existente para detectar afiliados
  - Adicionar trigger para calculate-commissions
  - Implementar validação de integridade
  - Adicionar logs específicos de comissões
  - _Requirements: 5.4, 6.1_

- [ ] 10.2 Implementar processamento assíncrono
  - Criar fila para cálculos de comissão
  - Implementar retry automático
  - Adicionar monitoramento de performance
  - Implementar alertas para falhas
  - _Requirements: 15.4, 16.1, 16.2_

- [ ]* 10.3 Escrever testes para webhook processing
  - Testar detecção de vendas com afiliados
  - Testar trigger de cálculos
  - Testar processamento assíncrono
  - Validar logs e auditoria
  - _Requirements: 5.4, 6.1, 12.1_

- [ ] 11. Implementar sistema de métricas e monitoramento
  - Criar endpoint de health check
  - Implementar métricas de performance
  - Adicionar alertas automáticos
  - Criar dashboard de monitoramento
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 11.1 Criar health check específico para afiliados
  - Implementar GET /health/affiliates
  - Adicionar verificação de conectividade Asaas
  - Implementar check de integridade do banco
  - Adicionar métricas de performance
  - _Requirements: 20.1, 20.4_

- [ ] 11.2 Implementar sistema de alertas
  - Criar alertas para erros críticos
  - Implementar detecção de anomalias
  - Adicionar notificações para admins
  - Criar dashboard de status
  - _Requirements: 20.2, 20.3_

- [ ]* 11.3 Escrever testes para monitoramento
  - Testar health checks
  - Testar sistema de alertas
  - Validar métricas de performance
  - Testar detecção de anomalias
  - _Requirements: 20.1, 20.2_

- [ ] 12. Implementar segurança e Row Level Security (RLS)
  - Configurar políticas RLS para todas as tabelas
  - Implementar validações de acesso
  - Adicionar auditoria de operações sensíveis
  - Implementar rate limiting avançado
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 12.1 Configurar RLS para tabelas de afiliados
  - Implementar políticas para affiliates
  - Configurar RLS para affiliate_network
  - Adicionar políticas para commissions
  - Implementar acesso administrativo
  - _Requirements: 14.1, 14.2_

- [ ] 12.2 Implementar rate limiting avançado
  - Adicionar limites por IP e usuário
  - Implementar whitelist para admins
  - Criar limites específicos por endpoint
  - Adicionar logs de tentativas suspeitas
  - _Requirements: 14.4, 14.5_

- [ ]* 12.3 Escrever testes de segurança
  - Testar políticas RLS
  - Testar rate limiting
  - Validar controle de acesso
  - Testar tentativas de bypass
  - _Requirements: 14.1, 14.4_

- [ ] 13. Implementar backup e recuperação
  - Configurar backup automático de dados críticos
  - Implementar procedimentos de recuperação
  - Adicionar validação de integridade
  - Criar documentação de disaster recovery
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 13.1 Configurar backup automático
  - Implementar backup diário das tabelas críticas
  - Adicionar compressão e criptografia
  - Configurar retenção de 90 dias
  - Implementar verificação de integridade
  - _Requirements: 19.1, 19.2_

- [ ] 13.2 Implementar procedimentos de recuperação
  - Criar scripts de restore pontual
  - Implementar validação pós-restore
  - Adicionar documentação detalhada
  - Criar testes de recuperação
  - _Requirements: 19.3, 19.5_

- [ ]* 13.3 Escrever testes para backup/recovery
  - Testar procedimentos de backup
  - Testar restore de dados
  - Validar integridade pós-restore
  - Testar cenários de disaster recovery
  - _Requirements: 19.1, 19.3_

- [ ] 14. Realizar testes de integração completos
  - Executar testes end-to-end do fluxo completo
  - Validar todos os cenários de comissão
  - Testar performance sob carga
  - Validar integridade financeira
  - _Requirements: Todos os requirements_

- [ ] 14.1 Executar testes end-to-end completos
  - Testar fluxo: cadastro → clique → venda → comissão → pagamento
  - Validar todos os cenários de rede (N1, N1+N2, N1+N2+N3)
  - Testar redistribuição em todos os casos
  - Validar integração com Asaas
  - _Requirements: 1.1, 4.1, 5.1, 6.1, 8.1_

- [ ] 14.2 Executar testes de performance
  - Testar cálculos com alto volume de afiliados
  - Validar tempo de resposta das APIs
  - Testar concorrência em operações críticas
  - Validar performance do banco de dados
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 14.3 Validar integridade financeira completa
  - Executar auditoria de todos os cálculos
  - Validar que nenhuma comissão foi perdida
  - Testar cenários de erro e recuperação
  - Validar logs de auditoria
  - _Requirements: 9.1, 9.2, 9.3, 12.1, 12.2_

- [ ] 15. Documentar e preparar para produção
  - Criar documentação técnica completa
  - Implementar scripts de deploy
  - Configurar monitoramento em produção
  - Criar runbooks operacionais
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [ ] 15.1 Criar documentação técnica
  - Documentar todas as APIs no formato OpenAPI
  - Criar guias de troubleshooting
  - Documentar procedimentos operacionais
  - Criar diagramas de arquitetura atualizados
  - _Requirements: 18.5_

- [ ] 15.2 Preparar scripts de deploy
  - Criar scripts de migração para produção
  - Implementar rollback automático
  - Configurar variáveis de ambiente
  - Criar checklist de deploy
  - _Requirements: 17.1, 17.2_

- [ ] 15.3 Configurar monitoramento em produção
  - Implementar dashboards de métricas
  - Configurar alertas críticos
  - Adicionar logs estruturados
  - Implementar rastreamento de erros
  - _Requirements: 20.1, 20.2, 20.3_

## Summary

Este plano de implementação garante que o sistema de afiliados seja construído de forma incremental e segura, com foco na integridade financeira e auditabilidade completa. Cada tarefa é testável e contribui para o objetivo final de um sistema robusto e confiável.

**Total de tarefas:** 15 principais + 46 sub-tarefas = 61 tarefas
**Tarefas opcionais de teste:** 15 tarefas marcadas com *
**Estimativa:** 10-15 dias de desenvolvimento intensivo
**Criticidade:** MÁXIMA - Sistema crítico do negócio

## 🎯 PROGRESSO ATUAL

### ✅ FASES CONCLUÍDAS (3/15 principais):

**FASE 1 - Database & Migrations (100% CONCLUÍDO):**
- ✅ Todas as 10 migrations executadas com sucesso
- ✅ Correção crítica: Wallet ID format (UUID ao invés de wal_xxxxx)
- ✅ Todas as tabelas criadas: affiliates, affiliate_network, commissions, etc.
- ✅ RLS policies configuradas e funcionais

**FASE 2 - Backend Core Services (100% CONCLUÍDO):**
- ✅ WalletValidatorService: Validação Asaas API + cache + retry
- ✅ AffiliateService: Gestão completa de afiliados e rede genealógica
- ✅ CommissionCalculatorService: Cálculo multinível + redistribuição

**FASE 3 - APIs & Frontend Integration (100% CONCLUÍDO):**
- ✅ APIs REST completas: /api/affiliates/* e /api/admin/affiliates/*
- ✅ AffiliateFrontendService: Integração frontend completa
- ✅ Validações, autenticação e tratamento de erros

### 🚧 PRÓXIMAS FASES:

**FASE 4 - Rastreamento de Links (0% executado):**
- Middleware para captura de códigos ?ref=
- Sistema de cookies e analytics
- Integração com sistema de pedidos

**FASE 5 - Integração Asaas Split (0% executado):**
- Extensão do AsaasClient para splits
- SplitProcessor service
- Processamento automático de comissões

**FASE 6 - Edge Functions (0% executado):**
- calculate-commissions function
- validate-wallet function
- process-split function

**PROGRESSO GERAL: 20% concluído (3 de 15 fases principais)**