# Implementation Plan: Correção Completa do Sistema de Afiliados

## Overview

Plano de implementação para corrigir os 14 problemas identificados na auditoria técnica, seguindo a arquitetura definida no design.md.

**Estratégia:** Implementação incremental em 3 fases, priorizando correções críticas que desbloqueiam funcionalidades essenciais.

## Tasks

- [ ] 0. PREPARAÇÃO: Backup e Validação Inicial
  - Garantir segurança antes de qualquer alteração
  - Tempo estimado: 30 minutos
  - _Requirements: Todos_

- [x] 0.1 Backup completo do banco de dados
  - Backup tabela `affiliates`
  - Backup tabela `affiliate_network`
  - Backup tabela `orders`
  - Backup tabela `commissions`
  - Salvar em: `/backups/pre-fix-20260111.sql`
  - Validar que restore funciona
  - _Requirements: Todos_

- [x] 0.2 Validar webhook Asaas existente
  - Verificar se webhook já está configurado
  - Documentar URL atual (se existir)
  - Documentar formato de payload
  - Documentar retry policy atual
  - _Requirements: 7.5_

- [ ] 1. FASE 1: Correções Críticas (Prioridade Máxima)
  - Corrigir problemas que impedem funcionamento básico
  - Tempo estimado: 2-3 dias
  - _Requirements: 1, 2, 3, 4, 6, 7_

### 1.A - IMPLEMENTAÇÃO: Constantes e LocalStorage

- [x] 1.1 Criar constantes de configuração
  - Criar arquivo `src/constants/storage-keys.ts`
  - Definir `STORAGE_KEYS.REFERRAL_CODE = 'slim_referral_code'`
  - Definir `WALLET_ID_PATTERN = /^wal_[a-zA-Z0-9]{20}$/`
  - Definir `COMMISSION_RATES` com valores corretos
  - _Requirements: 3.5, 14.4_

- [x] 1.2 Padronizar chave localStorage em TODO o código
  - Buscar TODAS as referências a `referralCode` e `slim_referral_code`
  - Substituir por `STORAGE_KEYS.REFERRAL_CODE`
  - Arquivos afetados:
    - `src/services/affiliate.service.ts`
    - `src/pages/AfiliadosCadastro.tsx`
    - `src/components/LandingPageWithRef.tsx`
    - `src/components/ReferralTracker.ts`
    - `src/layouts/CustomerDashboardLayout.tsx`
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

### 1.B - TESTES: Constantes e LocalStorage

- [x] 1.3 Escrever testes para constantes (OBRIGATÓRIO)
  - Validar que constantes não mudam acidentalmente
  - Validar regex de Wallet ID
  - **Property 10: Formato Consistente de Wallet ID**
  - _Requirements: 9.1, 14.5_

- [x] 1.4 Testar fluxo completo de rastreamento

  - Clicar link → verificar localStorage
  - Cadastrar → verificar associação
  - _Requirements: 9.2_

### 1.C - IMPLEMENTAÇÃO: Validação de Wallet ID

- [x] 1.5 Criar Edge Function de validação de Wallet ID
  - Criar `supabase/functions/validate-asaas-wallet/index.ts`
  - Implementar validação de formato
  - Implementar chamada à API Asaas
  - Tratar erros de rede (fallback temporário)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 1.6 Atualizar frontend para usar validação real
  - Remover `mockWalletValidation()` de `affiliate.service.ts`
  - Implementar chamada à Edge Function
  - Atualizar UI para mostrar feedback de validação
  - _Requirements: 6.5_

### 1.D - TESTES: Validação de Wallet ID

- [x] 1.7 Testar validação de Wallet ID (OBRIGATÓRIO)
  - Wallet válida → aceita
  - Wallet inválida → rejeita
  - Erro de rede → permite temporário
  - **Property 3: Validação de Wallet ID**
  - _Requirements: 9.1, 6.1, 6.2, 6.3_

### 1.E - VALIDAÇÃO: Checkpoint Fase 1

- [x] 1.8 Checkpoint - Validar correções básicas
  - Testar localStorage padronizado
  - Testar validação de Wallet ID
  - Confirmar que não há erros no console

- [ ] 1.9 Smoke test em ambiente staging
  - Deploy Fase 1 em staging
  - Executar 5 cadastros de afiliados
  - Validar localStorage
  - Validar wallet validation
  - Se OK → aprovar Fase 2
  - Se FAIL → rollback + debug

- [ ] 2. Migração de Banco de Dados
  - Corrigir estrutura de dados no banco
  - Tempo estimado: 4-6 horas
  - _Requirements: 1, 2, 5_

### 2.A - IMPLEMENTAÇÃO: Sincronização de Colunas

- [ ] 2.1 Criar migration de sincronização de colunas
  - Criar `supabase/migrations/20260111_sync_parent_columns.sql`
  - Copiar dados de `parent_affiliate_id` para `parent_id`
  - Validar que nenhum dado foi perdido
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 2.2 Executar migration e validar
  - Executar migration no banco de desenvolvimento
  - Executar queries de validação
  - Confirmar sincronização completa
  - _Requirements: 2.4_

- [ ] 2.2.5 BLOQUEIO: Validar sync 100% antes de prosseguir
  - Query: `SELECT COUNT(*) FROM affiliate_network WHERE parent_id IS NULL AND parent_affiliate_id IS NOT NULL`
  - Resultado esperado: 0 rows
  - Se > 0 rows: **ABORT migration 2.3**
  - Investigar e corrigir inconsistências
  - _Requirements: 2.4_

- [ ] 2.3 Criar migration para remover coluna duplicada
  - Criar `supabase/migrations/20260111_remove_parent_affiliate_id.sql`
  - Remover coluna `parent_affiliate_id`
  - Atualizar queries do frontend para usar `parent_id`
  - _Requirements: 2.2, 2.3_

### 2.B - IMPLEMENTAÇÃO: VIEW Materializada e Trigger

- [ ] 2.4 Criar VIEW materializada para compatibilidade
  - Criar `affiliate_network_view` derivada de `referred_by`
  - Implementar query recursiva
  - Criar índices otimizados
  - _Requirements: 1.4, 5.1_

- [ ] 2.5 Criar trigger de atualização automática
  - Implementar `refresh_affiliate_network_view()`
  - Criar trigger em INSERT/UPDATE/DELETE de `affiliates`
  - Testar sincronização automática
  - _Requirements: 5.1, 5.2, 5.4_

### 2.C - TESTES: Sincronização Automática

- [ ] 2.6 Testar sincronização automática (OBRIGATÓRIO)
  - Inserir afiliado → verificar VIEW
  - Atualizar referred_by → verificar VIEW
  - Deletar afiliado → verificar VIEW
  - **Property 9: Sincronização Automática**
  - _Requirements: 9.1, 5.1, 5.2_

### 2.D - VALIDAÇÃO: Checkpoint Migração

- [ ] 2.7 Checkpoint - Validar estrutura de banco
  - Confirmar que VIEW está sincronizada
  - Confirmar que trigger funciona
  - Confirmar que não há dados perdidos

- [ ] 3. Corrigir Políticas RLS
  - Permitir visualização de rede pelos afiliados
  - Tempo estimado: 3-4 horas
  - _Requirements: 4, 12_

### 3.A - IMPLEMENTAÇÃO: Políticas RLS

- [ ] 3.1 Criar migration de correção de RLS
  - Criar `supabase/migrations/20260111_fix_affiliate_network_rls.sql`
  - Remover políticas antigas recursivas
  - Criar política simples para visualização de descendentes
  - Criar política para visualização de próprio registro
  - _Requirements: 4.2, 4.3, 12.1, 12.2_

- [ ] 3.2 Executar migration e testar
  - Executar migration
  - Testar com usuário afiliado real
  - Confirmar que rede é exibida
  - Confirmar que não há erros de permissão
  - _Requirements: 4.1, 4.4, 4.5_

### 3.B - TESTES: Performance RLS

- [ ]* 3.3 Testar performance de RLS
  - Cenário: Rede com 3 níveis, 50 afiliados
  - Query: `SELECT * FROM affiliate_network_view WHERE affiliate_id = X`
  - Métrica: < 200ms (p95)
  - Tool: `EXPLAIN ANALYZE` no PostgreSQL
  - _Requirements: 12.3_

### 3.C - VALIDAÇÃO: Checkpoint RLS

- [ ] 3.4 Checkpoint - Validar RLS
  - Afiliado vê sua rede
  - Afiliado NÃO vê rede de outros
  - Sem erros de permissão

- [ ] 4. Implementar Cálculo de Comissões
  - Conectar referral code ao cálculo de comissões
  - Tempo estimado: 6-8 horas
  - _Requirements: 7, 10_

### 4.A - IMPLEMENTAÇÃO: Service de Cálculo

- [ ] 4.1 Criar service de cálculo de comissões
  - Criar `src/services/affiliates/commission-calculator.service.ts`
  - Implementar `calculateCommissions()`
  - Buscar ascendentes usando `referred_by`
  - Calcular valores base (15%, 3%, 2%)
  - Implementar redistribuição para gestores
  - _Requirements: 7.4_

### 4.B - TESTES: Cálculo de Comissões

- [ ] 4.2 Escrever property test para cálculo (OBRIGATÓRIO)
  - **Property 4: Soma de comissões = 30%**
  - **Validates: Requirements 7.4**
  - Testar com diferentes cenários de rede
  - Mínimo 100 iterações
  - _Requirements: 9.1_

### 4.C - IMPLEMENTAÇÃO: Integração com Checkout

- [ ] 4.3 Atualizar checkout para usar referral code
  - Modificar `api/checkout.js`
  - Buscar afiliado por `referralCode`
  - Associar pedido ao afiliado
  - _Requirements: 7.1, 7.2_

- [ ] 4.4 Implementar webhook de pagamento confirmado
  - Verificar se webhook já existe (Task 0.2)
  - Se não existe: Criar webhook
  - Se existe: Atualizar webhook
  - _Requirements: 7.3, 7.5_

- [ ] 4.4.1 Definir URL do webhook
  - URL: `https://api.slimquality.com.br/webhooks/asaas`
  - Configurar no painel Asaas
  - _Requirements: 7.5_

- [ ] 4.4.2 Implementar validação de assinatura Asaas
  - Validar header `X-Asaas-Signature`
  - Rejeitar requisições sem assinatura válida
  - _Requirements: 7.5_

- [ ] 4.4.3 Implementar retry exponencial
  - 3 tentativas com backoff exponencial
  - Logar cada tentativa
  - _Requirements: 7.7_

- [ ] 4.4.4 Logar TODAS requisições webhook
  - Logar success + fail
  - Incluir payload completo
  - Incluir timestamp
  - _Requirements: 7.7, 8.4_

- [ ] 4.4.5 Chamar calculateCommissions() após confirmação
  - Buscar order_id do payload
  - Chamar service de cálculo
  - Enviar split para Asaas
  - _Requirements: 7.3, 7.5_

### 4.D - IMPLEMENTAÇÃO: Registro e Logs

- [ ] 4.5 Registrar comissões no banco
  - Salvar em tabela `commissions`
  - Salvar em tabela `commission_splits`
  - _Requirements: 7.6_

- [ ] 4.6 Implementar logs de auditoria
  - Criar tabela `commission_calculation_logs`
  - Logar TODAS as operações de comissão
  - Incluir: input, output, network, split, timestamp
  - _Requirements: 7.7, 8.1_

### 4.E - TESTES: Fluxo Completo

- [ ]* 4.7 Testar fluxo completo de comissão
  - Compra com referral code → comissão calculada
  - Split enviado para Asaas
  - Comissões registradas no banco
  - Logs completos
  - _Requirements: 9.1_

### 4.F - VALIDAÇÃO: Checkpoint Comissões

- [ ] 4.8 Checkpoint - Validar comissões
  - Comissões calculadas corretamente
  - Split enviado para Asaas
  - Logs completos

- [ ] 5. FASE 2: Correções Altas (Prioridade Alta)
  - Corrigir problemas que causam bugs frequentes
  - Tempo estimado: 1-2 dias
  - _Requirements: 10, 11, 12_

### 5.A - IMPLEMENTAÇÃO: Função SQL e Dados de Teste

- [ ] 5.1 Conectar função SQL de split
  - Identificar onde chamar `calculate_commission_split()`
  - Implementar chamada no webhook ou service
  - Validar que função é executada
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 5.3 Criar script de validação de dados de teste
  - Criar `scripts/validate-test-data.ts`
  - Validar Bia e Giuseppe no banco
  - Validar sincronização entre estruturas
  - Corrigir inconsistências automaticamente
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 5.4 Executar validação e corrigir
  - Executar script
  - Analisar resultados
  - Aplicar correções necessárias
  - _Requirements: 11.4_

- [ ] 5.5 Otimizar políticas RLS recursivas
  - Substituir funções recursivas por queries simples
  - Criar índices adicionais se necessário
  - Medir performance antes/depois
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

### 5.B - TESTES: Função SQL

- [ ]* 5.2 Testar função SQL
  - Executar função manualmente
  - Verificar resultados em `commission_splits`
  - _Requirements: 9.1_

### 5.C - VALIDAÇÃO: Checkpoint Fase 2

- [ ] 5.6 Checkpoint - Validar correções altas
  - Função SQL sendo chamada
  - Dados de teste corretos
  - RLS performática

- [ ] 6. FASE 3: Correções Médias e Refatoração (Prioridade Média)
  - Corrigir inconsistências e melhorar qualidade
  - Tempo estimado: 1-2 dias
  - _Requirements: 13, 14, 15, 16_

### 6.A - IMPLEMENTAÇÃO: Dados Reais e Padronização

- [ ] 6.1 Substituir mock data por dados reais
  - Remover `getWithdrawals()` mock de `affiliate.service.ts`
  - Implementar query real para tabela `withdrawals`
  - Atualizar UI para mostrar dados reais
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 6.2 Padronizar formato de Wallet ID
  - Atualizar constraint do banco para `^wal_[a-zA-Z0-9]{20}$`
  - Criar migration para converter UUIDs existentes
  - Atualizar documentação
  - Atualizar variáveis de ambiente
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 6.3 Implementar logs suficientes
  - Adicionar logs em cálculo de comissões
  - Adicionar logs em sincronização de rede
  - Adicionar logs em validação de wallet
  - Adicionar logs em erros
  - Usar níveis apropriados (DEBUG, INFO, WARN, ERROR)
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

### 6.B - DOCUMENTAÇÃO

- [ ] 6.4 Criar documentação de decisões arquiteturais
  - Criar `docs/ARCHITECTURE_DECISIONS.md`
  - Documentar decisão de usar `referred_by`
  - Documentar motivo de deprecar `affiliate_network`
  - Documentar padrão de localStorage
  - Documentar estrutura de RLS
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

### 6.C - VALIDAÇÃO: Checkpoint Final Fase 3

- [ ] 6.5 Checkpoint Final - Validar tudo
  - Executar todos os testes
  - Validar checklist pós-correção
  - Confirmar que todos os 14 problemas foram corrigidos

- [ ] 7. Testes End-to-End e Validação Final
  - Validar sistema completo funcionando
  - Tempo estimado: 4-6 horas
  - _Requirements: 9_

### 7.A - IMPLEMENTAÇÃO: Testes E2E

- [ ] 7.1 Criar testes end-to-end
  - Teste: Fluxo completo de indicação
  - Teste: Cálculo de comissões
  - Teste: Exibição de rede
  - Teste: Validação de wallet
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

### 7.B - EXECUÇÃO: Suite de Testes

- [ ]* 7.2 Executar suite completa de testes
  - Unit tests
  - Property tests
  - Integration tests
  - E2E tests
  - _Requirements: 9.5_

- [ ] 7.3 Validar cobertura de testes
  - Confirmar > 80% de cobertura
  - Identificar gaps
  - Adicionar testes faltantes
  - _Requirements: 9.5_

### 7.C - VALIDAÇÃO: Checklist Pós-Correção

- [ ] 7.4 Executar checklist de validação pós-correção
  - Cadastro de afiliado via link funciona
  - Código de indicação é persistido
  - Afiliado aparece na rede
  - Compra com link registra corretamente
  - Split é calculado corretamente
  - Comissões aparecem no painel
  - Rede genealógica é exibida
  - RLS não bloqueia visualização
  - _Requirements: Todos_

- [ ] 7.5 Validar sincronização técnica
  - Executar query de validação de sincronização
  - Confirmar que `referred_by` e VIEW estão sincronizados
  - Confirmar que não há inconsistências
  - _Requirements: 1, 2, 5_

### 7.D - CHECKPOINT: Sistema Completo

- [ ] 7.6 Checkpoint Final - Sistema Completo
  - Todos os 14 problemas corrigidos
  - Todos os testes passando
  - Sistema funcionando end-to-end
  - Documentação completa

### 7.E - COMUNICAÇÃO

- [ ] 7.7 COMUNICAÇÃO: Notificar stakeholders
  - Email para Renato: resumo das correções
  - Documentar breaking changes (se houver)
  - Agendar demo do sistema corrigido
  - Criar release notes

## Notes

### Tarefas Opcionais (marcadas com *)
- Apenas task 3.3 (performance test) permanece opcional
- TODOS os property tests são OBRIGATÓRIOS (1.2, 1.6, 2.6, 4.2)

### Checkpoints
- Incluídos em pontos estratégicos para validação incremental
- Garantem que cada fase está funcionando antes de avançar
- Smoke tests adicionados após cada fase crítica

### Tempo Total Estimado
- Preparação: 30 minutos
- Fase 1 (Crítica): 2-3 dias
- Fase 2 (Alta): 1-2 dias
- Fase 3 (Média): 1-2 dias
- Testes E2E: 4-6 horas
- **Total: 5-8 dias de trabalho**

### Priorização
- Preparação (Task 0) DEVE ser executada primeiro
- Fase 1 DEVE ser concluída antes de Fase 2
- Fase 2 pode ser executada em paralelo com Fase 3
- Testes E2E devem ser executados ao final

### Rollback
- Backup completo antes de iniciar (Task 0.1)
- Cada migration deve ter script de rollback
- Logs de auditoria permitem rastrear mudanças

### Riscos Mitigados
- ✅ Migration sequence: Task 2.2.5 bloqueia se dados inconsistentes
- ✅ RLS performance: Task 3.3 define cenário e métrica clara
- ✅ Webhook Asaas: Tasks 4.4.1-4.4.5 detalham implementação completa
- ✅ Property tests: Reclassificados como obrigatórios

---

**Implementation Plan Completo**  
**Total de Tasks:** 56 (incluindo sub-tasks e melhorias)  
**Total de Checkpoints:** 8  
**Total de Property Tests:** 4 (TODOS OBRIGATÓRIOS)  
**Total de Smoke Tests:** 1  
**Cobertura:** 100% dos 16 requirements  
**Riscos:** 4 identificados e mitigados
